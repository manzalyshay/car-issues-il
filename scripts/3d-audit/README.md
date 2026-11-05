# 3D model check

Run every 3 days by a scheduled Claude task. Steps:

1. Export from production D1 (database `090762ad-b029-4883-b827-9376cdee1ed2`) into two JSON files:
   `SELECT make_slug, model_slug, sketchfab_uid, sketchfab_name, year_from, year_to FROM car_3d_models WHERE hidden IS NOT 1`
   and `SELECT make_slug || '/' || slug AS k, active_vehicles_il AS n FROM car_models`.
2. `python3 -I scripts/3d-audit/audit.py models.json counts.json issues.json` lists broken, crude, heavy (>20 MB)
   and missing models, busiest cars first, skipping `reviewed.json`.
3. For each issue: `python3 -I scripts/3d-audit/search.py '<title regex>' "<query>" ...` finds candidates (uid, faces, MB, likes).
   `python3 -I scripts/3d-audit/grid.py out.png <current uid> <candidate uids...>` draws thumbnails to compare
   (`NOCUR=1` when there is no current model). Look at the image before choosing.
4. Choose: right car and generation, textured, not shown tiny/unfinished in the preview, ideally under 12 MB.
   Prefer replacing over hiding; hide only when the model is broken or the wrong car and nothing usable exists.
   When nothing is better, add the uid to `reviewed.json` so it isn't flagged again.
5. Apply in D1 with `UPDATE car_3d_models SET sketchfab_uid, sketchfab_name, sketchfab_author, license ... WHERE make_slug AND model_slug AND sketchfab_uid = '<old>'`
   (or `hidden = 1`, or `INSERT` for a missing car), then record every change with rollback SQL in
   `docs/data-changes/<date>-3d-model-check.md`.
