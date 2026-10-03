/**
 * Google sign-in (A7), switched on only when GOOGLE_CLIENT_ID is set. The browser gets a signed ID token
 * from Google; this checks the signature against Google's published keys, the audience (our client id),
 * the issuer, the expiry and that Google verified the e-mail address. No client secret is needed.
 */
import { createPublicKey, verify, type JsonWebKey } from 'crypto';

export interface GoogleKey extends JsonWebKey {
  kid?: string;
}
export type KeyFetcher = () => Promise<GoogleKey[]>;

export interface SocialProfile {
  id: string;
  email: string;
  name: string;
}

const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

/** Fetches Google's keys, cached for an hour (they rotate slowly). */
export function googleKeyFetcher(now: () => number = () => Date.now()): KeyFetcher {
  let cached: { keys: GoogleKey[]; at: number } | undefined;
  return async () => {
    if (cached && now() - cached.at < 3600_000) return cached.keys;
    const res = await fetch(CERTS_URL);
    if (!res.ok) throw new Error('Could not fetch Google keys');
    const body = (await res.json()) as { keys?: GoogleKey[] };
    cached = { keys: body.keys ?? [], at: now() };
    return cached.keys;
  };
}

const b64 = (s: string): Buffer => Buffer.from(s, 'base64url');

export class GoogleSignIn {
  constructor(
    readonly clientId: string,
    private readonly getKeys: KeyFetcher = googleKeyFetcher(),
    private readonly now: () => number = () => Date.now(),
  ) {}

  async verifyIdToken(token: unknown): Promise<SocialProfile | undefined> {
    if (typeof token !== 'string' || token.length > 4096) return undefined;
    const parts = token.split('.');
    if (parts.length !== 3) return undefined;
    try {
      const header = JSON.parse(b64(parts[0]!).toString('utf8')) as { alg?: string; kid?: string };
      if (header.alg !== 'RS256') return undefined; // never accept "none" or a symmetric algorithm
      const key = (await this.getKeys()).find((k) => k.kid === header.kid);
      if (!key) return undefined;
      const ok = verify(
        'RSA-SHA256',
        Buffer.from(`${parts[0]}.${parts[1]}`),
        createPublicKey({ key, format: 'jwk' }),
        b64(parts[2]!),
      );
      if (!ok) return undefined;
      const c = JSON.parse(b64(parts[1]!).toString('utf8')) as {
        iss?: string;
        aud?: string;
        exp?: number;
        sub?: string;
        email?: string;
        email_verified?: boolean | string;
        name?: string;
      };
      if (c.iss !== 'accounts.google.com' && c.iss !== 'https://accounts.google.com') {
        return undefined;
      }
      if (c.aud !== this.clientId) return undefined;
      if (typeof c.exp !== 'number' || c.exp * 1000 <= this.now()) return undefined;
      if (!c.sub || !c.email) return undefined;
      if (c.email_verified !== true && c.email_verified !== 'true') return undefined;
      return { id: c.sub, email: c.email, name: c.name ?? '' };
    } catch {
      return undefined;
    }
  }
}
