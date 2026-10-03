// Admin-only: suspend / unsuspend a user's account after reviewing a flagged conversation.
// Suspending bans the login in Supabase Auth (they can no longer sign in) and blocks chat
// immediately through public.chat_user_status.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { adminClient, corsHeaders, json } from '../_shared/common.ts';

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

    const { action, user_id, reason } = await req.json();
    if (!user_id || !['suspend', 'unsuspend'].includes(action)) return json({ error: 'user_id and action required' }, 400);

    if (action === 'suspend') {
      if (user_id === caller.user.id) return json({ error: 'You cannot suspend yourself' }, 400);
      const { data: target } = await db.from('admin_users').select('user_id').eq('user_id', user_id).maybeSingle();
      if (target) return json({ error: 'Admins cannot be suspended here' }, 400);

      const { error: banErr } = await db.auth.admin.updateUserById(user_id, { ban_duration: '876000h' });
      if (banErr) return json({ error: banErr.message }, 500);
      await db.from('chat_user_status').upsert({
        user_id,
        suspended: true,
        suspended_reason: String(reason || 'Violation of chat rules').slice(0, 500),
        suspended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await db.from('chat_moderation_log').insert({
        actor_id: caller.user.id,
        actor_role: 'admin',
        action: 'account_suspended',
        target_user_id: user_id,
        details: String(reason || 'Violation of chat rules').slice(0, 500),
      });
      return json({ ok: true, suspended: true });
    }

    const { error: unbanErr } = await db.auth.admin.updateUserById(user_id, { ban_duration: 'none' });
    if (unbanErr) return json({ error: unbanErr.message }, 500);
    await db
      .from('chat_user_status')
      .upsert({ user_id, suspended: false, suspended_reason: null, muted_until: null, updated_at: new Date().toISOString() });
    await db.from('chat_violations').update({ forgiven: true }).eq('user_id', user_id).eq('forgiven', false);
    await db.from('chat_moderation_log').insert({
      actor_id: caller.user.id,
      actor_role: 'admin',
      action: 'account_restored',
      target_user_id: user_id,
    });
    return json({ ok: true, suspended: false });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
