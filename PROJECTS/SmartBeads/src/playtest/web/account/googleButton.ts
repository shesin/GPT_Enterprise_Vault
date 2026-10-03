/**
 * The "Sign in with Google" button. Google's script is loaded only when the server has Google switched on,
 * so a page without Google keys makes no request to Google at all.
 */
interface GoogleId {
  initialize(config: { client_id: string; callback: (r: { credential: string }) => void }): void;
  renderButton(el: HTMLElement, options: Record<string, unknown>): void;
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

function loadScript(): Promise<GoogleId | undefined> {
  const existing = (window as unknown as { google?: { accounts?: { id?: GoogleId } } }).google;
  if (existing?.accounts?.id) return Promise.resolve(existing.accounts.id);
  return new Promise((resolve) => {
    const tag = document.createElement('script');
    tag.src = SCRIPT_URL;
    tag.async = true;
    tag.onload = () =>
      resolve(
        (window as unknown as { google?: { accounts?: { id?: GoogleId } } }).google?.accounts?.id,
      );
    tag.onerror = () => resolve(undefined);
    document.head.appendChild(tag);
  });
}

export async function showGoogleButton(
  host: HTMLElement,
  clientId: string,
  onCredential: (credential: string) => void,
): Promise<void> {
  const id = await loadScript();
  if (!id) return; // blocked or offline: the other sign-in choices stay
  id.initialize({ client_id: clientId, callback: (r) => onCredential(r.credential) });
  id.renderButton(host, { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with' });
}
