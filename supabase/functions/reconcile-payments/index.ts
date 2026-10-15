// Safety net: asks Razorpay which payments for our open orders were actually paid, and records them
// through the same verified path as the browser callback / webhook (finalizePayment).
//
// Why: UPI apps often send the customer away from the browser, so the browser's "payment success"
// callback can be lost, and a webhook may not be configured yet. The money is real, so the server
// must never depend on either. This runs every minute (pg_cron) and on demand for one booking.
//
// Safe to expose: it only records payments that Razorpay itself reports as captured for an order we
// created, it is idempotent, and a public call is limited to one booking.
import { adminClient, corsHeaders, finalizePayment, json, razorpay, safeEqual } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '';
    const isCron = secret !== '' && safeEqual(req.headers.get('x-cron-secret') || '', secret);
    const scope: string | null = body?.booking_id ?? null;
    if (!isCron && !scope) return json({ error: 'booking_id required' }, 400);

    const db = adminClient();
    const since = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
    let q = db
      .from('booking_payments')
      .select('id, booking_id, razorpay_order_id, amount, status')
      .in('status', ['created', 'failed'])
      .eq('method', 'online')
      .not('razorpay_order_id', 'is', null)
      .gt('created_at', since)
      .order('created_at', { ascending: false })
      .limit(40);
    if (scope) q = q.eq('booking_id', scope);
    const { data: open } = await q;

    const recorded: { booking_id: string; payment_id: string; amount: number }[] = [];
    let checked = 0;
    for (const row of open || []) {
      checked++;
      const res = await razorpay(`/orders/${row.razorpay_order_id}/payments`);
      if (!res.ok) continue;
      // deno-lint-ignore no-explicit-any
      const items: any[] = res.data?.items || [];
      // deno-lint-ignore no-explicit-any
      let paid = items.find((p: any) => p.status === 'captured');
      if (!paid) {
        // authorised but not captured yet: capture it (only for the exact order amount)
        // deno-lint-ignore no-explicit-any
        const auth = items.find((p: any) => p.status === 'authorized' && p.amount === row.amount * 100);
        if (auth) {
          const cap = await razorpay(`/payments/${auth.id}/capture`, { amount: auth.amount, currency: auth.currency });
          if (cap.ok) paid = cap.data;
        }
      }
      if (!paid) continue;
      // the order amount must match what we expected for this payment row
      if (paid.amount !== row.amount * 100) continue;
      const result = await finalizePayment(db, row.razorpay_order_id, paid.id);
      if (result) recorded.push({ booking_id: row.booking_id, payment_id: paid.id, amount: row.amount });
    }

    let booking = null;
    if (scope) {
      const { data } = await db
        .from('bookings')
        .select('booking_ref, status, payment_status, price, amount_paid, advance_amount, cancel_deadline')
        .eq('id', scope)
        .maybeSingle();
      booking = data;
    }
    return json({ ok: true, checked, recorded: recorded.length, items: recorded, booking });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
