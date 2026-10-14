
-- ===== Advance payments, part 2: configurable policy, holds, refunds via Razorpay, audit trail =====

-- ----- admin-configurable settings (cancellation deadline, hold time) -----
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.app_settings enable row level security;
drop policy if exists "app_settings: public read" on public.app_settings;
create policy "app_settings: public read" on public.app_settings for select using (true);
grant select on public.app_settings to anon, authenticated;

insert into public.app_settings (key, value) values
  ('cancellation_hours', '24'::jsonb),      -- advance is refundable if cancelled at least this many hours before the session
  ('hold_minutes', '30'::jsonb),            -- an unpaid booking holds its slot for this long
  ('policy_timezone', '"Asia/Kolkata"'::jsonb)
on conflict (key) do nothing;

create or replace function public.setting_int(p_key text, p_default integer) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::integer from public.app_settings where key = p_key), p_default)
$$;
grant execute on function public.setting_int(text, integer) to anon, authenticated, service_role;

-- ----- audit trail for bookings, payments, refunds and settings -----
create table if not exists public.booking_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  booking_id uuid references public.bookings(id) on delete set null,
  booking_ref text,
  actor_id uuid,
  actor_role text not null,            -- system | customer | admin
  action text not null,
  details text
);
create index if not exists booking_audit_booking_idx on public.booking_audit_log (booking_id, created_at);
alter table public.booking_audit_log enable row level security;
drop policy if exists "booking_audit_log: admin read" on public.booking_audit_log;
create policy "booking_audit_log: admin read" on public.booking_audit_log for select using (public.is_admin());
grant select on public.booking_audit_log to authenticated;

