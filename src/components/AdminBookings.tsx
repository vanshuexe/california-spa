import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTherapists } from '../lib/useTherapists';

interface AdminBooking {
  id: string;
  booking_ref: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  therapist: string | null;
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
}

type Filter = 'all' | 'paid' | 'unpaid';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

// "2026-09-30" + "07:00 PM" -> "30 Sept, 7 PM"
function formatWhen(date: string, time: string) {
  const [, m, d] = date.split('-').map(Number);
  const t = time.replace(/^0/, '').replace(':00', '');
  return `${d} ${MONTHS[m - 1]}, ${t}`;
}

const PAYMENT_LABEL: Record<string, string> = {
  paid: '✅ Paid',
  pending: '⏳ Unpaid',
  failed: '❌ Failed',
  refunded: '↩️ Refunded',
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  cancelled: 'Cancelled',
};

export const AdminBookings: React.FC = () => {
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const { therapists } = useTherapists();

  const load = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (err) setError(err.message);
    else setRows((data as AdminBooking[]) || []);
  };

  useEffect(() => {
    load();
  }, []);

  const assignTherapist = async (id: string, name: string) => {
    const { error: err } = await supabase.rpc('admin_assign_therapist', { p_id: id, p_name: name });
    if (err) setError(err.message);
    else setRows((prev) => prev.map((r) => (r.id === id ? { ...r, therapist: name } : r)));
  };

  const shown = rows.filter((r) =>
    filter === 'all' ? true : filter === 'paid' ? r.payment_status === 'paid' : r.payment_status !== 'paid'
  );
  const revenue = rows.filter((r) => r.payment_status === 'paid').reduce((s, r) => s + (r.price || 0), 0);

  return (
    <div className="max-w-5xl mx-auto my-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h4 className="text-2xl font-bold text-[#840000] m-0">Admin - All Bookings</h4>
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <span className="text-[#228b22]">Paid revenue: ₹{revenue.toLocaleString()}</span>
          {(['all', 'paid', 'unpaid'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded ${filter === f ? 'bg-[#5a0101] text-[#81d742]' : 'bg-white/60 text-[#840000]'}`}
            >
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
          <button type="button" onClick={load} className="px-3 py-1 rounded bg-white/60 text-[#840000]">
            Refresh
          </button>
        </div>
      </div>
      {loading && <p className="text-sm">Loading…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {!loading && shown.length === 0 && <p className="text-sm text-gray-600">No bookings.</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {shown.map((r) => {
          const paid = r.payment_status === 'paid';
          const fields: [string, React.ReactNode][] = [
            ['Booking ID', <b className="text-[#840000]">{r.booking_ref}</b>],
            ['Customer', r.client_name],
            ['Phone', r.client_phone],
            ['Service', `${r.duration ?? ''} ${r.service_style ?? ''}`.trim()],
            ['Date/Time', formatWhen(r.booking_date, r.booking_time)],
            [
              'Location',
              [r.address, r.area].filter(Boolean).join(', ') || (r.location_type ?? '-'),
            ],
            ['Amount', r.price != null ? `₹${r.price.toLocaleString()}` : '-'],
            ['Payment', 'Online'],
            [
              'Payment Status',
              <span className={paid ? 'text-green-700 font-bold' : 'text-yellow-700 font-bold'}>
                {PAYMENT_LABEL[r.payment_status] ?? r.payment_status}
              </span>,
            ],
            [
              'Booking Status',
              <span className={r.status === 'cancelled' ? 'text-red-700 font-bold' : r.status === 'confirmed' ? 'text-green-700 font-bold' : 'text-yellow-700 font-bold'}>
                {STATUS_LABEL[r.status] ?? r.status}
              </span>,
            ],
            [
              'Therapist',
              <select
                value={therapists.some((t) => t.name === r.therapist) ? r.therapist! : ''}
                onChange={(e) => e.target.value && assignTherapist(r.id, e.target.value)}
                className="form-control !py-0.5 !w-auto"
              >
                <option value="">{r.therapist || 'Assign therapist'}</option>
                {therapists.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>,
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
              {(r.special_instructions || r.client_email || r.razorpay_payment_id) && (
                <div className="mt-3 pt-2 border-t border-[#a28321]/30 text-xs text-gray-600 space-y-0.5">
                  {r.client_email && <div>Email: {r.client_email}</div>}
                  {r.special_instructions && <div>Notes: {r.special_instructions}</div>}
                  {r.razorpay_payment_id && <div>Razorpay payment: {r.razorpay_payment_id}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
