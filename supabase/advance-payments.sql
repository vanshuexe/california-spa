
-- ===== Advance payments (Rs 500 / Rs 1,000) + balance payment =====
-- payment_status: pending | partial (advance paid, balance due) | paid (fully paid) | failed | refunded
-- A booking becomes CONFIRMED only when the server has verified a payment with Razorpay.

alter table public.bookings
  add column if not exists advance_amount integer,                         -- advance the customer chose (set by the server)
  add column if not exists amount_paid integer not null default 0,         -- total verified payments, in rupees
  add column if not exists refund_due integer not null default 0,          -- money the spa still has to refund
  add column if not exists cancelled_at timestamptz,
  add column if not exists receipt_sent_at timestamptz;

-- One row per payment attempt (advance, balance, legacy full payment, or cash/UPI recorded by an admin).
create table if not exists public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind text not null check (kind in ('advance', 'balance', 'full')),
  method text not null default 'online' check (method in ('online', 'cash', 'upi', 'other')),
  amount integer not null check (amount > 0),
  razorpay_order_id text unique,
  razorpay_payment_id text,
  status text not null default 'created' check (status in ('created', 'paid', 'failed', 'refunded')),
  note text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists booking_payments_booking_idx on public.booking_payments (booking_id);
create index if not exists booking_payments_payment_idx on public.booking_payments (razorpay_payment_id);
alter table public.booking_payments enable row level security;

drop policy if exists "booking_payments: own read" on public.booking_payments;
create policy "booking_payments: own read" on public.booking_payments
  for select using (exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));
drop policy if exists "booking_payments: admin read" on public.booking_payments;
create policy "booking_payments: admin read" on public.booking_payments
  for select using (public.is_admin());
grant select on public.booking_payments to authenticated;
-- no insert/update/delete policies: only the server functions below can write

-- ----- protect the money fields from the browser -----
create or replace function public.bookings_guard() returns trigger
language plpgsql as $$
begin
  if coalesce(auth.role(), 'service_role') not in ('anon', 'authenticated')
     or current_setting('app.trusted', true) = '1' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.payment_status := 'pending';
    new.price := null;
    new.razorpay_order_id := null;
    new.razorpay_payment_id := null;
    new.paid_at := null;
    new.therapist_id := null;
    new.chat_blocked := false;
    new.chat_blocked_by := null;
    new.advance_amount := null;
    new.amount_paid := 0;
    new.refund_due := 0;
    new.cancelled_at := null;
    new.receipt_sent_at := null;
  else
    new.id := old.id;
    new.user_id := old.user_id;
    new.booking_ref := old.booking_ref;
    new.client_name := old.client_name;
    new.client_phone := old.client_phone;
    new.client_email := old.client_email;
    new.therapist := old.therapist;
    new.therapist_id := old.therapist_id;
    new.service_style := old.service_style;
    new.duration := old.duration;
    new.location_type := old.location_type;
    new.area := old.area;
    new.address := old.address;
    new.special_instructions := old.special_instructions;
    new.price := old.price;
    new.status := old.status;
    new.payment_status := old.payment_status;
    new.razorpay_order_id := old.razorpay_order_id;
    new.razorpay_payment_id := old.razorpay_payment_id;
    new.paid_at := old.paid_at;
    new.chat_blocked := old.chat_blocked;
    new.chat_blocked_by := old.chat_blocked_by;
    new.advance_amount := old.advance_amount;
    new.amount_paid := old.amount_paid;
    new.refund_due := old.refund_due;
    new.cancelled_at := old.cancelled_at;
    new.receipt_sent_at := old.receipt_sent_at;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

-- Customers change bookings only through the functions below (so the policy can be enforced).
drop policy if exists "bookings: update own" on public.bookings;

-- ----- chat is available once a payment is secured (advance or full) -----
create or replace function public.chat_can_view(p_booking uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select b.payment_status in ('paid', 'partial') and b.status in ('confirmed', 'completed') and b.therapist_id is not null
    from public.bookings b where b.id = p_booking
  ), false)
$$;

create or replace function public.chat_is_open(p_booking uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select b.payment_status in ('paid', 'partial') and b.status = 'confirmed'
       and b.therapist_id is not null and not b.chat_blocked
       and now() < ((b.booking_date + 2)::timestamp at time zone 'UTC')
    from public.bookings b where b.id = p_booking
  ), false)
$$;

-- ----- time helpers -----
create or replace function public.booking_start(p_date date, p_time text) returns timestamptz
language sql immutable as $$
  select ((p_date::text || ' ' || coalesce(p_time, '12:00 AM'))::timestamp) at time zone 'Asia/Kolkata'
