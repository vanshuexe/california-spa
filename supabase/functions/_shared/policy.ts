// Payment and cancellation policy used in receipts / emails and for validating advance amounts.
// The cancellation deadline (hours) is configurable by the admin (public.app_settings.cancellation_hours).
// IMPORTANT: keep the wording in sync with src/data/paymentPolicy.ts (the text customers see before paying).
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const ADVANCE_OPTIONS = [500, 1000];
export const DEFAULT_CANCELLATION_HOURS = 24;
export const DEFAULT_HOLD_MINUTES = 30;
export const POLICY_TIMEZONE = 'Asia/Kolkata';
export const POLICY_TZ_LABEL = 'IST (India Standard Time, UTC+05:30)';

export const rupees = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

export const policyPoints = (hours: number) => [
  'Your advance confirms the booking and reserves your therapist. The rest of the service price is the balance.',
  'The balance is paid on the day of service: online from My Account ("Pay Balance") or directly to your therapist by cash / UPI.',
  `Cancel or reschedule at least ${hours} hours before your session (the deadline is shown with your booking, in ${POLICY_TZ_LABEL}): your advance is refunded in full to the original payment method, usually in 5-7 working days, or moved to the new slot.`,
  `After that deadline, or if you are not available for the session, the advance is non-refundable, to the extent permitted by applicable law.`,
  'If we have to cancel (for example the therapist is unavailable), you get a full refund of everything you paid.',
  "Travel is not included: the therapist's two-way auto fare is paid by the client at the actual fare.",
];

export const formatIst = (d: string | Date | null | undefined) =>
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

// Admin-configurable values (with safe defaults).
export async function getPolicySettings(db: SupabaseClient) {
  const { data } = await db.from('app_settings').select('key, value').in('key', ['cancellation_hours', 'hold_minutes']);
  const map: Record<string, number> = {};
  for (const r of data || []) map[r.key] = Number(r.value);
  return {
    cancellationHours: Number.isFinite(map.cancellation_hours) ? map.cancellation_hours : DEFAULT_CANCELLATION_HOURS,
    holdMinutes: Number.isFinite(map.hold_minutes) ? map.hold_minutes : DEFAULT_HOLD_MINUTES,
  };
}

// booking date + "11:00 AM" in India time -> Date
export function bookingStart(date: string, time: string): Date {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(time || '');
  let h = m ? parseInt(m[1], 10) % 12 : 0;
  if (m && m[3].toUpperCase() === 'PM') h += 12;
  return new Date(`${date}T${String(h).padStart(2, '0')}:${m ? m[2] : '00'}:00+05:30`);
}
