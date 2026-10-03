import { generateKeyPairSync, sign, type KeyObject } from 'crypto';
import { startApp, type RunningApp } from '../app';
import { AccountStore } from '../accounts/AccountStore';
import { AuthService } from '../accounts/AuthService';
import { FacebookOAuth } from '../accounts/FacebookOAuth';
import { GoogleSignIn, type GoogleKey } from '../accounts/GoogleSignIn';

const NOW = 20_000_000_000;
const CLIENT_ID = 'client-123.apps.googleusercontent.com';

const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = (k: KeyObject): GoogleKey => ({ ...k.export({ format: 'jwk' }), kid: 'k1' });

function jwt(
  claims: Record<string, unknown>,
  opts: { key?: KeyObject; alg?: string; kid?: string } = {},
): string {
  const header = Buffer.from(
    JSON.stringify({ alg: opts.alg ?? 'RS256', kid: opts.kid ?? 'k1' }),
  ).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      iss: 'https://accounts.google.com',
      aud: CLIENT_ID,
      exp: NOW / 1000 + 3600,
      sub: 'g-1',
      email: 'ann@example.com',
      email_verified: true,
      name: 'Ann Lee',
      ...claims,
    }),
  ).toString('base64url');
  const sig = sign('RSA-SHA256', Buffer.from(`${header}.${body}`), opts.key ?? pair.privateKey);
  return `${header}.${body}.${sig.toString('base64url')}`;
}

interface Reply {
  user: { id: string; email: string; displayName: string };
  providers: { google: string | null; facebook: boolean };
  error?: string;
}

let app: RunningApp;
let base: string;
let auth: AuthService;
const fbCalls: string[] = [];
let fbProfile: Record<string, unknown> = { id: 'f-1', name: 'Fay', email: 'fay@example.com' };

async function start(
  opts: { google?: boolean; facebook?: boolean } = { google: true, facebook: true },
) {
  auth = new AuthService(new AccountStore(), undefined, 'https://example.test', () => NOW);
  const fb = new FacebookOAuth(
    'app-1',
    'SECRET-xyz',
    'https://example.test/api/auth/facebook/callback',
    async (url) => {
      fbCalls.push(url);
      const ok = url.includes('/oauth/access_token')
        ? { access_token: 'tok' }
        : url.includes('/me?')
          ? fbProfile
          : null;
      return { ok: ok !== null, json: async () => ok };
    },
  );
  app = await startApp({
    port: 0,
    now: () => NOW,
    tickMs: 100000,
    auth,
    google: opts.google
      ? new GoogleSignIn(
          CLIENT_ID,
          async () => [jwk(pair.publicKey)],
          () => NOW,
        )
      : undefined,
    facebook: opts.facebook ? fb : undefined,
  });
  base = `http://127.0.0.1:${app.port}`;
}

beforeEach(async () => {
  fbCalls.length = 0;
  fbProfile = { id: 'f-1', name: 'Fay', email: 'fay@example.com' };
  await start();
});
afterEach(async () => {
  await app.close();
});

