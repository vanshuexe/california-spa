import { adminClient, corsHeaders, DURATION_PRICES, json } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { booking_id } = await req.json();
    if (!booking_id) return json({ error: 'booking_id required' }, 400);

    const db = adminClient();
    const { data: booking, error } = await db
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .maybeSingle();
    if (error || !booking) return json({ error: 'Booking not found' }, 404);
    if (booking.payment_status === 'paid') return json({ error: 'Already paid' }, 409);
    if (booking.status === 'cancelled') return json({ error: 'Booking is cancelled' }, 409);

    const price = DURATION_PRICES[booking.duration];
    if (!price) return json({ error: 'Unknown duration' }, 400);

    const keyId = Deno.env.get('RAZORPAY_KEY_ID')!;
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${keyId}:${keySecret}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: price * 100, // paise
        currency: 'INR',
        receipt: booking.booking_ref,
        notes: { booking_id },
      }),
    });
    const order = await res.json();
    if (!res.ok) return json({ error: order?.error?.description || 'Razorpay error' }, 502);

    await db
      .from('bookings')
      .update({ razorpay_order_id: order.id, price, payment_status: 'pending' })
      .eq('id', booking_id);

    return json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: keyId });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
