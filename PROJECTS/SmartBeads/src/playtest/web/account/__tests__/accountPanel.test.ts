/** @jest-environment jsdom */
import { wireAccountPanel } from '../accountPanel';
import { payWithRazorpay } from '../razorpayCheckout';
import { AccountClient, type AccountUser } from '../accountClient';

jest.mock('../razorpayCheckout', () => ({ payWithRazorpay: jest.fn() }));

const DOM = `
<button id="hub-account-btn">Sign in</button>
<div id="account-dialog" style="display:none">
  <div id="account-signed-out"><input id="account-email"><button id="account-send-btn"></button>
    <div id="account-google" hidden></div><a id="account-facebook" hidden></a></div>
  <div id="account-sent" hidden><span id="account-sent-to"></span>
    <input id="account-code"><button id="account-code-btn"></button></div>
  <div id="account-signed-in" hidden><span id="account-who"></span>
    <input id="account-name"><button id="account-save-btn"></button>
    <button id="account-remove-ads-btn" hidden></button><p id="account-ads-status" hidden></p><ul id="account-ratings"></ul><button id="account-signout-btn"></button></div>
  <p id="account-message"></p>
  <button id="account-close-btn"></button>
</div>`;

const ann: AccountUser = {
  id: '1',
  email: 'ann@example.com',
  displayName: 'ann',
  adsRemoved: false,
  ratings: {},
};

function fakeClient(over: Partial<Record<keyof AccountClient, unknown>> = {}): AccountClient {
  return {
    me: async () => ({
      user: null,
      signInAvailable: true,
      providers: { google: null, facebook: false },
    }),
    requestLink: async () => ({ ok: true }),
    verify: async () => ({ user: ann }),
    verifyCode: async () => ({ user: ann }),
    logout: async () => {},
    rename: async (n: string) => ({ user: { ...ann, displayName: n } }),
    ...over,
  } as unknown as AccountClient;
}

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
const dialogOpen = (): boolean => el('account-dialog').style.display !== 'none';

beforeEach(() => {
  document.body.innerHTML = DOM;
  window.history.replaceState(null, '', '/');
});

