-- ==========================================================================
-- Diani Bikes - adds editable resident/non-resident prices to tours (shown
-- on tour cards and each tour's own page). Run this ONCE in the Supabase
-- SQL Editor for projects that already ran schema.sql before these columns
-- were added.
-- ==========================================================================

alter table tours add column if not exists resident_price int;      -- Kes, for Kenyan/EAC residents
alter table tours add column if not exists non_resident_price int;  -- USD, for foreign visitors
