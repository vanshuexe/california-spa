import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTherapists } from '../lib/useTherapists';
import { POLICY_TZ_LABEL, formatIst, rupees } from '../data/paymentPolicy';
import { TherapistPhoto } from './TherapistPhoto';

interface AdminBooking {
  id: string;
  booking_ref: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  therapist: string | null;
  therapist_id: string | null;
  service_style: string | null;
  duration: string | null;
  booking_date: string;
  booking_time: string;
  area: string | null;
  address: string | null;
  location_type: string | null;
  special_instructions: string | null;
  price: number | null;
  status: string;
  payment_status: string;
  razorpay_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
  advance_amount: number | null;
  amount_paid: number;
  refund_due: number;
  receipt_sent_at: string | null;
  cancel_deadline: string | null;
  policy_hours: number | null;
  policy_accepted_at: string | null;
  cancel_reason: string | null;
  hold_expires_at: string | null;
}

interface PaymentRow {
  id: string;
  booking_id: string;
  kind: string;
  method: string;
  amount: number;
  status: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  refunded_amount: number;
  note: string | null;
  paid_at: string | null;
}

interface RefundRow {
  id: string;
  booking_id: string;
  amount: number;
  status: string;
  razorpay_refund_id: string | null;
  razorpay_payment_id: string | null;
  reason: string | null;
  created_at: string;
  processed_at: string | null;
}

interface AuditRow {
  id: string;
  booking_id: string | null;
  created_at: string;
  actor_role: string;
  action: string;
  details: string | null;
}

type Filter = 'all' | 'advance' | 'paid' | 'unpaid' | 'refund' | 'cancelled';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

// "2026-09-30" + "07:00 PM" -> "30 Sept, 7 PM"
function formatWhen(date: string, time: string) {
  const [, m, d] = date.split('-').map(Number);
  const t = time.replace(/^0/, '').replace(':00', '');
  return `${d} ${MONTHS[m - 1]}, ${t}`;
}

const PAYMENT_LABEL: Record<string, string> = {
  paid: '✅ Fully paid',
  partial: '🟦 Partially paid',
  pending: '⏳ Unpaid',
  failed: '❌ Failed',
  refunded: '↩️ Refunded',
};

const STATUS_LABEL: Record<string, string> = {
  completed: 'Completed',
  confirmed: 'Confirmed',
  pending: 'Pending',
  cancelled: 'Cancelled',
};

const REASON_LABEL: Record<string, string> = {
  customer: 'by customer',
  admin: 'by the spa',
  expired: 'unpaid hold expired',
  superseded: 'replaced by a newer booking',
};

