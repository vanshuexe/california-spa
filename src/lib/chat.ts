import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

export interface ChatMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  sender_role: 'customer' | 'therapist';
  body: string | null;
  image_path: string | null;
  created_at: string;
  read_at: string | null;
}

export interface ChatBooking {
  id: string;
  booking_ref: string;
  client_name: string;
  therapist: string | null;
  therapist_id: string | null;
  status: string;
  payment_status: string;
  booking_date: string;
  chat_blocked: boolean;
}

// Mirrors public.chat_is_open() in the database, which is what actually enforces it.
export function chatState(b: ChatBooking): { open: boolean; reason: string } {
  if (b.chat_blocked) return { open: false, reason: 'This chat has been blocked.' };
  if (b.status === 'cancelled') return { open: false, reason: 'Booking cancelled - chat closed.' };
  if (b.status === 'completed') return { open: false, reason: 'Service completed - chat closed.' };
  if (b.payment_status !== 'paid') return { open: false, reason: 'Chat opens after payment is confirmed.' };
  if (!b.therapist_id) return { open: false, reason: 'A therapist will be assigned shortly.' };
  const closesAt = new Date(`${b.booking_date}T00:00:00Z`).getTime() + 2 * 24 * 3600 * 1000;
  if (Date.now() >= closesAt) return { open: false, reason: 'Chat closed 24 hours after the booking day.' };
  return { open: true, reason: '' };
}

// Whether the chat is available at all (mirrors public.chat_can_view in the database, which is
// what really enforces it). Needs a verified payment: Paid + Confirmed (or Completed, for history)
// with a therapist assigned. Pending / failed / cancelled / refunded bookings get no chat.
export function chatAvailable(b: Pick<ChatBooking, 'status' | 'payment_status' | 'therapist_id'>): boolean {
  return b.payment_status === 'paid' && (b.status === 'confirmed' || b.status === 'completed') && Boolean(b.therapist_id);
}

export const MODERATION_WARNING =
  'This message cannot be sent. Please keep communication professional and related to your booking.';

// Result of sending a message. Moderation happens in the database (send_chat_message), so every
// blocked attempt is counted: warning -> final warning -> chat temporarily disabled -> admin review.
export interface SendResult {
  ok: boolean;
  code?: string;
  message?: string;
  level?: 'warning' | 'final_warning' | 'disabled';
  mutedUntil?: string | null;
}

// own chat restriction (temporary mute or suspension), shown in the chat window
export interface ChatUserStatus {
  muted_until: string | null;
  suspended: boolean;
}

export async function fetchMyChatStatus(myId: string): Promise<ChatUserStatus | null> {
  const { data } = await supabase
    .from('chat_user_status')
    .select('muted_until, suspended')
    .eq('user_id', myId)
    .maybeSingle();
  return (data as ChatUserStatus | null) ?? null;
}

export const IMAGE_BUCKET = 'chat-images';
const signedUrlCache = new Map<string, string>();

export async function getImageUrl(path: string): Promise<string | null> {
  const cached = signedUrlCache.get(path);
  if (cached) return cached;
  const { data } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrl(path, 3600);
  if (data?.signedUrl) signedUrlCache.set(path, data.signedUrl);
  return data?.signedUrl ?? null;
}

export async function markRead(bookingId: string) {
  await supabase.rpc('mark_chat_read', { p_booking: bookingId });
}

// Map of booking id -> number of unread messages sent by the other side.
export async function fetchUnreadCounts(myId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('messages')
    .select('booking_id')
    .is('read_at', null)
    .neq('sender_id', myId);
  const counts: Record<string, number> = {};
  for (const r of (data as { booking_id: string }[]) || []) {
    counts[r.booking_id] = (counts[r.booking_id] || 0) + 1;
  }
  return counts;
}

// Other components (account page, therapist panel) refresh when the notifier fires this.
export const CHAT_EVENT = 'chat:message';
export const CHAT_OPEN_KEY = 'openChatBooking';

export function useUnreadCounts(myId: string | null) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const reload = useCallback(async () => {
    if (!myId) {
      setCounts({});
      return;
    }
    setCounts(await fetchUnreadCounts(myId));
  }, [myId]);

  useEffect(() => {
    reload();
    window.addEventListener(CHAT_EVENT, reload);
    return () => window.removeEventListener(CHAT_EVENT, reload);
  }, [reload]);

  return { counts, reload };
}

interface UseChatArgs {
  bookingId: string;
  myId: string;
  myRole: 'customer' | 'therapist' | 'admin';
}

export function useChat({ bookingId, myId, myRole }: UseChatArgs) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherOnline, setOtherOnline] = useState(false);
  const readTimer = useRef<number | null>(null);

  const scheduleRead = useCallback(() => {
    if (myRole === 'admin') return;
    if (readTimer.current) window.clearTimeout(readTimer.current);
    readTimer.current = window.setTimeout(() => {
      markRead(bookingId).then(() => window.dispatchEvent(new Event(CHAT_EVENT)));
    }, 400);
  }, [bookingId, myRole]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setMessages((data as ChatMessage[]) || []);
        setLoading(false);
        scheduleRead();
      });

    const channel = supabase.channel(`chat-${bookingId}`, { config: { presence: { key: `${myRole}-${myId}` } } });
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.sender_id !== myId) scheduleRead();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, read_at: m.read_at } : x)));
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, { user_id: string }[]>;
        const online = Object.values(state).some((metas) => metas.some((p) => p.user_id !== myId));
        setOtherOnline(online);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && myRole !== 'admin') {
          await channel.track({ user_id: myId, role: myRole });
        }
      });

    return () => {
      cancelled = true;
      if (readTimer.current) window.clearTimeout(readTimer.current);
      supabase.removeChannel(channel);
    };
  }, [bookingId, myId, myRole, scheduleRead]);

  const handleRpc = (data: any, error: { message: string } | null): SendResult => {
    if (error) return { ok: false, message: error.message };
    if (data?.ok) {
      const m = data.message as ChatMessage;
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      return { ok: true };
    }
    if (data?.code === 'blocked') {
      return { ok: false, code: 'blocked', message: MODERATION_WARNING, level: data.level, mutedUntil: data.muted_until };
    }
    return { ok: false, code: data?.code, message: data?.message || 'Could not send.', mutedUntil: data?.muted_until };
  };

  const sendText = async (text: string): Promise<SendResult> => {
    const body = text.trim();
    if (!body) return { ok: true };
    const { data, error } = await supabase.rpc('send_chat_message', { p_booking: bookingId, p_body: body });
    return handleRpc(data, error);
  };

  const sendImage = async (file: File, caption: string): Promise<SendResult> => {
    if (!file.type.startsWith('image/')) return { ok: false, message: 'Please choose an image file.' };
    if (file.size > 5 * 1024 * 1024) return { ok: false, message: 'Image must be smaller than 5 MB.' };
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${bookingId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, { contentType: file.type });
    if (upErr) return { ok: false, message: upErr.message };
    const { data, error } = await supabase.rpc('send_chat_message', {
      p_booking: bookingId,
      p_body: caption.trim() || null,
      p_image_path: path,
    });
    const result = handleRpc(data, error);
    if (!result.ok) await supabase.storage.from(IMAGE_BUCKET).remove([path]); // don't keep a rejected photo
    return result;
  };

  return { messages, loading, otherOnline, sendText, sendImage };
}
