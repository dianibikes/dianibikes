# Diani Bikes — Website Redesign Build Prompt

**Source site:** https://dianibikes-tours.com/
**Purpose of this doc:** Portable build prompt for Claude Code / Lovable / v0 to redesign the existing Diani Bikes WordPress site as a clean, cohesive, standalone build. Preserve all real business content below — only the design system, layout, and structure are changing.

---

## 1. Business Summary

Diani Bikes ("A Cultural Adventure") is a bike tour, rental, and excursion operator serving **Diani, Watamu, and Kilifi** on the Kenyan coast. Services span guided bike tours, bike rentals (mountain + electric), tuk tuk tours, marine excursions (dolphin watching, mangrove sundowners, camel rides, beach tours), and forest excursions. Positioned as a local, culturally-immersive, eco-friendly adventure operator — not a generic rental shop.

**Founder / Team Leader:** Masha Kirao
**Mission (keep, tighten copy):** "To inspire and empower adventurers of all ages and abilities to discover the wonders of the Coast in a fun, eco-friendly, and authentic way — on two wheels, where every pedal stroke brings you closer to nature, culture, and unforgettable memories."

**Contact details (real — preserve exactly):**
- Phone: +254 713 959668
- Email: info@dianibike-tours.com
- Diani address: Diani Bazaar
- Watamu address: Jiweleupe
- Hours: Monday–Saturday, 8am–6pm; Sunday Closed

**Social proof:** TripAdvisor rating "Good," 59 reviews. Named reviewers/snippets available on current site if you want to keep real testimonials (recommend keeping 3, reformatted, rather than the awkward carousel).

**Stats bar (current, reuse or refresh):** 10+ Years of Experience · 1,000+ Tours & Excursions Done · 4,500+ Happy Customers · 240 Projects Completed

---

## 2. What's Wrong With the Current Site (design diagnosis)

1. **No coherent color system** — blue, hot pink, and yellow are the official Diani Bikes brand colors (confirmed), but they're currently all used as "primary" at different points with no hierarchy — nothing reads as *the* lead color, and there's no consistent logic for when each one appears.
2. **Inconsistent card/button styles** — tour cards look different on the Bike Tours page vs. Marine Excursions page vs. the homepage. Button styles vary (pink solid, gray solid, outline) with no logic to which is primary/secondary.
3. **Hero image is a poor crop** — the homepage hero (a group photo, tightly cropped, awkward framing) doesn't sell the destination or the activity. Other page heroes (Bike Tours, Tuk Tuk, Marine Excursions) are much stronger and should set the bar.
4. **Gallery page is broken** — currently just an empty page with a "Follow on Instagram" button and no images. This is a dead page on a site whose whole value proposition is visual (bikes, beaches, wildlife, culture).
5. **Team section undermines credibility** — 11 near-identical ID-photo-style headshots, most just labeled "Tour Guide" with no names, inconsistent backgrounds (studio white, warm cream, random purple/pink). Reads as filler rather than "meet real local guides."
6. **Generic WordPress theme feel** — default CreativeThemes styling, no custom typography pairing, no distinctive visual identity that reflects "coastal cultural adventure."
7. **Redundant/competing CTAs** — floating chat bubble + "Contact us" pill + page-specific "Book Now"/"Explore"/"Read More" buttons all compete for attention with no clear primary action.
8. **Duplicate/near-duplicate pages** — Marine Excursions page appears twice in the current capture with identical content, suggesting possible template duplication to check during rebuild.

---

## 3. Redesign Direction

**Brand feel:** Warm, coastal, adventure-forward — closer to the Aqua Ventures / Ma Ajab Tours visual language than to a generic WordPress travel theme. Think sun-bleached earth tones, ocean blue as an accent (not the whole palette), and confident photography given full-bleed space to breathe.

