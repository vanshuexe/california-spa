import React, { useState, useEffect } from 'react';
import { PageId } from '../types';
import { supabase, isSupabaseConfigured, phoneToAuthEmail } from '../lib/supabase';
import { payForBooking } from '../lib/payment';
import { TravelNotice } from '../components/TravelNotice';
import { CHAT_EVENT, CHAT_OPEN_KEY, chatAvailable, chatState, useUnreadCounts } from '../lib/chat';
import { ChatWindow } from '../components/ChatWindow';
import { useTherapists } from '../lib/useTherapists';
import {
  BANGALORE_AREAS,
  SPA_NAME,
  SPA_LOGO_URL,
  SPA_PHONE,
  SPA_PHONE_2,
  SPA_PHONES_TEXT,
  SPA_WHATSAPP_LINK,
  PRICING_DATA,
} from '../data/siteData';

interface MyBooking {
  id: string;
  booking_ref: string;
  therapist: string | null;
  service_style: string | null;
  duration: string | null;
  booking_date: string;
  booking_time: string;
  area: string | null;
  price: number | null;
  status: string;
  payment_status: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  therapist_id: string | null;
  chat_blocked: boolean;
}

interface BookingPageProps {
  onNavigate: (page: PageId) => void;
  onShowAlert: (title: string, message: string) => void;
}

