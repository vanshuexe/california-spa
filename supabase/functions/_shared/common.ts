import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return; // email is optional until a Resend key is configured
  const from = Deno.env.get('MAIL_FROM') || 'Doorstep Royale Spa <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) console.error('Resend failed', res.status, await res.text());
}

// Marks a booking PAID + CONFIRMED. Idempotent: returns false if it was already paid
// (verify endpoint and webhook can both call this safely).
export async function markPaid(
  db: SupabaseClient,
  bookingId: string,
  orderId: string,
  paymentId: string
): Promise<boolean> {
  const { data, error } = await db
    .from('bookings')
    .update({
      payment_status: 'paid',
      status: 'confirmed',
      razorpay_payment_id: paymentId,
      paid_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('razorpay_order_id', orderId)
    .neq('payment_status', 'paid')
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;

  const summary = `
    <p><b>Booking ID:</b> ${data.booking_ref}</p>
    <p>${data.duration} ${data.service_style} with ${data.therapist}<br/>
    ${data.booking_date} at ${data.booking_time}, ${data.area}<br/>
    <b>Paid:</b> ₹${data.price}</p>`;
  if (data.client_email) {
    await sendEmail(
      data.client_email,
      `Booking confirmed - ${data.booking_ref}`,
      `<h2>Thank you ${data.client_name}, your booking is confirmed</h2>${summary}`
    );
  }
  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (adminEmail) {
    await sendEmail(
      adminEmail,
      `New paid booking - ${data.booking_ref}`,
      `<h2>New paid booking</h2><p>${data.client_name} / ${data.client_phone}</p>${summary}`
    );
  }
  return true;
}
