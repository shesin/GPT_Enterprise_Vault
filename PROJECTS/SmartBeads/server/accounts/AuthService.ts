/**
 * Sign-in by e-mail link (A7). Ask for a link -> open it -> a session cookie is set.
 * Links are random, stored only as a hash, work once and expire after 15 minutes.
 * The reply to "send me a link" never says whether the address already has an account.
 */
import { createHash, randomBytes, randomUUID } from 'crypto';
import type { AccountStore, BoardRating, User } from './AccountStore';
import type { Mailer } from './Mailer';

export const LINK_TTL_MS = 15 * 60_000;
export const SESSION_TTL_MS = 30 * 24 * 3600_000;
const MAX_SESSIONS_PER_USER = 10;
const MAX_NAME = 24;

const EMAIL = /^[^\s@<>"',;:()[\]\\]+@[^\s@<>"',;:()[\]\\]+\.[^\s@<>"',;:()[\]\\]{2,}$/;

export const sha = (s: string): string => createHash('sha256').update(s).digest('hex');
const newToken = (): string => randomBytes(32).toString('base64url');

export function normalizeEmail(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const e = raw.trim().toLowerCase();
  return e.length <= 254 && EMAIL.test(e) ? e : undefined;
}

export function cleanName(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const printable = Array.from(raw).filter((c) => {
    const n = c.charCodeAt(0);
    return n > 31 && n !== 127 && c !== '<' && c !== '>';
  });
  const name = printable.join('').replace(/\s+/g, ' ').trim();
  return name.length >= 1 && name.length <= MAX_NAME ? name : undefined;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  adsRemoved: boolean;
  ratings: Record<string, BoardRating>;
}

const publicUser = (u: User): PublicUser => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  adsRemoved: u.adsRemoved === true,
  ratings: u.ratings ?? {},
});

export class AuthService {
  /** Asks per address, so one inbox cannot be flooded with links. */
  private readonly recentAsks = new Map<string, number[]>();

  constructor(
    private readonly store: AccountStore,
    private readonly mailer: Mailer | undefined,
    private readonly publicUrl: string,
    private readonly now: () => number,
  ) {}

  get mailConfigured(): boolean {
    return this.mailer !== undefined;
  }

  /** Sends a login link. Always resolves the same way for valid addresses (no account leak). */
  async requestLink(rawEmail: unknown): Promise<{ ok: true } | { error: string; status: number }> {
    const email = normalizeEmail(rawEmail);
    if (!email) return { error: 'Enter a valid e-mail address.', status: 400 };
    if (!this.mailer) return { error: 'Sign-in by e-mail is not available yet.', status: 503 };
    const t = this.now();
    const recent = (this.recentAsks.get(email) ?? []).filter((x) => t - x < 10 * 60_000);
    if (recent.length >= 3) {
      this.recentAsks.set(email, recent);
      return { ok: true }; // silently dropped: do not reveal anything, do not send more mail
    }
    recent.push(t);
    this.recentAsks.set(email, recent);
    const token = newToken();
    this.store.putLink(sha(token), { email, expiresAt: t + LINK_TTL_MS });
    try {
      await this.mailer.sendLoginLink(email, `${this.publicUrl}/?login=${token}`);
    } catch (e) {
      console.error('[auth] could not send login e-mail', e instanceof Error ? e.message : e);
      return { error: 'Could not send the e-mail. Try again later.', status: 502 };
    }
    return { ok: true };
  }

  /** Spends a login link; returns a session token (for the cookie) and the user. */
  verifyLink(rawToken: unknown): { sessionToken: string; user: PublicUser } | undefined {
    if (typeof rawToken !== 'string' || rawToken.length < 20 || rawToken.length > 100) {
      return undefined;
    }
    const link = this.store.takeLink(sha(rawToken));
    if (!link || link.expiresAt <= this.now()) return undefined;
    let user = this.store.findUserByEmail(link.email);
    if (!user) user = this.createUser(link.email, link.email.split('@')[0] ?? '');
    return this.startSession(user);
  }

  private createUser(email: string, rawName: string): User {
    const user: User = {
      id: randomUUID(),
      email,
      displayName: cleanName(rawName.slice(0, MAX_NAME)) ?? 'Player',
      createdAt: this.now(),
    };
    this.store.putUser(user);
    return user;
  }

  private startSession(user: User): { sessionToken: string; user: PublicUser } {
    const sessionToken = newToken();
    this.store.putSession(sha(sessionToken), {
      userId: user.id,
      expiresAt: this.now() + SESSION_TTL_MS,
    });
    this.store.limitSessions(user.id, MAX_SESSIONS_PER_USER);
    return { sessionToken, user: publicUser(user) };
  }

  /**
   * Social sign-in with an e-mail the provider has verified. The provider id finds the account first,
   * then the e-mail address (so a player who first used the e-mail link keeps the same account).
   */
  signInWithProvider(
    provider: 'google' | 'facebook',
    profile: { id: string; email: string; name: string },
  ): { sessionToken: string; user: PublicUser } | undefined {
    const email = normalizeEmail(profile.email);
    if (!email || !profile.id) return undefined;
    let user =
      this.store.findUserByProvider(provider, profile.id) ?? this.store.findUserByEmail(email);
    if (!user) user = this.createUser(email, profile.name || email.split('@')[0] || '');
    if (user[provider] !== profile.id) {
      user[provider] = profile.id;
      this.store.putUser(user);
    }
    return this.startSession(user);
  }

  userForSession(sessionToken: string | undefined): PublicUser | undefined {
    if (!sessionToken) return undefined;
    const s = this.store.getSession(sha(sessionToken));
    if (!s || s.expiresAt <= this.now()) return undefined;
    const user = this.store.getUser(s.userId);
    return user ? publicUser(user) : undefined;
  }

  logout(sessionToken: string | undefined): void {
    if (sessionToken) this.store.deleteSession(sha(sessionToken));
  }

  setDisplayName(sessionToken: string | undefined, rawName: unknown): PublicUser | undefined {
    const me = this.userForSession(sessionToken);
    const name = cleanName(rawName);
    if (!me || !name) return undefined;
    const user = this.store.getUser(me.id);
    if (!user) return undefined;
    user.displayName = name;
    this.store.putUser(user);
    return publicUser(user);
  }

  sweep(): void {
    this.store.sweep(this.now());
    const t = this.now();
    for (const [k, v] of this.recentAsks) {
      if (v.every((x) => t - x >= 10 * 60_000)) this.recentAsks.delete(k);
    }
  }
}
