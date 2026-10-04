import { mkdtempSync, readFileSync, rmSync } from 'fs';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { startApp, type RunningApp } from '../app';
import { AccountStore } from '../accounts/AccountStore';
import { AuthService, LINK_TTL_MS } from '../accounts/AuthService';
import type { Mailer } from '../accounts/Mailer';

const clock = { t: 10_000_000 };
const sent: Array<{ to: string; link: string; code?: string }> = [];
const mailer: Mailer = {
  async sendLoginLink(to, link, code) {
    sent.push({ to, link, code });
  },
};

interface Reply {
  user: { id: string; email: string; displayName: string };
  signIn: boolean;
  error?: string;
}

let app: RunningApp;
let base: string;
let dir: string;

function build(
  opts: {
    mail?: Mailer | undefined;
    authLimit?: { max: number; windowMs: number };
    publicOrigin?: string;
  } = {},
) {
  const auth = new AuthService(
    new AccountStore(path.join(dir, 'accounts.json')),
    'mail' in opts ? opts.mail : mailer,
    'https://example.test',
    () => clock.t,
  );
  return startApp({
    port: 0,
    now: () => clock.t,
    tickMs: 100000,
    auth,
    authLimit: opts.authLimit,
    publicOrigin: opts.publicOrigin,
  });
}

