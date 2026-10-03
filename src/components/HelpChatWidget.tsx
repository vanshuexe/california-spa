import React, { useEffect, useRef, useState } from 'react';
import { PageId } from '../types';
import { BANGALORE_AREAS, SPA_PHONE, SPA_PHONE_2, SPA_PHONES_TEXT, SPA_WHATSAPP_LINK } from '../data/siteData';
import { submitInquiry } from '../lib/inquiries';

interface Props {
  onNavigate: (page: PageId) => void;
}

interface Msg {
  id: number;
  from: 'bot' | 'user';
  text: string;
  actions?: ('book' | 'whatsapp' | 'call' | 'human')[];
}

const QUICK = ['Prices', 'How to book', 'Payment', 'Areas covered', 'Timings', 'Talk to a person'];

const RULES: { keys: string[]; reply: string; actions?: Msg['actions'] }[] = [
  {
    keys: ['travel', 'auto fare', 'autofare', 'rickshaw', 'fare', 'transport', 'conveyance', 'extra charge', 'additional charge', 'hidden', 'surcharge', 'extra cost'],
    reply:
      "The therapist's travel charges are not included in the service fee. You pay the two-way auto fare from the therapist's location to yours and back, based on the actual auto fare.",
    actions: ['book'],
  },
  {
    keys: ['price', 'rate', 'cost', 'charge', 'kitna', 'paisa', 'fee', 'amount'],
    reply:
      "Our rates: 30 min ₹999 • 45 min ₹1,299 • 60 min ₹1,799 • 90 min ₹2,100 (most popular) • 120 min ₹3,400 • 3 hours ₹4,099. Travel is extra: the therapist's two-way auto fare is not included and is paid at the actual fare.",
    actions: ['book'],
  },
  {
    keys: ['book', 'appointment', 'slot', 'schedule', 'reserve'],
    reply:
      'Booking is easy: choose your service, date, time and area on the Booking page, then pay online securely. Your booking is confirmed as soon as the payment goes through.',
    actions: ['book', 'whatsapp'],
  },
  {
    keys: ['pay', 'upi', 'card', 'razorpay', 'refund', 'paid'],
    reply:
      'You pay online (UPI, cards, net banking, wallets) through Razorpay when you book. A booking stays "Pending" until payment is complete. You can retry from My Account if a payment fails.',
  },
  {
    keys: ['cancel', 'reschedule', 'change', 'postpone'],
    reply:
      'Sign in and open My Account to reschedule or cancel an upcoming booking. For refunds on paid bookings please call or WhatsApp us.',
    actions: ['whatsapp', 'call'],
  },
  {
    keys: ['area', 'location', 'where', 'locality', 'bangalore', 'bengaluru', 'kahan', 'hotel', 'home'],
    reply: `We come to your home, apartment or hotel room across Bangalore, including ${BANGALORE_AREAS.slice(0, 6).join(', ')} and more. Pick your area on the booking form.`,
  },
  {
    keys: ['time', 'timing', 'open', 'hour', 'kab', 'when', 'available'],
    reply: 'Doorstep sessions are available daily, 9:00 AM to 10:00 PM. Pick your slot on the booking page.',
    actions: ['book'],
  },
  {
    keys: ['female', 'lady', 'girl', 'male', 'therapist', 'masseur', 'masseuse'],
    reply:
      'All therapists are trained and certified. You can see their profiles on the Booking page and choose one, or let us assign the best available therapist.',
    actions: ['book'],
  },
  {
    keys: ['job', 'vacancy', 'career', 'work', 'hiring', 'naukri', 'apply'],
    reply: 'We are hiring therapists and staff. Open the Jobs page and submit the application form — our team will call you.',
  },
  {
    keys: ['style', 'swedish', 'deep tissue', 'aroma', 'massage', 'service', 'type'],
    reply:
      'We offer Swedish, Deep Tissue, Aromatherapy, Relaxation, Head/Neck/Shoulder and Foot Reflexology massages. See all styles on the Massage Style page.',
  },
  {
    keys: ['phone', 'call', 'contact', 'number', 'whatsapp', 'talk', 'human', 'person', 'agent'],
    reply: `You can call or WhatsApp us on ${SPA_PHONES_TEXT}, or leave your number here and we will call you back.`,
    actions: ['call', 'whatsapp', 'human'],
  },
];

function answer(text: string): Pick<Msg, 'text' | 'actions'> {
  const lower = text.toLowerCase();
  if (/^(hi|hello|hey|namaste|hii+)\b/.test(lower)) {
    return { text: 'Hello! 👋 Welcome to Doorstep Royale Spa. How can I help you today?' };
  }
  const hit = RULES.find((r) => r.keys.some((k) => lower.includes(k)));
  if (hit) return { text: hit.reply, actions: hit.actions };
  return {
    text: "I'm not sure about that one. I can connect you with our team — call/WhatsApp us, or leave your number and we'll call you back.",
    actions: ['human', 'whatsapp', 'call'],
  };
}

