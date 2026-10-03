import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ChatBooking } from '../lib/chat';
import { ChatWindow } from './ChatWindow';

interface Report {
  id: string;
  booking_id: string;
  reporter_id: string;
  reason: string;
  status: 'open' | 'resolved';
  created_at: string;
}

interface Flag {
  id: string;
  booking_id: string;
  user_id: string;
  role: 'customer' | 'therapist';
  reason: string;
  status: 'open' | 'resolved';
  created_at: string;
}

interface Violation {
  id: string;
  booking_id: string;
  user_id: string;
  role: string;
  category: string;
  weight: number;
  excerpt: string | null;
  forgiven: boolean;
  created_at: string;
}

interface UserStatus {
  user_id: string;
  muted_until: string | null;
  suspended: boolean;
  suspended_reason: string | null;
}

interface AuditRow {
  id: string;
  created_at: string;
  actor_role: string;
  action: string;
  target_user_id: string | null;
  booking_id: string | null;
  details: string | null;
}

const ACTION_LABEL: Record<string, string> = {
  message_blocked: '🚫 Message blocked',
  chat_restricted: '⏱ Chat restricted',
  chat_restored: '✅ Chat restored',
  conversation_flagged: '🚨 Conversation flagged',
  flag_reviewed: '👁 Flag reviewed',
  conversation_blocked: '⛔ Conversation blocked',
  conversation_unblocked: '✅ Conversation unblocked',
  account_suspended: '⛔ Account suspended',
  account_restored: '✅ Account restored',
  chat_reported: '🚩 Chat reported',
};

interface Convo {
  booking: ChatBooking;
  count: number;
  last: string;
}

