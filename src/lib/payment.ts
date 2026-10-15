import { supabase } from './supabase';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (resp: any) => void) => void;
    };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// supabase-js hides the server's message behind "Edge Function returned a non-2xx status code".
// deno-lint-ignore no-explicit-any
async function readError(error: any, data: any, fallback: string): Promise<string> {
  if (data?.error) return String(data.error);
  try {
    const body = await error?.context?.json?.();
    const msg: string | undefined = body?.error;
    if (msg) {
      // Razorpay account / key problems are not something the customer can fix
      if (/authentication failed|razorpay/i.test(msg)) return 'The payment gateway is temporarily unavailable. Please try again in a few minutes or call us to book.';
      return msg;
    }
  } catch {
    /* not JSON */
  }
  return error?.message || fallback;
}

export interface PaymentSummary {
  price: number;
  amount_paid: number;
  balance: number;
  payment_status: string;
  status: string;
  receipt_emailed: boolean;
}

export type PaymentResult =
  | { status: 'paid'; summary: PaymentSummary }
  | { status: 'failed'; message: string }
  | { status: 'dismissed' };

interface PayArgs {
  bookingId: string;
  kind: 'advance' | 'balance';
  advance?: number; // 500 or 1000, for kind "advance"
  policyAck?: boolean; // the customer accepted the cancellation / refund policy
  name: string;
  phone: string;
  email?: string;
}

const PENDING_KEY = 'drs.pendingPayment';
const rememberPending = (bookingId: string, kind: string) => {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ bookingId, kind, ts: Date.now() }));
  } catch {
    /* private mode */
  }
};
const forgetPending = () => {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
};

interface ReconcileResult {
  recorded: number;
  booking: { booking_ref: string; status: string; payment_status: string; price: number | null; amount_paid: number; advance_amount: number | null } | null;
}

// Asks the server to check with Razorpay whether this booking's checkout was actually paid.
// (A UPI app can take the customer away from the page, so the browser may never hear "success".)
export async function reconcileBooking(bookingId: string): Promise<ReconcileResult | null> {
  const { data, error } = await supabase.functions.invoke('reconcile-payments', { body: { booking_id: bookingId } });
  if (error || !data?.ok) return null;
  return { recorded: Number(data.recorded || 0), booking: data.booking ?? null };
}

const summaryFrom = (b: NonNullable<ReconcileResult['booking']>): PaymentSummary => ({
  price: b.price ?? 0,
  amount_paid: b.amount_paid,
  balance: Math.max((b.price ?? 0) - b.amount_paid, 0),
  payment_status: b.payment_status,
  status: b.status,
  receipt_emailed: false,
});

// Run when the booking page opens: if the customer came back from a UPI app (or reopened the page)
// after paying, find out and confirm the booking. Returns the payment to announce, if any.
export async function recoverPendingPayment(): Promise<{ summary: PaymentSummary; bookingRef: string; kind: string } | null> {
  let pending: { bookingId: string; kind: string; ts: number } | null = null;
  try {
    pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
  } catch {
    pending = null;
  }
  if (!pending || Date.now() - pending.ts > 3 * 3600_000) {
    forgetPending();
    return null;
  }
  const r = await reconcileBooking(pending.bookingId);
  if (!r?.booking) return null;
  forgetPending();
  if (r.recorded > 0 || r.booking.amount_paid > 0) {
    return { summary: summaryFrom(r.booking), bookingRef: r.booking.booking_ref, kind: pending.kind };
  }
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));


// 1) the server creates the order (it decides the amount)  2) Razorpay checkout opens
// 3) the server verifies Razorpay's signature, records the payment and confirms the booking.
// Nothing is trusted from the checkout "success" screen alone. Any failure leaves the booking unpaid.
export async function payForBooking({ bookingId, kind, advance, policyAck, name, phone, email }: PayArgs): Promise<PaymentResult> {
  if (!(await loadRazorpayScript()) || !window.Razorpay) {
    return { status: 'failed', message: 'Could not load the payment gateway. Check your internet connection.' };
  }

  const { data: order, error } = await supabase.functions.invoke('create-razorpay-order', {
    body: { booking_id: bookingId, kind, advance, policy_ack: policyAck === true },
  });
  if (error || !order?.order_id) {
    return { status: 'failed', message: await readError(error, order, 'Could not start payment.') };
  }

  return new Promise<PaymentResult>((resolve) => {
    let lastFailure = '';
    rememberPending(bookingId, kind);
    const rzp = new window.Razorpay!({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: 'Doorstep Royale Spa',
      description: kind === 'advance' ? `Advance payment (balance ₹${order.balance_after})` : 'Balance payment',
      prefill: { name, contact: phone, email: email || undefined },
      theme: { color: '#840000' },
      handler: async (resp: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        const { data, error: vErr } = await supabase.functions.invoke('verify-razorpay-payment', {
          body: { booking_id: bookingId, ...resp },
        });
        if (vErr || !data?.verified) {
          // verification call failed: the server can still confirm it by asking Razorpay directly
          const r = await reconcileBooking(bookingId);
          if (r?.booking && r.booking.amount_paid > 0) {
            forgetPending();
            resolve({ status: 'paid', summary: summaryFrom(r.booking) });
            return;
          }
          resolve({
            status: 'failed',
            message: 'We could not confirm the payment yet. If money was deducted, your booking is confirmed automatically within a few minutes, or call us.',
          });
        } else {
          forgetPending();
          resolve({
            status: 'paid',
            summary: {
              price: data.price ?? order.price,
              amount_paid: data.amount_paid ?? order.amount_rupees,
              balance: Math.max((data.price ?? order.price) - (data.amount_paid ?? order.amount_rupees), 0),
              payment_status: data.payment_status,
              status: data.status,
              receipt_emailed: Boolean(data.receipt_emailed),
            },
          });
        }
      },
      modal: {
        // The customer closed checkout. They may still have approved the payment in their UPI app,
        // so ask the server to check with Razorpay before telling them it did not go through.
        ondismiss: async () => {
          await sleep(2500);
          const r = await reconcileBooking(bookingId);
          if (r?.booking && r.booking.amount_paid > 0) {
            forgetPending();
            resolve({ status: 'paid', summary: summaryFrom(r.booking) });
          } else if (lastFailure) {
            forgetPending();
            resolve({ status: 'failed', message: lastFailure });
          } else {
            resolve({ status: 'dismissed' });
          }
        },
      },
    });
    // A failed attempt leaves checkout open so the customer can retry with another method:
    // remember the reason, and decide when checkout closes.
    rzp.on('payment.failed', (resp: any) => {
      lastFailure = resp?.error?.description || 'Payment failed.';
    });
    rzp.open();
  });
}
