// Razorpay -> server confirmation. Covers the case where the customer pays but closes the
// browser before the verify call. Configure in Razorpay Dashboard > Webhooks with events
// payment.captured, payment.failed, refund.processed and refund.failed, and the same secret as RAZORPAY_WEBHOOK_SECRET.
import { adminClient, finalizePayment, hmacSha256Hex, safeEqual, sendRefundEmail } from '../_shared/common.ts';

Deno.serve(async (req) => {
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';
  const expected = await hmacSha256Hex(Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!, raw);
  if (!safeEqual(expected, signature)) return new Response('invalid signature', { status: 400 });

  try {
    const event = JSON.parse(raw);
    const db = adminClient();

    // Refunds: updates the payment + booking (a full refund cancels the booking, which also closes the chat).
    if (event.event === 'refund.processed' || event.event === 'refund.failed') {
      const refund = event?.payload?.refund?.entity;
      const paymentId = refund?.payment_id || event?.payload?.payment?.entity?.id;
      if (!refund?.id) return new Response('ok');
      const rupeeAmount = Math.round(Number(refund.amount || 0) / 100) || null;

      if (event.event === 'refund.processed') {
        const { data } = await db.rpc('record_refund', { p_payment: paymentId, p_refund: refund.id, p_amount: rupeeAmount });
        if (data?.booking_id) {
          const { data: booking } = await db.from('bookings').select('*').eq('id', data.booking_id).maybeSingle();
          await sendRefundEmail(booking, data.amount ?? rupeeAmount ?? 0, 'processed', refund.id);
        }
      } else {
        const { data } = await db.rpc('record_refund_failed', { p_refund: refund.id });
        if (data?.booking_id) {
          const { data: booking } = await db.from('bookings').select('*').eq('id', data.booking_id).maybeSingle();
          await sendRefundEmail(booking, rupeeAmount ?? 0, 'failed', refund.id);
        }
      }
      return new Response('ok');
    }

    const payment = event?.payload?.payment?.entity;
    if (!payment?.order_id) return new Response('ok');

    if (event.event === 'payment.captured') {
      await finalizePayment(db, payment.order_id, payment.id); // no-op if the browser already verified it
    } else if (event.event === 'payment.failed') {
      // booking stays unpaid / pending; a paid booking is never downgraded
      await db.rpc('record_payment_failed', { p_order: payment.order_id });
    }
    return new Response('ok');
  } catch (e) {
    console.error(e);
    return new Response('error', { status: 500 });
  }
});