create or replace function public.log_booking_event(p_booking uuid, p_role text, p_action text, p_details text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.booking_audit_log (booking_id, booking_ref, actor_id, actor_role, action, details)
  values (p_booking, (select booking_ref from public.bookings where id = p_booking),
          case when p_role = 'system' then null else auth.uid() end, p_role, p_action, left(p_details, 600));
end;
$$;
revoke all on function public.log_booking_event(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.log_booking_event(uuid, text, text, text) to service_role;

-- ----- new booking columns -----
alter table public.bookings
  add column if not exists cancel_deadline timestamptz,      -- refund cut-off for THIS booking (policy snapshot)
  add column if not exists policy_hours integer,             -- cancellation hours that applied when the customer accepted
  add column if not exists policy_accepted_at timestamptz,
  add column if not exists hold_expires_at timestamptz,      -- unpaid bookings hold the slot until this time
  add column if not exists cancel_reason text;               -- customer | admin | expired | superseded
create unique index if not exists bookings_booking_ref_key on public.bookings (booking_ref);

-- ----- refunds -----
alter table public.booking_payments add column if not exists refunded_amount integer not null default 0;

create table if not exists public.booking_refunds (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payment_id uuid references public.booking_payments(id) on delete set null,
  razorpay_payment_id text,
  razorpay_refund_id text unique,
  amount integer not null check (amount > 0),
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed')),
  reason text,
  requested_by uuid,
  note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists booking_refunds_booking_idx on public.booking_refunds (booking_id);
alter table public.booking_refunds enable row level security;
drop policy if exists "booking_refunds: own read" on public.booking_refunds;
create policy "booking_refunds: own read" on public.booking_refunds
  for select using (exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));
drop policy if exists "booking_refunds: admin read" on public.booking_refunds;
create policy "booking_refunds: admin read" on public.booking_refunds for select using (public.is_admin());
grant select on public.booking_refunds to authenticated;

-- ----- guard: protect the new fields, hold unpaid bookings, stop duplicate bookings -----
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
    new.cancel_deadline := null;
    new.policy_hours := null;
    new.policy_accepted_at := null;
    new.cancel_reason := null;
    new.hold_expires_at := now() + make_interval(mins => public.setting_int('hold_minutes', 30));

    -- a booking must be for a future slot
    if public.booking_start(new.booking_date, new.booking_time) <= now() then
      raise exception 'PAST_SLOT: Please choose a future date and time.';
    end if;

    -- the same person cannot hold / book the same slot twice
    if exists (select 1 from public.bookings x
               where x.client_phone = new.client_phone and x.booking_date = new.booking_date
                 and x.booking_time = new.booking_time
                 and (x.status = 'confirmed' or (x.status = 'pending' and x.amount_paid > 0))) then
      raise exception 'DUPLICATE_BOOKING: You already have a confirmed booking for this date and time.';
    end if;
    perform set_config('app.trusted', '1', true);
    update public.bookings x
       set status = 'cancelled', cancel_reason = 'superseded', cancelled_at = now()
     where x.client_phone = new.client_phone and x.booking_date = new.booking_date
       and x.booking_time = new.booking_time and x.status = 'pending' and x.amount_paid = 0;
    perform set_config('app.trusted', '0', true);
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
    new.cancel_deadline := old.cancel_deadline;
    new.policy_hours := old.policy_hours;
    new.policy_accepted_at := old.policy_accepted_at;
    new.hold_expires_at := old.hold_expires_at;
    new.cancel_reason := old.cancel_reason;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

-- ----- expire unpaid holds (called by the server before taking a payment, and on page loads) -----
create or replace function public.expire_stale_holds() returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  perform set_config('app.trusted', '1', true);
  with x as (
    update public.bookings b
       set status = 'cancelled', cancel_reason = 'expired', cancelled_at = now()
     where b.status = 'pending' and b.amount_paid = 0
       and b.hold_expires_at is not null and b.hold_expires_at < now()
       and not exists (select 1 from public.booking_payments p
                       where p.booking_id = b.id and p.status = 'created' and p.created_at > now() - interval '15 minutes')
    returning b.id
  )
  select count(*) into v_count from x;
  return v_count;
end;
$$;
grant execute on function public.expire_stale_holds() to anon, authenticated, service_role;

-- ----- record a verified payment (atomic, idempotent, overpayment-safe) -----
create or replace function public.record_payment(p_order text, p_payment text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  pay public.booking_payments%rowtype;
  b public.bookings%rowtype;
  v_new integer;
  v_excess integer := 0;
  v_reinstate boolean;
begin
  update public.booking_payments
     set status = 'paid', razorpay_payment_id = p_payment, paid_at = now()
   where razorpay_order_id = p_order and status in ('created', 'failed')
   returning * into pay;
  if not found then return null; end if;        -- unknown order, or already recorded

  select * into b from public.bookings where id = pay.booking_id for update;
  v_new := b.amount_paid + pay.amount;
  if b.price is not null and v_new > b.price then v_excess := v_new - b.price; end if;
  v_reinstate := b.status = 'cancelled' and b.cancel_reason = 'expired';
  perform set_config('app.trusted', '1', true);

  if b.status = 'cancelled' and not v_reinstate then
    -- paid after a real cancellation: keep it cancelled and flag the money for refund
    update public.bookings
       set amount_paid = v_new, refund_due = refund_due + pay.amount, razorpay_payment_id = p_payment
     where id = b.id;
    perform public.log_booking_event(b.id, 'system', 'payment_after_cancellation', 'Received ' || pay.amount || ' on a cancelled booking; refund due');
  else
    update public.bookings
       set amount_paid = v_new,
           refund_due = refund_due + v_excess,
           payment_status = case when b.price is not null and v_new >= b.price then 'paid' else 'partial' end,
           status = case when b.status = 'pending' or v_reinstate then 'confirmed' else b.status end,
           cancel_reason = case when v_reinstate then null else b.cancel_reason end,
           cancelled_at = case when v_reinstate then null else b.cancelled_at end,
           hold_expires_at = null,
           razorpay_payment_id = p_payment,
           paid_at = coalesce(b.paid_at, now())
     where id = b.id;
    perform public.log_booking_event(b.id, 'system', 'payment_verified',
      pay.kind || ' ' || pay.amount || ' (payment ' || p_payment || '); total paid ' || v_new
      || case when v_excess > 0 then '; OVERPAID by ' || v_excess || ' - refund due' else '' end);
  end if;

  return jsonb_build_object(
    'payment', to_jsonb(pay),
    'booking', (select to_jsonb(x) from public.bookings x where x.id = b.id)
  );
end;
$$;

-- ----- refunds -----
-- Called by the server when Razorpay reports a refund as processed (ours, or one made in the dashboard).
drop function if exists public.record_refund(text);
create or replace function public.record_refund(p_payment text, p_refund text default null, p_amount integer default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ref public.booking_refunds%rowtype;
  pay public.booking_payments%rowtype;
  b public.bookings%rowtype;
  v_amt integer;
  v_new integer;
begin
  perform set_config('app.trusted', '1', true);

  select * into ref from public.booking_refunds where razorpay_refund_id = p_refund;
  if found then
    if ref.status = 'processed' then return null; end if;                    -- already applied
    update public.booking_refunds set status = 'processed', processed_at = now() where id = ref.id returning * into ref;
    v_amt := ref.amount;
    select * into pay from public.booking_payments where id = ref.payment_id;
  else
    select * into pay from public.booking_payments where razorpay_payment_id = p_payment and status in ('paid', 'refunded');
    if found then
      v_amt := least(coalesce(p_amount, pay.amount - pay.refunded_amount), pay.amount - pay.refunded_amount);
      if v_amt <= 0 then return null; end if;
      insert into public.booking_refunds (booking_id, payment_id, razorpay_payment_id, razorpay_refund_id, amount, status, reason, processed_at)
        values (pay.booking_id, pay.id, p_payment, p_refund, v_amt, 'processed', 'Refund made in the Razorpay dashboard', now());
    end if;
  end if;

  if pay.id is not null then
    update public.booking_payments
       set refunded_amount = refunded_amount + v_amt,
           status = case when refunded_amount + v_amt >= amount then 'refunded' else status end
     where id = pay.id;
    select * into b from public.bookings where id = pay.booking_id for update;
    v_new := greatest(b.amount_paid - v_amt, 0);
    update public.bookings
       set amount_paid = v_new,
           refund_due = greatest(refund_due - v_amt, 0),
           payment_status = case when v_new = 0 then 'refunded'
                                 when b.price is not null and v_new >= b.price then 'paid'
                                 else 'partial' end,
           status = case when v_new = 0 and b.status <> 'completed' then 'cancelled' else b.status end,
           cancel_reason = case when v_new = 0 and b.status <> 'completed' then coalesce(b.cancel_reason, 'admin') else b.cancel_reason end,
           cancelled_at = case when v_new = 0 and b.status <> 'completed' then coalesce(b.cancelled_at, now()) else b.cancelled_at end
     where id = b.id;
    perform public.log_booking_event(b.id, 'system', 'refund_processed', 'Refund ' || coalesce(p_refund, '') || ' of ' || v_amt || ' processed');
    return jsonb_build_object('booking_id', b.id, 'amount', v_amt);
  end if;

  -- older bookings paid in full before payment rows existed
  update public.bookings
     set payment_status = 'refunded', status = 'cancelled', amount_paid = 0, refund_due = 0
   where razorpay_payment_id = p_payment and status <> 'completed' returning * into b;
  if found then return jsonb_build_object('booking_id', b.id, 'amount', p_amount); end if;
  return null;
end;
$$;

create or replace function public.record_refund_failed(p_refund text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare ref public.booking_refunds%rowtype;
begin
  update public.booking_refunds set status = 'failed' where razorpay_refund_id = p_refund and status = 'processing' returning * into ref;
  if not found then return null; end if;
  perform public.log_booking_event(ref.booking_id, 'system', 'refund_failed', 'Refund ' || p_refund || ' failed at Razorpay');
  return jsonb_build_object('booking_id', ref.booking_id);
end;
$$;

revoke all on function public.record_refund(text, text, integer) from public, anon, authenticated;
revoke all on function public.record_refund_failed(text) from public, anon, authenticated;
grant execute on function public.record_refund(text, text, integer) to service_role;
grant execute on function public.record_refund_failed(text) to service_role;

-- ----- customer: cancel (uses the deadline saved when the customer accepted the policy) -----
drop function if exists public.cancel_my_booking(uuid);
create or replace function public.cancel_my_booking(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings%rowtype;
  v_deadline timestamptz;
  v_eligible boolean;
  v_due integer;
begin
  select * into b from public.bookings where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.status not in ('pending', 'confirmed') then raise exception 'This booking can no longer be cancelled'; end if;

  v_deadline := coalesce(b.cancel_deadline,
    public.booking_start(b.booking_date, b.booking_time) - make_interval(hours => coalesce(b.policy_hours, public.setting_int('cancellation_hours', 24))));
  v_eligible := now() <= v_deadline;
  v_due := case
    when b.amount_paid <= 0 then 0
    when v_eligible then b.amount_paid
    when b.advance_amount is null then 0
    else greatest(b.amount_paid - b.advance_amount, 0)      -- late cancellation: advance is kept
  end;

  perform set_config('app.trusted', '1', true);
  update public.bookings
     set status = 'cancelled', cancelled_at = now(), cancel_reason = 'customer', refund_due = v_due
   where id = p_id;
  perform public.log_booking_event(p_id, 'customer', 'cancelled',
    'Cancelled by customer; refund eligible: ' || v_eligible || '; refund due: ' || v_due || '; deadline was ' || v_deadline);
  return jsonb_build_object('refund_due', v_due, 'refund_eligible', v_eligible, 'amount_paid', b.amount_paid, 'deadline', v_deadline);
end;
$$;
grant execute on function public.cancel_my_booking(uuid) to authenticated;

create or replace function public.reschedule_my_booking(p_id uuid, p_date date, p_time text) returns void
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings%rowtype;
  v_hours integer;
  v_deadline timestamptz;
begin
  select * into b from public.bookings where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.status not in ('pending', 'confirmed') then raise exception 'This booking can no longer be rescheduled'; end if;
  v_hours := coalesce(b.policy_hours, public.setting_int('cancellation_hours', 24));
  v_deadline := coalesce(b.cancel_deadline, public.booking_start(b.booking_date, b.booking_time) - make_interval(hours => v_hours));
  if b.amount_paid > 0 and now() > v_deadline then
    raise exception 'Rescheduling needs at least % hours notice. Please call us.', v_hours;
  end if;
  if public.booking_start(p_date, p_time) <= now() then raise exception 'Please choose a future date and time.'; end if;
  perform set_config('app.trusted', '1', true);
  update public.bookings
     set booking_date = p_date, booking_time = p_time,
         cancel_deadline = case when cancel_deadline is not null then public.booking_start(p_date, p_time) - make_interval(hours => v_hours) end
   where id = p_id;
  perform public.log_booking_event(p_id, 'customer', 'rescheduled', 'Moved to ' || p_date || ' ' || p_time);
end;
$$;
grant execute on function public.reschedule_my_booking(uuid, date, text) to authenticated;

-- ----- admin -----
create or replace function public.admin_cancel_booking(p_id uuid, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.bookings%rowtype;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  select * into b from public.bookings where id = p_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.status not in ('pending', 'confirmed') then raise exception 'This booking can no longer be cancelled'; end if;
  perform set_config('app.trusted', '1', true);
  -- cancelled by the spa: everything paid is refundable
  update public.bookings set status = 'cancelled', cancelled_at = now(), cancel_reason = 'admin', refund_due = amount_paid where id = p_id;
  perform public.log_booking_event(p_id, 'admin', 'cancelled_by_spa', coalesce(p_reason, 'Cancelled by the spa') || '; full refund due: ' || b.amount_paid);
  return jsonb_build_object('refund_due', b.amount_paid);
end;
$$;
grant execute on function public.admin_cancel_booking(uuid, text) to authenticated;

create or replace function public.admin_set_setting(p_key text, p_value jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_key not in ('cancellation_hours', 'hold_minutes') then raise exception 'Unknown setting'; end if;
  v := (p_value #>> '{}')::integer;
  if p_key = 'cancellation_hours' and (v < 0 or v > 720) then raise exception 'Cancellation deadline must be between 0 and 720 hours'; end if;
  if p_key = 'hold_minutes' and (v < 5 or v > 1440) then raise exception 'Hold time must be between 5 and 1440 minutes'; end if;
  insert into public.app_settings (key, value, updated_by) values (p_key, to_jsonb(v), auth.uid())
    on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
  insert into public.booking_audit_log (actor_id, actor_role, action, details)
    values (auth.uid(), 'admin', 'setting_changed', p_key || ' = ' || v);
end;
$$;
grant execute on function public.admin_set_setting(text, jsonb) to authenticated;

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
         hold_expires_at = null,
         paid_at = coalesce(b.paid_at, now())
   where id = b.id;
  perform public.log_booking_event(b.id, 'admin', 'offline_payment_recorded', p_method || ' ' || p_amount || coalesce(' - ' || p_note, ''));
end;
$$;
grant execute on function public.admin_record_offline_payment(uuid, integer, text, text) to authenticated;

-- Try to run the hold sweep every 5 minutes when pg_cron is available (otherwise it runs on demand).
do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('expire-booking-holds', '*/5 * * * *', 'select public.expire_stale_holds()');
exception when others then null; end $$;

-- The guard must see everyone's bookings (to detect duplicates), so it runs as the function owner.
alter function public.bookings_guard() security definer set search_path = public;
