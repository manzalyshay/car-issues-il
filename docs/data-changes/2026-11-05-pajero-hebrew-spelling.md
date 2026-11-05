# 2026-11-05: spell Pajero the way Israelis search for it

**Why:** Search Console (Aug–Nov 2026) shows people search "מיצובישי פאג רו 2026 מחיר" (147
impressions), "מיצובישי פאג'רו 2026 מחיר" (43) and "מיצובישי פאג'רו 2026" (36), always with an א.
The site wrote "פג׳רו" without one. The Pajero Sport Intense trim page ranks around position 10 for
these searches. Requested by the owner in the Claude session on 5 Nov 2026.

**Change (two rows):**

```sql
UPDATE car_models SET name_he = 'פאג׳רו' WHERE make_slug = 'mitsubishi' AND slug = 'pajero';
UPDATE car_models SET name_he = 'פאג׳רו ספורט' WHERE make_slug = 'mitsubishi' AND slug = 'pajero-sport';
```

**Before:** `pajero` = `פג׳רו`, `pajero-sport` = `פג׳רו ספורט`.

**Effect:** Titles, headings, breadcrumbs and compare pages for both models use the new spelling.
URLs (slugs) don't change. The seed scripts were updated to match.

**Rollback:**

```sql
UPDATE car_models SET name_he = 'פג׳רו' WHERE make_slug = 'mitsubishi' AND slug = 'pajero';
UPDATE car_models SET name_he = 'פג׳רו ספורט' WHERE make_slug = 'mitsubishi' AND slug = 'pajero-sport';
```