export const BookingPage: React.FC<BookingPageProps> = ({
  onNavigate,
  onShowAlert,
}) => {
  const [activeTab, setActiveTab] = useState<'profiles' | 'book' | 'login' | 'register' | 'account'>('book');

  // Booking form state
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>('any');
  const [serviceStyle, setServiceStyle] = useState('Swedish Massage');
  const [selectedDuration, setSelectedDuration] = useState('90 Minutes');
  const [bookingDate, setBookingDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [bookingTime, setBookingTime] = useState('11:00 AM');
  const [locationType, setLocationType] = useState<'home' | 'hotel' | 'hotel-assist'>('home');
  const [area, setArea] = useState(BANGALORE_AREAS[0]);
  const [address, setAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  const { therapists } = useTherapists();
  const [paying, setPaying] = useState(false);
  const [travelAck, setTravelAck] = useState(false);

  // Customer account state
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [reschedId, setReschedId] = useState<string | null>(null);
  const [reschedDate, setReschedDate] = useState('');
  const [reschedTime, setReschedTime] = useState('11:00 AM');

  // Login form state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const durationPricingMap: Record<string, { price: number; label: string }> = {
    '60 Minutes': { price: 1799, label: '₹1,799 (60 Mins)' },
    '90 Minutes': { price: 2100, label: '₹2,100 (90 Mins - Recommended)' },
    '120 Minutes': { price: 3400, label: '₹3,400 (120 Mins - Ultimate Luxury)' },
    '180 Minutes': { price: 4099, label: '₹4,099 (3 Hours - Signature)' },
    '30 Minutes': { price: 999, label: '₹999 (30 Mins Express)' },
    '45 Minutes': { price: 1299, label: '₹1,299 (45 Mins Express)' },
  };

  const currentPriceInfo = durationPricingMap[selectedDuration] || {
    price: 2100,
    label: '₹2,100',
  };

  const timeSlots = [
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '01:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
    '05:00 PM',
    '06:00 PM',
    '07:00 PM',
    '08:00 PM',
    '09:00 PM',
    '10:00 PM',
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessionUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setSessionUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadBookings = async () => {
    if (!sessionUserId) {
      setMyBookings([]);
      return;
    }
    setBookingsLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('id, booking_ref, therapist, service_style, duration, booking_date, booking_time, area, price, status, payment_status, client_name, client_phone, client_email, therapist_id, chat_blocked')
      .eq('user_id', sessionUserId)
      .order('booking_date', { ascending: true });
    setBookingsLoading(false);
    if (error) {
      onShowAlert('Could Not Load Bookings', error.message);
      return;
    }
    setMyBookings((data as MyBooking[]) || []);
  };

  useEffect(() => {
    loadBookings();
  }, [sessionUserId]);

  const { counts: unreadCounts, reload: reloadUnread } = useUnreadCounts(sessionUserId);
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const openChat = (id: string) => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    setOpenChatId(id);
    setActiveTab('account');
  };

  // Open a chat when the user taps a notification toast.
  useEffect(() => {
    const check = () => {
      try {
        const id = sessionStorage.getItem(CHAT_OPEN_KEY);
        if (id) {
          sessionStorage.removeItem(CHAT_OPEN_KEY);
          openChat(id);
        }
      } catch {
        /* ignore */
      }
    };
    check();
    window.addEventListener(CHAT_OPEN_KEY, check);
    window.addEventListener(CHAT_EVENT, loadBookings);
    return () => {
      window.removeEventListener(CHAT_OPEN_KEY, check);
      window.removeEventListener(CHAT_EVENT, loadBookings);
    };
  }, [sessionUserId]);

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingBookings = myBookings.filter(
    (b) => b.status !== 'cancelled' && b.status !== 'completed' && b.booking_date >= todayStr
  );
  const previousBookings = myBookings
    .filter((b) => b.status === 'cancelled' || b.status === 'completed' || b.booking_date < todayStr)
    .reverse();

  const handleCancelBooking = async (b: MyBooking) => {
    if (!window.confirm(`Cancel booking ${b.booking_ref}?`)) return;
    const { error } = await supabase.rpc('cancel_my_booking', { p_id: b.id });
    if (error) {
      onShowAlert('Cancel Failed', error.message);
      return;
    }
    onShowAlert('Booking Cancelled', `Booking ${b.booking_ref} has been cancelled.`);
    loadBookings();
  };

  const handleRescheduleSave = async (b: MyBooking) => {
    if (!reschedDate || reschedDate < todayStr) {
      onShowAlert('Invalid Date', 'Please choose today or a future date.');
      return;
    }
    const { error } = await supabase
      .from('bookings')
      .update({ booking_date: reschedDate, booking_time: reschedTime })
      .eq('id', b.id);
    if (error) {
      onShowAlert('Reschedule Failed', error.message);
      return;
    }
    setReschedId(null);
    onShowAlert('Booking Rescheduled', `${b.booking_ref} is now on ${reschedDate} at ${reschedTime}.`);
    loadBookings();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMyBookings([]);
    setActiveTab('login');
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim()) {
      onShowAlert('Required Fields', 'Please enter your Full Name and 10-digit Mobile Number.');
      return;
    }
    if (!travelAck) {
      onShowAlert(
        'Travel Charges',
        "Please confirm that you understand the therapist's two-way auto fare is not included in the service fee and is paid by you at actuals."
      );
      return;
    }
    if (clientPhone.trim().length < 9) {
      onShowAlert('Invalid Phone', 'Please provide a valid 9-10 digit mobile number.');
      return;
    }

    const therapistName =
      selectedTherapistId === 'any'
        ? 'Assigned Certified Therapist'
        : therapists.find((t) => t.id === selectedTherapistId)?.name || 'Certified Therapist';

    const bookingRef = `DRS-BLR-${Math.floor(100000 + Math.random() * 900000)}`;

    if (!isSupabaseConfigured) {
      onShowAlert('Setup Needed', 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
      return;
    }
    const bookingId = crypto.randomUUID();
    const { error } = await supabase.from('bookings').insert({
      id: bookingId,
      user_id: sessionUserId,
      booking_ref: bookingRef,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      client_email: clientEmail.trim() || null,
      therapist: therapistName,
      service_style: serviceStyle,
      duration: selectedDuration,
      booking_date: bookingDate,
      booking_time: bookingTime,
      location_type: locationType,
      area,
      address: address.trim() || null,
      special_instructions: specialInstructions.trim() || null,
    });
    if (error) {
      onShowAlert('Booking Failed', error.message);
      return;
    }

    const name = clientName.trim();
    const phone = clientPhone.trim();
    const email = clientEmail.trim();

    // Reset fields (the booking is saved as unpaid/pending from here on)
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setAddress('');
    setSpecialInstructions('');

    await runPayment(bookingId, bookingRef, name, phone, email);
  };

  const runPayment = async (
    bookingId: string,
    bookingRef: string,
    name: string,
    phone: string,
    email?: string
  ) => {
    setPaying(true);
    const result = await payForBooking({ bookingId, name, phone, email });
    setPaying(false);

    if (result.status === 'paid') {
      onShowAlert(
        'Payment Successful - Booking Confirmed!',
        `Thank you ${name}! Your payment was received and your booking is confirmed.\n\nBooking ID: ${bookingRef}${email ? `\n\nA confirmation has been sent to ${email}.` : ''}\n\nReminder: the therapist's two-way auto fare is not included in the service fee and is paid by you at the actual fare.\n\nOur coordinator will call you from ${SPA_PHONES_TEXT} shortly.`
      );
    } else if (result.status === 'failed') {
      onShowAlert(
        'Payment Failed',
        `${result.message}\n\nYour booking ${bookingRef} is saved but UNPAID and not confirmed. You can retry from My Account (sign in) or call ${SPA_PHONES_TEXT}.`
      );
    } else {
      onShowAlert(
        'Payment Not Completed',
        `Booking ${bookingRef} is saved but UNPAID and not confirmed until payment is made.`
      );
    }
    loadBookings();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone.trim() || !loginPassword.trim()) {
      onShowAlert('Error', 'Please enter both your mobile number and password.');
      return;
    }
    if (!isSupabaseConfigured) {
      onShowAlert('Setup Needed', 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToAuthEmail(loginPhone),
      password: loginPassword,
    });
    if (error) {
      onShowAlert('Sign In Failed', 'Invalid mobile number or password.');
      return;
    }
    setLoginPassword('');
    onShowAlert(
      'Signed In Successfully',
      `Welcome back! Logged in as ${loginPhone}. You can now view all verified therapist profiles and your past appointments.`
    );
    setActiveTab('account');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail.trim() || !regPhone.trim() || !regPassword.trim()) {
      onShowAlert('Error', 'Please fill in all required registration fields.');
      return;
    }
    if (!/^\d{10}$/.test(regPhone.trim())) {
      onShowAlert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (regPassword.length < 6) {
      onShowAlert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (!isSupabaseConfigured) {
      onShowAlert('Setup Needed', 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
      return;
    }
    const phone = regPhone.trim();
    const { data, error } = await supabase.auth.signUp({
      email: phoneToAuthEmail(phone),
      password: regPassword,
      options: { data: { phone, contact_email: regEmail.trim() } },
    });
    if (error || !data.user) {
      onShowAlert('Registration Failed', error?.message || 'Could not create account.');
      return;
    }
    if (data.session) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, phone, email: regEmail.trim() });
      if (profileError) {
        onShowAlert('Profile Error', profileError.message);
        return;
      }
    } else {
      onShowAlert(
        'Almost Done',
        'Account created, but email confirmation is enabled in Supabase. Turn off "Confirm email" in Auth settings and try again.'
      );
      return;
    }
    setRegPassword('');
    onShowAlert(
      'Registration Complete',
      `Your account has been created for ${phone}. You now have full access to therapist profiles and booking discounts!`
    );
    setActiveTab('account');
  };

  return (
    <article className="col-xs-12 maincontent col-md-12 col-sm-12 max-w-5xl mx-auto px-4 sm:px-6">
      <header className="page-header text-center my-4">
        <img
          src={SPA_LOGO_URL}
          alt="Doorstep Royale Spa Logo"
          className="w-20 h-20 rounded-full object-cover border-2 border-[#a28321] shadow-lg mx-auto mb-2 bg-[#3a0202]"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <h1 className="page-title text-3xl font-bold text-[#840000]">
          Doorstep Royale Spa Bangalore
        </h1>
        <p className="text-sm font-semibold text-[#228b22] uppercase tracking-wider mt-1">
          Online Appointment Booking & Certified Therapist Profiles
        </p>
        <div className="ico-border mt-2">
          <i className="ico-bg flower"></i>
        </div>
      </header>

      {/* Quick Direct Contact Banner */}
      <div className="bg-[#fff9ef] border border-[#a28321] rounded-lg p-3 sm:p-4 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">📞</span>
          <span className="text-sm font-bold text-[#840000]">
            Prefer Instant Booking by Phone or WhatsApp?
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            id="bookingPageCallBtn"
            href={`tel:${SPA_PHONE}`}
            className="btn btn-action text-xs sm:text-sm px-4 py-1.5 inline-flex items-center gap-1.5 no-underline text-[#ffdf88] hover:text-white"
          >
            <span>Call: {SPA_PHONE}</span>
          </a>
          <a
            id="bookingPageCallBtn2"
            href={`tel:${SPA_PHONE_2}`}
            className="btn btn-action text-xs sm:text-sm px-4 py-1.5 inline-flex items-center gap-1.5 no-underline text-[#ffdf88] hover:text-white"
          >
            <span>Call: {SPA_PHONE_2}</span>
          </a>
          <a
            id="bookingPageWhatsAppBtn"
            href={SPA_WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#20ba59] text-white text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-full inline-flex items-center gap-1 no-underline shadow"
          >
            <span>💬 WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 my-4">
        <button
          id="tabBookAppointmentBtn"
          type="button"
          className={`px-5 py-2.5 rounded-t-lg font-bold text-base transition ${
            activeTab === 'book'
              ? 'bg-[#5a0101] text-[#81d742] shadow'
              : 'bg-white/50 text-[#840000] hover:bg-white/80'
          }`}
          onClick={() => setActiveTab('book')}
        >
          📅 Book Appointment
        </button>
        <button
          id="tabViewProfilesBtn"
          type="button"
          className={`px-5 py-2.5 rounded-t-lg font-bold text-base transition ${
            activeTab === 'profiles'
              ? 'bg-[#5a0101] text-[#81d742] shadow'
              : 'bg-white/50 text-[#840000] hover:bg-white/80'
          }`}
          onClick={() => setActiveTab('profiles')}
        >
          👤 View Therapist Profiles
        </button>
        {sessionUserId && (
          <>
            <button
              id="tabMyAccountBtn"
              type="button"
              className={`px-5 py-2.5 rounded-t-lg font-bold text-base transition ${
                activeTab === 'account'
                  ? 'bg-[#5a0101] text-[#81d742] shadow'
                  : 'bg-white/50 text-[#840000] hover:bg-white/80'
              }`}
              onClick={() => setActiveTab('account')}
            >
              🧾 My Account
            </button>
            <button
              id="tabSignOutBtn"
              type="button"
              className="px-5 py-2.5 rounded-t-lg font-bold text-base bg-white/50 text-[#840000] hover:bg-white/80"
              onClick={handleSignOut}
            >
              🚪 Sign Out
            </button>
          </>
        )}
        {!sessionUserId && (
        <>
        <button
          id="tabClientLoginBtn"
          type="button"
          className={`px-5 py-2.5 rounded-t-lg font-bold text-base transition ${
            activeTab === 'login'
              ? 'bg-[#5a0101] text-[#81d742] shadow'
              : 'bg-white/50 text-[#840000] hover:bg-white/80'
          }`}
          onClick={() => setActiveTab('login')}
        >
          🔐 Client Sign In
        </button>
        <button
          id="tabClientRegisterBtn"
          type="button"
          className={`px-5 py-2.5 rounded-t-lg font-bold text-base transition ${
            activeTab === 'register'
              ? 'bg-[#5a0101] text-[#81d742] shadow'
              : 'bg-white/50 text-[#840000] hover:bg-white/80'
          }`}
          onClick={() => setActiveTab('register')}
        >
          📝 Register New Client
        </button>
        </>
        )}
      </div>

      {/* TAB 1: ONLINE BOOKING FORM */}
      {activeTab === 'book' && (
        <div className="panel max-w-3xl mx-auto my-4 bg-[#f5f0e8] border-2 border-[#840000] p-6 sm:p-8 rounded-lg shadow-md">
          <div className="border-b border-[#a28321]/40 pb-3 mb-6 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-2xl font-bold text-[#840000] m-0">
                Book a Doorstep Royale Spa Session
              </h4>
              <p className="text-sm text-[#228b22] m-0 mt-1 font-semibold">
                Professional doorstep wellness • Sanitized linens & organic oils • Punctual certified therapists
              </p>
            </div>
            <div className="bg-[#5a0101] text-[#ffdf88] px-4 py-2 rounded text-base font-bold shadow border border-[#a28321]">
              ₹{currentPriceInfo.price.toLocaleString()} ({selectedDuration})
            </div>
          </div>

          <form onSubmit={handleBookingSubmit} className="space-y-4">
            {/* Step 1: Duration & Pricing Tier */}
            <div>
              <label className="block text-sm font-bold text-[#840000] mb-2">
                Select Duration & Pricing Tier <span className="text-danger">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRICING_DATA.map((tier) => (
                  <button
                    key={tier.duration}
                    type="button"
                    className={`p-3 rounded-lg border-2 text-center transition cursor-pointer ${
                      selectedDuration === tier.duration
                        ? 'bg-[#840000] text-white border-[#a28321] shadow-md'
                        : 'bg-white/70 text-[#840000] border-[#a28321]/50 hover:bg-white'
                    }`}
                    onClick={() => setSelectedDuration(tier.duration)}
                  >
                    <div className="text-sm font-bold">{tier.duration}</div>
                    <div
                      className={`text-lg font-extrabold ${
                        selectedDuration === tier.duration ? 'text-[#ffdf88]' : 'text-[#840000]'
                      }`}
                    >
                      {tier.formatted}
                    </div>
                    {tier.badge && (
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mt-1 ${
                          selectedDuration === tier.duration
                            ? 'bg-[#ffdf88] text-[#840000]'
                            : 'bg-[#e0d5c1] text-[#840000]'
                        }`}
                      >
                        {tier.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Therapist & Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bkTherapist" className="block text-sm font-bold text-[#840000]">
                  Select Therapist Preference
                </label>
                <select
                  id="bkTherapist"
                  value={selectedTherapistId}
                  onChange={(e) => setSelectedTherapistId(e.target.value)}
                  className="form-control"
                >
                  <option value="any">Any Available Doorstep Royale Certified Therapist</option>
                  {therapists.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.gender}, {t.experience}, ★{t.rating})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="bkStyle" className="block text-sm font-bold text-[#840000]">
                  Massage Style <span className="text-danger">*</span>
                </label>
                <select
                  id="bkStyle"
                  value={serviceStyle}
                  onChange={(e) => setServiceStyle(e.target.value)}
                  className="form-control"
                >
                  <option value="Swedish Massage">Swedish Massage (Smooth flowing relaxation)</option>
                  <option value="Deep Tissue Massage">Deep Tissue Massage (Firmer pressure for muscle knots)</option>
                  <option value="Aromatherapy Massage">Aromatherapy Massage (Relaxing essential oils)</option>
                  <option value="Relaxation Massage">Relaxation Massage (Calming unwinding experience)</option>
                  <option value="Head, Neck & Shoulder Massage">Head, Neck & Shoulder Massage (Desk strain relief)</option>
                  <option value="Foot Massage">Foot Massage (Targeted reflexology)</option>
                  <option value="Balinese Massage">Balinese Massage (Acupressure & essential oils)</option>
                  <option value="Traditional Thai Massage">Traditional Thai (Yoga stretches, no oils)</option>
                </select>
              </div>
            </div>

            {/* Step 3: Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bkDate" className="block text-sm font-bold text-[#840000]">
                  Preferred Date <span className="text-danger">*</span>
                </label>
                <input
                  id="bkDate"
                  type="date"
                  required
                  value={bookingDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="form-control"
                />
              </div>

              <div>
                <label htmlFor="bkTime" className="block text-sm font-bold text-[#840000]">
                  Appointment Time Slot <span className="text-danger">*</span>
                </label>
                <select
                  id="bkTime"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="form-control"
                >
                  {timeSlots.map((ts) => (
                    <option key={ts} value={ts}>
                      {ts}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 4: Location & Setting */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bkArea" className="block text-sm font-bold text-[#840000]">
                  Bangalore Area <span className="text-danger">*</span>
                </label>
                <select
                  id="bkArea"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="form-control"
                >
                  {BANGALORE_AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="bkLocType" className="block text-sm font-bold text-[#840000]">
                  Location Type <span className="text-danger">*</span>
                </label>
                <select
                  id="bkLocType"
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value as 'home' | 'hotel' | 'hotel-assist')}
                  className="form-control"
                >
                  <option value="home">My Home / Residence / Villa</option>
                  <option value="hotel">My Hotel / Service Apartment Room</option>
                  <option value="hotel-assist">Need Hotel Assistance (~Rs 1300 hotel cost)</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="bkAddress" className="block text-sm font-bold text-[#840000]">
                Full Address / Apartment / Hotel Room Details <span className="text-danger">*</span>
              </label>
              <textarea
                id="bkAddress"
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Building name, flat/house number, street, landmark in Bangalore..."
                className="form-control"
              />
            </div>

            {/* Step 5: Client Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="bkClientName" className="block text-sm font-bold text-[#840000]">
                  Your Full Name <span className="text-danger">*</span>
                </label>
                <input
                  id="bkClientName"
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter name"
                  className="form-control"
                />
              </div>

              <div>
                <label htmlFor="bkClientPhone" className="block text-sm font-bold text-[#840000]">
                  Mobile Number (10 Digits) <span className="text-danger">*</span>
                </label>
                <input
                  id="bkClientPhone"
                  type="tel"
                  maxLength={10}
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="9876543210"
                  className="form-control"
                />
              </div>

              <div>
                <label htmlFor="bkClientEmail" className="block text-sm font-bold text-[#840000]">
                  Email Address
                </label>
                <input
                  id="bkClientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="form-control"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bkInstructions" className="block text-sm font-bold text-[#840000]">
                Special Instructions (Pain points, pressure preferences, notes)
              </label>
              <textarea
                id="bkInstructions"
                rows={2}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="E.g., focus on upper shoulder knots, light scent preferred, quiet session..."
                className="form-control"
              />
            </div>

            <TravelNotice />
            <label className="flex items-start gap-2 text-sm text-[#5a0101] font-semibold cursor-pointer">
              <input
                id="bkTravelAck"
                type="checkbox"
                checked={travelAck}
                onChange={(e) => setTravelAck(e.target.checked)}
                className="mt-1"
              />
              <span>
                I understand that the therapist's two-way auto fare is not included and I will pay the actual fare.{' '}
                <span className="text-danger">*</span>
              </span>
            </label>

            <div className="bg-[#e8decb] p-3 rounded text-xs text-[#228b22] leading-relaxed">
              <strong>Doorstep Royale Spa Guarantee:</strong> Transparent fixed service rates (₹1,799 for 60m, ₹2,100 for 90m, ₹3,400 for 120m, ₹4,099 for 3 hours) with no surge pricing; travel is charged separately at actual auto fare. The therapist brings sanitized fresh sheets, aromatic herbal oils, pain relief ointment, and ambient music directly to you.
            </div>

            <div className="text-center pt-2">
              <button
                id="submitBookingFormBtn"
                type="submit"
                disabled={paying}
                className="btn btn-action text-lg px-10 py-3 shadow-md hover:scale-105 transition disabled:opacity-60"
              >
                {paying
                  ? 'Opening secure payment…'
                  : `Book & Pay Online (₹${currentPriceInfo.price.toLocaleString()} for ${selectedDuration})`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: VIEW THERAPIST PROFILES */}
      {activeTab === 'profiles' && (
        <div className="space-y-6 my-6">
          <div className="bg-white/50 p-4 rounded-lg border border-[#a28321]/40 text-center">
            <h4 className="text-xl font-bold text-[#840000] mb-1">
              Verified Doorstep Royale Spa Therapists in Bangalore
            </h4>
            <p className="text-sm text-[#228b22] m-0 font-medium">
              Every therapist undergoes rigorous training to Doorstep Royale Spa standards. All therapists adhere to strict hygienic and professional ethics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {therapists.map((t) => (
              <div
                key={t.id}
                className="bg-[#f5f0e8] border-2 border-[#840000] p-5 rounded-lg shadow-md flex flex-col sm:flex-row gap-4 items-center sm:items-start"
              >
                <img
                  src={t.photo}
                  alt={t.name}
                  className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-md border-2 border-[#a28321] flex-shrink-0 shadow"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      `https://californiamassage.in${t.photo}`;
                  }}
                />

                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <h3 className="text-2xl font-bold text-[#840000] m-0">{t.name}</h3>
                    <span className="text-amber-600 text-sm font-bold">
                      ★ {t.rating} ({t.reviewsCount} reviews)
                    </span>
                  </div>

                  <p className="text-xs text-[#b30af3] font-bold mt-1">
                    {t.gender} • {t.age} Years • {t.experience} Experience
                  </p>

                  <p className="text-xs text-[#333] leading-relaxed my-2 font-sans">
                    {t.bio}
                  </p>

                  <div className="flex flex-wrap gap-1.5 my-2 justify-center sm:justify-start">
                    {t.specialties.map((s, idx) => (
                      <span
                        key={idx}
                        className="bg-[#e0d5c1] text-[#840000] text-[11px] font-bold px-2 py-0.5 rounded"
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn btn-action text-xs px-4 py-1.5 mt-2"
                    onClick={() => {
                      setSelectedTherapistId(t.id);
                      setActiveTab('book');
                    }}
                  >
                    Book with {t.name} (From ₹1,799)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: MY ACCOUNT */}
      {activeTab === 'account' && (
        <div className="max-w-4xl mx-auto my-6">
          {!sessionUserId ? (
            <div className="panel bg-[#f5f0e8] border-2 border-[#840000] p-6 rounded-lg text-center">
              <p className="text-[#840000] font-bold mb-3">Please sign in to see your bookings.</p>
              <button type="button" className="btn btn-action px-6 py-2" onClick={() => setActiveTab('login')}>
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              <h4 className="text-2xl font-bold text-[#840000] text-center mb-4">My Bookings</h4>
              {bookingsLoading && <p className="text-center text-sm">Loading…</p>}
              {([
                ['Upcoming Bookings', upcomingBookings, true],
                ['Previous Bookings', previousBookings, false],
              ] as [string, MyBooking[], boolean][]).map(([title, list, actionable]) => (
                <div key={title} className="mb-8">
                  <h5 className="text-lg font-bold text-[#5a0101] border-b border-[#a28321]/50 pb-1 mb-3">
                    {title} ({list.length})
                  </h5>
                  {list.length === 0 && !bookingsLoading && (
                    <p className="text-sm text-gray-600">No bookings here yet.</p>
                  )}
                  <div className="space-y-3">
                    {list.map((b) => (
                      <div key={b.id} className="bg-[#f5f0e8] border border-[#a28321] rounded-lg p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-[#840000]">Booking ID: {b.booking_ref}</span>
                          <span className="flex gap-2 text-xs font-bold">
                            <span className={`px-2 py-1 rounded ${b.status === 'cancelled' ? 'bg-red-100 text-red-800' : b.status === 'confirmed' ? 'bg-green-100 text-green-800' : b.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {b.status === 'cancelled' ? 'Cancelled' : b.status === 'confirmed' ? 'Confirmed' : b.status === 'completed' ? 'Completed' : 'Pending'}
                            </span>
                            <span className={`px-2 py-1 rounded ${b.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              Payment: {b.payment_status.charAt(0).toUpperCase() + b.payment_status.slice(1)}
                            </span>
                          </span>
                        </div>
                        <p className="text-sm mt-2 mb-0">
                          {b.duration} {b.service_style} with {b.therapist}
                          <br />
                          📅 {b.booking_date} at {b.booking_time} • 📍 {b.area}
                          {b.price != null && <> • ₹{b.price.toLocaleString()}</>}
                        </p>
                        {chatAvailable(b) && sessionUserId && (
                          <div className="mt-3">
                            <button
                              type="button"
                              className="btn btn-action px-4 py-1.5 text-sm"
                              onClick={() => openChat(b.id)}
                            >
                              💬 {chatState(b).open ? 'Chat with Therapist' : 'Chat history'}
                              {(unreadCounts[b.id] || 0) > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-xs">
                                  {unreadCounts[b.id]}
                                </span>
                              )}
                            </button>
                          </div>
                        )}
                        {actionable && b.status !== 'cancelled' && (
                          <div className="mt-3">
                            {reschedId === b.id ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="date"
                                  min={todayStr}
                                  value={reschedDate}
                                  onChange={(e) => setReschedDate(e.target.value)}
                                  className="form-control !w-auto"
                                />
                                <select
                                  value={reschedTime}
                                  onChange={(e) => setReschedTime(e.target.value)}
                                  className="form-control !w-auto"
                                >
                                  {timeSlots.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                                <button type="button" className="btn btn-action px-4 py-1.5 text-sm" onClick={() => handleRescheduleSave(b)}>
                                  Save
                                </button>
                                <button type="button" className="underline text-sm text-[#840000]" onClick={() => setReschedId(null)}>
                                  Close
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-3">
                                {b.payment_status !== 'paid' && b.payment_status !== 'refunded' && (
                                  <button
                                    type="button"
                                    disabled={paying}
                                    className="px-4 py-1.5 text-sm font-bold rounded bg-[#228b22] text-white hover:bg-[#1c721c] disabled:opacity-60"
                                    onClick={() =>
                                      runPayment(b.id, b.booking_ref, b.client_name, b.client_phone, b.client_email || undefined)
                                    }
                                  >
                                    {b.payment_status === 'failed' ? 'Retry Payment' : 'Pay Now'}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-action px-4 py-1.5 text-sm"
                                  onClick={() => {
                                    setReschedId(b.id);
                                    setReschedDate(b.booking_date);
                                    setReschedTime(b.booking_time);
                                  }}
                                >
                                  Reschedule
                                </button>
                                <button
                                  type="button"
                                  className="px-4 py-1.5 text-sm font-bold rounded border border-red-700 text-red-700 hover:bg-red-50"
                                  onClick={() => handleCancelBooking(b)}
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* TAB 3: CLIENT LOGIN */}
      {activeTab === 'login' && (
        <div className="max-w-md mx-auto my-6">
          <div className="panel panel-default bg-[#f5f0e8] border-2 border-[#840000] p-6 sm:p-8 rounded-lg shadow-md">
            <h4 className="text-center text-2xl font-bold text-[#840000] mb-2">
              Client Sign In
            </h4>
            <p className="text-center text-xs text-[#228b22] mb-4">
              Sign in with your mobile number to view scheduled sessions and past appointments.
            </p>
            <hr className="my-4 border-[#a28321]/40" />

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="loginUserPhone" className="block text-sm font-bold text-[#840000]">
                  Username (9-10 digit mobile number) <span className="text-danger">*</span>
                </label>
                <input
                  id="loginUserPhone"
                  type="tel"
                  required
                  maxLength={10}
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  placeholder="9876543210"
                  className="form-control"
                />
              </div>

              <div>
                <label htmlFor="loginUserPass" className="block text-sm font-bold text-[#840000]">
                  Password <span className="text-danger">*</span>
                </label>
                <input
                  id="loginUserPass"
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  className="form-control"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <a
                  href="#forgot"
                  className="text-[#840000] underline"
                  onClick={(e) => {
                    e.preventDefault();
                    onShowAlert(
                      'Password Recovery',
                      `Please contact Doorstep Royale Spa admin via WhatsApp (${SPA_PHONE}) to instantly reset your credentials.`
                    );
                  }}
                >
                  Forgot password?
                </a>

                <button
                  type="button"
                  className="text-[#b30af3] underline font-bold"
                  onClick={() => setActiveTab('register')}
                >
                  New client? Register here
                </button>
              </div>

              <div className="text-center pt-3">
                <button id="loginSubmitBtn" type="submit" className="btn btn-action w-full py-2.5">
                  Sign In to Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: CLIENT REGISTER */}
      {activeTab === 'register' && (
        <div className="max-w-md mx-auto my-6">
          <div className="panel panel-default bg-[#f5f0e8] border-2 border-[#840000] p-6 sm:p-8 rounded-lg shadow-md">
            <h4 className="text-center text-2xl font-bold text-[#840000] mb-2">
              Register a New Account
            </h4>
            <p className="text-center text-xs text-[#228b22] mb-4">
              Register to access complete verified therapist profiles and appointment history.
            </p>
            <hr className="my-4 border-[#a28321]/40" />

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label htmlFor="regUserEmail" className="block text-sm font-bold text-[#840000]">
                  Email Address <span className="text-danger">*</span>
                </label>
                <input
                  id="regUserEmail"
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="form-control"
                />
              </div>

              <div>
                <label htmlFor="regUserPhone" className="block text-sm font-bold text-[#840000]">
                  Mobile Number (10 digits) <span className="text-danger">*</span>
                </label>
                <input
                  id="regUserPhone"
                  type="tel"
                  maxLength={10}
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="9876543210"
                  className="form-control"
                />
              </div>

              <div>
                <label htmlFor="regUserPass" className="block text-sm font-bold text-[#840000]">
                  Create Password <span className="text-danger">*</span>
                </label>
                <input
                  id="regUserPass"
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="form-control"
                />
              </div>

              <div className="text-center pt-3">
                <button id="registerSubmitBtn" type="submit" className="btn btn-action w-full py-2.5">
                  Register Account
                </button>
              </div>

              <div className="text-center pt-2">
                <span className="text-xs text-[#840000]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="underline text-[#b30af3] font-bold"
                    onClick={() => setActiveTab('login')}
                  >
                    Click here to Sign In
                  </button>
                </span>
              </div>
            </form>
          </div>
        </div>
      )}
      {openChatId && sessionUserId && myBookings.find((b) => b.id === openChatId) && (
        <ChatWindow
          booking={myBookings.find((b) => b.id === openChatId)!}
          myId={sessionUserId}
          myRole="customer"
          onClose={() => {
            setOpenChatId(null);
            reloadUnread();
          }}
          onChanged={loadBookings}
        />
      )}
    </article>
  );
};
