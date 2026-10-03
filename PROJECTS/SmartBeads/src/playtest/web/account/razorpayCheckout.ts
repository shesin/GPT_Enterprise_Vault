/**
 * Opens Razorpay Checkout for an order the server created. Razorpay's script is loaded only when the
 * player presses "Remove ads", so nothing is requested from Razorpay before that.
 */
import type { PaymentOrder } from './accountClient';

export interface PaymentResult {
  paymentId: string;
  signature: string;
}

interface RazorpayCtor {
  new (options: Record<string, unknown>): { open(): void; on(event: string, cb: () => void): void };
}

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

function loadScript(): Promise<RazorpayCtor | undefined> {
  const have = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
  if (have) return Promise.resolve(have);
  return new Promise((resolve) => {
    const tag = document.createElement('script');
    tag.src = SCRIPT_URL;
    tag.async = true;
    tag.onload = () => resolve((window as unknown as { Razorpay?: RazorpayCtor }).Razorpay);
    tag.onerror = () => resolve(undefined);
    document.head.appendChild(tag);
  });
}

/** Resolves with the payment proof, or undefined when the player closed the window or it could not load. */
export async function payWithRazorpay(
  order: PaymentOrder,
  email: string,
): Promise<PaymentResult | undefined> {
  const Razorpay = await loadScript();
  if (!Razorpay) return undefined;
  return new Promise((resolve) => {
    const box = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: 'Smart Bead Chess',
      description: 'Remove ads',
      prefill: { email },
      handler: (r: { razorpay_payment_id: string; razorpay_signature: string }) =>
        resolve({ paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
      modal: { ondismiss: () => resolve(undefined) },
    });
    box.open();
  });
}
