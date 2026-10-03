import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  ChatBooking,
  ChatMessage,
  ChatUserStatus,
  SendResult,
  chatState,
  fetchMyChatStatus,
  getImageUrl,
  useChat,
} from '../lib/chat';

interface Props {
  booking: ChatBooking;
  myId: string;
  myRole: 'customer' | 'therapist' | 'admin';
  onClose: () => void;
  onChanged?: () => void; // call after block/unblock so the parent can reload
}

const ImageBubble: React.FC<{ path: string }> = ({ path }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getImageUrl(path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [path]);
  if (!url) return <div className="w-40 h-28 bg-gray-200 rounded animate-pulse" />;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img src={url} alt="Shared" className="max-w-full max-h-56 rounded-lg" />
    </a>
  );
};

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const ChatWindow: React.FC<Props> = ({ booking, myId, myRole, onClose, onChanged }) => {
  const { messages, loading, otherOnline, sendText, sendImage } = useChat({
    bookingId: booking.id,
    myId,
    myRole,
  });
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState<SendResult | null>(null);
  const [myStatus, setMyStatus] = useState<ChatUserStatus | null>(null);
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [blocked, setBlocked] = useState(booking.chat_blocked);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const state = chatState({ ...booking, chat_blocked: blocked });
  const muted = Boolean(myStatus?.muted_until && new Date(myStatus.muted_until).getTime() > Date.now());
  const suspended = Boolean(myStatus?.suspended);
  const restricted = myRole !== 'admin' && (muted || suspended);
  const readOnly = myRole === 'admin' || !state.open || restricted;
  const restrictionText = suspended
    ? 'Your chat access has been suspended by the admin team. Please contact support.'
    : muted
      ? `Chat is temporarily disabled until ${new Date(myStatus!.muted_until!).toLocaleString()} because of repeated violations. This conversation has been flagged for admin review.`
      : '';

  useEffect(() => {
    if (myRole === 'admin') return;
    fetchMyChatStatus(myId).then(setMyStatus);
  }, [myId, myRole]);
  const otherName =
    myRole === 'therapist' ? booking.client_name : booking.therapist || 'Therapist';
  const title =
    myRole === 'admin'
      ? `${booking.client_name} ↔ ${booking.therapist || 'Unassigned'}`
      : `Chat with ${otherName}`;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setError('');
    setWarning(null);
    const res = await sendText(text);
    setSending(false);
    afterSend(res);
  };

  // Show the moderation outcome: warning / final warning / chat disabled.
  const afterSend = (res: SendResult) => {
    if (res.ok) {
      setText('');
      setWarning(null);
      return;
    }
    if (res.code === 'blocked') {
      setWarning(res);
      if (res.level === 'disabled') fetchMyChatStatus(myId).then(setMyStatus);
      return;
    }
    if (res.code === 'muted' || res.code === 'suspended') fetchMyChatStatus(myId).then(setMyStatus);
    setError(res.message || 'Could not send.');
  };

  const pickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSending(true);
    setError('');
    setWarning(null);
    const res = await sendImage(file, text);
    setSending(false);
    afterSend(res);
  };

  const report = async () => {
    setMenuOpen(false);
    const reason = window.prompt('Why are you reporting this chat? The admin team will review it.');
    if (!reason?.trim()) return;
    const { error: err } = await supabase
      .from('chat_reports')
      .insert({ booking_id: booking.id, reporter_id: myId, reason: reason.trim() });
    setError(err ? err.message : '');
    if (!err) window.alert('Thank you. The admin team has been notified.');
  };

  const setBlock = async (value: boolean) => {
    setMenuOpen(false);
    const msg = value
      ? 'Block this chat? Neither of you will be able to send messages. The admin can review it.'
      : 'Unblock this chat?';
    if (!window.confirm(msg)) return;
    const { error: err } = await supabase.rpc('block_chat', { p_booking: booking.id, p_block: value });
    if (err) {
      setError(err.message);
      return;
    }
    setBlocked(value);
    onChanged?.();
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#fffaf0] w-full sm:max-w-lg h-[85vh] sm:h-[36rem] rounded-t-2xl sm:rounded-2xl border-2 border-[#840000] flex flex-col overflow-hidden shadow-2xl">
        <div className="bg-[#5a0101] text-[#ffdf88] px-4 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-bold truncate">{title}</div>
            <div className="text-xs flex items-center gap-2">
              <span>Booking {booking.booking_ref}</span>
              {myRole !== 'admin' && (
                <span className={otherOnline ? 'text-[#81d742]' : 'text-gray-300'}>
                  ● {otherOnline ? 'Online' : 'Offline'}
                </span>
              )}
            </div>
          </div>
          <div className="relative flex items-center gap-1">
            <button type="button" aria-label="Chat options" onClick={() => setMenuOpen((o) => !o)} className="px-2 text-xl">
              ⋮
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 bg-white text-[#333] rounded shadow-lg border text-sm w-44 z-10">
                {myRole !== 'admin' && (
                  <button type="button" onClick={report} className="block w-full text-left px-3 py-2 hover:bg-gray-100">
                    🚩 Report
                  </button>
                )}
                {myRole === 'admin' ? (
                  <button type="button" onClick={() => setBlock(!blocked)} className="block w-full text-left px-3 py-2 hover:bg-gray-100">
                    {blocked ? '✅ Unblock chat' : '⛔ Block chat'}
                  </button>
                ) : (
                  !blocked && (
                    <button type="button" onClick={() => setBlock(true)} className="block w-full text-left px-3 py-2 hover:bg-gray-100">
                      ⛔ Block
                    </button>
                  )
                )}
              </div>
            )}
            <button type="button" aria-label="Close chat" onClick={onClose} className="text-2xl leading-none px-1">
              ×
            </button>
          </div>
        </div>

        <div className="px-3 py-2 text-xs text-[#5a0101] bg-[#fff3cd] border-b border-[#a28321]/40">
          <div className="font-bold text-sm">🔒 Professional Communication Only</div>
          <div className="mt-0.5 leading-snug">
            Please use this chat only for communication related to your booking and spa service. Sharing personal
            contact details or inappropriate content is not permitted. Conversations may be reviewed for safety and
            service quality.
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm bg-[#f5f0e8]">
          {loading && <p className="text-center text-gray-500">Loading…</p>}
          {!loading && messages.length === 0 && (
            <p className="text-center text-gray-500 mt-6">No messages yet. Say hello 👋</p>
          )}
          {messages.map((m: ChatMessage) => {
            const mine = m.sender_id === myId;
            const side = myRole === 'admin' ? m.sender_role === 'customer' : mine;
            return (
              <div key={m.id} className={side ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                    side ? 'bg-[#840000] text-white rounded-br-sm' : 'bg-white border border-[#a28321]/50 rounded-bl-sm'
                  }`}
                >
                  {myRole === 'admin' && (
                    <div className="text-[10px] opacity-70 capitalize">{m.sender_role}</div>
                  )}
                  {m.image_path && <ImageBubble path={m.image_path} />}
                  {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
                  <div className={`text-[10px] mt-1 text-right ${side ? 'text-white/70' : 'text-gray-500'}`}>
                    {time(m.created_at)}
                    {mine && myRole !== 'admin' && (
                      <span className={`ml-1 ${m.read_at ? 'text-[#81d742]' : ''}`}>{m.read_at ? '✓✓' : '✓'}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {warning && (
          <div className="px-3 py-2 text-xs text-red-800 bg-red-50 border-t border-red-200">
            <div className="font-bold">🚫 {warning.message}</div>
            <div className="mt-1">
              {warning.level === 'warning' && 'Warning 1 of 2. Repeated violations will disable your chat.'}
              {warning.level === 'final_warning' && 'Final warning. Another violation will temporarily disable your chat.'}
              {warning.level === 'disabled' &&
                `Chat disabled${warning.mutedUntil ? ` until ${new Date(warning.mutedUntil).toLocaleString()}` : ''} due to repeated violations. This conversation has been flagged for admin review.`}
            </div>
          </div>
        )}
        {error && <div className="px-3 py-1.5 text-xs text-red-700 bg-red-50 font-bold">{error}</div>}

        {readOnly ? (
          <div className="px-4 py-3 text-center text-sm text-[#840000] bg-[#fffaf0] border-t border-[#a28321]/40">
            {myRole === 'admin'
              ? `Read-only (admin view). ${state.open ? '' : state.reason}`
              : restricted && state.open
                ? restrictionText
                : state.reason}
          </div>
        ) : (
          <form onSubmit={send} className="p-3 flex items-center gap-2 border-t border-[#a28321]/40">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
            <button
              type="button"
              aria-label="Send photo"
              disabled={sending}
              onClick={() => fileRef.current?.click()}
              className="text-xl px-2 disabled:opacity-50"
            >
              📷
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              placeholder="Type a message…"
              className="form-control flex-1"
            />
            <button type="submit" disabled={sending || !text.trim()} className="px-4 py-2 rounded bg-[#840000] text-white font-bold disabled:opacity-50">
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
