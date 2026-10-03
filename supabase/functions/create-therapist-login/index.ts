// Admin-only: creates (or replaces) the login for a therapist so they can use /#therapist.
// The caller's JWT is verified by Supabase, and we then check that they are in admin_users.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { adminClient, corsHeaders, json } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: 'Not signed in' }, 401);

    const db = adminClient();
    const { data: admin } = await db
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (!admin) return json({ error: 'Admins only' }, 403);

    const { action, therapist_id, email, password } = await req.json();

    if (action === 'delete') {
      if (!therapist_id) return json({ error: 'therapist_id required' }, 400);
      const { data: acct } = await db
        .from('therapist_accounts')
        .select('user_id')
        .eq('therapist_id', therapist_id)
        .maybeSingle();
      if (!acct) return json({ ok: true, deleted: false });
      await db.from('therapist_accounts').delete().eq('therapist_id', therapist_id);
      const { error: delErr } = await db.auth.admin.deleteUser(acct.user_id);
      if (delErr) return json({ error: delErr.message }, 500);
      return json({ ok: true, deleted: true });
    }

    if (!therapist_id || !email || !password || String(password).length < 8) {
      return json({ error: 'therapist_id, email and a password of 8+ characters are required' }, 400);
    }

    const { data: therapist } = await db.from('therapists').select('id').eq('id', therapist_id).maybeSingle();
    if (!therapist) return json({ error: 'Therapist not found' }, 404);

    // Replace an existing login for this therapist.
    const { data: existing } = await db
      .from('therapist_accounts')
      .select('user_id')
      .eq('therapist_id', therapist_id)
      .maybeSingle();
    if (existing) {
      await db.from('therapist_accounts').delete().eq('therapist_id', therapist_id);
      await db.auth.admin.deleteUser(existing.user_id);
    }

    const { data: created, error: createErr } = await db.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password,
      email_confirm: true,
    });
    if (createErr || !created.user) return json({ error: createErr?.message || 'Could not create user' }, 400);

    const { error: linkErr } = await db.from('therapist_accounts').insert({
      therapist_id,
      user_id: created.user.id,
      email: created.user.email,
    });
    if (linkErr) {
      await db.auth.admin.deleteUser(created.user.id);
      return json({ error: linkErr.message }, 400);
    }
    return json({ ok: true, email: created.user.email });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
