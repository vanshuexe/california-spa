import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { POLICY_TZ_LABEL, formatIst, getPolicySettings, policyPoints, rupees } from './policy.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Service-role client: bypasses RLS. Only ever used inside edge functions.
export const adminClient = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Prices are decided here, never taken from the browser.
export const DURATION_PRICES: Record<string, number> = {
  '30 Minutes': 999,
  '45 Minutes': 1299,
  '60 Minutes': 1799,
  '90 Minutes': 2100,
  '120 Minutes': 3400,
  '180 Minutes': 4099,
};

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return false; // email is optional until a Resend key is configured
  const from = Deno.env.get('MAIL_FROM') || 'Doorstep Royale Spa <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    console.error('Resend failed', res.status, await res.text());
    return false;
  }
  return true;
}

// After payment: link the booking to a therapist so the chat can open.
// 1) the therapist the customer picked, 2) otherwise the least busy therapist who has a login.
// Mutates `booking` so the confirmation emails show the final therapist.
// deno-lint-ignore no-explicit-any
async function assignTherapist(db: SupabaseClient, booking: any) {
  if (booking.therapist_id) return;
  const { data: therapists } = await db.from('therapists').select('id, name');
  if (!therapists?.length) return;

  const picked = therapists.find(
    (t: { name: string }) => t.name.toLowerCase() === String(booking.therapist || '').toLowerCase()
  );
  let chosen = picked;

  if (!chosen) {
    const { data: accounts } = await db.from('therapist_accounts').select('therapist_id');
    const loginIds = new Set((accounts || []).map((a: { therapist_id: string }) => a.therapist_id));
    const pool = therapists.filter((t: { id: string }) => loginIds.has(t.id));
    const candidates = pool.length ? pool : therapists;

    const today = new Date().toISOString().split('T')[0];
    const { data: busy } = await db
      .from('bookings')
      .select('therapist_id')
      .eq('status', 'confirmed')
      .gte('booking_date', today)
      .not('therapist_id', 'is', null);
    const load: Record<string, number> = {};
    for (const b of busy || []) load[b.therapist_id] = (load[b.therapist_id] || 0) + 1;
    chosen = [...candidates].sort(
      (a: { id: string }, b: { id: string }) => (load[a.id] || 0) - (load[b.id] || 0)
    )[0];
  }

  if (!chosen) return;
  await db.from('bookings').update({ therapist_id: chosen.id, therapist: chosen.name }).eq('id', booking.id);
  booking.therapist_id = chosen.id;
  booking.therapist = chosen.name;
}

// ---- receipts and notifications ----
export const esc = (t: unknown) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const row = (k: string, v: string, bold = false) =>
  `<tr><td style="padding:6px 12px;color:#5a0101">${k}</td><td style="padding:6px 12px;text-align:right${bold ? ';font-weight:bold' : ''}">${v}</td></tr>`;

// deno-lint-ignore no-explicit-any
const bookingBlock = (booking: any) => `
    <p>Booking ID: <b>${esc(booking.booking_ref)}</b></p>
    <p>${esc(booking.duration)} ${esc(booking.service_style)} with ${esc(booking.therapist || 'your therapist')}<br/>
    ${esc(booking.booking_date)} at ${esc(booking.booking_time)}, ${esc(booking.area)}</p>`;

const wrap = (inner: string) =>
  `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222">${inner}
    <p style="font-size:12px;color:#666">Doorstep Royale Spa, Bangalore.</p></div>`;

// deno-lint-ignore no-explicit-any
function receiptHtml(booking: any, payment: any, heading: string, hours: number) {
  const total = Number(booking.price || 0);
  const paid = Number(booking.amount_paid || 0);
  const balance = Math.max(total - paid, 0);
  const kindLabel = payment.kind === 'advance' ? 'Advance payment' : payment.kind === 'balance' ? 'Balance payment' : 'Payment';
  return wrap(`
    <h2 style="color:#840000">${esc(heading)}</h2>
    ${bookingBlock(booking)}
    <table style="border-collapse:collapse;width:100%;background:#f5f0e8;border:1px solid #a28321">
      ${row('Total service price', rupees(total))}
      ${row(kindLabel + ' (this payment)', rupees(payment.amount), true)}
      ${row('Total paid so far', rupees(paid))}
      ${row('Remaining balance', rupees(balance), true)}
      ${payment.razorpay_payment_id ? row('Payment ID', esc(payment.razorpay_payment_id)) : ''}
      ${payment.kind === 'advance' && booking.cancel_deadline ? row('Free cancellation until', esc(formatIst(booking.cancel_deadline)), true) : ''}
    </table>
    ${balance > 0 ? '<p>You can pay the remaining balance online from <b>My Account</b> on our website, or to your therapist on the day of service.</p>' : '<p>Your booking is fully paid. Thank you!</p>'}
    <h3 style="color:#840000">Payment &amp; cancellation policy</h3>
    <ul>${policyPoints(hours).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`);
}

