/** Talks to the account API (A7). Same-origin; the session lives in an HttpOnly cookie the page never sees. */

export interface AccountUser {
  id: string;
  email: string;
  displayName: string;
  adsRemoved: boolean;
  /** Elo rating per board id; only boards with rated games appear. */
  ratings: Record<
    string,
    { elo: number; games: number; wins: number; losses: number; draws: number }
  >;
}

export interface AccountState {
  user: AccountUser | null;
  /** False when the server cannot send sign-in e-mails (or there is no account server). */
  signInAvailable: boolean;
  /** Social sign-in the server has switched on: the Google client id, and whether Facebook is on. */
  providers: { google: string | null; facebook: boolean };
  /** Present when the server sells ad removal; the price is in paise (1/100 rupee). */
  payments: { pricePaise: number } | null;
}

export interface PaymentOrder {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
}

type Fetch = typeof fetch;

const NO_PROVIDERS = { google: null, facebook: false };

export class AccountClient {
  constructor(private readonly doFetch: Fetch = (...a) => fetch(...a)) {}

  private async post(
    path: string,
    body: unknown,
  ): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    try {
      const r = await this.doFetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      return { ok: r.ok, data };
    } catch {
      return { ok: false, data: { error: 'Could not reach the server. Check your connection.' } };
    }
  }

  async me(): Promise<AccountState> {
    try {
      const r = await this.doFetch('/api/auth/me');
      if (!r.ok)
        return { user: null, signInAvailable: false, providers: NO_PROVIDERS, payments: null };
      const d = (await r.json()) as {
        user: AccountUser | null;
        signIn?: boolean;
        providers?: AccountState['providers'];
        payments?: AccountState['payments'];
      };
      return {
        user: d.user ?? null,
        signInAvailable: d.signIn !== false,
        providers: d.providers ?? NO_PROVIDERS,
        payments: d.payments ?? null,
      };
    } catch {
      return { user: null, signInAvailable: false, providers: NO_PROVIDERS, payments: null };
    }
  }

  async requestLink(email: string): Promise<{ ok: true } | { error: string }> {
    const r = await this.post('/api/auth/request', { email });
    return r.ok ? { ok: true } : { error: String(r.data.error ?? 'Could not send the e-mail.') };
  }

  async verify(token: string): Promise<{ user: AccountUser } | { error: string }> {
    const r = await this.post('/api/auth/verify', { token });
    return r.ok
      ? { user: r.data.user as AccountUser }
      : { error: String(r.data.error ?? 'Sign-in failed.') };
  }

  /** The 6-digit code from the e-mail (the Android app cannot open the e-mailed link). */
  async verifyCode(
    email: string,
    code: string,
  ): Promise<{ user: AccountUser } | { error: string }> {
    const r = await this.post('/api/auth/verify', { email, code });
    return r.ok
      ? { user: r.data.user as AccountUser }
      : { error: String(r.data.error ?? 'Sign-in failed.') };
  }

  async google(credential: string): Promise<{ user: AccountUser } | { error: string }> {
    const r = await this.post('/api/auth/google', { credential });
    return r.ok
      ? { user: r.data.user as AccountUser }
      : { error: String(r.data.error ?? 'Google sign-in failed.') };
  }

  async createOrder(): Promise<PaymentOrder | { error: string }> {
    const r = await this.post('/api/auth/pay/order', {});
    return r.ok
      ? (r.data as unknown as PaymentOrder)
      : { error: String(r.data.error ?? 'Could not start the payment.') };
  }

  async verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<{ user: AccountUser } | { error: string }> {
    const r = await this.post('/api/auth/pay/verify', { orderId, paymentId, signature });
    return r.ok
      ? { user: r.data.user as AccountUser }
      : { error: String(r.data.error ?? 'The payment could not be confirmed.') };
  }

  async logout(): Promise<void> {
    await this.post('/api/auth/logout', {});
  }

  async rename(displayName: string): Promise<{ user: AccountUser } | { error: string }> {
    const r = await this.post('/api/auth/profile', { displayName });
    return r.ok
      ? { user: r.data.user as AccountUser }
      : { error: String(r.data.error ?? 'Could not save the name.') };
  }
}
