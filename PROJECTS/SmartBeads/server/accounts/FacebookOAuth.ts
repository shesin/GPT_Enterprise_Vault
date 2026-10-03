/**
 * Facebook sign-in (A7), switched on only when FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are set.
 * Standard code flow: send the browser to Facebook, Facebook sends it back with a code, this server
 * swaps the code for a token (the app secret never reaches the browser) and reads id, name, e-mail.
 */
import type { SocialProfile } from './GoogleSignIn';

const GRAPH = 'https://graph.facebook.com/v19.0';

type FetchFn = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

export class FacebookOAuth {
  constructor(
    readonly appId: string,
    private readonly appSecret: string,
    private readonly redirectUri: string,
    private readonly doFetch: FetchFn = (url) => fetch(url),
  ) {}

  authUrl(state: string): string {
    const q = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      state,
      scope: 'email,public_profile',
      response_type: 'code',
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${q.toString()}`;
  }

  async profileFromCode(code: string): Promise<SocialProfile | undefined> {
    try {
      const tokenQuery = new URLSearchParams({
        client_id: this.appId,
        redirect_uri: this.redirectUri,
        client_secret: this.appSecret,
        code,
      });
      const tokenRes = await this.doFetch(`${GRAPH}/oauth/access_token?${tokenQuery.toString()}`);
      if (!tokenRes.ok) return undefined;
      const token = ((await tokenRes.json()) as { access_token?: string }).access_token;
      if (!token) return undefined;
      const meQuery = new URLSearchParams({ fields: 'id,name,email', access_token: token });
      const meRes = await this.doFetch(`${GRAPH}/me?${meQuery.toString()}`);
      if (!meRes.ok) return undefined;
      const me = (await meRes.json()) as { id?: string; name?: string; email?: string };
      if (!me.id || !me.email) return undefined; // no e-mail shared: cannot make an account
      return { id: me.id, email: me.email, name: me.name ?? '' };
    } catch {
      return undefined;
    }
  }
}
