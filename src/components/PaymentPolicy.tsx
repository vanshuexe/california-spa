import React from 'react';
import { POLICY_TZ_LABEL, formatIst, policyPoints, rupees } from '../data/paymentPolicy';
import { TherapistPhoto } from './TherapistPhoto';
import { TherapistProfile } from '../types';

interface PolicyProps {
  hours: number;
  /** cancellation deadline for the slot being booked (if known) */
  deadline?: Date | null;
  className?: string;
}

// Shown before the customer pays: the rules, the exact deadline and whether a refund applies.
export const PaymentPolicyBox: React.FC<PolicyProps> = ({ hours, deadline, className = '' }) => {
  const open = deadline ? deadline.getTime() > Date.now() : null;
  return (
    <div className={`bg-[#fff3cd] border border-[#a28321] rounded-lg p-3 text-left ${className}`}>
      <div className="font-bold text-[#5a0101] text-sm">📋 Advance payment &amp; cancellation policy</div>
      {deadline && (
        <div
          className={`mt-2 rounded px-2.5 py-1.5 text-xs font-bold ${open ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}
          role="note"
        >
          {open ? (
            <>
              ⏰ Cancellation deadline: <span className="whitespace-nowrap">{formatIst(deadline)}</span>. Cancel before this and your
              advance is <u>refundable</u>.
            </>
          ) : (
            <>
              ⚠️ This session starts within {hours} hours, so the cancellation deadline has already passed: your advance will be{' '}
              <u>non-refundable</u> (to the extent permitted by law).
            </>
          )}
        </div>
      )}
      <ul className="m-0 mt-2 pl-5 text-xs text-[#5a0101] leading-relaxed list-disc space-y-0.5">
        {policyPoints(hours).map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <div className="text-[11px] text-[#5a0101]/80 mt-1.5">All times are in {POLICY_TZ_LABEL}.</div>
    </div>
  );
};

interface BreakdownProps {
  total: number;
  paid: number; // already paid
  paying?: number; // being paid now
  className?: string;
}

// Total price, amount paid and balance, e.g. 1,799 / 500 / 1,299.
export const PaymentBreakdown: React.FC<BreakdownProps> = ({ total, paid, paying = 0, className = '' }) => {
  const balance = Math.max(total - paid - paying, 0);
  const row = 'flex justify-between gap-4 py-1';
  return (
    <div className={`bg-white/70 border border-[#a28321] rounded-lg px-3 py-2 text-sm ${className}`}>
      <div className={row}>
        <span>Total service price</span>
        <b>{rupees(total)}</b>
      </div>
      {paid > 0 && (
        <div className={`${row} text-[#228b22]`}>
          <span>Paid so far</span>
          <b>{rupees(paid)}</b>
        </div>
      )}
      {paying > 0 && (
        <div className={`${row} text-[#840000]`}>
          <span>Advance to pay now</span>
          <b>{rupees(paying)}</b>
        </div>
      )}
      <div className={`${row} border-t border-[#a28321]/40 mt-1 pt-1.5`}>
        <span>{paying > 0 ? 'Remaining balance (after advance)' : 'Remaining balance'}</span>
        <b className="text-[#840000]">{rupees(balance)}</b>
      </div>
    </div>
  );
};

interface SummaryProps {
  therapist: TherapistProfile | null; // null = "best available therapist"
  service: string;
  duration: string;
  date: string;
  time: string;
  area: string;
  total: number;
  advance: number;
}

// Everything the customer is agreeing to, in one place, right above the pay button.
export const BookingSummaryCard: React.FC<SummaryProps> = ({ therapist, service, duration, date, time, area, total, advance }) => (
  <div className="bg-[#f5f0e8] border-2 border-[#840000] rounded-lg p-4" aria-label="Booking summary">
    <div className="text-sm font-bold text-[#840000] mb-3">🧾 Your booking summary</div>
    <div className="flex gap-3 items-center mb-3">
      <TherapistPhoto
        src={therapist?.photo}
        alt={therapist ? `${therapist.name}, your therapist` : 'Best available therapist'}
        width={72}
        height={72}
        eager
        className="w-[72px] h-[72px] rounded-lg object-cover border-2 border-[#a28321] bg-white shrink-0"
      />
      <div className="min-w-0 text-sm">
        {therapist ? (
          <>
            <div className="font-bold text-[#840000] truncate">{therapist.name}</div>
            <div className="text-xs text-gray-700">
              {[therapist.gender, therapist.age ? `${therapist.age} yrs` : '', therapist.experience].filter(Boolean).join(' • ')}
            </div>
            {therapist.specialties.length > 0 && <div className="text-xs text-gray-600 truncate">{therapist.specialties.join(', ')}</div>}
          </>
        ) : (
          <>
            <div className="font-bold text-[#840000]">Best available therapist</div>
            <div className="text-xs text-gray-700">A certified therapist is assigned after your advance is verified.</div>
          </>
        )}
      </div>
    </div>
    <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1 text-sm m-0 mb-3">
      <dt className="font-bold text-[#5a0101]">Service</dt>
      <dd className="m-0">{duration} {service}</dd>
      <dt className="font-bold text-[#5a0101]">Date &amp; time</dt>
      <dd className="m-0">{date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-'}, {time}</dd>
      <dt className="font-bold text-[#5a0101]">Area</dt>
      <dd className="m-0">{area}</dd>
    </dl>
    <PaymentBreakdown total={total} paid={0} paying={advance} />
    <div className="mt-3 flex items-center justify-between gap-3 bg-[#840000] text-[#ffdf88] rounded-lg px-3 py-2.5">
      <span className="text-sm font-bold">Final amount payable now</span>
      <span className="text-xl font-extrabold">{rupees(advance)}</span>
    </div>
    <p className="text-xs text-[#5a0101] mt-2 mb-0">
      Your booking is <b>confirmed only after the advance payment is verified</b>. Travel (auto fare) is not included.
    </p>
  </div>
);