// ---- policy settings (cancellation deadline + unpaid hold time) ----
const PolicySettings: React.FC = () => {
  const [hours, setHours] = useState('24');
  const [hold, setHold] = useState('30');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('key, value')
      .then(({ data }) => {
        for (const r of (data as { key: string; value: unknown }[]) || []) {
          if (r.key === 'cancellation_hours') setHours(String(r.value));
          if (r.key === 'hold_minutes') setHold(String(r.value));
        }
      });
  }, []);

  const save = async (key: string, value: string) => {
    setMsg('');
    setErr('');
    const { error } = await supabase.rpc('admin_set_setting', { p_key: key, p_value: Number(value) });
    if (error) setErr(error.message);
    else setMsg('Saved. New bookings use this; existing bookings keep the deadline their customer accepted.');
  };

  return (
    <div className="bg-[#f5f0e8] border border-[#a28321] rounded-lg p-4 mb-5">
      <div className="font-bold text-[#840000] mb-2">⚙️ Cancellation &amp; payment policy settings</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold text-[#5a0101]">Refund deadline: hours before the session (0 - 720)</label>
          <div className="flex gap-2">
            <input type="number" min={0} max={720} value={hours} onChange={(e) => setHours(e.target.value)} className="form-control" />
            <button type="button" onClick={() => save('cancellation_hours', hours)} className="btn btn-action px-4 text-sm">Save</button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-[#5a0101]">Hold an unpaid slot for (minutes, 5 - 1440)</label>
          <div className="flex gap-2">
            <input type="number" min={5} max={1440} value={hold} onChange={(e) => setHold(e.target.value)} className="form-control" />
            <button type="button" onClick={() => save('hold_minutes', hold)} className="btn btn-action px-4 text-sm">Save</button>
          </div>
        </div>
      </div>
      <p className="text-xs text-[#5a0101] mt-2 mb-0">
        Time zone for all deadlines: <b>{POLICY_TZ_LABEL}</b>. Customers see the exact deadline and must accept the policy before paying.
      </p>
      {msg && <p className="text-xs font-bold text-[#228b22] mt-1 mb-0">{msg}</p>}
      {err && <p className="text-xs font-bold text-red-700 mt-1 mb-0">{err}</p>}
    </div>
  );
};

export const AdminBookings: React.FC = () => {
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [payments, setPayments] = useState<Record<string, PaymentRow[]>>({});
  const [refunds, setRefunds] = useState<Record<string, RefundRow[]>>({});
  const [audit, setAudit] = useState<Record<string, AuditRow[]>>({});
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { therapists } = useTherapists();

  const load = async () => {
    setLoading(true);
    await supabase.rpc('expire_stale_holds');
    const [{ data, error: err }, { data: pay }, { data: ref }, { data: log }] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase
        .from('booking_payments')
        .select('id, booking_id, kind, method, amount, status, razorpay_order_id, razorpay_payment_id, refunded_amount, note, paid_at')
        .in('status', ['paid', 'refunded'])
        .order('paid_at', { ascending: true }),
      supabase.from('booking_refunds').select('*').order('created_at', { ascending: true }),
      supabase.from('booking_audit_log').select('id, booking_id, created_at, actor_role, action, details').order('created_at', { ascending: true }).limit(2000),
    ]);
    setLoading(false);
    if (err) setError(err.message);
    else setRows((data as AdminBooking[]) || []);
    const group = <T extends { booking_id: string | null }>(list: T[] | null) => {
      const map: Record<string, T[]> = {};
      for (const x of list || []) if (x.booking_id) (map[x.booking_id] ||= []).push(x);
      return map;
    };
    setPayments(group(pay as PaymentRow[]));
    setRefunds(group(ref as RefundRow[]));
    setAudit(group(log as AuditRow[]));
  };

  useEffect(() => {
    load();
  }, []);

  // cash / UPI taken by the therapist (for example the balance on the day of service)
  const recordOffline = async (r: AdminBooking) => {
    const due = Math.max((r.price ?? 0) - r.amount_paid, 0);
    const amount = window.prompt(`Amount received for ${r.booking_ref} (balance due ${rupees(due)}):`, String(due));
    if (!amount) return;
    const method = (window.prompt('How was it paid? Type: cash, upi or other', 'cash') || '').trim().toLowerCase();
    const { error: err } = await supabase.rpc('admin_record_offline_payment', {
      p_booking: r.id,
      p_amount: Math.round(Number(amount)),
      p_method: method,
      p_note: 'Recorded by admin',
    });
    if (err) setError(err.message);
    else {
      setError('');
      load();
    }
  };

  // the spa cancels (e.g. therapist unavailable): everything paid becomes refundable
  const cancelBySpa = async (r: AdminBooking) => {
    const reason = window.prompt(`Cancel ${r.booking_ref} for the customer? Reason (the customer gets a FULL refund of ${rupees(r.amount_paid)}):`, 'Therapist unavailable');
    if (reason === null) return;
    setBusyId(r.id);
    const { error: err } = await supabase.rpc('admin_cancel_booking', { p_id: r.id, p_reason: reason });
    setBusyId(null);
    if (err) setError(err.message);
    else {
      setError('');
      setInfo(`${r.booking_ref} cancelled. Use "Refund via Razorpay" to return the money.`);
      load();
    }
  };

  // sends the refund to Razorpay (admin only; logged in the audit trail)
  const refundNow = async (r: AdminBooking, amount: number) => {
    if (!window.confirm(`Refund ${rupees(amount)} for ${r.booking_ref} to the customer's original payment method through Razorpay?`)) return;
    setBusyId(r.id);
    setError('');
    setInfo('');
    const { data, error: err } = await supabase.functions.invoke('process-refund', { body: { booking_id: r.id, amount, reason: 'Cancellation refund (admin)' } });
    setBusyId(null);
    let msg = data?.error as string | undefined;
    if (err && !msg) {
      try {
        const body = await (err as { context?: Response }).context?.json?.();
        msg = body?.error;
      } catch {
        /* ignore */
      }
      msg = msg || err.message;
    }
    if (msg) {
      setError(msg);
      return;
    }
    setInfo(
      `Refund of ${rupees(data.requested)} requested.${data.manual_amount > 0 ? ` ${rupees(data.manual_amount)} was paid by cash/UPI and must be returned manually.` : ''} It completes when Razorpay confirms.`
    );
    load();
  };

  const assignTherapist = async (id: string, name: string) => {
    const { error: err } = await supabase.rpc('admin_assign_therapist', { p_id: id, p_name: name });
    if (err) setError(err.message);
    else setRows((prev) => prev.map((r) => (r.id === id ? { ...r, therapist: name } : r)));
  };

  const shown = rows.filter((r) =>
    filter === 'all'
      ? true
      : filter === 'advance'
        ? r.payment_status === 'partial'
        : filter === 'paid'
          ? r.payment_status === 'paid'
          : filter === 'refund'
            ? r.refund_due > 0
            : filter === 'cancelled'
              ? r.status === 'cancelled'
              : r.payment_status === 'pending' || r.payment_status === 'failed'
  );
  const collected = rows.reduce((s, r) => s + (r.amount_paid || 0), 0);
  const balanceDue = rows
    .filter((r) => r.status !== 'cancelled' && r.amount_paid > 0)
    .reduce((s, r) => s + Math.max((r.price || 0) - r.amount_paid, 0), 0);
  const refundsDue = rows.reduce((s, r) => s + (r.refund_due || 0), 0);

  const FILTER_LABEL: Record<Filter, string> = {
    all: 'All',
    advance: 'Partially paid',
    paid: 'Fully paid',
    unpaid: 'Unpaid',
    cancelled: 'Cancelled',
    refund: 'Refund due',
  };

  return (
    <div className="max-w-5xl mx-auto my-6 px-2">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h4 className="text-2xl font-bold text-[#840000] m-0">Admin - All Bookings</h4>
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <span className="text-[#228b22]">Collected: {rupees(collected)}</span>
          <span className="text-[#840000]">Balance due: {rupees(balanceDue)}</span>
          {refundsDue > 0 && <span className="text-red-700">Refunds due: {rupees(refundsDue)}</span>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm font-bold mb-4">
        {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded ${filter === f ? 'bg-[#5a0101] text-[#81d742]' : 'bg-white/60 text-[#840000]'}`}
          >
            {FILTER_LABEL[f]}
          </button>
        ))}
        <button type="button" onClick={load} className="px-3 py-1 rounded bg-white/60 text-[#840000]">Refresh</button>
        <button type="button" onClick={() => setShowSettings((v) => !v)} className="px-3 py-1 rounded bg-white/60 text-[#840000]">
          ⚙️ Policy settings
        </button>
      </div>

      {showSettings && <PolicySettings />}
      {loading && <p className="text-sm">Loading…</p>}
      {error && <p className="text-sm text-red-700 font-bold">{error}</p>}
      {info && <p className="text-sm text-[#228b22] font-bold">{info}</p>}
      {!loading && shown.length === 0 && <p className="text-sm text-gray-600">No bookings.</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {shown.map((r) => {
          const paid = r.payment_status === 'paid';
          const total = r.price ?? 0;
          const balance = Math.max(total - r.amount_paid, 0);
          const pays = payments[r.id] || [];
          const refs = refunds[r.id] || [];
          const events = audit[r.id] || [];
          const profile = therapists.find((t) => t.id === r.therapist_id) ?? therapists.find((t) => t.name === r.therapist);
          const deadlineOpen = r.cancel_deadline ? new Date(r.cancel_deadline).getTime() > Date.now() : null;
          const processing = refs.some((x) => x.status === 'processing');
          const refundable = Math.max(r.refund_due - refs.filter((x) => x.status === 'processing').reduce((s, x) => s + x.amount, 0), 0);
          const eligibility =
            r.status === 'cancelled'
              ? r.cancel_reason === 'admin'
                ? 'Eligible: full refund (cancelled by the spa)'
                : r.refund_due > 0 || refs.some((x) => x.status !== 'failed')
                  ? 'Eligible (cancelled before the deadline)'
                  : r.amount_paid > 0 || pays.length
                    ? 'Not eligible (cancelled after the deadline)'
                    : 'Nothing was paid'
              : r.amount_paid <= 0
                ? 'No advance paid yet'
                : deadlineOpen === null
                  ? 'Deadline not recorded'
                  : deadlineOpen
                    ? 'Eligible if cancelled before the deadline'
                    : 'Deadline passed: advance non-refundable';

          const fields: [string, React.ReactNode][] = [
            ['Booking ID', <b className="text-[#840000]">{r.booking_ref}</b>],
            ['Customer', r.client_name],
            ['Phone', r.client_phone],
            ['Service', `${r.duration ?? ''} ${r.service_style ?? ''}`.trim()],
            ['Date/Time', formatWhen(r.booking_date, r.booking_time)],
            ['Location', [r.address, r.area].filter(Boolean).join(', ') || (r.location_type ?? '-')],
            ['Total price', r.price != null ? rupees(r.price) : '-'],
            ['Advance selected', r.advance_amount ? rupees(r.advance_amount) : <span className="text-gray-500">not chosen yet</span>],
            [
              'Advance status',
              r.amount_paid > 0 ? (
                <b className="text-green-700">Paid {rupees(Math.min(r.amount_paid, r.advance_amount ?? r.amount_paid))}</b>
              ) : (
                <span className="text-yellow-700 font-bold">Not paid</span>
              ),
            ],
            ['Total paid', r.amount_paid > 0 ? <b className="text-green-700">{rupees(r.amount_paid)}</b> : '₹0'],
            ['Balance', r.price != null ? <b className={balance > 0 ? 'text-[#840000]' : 'text-green-700'}>{rupees(balance)}</b> : '-'],
            [
              'Payment Status',
              <span className={paid ? 'text-green-700 font-bold' : r.payment_status === 'partial' ? 'text-blue-700 font-bold' : 'text-yellow-700 font-bold'}>
                {PAYMENT_LABEL[r.payment_status] ?? r.payment_status}
              </span>,
            ],
            [
              'Booking Status',
              <span className={r.status === 'cancelled' ? 'text-red-700 font-bold' : r.status === 'confirmed' ? 'text-green-700 font-bold' : 'text-yellow-700 font-bold'}>
                {STATUS_LABEL[r.status] ?? r.status}
                {r.status === 'cancelled' && r.cancel_reason ? ` (${REASON_LABEL[r.cancel_reason] ?? r.cancel_reason})` : ''}
              </span>,
            ],
            [
              'Cancel deadline',
              r.cancel_deadline ? (
                <span className={deadlineOpen ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
                  {formatIst(r.cancel_deadline)} <span className="font-normal text-gray-600">({r.policy_hours ?? '?'}h before)</span>
                </span>
              ) : (
                <span className="text-gray-500">{r.status === 'pending' ? 'set when the customer accepts the policy' : 'not recorded'}</span>
              ),
            ],
            ['Refund eligibility', eligibility],
            [
              'Refund',
              refs.length === 0 && r.refund_due === 0 ? (
                <span className="text-gray-500">none</span>
              ) : (
                <span>
                  {r.refund_due > 0 && <b className="text-red-700">{rupees(r.refund_due)} due</b>}
                  {refs.map((x) => (
                    <div key={x.id} className={x.status === 'processed' ? 'text-green-700' : x.status === 'failed' ? 'text-red-700' : 'text-amber-700'}>
                      {rupees(x.amount)} {x.status}
                    </div>
                  ))}
                </span>
              ),
            ],
            [
              'Therapist',
              <div>
                {profile && (
                  <div className="flex items-center gap-2 mb-1">
                    <TherapistPhoto src={profile.photo} alt={profile.name} width={40} height={40} className="w-10 h-10 rounded-full object-cover border border-[#a28321] bg-white" />
                    <div className="text-xs leading-tight">
                      <b>{profile.name}</b>
                      <div className="text-gray-600">{[profile.gender, profile.age ? `${profile.age} yrs` : '', profile.experience].filter(Boolean).join(' • ')}</div>
                    </div>
                  </div>
                )}
                <select
                  value={therapists.some((t) => t.name === r.therapist) ? r.therapist! : ''}
                  onChange={(e) => e.target.value && assignTherapist(r.id, e.target.value)}
                  className="form-control !py-0.5 !w-auto"
                >
                  <option value="">{r.therapist || 'Assign therapist'}</option>
                  {therapists.map((t) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>,
            ],
          ];

          return (
            <div key={r.id} className="bg-[#f5f0e8] border border-[#a28321] rounded-lg p-4 shadow-sm">
              <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 text-sm m-0">
                {fields.map(([label, value]) => (
                  <React.Fragment key={label}>
                    <dt className="font-bold text-[#5a0101]">{label}</dt>
                    <dd className="m-0 break-words">{value}</dd>
                  </React.Fragment>
                ))}
              </dl>

              {r.refund_due > 0 && (
                <div className="mt-3 text-sm font-bold text-red-800 bg-red-50 border border-red-200 rounded px-3 py-1.5">
                  ↩️ Refund due: {rupees(r.refund_due)}
                  {processing && ' (a refund is already in progress)'}
                </div>
              )}

              {(pays.length > 0 || refs.length > 0) && (
                <div className="mt-3 pt-2 border-t border-[#a28321]/30 text-xs space-y-0.5">
                  <div className="font-bold text-[#5a0101]">Razorpay references</div>
                  {pays.map((p) => (
                    <div key={p.id} className="text-gray-700 break-all">
                      <b>{p.kind === 'advance' ? 'Advance' : p.kind === 'balance' ? 'Balance' : 'Payment'}</b> {rupees(p.amount)} • {p.method}
                      {p.status === 'refunded' ? ' (refunded)' : p.refunded_amount > 0 ? ` (${rupees(p.refunded_amount)} refunded)` : ''}
                      {p.razorpay_payment_id ? ` • pay ${p.razorpay_payment_id}` : ''}
                      {p.razorpay_order_id ? ` • order ${p.razorpay_order_id}` : ''}
                      {p.note ? ` • ${p.note}` : ''}
                    </div>
                  ))}
                  {refs.map((x) => (
                    <div key={x.id} className="text-gray-700 break-all">
                      <b>Refund</b> {rupees(x.amount)} • {x.status}
                      {x.razorpay_refund_id ? ` • ${x.razorpay_refund_id}` : ''}
                    </div>
                  ))}
                </div>
              )}

              {(r.special_instructions || r.client_email) && (
                <div className="mt-3 pt-2 border-t border-[#a28321]/30 text-xs text-gray-600 space-y-0.5">
                  {r.client_email && <div>Email: {r.client_email} {r.receipt_sent_at ? '(receipt emailed)' : ''}</div>}
                  {r.special_instructions && <div>Notes: {r.special_instructions}</div>}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === 'cancelled' && refundable > 0 && (
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => refundNow(r, refundable)}
                    className="px-3 py-1.5 text-xs font-bold rounded bg-red-700 text-white disabled:opacity-60"
                  >
                    ↩️ Refund {rupees(refundable)} via Razorpay
                  </button>
                )}
                {(r.status === 'pending' || r.status === 'confirmed') && r.amount_paid > 0 && (
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => cancelBySpa(r)}
                    className="px-3 py-1.5 text-xs font-bold rounded border border-red-700 text-red-700 bg-white disabled:opacity-60"
                  >
                    ✖ Cancel (spa cancels, full refund)
                  </button>
                )}
                {r.status !== 'cancelled' && r.price != null && balance > 0 && (
                  <button type="button" onClick={() => recordOffline(r)} className="px-3 py-1.5 text-xs font-bold rounded bg-[#5a0101] text-[#81d742]">
                    💵 Record cash / UPI received
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpenHistory(openHistory === r.id ? null : r.id)}
                  className="px-3 py-1.5 text-xs font-bold rounded bg-white border border-[#a28321] text-[#840000]"
                >
                  📜 History ({events.length})
                </button>
              </div>

              {openHistory === r.id && (
                <div className="mt-2 bg-white/70 border border-[#a28321]/50 rounded p-2 max-h-48 overflow-y-auto text-xs space-y-1">
                  {events.length === 0 && <div className="text-gray-500">No events recorded yet.</div>}
                  {events.map((e) => (
                    <div key={e.id}>
                      <b className="text-[#840000]">{e.action.replace(/_/g, ' ')}</b>{' '}
                      <span className="text-gray-500">
                        {new Date(e.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} • {e.actor_role}
                      </span>
                      {e.details && <div className="text-gray-700">{e.details}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
