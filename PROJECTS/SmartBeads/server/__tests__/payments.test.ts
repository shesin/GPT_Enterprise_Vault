import { createHmac } from 'crypto';
import { startApp, type RunningApp } from '../app';
import { AccountStore } from '../accounts/AccountStore';
import { AuthService } from '../accounts/AuthService';
import { Payments } from '../accounts/Payments';
import type { Mailer } from '../accounts/Mailer';

const NOW = 30_000_000_000;
const KEY_ID = 'rzp_test_abc';
const SECRET = 'test-secret-xyz';
const WEBHOOK = 'hook-secret';
const PRICE = 14900;

const sent: string[] = [];
const mailer: Mailer = {
  async sendLoginLink(_to, link) {
    sent.push(link);
  },
};

interface Reply {
  user?: { id: string; email: string; adsRemoved: boolean };
  error?: string;
  orderId?: string;
  amount?: number;
  keyId?: string;
  currency?: string;
  payments?: { pricePaise: number } | null;
}

let app: RunningApp;
let base: string;
let store: AccountStore;
let razorpayCalls: Array<{ url: string; auth: string; body: Record<string, unknown> }> = [];
let orderCounter = 0;
let razorpayOk = true;

async function start(withPayments = true) {
  store = new AccountStore();
  const auth = new AuthService(store, mailer, 'https://example.test', () => NOW);
  const payments = withPayments
    ? new Payments(
        store,
        KEY_ID,
        SECRET,
        PRICE,
        WEBHOOK,
        () => NOW,
        async (url, init) => {
          razorpayCalls.push({
            url,
            auth: init.headers.authorization ?? '',
            body: JSON.parse(init.body) as Record<string, unknown>,
          });
          return { ok: razorpayOk, json: async () => ({ id: `order_${++orderCounter}` }) };
        },
      )
    : undefined;
  app = await startApp({ port: 0, now: () => NOW, tickMs: 100000, auth, payments });
  base = `http://127.0.0.1:${app.port}`;
}

beforeEach(async () => {
  sent.length = 0;
  razorpayCalls = [];
  orderCounter = 0;
  razorpayOk = true;
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
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await r.text();
  return {
    status: r.status,
    json: (text ? JSON.parse(text) : {}) as Reply,
    cookie: r.headers.get('set-cookie') ?? '',
  };
}

async function signIn(email: string): Promise<Record<string, string>> {
  await call('POST', '/api/auth/request', { email });
  const token = new URL(sent[sent.length - 1]!).searchParams.get('login');
  const v = await call('POST', '/api/auth/verify', { token });
  return { cookie: v.cookie.split(';')[0]! };
}

const sign = (orderId: string, paymentId: string, secret = SECRET): string =>
  createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

async function order(h: Record<string, string>) {
  return call('POST', '/api/auth/pay/order', {}, h);
}

describe('ad-removal payment', () => {
  it('needs a signed-in player', async () => {
    expect((await call('POST', '/api/auth/pay/order', {})).status).toBe(401);
    expect((await call('POST', '/api/auth/pay/verify', {})).status).toBe(401);
  });

  it('creates the order at the SERVER price with the key secret, and tells the browser only the public parts', async () => {
    const h = await signIn('ann@example.com');
    const r = await order(h);
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ keyId: KEY_ID, orderId: 'order_1', amount: PRICE, currency: 'INR' });
    expect(JSON.stringify(r.json)).not.toContain(SECRET);
    expect(razorpayCalls[0]!.url).toBe('https://api.razorpay.com/v1/orders');
    expect(razorpayCalls[0]!.body.amount).toBe(PRICE);
    expect(razorpayCalls[0]!.auth).toBe(
      `Basic ${Buffer.from(`${KEY_ID}:${SECRET}`).toString('base64')}`,
    );
  });

  it('a body that names its own price changes nothing', async () => {
    const h = await signIn('ann@example.com');
    await call('POST', '/api/auth/pay/order', { amount: 1 }, h);
    expect(razorpayCalls[0]!.body.amount).toBe(PRICE);
  });

  it('a valid signature removes the ads, and /me shows it', async () => {
    const h = await signIn('ann@example.com');
    const o = await order(h);
    const v = await call(
      'POST',
      '/api/auth/pay/verify',
      { orderId: o.json.orderId, paymentId: 'pay_1', signature: sign(o.json.orderId!, 'pay_1') },
      h,
    );
    expect(v.status).toBe(200);
    expect(v.json.user!.adsRemoved).toBe(true);
    expect((await call('GET', '/api/auth/me', undefined, h)).json.user!.adsRemoved).toBe(true);
  });

  it('refuses a wrong signature, a signature made with another secret, and a different payment id', async () => {
    const h = await signIn('ann@example.com');
    const o = await order(h);
    const id = o.json.orderId!;
    for (const signature of [
      '',
      'abc',
      sign(id, 'pay_1', 'another-secret'),
      sign(id, 'pay_OTHER'),
      123,
    ]) {
      const v = await call(
        'POST',
        '/api/auth/pay/verify',
        { orderId: id, paymentId: 'pay_1', signature },
        h,
      );
      expect(v.status).toBe(400);
    }
    expect((await call('GET', '/api/auth/me', undefined, h)).json.user!.adsRemoved).toBe(false);
  });

  it("refuses someone else's order even with a genuine signature", async () => {
    const ann = await signIn('ann@example.com');
    const bob = await signIn('bob@example.com');
    const o = await order(ann);
    const v = await call(
      'POST',
      '/api/auth/pay/verify',
      { orderId: o.json.orderId, paymentId: 'pay_1', signature: sign(o.json.orderId!, 'pay_1') },
      bob,
    );
    expect(v.status).toBe(400);
    expect((await call('GET', '/api/auth/me', undefined, bob)).json.user!.adsRemoved).toBe(false);
  });

  it('refuses an order id the server never made', async () => {
    const h = await signIn('ann@example.com');
    const v = await call(
      'POST',
      '/api/auth/pay/verify',
      { orderId: 'order_999', paymentId: 'pay_1', signature: sign('order_999', 'pay_1') },
      h,
    );
    expect(v.status).toBe(400);
  });

  it('reporting the same payment twice is still a success and records it once', async () => {
    const h = await signIn('ann@example.com');
    const o = await order(h);
    const body = {
      orderId: o.json.orderId,
      paymentId: 'pay_1',
      signature: sign(o.json.orderId!, 'pay_1'),
    };
    expect((await call('POST', '/api/auth/pay/verify', body, h)).status).toBe(200);
    expect((await call('POST', '/api/auth/pay/verify', body, h)).status).toBe(200);
    expect(store.findUserByEmail('ann@example.com')!.payments).toHaveLength(1);
  });

  it('does not sell the same player ad removal twice', async () => {
    const h = await signIn('ann@example.com');
    const o = await order(h);
    await call(
      'POST',
      '/api/auth/pay/verify',
      { orderId: o.json.orderId, paymentId: 'pay_1', signature: sign(o.json.orderId!, 'pay_1') },
      h,
    );
    expect((await order(h)).status).toBe(400);
  });

  it('says so when Razorpay refuses the order', async () => {
    razorpayOk = false;
    const h = await signIn('ann@example.com');
    expect((await order(h)).status).toBe(400);
  });

  it('refuses a POST from another site', async () => {
    const h = await signIn('ann@example.com');
    expect(
      (await call('POST', '/api/auth/pay/order', {}, { ...h, origin: 'https://evil.test' })).status,
    ).toBe(403);
    expect(razorpayCalls).toHaveLength(0);
  });

  it('/me says whether payment is on and the price; off means no pay routes', async () => {
    expect((await call('GET', '/api/auth/me')).json.payments).toEqual({ pricePaise: PRICE });
    await app.close();
    await start(false);
    const h = await signIn('ann@example.com');
    expect((await call('GET', '/api/auth/me')).json.payments).toBeNull();
    expect((await order(h)).status).toBe(404);
  });
});

