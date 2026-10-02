import { adminClient, corsHeaders, hmacSha256Hex, json, markPaid, safeEqual } from '../_shared/common.ts';

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
    await markPaid(db, booking_id, razorpay_order_id, razorpay_payment_id);
    const { data } = await db
      .from('bookings')
      .select('payment_status, status')
      .eq('id', booking_id)
      .maybeSingle();

    return json({ verified: true, payment_status: data?.payment_status, status: data?.status });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
