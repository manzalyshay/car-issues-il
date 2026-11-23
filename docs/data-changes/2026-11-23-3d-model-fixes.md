# 2026-11-23: 3D model fixes reported by the site owner

| Car | Problem | Change (car_3d_models) |
|---|---|---|
| chevrolet/trailblazer | Crashes the page on the owner's device. 1,366,304 faces, 33 textures, 10.4 MB geometry, so the audit's 20 MB "heavy" rule did not flag it. | Hid 61bfc85b4f654020abf6000f54a3f81a ("3D model of the Chevrolet Trailblazer", Romich81). No replacement: Sketchfab only has the 2003/2007 Trailblazer, a different car. |
| nissan/juke | The 2022 model has no wheels. 706,638 faces, 4.2 MB, so the audit never flagged it for a visual check. | Hid 106e353be6f947a89a13c2b9f6e792a9 ("2022 Nissan Juke", feyley'd). Added 7a1c7f0727b24b2bb07aef4b423fa3a3 ("Nissan Juke 2020", ecreators), 450,833 faces, 3.7 MB, for 2020 onward. |

Rejected for the Juke: be7be035cfcf4e78a0e246bc0b5607d3 ("Nissan Juke 2020", SQUIR3D): best looking, but 1.5M faces
(heavier than the Trailblazer model) and the author's name on the number plate.

Rollback:

```sql
UPDATE car_3d_models SET hidden = NULL, hidden_reason = NULL WHERE sketchfab_uid IN ('61bfc85b4f654020abf6000f54a3f81a', '106e353be6f947a89a13c2b9f6e792a9');
DELETE FROM car_3d_models WHERE make_slug = 'nissan' AND model_slug = 'juke' AND sketchfab_uid = '7a1c7f0727b24b2bb07aef4b423fa3a3';
```
