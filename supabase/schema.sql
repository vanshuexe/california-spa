-- Run this whole file in Supabase Dashboard > SQL Editor. Safe to run repeatedly.
-- Also: Authentication > Providers > Email > turn OFF "Confirm email"
-- (users sign in with a mobile number mapped to a synthetic email).

-- ===== Tables =====
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  booking_ref text not null,
  client_name text not null,
  client_phone text not null,
  client_email text,
  therapist text,
  service_style text,
  duration text,
  booking_date date,
  booking_time text,
  location_type text,
  area text,
  address text,
  special_instructions text,
  price integer,
  created_at timestamptz not null default now()
);

-- status: pending | confirmed | cancelled
-- payment_status: pending | paid | failed | refunded
alter table public.bookings
  add column if not exists status text not null default 'pending',
  add column if not exists payment_status text not null default 'pending',
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists paid_at timestamptz;
alter table public.bookings alter column status set default 'pending';
alter table public.bookings alter column payment_status set default 'pending';

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.admin_users enable row level security;

-- ===== Row level security =====
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- Guests may book without an account (user_id null); logged-in users see only their own.
drop policy if exists "bookings: anyone can insert" on public.bookings;
create policy "bookings: anyone can insert" on public.bookings
  for insert with check (user_id is null or user_id = auth.uid());
drop policy if exists "bookings: read own" on public.bookings;
create policy "bookings: read own" on public.bookings
  for select using (auth.uid() = user_id);
drop policy if exists "bookings: update own" on public.bookings;
create policy "bookings: update own" on public.bookings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "bookings: admin read all" on public.bookings;
create policy "bookings: admin read all" on public.bookings
  for select using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admin_users: read own" on public.admin_users;
create policy "admin_users: read own" on public.admin_users
  for select using (auth.uid() = user_id);

-- ===== Protect payment fields =====
-- The browser (anon / authenticated roles) can never set status, payment_status, price or
-- razorpay_* directly. Only edge functions (service role) and the SECURITY DEFINER
-- functions below can. On UPDATE, browsers may only change booking_date / booking_time.
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
  else
    new.id := old.id;
    new.user_id := old.user_id;
    new.booking_ref := old.booking_ref;
    new.client_name := old.client_name;
    new.client_phone := old.client_phone;
    new.client_email := old.client_email;
    new.therapist := old.therapist;
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
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_guard on public.bookings;
create trigger bookings_guard before insert or update on public.bookings
  for each row execute function public.bookings_guard();

-- ===== Customer cancel =====
create or replace function public.cancel_my_booking(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.trusted', '1', true);
  update public.bookings set status = 'cancelled'
  where id = p_id and user_id = auth.uid();
end;
$$;
grant execute on function public.cancel_my_booking(uuid) to authenticated;

-- ===== Admin: assign therapist =====
-- Make yourself admin after registering (replace the phone number):
--   insert into public.admin_users (user_id)
--   select id from auth.users where email = '9876543210@phone.doorstep-royale.app';
create or replace function public.admin_assign_therapist(p_id uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.admin_users where user_id = auth.uid()) then
    raise exception 'not an admin';
  end if;
  perform set_config('app.trusted', '1', true);
  update public.bookings set therapist = p_name where id = p_id;
end;
$$;
grant execute on function public.admin_assign_therapist(uuid, text) to authenticated;

-- Table-level privileges (row access is still limited by the policies + trigger above).
grant select, insert on public.bookings to anon, authenticated;
grant update on public.bookings to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.admin_users to authenticated;

-- ===== Therapists (managed from the admin panel) =====
create table if not exists public.therapists (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  gender text not null default 'Female',
  age integer,
  experience text,
  specialties text[] not null default '{}',
  photo text,
  rating numeric not null default 5,
  reviews_count integer not null default 0,
  bio text,
  created_at timestamptz not null default now()
);
alter table public.therapists enable row level security;

drop policy if exists "therapists: public read" on public.therapists;
create policy "therapists: public read" on public.therapists
  for select using (true);
drop policy if exists "therapists: admin insert" on public.therapists;
create policy "therapists: admin insert" on public.therapists
  for insert with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
drop policy if exists "therapists: admin update" on public.therapists;
create policy "therapists: admin update" on public.therapists
  for update using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
drop policy if exists "therapists: admin delete" on public.therapists;
create policy "therapists: admin delete" on public.therapists
  for delete using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

grant select on public.therapists to anon, authenticated;
grant insert, update, delete on public.therapists to authenticated;

insert into public.therapists (id, name, gender, age, experience, specialties, photo, rating, reviews_count, bio) values
 ('mary','Mary','Female',26,'4+ Years','{Swedish,Aroma,"Deep Tissue","Head & Shoulder"}','/assets/slider/images/female-massage-bangalore.png',4.9,148,'Trained to Doorstep Royale Spa standards. Gentle, caring demeanor with excellent focus on stress relief, muscle tension unwinding, and soothing aroma strokes.'),
 ('pari','Pari','Female',28,'5+ Years','{"Deep Tissue","Balinese Acupressure","Pain Relief",Swedish}','/assets/slider/AboutPageSlider/5.png',4.95,172,'Renowned for firm, therapeutic hand pressure combined with Ayurvedic healing oils. Specialized in chronic back, neck, and shoulder ache relief.'),
 ('kangnu','Kangnu','Female',25,'3+ Years','{Balinese,"Aroma Relaxation","Swedish Relaxation","Thai Stretches"}','/assets/slider/images/21.png',4.88,119,'Gentle, punctual, and attentive therapist providing an integrative mind-body relaxation session with meditative background music and authentic essences.'),
 ('riya','Riya','Female',27,'4 Years','{Swedish,"Esalen Long Flow",Aromatherapy,"Ayurvedic Herbal"}','/assets/slider/AboutPageSlider/6.png',4.92,94,'Specialist in Esalen-inspired continuous flowing strokes that induce deep tranquility, stimulate blood circulation, and balance energy.'),
 ('david','David','Male',30,'6 Years','{"Deep Tissue","Sports Therapy","Orthopedic Massage",Acupressure}','/assets/slider/AboutPageSlider/1.png',4.85,86,'Strong hands and deep anatomical knowledge for athletes and clients with intense muscle knots, stiffness, or sports fatigue.')
on conflict (id) do nothing;

-- ===== Inquiries: contact form, job applications, guest chat (viewed in admin panel) =====
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('contact', 'job', 'chat')),
  name text not null check (char_length(name) <= 200),
  mobile text not null check (char_length(mobile) <= 30),
  email text check (char_length(email) <= 200),
  message text check (char_length(message) <= 3000),
  details jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'read', 'done')),
  created_at timestamptz not null default now()
);
alter table public.inquiries enable row level security;