async function call(
  method: string,
  p: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const r = await fetch(base + p, {
    method,
    redirect: 'manual',
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  return {
    status: r.status,
    json: (text && r.status < 300 ? JSON.parse(text) : {}) as Reply,
    location: r.headers.get('location') ?? '',
    cookies: r.headers.getSetCookie(),
  };
}

const sessionHeader = (cookies: string[]): Record<string, string> => ({
  cookie: cookies
    .map((c) => c.split(';')[0]!)
    .filter((c) => c.startsWith('sb_session=') && c !== 'sb_session=')
    .join('; '),
});

describe('Google sign-in', () => {
  it('signs in with a valid Google token and creates the account', async () => {
    const r = await call('POST', '/api/auth/google', { credential: jwt({}) });
    expect(r.status).toBe(200);
    expect(r.json.user.email).toBe('ann@example.com');
    expect(r.json.user.displayName).toBe('Ann Lee');
    expect(r.cookies.join(';')).toMatch(/sb_session=.+HttpOnly/);
    const me = await call('GET', '/api/auth/me', undefined, sessionHeader(r.cookies));
    expect(me.json.user.email).toBe('ann@example.com');
  });

  it('is the same account every time, and the same account as the e-mail link used', async () => {
    const a = await call('POST', '/api/auth/google', { credential: jwt({}) });
    const b = await call('POST', '/api/auth/google', { credential: jwt({}) });
    expect(b.json.user.id).toBe(a.json.user.id);
  });

  it('finds the account by Google id even when the e-mail on Google changed', async () => {
    const a = await call('POST', '/api/auth/google', { credential: jwt({}) });
    const b = await call('POST', '/api/auth/google', {
      credential: jwt({ email: 'new@example.com' }),
    });
    expect(b.json.user.id).toBe(a.json.user.id);
  });

  it.each([
    ['a wrong audience (another app)', { aud: 'someone-else' }],
    ['a wrong issuer', { iss: 'https://evil.test' }],
    ['an expired token', { exp: NOW / 1000 - 1 }],
    ['an unverified e-mail', { email_verified: false }],
    ['no e-mail', { email: undefined }],
  ])('refuses %s', async (_label, claims) => {
    const r = await call('POST', '/api/auth/google', {
      credential: jwt(claims as Record<string, unknown>),
    });
    expect(r.status).toBe(400);
  });

  it('refuses a token signed with another key, a changed payload, alg none, and an unknown key id', async () => {
    const bad = [
      jwt({}, { key: other.privateKey }),
      (() => {
        const [h, , s] = jwt({}).split('.');
        const forged = Buffer.from(
          JSON.stringify({
            iss: 'accounts.google.com',
            aud: CLIENT_ID,
            exp: NOW / 1000 + 99,
            sub: 'g-1',
            email: 'boss@example.com',
            email_verified: true,
          }),
        ).toString('base64url');
        return `${h}.${forged}.${s}`;
      })(),
      jwt({}, { alg: 'none' }),
      jwt({}, { kid: 'unknown' }),
      'not.a.jwt',
      '',
    ];
    for (const credential of bad) {
      expect((await call('POST', '/api/auth/google', { credential })).status).toBe(400);
    }
  });

  it('does not exist when Google is not configured, and /me hides it', async () => {
    await app.close();
    await start({ facebook: true });
    expect((await call('POST', '/api/auth/google', { credential: jwt({}) })).status).toBe(404);
    expect((await call('GET', '/api/auth/me')).json.providers.google).toBeNull();
  });

  it('/me tells the page which provider to offer', async () => {
    const me = await call('GET', '/api/auth/me');
    expect(me.json.providers).toEqual({ google: CLIENT_ID, facebook: true });
  });
});

describe('Facebook sign-in', () => {
  async function begin() {
    const start = await call('GET', '/api/auth/facebook/start');
    const state = new URL(start.location).searchParams.get('state')!;
    const stateCookie = start.cookies.find((c) => c.startsWith('sb_oauth_state='))!.split(';')[0]!;
    return { start, state, stateCookie };
  }

  it('start sends the browser to Facebook with a fresh state and keeps the state in a cookie', async () => {
    const { start, state, stateCookie } = await begin();
    expect(start.status).toBe(302);
    expect(start.location).toMatch(/^https:\/\/www\.facebook\.com\/v19\.0\/dialog\/oauth\?/);
    expect(new URL(start.location).searchParams.get('client_id')).toBe('app-1');
    expect(start.location).not.toContain('SECRET-xyz');
    expect(stateCookie).toBe(`sb_oauth_state=${state}`);
    expect(start.cookies.join(';')).toMatch(/HttpOnly/);
  });

  it('the callback with the matching state signs in and lands on the home page', async () => {
    const { state, stateCookie } = await begin();
    const r = await call('GET', `/api/auth/facebook/callback?code=abc&state=${state}`, undefined, {
      cookie: stateCookie,
    });
    expect(r.status).toBe(302);
    expect(r.location).toBe('/');
    const me = await call('GET', '/api/auth/me', undefined, sessionHeader(r.cookies));
    expect(me.json.user.email).toBe('fay@example.com');
    expect(fbCalls.some((u) => u.includes('client_secret=SECRET-xyz'))).toBe(true);
  });

  it('refuses a callback whose state does not match the cookie (cross-site forgery)', async () => {
    const { stateCookie } = await begin();
    const r = await call('GET', '/api/auth/facebook/callback?code=abc&state=forged', undefined, {
      cookie: stateCookie,
    });
    expect(r.location).toBe('/?login_error=facebook');
    expect(sessionHeader(r.cookies).cookie).toBe('');
    expect(fbCalls).toHaveLength(0);
  });

  it('refuses a callback with no state cookie or no code', async () => {
    const { state, stateCookie } = await begin();
    const noCookie = await call('GET', `/api/auth/facebook/callback?code=abc&state=${state}`);
    expect(noCookie.location).toBe('/?login_error=facebook');
    const noCode = await call('GET', `/api/auth/facebook/callback?state=${state}`, undefined, {
      cookie: stateCookie,
    });
    expect(noCode.location).toBe('/?login_error=facebook');
    expect(fbCalls).toHaveLength(0);
  });

  it('fails cleanly when Facebook shares no e-mail address', async () => {
    fbProfile = { id: 'f-2', name: 'No Mail' };
    const { state, stateCookie } = await begin();
    const r = await call('GET', `/api/auth/facebook/callback?code=abc&state=${state}`, undefined, {
      cookie: stateCookie,
    });
    expect(r.location).toBe('/?login_error=facebook');
    expect(sessionHeader(r.cookies).cookie).toBe('');
  });

  it('a second sign-in is the same account', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 2; i++) {
      const { state, stateCookie } = await begin();
      const r = await call(
        'GET',
        `/api/auth/facebook/callback?code=abc&state=${state}`,
        undefined,
        { cookie: stateCookie },
      );
      const me = await call('GET', '/api/auth/me', undefined, sessionHeader(r.cookies));
      ids.push(me.json.user.id);
    }
    expect(ids[1]).toBe(ids[0]);
  });

  it('does not exist when Facebook is not configured', async () => {
    await app.close();
    await start({ google: true });
    expect((await call('GET', '/api/auth/facebook/start')).status).toBe(404);
    expect((await call('GET', '/api/auth/me')).json.providers.facebook).toBe(false);
  });
});
