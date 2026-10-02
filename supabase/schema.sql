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
