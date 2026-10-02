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

export type PaymentResult =
  | { status: 'paid' }
  | { status: 'failed'; message: string }
  | { status: 'dismissed' };

interface PayArgs {
  bookingId: string;
  name: string;
  phone: string;
  email?: string;
}

// 1) server creates the order  2) Razorpay checkout opens  3) server verifies the signature
// and flips the booking to PAID + CONFIRMED. Any failure leaves the booking unpaid/pending.
export async function payForBooking({ bookingId, name, phone, email }: PayArgs): Promise<PaymentResult> {
  if (!(await loadRazorpayScript()) || !window.Razorpay) {
    return { status: 'failed', message: 'Could not load the payment gateway. Check your internet connection.' };
  }

  const { data: order, error } = await supabase.functions.invoke('create-razorpay-order', {
    body: { booking_id: bookingId },
  });
  if (error || !order?.order_id) {
    return { status: 'failed', message: order?.error || error?.message || 'Could not start payment.' };
  }

  return new Promise<PaymentResult>((resolve) => {
    const rzp = new window.Razorpay!({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: 'Doorstep Royale Spa',
      description: 'Spa appointment booking',
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
          resolve({ status: 'paid' });
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
