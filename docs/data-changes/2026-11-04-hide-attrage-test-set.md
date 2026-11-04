# 2026-11-04: hide the Attrage external test set

**Why:** `pro_review_scores` id 914 (Mitsubishi Attrage, 2.5/10) is a Car and Driver review of the
US **Mirage hatchback** (`/mitsubishi/mirage`, headline "2024 Mitsubishi Mirage"), not the Attrage
sedan sold in Israel. With the new 1.5-point cap on the distance between the shown score and the
external tests, this wrong test would pull the Attrage score from 5.9 to 4.0. Approved by the owner
in the Claude session on 4 Nov 2026.

**Change (one row):**

```sql
UPDATE pro_review_scores SET hidden = 1 WHERE id = 914 AND make_slug = 'mitsubishi' AND model_slug = 'attrage';
```

**Before:** `hidden = NULL` (score 2.5, years 2013-2024, assessment_level range, set_index 0).

**Rollback:**

```sql
UPDATE pro_review_scores SET hidden = NULL WHERE id = 914;
```

Effect: Attrage has no external test score; its shown score is the base 7.4 (no owner reviews).