beforeEach(async () => {
  sent.length = 0;
  dir = mkdtempSync(path.join(os.tmpdir(), 'sb-auth-'));
  app = await build();
  base = `http://127.0.0.1:${app.port}`;
});
afterEach(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

async function call(
  method: string,
  p: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const r = await fetch(base + p, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  return {
    status: r.status,
    json: (text ? JSON.parse(text) : {}) as Reply,
    cookie: r.headers.get('set-cookie') ?? '',
  };
}

const tokenOf = (link: string): string => new URL(link).searchParams.get('login')!;
const cookieHeader = (setCookie: string): Record<string, string> => ({
  cookie: setCookie.split(';')[0]!,
});

async function signIn(email = 'ann@example.com') {
  await call('POST', '/api/auth/request', { email });
  const link = sent[sent.length - 1]!.link;
  return call('POST', '/api/auth/verify', { token: tokenOf(link) });
}

describe('e-mail login link', () => {
  it('mails a one-time link to the address and replies ok', async () => {
    const r = await call('POST', '/api/auth/request', { email: ' Ann@Example.com ' });
    expect(r.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe('ann@example.com');
    expect(sent[0]!.link.startsWith('https://example.test/?login=')).toBe(true);
  });

  it('rejects an address that is not an e-mail and sends nothing', async () => {
    for (const email of ['', 'nope', 'a@b', 'a b@c.com', 42, null, 'x@y.com\nBcc: z@z.com']) {
      const r = await call('POST', '/api/auth/request', { email });
      expect(r.status).toBe(400);
    }
    expect(sent).toHaveLength(0);
  });

  it('signs in with the link, sets an HttpOnly cookie, and /me shows the user', async () => {
    const v = await signIn();
    expect(v.status).toBe(200);
    expect(v.json.user.email).toBe('ann@example.com');
    expect(v.cookie).toMatch(/HttpOnly/);
    expect(v.cookie).toMatch(/SameSite=Lax/);
    const me = await call('GET', '/api/auth/me', undefined, cookieHeader(v.cookie));
    expect(me.json.user.email).toBe('ann@example.com');
    expect((await call('GET', '/api/auth/me')).json.user).toBeNull();
  });

  it('a link works only once', async () => {
    await call('POST', '/api/auth/request', { email: 'ann@example.com' });
    const token = tokenOf(sent[0]!.link);
    expect((await call('POST', '/api/auth/verify', { token })).status).toBe(200);
    expect((await call('POST', '/api/auth/verify', { token })).status).toBe(400);
  });

  it('a link expires after 15 minutes', async () => {
    await call('POST', '/api/auth/request', { email: 'ann@example.com' });
    clock.t += LINK_TTL_MS + 1;
    const r = await call('POST', '/api/auth/verify', { token: tokenOf(sent[0]!.link) });
    expect(r.status).toBe(400);
  });

  it('a guessed token is refused', async () => {
    expect((await call('POST', '/api/auth/verify', { token: 'x'.repeat(43) })).status).toBe(400);
    expect((await call('POST', '/api/auth/verify', { token: 5 })).status).toBe(400);
  });

  it('the same address signs in to the same account every time', async () => {
    const a = await signIn();
    const b = await signIn();
    expect(b.json.user.id).toBe(a.json.user.id);
  });

  it('stores only hashes: neither the link token nor the session token is in the file', async () => {
    await call('POST', '/api/auth/request', { email: 'ann@example.com' });
    const linkToken = tokenOf(sent[0]!.link);
    const file = () => readFileSync(path.join(dir, 'accounts.json'), 'utf8');
    expect(file()).not.toContain(linkToken);
    const v = await call('POST', '/api/auth/verify', { token: linkToken });
    const sessionToken = cookieHeader(v.cookie).cookie!.split('=')[1]!;
    expect(file()).not.toContain(sessionToken);
  });

  it('keeps accounts and sessions across a server restart', async () => {
    const v = await signIn();
    await app.close();
    app = await build();
    base = `http://127.0.0.1:${app.port}`;
    const me = await call('GET', '/api/auth/me', undefined, cookieHeader(v.cookie));
    expect(me.json.user.email).toBe('ann@example.com');
  });
});

describe('typed sign-in code (B9)', () => {
  /** Asks for a link and code; `force` pins the 6-digit code so tests are deterministic. */
  const ask = async (email = 'ann@example.com', force = 482913) => {
    const spy = (
      jest.spyOn(crypto, 'randomInt') as unknown as jest.SpyInstance<number>
    ).mockReturnValueOnce(force);
    await call('POST', '/api/auth/request', { email });
    spy.mockRestore();
    return sent[sent.length - 1]!;
  };
  const typeCode = (email: string, code: unknown) =>
    call('POST', '/api/auth/verify', { email, code });
  const wrongOf = (code: string): string => String((Number(code) + 1) % 1_000_000).padStart(6, '0');

  it('mails a 6-digit code together with the link', async () => {
    const mail = await ask('ann@example.com', 7);
    expect(mail.code).toBe('000007'); // zero-padded to 6 digits
    expect(mail.code).toMatch(/^\d{6}$/);
    expect(mail.link).toContain('?login=');
  });

  it('signs in with the typed code, sets an HttpOnly cookie, and /me shows the user', async () => {
    const mail = await ask();
    const v = await typeCode('ann@example.com', mail.code);
    expect(v.status).toBe(200);
    expect(v.cookie).toContain('HttpOnly');
    const me = await call('GET', '/api/auth/me', undefined, cookieHeader(v.cookie));
    expect(me.json.user.email).toBe('ann@example.com');
  });

  it('accepts the code with spaces and a differently written address', async () => {
    const mail = await ask('ann@example.com');
    const spaced = `${mail.code!.slice(0, 3)} ${mail.code!.slice(3)}`;
    expect((await typeCode('  ANN@Example.com ', spaced)).status).toBe(200);
  });

  it('a code works only once', async () => {
    const mail = await ask();
    expect((await typeCode('ann@example.com', mail.code)).status).toBe(200);
    expect((await typeCode('ann@example.com', mail.code)).status).toBe(400);
  });

  it('a code expires after 15 minutes', async () => {
    const mail = await ask();
    clock.t += LINK_TTL_MS + 1;
    const v = await typeCode('ann@example.com', mail.code);
    expect(v.status).toBe(400);
    expect(v.cookie).toBe('');
  });

  it('a wrong code is refused with one fixed message and sets no cookie', async () => {
    const mail = await ask();
    const v = await typeCode('ann@example.com', wrongOf(mail.code!));
    expect(v.status).toBe(400);
    expect(v.cookie).toBe('');
    const unknown = await typeCode('nobody@example.com', '123456');
    expect(unknown.json.error).toBe(v.json.error);
  });

  it('five wrong guesses void the code, even if the right one follows', async () => {
    const mail = await ask();
    const wrong = wrongOf(mail.code!);
    for (let i = 0; i < 5; i += 1) {
      expect((await typeCode('ann@example.com', wrong)).status).toBe(400);
    }
    expect((await typeCode('ann@example.com', mail.code)).status).toBe(400);
  });

  it('four wrong guesses do not void the code', async () => {
    const mail = await ask();
    const wrong = wrongOf(mail.code!);
    for (let i = 0; i < 4; i += 1) await typeCode('ann@example.com', wrong);
    expect((await typeCode('ann@example.com', mail.code)).status).toBe(200);
  });

  it('a new request replaces the earlier code', async () => {
    const first = await ask('ann@example.com', 111111);
    clock.t += 1000;
    const second = await ask('ann@example.com', 222222);
    expect((await typeCode('ann@example.com', first.code)).status).toBe(400);
    expect((await typeCode('ann@example.com', second.code)).status).toBe(200);
  });

  it('a code belongs to its address: another address cannot use it', async () => {
    const mail = await ask('ann@example.com', 111111);
    await ask('bob@example.com', 222222);
    expect((await typeCode('bob@example.com', mail.code)).status).toBe(400); // ann's code, bob's address
    expect((await typeCode('carol@example.com', mail.code)).status).toBe(400);
    expect((await typeCode('ann@example.com', mail.code)).status).toBe(200);
  });

  it('spending the code also spends the link from the same e-mail, and the other way round', async () => {
    const a = await ask('ann@example.com');
    expect((await typeCode('ann@example.com', a.code)).status).toBe(200);
    expect((await call('POST', '/api/auth/verify', { token: tokenOf(a.link) })).status).toBe(400);
    const b = await ask('ann@example.com');
    expect((await call('POST', '/api/auth/verify', { token: tokenOf(b.link) })).status).toBe(200);
    expect((await typeCode('ann@example.com', b.code)).status).toBe(400);
  });

  it('the code and the link reach the same account', async () => {
    const viaLink = await signIn('ann@example.com');
    const mail = await ask('ann@example.com');
    const viaCode = await typeCode('ann@example.com', mail.code);
    expect(viaCode.json.user.id).toBe(viaLink.json.user.id);
  });

  it('refuses malformed codes without crashing', async () => {
    await ask();
    for (const bad of ['12345', '1234567', 'abcdef', '', 123456, null, {}, ['123456']]) {
      expect((await typeCode('ann@example.com', bad)).status).toBe(400);
    }
    expect((await typeCode('not-an-email', '123456')).status).toBe(400);
  });

  it('a typo that is not 6 digits does not use up a guess', async () => {
    const mail = await ask();
    for (let i = 0; i < 8; i += 1) {
      expect((await typeCode('ann@example.com', '12345')).status).toBe(400);
    }
    expect((await typeCode('ann@example.com', mail.code)).status).toBe(200);
  });

  it('stores only a hash of the code', async () => {
    const mail = await ask();
    const file = readFileSync(path.join(dir, 'accounts.json'), 'utf8');
    expect(file).not.toContain(mail.code!);
    expect(file).toContain('"codes"');
  });

  it('keeps a live code across a server restart', async () => {
    const mail = await ask();
    await app.close();
    app = await build();
    base = `http://127.0.0.1:${app.port}`;
    expect((await typeCode('ann@example.com', mail.code)).status).toBe(200);
  });

  it('limits typed attempts per client address with 429', async () => {
    let last = 0;
    for (let i = 0; i < 40; i += 1) last = (await typeCode('ann@example.com', '000000')).status;
    expect(last).toBe(429);
  });
});

describe('abuse limits', () => {
  it('sends at most 3 links per address in 10 minutes but still answers ok', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await call('POST', '/api/auth/request', { email: 'ann@example.com' })).status).toBe(
        200,
      );
    }
    expect(sent).toHaveLength(3);
  });

  it('limits link requests per client address with 429', async () => {
    await app.close();
    app = await build({ authLimit: { max: 2, windowMs: 60_000 } });
    base = `http://127.0.0.1:${app.port}`;
    await call('POST', '/api/auth/request', { email: 'a@example.com' });
    await call('POST', '/api/auth/request', { email: 'b@example.com' });
    const third = await call('POST', '/api/auth/request', { email: 'c@example.com' });
    expect(third.status).toBe(429);
    expect(sent).toHaveLength(2);
  });

  it('refuses a POST whose Origin is another site', async () => {
    const r = await call(
      'POST',
      '/api/auth/request',
      { email: 'ann@example.com' },
      {
        origin: 'https://evil.test',
      },
    );
    expect(r.status).toBe(403);
    expect(sent).toHaveLength(0);
  });
});

