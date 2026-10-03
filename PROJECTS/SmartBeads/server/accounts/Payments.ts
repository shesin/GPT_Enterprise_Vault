/**
 * Ad-removal payment (A20), switched on only when RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and
 * AD_REMOVAL_PRICE_PAISE are set. The server creates the order (so the price is ours, not the browser's),
 * the browser pays in Razorpay Checkout, and the result counts only after its signature checks out against
 * the key secret. A Razorpay webhook (RAZORPAY_WEBHOOK_SECRET) catches a payment whose browser closed early.
 * Test keys (rzp_test_...) make no real charge.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import type { AccountStore } from './AccountStore';

type FetchFn = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

export interface OrderForBrowser {
  keyId: string;
  orderId: string;
  amount: number;
  currency: 'INR';
}

const hmac = (secret: string, data: string | Buffer): string =>
  createHmac('sha256', secret).update(data).digest('hex');

function sameHex(a: unknown, b: string): boolean {
  if (typeof a !== 'string' || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export class Payments {
  constructor(
    private readonly store: AccountStore,
    readonly keyId: string,
    private readonly keySecret: string,
    readonly pricePaise: number,
    private readonly webhookSecret: string | undefined,
    private readonly now: () => number,
    private readonly doFetch: FetchFn = (url, init) => fetch(url, init),
  ) {}

  async createOrder(userId: string): Promise<OrderForBrowser | undefined> {
    const user = this.store.getUser(userId);
    if (!user || user.adsRemoved) return undefined;
    try {
      const res = await this.doFetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
        },
        body: JSON.stringify({
          amount: this.pricePaise,
          currency: 'INR',
          receipt: `adfree_${userId.slice(0, 8)}_${this.now()}`,
          notes: { userId },
        }),
      });
      if (!res.ok) return undefined;
      const order = (await res.json()) as { id?: string };
      if (!order.id) return undefined;
      this.store.putOrder(order.id, { userId, amount: this.pricePaise, at: this.now() });
      return { keyId: this.keyId, orderId: order.id, amount: this.pricePaise, currency: 'INR' };
    } catch {
      return undefined;
    }
  }

  /** The browser reports a payment: counts only for the signed-in user's own order with a valid signature. */
  verifyPayment(userId: string, orderId: unknown, paymentId: unknown, signature: unknown): boolean {
    if (typeof orderId !== 'string' || typeof paymentId !== 'string') return false;
    if (!sameHex(signature, hmac(this.keySecret, `${orderId}|${paymentId}`))) return false;
    const user = this.store.getUser(userId);
    // The webhook may have recorded this payment first: the browser's report is then still a success.
    if (user?.payments?.some((p) => p.orderId === orderId && p.paymentId === paymentId))
      return true;
    const order = this.store.getOrder(orderId);
    if (!order || order.userId !== userId) return false;
    return this.grant(orderId, paymentId);
  }

  /** Razorpay tells us a payment was captured. Returns true when the body was genuine. */
  handleWebhook(rawBody: Buffer, signature: unknown): boolean {
    if (!this.webhookSecret || !sameHex(signature, hmac(this.webhookSecret, rawBody))) return false;
    try {
      const event = JSON.parse(rawBody.toString('utf8')) as {
        event?: string;
        payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number } } };
      };
      const payment = event.payload?.payment?.entity;
      if (event.event === 'payment.captured' && payment?.order_id && payment.id) {
        const order = this.store.getOrder(payment.order_id);
        if (order && order.amount === payment.amount) this.grant(payment.order_id, payment.id);
      }
    } catch {
      /* a genuine signature on a body we cannot read: nothing to do */
    }
    return true;
  }

  private grant(orderId: string, paymentId: string): boolean {
    const order = this.store.getOrder(orderId);
    const user = order && this.store.getUser(order.userId);
    if (!order || !user) return false;
    user.adsRemoved = true;
    user.payments = [
      ...(user.payments ?? []),
      { orderId, paymentId, amount: order.amount, at: this.now() },
    ];
    this.store.putUser(user);
    this.store.deleteOrder(orderId);
    return true;
  }
}
