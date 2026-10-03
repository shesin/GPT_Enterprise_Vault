/** The hub's account button and its dialog: sign in by e-mail link, rename, sign out (A7). */
import { installModalFocus } from '../layout/modalFocus';
import { AccountClient, type AccountUser } from './accountClient';
import { getCatalogEntry } from '../../../config/BoardCatalog';
import { showGoogleButton } from './googleButton';
import { payWithRazorpay } from './razorpayCheckout';

/** Token in `?login=` is spent once, then removed from the address bar. */
export function takeLoginToken(): string | null {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('login');
  if (token === null) return null;
  url.searchParams.delete('login');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  return token;
}

const byId = <T extends HTMLElement>(id: string): T | null =>
  document.getElementById(id) as T | null;

/** `?login_error=facebook` is set by the server when a provider sign-in failed; shown once, then removed. */
export function takeLoginError(): string | null {
  const url = new URL(window.location.href);
  const err = url.searchParams.get('login_error');
  if (err === null) return null;
  url.searchParams.delete('login_error');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  return 'Facebook sign-in did not work. Try again, or use the e-mail link.';
}

export function wireAccountPanel(client: AccountClient = new AccountClient()): {
  ready: Promise<void>;
} {
  const btn = byId<HTMLButtonElement>('hub-account-btn');
  const modal = byId<HTMLDivElement>('account-dialog');
  const out = byId('account-signed-out');
  const sent = byId('account-sent');
  const inn = byId('account-signed-in');
  const emailInput = byId<HTMLInputElement>('account-email');
  const sendBtn = byId<HTMLButtonElement>('account-send-btn');
  const nameInput = byId<HTMLInputElement>('account-name');
  const saveBtn = byId<HTMLButtonElement>('account-save-btn');
  const outBtn = byId<HTMLButtonElement>('account-signout-btn');
  const closeBtn = byId<HTMLButtonElement>('account-close-btn');
  const msg = byId('account-message');
  const sentTo = byId('account-sent-to');
  const who = byId('account-who');
  const googleHost = byId('account-google');
  const facebookLink = byId('account-facebook');
  const adsBtn = byId<HTMLButtonElement>('account-remove-ads-btn');
  const adsStatus = byId('account-ads-status');
  const ratingsList = byId('account-ratings');
  if (
    !btn ||
    !modal ||
    !out ||
    !sent ||
    !inn ||
    !emailInput ||
    !sendBtn ||
    !nameInput ||
    !saveBtn ||
    !outBtn ||
    !closeBtn ||
    !msg ||
    !sentTo ||
    !who ||
    !googleHost ||
    !facebookLink ||
    !adsBtn ||
    !adsStatus ||
    !ratingsList
  ) {
    return { ready: Promise.resolve() };
  }

  let user: AccountUser | null = null;
  let available = true;
  let googleStarted = false;
  let price: number | null = null; // paise, when the server sells ad removal
  let adsAnnounced = false;

  /** Tells the game shell to hide or show the ad banner (only when the answer changes). */
  function announceAds(): void {
    const removed = user?.adsRemoved === true;
    if (removed === adsAnnounced) return;
    adsAnnounced = removed;
    window.dispatchEvent(new CustomEvent('sb-account', { detail: { adsRemoved: removed } }));
  }

  function show(section: 'out' | 'sent' | 'in'): void {
    out!.hidden = section !== 'out';
    sent!.hidden = section !== 'sent';
    inn!.hidden = section !== 'in';
  }
  function setMessage(text: string): void {
    msg!.textContent = text;
  }
  function applyProviders(providers: { google: string | null; facebook: boolean }): void {
    facebookLink!.hidden = !providers.facebook;
    googleHost!.hidden = providers.google === null;
    if (providers.google !== null && !googleStarted) {
      googleStarted = true;
      void showGoogleButton(googleHost!, providers.google, async (credential) => {
        const r = await client.google(credential);
        if ('error' in r) {
          setMessage(r.error);
          return;
        }
        user = r.user;
        render();
        setMessage(`Signed in as ${r.user.email}.`);
      });
    }
  }

  function render(): void {
    btn!.textContent = user ? user.displayName : 'Sign in';
    btn!.setAttribute('aria-label', user ? `Account: ${user.displayName}` : 'Sign in');
    if (user) {
      who!.textContent = user.email;
      ratingsList!.replaceChildren(
        ...Object.entries(user.ratings ?? {}).map(([boardId, r]) => {
          const li = document.createElement('li');
          li.textContent = `${getCatalogEntry(boardId as never)?.displayName ?? boardId}: ${r.elo} (${r.wins} won, ${r.losses} lost, ${r.draws} drawn)`;
          return li;
        }),
      );
      adsBtn!.hidden = price === null || user.adsRemoved;
      adsBtn!.textContent = price === null ? '' : `Remove ads (\u20B9${price / 100})`;
      adsStatus!.hidden = !user.adsRemoved;
      nameInput!.value = user.displayName;
      show('in');
    } else {
      show('out');
      sendBtn!.disabled = !available;
    }
    announceAds();
  }
  function open(): void {
    setMessage(available || user ? '' : 'Sign-in is not available right now.');
    render();
    modal!.style.display = 'flex';
    (user ? nameInput! : emailInput!).focus();
  }
  function close(): void {
    modal!.style.display = 'none';
    setMessage('');
  }

  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  installModalFocus(modal, { onEscape: close });

  const send = async (): Promise<void> => {
    const email = emailInput.value.trim();
    if (!email) {
      setMessage('Type your e-mail address.');
      return;
    }
    setMessage('');
    sendBtn.disabled = true;
    const r = await client.requestLink(email);
    sendBtn.disabled = false;
    if ('error' in r) {
      setMessage(r.error);
      return;
    }
    sentTo.textContent = email;
    show('sent');
  };
  sendBtn.addEventListener('click', () => void send());
  emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void send();
  });

  adsBtn.addEventListener('click', async () => {
    if (!user) return;
    setMessage('');
    adsBtn.disabled = true;
    try {
      const order = await client.createOrder();
      if ('error' in order) {
        setMessage(order.error);
        return;
      }
      const paid = await payWithRazorpay(order, user.email);
      if (!paid) {
        setMessage('The payment was not completed. You have not been charged.');
        return;
      }
      const r = await client.verifyPayment(order.orderId, paid.paymentId, paid.signature);
      if ('error' in r) {
        setMessage(`${r.error} If money was taken, write to info@smartbeadchess.com.`);
        return;
      }
      user = r.user;
      render();
      setMessage('Thank you. Ads are removed.');
    } finally {
      adsBtn.disabled = false;
    }
  });

  saveBtn.addEventListener('click', async () => {
    setMessage('');
    const r = await client.rename(nameInput.value);
    if ('error' in r) {
      setMessage(r.error);
      return;
    }
    user = r.user;
    render();
    setMessage('Saved.');
  });

  outBtn.addEventListener('click', async () => {
    await client.logout();
    user = null;
    render();
    close();
  });

  const token = takeLoginToken();
  const loginError = takeLoginError();
  const ready = (async () => {
    if (token) {
      const r = await client.verify(token);
      if ('user' in r) {
        user = r.user;
        render();
        setMessage(`Signed in as ${r.user.email}.`);
        modal.style.display = 'flex';
        return;
      }
      const state = await client.me();
      user = state.user;
      available = state.signInAvailable;
      price = state.payments?.pricePaise ?? null;
      applyProviders(state.providers);
      render();
      setMessage(r.error);
      modal.style.display = 'flex';
      return;
    }
    const state = await client.me();
    user = state.user;
    available = state.signInAvailable;
    price = state.payments?.pricePaise ?? null;
    applyProviders(state.providers);
    render();
    if (loginError) {
      setMessage(loginError);
      modal.style.display = 'flex';
    }
  })();
  return { ready };
}
