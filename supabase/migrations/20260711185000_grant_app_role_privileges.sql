grant usage on schema public to anon, authenticated;

grant select on public.campsites to anon, authenticated;
grant insert, update, delete on public.campsites to authenticated;

grant select on public.campsite_photos to anon, authenticated;
grant insert, update, delete on public.campsite_photos to authenticated;

grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

grant select on public.favorites to authenticated;
grant insert, delete on public.favorites to authenticated;

grant select on public.user_roles to authenticated;

grant execute on function public.is_admin() to authenticated;
