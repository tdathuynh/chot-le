-- =====================================================================
--  Ăn Gì HCM — Supabase schema
--  Chạy toàn bộ file này 1 lần trong Supabase Dashboard → SQL Editor.
--  Người dùng (anon) chỉ ĐỌC quán đang hiển thị; chỉ admin được GHI.
-- =====================================================================

-- ---------- Bảng admin: user nào có mặt ở đây là admin ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- Danh mục (Bún/Phở, Cơm, Ốc, Cà phê...) ----------
create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  emoji text,
  sort_order int not null default 0
);
-- Icon Lucide (lucide.dev/icons, vd 'soup'); app hiển thị icon này, không dùng emoji.
alter table public.categories add column if not exists icon text;

-- ---------- Quán ----------
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  district text not null,                 -- 'Quận 1', 'Bình Thạnh', ...
  latitude double precision,
  longitude double precision,
  price_min int,                          -- VNĐ
  price_max int,                          -- VNĐ
  open_time time,
  close_time time,
  description text,                       -- nhận xét của admin
  phone text,
  google_maps_url text,
  cover_image_url text,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Nâng cấp bảng cũ (chạy lại an toàn): mục đích đi ăn (hẹn hò, đi nhóm…)
alter table public.places add column if not exists occasions text[] not null default '{}';
-- Tiện ích: máy lạnh, chỗ để xe, wifi…
alter table public.places add column if not exists amenities text[] not null default '{}';

create index if not exists places_district_idx on public.places (district);
create index if not exists places_published_idx on public.places (is_published);

-- Quán ↔ danh mục (nhiều-nhiều)
create table if not exists public.place_categories (
  place_id uuid not null references public.places (id) on delete cascade,
  category_id bigint not null references public.categories (id) on delete cascade,
  primary key (place_id, category_id)
);

-- Món ăn + giá từng món
create table if not exists public.dishes (
  id bigint generated always as identity primary key,
  place_id uuid not null references public.places (id) on delete cascade,
  name text not null,
  price int,                              -- VNĐ
  is_signature boolean not null default false,
  sort_order int not null default 0
);

-- Ảnh quán
create table if not exists public.place_photos (
  id bigint generated always as identity primary key,
  place_id uuid not null references public.places (id) on delete cascade,
  url text not null,
  storage_path text,                      -- để xóa file trong Storage
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Index cho khoá ngoại (Supabase advisor: unindexed_foreign_keys)
create index if not exists dishes_place_id_idx on public.dishes (place_id);
create index if not exists place_photos_place_id_idx on public.place_photos (place_id);
create index if not exists place_categories_category_id_idx on public.place_categories (category_id);

-- Tự cập nhật updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists places_touch on public.places;
create trigger places_touch before update on public.places
for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------
alter table public.admins           enable row level security;
alter table public.categories       enable row level security;
alter table public.places           enable row level security;
alter table public.place_categories enable row level security;
alter table public.dishes           enable row level security;
alter table public.place_photos     enable row level security;

-- admins: user chỉ xem được dòng của chính mình (để app biết mình có phải admin)
drop policy if exists "admins self read" on public.admins;
create policy "admins self read" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- categories: ai cũng đọc, admin ghi
drop policy if exists "categories read" on public.categories;
create policy "categories read" on public.categories
  for select to anon, authenticated using (true);
drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- places: ai cũng đọc quán đang hiển thị; admin đọc/ghi tất cả
drop policy if exists "places read published" on public.places;
create policy "places read published" on public.places
  for select to anon, authenticated using (is_published or public.is_admin());
drop policy if exists "places admin write" on public.places;
create policy "places admin write" on public.places
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- bảng con: đọc được nếu quán cha đọc được
drop policy if exists "place_categories read" on public.place_categories;
create policy "place_categories read" on public.place_categories
  for select to anon, authenticated using (
    exists (select 1 from public.places p where p.id = place_id and (p.is_published or public.is_admin()))
  );
drop policy if exists "place_categories admin write" on public.place_categories;
create policy "place_categories admin write" on public.place_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "dishes read" on public.dishes;
create policy "dishes read" on public.dishes
  for select to anon, authenticated using (
    exists (select 1 from public.places p where p.id = place_id and (p.is_published or public.is_admin()))
  );
drop policy if exists "dishes admin write" on public.dishes;
create policy "dishes admin write" on public.dishes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "photos read" on public.place_photos;
create policy "photos read" on public.place_photos
  for select to anon, authenticated using (
    exists (select 1 from public.places p where p.id = place_id and (p.is_published or public.is_admin()))
  );
drop policy if exists "photos admin write" on public.place_photos;
create policy "photos admin write" on public.place_photos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.categories, public.places, public.place_categories,
  public.dishes, public.place_photos to anon, authenticated;
grant insert, update, delete on public.categories, public.places, public.place_categories,
  public.dishes, public.place_photos to authenticated;
grant select on public.admins to authenticated;

-- ---------- Storage: bucket ảnh công khai, chỉ admin upload/xóa ----------
insert into storage.buckets (id, name, public)
values ('place-photos', 'place-photos', true)
on conflict (id) do nothing;

drop policy if exists "place-photos public read" on storage.objects;
create policy "place-photos public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'place-photos');
drop policy if exists "place-photos admin insert" on storage.objects;
create policy "place-photos admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'place-photos' and public.is_admin());
drop policy if exists "place-photos admin update" on storage.objects;
create policy "place-photos admin update" on storage.objects
  for update to authenticated using (bucket_id = 'place-photos' and public.is_admin());
drop policy if exists "place-photos admin delete" on storage.objects;
create policy "place-photos admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'place-photos' and public.is_admin());

-- ---------- Danh mục mẫu ----------
insert into public.categories (name, icon, sort_order) values
  ('Bún / Phở', 'soup', 1),
  ('Cơm', 'egg-fried', 2),
  ('Bánh mì', 'sandwich', 3),
  ('Ốc / Hải sản', 'shell', 4),
  ('Lẩu / Nướng', 'flame', 5),
  ('Ăn vặt', 'cookie', 6),
  ('Cà phê / Trà', 'coffee', 7),
  ('Chè / Tráng miệng', 'ice-cream-bowl', 8)
-- chỉ điền icon cho danh mục chưa có, không ghi đè icon admin đã đổi
on conflict (name) do update set icon = coalesce(public.categories.icon, excluded.icon);

-- =====================================================================
--  SAU KHI tạo tài khoản admin (Authentication → Users → Add user),
--  chạy lệnh sau, thay email của bạn:
--
--  insert into public.admins (user_id)
--  select id from auth.users where email = 'email-cua-ban@example.com';
-- =====================================================================
