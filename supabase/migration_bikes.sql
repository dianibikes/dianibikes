-- ==========================================================================
-- Diani Bikes — "bikes" table (rental fleet + rates, managed from the admin)
-- Run this ONCE in the Supabase SQL Editor.
-- ==========================================================================

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

alter table bikes enable row level security;

create policy "public read" on bikes for select using (true);
create policy "admin write" on bikes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------- seed: the four bikes currently hard-coded on rentals.html ----------

insert into bikes (id, name, tag_label, description, image, half_day_rate, full_day_rate, sort_order) values
  ('electric', 'Electric Bike', 'Electric',
   'A smooth, easy ride perfect for covering long distances and tackling hills with ease.',
   '../images/rental-electric.svg', 1500, 2000, 1),
  ('mountain', 'Mountain Bike', 'Mountain',
   'Built for rugged terrain and adventurous trails — for thrill-seekers and off-road enthusiasts.',
   '../images/rental-mountain.svg', 1000, 1500, 2),
  ('manual', 'Manual Bike', 'Manual',
   'A reliable, enjoyable way to explore — perfect for leisurely rides along the beach or through town.',
   '../images/rental-manual.svg', 500, 750, 3),
  ('kids', 'Kids Bike', 'Kids',
   'Designed for safety and fun, perfect for young riders — explore together and create memories.',
   '../images/rental-kids.svg', 750, 1000, 4)
on conflict (id) do nothing;
