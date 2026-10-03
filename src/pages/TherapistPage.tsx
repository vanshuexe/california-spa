import React, { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CHAT_EVENT, CHAT_OPEN_KEY, ChatBooking, chatAvailable, chatState, useUnreadCounts } from '../lib/chat';
import { ChatWindow } from '../components/ChatWindow';

interface TBooking extends ChatBooking {
  booking_time: string;
  duration: string | null;
  service_style: string | null;
  area: string | null;
  address: string | null;
  special_instructions: string | null;
  location_type: string | null;
}

// Therapist panel at /#therapist. Access is enforced by the database: a therapist can only
// read bookings assigned to them, and only their own chats.
export const TherapistPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [therapistName, setTherapistName] = useState<string | null>(null);
  const [isTherapist, setIsTherapist] = useState<boolean | null>(null);
  const [bookings, setBookings] = useState<TBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { counts, reload: reloadUnread } = useUnreadCounts(isTherapist ? userId : null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setIsTherapist(null);
      setTherapistName(null);
      return;
    }
    supabase
      .from('therapist_accounts')
      .select('therapist_id, therapists(name)')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setIsTherapist(Boolean(data));
        // deno-lint-ignore no-explicit-any
        const t = (data as any)?.therapists;
        setTherapistName((Array.isArray(t) ? t[0]?.name : t?.name) ?? null);
      });
  }, [userId]);

  const load = useCallback(async () => {
    setLoading(true);
    // Safe list: customer phone/email are never sent to therapists.
    const { data, error: err } = await supabase.rpc('therapist_bookings');
    setLoading(false);
    if (err) setError(err.message);
    else setBookings((data as TBooking[]) || []);
  }, []);

  useEffect(() => {
    if (isTherapist) load();
  }, [isTherapist, load]);

  // Open a chat when the user taps a notification toast.
  useEffect(() => {
    const check = () => {
      try {
        const id = sessionStorage.getItem(CHAT_OPEN_KEY);
        if (id) {
          sessionStorage.removeItem(CHAT_OPEN_KEY);
          setOpenId(id);
        }
      } catch {
        /* ignore */
      }
    };
    check();
    window.addEventListener(CHAT_OPEN_KEY, check);
    window.addEventListener(CHAT_EVENT, load);
    return () => {
      window.removeEventListener(CHAT_OPEN_KEY, check);
      window.removeEventListener(CHAT_EVENT, load);
    };
  }, [load]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError('Invalid email or password.');
    else setPassword('');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setBookings([]);
  };

  const complete = async (b: TBooking) => {
    if (!window.confirm(`Mark ${b.booking_ref} as completed? The chat will close.`)) return;
    const { error: err } = await supabase.rpc('complete_booking', { p_id: b.id });
    if (err) setError(err.message);
    else load();
  };

  const openChat = (id: string) => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    setOpenId(id);
  };

  if (!userId || isTherapist === false || isTherapist === null) {
    return (
      <div className="max-w-md mx-auto my-10 w-full px-4">
        <div className="bg-[#f5f0e8] border-2 border-[#840000] p-6 sm:p-8 rounded-lg shadow-md">
          <h4 className="text-center text-2xl font-bold text-[#840000] mb-1">Therapist Login</h4>
          <p className="text-center text-xs text-[#228b22] mb-4">Doorstep Royale Spa - therapists only</p>
          {userId && isTherapist === false ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-red-700 font-bold">This account is not a therapist account.</p>
              <button type="button" onClick={signOut} className="btn btn-action px-6 py-2">Sign Out</button>
            </div>
          ) : (
            <form onSubmit={signIn} className="space-y-4">
              <div>
                <label htmlFor="thEmail" className="block text-sm font-bold text-[#840000]">Email</label>
                <input id="thEmail" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="form-control" />
              </div>
              <div>
                <label htmlFor="thPass" className="block text-sm font-bold text-[#840000]">Password</label>
                <input id="thPass" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-control" />
              </div>
              {error && <p className="text-sm text-red-700 m-0">{error}</p>}
              <button type="submit" disabled={busy} className="btn btn-action w-full py-2.5 disabled:opacity-60">
                {busy ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const active = bookings.filter((b) => b.status === 'confirmed');
  const past = bookings.filter((b) => b.status !== 'confirmed' && b.payment_status === 'paid');
  const openBooking = bookings.find((b) => b.id === openId) || null;

  const Card = (b: TBooking) => {
    const st = chatState(b);
    return (
      <div key={b.id} className="bg-[#f5f0e8] border border-[#a28321] rounded-lg p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-[#840000]">Booking ID: {b.booking_ref}</span>
          <span className={`text-xs font-bold px-2 py-1 rounded ${b.status === 'confirmed' ? 'bg-green-100 text-green-800' : b.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
            {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
          </span>
        </div>
        <p className="text-sm mt-2 mb-0">
          <b>{b.client_name}</b> • {b.duration} {b.service_style}
          <br />
          📅 {b.booking_date} at {b.booking_time}
          <br />
          📍 {[b.address, b.area].filter(Boolean).join(', ') || b.location_type}
          {b.special_instructions && (<><br />📝 {b.special_instructions}</>)}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {chatAvailable(b) && (
            <button type="button" onClick={() => openChat(b.id)} className="btn btn-action px-4 py-1.5 text-sm relative">
              💬 {st.open ? 'Chat' : 'Chat history'}
              {(counts[b.id] || 0) > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-xs">{counts[b.id]}</span>
              )}
            </button>
          )}
          {b.status === 'confirmed' && (
            <button type="button" onClick={() => complete(b)} className="px-4 py-1.5 text-sm font-bold rounded bg-[#228b22] text-white">
              ✅ Mark Completed
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto my-6 w-full px-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h4 className="text-2xl font-bold text-[#840000] m-0">Therapist Panel{therapistName ? ` - ${therapistName}` : ''}</h4>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="px-4 py-1.5 rounded bg-white/60 text-[#840000] font-bold text-sm">Refresh</button>
          <button type="button" onClick={signOut} className="px-4 py-1.5 rounded bg-[#5a0101] text-[#81d742] font-bold text-sm">Sign Out</button>
        </div>
      </div>
      {loading && <p className="text-sm">Loading…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      <h5 className="text-lg font-bold text-[#5a0101] border-b border-[#a28321]/50 pb-1 mb-3">Active bookings ({active.length})</h5>
      {active.length === 0 && !loading && <p className="text-sm text-gray-600 mb-4">No active bookings assigned to you.</p>}
      <div className="space-y-3 mb-8">{active.map(Card)}</div>

      <h5 className="text-lg font-bold text-[#5a0101] border-b border-[#a28321]/50 pb-1 mb-3">Past bookings ({past.length})</h5>
      <div className="space-y-3">{past.map(Card)}</div>

      {openBooking && userId && (
        <ChatWindow
          booking={openBooking}
          myId={userId}
          myRole="therapist"
          onClose={() => {
            setOpenId(null);
            reloadUnread();
          }}
          onChanged={load}
        />
      )}
    </div>
  );
};
