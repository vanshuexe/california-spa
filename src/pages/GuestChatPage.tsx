import React, { useState } from 'react';
import { PageId } from '../types';
import { submitInquiry } from '../lib/inquiries';
import { SPA_NAME, SPA_PHONE, SPA_WHATSAPP_LINK, SPA_LOGO_URL } from '../data/siteData';

interface GuestChatPageProps {
  onNavigate: (page: PageId) => void;
  onShowAlert: (title: string, message: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'admin' | 'user';
  text: string;
  time: string;
}

export const GuestChatPage: React.FC<GuestChatPageProps> = ({
  onNavigate,
  onShowAlert,
}) => {
  const [step, setStep] = useState<'form' | 'chat'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      onShowAlert('Required', 'Please enter your name and 10-digit mobile number.');
      return;
    }
    if (mobile.trim().length < 9) {
      onShowAlert('Invalid Phone', 'Please enter a valid 9-10 digit mobile number.');
      return;
    }

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages([
      {
        id: 'm-welcome-1',
        sender: 'admin',
        text: `Hello ${name}! Welcome to Doorstep Royale Spa. We provide luxury wellness and massage experiences directly at your doorstep in Bangalore. How can we assist you today?`,
        time: now,
      },
      {
        id: 'm-welcome-2',
        sender: 'admin',
        text: `Our doorstep sessions are offered daily from 9:00 AM to 7:00 PM. Rates: 60 Minutes (₹1,799), 90 Minutes (₹2,100), 120 Minutes (₹3,400). You can also call or WhatsApp us anytime at ${SPA_PHONE}.`,
        time: now,
      },
    ]);
    setStep('chat');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: userText,
      time: userTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');

    // Save the guest's message so the admin can see it (reply by phone / WhatsApp).
    submitInquiry({ type: 'chat', name, mobile, email, message: userText });

