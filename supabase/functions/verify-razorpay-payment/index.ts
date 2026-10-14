import { adminClient, corsHeaders, finalizePayment, hmacSha256Hex, json, safeEqual } from '../_shared/common.ts';

// Called by the browser after Razorpay checkout succeeds. The "success screen" is NOT trusted:
// the payment only counts if Razorpay's signature is valid for this exact order.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!booking_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: 'Missing fields' }, 400);
    }

    const expected = await hmacSha256Hex(
      Deno.env.get('RAZORPAY_KEY_SECRET')!,
      `${razorpay_order_id}|${razorpay_payment_id}`
    );
    if (!safeEqual(expected, razorpay_signature)) {
      return json({ verified: false, error: 'Invalid signature' }, 400);
    }

    const db = adminClient();
    // the order must belong to this booking
    const { data: order } = await db
      .from('booking_payments')
      .select('booking_id')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();
    if (!order || order.booking_id !== booking_id) return json({ verified: false, error: 'Order does not match booking' }, 400);

    const result = await finalizePayment(db, razorpay_order_id, razorpay_payment_id);
    const { data } = await db
      .from('bookings')
      .select('payment_status, status, price, amount_paid, advance_amount, booking_ref, cancel_deadline')
      .eq('id', booking_id)
      .maybeSingle();

    return json({
      verified: true,
      already_recorded: result === null, // true when the webhook got there first
      receipt_emailed: Boolean(result?.receipt_emailed),
      ...data,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
