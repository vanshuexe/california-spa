import React, { useEffect, useState } from 'react';
import { PageId } from '../types';
import { supabase } from '../lib/supabase';
import { CHAT_EVENT, CHAT_OPEN_KEY, ChatMessage } from '../lib/chat';

interface Toast {
  bookingId: string;
  bookingRef: string;
  from: string;
  preview: string;
  page: PageId;
}

interface Props {
  onNavigate: (page: PageId) => void;
}

// Listens for new chat messages for the signed-in customer / therapist and shows a toast
// (plus a browser notification when the tab is in the background).
export const ChatNotifier: React.FC<Props> = ({ onNavigate }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle();
      if (cancelled || admin) return; // admins can read every chat; don't notify them for all of it

      channel = supabase
        .channel(`notify-${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
          const m = payload.new as ChatMessage;
          if (m.sender_id === userId) return;
          window.dispatchEvent(new Event(CHAT_EVENT));

          const { data: rows } = await supabase.rpc('chat_booking_info', { p_booking: m.booking_id });
          const b = (rows as { booking_ref: string; client_name: string; therapist: string | null; my_role: string }[] | null)?.[0];
          if (!b) return;
          const iAmCustomer = b.my_role === 'customer';
          const t: Toast = {
            bookingId: m.booking_id,
            bookingRef: b.booking_ref,
            from: iAmCustomer ? b.therapist || 'Your therapist' : b.client_name,
            preview: m.body || '📷 Photo',
            page: iAmCustomer ? 'booking' : 'therapist',
          };
          setToast(t);
          window.setTimeout(() => setToast((cur) => (cur?.bookingId === t.bookingId ? null : cur)), 8000);

          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`New message from ${t.from}`, { body: t.preview });
          }
        })
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  if (!toast) return null;

  const open = () => {
    try {
      sessionStorage.setItem(CHAT_OPEN_KEY, toast.bookingId);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(CHAT_OPEN_KEY));
    onNavigate(toast.page);
    setToast(null);
  };

  return (
    <div className="fixed bottom-4 left-4 z-[1060] max-w-xs bg-[#5a0101] text-white rounded-lg shadow-2xl border border-[#ffdf88] p-3">
      <div className="text-xs text-[#ffdf88] font-bold">🔔 New message • {toast.bookingRef}</div>
      <div className="text-sm font-bold">{toast.from}</div>
      <div className="text-sm opacity-90 truncate">{toast.preview}</div>
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={open} className="px-3 py-1 rounded bg-[#81d742] text-[#1a3a00] text-xs font-bold">
          Open chat
        </button>
        <button type="button" onClick={() => setToast(null)} className="px-3 py-1 rounded border border-white/40 text-xs">
          Dismiss
        </button>
      </div>
    </div>
  );
};
