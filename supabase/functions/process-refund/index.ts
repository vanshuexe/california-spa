// Admin-only: refund the money a booking owes (booking.refund_due) through Razorpay.
// Every request is checked against admin_users and written to the audit trail.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { adminClient, corsHeaders, json, razorpay, sendRefundEmail } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });
    const { data: caller } = await userClient.auth.getUser();
    if (!caller?.user) return json({ error: 'Not signed in' }, 401);

    const db = adminClient();
    const { data: admin } = await db.from('admin_users').select('user_id').eq('user_id', caller.user.id).maybeSingle();
    if (!admin) return json({ error: 'Admins only' }, 403);

    const { booking_id, amount: rawAmount, reason } = await req.json();
    if (!booking_id) return json({ error: 'booking_id required' }, 400);

    const { data: booking } = await db.from('bookings').select('*').eq('id', booking_id).maybeSingle();
    if (!booking) return json({ error: 'Booking not found' }, 404);
    if (booking.status !== 'cancelled') return json({ error: 'Only cancelled bookings can be refunded.' }, 409);

    // money already on its way back
    const { data: inflight } = await db
      .from('booking_refunds')
      .select('amount')
      .eq('booking_id', booking_id)
      .eq('status', 'processing');
    const processing = (inflight || []).reduce((s: number, r: { amount: number }) => s + r.amount, 0);
    const available = Number(booking.refund_due) - processing;
    if (available <= 0) {
      return json({ error: processing > 0 ? 'A refund is already being processed for this booking.' : 'No refund is due for this booking.' }, 409);
    }
    const amount = Math.round(Number(rawAmount ?? available));
    if (!(amount > 0) || amount > available) return json({ error: `Refund must be between ₹1 and ₹${available}` }, 400);

    // refund the newest online payments first; cash / UPI payments cannot be refunded through Razorpay
    const { data: payments } = await db
      .from('booking_payments')
      .select('id, amount, refunded_amount, razorpay_payment_id')
      .eq('booking_id', booking_id)
      .eq('status', 'paid')
      .eq('method', 'online')
      .not('razorpay_payment_id', 'is', null)
      .order('paid_at', { ascending: false });

    let left = amount;
    const created: { refund_id: string; amount: number; status: string }[] = [];
    let n = 0;
    for (const p of payments || []) {
      if (left <= 0) break;
      const refundable = p.amount - p.refunded_amount;
      if (refundable <= 0) continue;
      const part = Math.min(refundable, left);
      n++;
      const res = await razorpay(`/payments/${p.razorpay_payment_id}/refund`, {
        amount: part * 100,
        speed: 'normal',
        receipt: `${booking.booking_ref}-R${n}-${Date.now() % 100000}`.slice(0, 40),
        notes: { booking_id, reason: String(reason || 'Cancellation refund').slice(0, 200) },
      });
      if (!res.ok) {
        await db.rpc('log_booking_event', {
          p_booking: booking_id,
          p_role: 'admin',
          p_action: 'refund_request_failed',
          p_details: `${part} on ${p.razorpay_payment_id}: ${res.data?.error?.description || res.status}`,
        });
        return json(
          { error: res.data?.error?.description || 'Razorpay could not create the refund', created },
          502
        );
      }
      const refundId: string = res.data.id;
      await db.from('booking_refunds').insert({
        booking_id,
        payment_id: p.id,
        razorpay_payment_id: p.razorpay_payment_id,
        razorpay_refund_id: refundId,
        amount: part,
        status: 'processing',
        reason: String(reason || 'Cancellation refund').slice(0, 300),
        requested_by: caller.user.id,
      });
      // some refunds are instant; otherwise the webhook confirms them
      if (res.data.status === 'processed') {
        await db.rpc('record_refund', { p_payment: p.razorpay_payment_id, p_refund: refundId, p_amount: part });
      }
      created.push({ refund_id: refundId, amount: part, status: res.data.status });
      left -= part;
    }

    await db.rpc('log_booking_event', {
      p_booking: booking_id,
      p_role: 'admin',
      p_action: 'refund_requested',
      p_details: `Admin ${caller.user.email ?? caller.user.id} requested ${amount - left} via Razorpay: ${created.map((c) => c.refund_id).join(', ') || 'none'}${left > 0 ? `; ${left} was paid by cash/UPI and must be returned manually` : ''}`,
    });
    if (created.length) await sendRefundEmail(booking, amount - left, 'initiated', created[0].refund_id);

    return json({ ok: true, refunds: created, requested: amount - left, manual_amount: left });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
