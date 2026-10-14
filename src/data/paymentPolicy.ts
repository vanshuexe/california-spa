import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Advance payment, balance and cancellation policy.
// The cancellation deadline (hours) and the unpaid-hold time are set by the admin (Admin > Bookings >
// Policy settings) and stored in public.app_settings. Keep the wording in sync with
// supabase/functions/_shared/policy.ts (used in receipts / emails).
export const ADVANCE_OPTIONS = [500, 1000] as const;
export const DEFAULT_CANCELLATION_HOURS = 24;
export const DEFAULT_HOLD_MINUTES = 30;
export const POLICY_TIMEZONE = 'Asia/Kolkata';
export const POLICY_TZ_LABEL = 'IST (India Standard Time, UTC+05:30)';

export const rupees = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

export const policyPoints = (hours: number) => [
  'Your advance confirms the booking and reserves your therapist. The rest of the service price is the balance.',
  'The balance is paid on the day of service: online from My Account ("Pay Balance") or directly to your therapist by cash / UPI.',
  `Cancel or reschedule at least ${hours} hours before your session (the deadline is shown with your booking, in ${POLICY_TZ_LABEL}): your advance is refunded in full to the original payment method, usually in 5-7 working days, or moved to the new slot.`,
  'After that deadline, or if you are not available for the session, the advance is non-refundable, to the extent permitted by applicable law.',
  'If we have to cancel (for example the therapist is unavailable), you get a full refund of everything you paid.',
  "Travel is not included: the therapist's two-way auto fare is paid by the client at the actual fare.",
];

// Advance options that still leave a balance (a Rs 999 session cannot take a Rs 1,000 advance).
export const advanceOptionsFor = (price: number) => ADVANCE_OPTIONS.filter((a) => a < price);

// "2026-12-20" + "11:00 AM" in India time -> timestamp
export function bookingStartMs(date: string, time: string): number {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(time || '');
  let h = m ? parseInt(m[1], 10) % 12 : 0;
  if (m && m[3].toUpperCase() === 'PM') h += 12;
  const mm = m ? m[2] : '00';
  return new Date(`${date}T${String(h).padStart(2, '0')}:${mm}:00+05:30`).getTime();
}

export const deadlineFor = (date: string, time: string, hours: number) => new Date(bookingStartMs(date, time) - hours * 3_600_000);

export const formatIst = (d: Date | string | null | undefined) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        timeZone: POLICY_TIMEZONE,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }) + ' IST'
    : '';

export const PAYMENT_LABEL: Record<string, string> = {
  pending: 'Unpaid',
  partial: 'Partially paid',
  paid: 'Fully paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
};

// Admin-configurable policy values, read publicly.
export function usePolicySettings() {
  const [hours, setHours] = useState(DEFAULT_CANCELLATION_HOURS);
  const [holdMinutes, setHoldMinutes] = useState(DEFAULT_HOLD_MINUTES);
  const [loaded, setLoaded] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['cancellation_hours', 'hold_minutes'])
      .then(({ data }) => {
        for (const r of (data as { key: string; value: unknown }[]) || []) {
          const v = Number(r.value);
          if (!Number.isFinite(v)) continue;
          if (r.key === 'cancellation_hours') setHours(v);
          if (r.key === 'hold_minutes') setHoldMinutes(v);
        }
        setLoaded(true);
      });
  }, []);

  return { hours, holdMinutes, loaded };
}
