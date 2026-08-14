-- ==========================================================================
-- Diani Bikes — Supabase schema, RLS policies, and storage bucket
-- Run this ONCE in the Supabase SQL Editor, before running seed_data.sql.
-- ==========================================================================

create extension if not exists pgcrypto;

-- ============================== tables ==============================

create table if not exists tours (
  id            text primary key,
  category      text not null,
  title         text not null,
  location_tags text[] default '{}',
  description   text,
  itinerary     text,
  included      text[] default '{}',
  excluded      text[] default '{}',
  carry         text[] default '{}',
  images        text[] default '{}',
  status        text default 'Published',
  created_at    timestamptz not null default now()
);

create table if not exists bikes (
  id             text primary key,   -- slug, also used as the booking form field name (qty_<id>)
  name           text not null,
  tag_label      text,
  description    text,
  image          text,
  half_day_rate  int,
  full_day_rate  int,
  sort_order     int default 0,
  status         text default 'Published',
  created_at     timestamptz not null default now()
);

create table if not exists bookings (
  id                  uuid primary key default gen_random_uuid(),
  type                text not null check (type in ('tour','rental')),
  interest            text,
  name                text not null,
  email               text,
  whatsapp            text,
  date                date,
  guests              int,
  office              text,
  duration            text,
  bikes               jsonb,
  status              text not null default 'New',
  payment_status      text not null default 'Not Paid',
  reschedule_history  jsonb,
  cancellation_reason text,
  cancelled_at        timestamptz,
  submitted_at        timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create table if not exists team (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  designation  text,
  photo        text,
  bio          text default '',
  created_at   timestamptz not null default now()
);

create table if not exists gallery (
  id          uuid primary key default gen_random_uuid(),
  image       text not null,
  caption     text,
  tags        text[] default '{}',
  created_at  timestamptz not null default now()
);

create table if not exists partners (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  logo        text,
  created_at  timestamptz not null default now()
);

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  reviewer    text not null,
  quote       text not null,
  rating      int check (rating between 1 and 5),
  source      text,
  created_at  timestamptz not null default now()
);

create table if not exists faqs (
  id          uuid primary key default gen_random_uuid(),
  page        text not null,
  question    text not null,
  answer      text not null,
  created_at  timestamptz not null default now()
);

create table if not exists seo (
  id                text primary key,
  page              text not null,
  label             text not null,
  url               text not null,
  title             text,
  description       text,
  draft_title       text,
  draft_description text,
  created_at        timestamptz not null default now()
);

-- ============================== RLS ==============================

alter table tours    enable row level security;
alter table bikes    enable row level security;
alter table bookings enable row level security;
alter table team     enable row level security;
alter table gallery  enable row level security;
alter table partners enable row level security;
alter table reviews  enable row level security;
alter table faqs     enable row level security;
alter table seo      enable row level security;

-- Public content: anyone can read, only logged-in admin can write.
create policy "public read" on tours    for select using (true);
create policy "admin write" on tours    for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read" on bikes    for select using (true);
create policy "admin write" on bikes    for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read" on team     for select using (true);
create policy "admin write" on team     for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read" on gallery  for select using (true);
create policy "admin write" on gallery  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read" on partners for select using (true);
create policy "admin write" on partners for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read" on reviews  for select using (true);
create policy "admin write" on reviews  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read" on faqs     for select using (true);
create policy "admin write" on faqs     for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Bookings: the public site can create a booking (contact/booking forms) but
-- never read, edit, or delete any booking — only the logged-in admin can.
create policy "public insert" on bookings for insert with check (true);
create policy "admin manage"  on bookings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- SEO drafts: admin-only, no public access at all.
create policy "admin only" on seo for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================== storage ==============================

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "public read media" on storage.objects
  for select using (bucket_id = 'media');

create policy "admin write media" on storage.objects
  for all using (bucket_id = 'media' and auth.role() = 'authenticated')
  with check (bucket_id = 'media' and auth.role() = 'authenticated');