    // Generate responsive smart reply from Admin
    setTimeout(() => {
      const lower = userText.toLowerCase();
      let replyText =
        `Thank you for reaching out! Our Doorstep Royale Spa coordinator has received your message. You can book directly online or call/WhatsApp us directly at ${SPA_PHONE}. Would you like to check therapist availability for today?`;

      if (lower.includes('price') || lower.includes('cost') || lower.includes('rate') || lower.includes('charge')) {
        replyText =
          'Our transparent rates: 60 Minutes (₹1,799), 90 Minutes (₹2,100 - most popular), and 120 Minutes (₹3,400). Express sessions: 30 Mins (₹999), 45 Mins (₹1,299). All-inclusive, no hidden charges!';
      } else if (lower.includes('phone') || lower.includes('contact') || lower.includes('call') || lower.includes('number')) {
        replyText =
          `You can call or WhatsApp Doorstep Royale Spa directly at ${SPA_PHONE} (9:00 AM to 7:00 PM daily).`;
      } else if (lower.includes('female') || lower.includes('lady') || lower.includes('girl')) {
        replyText =
          'Yes, our team features skilled, certified female wellness therapists trained in Swedish, Deep Tissue, and Aromatherapy techniques. You can view therapist profiles and book on our booking page.';
      } else if (lower.includes('hotel') || lower.includes('room') || lower.includes('location')) {
        replyText =
          'We provide doorstep service to your private home, apartment, villa, or hotel room across all neighborhoods of Bangalore.';
      } else if (lower.includes('book') || lower.includes('appointment') || lower.includes('time')) {
        replyText =
          `To finalize your appointment, you can click "Book Online", or reply here with your preferred time slot (9 AM - 7 PM) and Bangalore location. Or call ${SPA_PHONE} for instant confirmation!`;
      } else if (lower.includes('style') || lower.includes('swedish') || lower.includes('deep tissue') || lower.includes('aroma')) {
        replyText =
          'We offer Swedish Massage, Deep Tissue Therapy, Aromatherapy with essential oils, Relaxation Massage, Head/Neck/Shoulder, and Foot Reflexology.';
      }

      const adminTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        {
          id: `admin-${Date.now()}`,
          sender: 'admin',
          text: replyText,
          time: adminTime,
        },
      ]);
    }, 900);
  };

  return (
    <article className="col-xs-12 maincontent max-w-4xl mx-auto px-4 sm:px-6">
      <header className="page-header text-center my-4">
        <h1 className="page-title text-3xl font-bold text-[#840000]">
          Chat with Doorstep Royale Spa
        </h1>
        <div className="ico-border mt-2">
          <i className="ico-bg flower"></i>
        </div>
      </header>

      {step === 'form' ? (
        <div className="max-w-xl mx-auto my-6">
          <div className="panel panel-default bg-[#f5f0e8] border-2 border-[#840000] p-6 sm:p-8 rounded-lg shadow-md">
            <div className="panel-body text-center">
              <img
                src={SPA_LOGO_URL}
                alt="Doorstep Royale Spa Logo"
                className="w-16 h-16 rounded-full object-cover border-2 border-[#a28321] shadow-md mx-auto mb-3 bg-[#3a0202]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <h4 className="thin text-center text-xl font-bold text-[#840000] mb-2" id="ge-title">
                Start a chat with our coordinator
              </h4>
              <p className="text-center text-sm text-[#228b22] mb-4">
                Connect directly with Doorstep Royale Spa management for quick questions, therapist details, or instant home spa bookings across Bangalore.
              </p>
              <hr className="my-4 border-[#a28321]/40" />

              <form onSubmit={handleStartChat} className="space-y-4">
                <div className="top-margin">
                  <label htmlFor="ge-name" className="block text-sm font-bold text-[#840000]">
                    Your Name <span className="text-danger">*</span>
                  </label>
                  <input
                    className="form-control"
                    id="ge-name"
                    name="name"
                    type="text"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    autoFocus
                  />
                </div>

                <div className="top-margin">
                  <label htmlFor="ge-email" className="block text-sm font-bold text-[#840000]">
                    Email Address
                  </label>
                  <input
                    className="form-control"
                    id="ge-email"
                    name="email"
                    type="email"
                    maxLength={200}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                <div className="top-margin">
                  <label htmlFor="ge-mobile" className="block text-sm font-bold text-[#840000]">
                    Mobile Number <span className="text-danger">*</span> (10 digit mobile number)
                  </label>
                  <input
                    className="form-control"
                    id="ge-mobile"
                    name="mobile"
                    type="tel"
                    required
                    pattern="[0-9]{9,10}"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="9876543210"
                    title="Please enter 9-10 digit mobile number. Do not put country code."
                  />
                  <small className="text-muted block mt-1 text-xs text-[#888]">
                    Do not put country code (+91)
                  </small>
                </div>

                <hr className="my-4 border-[#a28321]/40" />

                <div className="flex items-center justify-between">
                  <a
                    href={`tel:${SPA_PHONE}`}
                    className="text-sm underline text-[#840000] font-bold"
                  >
                    Call {SPA_PHONE}
                  </a>

                  <button className="btn btn-action" type="submit" id="ge-send">
                    Continue to Chat
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Live Chat Window */
        <div className="max-w-2xl mx-auto my-6 bg-[#f5f0e8] border-2 border-[#840000] rounded-lg shadow-lg overflow-hidden flex flex-col h-[560px]">
          {/* Chat Header */}
          <div className="bg-[#5a0101] text-white p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={SPA_LOGO_URL}
                alt="Doorstep Royale Spa"
                className="w-10 h-10 rounded-full object-cover border-2 border-[#ffdf88] shadow shrink-0 bg-[#3a0202]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <h4 className="m-0 text-[#81d742] font-bold text-lg font-['Patrick_Hand']">
                  Doorstep Royale Spa Coordinator
                </h4>
                <span className="text-xs text-green-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#54ff36] animate-pulse"></span>
                  Online • 9180471825
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs bg-[#ff9b22] text-[#5a0101] font-bold px-3 py-1.5 rounded hover:bg-[#ffb03b]"
                onClick={() => onNavigate('booking')}
              >
                Book Online
              </button>
              <button
                type="button"
                className="text-xs bg-white/20 text-white px-2.5 py-1.5 rounded hover:bg-white/30"
                onClick={() => setStep('form')}
              >
                Exit
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#e8e0d0]">
            {messages.map((m) => {
              const isAdmin = m.sender === 'admin';
              return (
                <div
                  key={m.id}
                  className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed shadow-sm ${
                      isAdmin
                        ? 'bg-white text-[#333] border-l-4 border-[#b30af3]'
                        : 'bg-[#5a0101] text-white rounded-br-none'
                    }`}
                  >
                    <p className="m-0 whitespace-pre-wrap">{m.text}</p>
                    <span
                      className={`text-[11px] block text-right mt-1.5 ${
                        isAdmin ? 'text-gray-400' : 'text-gray-300'
                      }`}
                    >
                      {m.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Questions Suggestions */}
          <div className="bg-[#f0e8da] px-3 py-2 border-t border-[#c9bca3] flex gap-2 overflow-x-auto text-xs whitespace-nowrap">
            <button
              type="button"
              className="bg-white/90 border border-[#b30af3] text-[#b30af3] px-2.5 py-1 rounded-full hover:bg-[#b30af3] hover:text-white transition"
              onClick={() => setInputMessage('What are your pricing packages?')}
            >
              Pricing packages?
            </button>
            <button
              type="button"
              className="bg-white/90 border border-[#b30af3] text-[#b30af3] px-2.5 py-1 rounded-full hover:bg-[#b30af3] hover:text-white transition"
              onClick={() => setInputMessage('What is your contact number?')}
            >
              Contact number?
            </button>
            <button
              type="button"
              className="bg-white/90 border border-[#b30af3] text-[#b30af3] px-2.5 py-1 rounded-full hover:bg-[#b30af3] hover:text-white transition"
              onClick={() => setInputMessage('Do you provide home service in my area?')}
            >
              Home service areas?
            </button>
            <button
              type="button"
              className="bg-white/90 border border-[#b30af3] text-[#b30af3] px-2.5 py-1 rounded-full hover:bg-[#b30af3] hover:text-white transition"
              onClick={() => setInputMessage('What massage techniques do you offer?')}
            >
              Massage styles?
            </button>
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white border-t border-[#c9bca3] flex gap-2 items-center"
          >
            <input
              type="text"
              required
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message to Doorstep Royale Spa..."
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#b30af3]"
              autoFocus
            />
            <button type="submit" className="btn btn-action py-2 px-5 text-sm font-bold">
              Send
            </button>
          </form>
        </div>
      )}
    </article>
  );
};
