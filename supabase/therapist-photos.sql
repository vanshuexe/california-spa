
-- ===== Therapist photos (admin uploads, public can view) =====
-- Public bucket: the photo URLs saved in public.therapists.photo load for everyone, including the
-- booking page. Only admins can add / replace / delete files. Size and type are enforced here too.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('therapist-photos', 'therapist-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "therapist photos: admin insert" on storage.objects;
create policy "therapist photos: admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'therapist-photos' and public.is_admin());
drop policy if exists "therapist photos: admin update" on storage.objects;
create policy "therapist photos: admin update" on storage.objects for update to authenticated
  using (bucket_id = 'therapist-photos' and public.is_admin());
drop policy if exists "therapist photos: admin delete" on storage.objects;
create policy "therapist photos: admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'therapist-photos' and public.is_admin());
drop policy if exists "therapist photos: public read" on storage.objects;
create policy "therapist photos: public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'therapist-photos');

-- Rename a therapist without breaking bookings: bookings store the therapist's name as text.
create or replace function public.admin_rename_therapist(p_id text, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare v_old text;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_name is null or btrim(p_name) = '' then raise exception 'Name is required'; end if;
  select name into v_old from public.therapists where id = p_id;
  if not found then raise exception 'Therapist not found'; end if;
  perform set_config('app.trusted', '1', true);
  update public.therapists set name = btrim(p_name) where id = p_id;
  update public.bookings set therapist = btrim(p_name)
    where therapist_id = p_id or (therapist_id is null and therapist = v_old);
end;
$$;
grant execute on function public.admin_rename_therapist(text, text) to authenticated;