export async function sendCancellationEmail(
  // deno-lint-ignore no-explicit-any
  booking: any,
  result: { refund_eligible?: boolean; refund_due: number; amount_paid: number; deadline?: string },
  byCustomer: boolean
) {
  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  const paid = Number(result.amount_paid || 0);
  const outcome =
    paid <= 0
      ? 'No payment had been made for this booking.'
      : result.refund_due > 0
        ? `A refund of <b>${rupees(result.refund_due)}</b> will be processed to your original payment method, usually within 5-7 working days. We will email you when it is processed.`
        : `The advance of ${rupees(paid)} is non-refundable because the booking was cancelled after the deadline${result.deadline ? ` (${esc(formatIst(result.deadline))})` : ''}, to the extent permitted by applicable law.`;
  const heading = `Booking cancelled - ${booking.booking_ref}`;
  const html = wrap(`<h2 style="color:#840000">${esc(heading)}</h2>${bookingBlock(booking)}
    <p>${byCustomer ? 'Your booking has been cancelled.' : 'We are sorry: we had to cancel this booking.'}</p><p>${outcome}</p>`);
  if (booking.client_email) await sendEmail(booking.client_email, heading, html);
  if (adminEmail) await sendEmail(adminEmail, `${heading} (refund due ${rupees(result.refund_due)})`, html);
}

export async function sendRefundEmail(
  // deno-lint-ignore no-explicit-any
  booking: any,
  amount: number,
  status: 'initiated' | 'processed' | 'failed',
  refundId?: string
) {
  if (!booking?.client_email) return;
  const text =
    status === 'processed'
      ? `Your refund of <b>${rupees(amount)}</b> has been processed to your original payment method. Banks usually take 5-7 working days to show it.`
      : status === 'initiated'
        ? `We have started your refund of <b>${rupees(amount)}</b>. We will email you again when it is processed.`
        : `Your refund of <b>${rupees(amount)}</b> could not be completed automatically. Our team will contact you shortly.`;
  const heading = `Refund ${status} - ${booking.booking_ref}`;
  await sendEmail(
    booking.client_email,
    heading,
    wrap(`<h2 style="color:#840000">${esc(heading)}</h2>${bookingBlock(booking)}<p>${text}</p>${refundId ? `<p>Refund reference: ${esc(refundId)}</p>` : ''}`)
  );
}

// Razorpay REST helper (keys come from the function's secrets, never from the browser).
export async function razorpay(path: string, body?: unknown) {
  const keyId = Deno.env.get('RAZORPAY_KEY_ID')!;
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Basic ' + btoa(`${keyId}:${keySecret}`), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

// Called after a payment is VERIFIED (signature check or Razorpay webhook), never from the browser.
// Records it atomically in the database (idempotent: a duplicate call returns null), confirms the
// booking, assigns a therapist and sends the receipt.
export async function finalizePayment(
  db: SupabaseClient,
  orderId: string,
  paymentId: string
  // deno-lint-ignore no-explicit-any
): Promise<any | null> {
  const { data, error } = await db.rpc('record_payment', { p_order: orderId, p_payment: paymentId });
  if (error) throw error;
  if (!data) return null;
  const { payment, booking } = data;

  if (booking.status === 'confirmed' && !booking.therapist_id) await assignTherapist(db, booking);

  const { cancellationHours } = await getPolicySettings(db);
  const hours = booking.policy_hours ?? cancellationHours;
  const heading =
    payment.kind === 'balance'
      ? `Balance payment received - ${booking.booking_ref}`
      : `Booking confirmed - ${booking.booking_ref}`;
  const html = receiptHtml(booking, payment, heading, hours);
  let sent = false;
  if (booking.client_email) sent = await sendEmail(booking.client_email, heading, html);
  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (adminEmail) {
    await sendEmail(
      adminEmail,
      `${payment.kind === 'balance' ? 'Balance received' : 'New confirmed booking'} - ${booking.booking_ref}`,
      `<p>${esc(booking.client_name)} / ${esc(booking.client_phone)}</p>${html}`
    );
  }
  if (sent) await db.from('bookings').update({ receipt_sent_at: new Date().toISOString() }).eq('id', booking.id);
  return { payment, booking, receipt_emailed: sent };
}

export { POLICY_TZ_LABEL };
