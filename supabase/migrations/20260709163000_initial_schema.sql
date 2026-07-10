create extension if not exists pgcrypto;

create table if not exists public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	full_name text,
	avatar_url text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
	user_id uuid not null references auth.users (id) on delete cascade,
	role text not null check (role in ('user', 'admin')),
	created_at timestamptz not null default now(),
	primary key (user_id, role)
);

create table if not exists public.campsites (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	title text not null,
	description text not null,
	location_name text not null,
	latitude numeric(10, 7),
	longitude numeric(10, 7),
	price_per_night numeric(10, 2),
	has_water boolean not null default false,
	has_electricity boolean not null default false,
	has_toilet boolean not null default false,
	has_shower boolean not null default false,
	has_wifi boolean not null default false,
	pets_allowed boolean not null default false,
	positive_notes text,
	negative_notes text,
	review_status text not null default 'pending' check (review_status in ('pending', 'published', 'rejected')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.campsite_photos (
	id uuid primary key default gen_random_uuid(),
	campsite_id uuid not null references public.campsites (id) on delete cascade,
	owner_id uuid not null references auth.users (id) on delete cascade,
	file_path text not null,
	public_url text,
	created_at timestamptz not null default now()
);

create table if not exists public.favorites (
	user_id uuid not null references auth.users (id) on delete cascade,
	campsite_id uuid not null references public.campsites (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (user_id, campsite_id)
);

create table if not exists public.reviews (
	id uuid primary key default gen_random_uuid(),
	campsite_id uuid not null references public.campsites (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,
	rating int not null check (rating between 1 and 5),
	comment text,
	created_at timestamptz not null default now(),
	unique (campsite_id, user_id)
);

create index if not exists idx_campsites_owner_id on public.campsites (owner_id);
create index if not exists idx_campsites_review_status on public.campsites (review_status);
create index if not exists idx_campsite_photos_owner_id on public.campsite_photos (owner_id);
create index if not exists idx_campsite_photos_campsite_id on public.campsite_photos (campsite_id);
create index if not exists idx_favorites_campsite_id on public.favorites (campsite_id);
create index if not exists idx_reviews_campsite_id on public.reviews (campsite_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_campsites_set_updated_at on public.campsites;
create trigger trg_campsites_set_updated_at
before update on public.campsites
for each row
execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.user_roles ur
		where ur.user_id = auth.uid()
			and ur.role = 'admin'
	);
$$;

grant execute on function public.is_admin() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.campsites enable row level security;
alter table public.campsite_photos enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
on public.profiles
for select
to public
using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can view own roles, admins all" on public.user_roles;
create policy "Users can view own roles, admins all"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Published campsites are public" on public.campsites;
create policy "Published campsites are public"
on public.campsites
for select
to public
using (
	review_status = 'published'
	or auth.uid() = owner_id
	or public.is_admin()
);

drop policy if exists "Authenticated users can create campsites" on public.campsites;
create policy "Authenticated users can create campsites"
on public.campsites
for insert
to authenticated
with check (
	auth.uid() is not null
	and auth.uid() = owner_id
);

drop policy if exists "Owners and admins can update campsites" on public.campsites;
create policy "Owners and admins can update campsites"
on public.campsites
for update
to authenticated
using (auth.uid() = owner_id or public.is_admin())
with check (auth.uid() = owner_id or public.is_admin());

drop policy if exists "Owners and admins can delete campsites" on public.campsites;
create policy "Owners and admins can delete campsites"
on public.campsites
for delete
to authenticated
using (auth.uid() = owner_id or public.is_admin());

drop policy if exists "Published campsite photos are public" on public.campsite_photos;
create policy "Published campsite photos are public"
on public.campsite_photos
for select
to public
using (
	exists (
		select 1
		from public.campsites c
		where c.id = campsite_photos.campsite_id
			and c.review_status = 'published'
	)
	or auth.uid() = owner_id
);

drop policy if exists "Owners can insert own campsite photos" on public.campsite_photos;
create policy "Owners can insert own campsite photos"
on public.campsite_photos
for insert
to authenticated
with check (
	auth.uid() = owner_id
	and exists (
		select 1
		from public.campsites c
		where c.id = campsite_photos.campsite_id
			and c.owner_id = auth.uid()
	)
);

drop policy if exists "Owners can update own campsite photos" on public.campsite_photos;
create policy "Owners can update own campsite photos"
on public.campsite_photos
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete own campsite photos" on public.campsite_photos;
create policy "Owners can delete own campsite photos"
on public.campsite_photos
for delete
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Users can view own favorites" on public.favorites;
create policy "Users can view own favorites"
on public.favorites
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own favorites" on public.favorites;
create policy "Users can insert own favorites"
on public.favorites
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own favorites" on public.favorites;
create policy "Users can delete own favorites"
on public.favorites
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Published campsite reviews are public" on public.reviews;
create policy "Published campsite reviews are public"
on public.reviews
for select
to public
using (
	exists (
		select 1
		from public.campsites c
		where c.id = reviews.campsite_id
			and c.review_status = 'published'
	)
	or auth.uid() = user_id
);

drop policy if exists "Authenticated users can create reviews" on public.reviews;
create policy "Authenticated users can create reviews"
on public.reviews
for insert
to authenticated
with check (
	auth.uid() = user_id
	and exists (
		select 1
		from public.campsites c
		where c.id = reviews.campsite_id
			and c.review_status = 'published'
	)
);

drop policy if exists "Users can update own reviews" on public.reviews;
create policy "Users can update own reviews"
on public.reviews
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own reviews" on public.reviews;
create policy "Users can delete own reviews"
on public.reviews
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('campsite-images', 'campsite-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Public can view campsite images" on storage.objects;
create policy "Public can view campsite images"
on storage.objects
for select
to public
using (bucket_id = 'campsite-images');

drop policy if exists "Authenticated users can upload own campsite images" on storage.objects;
create policy "Authenticated users can upload own campsite images"
on storage.objects
for insert
to authenticated
with check (
	bucket_id = 'campsite-images'
	and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own campsite images" on storage.objects;
create policy "Users can update own campsite images"
on storage.objects
for update
to authenticated
using (
	bucket_id = 'campsite-images'
	and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
	bucket_id = 'campsite-images'
	and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own campsite images" on storage.objects;
create policy "Users can delete own campsite images"
on storage.objects
for delete
to authenticated
using (
	bucket_id = 'campsite-images'
	and (storage.foldername(name))[1] = auth.uid()::text
);