export const ChatsManager: React.FC<{ adminId: string }> = ({ adminId }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [convos, setConvos] = useState<Convo[]>([]);
  const [bookingsById, setBookingsById] = useState<Record<string, ChatBooking>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});
  const [info, setInfo] = useState('');
  const [audit, setAudit] = useState<AuditRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [{ data: rep, error: e1 }, { data: msgs, error: e2 }, { data: fl }, { data: vio }, { data: sts }] = await Promise.all([
      supabase.from('chat_reports').select('*').order('created_at', { ascending: false }),
      supabase.from('messages').select('booking_id, created_at').order('created_at', { ascending: false }).limit(2000),
      supabase.from('chat_flags').select('*').order('created_at', { ascending: false }),
      supabase.from('chat_violations').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('chat_user_status').select('*'),
    ]);
    const { data: logRows } = await supabase
      .from('chat_moderation_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setAudit((logRows as AuditRow[]) || []);
    if (e1 || e2) setError((e1 || e2)!.message);
    const flagList = (fl as Flag[]) || [];
    setFlags(flagList);
    setViolations((vio as Violation[]) || []);
    const stMap: Record<string, UserStatus> = {};
    for (const st of (sts as UserStatus[]) || []) stMap[st.user_id] = st;
    setStatuses(stMap);

    const reportList = (rep as Report[]) || [];
    const stats: Record<string, { count: number; last: string }> = {};
    for (const m of (msgs as { booking_id: string; created_at: string }[]) || []) {
      const s = (stats[m.booking_id] ||= { count: 0, last: m.created_at });
      s.count++;
    }
    const ids = Array.from(
      new Set([...Object.keys(stats), ...reportList.map((r) => r.booking_id), ...flagList.map((f) => f.booking_id)])
    );
    let map: Record<string, ChatBooking> = {};
    if (ids.length) {
      const { data: bks } = await supabase
        .from('bookings')
        .select('id, booking_ref, client_name, therapist, therapist_id, status, payment_status, booking_date, chat_blocked')
        .in('id', ids);
      for (const b of (bks as ChatBooking[]) || []) map[b.id] = b;
    }
    setBookingsById(map);
    setReports(reportList);
    setConvos(
      Object.entries(stats)
        .filter(([id]) => map[id])
        .map(([id, s]) => ({ booking: map[id], count: s.count, last: s.last }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (id: string) => {
    const { error: err } = await supabase.from('chat_reports').update({ status: 'resolved' }).eq('id', id);
    if (err) setError(err.message);
    else load();
  };

  const dismissFlag = async (id: string) => {
    const { error: err } = await supabase.rpc('admin_resolve_flag', { p_flag: id });
    if (err) setError(err.message);
    else load();
  };

  const unmute = async (userId: string) => {
    if (!window.confirm('Re-enable chat for this user and clear their recent strikes?')) return;
    const { error: err } = await supabase.rpc('admin_unmute_user', { p_user: userId });
    if (err) setError(err.message);
    else {
      setInfo('Chat re-enabled.');
      load();
    }
  };

  const restrict = async (userId: string, bookingId: string, name: string) => {
    const input = window.prompt(`Restrict ${name}'s chat for how many hours? (1 - 720)`, '24');
    if (input === null) return;
    const hours = Math.max(1, Math.min(720, parseInt(input, 10) || 24));
    const { error: err } = await supabase.rpc('admin_restrict_user', { p_user: userId, p_hours: hours, p_booking: bookingId });
    if (err) setError(err.message);
    else {
      setInfo(`${name}'s chat restricted for ${hours} hour(s).`);
      load();
    }
  };

  const setSuspended = async (userId: string, suspend: boolean, name: string) => {
    const reason = suspend ? window.prompt(`Suspend ${name}'s account? Enter a reason (optional):`, 'Violation of chat rules') : '';
    if (suspend && reason === null) return;
    if (!suspend && !window.confirm(`Restore ${name}'s account?`)) return;
    const { data, error: err } = await supabase.functions.invoke('admin-chat-user', {
      body: { action: suspend ? 'suspend' : 'unsuspend', user_id: userId, reason },
    });
    if (err || data?.error) {
      setError(data?.error || err?.message || 'Action failed.');
      return;
    }
    setInfo(suspend ? `${name}'s account suspended.` : `${name}'s account restored.`);
    load();
  };

  const openFlags = flags.filter((f) => f.status === 'open');
  const openBooking = openId ? bookingsById[openId] : null;
  const openReports = reports.filter((r) => r.status === 'open');

  return (
    <div className="max-w-5xl mx-auto my-6 px-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-2xl font-bold text-[#840000] m-0">Admin - Chats</h4>
        <button type="button" onClick={load} className="px-3 py-1 rounded bg-white/60 text-[#840000] font-bold text-sm">Refresh</button>
      </div>
      {loading && <p className="text-sm">Loading…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {info && <p className="text-sm font-bold text-[#228b22]">{info}</p>}

      <h5 className="text-lg font-bold text-[#5a0101] border-b border-[#a28321]/50 pb-1 mb-3">
        🚨 Flagged for review ({openFlags.length} open)
      </h5>
      {flags.length === 0 && !loading && (
        <p className="text-sm text-gray-600 mb-4">No flagged conversations. Messages with inappropriate content are blocked automatically.</p>
      )}
      <div className="space-y-3 mb-8">
        {flags.map((f) => {
          const b = bookingsById[f.booking_id];
          const who = f.role === 'customer' ? b?.client_name || 'Customer' : b?.therapist || 'Therapist';
          const st = statuses[f.user_id];
          const muted = Boolean(st?.muted_until && new Date(st.muted_until).getTime() > Date.now());
          const vs = violations.filter((v) => v.user_id === f.user_id && v.booking_id === f.booking_id);
          return (
            <div key={f.id} className={`rounded-lg p-3 text-sm border ${f.status === 'open' ? 'bg-red-50 border-red-300' : 'bg-[#f5f0e8] border-[#a28321]'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <b className="text-[#840000]">{b?.booking_ref ?? 'Booking'}</b> - <b>{who}</b>{' '}
                  <span className="text-xs capitalize">({f.role})</span>
                </div>
                <div className="flex gap-1.5 text-xs font-bold">
                  {st?.suspended && <span className="px-2 py-1 rounded bg-black text-white">SUSPENDED</span>}
                  {muted && <span className="px-2 py-1 rounded bg-yellow-200 text-yellow-900">MUTED</span>}
                  <span className={`px-2 py-1 rounded ${f.status === 'open' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {f.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <p className="my-1 font-bold">{f.reason}</p>
              <div className="text-xs text-gray-600 mb-1">
                {b ? `${b.client_name} ↔ ${b.therapist ?? 'Unassigned'}` : ''} • flagged {new Date(f.created_at).toLocaleString()}
                {st?.muted_until && muted && ` • muted until ${new Date(st.muted_until).toLocaleString()}`}
                {st?.suspended_reason && ` • reason: ${st.suspended_reason}`}
              </div>
              {vs.length > 0 && (
                <div className="bg-white/70 rounded p-2 space-y-1 mb-2">
                  <div className="text-xs font-bold text-[#5a0101]">Blocked messages ({vs.length})</div>
                  {vs.slice(0, 8).map((v) => (
                    <div key={v.id} className="text-xs">
                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold mr-1">{v.category}</span>
                      <span className="whitespace-pre-wrap">{v.excerpt}</span>
                      <span className="text-gray-400"> - {new Date(v.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setOpenId(f.booking_id)} className="px-3 py-1 rounded bg-[#840000] text-white text-xs font-bold">
                  View chat
                </button>
                {!st?.suspended && (
                  <button type="button" onClick={() => restrict(f.user_id, f.booking_id, who)} className="px-3 py-1 rounded bg-yellow-200 text-yellow-900 text-xs font-bold">
                    ⏱ Restrict chat
                  </button>
                )}
                {muted && (
                  <button type="button" onClick={() => unmute(f.user_id)} className="px-3 py-1 rounded bg-white border border-[#a28321] text-[#840000] text-xs font-bold">
                    Unmute
                  </button>
                )}
                {st?.suspended ? (
                  <button type="button" onClick={() => setSuspended(f.user_id, false, who)} className="px-3 py-1 rounded bg-[#228b22] text-white text-xs font-bold">
                    Restore account
                  </button>
                ) : (
                  <button type="button" onClick={() => setSuspended(f.user_id, true, who)} className="px-3 py-1 rounded bg-black text-white text-xs font-bold">
                    ⛔ Suspend account
                  </button>
                )}
                {f.status === 'open' && (
                  <button type="button" onClick={() => dismissFlag(f.id)} className="px-3 py-1 rounded bg-white border border-[#a28321] text-[#228b22] text-xs font-bold">
                    Dismiss / mark reviewed
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h5 className="text-lg font-bold text-[#5a0101] border-b border-[#a28321]/50 pb-1 mb-3">
        🚩 Reports ({openReports.length} open)
      </h5>
      {reports.length === 0 && !loading && <p className="text-sm text-gray-600 mb-4">No reports.</p>}
      <div className="space-y-3 mb-8">
        {reports.map((r) => {
          const b = bookingsById[r.booking_id];
          return (
            <div key={r.id} className="bg-[#f5f0e8] border border-[#a28321] rounded-lg p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b className="text-[#840000]">{b?.booking_ref ?? 'Booking'}</b>
                <span className={`text-xs font-bold px-2 py-1 rounded ${r.status === 'open' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  {r.status.toUpperCase()}
                </span>
              </div>
              <p className="my-1">{b ? `${b.client_name} ↔ ${b.therapist ?? 'Unassigned'}` : ''}</p>
              <p className="my-1 whitespace-pre-wrap bg-white/60 rounded p-2">{r.reason}</p>
              <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setOpenId(r.booking_id)} className="px-3 py-1 rounded bg-[#840000] text-white text-xs font-bold">
                  View chat
                </button>
                {r.status === 'open' && (
                  <button type="button" onClick={() => resolve(r.id)} className="px-3 py-1 rounded bg-[#228b22] text-white text-xs font-bold">
                    Mark resolved
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h5 className="text-lg font-bold text-[#5a0101] border-b border-[#a28321]/50 pb-1 mb-3">
        📜 Moderation history ({audit.length})
      </h5>
      {audit.length === 0 && !loading && <p className="text-sm text-gray-600 mb-4">No moderation activity yet.</p>}
      <div className="bg-[#f5f0e8] border border-[#a28321] rounded-lg mb-8 max-h-96 overflow-y-auto divide-y divide-[#a28321]/30">
        {audit.map((a) => (
          <div key={a.id} className="px-3 py-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className="text-[#840000]">{ACTION_LABEL[a.action] ?? a.action}</b>
              <span className="text-gray-500">
                {new Date(a.created_at).toLocaleString()} • by <span className="capitalize">{a.actor_role}</span>
                {a.booking_id && bookingsById[a.booking_id] ? ` • ${bookingsById[a.booking_id].booking_ref}` : ''}
              </span>
            </div>
            {a.details && <div className="text-gray-700 mt-0.5 whitespace-pre-wrap">{a.details}</div>}
          </div>
        ))}
      </div>

      <h5 className="text-lg font-bold text-[#5a0101] border-b border-[#a28321]/50 pb-1 mb-3">All conversations ({convos.length})</h5>
      {convos.length === 0 && !loading && <p className="text-sm text-gray-600">No conversations yet.</p>}
      <div className="space-y-2">
        {convos.map(({ booking: b, count, last }) => (
          <div key={b.id} className="bg-[#f5f0e8] border border-[#a28321] rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              <b className="text-[#840000]">{b.booking_ref}</b> - {b.client_name} ↔ {b.therapist ?? 'Unassigned'}
              {b.chat_blocked && <span className="ml-2 text-xs font-bold text-red-700">BLOCKED</span>}
              <div className="text-xs text-gray-500">
                {count} messages • last {new Date(last).toLocaleString()} • {b.status}
              </div>
            </div>
            <button type="button" onClick={() => setOpenId(b.id)} className="px-3 py-1 rounded bg-[#840000] text-white text-xs font-bold">
              Open
            </button>
          </div>
        ))}
      </div>

      {openBooking && (
        <ChatWindow booking={openBooking} myId={adminId} myRole="admin" onClose={() => setOpenId(null)} onChanged={load} />
      )}
    </div>
  );
};
