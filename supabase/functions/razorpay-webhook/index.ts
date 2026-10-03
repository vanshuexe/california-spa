// Razorpay -> server confirmation. Covers the case where the customer pays but closes the
// browser before the verify call. Configure in Razorpay Dashboard > Webhooks with events
// payment.captured and payment.failed, and the same secret as RAZORPAY_WEBHOOK_SECRET.
import { adminClient, hmacSha256Hex, markPaid, safeEqual } from '../_shared/common.ts';

Deno.serve(async (req) => {
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';
  const expected = await hmacSha256Hex(Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!, raw);
  if (!safeEqual(expected, signature)) return new Response('invalid signature', { status: 400 });

  try {
    const event = JSON.parse(raw);
    const db = adminClient();

    // Refund: mark the booking refunded + cancelled, which also closes the therapist chat.
    if (event.event === 'refund.processed' || event.event === 'refund.created') {
      const paymentId = event?.payload?.refund?.entity?.payment_id || event?.payload?.payment?.entity?.id;
      if (event.event === 'refund.processed' && paymentId) {
        await db
          .from('bookings')
          .update({ payment_status: 'refunded', status: 'cancelled' })
          .eq('razorpay_payment_id', paymentId)
          .neq('status', 'completed');
      }
      return new Response('ok');
    }

    const payment = event?.payload?.payment?.entity;
    if (!payment?.order_id) return new Response('ok');

    const { data: booking } = await db
      .from('bookings')
      .select('id')
      .eq('razorpay_order_id', payment.order_id)
      .maybeSingle();
    if (!booking) return new Response('ok');

    if (event.event === 'payment.captured') {
      await markPaid(db, booking.id, payment.order_id, payment.id);
    } else if (event.event === 'payment.failed') {
      // Booking stays unpaid/pending; never downgrade a paid booking.
      await db
        .from('bookings')
        .update({ payment_status: 'failed' })
        .eq('id', booking.id)
        .neq('payment_status', 'paid');
    }
    return new Response('ok');
  } catch (e) {
    console.error(e);
    return new Response('error', { status: 500 });
  }
});
