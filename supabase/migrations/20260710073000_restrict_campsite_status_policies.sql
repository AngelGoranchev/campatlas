drop policy if exists "Authenticated users can create campsites" on public.campsites;
drop policy if exists "Authenticated users can create pending campsites" on public.campsites;

create policy "Authenticated users can create pending campsites"
on public.campsites
for insert
to authenticated
with check (
    auth.uid() is not null
    and auth.uid() = owner_id
    and review_status = 'pending'
);

drop policy if exists "Owners and admins can update campsites" on public.campsites;
drop policy if exists "Owners can update own pending or rejected campsites" on public.campsites;
drop policy if exists "Admins can update all campsites" on public.campsites;

create policy "Owners can update own pending or rejected campsites"
on public.campsites
for update
to authenticated
using (
    auth.uid() = owner_id
    and review_status in ('pending', 'rejected')
)
with check (
    auth.uid() = owner_id
    and review_status in ('pending', 'rejected')
);

create policy "Admins can update all campsites"
on public.campsites
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());