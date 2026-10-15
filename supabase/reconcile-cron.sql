
-- ===== Payment reconciliation (never lose a paid booking) =====
-- 1) Every minute the server asks Razorpay which of our open orders were actually paid and records them
--    (edge function reconcile-payments). This works even if the customer's browser never reported success
--    (common with UPI apps) and even if the Razorpay webhook is not configured.
-- 2) An unpaid hold is not released while a checkout was opened in the last 60 minutes.

create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.unschedule('reconcile-razorpay') where exists (select 1 from cron.job where jobname = 'reconcile-razorpay');
select cron.schedule(
  'reconcile-razorpay',
  '* * * * *',
  $$ select net.http_post(
       url := 'https://ndmmsnrbehwwuljfubik.supabase.co/functions/v1/reconcile-payments',
       headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'f13fe545cfd76c13fddd64d2abcc3e1bc0e35c813110d0a2'),
       body := '{}'::jsonb
     ) $$
);

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
                       where p.booking_id = b.id and p.status = 'created' and p.created_at > now() - interval '60 minutes')
    returning b.id
  )
  select count(*) into v_count from x;
  return v_count;
end;
$$;
grant execute on function public.expire_stale_holds() to anon, authenticated, service_role;