describe('account panel', () => {
  it('opens from the button and asks for an e-mail when signed out', async () => {
    await wireAccountPanel(fakeClient()).ready;
    expect(el('hub-account-btn').textContent).toBe('Sign in');
    el('hub-account-btn').click();
    expect(dialogOpen()).toBe(true);
    expect(el('account-signed-out').hidden).toBe(false);
  });

  it('sends the typed address and then says where the link went', async () => {
    const requestLink = jest.fn(async () => ({ ok: true as const }));
    await wireAccountPanel(fakeClient({ requestLink })).ready;
    el('hub-account-btn').click();
    el<HTMLInputElement>('account-email').value = '  ann@example.com ';
    el('account-send-btn').click();
    await flush();
    expect(requestLink).toHaveBeenCalledWith('ann@example.com');
    expect(el('account-sent').hidden).toBe(false);
    expect(el('account-sent-to').textContent).toBe('ann@example.com');
  });

  async function askForCode(client: AccountClient): Promise<void> {
    await wireAccountPanel(client).ready;
    el('hub-account-btn').click();
    el<HTMLInputElement>('account-email').value = 'ann@example.com';
    el('account-send-btn').click();
    await flush();
  }

  it('signs in with the typed code for the address the code was asked for (B9)', async () => {
    const verifyCode = jest.fn(async () => ({ user: ann }));
    await askForCode(fakeClient({ verifyCode }));
    el<HTMLInputElement>('account-email').value = 'someone-else@example.com'; // editing the first field later changes nothing
    el<HTMLInputElement>('account-code').value = '482913';
    el('account-code-btn').click();
    await flush();
    expect(verifyCode).toHaveBeenCalledWith('ann@example.com', '482913');
    expect(el('hub-account-btn').textContent).toBe('ann');
    expect(el('account-signed-in').hidden).toBe(false);
    expect(el('account-message').textContent).toContain('ann@example.com');
  });

  it('Enter in the code field signs in', async () => {
    const verifyCode = jest.fn(async () => ({ user: ann }));
    await askForCode(fakeClient({ verifyCode }));
    const input = el<HTMLInputElement>('account-code');
    input.value = '482913';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await flush();
    expect(verifyCode).toHaveBeenCalledTimes(1);
  });

  it('a wrong code shows the reason and stays on the code form', async () => {
    await askForCode(
      fakeClient({ verifyCode: async () => ({ error: 'That code is not right.' }) }),
    );
    el<HTMLInputElement>('account-code').value = '000000';
    el('account-code-btn').click();
    await flush();
    expect(el('account-message').textContent).toBe('That code is not right.');
    expect(el('account-sent').hidden).toBe(false);
    expect(el('hub-account-btn').textContent).toBe('Sign in');
  });

  it('an empty code asks for the code and sends nothing', async () => {
    const verifyCode = jest.fn(async () => ({ user: ann }));
    await askForCode(fakeClient({ verifyCode }));
    el('account-code-btn').click();
    await flush();
    expect(verifyCode).not.toHaveBeenCalled();
    expect(el('account-message').textContent).toContain('6-digit code');
  });

  it('shows the server error and stays on the form', async () => {
    await wireAccountPanel(fakeClient({ requestLink: async () => ({ error: 'Too many.' }) })).ready;
    el('hub-account-btn').click();
    el<HTMLInputElement>('account-email').value = 'a@b.co';
    el('account-send-btn').click();
    await flush();
    expect(el('account-message').textContent).toBe('Too many.');
    expect(el('account-sent').hidden).toBe(true);
  });

  it('does not send an empty address', async () => {
    const requestLink = jest.fn(async () => ({ ok: true as const }));
    await wireAccountPanel(fakeClient({ requestLink })).ready;
    el('hub-account-btn').click();
    el('account-send-btn').click();
    await flush();
    expect(requestLink).not.toHaveBeenCalled();
    expect(el('account-message').textContent).not.toBe('');
  });

  it('a login link in the address is spent, removed from the address bar, and signs in', async () => {
    const verify = jest.fn(async () => ({ user: ann }));
    window.history.replaceState(null, '', '/?login=abc123&x=1');
    await wireAccountPanel(fakeClient({ verify })).ready;
    expect(verify).toHaveBeenCalledWith('abc123');
    expect(window.location.search).toBe('?x=1');
    expect(el('hub-account-btn').textContent).toBe('ann');
    expect(dialogOpen()).toBe(true);
    expect(el('account-signed-in').hidden).toBe(false);
  });

  it('an expired link shows the reason', async () => {
    window.history.replaceState(null, '', '/?login=old');
    await wireAccountPanel(
      fakeClient({ verify: async () => ({ error: 'This sign-in link has expired.' }) }),
    ).ready;
    expect(el('account-message').textContent).toBe('This sign-in link has expired.');
    expect(el('hub-account-btn').textContent).toBe('Sign in');
  });

  it('a returning player is shown by name without opening the dialog', async () => {
    await wireAccountPanel(
      fakeClient({
        me: async () => ({
          user: ann,
          signInAvailable: true,
          providers: { google: null, facebook: false },
        }),
      }),
    ).ready;
    expect(el('hub-account-btn').textContent).toBe('ann');
    expect(dialogOpen()).toBe(false);
  });

  it('renames and signs out', async () => {
    const logout = jest.fn(async () => {});
    await wireAccountPanel(
      fakeClient({
        me: async () => ({
          user: ann,
          signInAvailable: true,
          providers: { google: null, facebook: false },
        }),
        logout,
      }),
    ).ready;
    el('hub-account-btn').click();
    el<HTMLInputElement>('account-name').value = 'Ann Lee';
    el('account-save-btn').click();
    await flush();
    expect(el('hub-account-btn').textContent).toBe('Ann Lee');
    el('account-signout-btn').click();
    await flush();
    expect(logout).toHaveBeenCalled();
    expect(el('hub-account-btn').textContent).toBe('Sign in');
    expect(dialogOpen()).toBe(false);
  });

  it('when the server cannot send e-mail, the form is disabled with a message', async () => {
    await wireAccountPanel(
      fakeClient({
        me: async () => ({
          user: null,
          signInAvailable: false,
          providers: { google: null, facebook: false },
        }),
      }),
    ).ready;
    el('hub-account-btn').click();
    expect(el<HTMLButtonElement>('account-send-btn').disabled).toBe(true);
    expect(el('account-message').textContent).toContain('not available');
  });

  it('shows no Google or Facebook button when the server has them off', async () => {
    await wireAccountPanel(fakeClient()).ready;
    expect(el('account-google').hidden).toBe(true);
    expect(el('account-facebook').hidden).toBe(true);
    expect(document.querySelector('script[src*="accounts.google.com"]')).toBeNull();
  });

  it('shows the Facebook link, and loads Google only when the server says Google is on', async () => {
    const me = async () => ({
      user: null,
      signInAvailable: true,
      providers: { google: 'client-1', facebook: true },
      payments: null,
    });
    await wireAccountPanel(fakeClient({ me })).ready;
    expect(el('account-facebook').hidden).toBe(false);
    expect(el('account-google').hidden).toBe(false);
    expect(document.querySelector('script[src*="accounts.google.com"]')).not.toBeNull();
  });

  it('shows a message once when the server sends the player back after a failed Facebook sign-in', async () => {
    window.history.replaceState(null, '', '/?login_error=facebook');
    await wireAccountPanel(fakeClient()).ready;
    expect(el('account-message').textContent).toContain('Facebook');
    expect(dialogOpen()).toBe(true);
    expect(window.location.search).toBe('');
  });

  describe('ad removal', () => {
    const pay = payWithRazorpay as jest.Mock;
    const order = { keyId: 'k', orderId: 'order_1', amount: 14900, currency: 'INR' };
    const meWithPrice = async () => ({
      user: ann,
      signInAvailable: true,
      providers: { google: null, facebook: false },
      payments: { pricePaise: 14900 },
    });
    let events: boolean[];
    const listener = (e: Event) =>
      events.push((e as CustomEvent<{ adsRemoved: boolean }>).detail.adsRemoved);
    beforeEach(() => {
      events = [];
      pay.mockReset();
      window.addEventListener('sb-account', listener);
    });
    afterEach(() => window.removeEventListener('sb-account', listener));

    it('offers the button with the price only when the server sells it', async () => {
      await wireAccountPanel(fakeClient({ me: meWithPrice })).ready;
      el('hub-account-btn').click();
      expect(el('account-remove-ads-btn').hidden).toBe(false);
      expect(el('account-remove-ads-btn').textContent).toContain('149');
      document.body.innerHTML = DOM;
      await wireAccountPanel(
        fakeClient({
          me: async () => ({
            user: ann,
            signInAvailable: true,
            providers: { google: null, facebook: false },
            payments: null,
          }),
        }),
      ).ready;
      el('hub-account-btn').click();
      expect(el('account-remove-ads-btn').hidden).toBe(true);
    });

    it('pays, confirms with the server, then announces that ads are gone', async () => {
      const verifyPayment = jest.fn(async () => ({ user: { ...ann, adsRemoved: true } }));
      pay.mockResolvedValue({ paymentId: 'pay_1', signature: 'sig' });
      await wireAccountPanel(
        fakeClient({ me: meWithPrice, createOrder: async () => order, verifyPayment }),
      ).ready;
      expect(events).toEqual([]); // nothing announced while ads are still on
      el('hub-account-btn').click();
      el('account-remove-ads-btn').click();
      await flush();
      expect(verifyPayment).toHaveBeenCalledWith('order_1', 'pay_1', 'sig');
      expect(events).toEqual([true]);
      expect(el('account-remove-ads-btn').hidden).toBe(true);
      expect(el('account-ads-status').hidden).toBe(false);
    });

    it('a closed payment window charges nothing and keeps the ads', async () => {
      const verifyPayment = jest.fn();
      pay.mockResolvedValue(undefined);
      await wireAccountPanel(
        fakeClient({ me: meWithPrice, createOrder: async () => order, verifyPayment }),
      ).ready;
      el('hub-account-btn').click();
      el('account-remove-ads-btn').click();
      await flush();
      expect(verifyPayment).not.toHaveBeenCalled();
      expect(events).toEqual([]);
      expect(el('account-message').textContent).toContain('not been charged');
    });

    it('a failed confirmation shows the reason and the support address, and keeps the ads', async () => {
      pay.mockResolvedValue({ paymentId: 'pay_1', signature: 'bad' });
      await wireAccountPanel(
        fakeClient({
          me: meWithPrice,
          createOrder: async () => order,
          verifyPayment: async () => ({ error: 'The payment could not be confirmed.' }),
        }),
      ).ready;
      el('hub-account-btn').click();
      el('account-remove-ads-btn').click();
      await flush();
      expect(el('account-message').textContent).toContain('info@smartbeadchess.com');
      expect(events).toEqual([]);
    });

    it('signing out brings the ads back', async () => {
      const paid = async () => ({
        user: { ...ann, adsRemoved: true },
        signInAvailable: true,
        providers: { google: null, facebook: false },
        payments: { pricePaise: 14900 },
      });
      await wireAccountPanel(fakeClient({ me: paid })).ready;
      expect(events).toEqual([true]); // a returning paid player: no ads from the start
      el('hub-account-btn').click();
      el('account-signout-btn').click();
      await flush();
      expect(events).toEqual([true, false]);
    });
  });

  it('lists the ratings of a signed-in player by board name', async () => {
    const rated = {
      ...ann,
      ratings: { '6x4': { elo: 1220, games: 3, wins: 2, losses: 1, draws: 0 } },
    };
    await wireAccountPanel(
      fakeClient({
        me: async () => ({
          user: rated,
          signInAvailable: true,
          providers: { google: null, facebook: false },
          payments: null,
        }),
      }),
    ).ready;
    el('hub-account-btn').click();
    const items = [...document.querySelectorAll('#account-ratings li')].map((li) => li.textContent);
    expect(items).toHaveLength(1);
    expect(items[0]).toContain('1220');
    expect(items[0]).toContain('2 won');
  });
});
