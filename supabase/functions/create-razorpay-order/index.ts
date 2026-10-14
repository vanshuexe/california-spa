import { adminClient, corsHeaders, DURATION_PRICES, json, razorpay } from '../_shared/common.ts';
import { ADVANCE_OPTIONS, bookingStart, getPolicySettings } from '../_shared/policy.ts';

// Creates a Razorpay order for either the ADVANCE (Rs 500 / Rs 1,000) or the BALANCE of a booking.
// Every amount is decided here on the server; the browser only says which kind it wants.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { booking_id, kind: rawKind, advance, policy_ack } = await req.json();
    if (!booking_id) return json({ error: 'booking_id required' }, 400);
    const kind = rawKind === 'balance' ? 'balance' : 'advance';

    const db = adminClient();
    await db.rpc('expire_stale_holds'); // release slots held by unpaid bookings
    const { data: booking, error } = await db.from('bookings').select('*').eq('id', booking_id).maybeSingle();
    if (error || !booking) return json({ error: 'Booking not found' }, 404);
    if (booking.status === 'cancelled') {
      return json(
        {
          error:
            booking.cancel_reason === 'expired'
              ? 'The hold on this slot expired because the advance was not paid in time. Please make a new booking.'
              : 'Booking is cancelled',
        },
        409
      );
    }

    const price = DURATION_PRICES[booking.duration];
    if (!price) return json({ error: 'Unknown duration' }, 400);
    const paidSoFar = Number(booking.amount_paid || 0);
    const balance = price - paidSoFar;

    let amount: number;
    if (kind === 'advance') {
      if (paidSoFar > 0) return json({ error: 'The advance is already paid. Use "Pay Balance".' }, 409);
      const chosen = Number(advance ?? booking.advance_amount);
      // only the allowed advance amounts, and always less than the full price so a balance remains
      if (!ADVANCE_OPTIONS.includes(chosen) || chosen >= price) {
        return json({ error: `Choose an advance of ${ADVANCE_OPTIONS.map((a) => '₹' + a).join(' or ')}` }, 400);
      }
      // the customer must have accepted the cancellation / refund policy (recorded below)
      if (policy_ack !== true && !booking.policy_accepted_at) {
        return json({ error: 'Please accept the payment and cancellation policy before paying.' }, 400);
      }
      amount = chosen;
    } else {
      if (paidSoFar <= 0) return json({ error: 'Pay the advance first to confirm the booking.' }, 409);
      if (balance <= 0) return json({ error: 'Nothing left to pay' }, 409);
      amount = balance; // can never exceed what is still owed
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID')!;

    // Double-clicks / refreshes: reuse an unpaid order for the same booking, kind and amount (last 20 min)
    const since = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const { data: existing } = await db
      .from('booking_payments')
      .select('razorpay_order_id, amount')
      .eq('booking_id', booking_id)
      .eq('kind', kind)
      .eq('status', 'created')
      .eq('method', 'online')
      .eq('amount', amount)
      .gt('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let orderId: string;
    if (existing?.razorpay_order_id) {
      orderId = existing.razorpay_order_id;
    } else {
      const res = await razorpay('/orders', {
        amount: amount * 100, // paise
        currency: 'INR',
        receipt: `${booking.booking_ref}-${kind}`.slice(0, 40),
        notes: { booking_id, kind },
      });
      if (!res.ok) return json({ error: res.data?.error?.description || 'Razorpay error' }, 502);
      orderId = res.data.id;
      const { error: payErr } = await db.from('booking_payments').insert({
        booking_id,
        kind,
        amount,
        razorpay_order_id: orderId,
        status: 'created',
      });
      if (payErr) return json({ error: payErr.message }, 500);
    }

    let cancelDeadline: string | null = booking.cancel_deadline;
    if (kind === 'advance') {
      // snapshot the policy the customer accepted (later changes by the admin do not affect this booking)
      const { cancellationHours } = await getPolicySettings(db);
      const hours = booking.policy_hours ?? cancellationHours;
      cancelDeadline = new Date(bookingStart(booking.booking_date, booking.booking_time).getTime() - hours * 3600_000).toISOString();
      await db
        .from('bookings')
        .update({
          price,
          advance_amount: amount,
          policy_hours: hours,
          cancel_deadline: cancelDeadline,
          policy_accepted_at: booking.policy_accepted_at ?? new Date().toISOString(),
        })
        .eq('id', booking_id);
      if (!booking.policy_accepted_at) {
        await db.rpc('log_booking_event', {
          p_booking: booking_id,
          p_role: 'customer',
          p_action: 'policy_accepted',
          p_details: `Accepted ${hours}h cancellation policy; refundable until ${cancelDeadline}; advance ${amount}`,
        });
      }
    } else if (!booking.price) {
      await db.from('bookings').update({ price }).eq('id', booking_id);
    }

    return json({
      order_id: orderId,
      amount: amount * 100,
      currency: 'INR',
      key_id: keyId,
      kind,
      price,
      amount_rupees: amount,
      balance_after: price - paidSoFar - amount,
      cancel_deadline: cancelDeadline,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