$$;

-- ----- server-only: record a verified Razorpay payment (atomic + idempotent) -----
-- Called by the edge functions after the payment signature / webhook has been verified.
create or replace function public.record_payment(p_order text, p_payment text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  pay public.booking_payments%rowtype;
  b public.bookings%rowtype;
  v_new integer;
begin
  update public.booking_payments
     set status = 'paid', razorpay_payment_id = p_payment, paid_at = now()
   where razorpay_order_id = p_order and status in ('created', 'failed')
   returning * into pay;
  if not found then return null; end if;        -- unknown order, or already recorded

  select * into b from public.bookings where id = pay.booking_id for update;
  v_new := b.amount_paid + pay.amount;
  perform set_config('app.trusted', '1', true);

  if b.status = 'cancelled' then
    -- paid after cancelling: keep it cancelled and flag the money for refund
    update public.bookings
       set amount_paid = v_new, refund_due = refund_due + pay.amount, razorpay_payment_id = p_payment
     where id = b.id;
  else
    update public.bookings
       set amount_paid = v_new,
           payment_status = case when b.price is not null and v_new >= b.price then 'paid' else 'partial' end,
           status = case when b.status = 'pending' then 'confirmed' else b.status end,
           razorpay_payment_id = p_payment,
           paid_at = coalesce(b.paid_at, now())
     where id = b.id;
  end if;

  return jsonb_build_object(
    'payment', to_jsonb(pay),
    'booking', (select to_jsonb(x) from public.bookings x where x.id = b.id)
  );
end;
$$;

create or replace function public.record_payment_failed(p_order text) returns void
language plpgsql security definer set search_path = public as $$
declare v_booking uuid;
begin
  update public.booking_payments set status = 'failed'
   where razorpay_order_id = p_order and status = 'created' returning booking_id into v_booking;
  if v_booking is not null then
    perform set_config('app.trusted', '1', true);
    update public.bookings set payment_status = 'failed'
     where id = v_booking and amount_paid = 0 and status = 'pending';
  end if;
end;
$$;

create or replace function public.record_refund(p_payment text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  pay public.booking_payments%rowtype;
  b public.bookings%rowtype;
  v_new integer;
begin
  perform set_config('app.trusted', '1', true);
  update public.booking_payments set status = 'refunded'
   where razorpay_payment_id = p_payment and status = 'paid' returning * into pay;

  if found then
    select * into b from public.bookings where id = pay.booking_id for update;
    v_new := greatest(b.amount_paid - pay.amount, 0);
    update public.bookings
       set amount_paid = v_new,
           refund_due = greatest(refund_due - pay.amount, 0),
           payment_status = case when v_new = 0 then 'refunded'
                                 when b.price is not null and v_new >= b.price then 'paid'
                                 else 'partial' end,
           status = case when v_new = 0 and b.status <> 'completed' then 'cancelled' else b.status end,
           cancelled_at = case when v_new = 0 and b.status <> 'completed' then coalesce(b.cancelled_at, now()) else b.cancelled_at end
     where id = b.id;
    return jsonb_build_object('booking_id', b.id);
  end if;

  -- older bookings paid in full before payment rows existed
  update public.bookings
     set payment_status = 'refunded', status = 'cancelled', amount_paid = 0, refund_due = 0
   where razorpay_payment_id = p_payment and status <> 'completed' returning * into b;
  if found then return jsonb_build_object('booking_id', b.id); end if;
  return null;
end;
$$;

revoke all on function public.record_payment(text, text) from public, anon, authenticated;
revoke all on function public.record_payment_failed(text) from public, anon, authenticated;
revoke all on function public.record_refund(text) from public, anon, authenticated;
grant execute on function public.record_payment(text, text) to service_role;
grant execute on function public.record_payment_failed(text) to service_role;
grant execute on function public.record_refund(text) to service_role;

-- ----- customer: cancel (policy: advance refundable if cancelled 24h+ before the session) -----
drop function if exists public.cancel_my_booking(uuid);
create or replace function public.cancel_my_booking(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings%rowtype;
  v_eligible boolean;
  v_due integer;
begin
  select * into b from public.bookings where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.status not in ('pending', 'confirmed') then raise exception 'This booking can no longer be cancelled'; end if;

  v_eligible := now() <= public.booking_start(b.booking_date, b.booking_time) - interval '24 hours';
  v_due := case
    when b.amount_paid <= 0 then 0
    when v_eligible then b.amount_paid
    when b.advance_amount is null then 0
    else greatest(b.amount_paid - b.advance_amount, 0)      -- late cancellation: advance is kept
  end;

  perform set_config('app.trusted', '1', true);
  update public.bookings set status = 'cancelled', cancelled_at = now(), refund_due = v_due where id = p_id;
  return jsonb_build_object('refund_due', v_due, 'refund_eligible', v_eligible, 'amount_paid', b.amount_paid);
end;
$$;
grant execute on function public.cancel_my_booking(uuid) to authenticated;

-- ----- customer: reschedule (24h notice once an advance is paid) -----
create or replace function public.reschedule_my_booking(p_id uuid, p_date date, p_time text) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings%rowtype;
begin
  select * into b from public.bookings where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.status not in ('pending', 'confirmed') then raise exception 'This booking can no longer be rescheduled'; end if;
  if b.amount_paid > 0 and now() > public.booking_start(b.booking_date, b.booking_time) - interval '24 hours' then
    raise exception 'Rescheduling needs at least 24 hours notice. Please call us.';
  end if;
  if public.booking_start(p_date, p_time) <= now() then raise exception 'Please choose a future date and time.'; end if;
  perform set_config('app.trusted', '1', true);
  update public.bookings set booking_date = p_date, booking_time = p_time where id = p_id;
end;
$$;
grant execute on function public.reschedule_my_booking(uuid, date, text) to authenticated;

-- ----- admin: record a cash / UPI payment taken by the therapist (e.g. the balance) -----
create or replace function public.admin_record_offline_payment(p_booking uuid, p_amount integer, p_method text, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings%rowtype;
  v_new integer;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_method not in ('cash', 'upi', 'other') then raise exception 'Method must be cash, upi or other'; end if;
  select * into b from public.bookings where id = p_booking for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.status = 'cancelled' then raise exception 'Booking is cancelled'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter an amount'; end if;
  if b.price is not null and b.amount_paid + p_amount > b.price then raise exception 'That is more than the balance due'; end if;

  perform set_config('app.trusted', '1', true);
  insert into public.booking_payments (booking_id, kind, method, amount, status, note, paid_at)
    values (b.id, case when b.amount_paid > 0 then 'balance' else 'full' end, p_method, p_amount, 'paid', left(p_note, 300), now());
  v_new := b.amount_paid + p_amount;
  update public.bookings
     set amount_paid = v_new,
         payment_status = case when b.price is not null and v_new >= b.price then 'paid' else 'partial' end,
         status = case when b.status = 'pending' then 'confirmed' else b.status end,
         paid_at = coalesce(b.paid_at, now())
   where id = b.id;
end;
$$;
grant execute on function public.admin_record_offline_payment(uuid, integer, text, text) to authenticated;

-- ----- therapist list: add what is still to be collected (no customer contact details) -----
drop function if exists public.therapist_bookings();
create or replace function public.therapist_bookings() returns table (
  id uuid, booking_ref text, client_name text, therapist text, therapist_id text,
  status text, payment_status text, booking_date date, booking_time text,
  duration text, service_style text, area text, address text,
  special_instructions text, location_type text, chat_blocked boolean,
  price integer, amount_paid integer
)
language sql stable security definer set search_path = public as $$
  select b.id, b.booking_ref, b.client_name, b.therapist, b.therapist_id,
         b.status, b.payment_status, b.booking_date, b.booking_time,
         b.duration, b.service_style, b.area,
         case when public.contains_contact_info(b.address) then '[hidden - contains contact details]' else b.address end,
         case when public.contains_contact_info(b.special_instructions) then '[hidden - contains contact details]' else b.special_instructions end,
         b.location_type, b.chat_blocked, b.price, b.amount_paid
  from public.bookings b
  where b.therapist_id is not null and b.therapist_id = public.my_therapist_id()
  order by b.booking_date, b.created_at
$$;
grant execute on function public.therapist_bookings() to authenticated;

-- ----- bring existing fully-paid bookings into the new model -----
update public.bookings set amount_paid = coalesce(price, 0) where payment_status = 'paid' and amount_paid = 0;
insert into public.booking_payments (booking_id, kind, amount, razorpay_order_id, razorpay_payment_id, status, paid_at)
select b.id, 'full', b.price, b.razorpay_order_id, b.razorpay_payment_id, 'paid', coalesce(b.paid_at, b.created_at)
from public.bookings b
where b.payment_status = 'paid' and b.price is not null and b.price > 0
  and not exists (select 1 from public.booking_payments p where p.booking_id = b.id)
on conflict do nothing;
