-- ==========================================================================
-- Diani Bikes - adds an editable limited-time offer to tours: a percent-off
-- discount applied to the resident/non-resident prices, with an optional
-- date range. Run this ONCE in the Supabase SQL Editor for projects that
-- already ran schema.sql before these columns were added.
-- ==========================================================================

alter table tours add column if not exists offer_percent   int;   -- e.g. 20 for 20% off; null = no offer
alter table tours add column if not exists offer_starts_on date;  -- optional; offer is active immediately if blank
alter table tours add column if not exists offer_ends_on   date;  -- optional; offer never expires on its own if blank
