import { EXPRESS_PRICING_DATA, PRICING_DATA, SPA_PHONE, SPA_PHONE_2, TRAVEL_NOTICE } from '../data/siteData';
import { AREAS } from './areas';

export interface Faq {
  q: string;
  a: string;
}

const prices = [...EXPRESS_PRICING_DATA, ...PRICING_DATA]
  .map((t) => `${t.duration} ₹${t.price.toLocaleString('en-IN')}`)
  .join(', ');

// Shown on /faq/ and also emitted as FAQPage structured data (so the text must stay plain).
export const FAQS: Faq[] = [
  {
    q: 'What is Doorstep Royale Spa?',
    a: 'Doorstep Royale Spa is a home and hotel-room massage service in Bangalore. A trained therapist comes to your doorstep with fresh linen, oils and equipment so you can relax without travelling to a spa.',
  },
  {
    q: 'How much does a home massage in Bangalore cost?',
    a: `Our service fees are: ${prices}. Travel is charged separately, see the next answer.`,
  },
  {
    q: 'Are travel charges included in the price?',
    a: TRAVEL_NOTICE,
  },
  {
    q: 'What are your timings?',
    a: 'We are available every day, 9:00 AM to 10:00 PM, including weekends and holidays. You can pick your preferred time slot while booking.',
  },
  {
    q: 'Which areas of Bangalore do you serve?',
    a: `We serve ${AREAS.map((a) => a.fullName).join(', ')} and other parts of Bangalore. If your area is not listed, call us on ${SPA_PHONE} or ${SPA_PHONE_2} and we will check availability.`,
  },
  {
    q: 'How do I book and pay?',
    a: 'Choose your session length, therapist preference, date, time and area on the Book Appointment page, then pay an advance of ₹500 or ₹1,000 online (UPI, cards, net banking and wallets). Your booking is confirmed as soon as the advance payment is verified, and a therapist is assigned to it. The remaining balance is paid on the day of service, online from your account or directly to the therapist.',
  },
  {
    q: 'Can I choose my therapist?',
    a: 'Yes. You can view therapist profiles on the booking page and choose the therapist you prefer, or let us assign the best available therapist. Female and male therapists are available.',
  },
  {
    q: 'Do you offer massage in hotel rooms?',
    a: 'Yes. We serve private homes, apartments, villas and hotel rooms across Bangalore. Select the hotel option while booking.',
  },
  {
    q: 'Which massage styles do you offer?',
    a: 'Swedish, deep tissue, aromatherapy, relaxation, head, neck and shoulder, foot reflexology, Balinese and traditional Thai massage.',
  },
  {
    q: 'Can I reschedule or cancel a booking?',
    a: `Yes. Sign in and open My Account to reschedule or cancel. Cancel or reschedule before the cancellation deadline shown with your booking (by default 24 hours before the session, in Indian Standard Time) and your advance is refunded in full or moved to the new slot. After the deadline the advance is non-refundable, to the extent permitted by applicable law. For help please call ${SPA_PHONE}.`,
  },
  {
    q: 'How much is the advance and when do I pay the balance?',
    a: 'To confirm a booking you pay an advance of ₹500 or ₹1,000 (your choice). For example, for a ₹1,799 session with a ₹500 advance, the balance is ₹1,299. The balance is paid on the day of service, online from My Account or directly to your therapist by cash or UPI.',
  },
  {
    q: 'How do I talk to my therapist?',
    a: 'After your advance is paid and your booking is confirmed, a chat with your therapist opens in My Account. The chat is for booking-related communication only. Sharing phone numbers or other personal contact details is not allowed, for the safety and privacy of customers and therapists.',
  },
  {
    q: 'Is the service hygienic?',
    a: 'Yes. Therapists use fresh disposable sheets, sanitised equipment and quality oils for every session.',
  },
  {
    q: 'Are you hiring therapists?',
    a: 'Yes. Please see the Jobs page for current vacancies and send your application through the form.',
  },
  {
    q: 'How can I contact Doorstep Royale Spa?',
    a: `Call or WhatsApp us on ${SPA_PHONE} or ${SPA_PHONE_2}, or use the contact form on our Contact page.`,
  },
];
