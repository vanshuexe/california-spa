import React, { useState, useEffect } from 'react';
import { PageId } from '../types';
import { supabase, isSupabaseConfigured, phoneToAuthEmail } from '../lib/supabase';
import { payForBooking } from '../lib/payment';
import { TravelNotice } from '../components/TravelNotice';
import { BookingSummaryCard, PaymentBreakdown, PaymentPolicyBox } from '../components/PaymentPolicy';
import { ADVANCE_OPTIONS, PAYMENT_LABEL, advanceOptionsFor, bookingStartMs, deadlineFor, formatIst, policyPoints, rupees, usePolicySettings } from '../data/paymentPolicy';
import { openReceipt } from '../lib/receipt';
import { TherapistPhoto } from '../components/TherapistPhoto';
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
  amount_paid: number;
  advance_amount: number | null;
  refund_due: number;
  cancel_deadline: string | null;
  hold_expires_at: string | null;
  cancel_reason: string | null;
  policy_hours: number | null;
}

interface MyRefund {
  booking_id: string;
  amount: number;
  status: string;
  razorpay_refund_id: string | null;
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
  const [policyAck, setPolicyAck] = useState(false);
  const { hours: policyHours } = usePolicySettings();
  const [myRefunds, setMyRefunds] = useState<MyRefund[]>([]);
  const [advance, setAdvance] = useState<number>(ADVANCE_OPTIONS[0]);
  const [retryAdvance, setRetryAdvance] = useState<Record<string, number>>({});

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
    await supabase.rpc('expire_stale_holds'); // free slots held by unpaid bookings
    const { data: refundRows } = await supabase.from('booking_refunds').select('booking_id, amount, status, razorpay_refund_id');
    setMyRefunds((refundRows as MyRefund[]) || []);
    const { data, error } = await supabase
      .from('bookings')
      .select('id, booking_ref, therapist, service_style, duration, booking_date, booking_time, area, price, status, payment_status, client_name, client_phone, client_email, therapist_id, chat_blocked, amount_paid, advance_amount, refund_due, cancel_deadline, hold_expires_at, cancel_reason, policy_hours')
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

