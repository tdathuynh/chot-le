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

-- =====================================================================
--  TÍNH NĂNG CỘNG ĐỒNG (khách không cần đăng nhập)
--  Khách KHÔNG được đọc/ghi trực tiếp các bảng dưới đây (RLS chỉ cho admin đọc).
--  Mọi thao tác của khách đi qua hàm RPC security definer: hàm tự kiểm tra
--  dữ liệu, giới hạn số lượng và chỉ trả về đúng phần cần thiết.
--  `device` = mã ngẫu nhiên app tạo và lưu trên máy (không phải tài khoản).
-- =====================================================================

-- ---------- Ưu đãi độc quyền của quán (admin nhập) ----------
alter table public.places add column if not exists deal_title text;   -- vd 'Giảm 10% khi đưa app'
alter table public.places add column if not exists deal_until date;   -- hết hạn (null = không thời hạn)

-- ---------- Chọn quán cùng hội bạn (bình chọn qua link) ----------
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  creator_name text check (char_length(creator_name) <= 40),
  creator_device uuid not null,
  winner_place_id uuid references public.places (id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
create table if not exists public.poll_options (
  poll_id uuid not null references public.polls (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  sort_order int not null default 0,
  primary key (poll_id, place_id)
);
create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls (id) on delete cascade,
  voter_device uuid not null,
  voter_name text not null check (char_length(voter_name) between 1 and 40),
  place_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (poll_id, voter_device),
  foreign key (poll_id, place_id) references public.poll_options (poll_id, place_id) on delete cascade
);
create index if not exists polls_creator_idx on public.polls (creator_device, created_at);
create index if not exists polls_winner_idx on public.polls (winner_place_id);
create index if not exists poll_options_place_idx on public.poll_options (place_id);
create index if not exists poll_votes_option_idx on public.poll_votes (poll_id, place_id);

-- ---------- Khách gợi ý quán mới (admin duyệt) ----------
create table if not exists public.place_suggestions (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 120),
  maps_url text check (char_length(maps_url) <= 500),
  note text check (char_length(note) <= 500),
  device uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists place_suggestions_device_idx on public.place_suggestions (device, created_at);

-- ---------- Lượt xem / chỉ đường / gọi / chia sẻ (thống kê cho quán) ----------
create table if not exists public.place_events (
  id bigint generated always as identity primary key,
  place_id uuid not null references public.places (id) on delete cascade,
  kind text not null check (kind in ('view', 'directions', 'call', 'share')),
  created_at timestamptz not null default now()
);
create index if not exists place_events_place_time_idx on public.place_events (place_id, created_at);
create index if not exists place_events_time_idx on public.place_events (created_at);

alter table public.polls             enable row level security;
alter table public.poll_options      enable row level security;
alter table public.poll_votes        enable row level security;
alter table public.place_suggestions enable row level security;
alter table public.place_events      enable row level security;

-- Chỉ admin đọc trực tiếp; admin được xoá gợi ý/bình chọn rác.
drop policy if exists "polls admin" on public.polls;
create policy "polls admin" on public.polls
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "poll_options admin" on public.poll_options;
create policy "poll_options admin" on public.poll_options
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "poll_votes admin" on public.poll_votes;
create policy "poll_votes admin" on public.poll_votes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "place_suggestions admin" on public.place_suggestions;
create policy "place_suggestions admin" on public.place_suggestions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "place_events admin read" on public.place_events;
create policy "place_events admin read" on public.place_events
  for select to authenticated using (public.is_admin());

grant select, delete on public.polls, public.poll_options, public.poll_votes, public.place_suggestions to authenticated;
grant select on public.place_events to authenticated;

-- Tạo bình chọn: 2–8 quán đang hiển thị; tối đa 30 bình chọn / máy / ngày.
create or replace function public.create_poll(p_title text, p_creator_name text, p_device uuid, p_place_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_ids uuid[];
begin
  select array_agg(distinct x) into v_ids from unnest(p_place_ids) x;
  if p_device is null or coalesce(array_length(v_ids, 1), 0) not between 2 and 8 then
    raise exception 'Cần chọn từ 2 đến 8 quán';
  end if;
  if (select count(*) from public.places where id = any (v_ids) and is_published) <> array_length(v_ids, 1) then
    raise exception 'Có quán không tồn tại';
  end if;
  if (select count(*) from public.polls where creator_device = p_device and created_at > now() - interval '1 day') >= 30 then
    raise exception 'Bạn tạo quá nhiều bình chọn hôm nay';
  end if;
  insert into public.polls (title, creator_name, creator_device)
  values (left(coalesce(nullif(trim(p_title), ''), 'Đi ăn gì đây?'), 80), nullif(left(trim(p_creator_name), 40), ''), p_device)
  returning id into v_id;
  insert into public.poll_options (poll_id, place_id, sort_order)
  select v_id, x, ord::int from unnest(p_place_ids) with ordinality as t (x, ord)
  where x = any (v_ids)
  on conflict do nothing;
  return v_id;
end;
$$;

-- Xem bình chọn: không lộ mã máy của người khác, chỉ cho biết phiếu nào là của mình.
create or replace function public.get_poll(p_id uuid, p_device uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'creator_name', p.creator_name,
    'is_creator', p.creator_device = p_device,
    'winner_place_id', p.winner_place_id,
    'closed_at', p.closed_at,
    'expires_at', p.expires_at,
    'created_at', p.created_at,
    'options', coalesce((
      select jsonb_agg(jsonb_build_object(
        'place_id', o.place_id,
        'voters', coalesce((select jsonb_agg(v.voter_name order by v.created_at) from public.poll_votes v
                            where v.poll_id = o.poll_id and v.place_id = o.place_id), '[]'::jsonb),
        'mine', exists (select 1 from public.poll_votes v
                        where v.poll_id = o.poll_id and v.place_id = o.place_id and v.voter_device = p_device)
      ) order by o.sort_order)
      from public.poll_options o where o.poll_id = p.id
    ), '[]'::jsonb)
  )
  from public.polls p where p.id = p_id;
$$;

-- Bỏ phiếu (mỗi máy 1 phiếu, bấm quán khác là đổi phiếu).
create or replace function public.cast_vote(p_poll uuid, p_device uuid, p_name text, p_place uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_device is null or coalesce(trim(p_name), '') = '' then
    raise exception 'Cần nhập tên';
  end if;
  if not exists (select 1 from public.polls where id = p_poll and closed_at is null and expires_at > now()) then
    raise exception 'Bình chọn đã kết thúc';
  end if;
  if not exists (select 1 from public.poll_options where poll_id = p_poll and place_id = p_place) then
    raise exception 'Quán không có trong bình chọn';
  end if;
  insert into public.poll_votes (poll_id, voter_device, voter_name, place_id)
  values (p_poll, p_device, left(trim(p_name), 40), p_place)
  on conflict (poll_id, voter_device)
  do update set place_id = excluded.place_id, voter_name = excluded.voter_name, created_at = now();
end;
$$;

-- Chốt quán: chỉ người tạo.
create or replace function public.close_poll(p_poll uuid, p_device uuid, p_place uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.poll_options where poll_id = p_poll and place_id = p_place) then
    raise exception 'Quán không có trong bình chọn';
  end if;
  update public.polls set winner_place_id = p_place, closed_at = now()
  where id = p_poll and creator_device = p_device;
  if not found then
    raise exception 'Chỉ người tạo được chốt quán';
  end if;
end;
$$;

-- Gợi ý quán: tối đa 10 gợi ý / máy / ngày.
create or replace function public.suggest_place(p_name text, p_maps_url text, p_note text, p_device uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_device is null or coalesce(trim(p_name), '') = '' then
    raise exception 'Cần nhập tên quán';
  end if;
  if (select count(*) from public.place_suggestions where device = p_device and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Bạn đã gợi ý nhiều quán hôm nay, cảm ơn bạn!';
  end if;
  insert into public.place_suggestions (name, maps_url, note, device)
  values (left(trim(p_name), 120), nullif(left(trim(p_maps_url), 500), ''), nullif(left(trim(p_note), 500), ''), p_device);
end;
$$;

-- Ghi 1 sự kiện (chỉ quán đang hiển thị).
create or replace function public.track_event(p_place uuid, p_kind text)
returns void language sql security definer set search_path = '' as $$
  insert into public.place_events (place_id, kind)
  select p.id, p_kind from public.places p
  where p.id = p_place and p.is_published and p_kind in ('view', 'directions', 'call', 'share');
$$;

-- Thống kê theo quán trong N ngày: chỉ admin.
create or replace function public.place_stats(p_days int default 7)
returns table (place_id uuid, views bigint, directions bigint, calls bigint, shares bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Chỉ admin';
  end if;
  return query
  select e.place_id,
    count(*) filter (where e.kind = 'view'),
    count(*) filter (where e.kind = 'directions'),
    count(*) filter (where e.kind = 'call'),
    count(*) filter (where e.kind = 'share')
  from public.place_events e
  where e.created_at > now() - make_interval(days => greatest(1, least(p_days, 90)))
  group by e.place_id;
end;
$$;

-- "Đang hot": quán được quan tâm nhiều nhất 7 ngày (chỉ trả điểm tổng hợp, ai cũng xem được).
create or replace function public.trending_places(p_limit int default 10)
returns table (place_id uuid, score bigint)
language sql stable security definer set search_path = '' as $$
  select s.place_id, sum(s.pts)::bigint as score from (
    select e.place_id, case e.kind when 'view' then 1 else 3 end as pts
    from public.place_events e where e.created_at > now() - interval '7 days'
    union all
    select v.place_id, 2 from public.poll_votes v where v.created_at > now() - interval '7 days'
  ) s
  join public.places p on p.id = s.place_id and p.is_published
  group by s.place_id
  order by score desc
  limit greatest(1, least(p_limit, 20));
$$;

grant execute on function public.create_poll(text, text, uuid, uuid[]) to anon, authenticated;
grant execute on function public.get_poll(uuid, uuid) to anon, authenticated;
grant execute on function public.cast_vote(uuid, uuid, text, uuid) to anon, authenticated;
grant execute on function public.close_poll(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.suggest_place(text, text, text, uuid) to anon, authenticated;
grant execute on function public.track_event(uuid, text) to anon, authenticated;
grant execute on function public.trending_places(int) to anon, authenticated;
revoke execute on function public.place_stats(int) from public, anon;
grant execute on function public.place_stats(int) to authenticated;

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