describe('Razorpay webhook (a browser that closed before reporting)', () => {
  const event = (orderId: string, amount = PRICE) =>
    JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_9', order_id: orderId, amount } } },
    });
  const hook = (raw: string, secret = WEBHOOK) => ({
    'x-razorpay-signature': createHmac('sha256', secret).update(raw).digest('hex'),
  });

  it('a genuine captured-payment event removes the ads', async () => {
    const h = await signIn('ann@example.com');
    const o = await order(h);
    const raw = event(o.json.orderId!);
    const r = await call('POST', '/api/auth/pay/webhook', raw, hook(raw));
    expect(r.status).toBe(200);
    expect((await call('GET', '/api/auth/me', undefined, h)).json.user!.adsRemoved).toBe(true);
  });

  it('then the browser reporting the same payment still succeeds', async () => {
    const h = await signIn('ann@example.com');
    const o = await order(h);
    const raw = event(o.json.orderId!);
    await call('POST', '/api/auth/pay/webhook', raw, hook(raw));
    const v = await call(
      'POST',
      '/api/auth/pay/verify',
      { orderId: o.json.orderId, paymentId: 'pay_9', signature: sign(o.json.orderId!, 'pay_9') },
      h,
    );
    expect(v.status).toBe(200);
  });

  it('refuses a forged event (wrong signature) and changes nothing', async () => {
    const h = await signIn('ann@example.com');
    const o = await order(h);
    const raw = event(o.json.orderId!);
    expect(
      (await call('POST', '/api/auth/pay/webhook', raw, hook(raw, 'not-the-secret'))).status,
    ).toBe(400);
    expect((await call('POST', '/api/auth/pay/webhook', raw)).status).toBe(400);
    expect((await call('GET', '/api/auth/me', undefined, h)).json.user!.adsRemoved).toBe(false);
  });

  it('ignores a genuine event whose amount is not the order amount', async () => {
    const h = await signIn('ann@example.com');
    const o = await order(h);
    const raw = event(o.json.orderId!, 100);
    expect((await call('POST', '/api/auth/pay/webhook', raw, hook(raw))).status).toBe(200);
    expect((await call('GET', '/api/auth/me', undefined, h)).json.user!.adsRemoved).toBe(false);
  });
});