  const advanceChoices = advanceOptionsFor(currentPriceInfo.price);
  useEffect(() => {
    if (!advanceChoices.includes(advance as (typeof ADVANCE_OPTIONS)[number])) {
      setAdvance(advanceChoices[advanceChoices.length - 1] ?? ADVANCE_OPTIONS[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPriceInfo.price]);

  const handleCancelBooking = async (b: MyBooking) => {
    const deadline = b.cancel_deadline ? new Date(b.cancel_deadline) : deadlineFor(b.booking_date, b.booking_time, b.policy_hours ?? policyHours);
    const eligible = Date.now() <= deadline.getTime();
    const outcome =
      b.amount_paid <= 0
        ? 'Nothing has been paid for this booking.'
        : eligible
          ? `You are cancelling before the deadline (${formatIst(deadline)}), so your ${rupees(b.amount_paid)} will be refunded.`
          : `The cancellation deadline (${formatIst(deadline)}) has passed, so your advance of ${rupees(b.advance_amount ?? b.amount_paid)} is NON-refundable under our policy (to the extent permitted by law).`;
    if (!window.confirm(`Cancel booking ${b.booking_ref}?\n\n${outcome}`)) return;
    const { data, error } = await supabase.functions.invoke('cancel-booking', { body: { booking_id: b.id } });
    if (error || data?.error) {
      let msg = data?.error || error?.message || 'Could not cancel.';
      try {
        const body = await (error as { context?: Response } | null)?.context?.json?.();
        if (body?.error) msg = body.error;
      } catch {
        /* keep message */
      }
      onShowAlert('Cancel Failed', msg);
      return;
    }
    const due = Number(data?.refund_due ?? 0);
    onShowAlert(
      'Booking Cancelled',
      `Booking ${b.booking_ref} has been cancelled.${due > 0 ? `\n\nA refund of ${rupees(due)} will be processed to your original payment method, usually within 5-7 working days.` : b.amount_paid > 0 ? '\n\nThe advance is not refundable because the booking was cancelled after the deadline.' : ''}\n\nWe have emailed you the details (if you gave an email address).`
    );
    loadBookings();
  };

  const handleRescheduleSave = async (b: MyBooking) => {
    if (!reschedDate || reschedDate < todayStr) {
      onShowAlert('Invalid Date', 'Please choose today or a future date.');
      return;
    }
    const { error } = await supabase.rpc('reschedule_my_booking', { p_id: b.id, p_date: reschedDate, p_time: reschedTime });
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
    if (bookingStartMs(bookingDate, bookingTime) <= Date.now()) {
      onShowAlert('Choose a Future Slot', 'The date and time you picked has already passed. Please choose a later time slot or date.');
      return;
    }
    if (!policyAck) {
      onShowAlert('Payment Policy', 'Please read and accept the advance payment and cancellation policy before paying.');
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

    const newRef = () => `DRS-BLR-${Math.floor(100000 + Math.random() * 900000)}`;
    let bookingRef = newRef();

    if (!isSupabaseConfigured) {
      onShowAlert('Setup Needed', 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
      return;
    }
    const bookingId = crypto.randomUUID();
    // Booking IDs are unique in the database; in the rare case of a clash, try a fresh one.
    let error: { message: string; code?: string } | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await supabase.from('bookings').insert({
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
      error = res.error;
      if (!error || !(error.code === '23505' && /booking_ref/.test(error.message))) break;
      bookingRef = newRef();
    }
    if (error) {
      onShowAlert(
        'Booking Failed',
        error.message.replace(/^DUPLICATE_BOOKING: |^PAST_SLOT: /, '')
      );
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

    await runPayment(bookingId, bookingRef, name, phone, email, 'advance', advance);
  };

  const runPayment = async (
    bookingId: string,
    bookingRef: string,
    name: string,
    phone: string,
    email: string | undefined,
    kind: 'advance' | 'balance',
    advanceAmount?: number
  ) => {
    setPaying(true);
    const result = await payForBooking({ bookingId, kind, advance: advanceAmount, policyAck: kind === 'advance', name, phone, email });
    setPaying(false);

    if (result.status === 'paid') {
      const sm = result.summary;
      const lines = [
        `Total service price: ${rupees(sm.price)}`,
        `Paid so far: ${rupees(sm.amount_paid)}`,
        `Remaining balance: ${rupees(sm.balance)}`,
      ].join('\n');
      if (kind === 'advance') {
        onShowAlert(
          'Advance Paid - Booking Confirmed!',
          `Thank you ${name}! Your advance was verified and your booking is confirmed.\n\nBooking ID: ${bookingRef}\n\n${lines}\n\n${sm.balance > 0 ? 'Pay the balance on the day of service: online from My Account, or to your therapist (cash / UPI).' : ''}${email ? `\n\n${sm.receipt_emailed ? 'A receipt has been emailed to' : 'Your receipt is available in My Account. Email:'} ${email}.` : '\n\nYou can view your receipt in My Account.'}\n\nReminder: the therapist's two-way auto fare is not included in the service fee.\n\nOur coordinator will call you from ${SPA_PHONES_TEXT} shortly.`
        );
      } else {
        onShowAlert(
          'Balance Paid - Fully Paid!',
          `Thank you ${name}! Your balance payment was verified.\n\nBooking ID: ${bookingRef}\n\n${lines}`
        );
      }
    } else if (result.status === 'failed') {
      onShowAlert(
        'Payment Failed',
        `${result.message}\n\nYour booking ${bookingRef} is saved but NOT confirmed. You can retry from My Account (sign in) or call ${SPA_PHONES_TEXT}.`
      );
    } else {
      onShowAlert(
        'Payment Not Completed',
        `Booking ${bookingRef} is saved but NOT confirmed until the advance is paid.`
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
          Book a Home Massage in Bangalore
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

            <div className="bg-[#f5f0e8] border-2 border-[#840000] rounded-lg p-4">
              <label className="block text-sm font-bold text-[#840000] mb-2">
                Pay an advance to confirm your booking <span className="text-danger">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3 mb-3" role="radiogroup" aria-label="Advance payment amount">
                {ADVANCE_OPTIONS.map((amt) => {
                  const allowed = amt < currentPriceInfo.price;
                  const active = advance === amt && allowed;
                  return (
                    <button
                      key={amt}
                      id={`advance-${amt}`}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={!allowed}
                      onClick={() => setAdvance(amt)}
                      className={`p-3 rounded-lg border-2 text-center font-bold transition ${
                        active ? 'bg-[#840000] text-[#ffdf88] border-[#840000]' : 'bg-white text-[#840000] border-[#a28321]'
                      } ${allowed ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                    >
                      <span className="text-xl block">{rupees(amt)}</span>
                      <span className="text-[11px] font-semibold block">advance</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <BookingSummaryCard
              therapist={selectedTherapistId === 'any' ? null : therapists.find((t) => t.id === selectedTherapistId) ?? null}
              service={serviceStyle}
              duration={selectedDuration}
              date={bookingDate}
              time={bookingTime}
              area={area}
              total={currentPriceInfo.price}
              advance={advance}
            />

            <PaymentPolicyBox hours={policyHours} deadline={deadlineFor(bookingDate, bookingTime, policyHours)} />
            <label className="flex items-start gap-2 text-sm text-[#5a0101] font-semibold cursor-pointer">
              <input
                id="bkPolicyAck"
                type="checkbox"
                checked={policyAck}
                onChange={(e) => setPolicyAck(e.target.checked)}
                className="mt-1"
              />
              <span>
                I have read and accept the advance payment and cancellation policy. <span className="text-danger">*</span>
              </span>
            </label>

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
                  : `Pay ${rupees(advance)} Advance & Confirm Booking`}
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
                <TherapistPhoto
                  src={t.photo}
                  alt={`${t.name}, massage therapist at Doorstep Royale Spa`}
                  width={128}
                  height={128}
                  className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-md border-2 border-[#a28321] flex-shrink-0 shadow"
                />

                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <h3 className="text-2xl font-bold text-[#840000] m-0">{t.name}</h3>
                    <span className="text-amber-600 text-sm font-bold">
                      ★ {t.rating} ({t.reviewsCount} reviews)
                    </span>
                  </div>

                  <p className="text-xs text-[#b30af3] font-bold mt-1">
                    {[t.gender, t.age ? `${t.age} Years` : '', t.experience ? `${t.experience} Experience` : ''].filter(Boolean).join(' • ')}
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
                              {b.status === 'cancelled' ? (b.cancel_reason === 'expired' ? 'Expired (unpaid)' : 'Cancelled') : b.status === 'confirmed' ? 'Confirmed' : b.status === 'completed' ? 'Completed' : 'Pending'}
                            </span>
                            <span className={`px-2 py-1 rounded ${b.payment_status === 'paid' ? 'bg-green-100 text-green-800' : b.payment_status === 'partial' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {PAYMENT_LABEL[b.payment_status] ?? b.payment_status}
                            </span>
                          </span>
                        </div>
                        <p className="text-sm mt-2 mb-0">
                          {b.duration} {b.service_style} with {b.therapist}
                          <br />
                          📅 {b.booking_date} at {b.booking_time} • 📍 {b.area}
                        </p>
                        {b.price != null && b.status !== 'cancelled' && (
                          <PaymentBreakdown total={b.price} paid={b.amount_paid} className="mt-2 max-w-xs" />
                        )}
                        {b.status === 'pending' && b.amount_paid <= 0 && b.hold_expires_at && new Date(b.hold_expires_at).getTime() > Date.now() && (
                          <p className="text-xs font-bold text-[#840000] mt-2 mb-0">
                            ⏳ Your slot is held until {new Date(b.hold_expires_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST. Pay the advance to confirm it.
                          </p>
                        )}
                        {(b.status === 'confirmed' || b.status === 'pending') && b.amount_paid > 0 && b.cancel_deadline && (
                          <p className="text-xs mt-2 mb-0">
                            {new Date(b.cancel_deadline).getTime() > Date.now() ? (
                              <span className="text-[#228b22] font-bold">⏰ Free cancellation until {formatIst(b.cancel_deadline)}</span>
                            ) : (
                              <span className="text-red-700 font-bold">⚠️ Cancellation deadline passed ({formatIst(b.cancel_deadline)}): the advance is non-refundable.</span>
                            )}
                          </p>
                        )}
                        {b.status === 'cancelled' && (
                          <div className="text-xs font-bold mt-2 space-y-0.5">
                            {myRefunds
                              .filter((r) => r.booking_id === b.id)
                              .map((r) => (
                                <div key={r.razorpay_refund_id ?? r.amount} className={r.status === 'processed' ? 'text-[#228b22]' : r.status === 'failed' ? 'text-red-700' : 'text-amber-700'}>
                                  ↩️ Refund {rupees(r.amount)}: {r.status === 'processed' ? 'processed' : r.status === 'failed' ? 'could not be completed, we will contact you' : 'in progress'}
                                  {r.razorpay_refund_id ? ` (ref ${r.razorpay_refund_id})` : ''}
                                </div>
                              ))}
                            {b.refund_due > 0 && !myRefunds.some((r) => r.booking_id === b.id && r.status === 'processing') && (
                              <div className="text-[#228b22]">
                                ↩️ A refund of {rupees(b.refund_due)} is due. Our team will process it (usually 5-7 working days).
                              </div>
                            )}
                            {b.refund_due === 0 && b.amount_paid > 0 && b.payment_status !== 'refunded' && (
                              <div className="text-red-700">The advance of {rupees(b.amount_paid)} is non-refundable (cancelled after the deadline).</div>
                            )}
                          </div>
                        )}
                        {b.amount_paid > 0 && (
                          <button
                            type="button"
                            className="mt-2 text-xs underline text-[#840000] font-bold"
                            onClick={() => openReceipt({ ...b, price: b.price })}
                          >
                            🧾 View / print receipt
                          </button>
                        )}
                        {b.status !== 'cancelled' && b.payment_status === 'partial' && b.price != null && b.price > b.amount_paid && (
                          <div className="mt-2">
                            <button
                              type="button"
                              disabled={paying}
                              className="px-4 py-1.5 text-sm font-bold rounded bg-[#228b22] text-white hover:bg-[#1c721c] disabled:opacity-60"
                              onClick={() =>
                                runPayment(b.id, b.booking_ref, b.client_name, b.client_phone, b.client_email || undefined, 'balance')
                              }
                            >
                              Pay Balance {rupees(b.price - b.amount_paid)}
                            </button>
                          </div>
                        )}
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
                                {b.amount_paid <= 0 && b.payment_status !== 'refunded' && (
                                  <>
                                    <select
                                      aria-label="Advance amount"
                                      value={retryAdvance[b.id] ?? b.advance_amount ?? ADVANCE_OPTIONS[0]}
                                      onChange={(e) => setRetryAdvance((m) => ({ ...m, [b.id]: Number(e.target.value) }))}
                                      className="form-control !w-auto !py-1"
                                    >
                                      {advanceOptionsFor(b.price ?? 99999).map((amt) => (
                                        <option key={amt} value={amt}>{rupees(amt)} advance</option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      disabled={paying}
                                      className="px-4 py-1.5 text-sm font-bold rounded bg-[#228b22] text-white hover:bg-[#1c721c] disabled:opacity-60"
                                      onClick={() => {
                                        const amt = retryAdvance[b.id] ?? b.advance_amount ?? ADVANCE_OPTIONS[0];
                                        const dl = deadlineFor(b.booking_date, b.booking_time, b.policy_hours ?? policyHours);
                                        const ok = window.confirm(
                                          `Pay a ${rupees(amt)} advance for ${b.booking_ref}?\n\nCancellation deadline: ${formatIst(dl)}.\n\n${policyPoints(b.policy_hours ?? policyHours).slice(2, 4).join('\n\n')}\n\nTap OK to accept this policy and continue to payment.`
                                        );
                                        if (ok) {
                                          runPayment(b.id, b.booking_ref, b.client_name, b.client_phone, b.client_email || undefined, 'advance', amt);
                                        }
                                      }}
                                    >
                                      {b.payment_status === 'failed' ? 'Retry Advance Payment' : 'Pay Advance & Confirm'}
                                    </button>
                                  </>
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