drop policy if exists "inquiries: anyone can insert" on public.inquiries;
create policy "inquiries: anyone can insert" on public.inquiries
  for insert with check (status = 'new');
drop policy if exists "inquiries: admin read" on public.inquiries;
create policy "inquiries: admin read" on public.inquiries
  for select using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
drop policy if exists "inquiries: admin update" on public.inquiries;
create policy "inquiries: admin update" on public.inquiries
  for update using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
drop policy if exists "inquiries: admin delete" on public.inquiries;
create policy "inquiries: admin delete" on public.inquiries
  for delete using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

grant insert on public.inquiries to anon, authenticated;
grant select, update, delete on public.inquiries to authenticated;

-- ===== Therapist chat =====
-- Therapist logins (created by an admin through the create-therapist-login edge function).
create table if not exists public.therapist_accounts (
  therapist_id text primary key references public.therapists(id) on delete cascade,
  user_id uuid unique not null references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.therapist_accounts enable row level security;

alter table public.bookings
  add column if not exists therapist_id text references public.therapists(id) on delete set null,
  add column if not exists chat_blocked boolean not null default false,
  add column if not exists chat_blocked_by uuid;
-- bookings.status: pending | confirmed | completed | cancelled

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$$;

create or replace function public.my_therapist_id() returns text
language sql stable security definer set search_path = public as $$
  select therapist_id from public.therapist_accounts where user_id = auth.uid()
$$;

-- 'customer' | 'therapist' | null for the signed-in user on this booking
create or replace function public.chat_role(p_booking uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when b.user_id is not null and b.user_id = auth.uid() then 'customer'
    when b.therapist_id is not null and b.therapist_id = public.my_therapist_id() then 'therapist'
  end
  from public.bookings b where b.id = p_booking
$$;

-- Chat is open while: paid + confirmed, therapist assigned, not blocked, and until
-- 24 hours after the booking day. Completing/cancelling the booking closes it.
create or replace function public.chat_is_open(p_booking uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select b.payment_status = 'paid' and b.status = 'confirmed'
       and b.therapist_id is not null and not b.chat_blocked
       and now() < ((b.booking_date + 2)::timestamp at time zone 'UTC')
    from public.bookings b where b.id = p_booking
  ), false)
$$;

drop policy if exists "therapist_accounts: read own or admin" on public.therapist_accounts;
create policy "therapist_accounts: read own or admin" on public.therapist_accounts
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "bookings: therapist read assigned" on public.bookings;
create policy "bookings: therapist read assigned" on public.bookings
  for select using (therapist_id is not null and therapist_id = public.my_therapist_id());

-- ----- messages -----
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null,
  sender_role text not null,
  body text check (char_length(body) <= 2000),
  image_path text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (body is not null or image_path is not null)
);
create index if not exists messages_booking_idx on public.messages (booking_id, created_at);
alter table public.messages enable row level security;

drop policy if exists "messages: participants and admin read" on public.messages;
create policy "messages: participants and admin read" on public.messages
  for select using (public.chat_role(booking_id) is not null or public.is_admin());
drop policy if exists "messages: insert as self" on public.messages;
create policy "messages: insert as self" on public.messages
  for insert with check (sender_id = auth.uid());

create or replace function public.messages_guard() returns trigger
language plpgsql as $$
declare r text;
begin
  r := public.chat_role(new.booking_id);
  if r is null then raise exception 'You are not part of this chat'; end if;
  if not public.chat_is_open(new.booking_id) then raise exception 'This chat is closed'; end if;
  if new.image_path is not null and new.image_path not like new.booking_id::text || '/%' then
    raise exception 'Invalid image';
  end if;
  new.sender_id := auth.uid();
  new.sender_role := r;
  new.read_at := null;
  new.created_at := now();
  return new;
end;
$$;
drop trigger if exists messages_guard on public.messages;
create trigger messages_guard before insert on public.messages
  for each row execute function public.messages_guard();

