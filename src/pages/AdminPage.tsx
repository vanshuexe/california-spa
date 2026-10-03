import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AdminBookings } from '../components/AdminBookings';
import { TherapistManager } from '../components/TherapistManager';
import { InquiriesManager } from '../components/InquiriesManager';
import { ChatsManager } from '../components/ChatsManager';

// Standalone admin area at /#admin with its own email + password login.
// Access is enforced by the database: only users listed in public.admin_users can read
// every booking, so a non-admin who signs in here just sees "no access".
export const AdminPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [section, setSection] = useState<'bookings' | 'inquiries' | 'therapists' | 'chats'>('bookings');
  const [newCount, setNewCount] = useState(0);

  // Show the "new" badge on the Inquiries tab as soon as an admin is signed in.
  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
      .then(({ count }) => setNewCount(count ?? 0));
  }, [isAdmin]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUserId(session?.user.id ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setIsAdmin(null);
      return;
    }
    supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [userId]);

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
    setIsAdmin(null);
  };

  if (userId && isAdmin) {
    return (
      <div className="w-full">
        <div className="flex flex-wrap justify-between gap-2 max-w-5xl mx-auto px-4">
          <div className="flex gap-2">
            {(['bookings', 'inquiries', 'chats', 'therapists'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSection(t)}
                className={`px-4 py-1.5 rounded font-bold text-sm ${section === t ? 'bg-[#5a0101] text-[#81d742]' : 'bg-white/60 text-[#840000]'}`}
              >
                {t === 'bookings' ? '📋 Bookings' : t === 'therapists' ? '💆 Therapists' : t === 'chats' ? '💬 Chats' : '📩 Inquiries'}
                {t === 'inquiries' && newCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-xs">{newCount}</span>
                )}
              </button>
            ))}
          </div>
          <button type="button" onClick={signOut} className="px-4 py-1.5 rounded bg-[#5a0101] text-[#81d742] font-bold text-sm">
            Sign Out
          </button>
        </div>
        {section === 'bookings' && <AdminBookings />}
        {section === 'inquiries' && <InquiriesManager onCountChange={setNewCount} />}
        {section === 'chats' && userId && <ChatsManager adminId={userId} />}
        {section === 'therapists' && <TherapistManager />}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-10 w-full px-4">
      <div className="bg-[#f5f0e8] border-2 border-[#840000] p-6 sm:p-8 rounded-lg shadow-md">
        <h4 className="text-center text-2xl font-bold text-[#840000] mb-1">Admin Login</h4>
        <p className="text-center text-xs text-[#228b22] mb-4">Doorstep Royale Spa - staff only</p>

        {userId && isAdmin === false ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-red-700 font-bold">This account does not have admin access.</p>
            <button type="button" onClick={signOut} className="btn btn-action px-6 py-2">
              Sign Out
            </button>
          </div>
        ) : (
          <form onSubmit={signIn} className="space-y-4">
            <div>
              <label htmlFor="adminEmail" className="block text-sm font-bold text-[#840000]">Email</label>
              <input
                id="adminEmail"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
              />
            </div>
            <div>
              <label htmlFor="adminPass" className="block text-sm font-bold text-[#840000]">Password</label>
              <input
                id="adminPass"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
              />
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
};