**Proposed palette** — built from the official Diani Bikes brand colors (blue, pink, yellow), given a clear hierarchy instead of being used interchangeably:
- Primary: brand blue (`#1E6FD9`–`#1B5FBF` range, matched to current logo/link blue) — for primary CTAs, links, and headline accents
- Secondary/accent: brand pink (`#E8397C`–`#D62A6E` range, matched to current "dianibikes" wordmark pink) — used sparingly, for highlights, tags, and secondary accents only, not competing buttons
- Tertiary accent: brand yellow (`#F5C518`–`#F2B705` range, matched to current CTA-pill yellow) — reserved for small high-attention moments (badges, icon fills, the guide-uniform yellow tying visually back to real photos) rather than large blocks or button fills
- Neutral base: warm off-white/sand (`#FAF6F0`), deep charcoal or navy for text and dark sections (`#1B2733`)
- Rule going forward: **one primary color drives all main CTAs site-wide** (recommend blue, since it's the logo/link color); pink and yellow become supporting accents, not competing "primary" buttons

**Typography:** One display serif or characterful heading font (e.g. Fraunces, Playfair Display) + one clean sans body font (e.g. DM Sans, Inter) — same pairing logic used successfully on prior coastal-tourism builds. No more than two font families total.

**Photography-first layout:** This business's strongest asset is its real, candid photography (village tours, elephants, dolphins, giraffes). Design should give hero images and gallery images generous full-bleed space rather than boxing everything into small uniform cards.

**Fix the broken Gallery page** — build an actual masonry/grid gallery using the real photos already scattered across the site (village tour, elephant, giraffe, dolphin/marine, camel, mangrove sunset, bike tours) instead of an empty page.

**Simplify CTAs to one clear hierarchy** — a single consistent primary button style ("Book Now") used everywhere, one WhatsApp/contact floating button (not two competing widgets), secondary "Learn More" as text-link or outline style only.

**Team section** — either get real names + one-line bios for each guide, or replace the repetitive grid with a smaller, warmer "Meet the Team" section (3–4 featured guides with names, not 11 unlabeled headshots).

---

## 4. Site Structure (pages to build)

1. **Home** — Hero (strong destination photo, not the awkward crop), intro line, tour guide booking highlights (Cultural/Sunset/Camel), bike rental teaser (Mountain/Electric), bike tours & excursions teaser, gallery preview strip, testimonials (3, real), stats bar, contact CTA section.
2. **Bike Tours** — Intro copy (keep, lightly tighten), grid of tour cards: Village Guided Bike Tour, Kaya Kinondo Sacred Forest, Giraffe Feeding Adventure, Elephant Sporting, Bush Tour. Each card: image, title, category tags, short teaser, "Read More" → detail page or modal.
3. **Rentals** — Mountain Bikes, Electric Bike, "included with every rental" (helmet, lock, optional front basket), pricing if available, "View all bikes" CTA.
4. **Tuk Tuk Experience** — Same tour set as Bike Tours but framed as tuk tuk transport option; intro copy explaining the tuk tuk vs. bike distinction.
5. **Marine Excursions** — Mangrove Tour (Sundowner), Full Day Private Dolphin Tour, Camel Adventure, Beach Tour. (Check and remove the duplicate render of this page found in the current site.)
6. **Forest Excursions** — (existing nav item — pull content from Kaya Kinondo/Bush Tour material if this is currently just cross-listed rather than a dedicated page)
7. **About** — Welcome/Vision, Mission + founder quote (Masha Kirao), Our Services (Bike Excursions, Bike Rentals, Day Trips), FAQ (What bikes do you rent, Are helmets provided, Do you provide guided tours, Can I customize a day trip — keep existing Q&A copy), simplified Team section.
8. **Gallery** — Real photo grid (currently missing — highest-priority fix).
9. **Contact** — "We make booking fast & easy" intro, phone/email/addresses/hours block, contact form (Name, Email, Subject, Message), embedded map for Diani Bazaar location.

---

## 5. Booking Form Backend

Not yet decided — same open decision as prior builds:
- **Simple option:** Formspree or EmailJS (no backend, fast to ship, fine for a contact/inquiry form at this volume)
- **If M-Pesa/booking-with-payment is ever needed later:** Supabase + Daraja API, matching the pattern used on FundiFinder/PROPMS — but likely overkill for this site unless direct online payment becomes a requirement.

Recommend Formspree/EmailJS for this build unless told otherwise.

---

## 6. Tech Stack

Recommend **static HTML/CSS/JS**, delivered as standalone files — consistent with the Aqua Ventures and Ma Ajab builds, easiest to hand off to a WordPress-averse client or host anywhere (including replacing the current WordPress instance directly). Use React/Vercel only if the client specifically wants component reuse across a larger multi-property portfolio later.

---

## 7. Build Instructions for Claude Code

> Build a redesigned multi-page static website for Diani Bikes based on the brand direction, page structure, and real content specified above. Use semantic HTML5, mobile-first responsive CSS (flexbox/grid), and vanilla JS for any interactivity (mobile nav, gallery lightbox, testimonial carousel). Follow the palette and typography direction in Section 3 — use the official Diani Bikes blue/pink/yellow brand colors with the hierarchy specified (blue primary, pink and yellow as supporting accents), not a replacement palette. Fix the broken Gallery page with a real image grid. Consolidate CTA styling to one primary button pattern site-wide. Do not fabricate contact details, hours, or pricing beyond what's listed in Section 1 — flag anything missing as a placeholder for the client to fill in.