describe('behind a proxy that rewrites Host', () => {
  it('accepts the configured public origin and still refuses any other site', async () => {
    await app.close();
    app = await build({ publicOrigin: 'https://example.test' });
    base = `http://127.0.0.1:${app.port}`;
    const ok = await call(
      'POST',
      '/api/auth/request',
      { email: 'ann@example.com' },
      {
        origin: 'https://example.test',
      },
    );
    expect(ok.status).toBe(200);
    const bad = await call(
      'POST',
      '/api/auth/request',
      { email: 'ann@example.com' },
      {
        origin: 'https://evil.test',
      },
    );
    expect(bad.status).toBe(403);
  });
});

describe('session and profile', () => {
  it('logout ends the session', async () => {
    const v = await signIn();
    const h = cookieHeader(v.cookie);
    await call('POST', '/api/auth/logout', {}, h);
    expect((await call('GET', '/api/auth/me', undefined, h)).json.user).toBeNull();
  });

  it('a session expires after 30 days', async () => {
    const v = await signIn();
    clock.t += 31 * 24 * 3600_000;
    const me = await call('GET', '/api/auth/me', undefined, cookieHeader(v.cookie));
    expect(me.json.user).toBeNull();
  });

  it('renames the player; empty, long and markup names are refused or cleaned', async () => {
    const v = await signIn();
    const h = cookieHeader(v.cookie);
    const ok = await call('POST', '/api/auth/profile', { displayName: '  Ann   Lee ' }, h);
    expect(ok.json.user.displayName).toBe('Ann Lee');
    expect((await call('POST', '/api/auth/profile', { displayName: '' }, h)).status).toBe(400);
    expect(
      (await call('POST', '/api/auth/profile', { displayName: 'x'.repeat(25) }, h)).status,
    ).toBe(400);
    const tagged = await call('POST', '/api/auth/profile', { displayName: '<b>Bo</b>' }, h);
    expect(tagged.json.user.displayName).toBe('bBo/b');
  });

  it('profile needs a session', async () => {
    expect((await call('POST', '/api/auth/profile', { displayName: 'Ann' })).status).toBe(400);
  });
});

describe('not configured', () => {
  it('without a mailer, asking for a link is 503 and /me says sign-in is off', async () => {
    await app.close();
    app = await build({ mail: undefined });
    base = `http://127.0.0.1:${app.port}`;
    expect((await call('POST', '/api/auth/request', { email: 'ann@example.com' })).status).toBe(
      503,
    );
    expect((await call('GET', '/api/auth/me')).json.signIn).toBe(false);
  });

  it('without an auth service the routes do not exist', async () => {
    await app.close();
    app = await startApp({ port: 0 });
    base = `http://127.0.0.1:${app.port}`;
    expect((await call('GET', '/api/auth/me')).status).toBe(404);
  });
});
