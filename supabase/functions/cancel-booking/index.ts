// A signed-in customer cancels their own booking. The database function decides refund eligibility
// from the deadline saved with the booking; this function then emails the customer the outcome.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { adminClient, corsHeaders, json, sendCancellationEmail } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { booking_id } = await req.json();
    if (!booking_id) return json({ error: 'booking_id required' }, 400);

    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: 'Not signed in' }, 401);

    // runs as the customer, so the database only lets them cancel their own booking
    const { data: result, error } = await userClient.rpc('cancel_my_booking', { p_id: booking_id });
    if (error) return json({ error: error.message }, 400);

    const db = adminClient();
    const { data: booking } = await db.from('bookings').select('*').eq('id', booking_id).maybeSingle();
    if (booking) await sendCancellationEmail(booking, result, true);
    return json({ ok: true, ...result });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