export const HelpChatWidget: React.FC<Props> = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([
    { id: 1, from: 'bot', text: 'Hi! 👋 I can help with prices, booking, payments and more. Pick a topic or type your question.' },
  ]);
  const [leadMode, setLeadMode] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadMobile, setLeadMobile] = useState('');
  const [leadSent, setLeadSent] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const nextId = useRef(2);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, leadMode, open]);

  const push = (m: Omit<Msg, 'id'>) =>
    setMessages((prev) => [...prev, { ...m, id: nextId.current++ }]);

  const ask = (text: string) => {
    const t = text.trim();
    if (!t) return;
    push({ from: 'user', text: t });
    if (t.toLowerCase() === 'talk to a person') {
      push({ from: 'bot', text: 'Sure! Leave your name and mobile number and our team will call you back shortly.' });
      setLeadMode(true);
      return;
    }
    const a = answer(t);
    setTimeout(() => push({ from: 'bot', ...a }), 400);
  };

  const onAction = (a: NonNullable<Msg['actions']>[number]) => {
    if (a === 'book') {
      onNavigate('booking');
      setOpen(false);
    } else if (a === 'human') {
      setLeadMode(true);
    }
  };

  const sendLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || leadMobile.replace(/\D/g, '').length < 9) {
      push({ from: 'bot', text: 'Please enter your name and a valid 10-digit mobile number.' });
      return;
    }
    setSending(true);
    const transcript = messages
      .filter((m) => m.from === 'user')
      .map((m) => m.text)
      .join('\n');
    const err = await submitInquiry({
      type: 'chat',
      name: leadName,
      mobile: leadMobile,
      message: transcript || 'Requested a call back from the help chat.',
      details: { Source: 'Help chat widget' },
    });
    setSending(false);
    if (err) {
      push({ from: 'bot', text: `Sorry, we couldn't save that. Please call or WhatsApp us on ${SPA_PHONES_TEXT}.`, actions: ['call', 'whatsapp'] });
      return;
    }
    setLeadSent(true);
    setLeadMode(false);
    push({ from: 'bot', text: `Thank you ${leadName.trim()}! Our team will call you on ${leadMobile.trim()} shortly.` });
  };

  return (
    <div className="fixed bottom-4 right-4 z-[1050] flex flex-col items-end gap-3 print:hidden">
      {open && (
        <div className="w-[calc(100vw-2rem)] sm:w-96 h-[32rem] max-h-[75vh] bg-[#fffaf0] border-2 border-[#840000] rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-[#5a0101] text-[#ffdf88] px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-bold leading-tight">Doorstep Royale Spa</div>
              <div className="text-xs text-[#81d742]">● Online - we're here to help</div>
            </div>
            <button type="button" aria-label="Close chat" onClick={() => setOpen(false)} className="text-2xl leading-none px-1">
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {messages.map((m) => (
              <div key={m.id} className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className="max-w-[85%]">
                  <div
                    className={`px-3 py-2 rounded-2xl whitespace-pre-wrap ${
                      m.from === 'user' ? 'bg-[#840000] text-white rounded-br-sm' : 'bg-white border border-[#a28321]/50 text-[#333] rounded-bl-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                  {m.actions && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {m.actions.includes('book') && (
                        <button type="button" onClick={() => onAction('book')} className="px-3 py-1 rounded-full bg-[#840000] text-white text-xs font-bold">
                          Book Now
                        </button>
                      )}
                      {m.actions.includes('whatsapp') && (
                        <a href={SPA_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-full bg-[#25D366] text-white text-xs font-bold no-underline">
                          WhatsApp
                        </a>
                      )}
                      {m.actions.includes('call') && (
                        <a href={`tel:${SPA_PHONE}`} className="px-3 py-1 rounded-full bg-[#228b22] text-white text-xs font-bold no-underline">
                          Call {SPA_PHONE}
                        </a>
                      )}
                      {m.actions.includes('call') && (
                        <a href={`tel:${SPA_PHONE_2}`} className="px-3 py-1 rounded-full bg-[#228b22] text-white text-xs font-bold no-underline">
                          Call {SPA_PHONE_2}
                        </a>
                      )}
                      {m.actions.includes('human') && !leadSent && (
                        <button type="button" onClick={() => onAction('human')} className="px-3 py-1 rounded-full border border-[#840000] text-[#840000] text-xs font-bold">
                          Request a call back
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {leadMode && (
              <form onSubmit={sendLead} className="bg-white border border-[#a28321] rounded-lg p-3 space-y-2">
                <input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Your name" className="form-control" />
                <input
                  value={leadMobile}
                  onChange={(e) => setLeadMobile(e.target.value)}
                  placeholder="Mobile number"
                  type="tel"
                  maxLength={10}
                  className="form-control"
                />
                <button type="submit" disabled={sending} className="btn btn-action w-full py-1.5 disabled:opacity-60">
                  {sending ? 'Sending…' : 'Call me back'}
                </button>
              </form>
            )}
            <div ref={endRef} />
          </div>

          <div className="px-3 pt-2 flex gap-1.5 overflow-x-auto whitespace-nowrap border-t border-[#a28321]/30">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                className="shrink-0 px-3 py-1 rounded-full bg-white border border-[#840000] text-[#840000] text-xs font-bold hover:bg-[#840000] hover:text-white"
              >
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
              setInput('');
            }}
            className="p-3 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              className="form-control flex-1"
            />
            <button type="submit" className="px-4 rounded bg-[#840000] text-white font-bold">
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        aria-label={open ? 'Close help chat' : 'Open help chat'}
        onClick={() => setOpen((o) => !o)}
        className="h-14 px-5 rounded-full bg-[#840000] text-white font-bold shadow-xl border-2 border-[#ffdf88] flex items-center gap-2 hover:bg-[#5a0101]"
      >
        <span className="text-xl">💬</span>
        {!open && <span className="hidden sm:inline">Need help?</span>}
      </button>
    </div>
  );
};
