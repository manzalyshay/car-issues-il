# 2026-11-07: scheduled 3D model check

Vehicle counts: refreshed by the il-fleet-counts workflow on 2026-11-07 (all 370 models dated 2026-11-07).

Audit (scripts/3d-audit/audit.py): no broken, crude or heavy models among the shown ones. The first run
flagged 15 models as "broken", but all of them load fine: Sketchfab was rate-limiting the parallel
requests. audit.py now uses 4 parallel requests, retries, and only treats a 404 as broken.

Popular cars (over 5,000 on the road) with no 3D model: 4 added (car_3d_models INSERT):

| Car | On the road | Added uid / name |
|---|---|---|
| renault/fluence | 13,868 | 473adbb15922457bb9fa247bc89c4cb9 Renault Fluence (Nieve5677), 4.6 MB |
| hyundai/getz | 10,613 | a82f0f2d937e4cf694c2de7cdbfba093 Hyundai Getz 2006 (Nieve5677), 4.8 MB |
| jaecoo/jaecoo8 | 8,257 | 20f044e40d5247fc8322e9b429650580 Jaecoo J8 (GARAGISTA), 3.3 MB |
| citroen/jumpy | 5,562 | b1d729de93d94bbf993ce51f35a48e3c Citroen SpaceTourer MPV (Vaidanshi), 10.4 MB (same body as the Jumpy van) |

Left without a model (added to reviewed.json missing_ok): chery/omoda-fx (only the petrol Omoda 5 exists,
different front), mg/ehs (previews tiny / next generation), geely/geometry-c, xpeng/g6, mg/mgs9 (none on Sketchfab).

Rollback: `DELETE FROM car_3d_models WHERE sketchfab_uid IN ('473adbb15922457bb9fa247bc89c4cb9','a82f0f2d937e4cf694c2de7cdbfba093','20f044e40d5247fc8322e9b429650580','b1d729de93d94bbf993ce51f35a48e3c');`