create or replace function public.mark_chat_read(p_booking uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.chat_role(p_booking) is null then return; end if;
  update public.messages set read_at = now()
  where booking_id = p_booking and sender_id <> auth.uid() and read_at is null;
end;
$$;
grant execute on function public.mark_chat_read(uuid) to authenticated;

-- ----- reports -----
create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reporter_id uuid not null,
  reason text not null check (char_length(reason) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);
alter table public.chat_reports enable row level security;
drop policy if exists "chat_reports: participant insert" on public.chat_reports;
create policy "chat_reports: participant insert" on public.chat_reports
  for insert with check (reporter_id = auth.uid() and public.chat_role(booking_id) is not null and status = 'open');
drop policy if exists "chat_reports: own or admin read" on public.chat_reports;
create policy "chat_reports: own or admin read" on public.chat_reports
  for select using (reporter_id = auth.uid() or public.is_admin());
drop policy if exists "chat_reports: admin update" on public.chat_reports;
create policy "chat_reports: admin update" on public.chat_reports
  for update using (public.is_admin());

-- ----- protect booking fields (replaces the earlier version) -----
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
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

-- ----- actions -----
create or replace function public.block_chat(p_booking uuid, p_block boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.trusted', '1', true);
  if public.is_admin() then
    update public.bookings
      set chat_blocked = p_block, chat_blocked_by = case when p_block then auth.uid() else null end
      where id = p_booking;
  elsif p_block and public.chat_role(p_booking) is not null then
    update public.bookings set chat_blocked = true, chat_blocked_by = auth.uid() where id = p_booking;
  else
    raise exception 'Not allowed';
  end if;
end;
$$;
grant execute on function public.block_chat(uuid, boolean) to authenticated;

create or replace function public.complete_booking(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or public.chat_role(p_id) = 'therapist') then
    raise exception 'Not allowed';
  end if;
  perform set_config('app.trusted', '1', true);
  update public.bookings set status = 'completed'
  where id = p_id and status = 'confirmed' and payment_status = 'paid';
end;
$$;
grant execute on function public.complete_booking(uuid) to authenticated;

create or replace function public.admin_assign_therapist(p_id uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not an admin'; end if;
  perform set_config('app.trusted', '1', true);
  update public.bookings
    set therapist = p_name,
        therapist_id = (select t.id from public.therapists t where t.name = p_name limit 1)
    where id = p_id;
end;
$$;
grant execute on function public.admin_assign_therapist(uuid, text) to authenticated;

grant select, insert on public.messages to authenticated;
grant select, insert on public.chat_reports to authenticated;
grant update on public.chat_reports to authenticated;
grant select on public.therapist_accounts to authenticated;

-- ----- realtime -----
alter table public.messages replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

-- ----- image storage -----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

drop policy if exists "chat images: read" on storage.objects;
create policy "chat images: read" on storage.objects for select to authenticated
  using (bucket_id = 'chat-images'
         and (public.chat_role(((storage.foldername(name))[1])::uuid) is not null or public.is_admin()));
drop policy if exists "chat images: upload" on storage.objects;
create policy "chat images: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-images'
              and public.chat_role(((storage.foldername(name))[1])::uuid) is not null
              and public.chat_is_open(((storage.foldername(name))[1])::uuid));

-- ===== Chat privacy: block contact details + hide customer phone from therapists =====

-- True when text looks like a phone number, email, social handle, external messenger/link,
-- or an attempt to move the conversation off the site ("WhatsApp me", "call me", ...).
-- The same rules are mirrored in src/lib/chat.ts for instant warnings; this is the real enforcement.
create or replace function public.contains_contact_info(t text) returns boolean
language plpgsql immutable as $$
declare s text; m text;
begin
  if t is null or btrim(t) = '' then return false; end if;
  s := lower(t);
  -- strip zero-width characters, normalise Devanagari digits
  s := regexp_replace(s, '[​-‏⁠﻿]', '', 'g');
  s := translate(s, '०१२३४५६७८९', '0123456789');
  -- spelled-out digits (English / Hindi) -> digits, so "nine eight seven..." is caught
  s := regexp_replace(s, '\m(zero|shunya)\M', '0', 'g');
  s := regexp_replace(s, '\m(one|ek)\M', '1', 'g');
  s := regexp_replace(s, '\m(two|do)\M', '2', 'g');
  s := regexp_replace(s, '\m(three|teen)\M', '3', 'g');
  s := regexp_replace(s, '\m(four|char)\M', '4', 'g');
  s := regexp_replace(s, '\m(five|paanch|panch)\M', '5', 'g');
  s := regexp_replace(s, '\m(six|chhe|chheh|che)\M', '6', 'g');
  s := regexp_replace(s, '\m(seven|saat|sat)\M', '7', 'g');
  s := regexp_replace(s, '\m(eight|aath|ath)\M', '8', 'g');
  s := regexp_replace(s, '\m(nine|nau)\M', '9', 'g');

  -- phone numbers: 7+ digits in a row, or 9+ digits split by spaces . - _ ( ) * , +
  if s ~ '\d{7,}' then return true; end if;
  if s ~ '(\d[\s.\-_()*,+]*){9,}' then return true; end if;

  -- email addresses (incl. "name (at) gmail", "name at gmail dot com")
  if s ~ '[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z]{2,}' then return true; end if;
  if s ~ '[a-z0-9._%+-]+\s*(\(at\)|\[at\]|\{at\})\s*[a-z0-9-]+' then return true; end if;
  if s ~ '\m[a-z0-9._-]+\s+at\s+[a-z0-9-]+\s*(\.|\(dot\)|\[dot\]|\mdot\M)\s*[a-z]{2,}' then return true; end if;
  if s ~ '\m(gmail|googlemail|hotmail|yahoo|outlook|protonmail|rediffmail|icloud)\M' then return true; end if;

  -- social handles and messengers
  if s ~ '(^|[\s(])@[a-z_][a-z0-9_.]{2,}' then return true; end if;
  if s ~ '\m(whats\s*app|whatsap|watsapp|whatsup|wattsapp|wapp|telegram|tele\s*gram|signal\s+app|snap\s*chat|snapchat|insta|instagram|facebook|messenger|twitter|wechat|skype|viber|discord|truecaller|linkedin|linktree|onlyfans)\M' then return true; end if;
  if s ~ '\m(fb|ig|tg|snap|dm)\s*[:\-]' then return true; end if;
  if s ~ '\m(dm|inbox)\s+(me|you)\M' then return true; end if;

  -- external links / domains
  if s ~ 'https?\s*:\s*//' or s ~ '\mwww\s*\.' then return true; end if;
  if s ~ '\m[a-z0-9-]+\.(com|in|me|io|net|org|co|app|link|ly|gl|xyz|info|biz|us|uk|ai|chat)\M' then return true; end if;
  if s ~ '\mdot\s*(com|net|org|in|me|co)\M' then return true; end if;
  if s ~ '(t\.me|bit\.ly|wa\.me|chat\.whatsapp)' then return true; end if;

  -- attempts to take the conversation off the site
  if s ~ '\m(call|phone|ring|dial|text|sms|msg|message|contact|ping)\s+(me|you|us)\M' then return true; end if;
  if s ~ '\m(my|your|ur|his|her)\s+(phone|mobile|cell|contact|whatsapp|number|num)\M' then return true; end if;
  if s ~ '\m(phone|mobile|cell|contact|whatsapp|telephone|tel)\s*(number|num|nbr|#)' then return true; end if;
  if s ~ '\mnumber\s*(de|dena|dedo|bhej|bhejo|bhejna|share|send|give|chahiye)\M' then return true; end if;
  if s ~ '\m(call|phone|whatsapp|msg|message|text)\s*(kar|karo|karna|karein|kariye|kijiye|krna|kro)\M' then return true; end if;
  if s ~ '\m(mujhe|muje|mereko|mujko)\s+(call|phone|msg|message)\M' then return true; end if;

  -- letters spaced out to dodge the filter: "w h a t s a p p", "g.m.a.i.l"
  for m in select (regexp_matches(s, '((?:\m[a-z]\M[\s.\-_*,]+){3,}[a-z]\M)', 'g'))[1] loop
    if regexp_replace(m, '[^a-z]', '', 'g') ~ '(whatsapp|telegram|instagram|snapchat|facebook|gmail|hotmail|yahoo|outlook|insta|signal)' then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

-- enforce it on every chat message
create or replace function public.messages_guard() returns trigger
language plpgsql as $$
declare r text;
begin
  r := public.chat_role(new.booking_id);
  if r is null then raise exception 'You are not part of this chat'; end if;
  if not public.chat_is_open(new.booking_id) then raise exception 'This chat is closed'; end if;
  if public.contains_contact_info(new.body) then
    raise exception 'CONTACT_BLOCKED: For your safety and privacy, sharing personal contact details is not allowed.';
  end if;
  if new.image_path is not null and new.image_path not like new.booking_id::text || '/%' then
    raise exception 'Invalid image';
  end if;
  new.sender_id := auth.uid();
  new.sender_role := r;
  new.read_at := null;
  new.created_at := now();
  return new;
end;
$$;

-- Therapists no longer read the bookings table directly (it contains the customer's phone/email).
-- They get a safe list through this function instead; contact details typed into the
-- address / instructions fields are masked.
drop policy if exists "bookings: therapist read assigned" on public.bookings;

create or replace function public.therapist_bookings() returns table (
  id uuid, booking_ref text, client_name text, therapist text, therapist_id text,
  status text, payment_status text, booking_date date, booking_time text,
  duration text, service_style text, area text, address text,
  special_instructions text, location_type text, chat_blocked boolean
)
language sql stable security definer set search_path = public as $$
  select b.id, b.booking_ref, b.client_name, b.therapist, b.therapist_id,
         b.status, b.payment_status, b.booking_date, b.booking_time,
         b.duration, b.service_style, b.area,
         case when public.contains_contact_info(b.address) then '[hidden - contains contact details]' else b.address end,
         case when public.contains_contact_info(b.special_instructions) then '[hidden - contains contact details]' else b.special_instructions end,
         b.location_type, b.chat_blocked
  from public.bookings b
  where b.therapist_id is not null and b.therapist_id = public.my_therapist_id()
  order by b.booking_date, b.created_at
$$;
grant execute on function public.therapist_bookings() to authenticated;

-- Minimal booking info for notifications (works for customer and therapist; no contact details).
create or replace function public.chat_booking_info(p_booking uuid) returns table (
  booking_ref text, client_name text, therapist text, my_role text
)
language sql stable security definer set search_path = public as $$
  select b.booking_ref, b.client_name, b.therapist, public.chat_role(b.id)
  from public.bookings b
  where b.id = p_booking and public.chat_role(b.id) is not null
$$;
grant execute on function public.chat_booking_info(uuid) to authenticated;

-- ===== Chat moderation: professional-only chat, strikes, flags, suspensions =====

-- Regex builder: every letter may repeat ("fuuuck"), whole words only.
create or replace function public.kw_regex(words text[]) returns text
language sql immutable as $$
  select '\m(' || string_agg(regexp_replace(w, '([a-z])', '\1+', 'g'), '|') || ')\M' from unnest(words) w
$$;

-- Classifies a (normalised) string. Returns null or one of: threat, discrimination, sexual, abusive, inappropriate
create or replace function public.moderation_hit(s text) returns text
language plpgsql immutable as $$
begin
  -- threats / violence
  if s ~ '\m(kill|murder|stab|shoot|hurt|beat|burn|rape|assault|harm|slap|punch|strangle)\s+(you|u|him|her|them|ur)\M' then return 'threat'; end if;
  if s ~ public.kw_regex(array['rape','raped','rapist','murder','acid attack','i will find you','you will regret','you ll regret','watch your back','i know where you live','maar dunga','maar dalunga','jaan se maar','dekh lunga','khatam kar dunga','goli maar','chhodunga nahi','chodunga nahi','kill you','kill u']) then return 'threat'; end if;

  -- discrimination / slurs
  if s ~ public.kw_regex(array['nigger','nigga','faggot','chink','paki','kike','tranny','chamar','bhangi','katua','ghetto trash']) then return 'discrimination'; end if;
  if s ~ '\m(muslims?|hindus?|christians?|jews?|blacks?|gays?|dalits?|biharis?|nepalis?|africans?|chinese|women|girls)\s+(are|r)\s+(all\s+)?(dirty|filthy|terrorists?|animals?|inferior|useless|stupid|cheap|trash)\M' then return 'discrimination'; end if;

  -- sexual content
  if s ~ public.kw_regex(array['sex','sexy','sexual','nude','nudes','naked','porn','blowjob','blow job','handjob','hand job','erotic','escort','hookup','hook up','horny','boobs','boob','dick','cock','pussy','nipple','nipples','orgasm','masturbate','masturbation','sensual','lingerie','topless','nuru','happy ending','chut','lund','lauda','gaand','gand','randi','chodna','chodu','chod','bhosdi','bhosda']) then return 'sexual'; end if;
  if s ~ public.kw_regex(array['nude massage','body to body','full service','extra service','extra services','sleep with','sleeping with','bed with']) then return 'sexual'; end if;

  -- abuse / offensive language
  if s ~ public.kw_regex(array['fuck','fucker','fucking','motherfucker','shit','bullshit','bitch','bastard','asshole','idiot','stupid','moron','scumbag','slut','whore','retard','retarded','shut up','madarchod','behenchod','bhenchod','chutiya','chutia','gandu','harami','haramzada','haramkhor','kutta','kutti','kamina','kamini','bakchod','teri maa','tera baap']) then return 'abusive'; end if;

  -- flirting / personal or off-topic advances
  if s ~ public.kw_regex(array['love you','love u','marry me','girlfriend','boyfriend','kiss','kissing','cuddle','romantic','date me','dating','night stay','stay overnight','private party','meet outside','hot body','your body','beautiful body']) then return 'inappropriate'; end if;
  return null;
end;
$$;

create or replace function public.moderation_category(t text) returns text
language plpgsql immutable as $$
declare s text; cat text; m text;
begin
  if t is null or btrim(t) = '' then return null; end if;
  if public.contains_contact_info(t) then return 'contact'; end if;

  s := lower(t);
  s := regexp_replace(s, '[​-‏⁠﻿]', '', 'g');
  -- masked swear words: f*ck, f@ck, sh*t, b!tch, s*x
  if s ~ '\m(f[*@#%._\-]+ck|sh[*@#%._\-]+t|b[*@#%._\-]+tch|a[*@#%._\-]+shole|d[*@#%._\-]+ck|p[*@#%._\-]+ssy)' then return 'abusive'; end if;
  if s ~ '\ms[*@#%._\-]+x\M' then return 'sexual'; end if;
  s := translate(s, '@$0134578!', 'asoieastbi');          -- leetspeak: sh1t, 5ex
  s := regexp_replace(s, '(.)\1{2,}', '\1', 'g');           -- fuuuuck -> fuck
  cat := public.moderation_hit(s);
  if cat is not null then return cat; end if;

  -- letters spaced out to dodge the filter: "f u c k", "s.e.x"
  for m in select (regexp_matches(s, '((?:\m[a-z]\M[\s.\-_*,]+){2,}[a-z]\M)', 'g'))[1] loop
    cat := public.moderation_hit(regexp_replace(m, '[^a-z]', '', 'g'));
    if cat is not null then return cat; end if;
  end loop;
  return null;
end;
$$;

-- ----- strikes, mutes, suspensions, flags -----
create table if not exists public.chat_violations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null,
  role text not null,
  category text not null,
  weight integer not null default 1,
  excerpt text,
  forgiven boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists chat_violations_user_idx on public.chat_violations (user_id, created_at);

create table if not exists public.chat_user_status (
  user_id uuid primary key,
  muted_until timestamptz,
  suspended boolean not null default false,
  suspended_reason text,
  suspended_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_flags (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null,
  role text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid
);
create unique index if not exists chat_flags_open_idx on public.chat_flags (booking_id, user_id) where status = 'open';

alter table public.chat_violations enable row level security;
alter table public.chat_user_status enable row level security;
alter table public.chat_flags enable row level security;

drop policy if exists "chat_violations: admin read" on public.chat_violations;
create policy "chat_violations: admin read" on public.chat_violations for select using (public.is_admin());
drop policy if exists "chat_user_status: own or admin read" on public.chat_user_status;
create policy "chat_user_status: own or admin read" on public.chat_user_status for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "chat_flags: admin read" on public.chat_flags;
create policy "chat_flags: admin read" on public.chat_flags for select using (public.is_admin());
drop policy if exists "chat_flags: admin update" on public.chat_flags;
create policy "chat_flags: admin update" on public.chat_flags for update using (public.is_admin());

grant select on public.chat_violations, public.chat_user_status, public.chat_flags to authenticated;
grant update on public.chat_flags to authenticated;

-- true if the signed-in user is suspended or temporarily muted
create or replace function public.chat_user_blocked() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select suspended or coalesce(muted_until > now(), false)
                   from public.chat_user_status where user_id = auth.uid()), false)
$$;

-- All messages go through this function (direct inserts are disabled below), so every
-- blocked attempt is counted and escalated.
create or replace function public.send_chat_message(p_booking uuid, p_body text default null, p_image_path text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_status public.chat_user_status%rowtype;
  v_cat text;
  v_weight integer;
  v_points integer;
  v_muted timestamptz;
  v_level text;
  v_msg public.messages%rowtype;
begin
  v_role := public.chat_role(p_booking);
  if v_uid is null or v_role is null then
    return jsonb_build_object('ok', false, 'code', 'not_participant', 'message', 'You are not part of this chat.');
  end if;
  if v_body is null and p_image_path is null then
    return jsonb_build_object('ok', false, 'code', 'empty', 'message', 'Message is empty.');
  end if;
  if not public.chat_is_open(p_booking) then
    return jsonb_build_object('ok', false, 'code', 'closed', 'message', 'This chat is closed.');
  end if;

  select * into v_status from public.chat_user_status where user_id = v_uid;
  if found and v_status.suspended then
    return jsonb_build_object('ok', false, 'code', 'suspended', 'message', 'Your account has been suspended from chat. Please contact support.');
  end if;
  if found and v_status.muted_until is not null and v_status.muted_until > now() then
    return jsonb_build_object('ok', false, 'code', 'muted', 'muted_until', v_status.muted_until,
      'message', 'Chat is temporarily disabled because of repeated violations.');
  end if;

  v_cat := public.moderation_category(v_body);
  if v_cat is not null then
    v_weight := case when v_cat in ('sexual', 'threat', 'discrimination') then 2 else 1 end;
    insert into public.chat_violations (booking_id, user_id, role, category, weight, excerpt)
    values (p_booking, v_uid, v_role, v_cat, v_weight, left(v_body, 500));

    select coalesce(sum(weight), 0) into v_points from public.chat_violations
    where user_id = v_uid and not forgiven and created_at > now() - interval '7 days';

    v_level := case when v_points >= 3 then 'disabled' when v_points = 2 then 'final_warning' else 'warning' end;

    if v_points >= 3 then
      v_muted := now() + case when v_points >= 5 then interval '72 hours' else interval '24 hours' end;
      insert into public.chat_user_status (user_id, muted_until, updated_at) values (v_uid, v_muted, now())
      on conflict (user_id) do update set muted_until = excluded.muted_until, updated_at = now();
    end if;

    -- serious content, or repeated violations: flag the conversation for admin review
    if v_weight = 2 or v_points >= 3 then
      insert into public.chat_flags (booking_id, user_id, role, reason)
      values (p_booking, v_uid, v_role,
        case when v_weight = 2 then 'Serious violation (' || v_cat || ')' else 'Repeated violations (' || v_points || ' points in 7 days)' end)
      on conflict (booking_id, user_id) where status = 'open' do nothing;
    end if;

    return jsonb_build_object('ok', false, 'code', 'blocked', 'category', v_cat, 'level', v_level,
      'points', v_points, 'muted_until', v_muted);
  end if;

  perform set_config('app.trusted', '1', true);
  insert into public.messages (booking_id, body, image_path) values (p_booking, v_body, p_image_path)
  returning * into v_msg;
  return jsonb_build_object('ok', true, 'message', to_jsonb(v_msg));
end;
$$;
grant execute on function public.send_chat_message(uuid, text, text) to authenticated;

-- Sending now only happens through send_chat_message.
drop policy if exists "messages: insert as self" on public.messages;
revoke insert on public.messages from authenticated;

-- Photos: same checks (suspended / muted users can't upload), and the sender can remove a
-- photo whose message was blocked.
drop policy if exists "chat images: upload" on storage.objects;
create policy "chat images: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-images'
              and public.chat_role(((storage.foldername(name))[1])::uuid) is not null
              and public.chat_is_open(((storage.foldername(name))[1])::uuid)
              and not public.chat_user_blocked());
drop policy if exists "chat images: delete own" on storage.objects;
create policy "chat images: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'chat-images' and owner = auth.uid());

-- Admin: lift a temporary mute and forgive the recent strikes.
create or replace function public.admin_unmute_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  update public.chat_user_status set muted_until = null, updated_at = now() where user_id = p_user;
  update public.chat_violations set forgiven = true where user_id = p_user and not forgiven;
end;
$$;
grant execute on function public.admin_unmute_user(uuid) to authenticated;

-- ===== Moderation audit log + admin restrict =====
-- Append-only history of every moderation event: automatic (blocked message, mute, flag) and
-- by people (admin unmute / restrict / suspend / block chat / review flag, user blocking a chat).
create table if not exists public.chat_moderation_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid,                    -- null = automatic system action
  actor_role text not null,         -- system | admin | customer | therapist
  action text not null,
  target_user_id uuid,
  booking_id uuid references public.bookings(id) on delete set null,
  details text
);
create index if not exists chat_moderation_log_idx on public.chat_moderation_log (created_at desc);
alter table public.chat_moderation_log enable row level security;
drop policy if exists "chat_moderation_log: admin read" on public.chat_moderation_log;
create policy "chat_moderation_log: admin read" on public.chat_moderation_log for select using (public.is_admin());
grant select on public.chat_moderation_log to authenticated;
-- no insert/update/delete policies: rows are written only by the functions below / edge functions

create or replace function public.log_moderation(p_role text, p_action text, p_target uuid, p_booking uuid, p_details text)
returns void language sql security definer set search_path = public as $$
  insert into public.chat_moderation_log (actor_id, actor_role, action, target_user_id, booking_id, details)
  values (case when p_role = 'system' then null else auth.uid() end, p_role, p_action, p_target, p_booking, left(p_details, 500));
$$;
revoke all on function public.log_moderation(text, text, uuid, uuid, text) from public, anon, authenticated;

-- send_chat_message, now with audit logging
create or replace function public.send_chat_message(p_booking uuid, p_body text default null, p_image_path text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_status public.chat_user_status%rowtype;
  v_cat text;
  v_weight integer;
  v_points integer;
  v_muted timestamptz;
  v_level text;
  v_flagged integer;
  v_msg public.messages%rowtype;
begin
  v_role := public.chat_role(p_booking);
  if v_uid is null or v_role is null then
    return jsonb_build_object('ok', false, 'code', 'not_participant', 'message', 'You are not part of this chat.');
  end if;
  if v_body is null and p_image_path is null then
    return jsonb_build_object('ok', false, 'code', 'empty', 'message', 'Message is empty.');
  end if;
  if not public.chat_is_open(p_booking) then
    return jsonb_build_object('ok', false, 'code', 'closed', 'message', 'This chat is closed.');
  end if;

  select * into v_status from public.chat_user_status where user_id = v_uid;
  if found and v_status.suspended then
    return jsonb_build_object('ok', false, 'code', 'suspended', 'message', 'Your account has been suspended from chat. Please contact support.');
  end if;
  if found and v_status.muted_until is not null and v_status.muted_until > now() then
    return jsonb_build_object('ok', false, 'code', 'muted', 'muted_until', v_status.muted_until,
      'message', 'Chat is temporarily disabled because of repeated violations.');
  end if;

  v_cat := public.moderation_category(v_body);
  if v_cat is not null then
    v_weight := case when v_cat in ('sexual', 'threat', 'discrimination') then 2 else 1 end;
    insert into public.chat_violations (booking_id, user_id, role, category, weight, excerpt)
    values (p_booking, v_uid, v_role, v_cat, v_weight, left(v_body, 500));

    select coalesce(sum(weight), 0) into v_points from public.chat_violations
    where user_id = v_uid and not forgiven and created_at > now() - interval '7 days';

    v_level := case when v_points >= 3 then 'disabled' when v_points = 2 then 'final_warning' else 'warning' end;
    perform public.log_moderation('system', 'message_blocked', v_uid, p_booking,
      v_role || ' - ' || v_cat || ' (' || v_points || ' pts): ' || coalesce(left(v_body, 200), ''));

    if v_points >= 3 then
      v_muted := now() + case when v_points >= 5 then interval '72 hours' else interval '24 hours' end;
      insert into public.chat_user_status (user_id, muted_until, updated_at) values (v_uid, v_muted, now())
      on conflict (user_id) do update set muted_until = excluded.muted_until, updated_at = now();
      perform public.log_moderation('system', 'chat_restricted', v_uid, p_booking,
        'Temporarily disabled until ' || v_muted::text || ' (' || v_points || ' points)');
    end if;

    if v_weight = 2 or v_points >= 3 then
      insert into public.chat_flags (booking_id, user_id, role, reason)
      values (p_booking, v_uid, v_role,
        case when v_weight = 2 then 'Serious violation (' || v_cat || ')' else 'Repeated violations (' || v_points || ' points in 7 days)' end)
      on conflict (booking_id, user_id) where status = 'open' do nothing;
      get diagnostics v_flagged = row_count;
      if v_flagged > 0 then
        perform public.log_moderation('system', 'conversation_flagged', v_uid, p_booking,
          case when v_weight = 2 then 'Serious violation (' || v_cat || ')' else 'Repeated violations' end);
      end if;
    end if;

    return jsonb_build_object('ok', false, 'code', 'blocked', 'category', v_cat, 'level', v_level,
      'points', v_points, 'muted_until', v_muted);
  end if;

  perform set_config('app.trusted', '1', true);
  insert into public.messages (booking_id, body, image_path) values (p_booking, v_body, p_image_path)
  returning * into v_msg;
  return jsonb_build_object('ok', true, 'message', to_jsonb(v_msg));
end;
$$;
grant execute on function public.send_chat_message(uuid, text, text) to authenticated;

-- Admin: lift a temporary restriction and forgive recent strikes (logged)
create or replace function public.admin_unmute_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  update public.chat_user_status set muted_until = null, updated_at = now() where user_id = p_user;
  update public.chat_violations set forgiven = true where user_id = p_user and not forgiven;
  perform public.log_moderation('admin', 'chat_restored', p_user, null, 'Restriction lifted, strikes cleared');
end;
$$;
grant execute on function public.admin_unmute_user(uuid) to authenticated;

-- Admin: restrict a user's chat for N hours (1 - 720)
create or replace function public.admin_restrict_user(p_user uuid, p_hours integer, p_booking uuid default null, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_until timestamptz;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if exists (select 1 from public.admin_users where user_id = p_user) then raise exception 'Admins cannot be restricted'; end if;
  v_until := now() + make_interval(hours => greatest(1, least(coalesce(p_hours, 24), 720)));
  insert into public.chat_user_status (user_id, muted_until, updated_at) values (p_user, v_until, now())
  on conflict (user_id) do update set muted_until = excluded.muted_until, updated_at = now();
  perform public.log_moderation('admin', 'chat_restricted', p_user, p_booking,
    'Restricted until ' || v_until::text || coalesce(' - ' || p_note, ''));
end;
$$;
grant execute on function public.admin_restrict_user(uuid, integer, uuid, text) to authenticated;

-- Admin: mark a flagged conversation as reviewed (logged)
create or replace function public.admin_resolve_flag(p_flag uuid, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare f public.chat_flags%rowtype;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  update public.chat_flags set status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
  where id = p_flag and status = 'open' returning * into f;
  if found then
    perform public.log_moderation('admin', 'flag_reviewed', f.user_id, f.booking_id, coalesce(p_note, f.reason));
  end if;
end;
$$;
grant execute on function public.admin_resolve_flag(uuid, text) to authenticated;
drop policy if exists "chat_flags: admin update" on public.chat_flags;
revoke update on public.chat_flags from authenticated;

-- block_chat (conversation level), now logged
create or replace function public.block_chat(p_booking uuid, p_block boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  perform set_config('app.trusted', '1', true);
  if public.is_admin() then
    v_role := 'admin';
    update public.bookings
      set chat_blocked = p_block, chat_blocked_by = case when p_block then auth.uid() else null end
      where id = p_booking;
  elsif p_block and public.chat_role(p_booking) is not null then
    v_role := public.chat_role(p_booking);
    update public.bookings set chat_blocked = true, chat_blocked_by = auth.uid() where id = p_booking;
  else
    raise exception 'Not allowed';
  end if;
  perform public.log_moderation(v_role, case when p_block then 'conversation_blocked' else 'conversation_unblocked' end, null, p_booking, null);
end;
$$;
grant execute on function public.block_chat(uuid, boolean) to authenticated;

-- a participant reporting a chat is logged too
create or replace function public.log_chat_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.chat_moderation_log (actor_id, actor_role, action, booking_id, details)
  values (new.reporter_id, coalesce(public.chat_role(new.booking_id), 'user'), 'chat_reported', new.booking_id, left(new.reason, 500));
  return new;
end;
$$;
drop trigger if exists chat_reports_log on public.chat_reports;
create trigger chat_reports_log after insert on public.chat_reports
  for each row execute function public.log_chat_report();

-- ===== Chat access requires a verified payment =====
-- payment_status can only be set to 'paid' by the server after Razorpay's signature is verified
-- (browser writes are blocked by bookings_guard). The chat is readable/writable only while the
-- booking is Paid AND Confirmed/Completed with a therapist assigned. Failed, pending, cancelled
-- or refunded bookings have no chat access at all - not even to old messages.
create or replace function public.chat_can_view(p_booking uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select b.payment_status = 'paid' and b.status in ('confirmed', 'completed') and b.therapist_id is not null
    from public.bookings b where b.id = p_booking
  ), false)
$$;

drop policy if exists "messages: participants and admin read" on public.messages;
create policy "messages: participants and admin read" on public.messages
  for select using (
    (public.chat_role(booking_id) is not null and public.chat_can_view(booking_id)) or public.is_admin()
  );

create or replace function public.mark_chat_read(p_booking uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.chat_role(p_booking) is null or not public.chat_can_view(p_booking) then return; end if;
  update public.messages set read_at = now()
  where booking_id = p_booking and sender_id <> auth.uid() and read_at is null;
end;
$$;
grant execute on function public.mark_chat_read(uuid) to authenticated;

drop policy if exists "chat images: read" on storage.objects;
create policy "chat images: read" on storage.objects for select to authenticated
  using (bucket_id = 'chat-images'
         and ((public.chat_role(((storage.foldername(name))[1])::uuid) is not null
               and public.chat_can_view(((storage.foldername(name))[1])::uuid))
              or public.is_admin()));
