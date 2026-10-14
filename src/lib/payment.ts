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
          resolve({
            status: 'failed',
            message: 'Payment could not be verified. If money was deducted, it will be reconciled automatically.',
          });
        } else {
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
      modal: { ondismiss: () => resolve({ status: 'dismissed' }) },
    });
    rzp.on('payment.failed', (resp: any) => {
      resolve({ status: 'failed', message: resp?.error?.description || 'Payment failed.' });
    });
    rzp.open();
  });
}
