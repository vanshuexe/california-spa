import { supabase } from './supabase';
import { PAYMENT_LABEL, formatIst, policyPoints, rupees } from '../data/paymentPolicy';

interface ReceiptBooking {
  id: string;
  booking_ref: string;
  client_name: string;
  duration: string | null;
  service_style: string | null;
  therapist: string | null;
  booking_date: string;
  booking_time: string;
  area: string | null;
  price: number | null;
  amount_paid: number;
  payment_status: string;
  status: string;
  cancel_deadline?: string | null;
  policy_hours?: number | null;
}

interface PaymentRow {
  kind: string;
  method: string;
  amount: number;
  status: string;
  razorpay_payment_id: string | null;
  paid_at: string | null;
}

interface RefundRow {
  amount: number;
  status: string;
  razorpay_refund_id: string | null;
  processed_at: string | null;
  created_at: string;
}

const esc = (t: unknown) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Opens a printable receipt (use the browser's Print / Save as PDF). Works for any signed-in
// customer for their own bookings; the payment rows are protected by row level security.
export async function openReceipt(b: ReceiptBooking) {
  const { data } = await supabase
    .from('booking_payments')
    .select('kind, method, amount, status, razorpay_payment_id, paid_at')
    .eq('booking_id', b.id)
    .in('status', ['paid', 'refunded'])
    .order('paid_at', { ascending: true });
  const rows = (data as PaymentRow[]) || [];

  const { data: refundData } = await supabase
    .from('booking_refunds')
    .select('amount, status, razorpay_refund_id, processed_at, created_at')
    .eq('booking_id', b.id)
    .order('created_at', { ascending: true });
  const refunds = (refundData as RefundRow[]) || [];

  const total = b.price ?? 0;
  const balance = Math.max(total - b.amount_paid, 0);

  const paymentRows = rows
    .map((r) => {
      const kind = r.kind === 'advance' ? 'Advance' : r.kind === 'balance' ? 'Balance' : 'Payment';
      const ref = r.razorpay_payment_id ? `<br><small>${esc(r.razorpay_payment_id)}</small>` : '';
      const when = r.paid_at ? new Date(r.paid_at).toLocaleString() : '';
      return `<tr><td>${when}</td><td>${kind}${ref}</td><td>${esc(r.method)}</td><td class="r">${rupees(r.amount)}</td></tr>`;
    })
    .join('');

  const refundRows = refunds
    .map((r) => {
      const when = new Date(r.processed_at || r.created_at).toLocaleString();
      return `<tr><td>${when}</td><td>${esc(r.razorpay_refund_id || '-')}</td><td>${esc(r.status)}</td><td class="r">${rupees(r.amount)}</td></tr>`;
    })
    .join('');

  const refundSection = refunds.length
    ? `<h2>Refunds</h2><table><tr><th>Date</th><th>Reference</th><th>Status</th><th class="r">Amount</th></tr>${refundRows}</table>`
    : '';
  const deadlineRow = b.cancel_deadline
    ? `<tr><td>Cancellation deadline</td><td class="r">${esc(formatIst(b.cancel_deadline))}</td></tr>`
    : '';
  const policyItems = policyPoints(b.policy_hours ?? 24).map((p) => `<li>${esc(p)}</li>`).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(b.booking_ref)}</title>
  <style>body{font-family:Arial,sans-serif;max-width:640px;margin:24px auto;color:#222;padding:0 16px}
  h1{color:#840000;margin:0}h2{color:#840000;font-size:16px;margin-top:22px}table{width:100%;border-collapse:collapse}
  td,th{padding:6px 8px;border-bottom:1px solid #ddd;text-align:left;font-size:14px}.r{text-align:right}
  .box{background:#f5f0e8;border:1px solid #a28321;padding:10px 14px;border-radius:6px}li{font-size:12px;margin:3px 0}
  button{margin-top:18px;padding:8px 18px;background:#840000;color:#fff;border:0;border-radius:4px;font-weight:bold;cursor:pointer}
  @media print{button{display:none}}</style></head><body>
  <h1>Doorstep Royale Spa</h1><div>Payment receipt</div>
  <h2>Booking ${esc(b.booking_ref)}</h2>
  <div>${esc(b.client_name)}<br>${esc(b.duration)} ${esc(b.service_style)} with ${esc(b.therapist || 'your therapist')}<br>
  ${esc(b.booking_date)} at ${esc(b.booking_time)}, ${esc(b.area)}</div>
  <h2>Payments</h2>
  <table><tr><th>Date</th><th>Payment</th><th>Method</th><th class="r">Amount</th></tr>
  ${paymentRows || '<tr><td colspan="4">No payments yet</td></tr>'}
  </table>
  ${refundSection}
  <h2>Summary</h2>
  <div class="box"><table>
  <tr><td>Total service price</td><td class="r">${rupees(total)}</td></tr>
  <tr><td>Total paid</td><td class="r">${rupees(b.amount_paid)}</td></tr>
  <tr><td><b>Remaining balance</b></td><td class="r"><b>${rupees(balance)}</b></td></tr>
  ${deadlineRow}
  <tr><td>Payment status</td><td class="r">${esc(PAYMENT_LABEL[b.payment_status] ?? b.payment_status)}</td></tr></table></div>
  <h2>Payment &amp; cancellation policy</h2><ul>${policyItems}</ul>
  <button onclick="window.print()">Print / Save as PDF</button></body></html>`;

  const w = window.open('', '_blank');
  if (!w) {
    window.alert('Please allow pop-ups to view the receipt.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
