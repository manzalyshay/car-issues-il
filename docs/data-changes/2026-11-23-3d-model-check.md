# 2026-11-23: full 3D model check (pending approval)

First run of the updated check (scripts/3d-audit): every visible entry, not only the model-page one; heavy now also
means over 1M faces (or over 20 textures above 600k faces); every model gets one preview check.
All 582 visible models were looked at in contact sheets (scripts/3d-audit/sheet.py).

**Not applied yet**: production writes need the owner's go-ahead. Planned changes (car_3d_models):

| Car | Years | Page | On the road | Problem | uid |
|---|---|---|---|---|---|
| kia/sportage | 2018-2022 | year | 99,955 | over 20 MB (20.1 MB, 563696 faces) | 8f794775950041d7a9ae867e40646a33 |
| suzuki/sx4 | 2008-2013 | year | 50,032 | photo backdrop baked into the scan | 9e2d42b640eb4fda830eaf192b8e1c35 |
| hyundai/kona | 2022-2023 | year | 47,870 | over 20 MB (82.9 MB, 433170 faces) | 7d1d7fda8e0a445491ddff8634d8de95 |
| chevrolet/spark | 2009-2010 | year | 28,576 | flat untextured colours (toy look) | 131573e2229e47e7ac626328bebb1848 |
| toyota/land-cruiser | 2016-2016 | year | 27,702 | wrong body: 70-series pickup, not the SUV | 194b33a136f947b8aec574936aa8681e |
| toyota/verso | 2020- | model | 13,937 | wrong car: Proace City Verso van, not the Verso MPV | 751c7d18c05946d18ba7953dc046dec6 |
| dacia/duster | 2018-2023 | model | 13,429 | showroom scene baked in | a39e5e2fe34f45399e080f1491162898 |
| suzuki/ignis | 2016-2020 | year | 13,306 | loads upside down; 1.76M faces | 658003a99e5a4ee2a933172f11501b2a |
| hyundai/ix35 | 2009-2010 | year | 12,094 | flat untextured colours (toy look) | bf674c749d8548dbade14c113316f1e9 |
| toyota/aygo | 2005-2008 | year | 9,514 | flat untextured colours (toy look) | 5f8828645587439fa827cfab98a7c04f |
| toyota/aygo | 2009-2018 | year | 9,514 | photo scan with ground patch | aaf87da9481f46ccba404f3156c70d9b |
| mercedes/e-class | 2014-2021 | year | 8,263 | loose wheel floating beside the car | 4b966f58cd3c40f4810e9e5983795428 |
| honda/accord | 1978-1997 | year | 6,957 | over 20 MB (26.2 MB, 3631911 faces) | bb853259a542400eb3e6eaed0a4557a1 |
| volkswagen/passat | 2016-2018 | year | 6,836 | photo scan with ground patch | f946c79a2e534137a5ffd30aa0173566 |
| jeep/wrangler | 2021-2022 | year | 6,818 | over 20 MB (33.1 MB, 877914 faces) | 49a2914dff81428998a76a3043487404 |
| bmw/x5 | 2014-2014 | year | 3,306 | over 20 MB (98.3 MB, 12094544 faces) | e1b2382b65d542fea09ae27c53f82f4a |
| cupra/formentor | 2021-2021 | year | 1,876 | over 20 MB (31.8 MB, 1644165 faces) | 3674038309c84faa86c3be4642db2c27 |
| fiat/panda | - | model | 1,652 | wrong generation: 1980s Panda (page covers 2012+) | 38887c2e43294e34a2e032af23a64a80 |
| mercedes/gle-coupe | 2021- | model | 1,356 | outdoor scene baked in | ac4667c76f4e4e6c813ff3e72bc07ff8 |
| chevrolet/colorado | 2017-2017 | year | 206 | unfinished tuned truck (missing panels) | b6c9193bdfe545fbba8e90e9b60447e4 |
| mercedes/maybach-s | 2022- | model | 65 | floor scene baked in; 114 textures | 0136f984222c4f83b3b913cef8258a81 |
| kia/ceed | 2011-2012 | year | 18,201 | crude (26349 faces) | 04103fee156843fbaab438b565cf5523 |
| jeep/grand-cherokee | 2012-2012 | year | 8,171 | crude (16339 faces) | 73060e09d107476d809496e0b3216039 |
| porsche/macan | 2015-2016 | year | 589 | crude (16629 faces) | c73dcaa815fb43e19c8d4aac0acf55fc |
| jeep/renegade | 2015-2015 | year | 49 | crude (12172 faces) | 90b81540c5e349ec94d7323f170a136b |
| jeep/renegade | 2016-2020 | year | 49 | crude (4734 faces) | 192f7e81dce84c6780434f692a0f96c5 |

Plus: add 717752a19f954e3284081f1d114260d3 "Toyota Verso" (niev, 878,708 faces, 5.9 MB) to toyota/verso from 2013,
replacing the Proace City Verso van. Fiat Panda: every 2012+ (third generation) model on Sketchfab is over 1.2M faces, so the
1980s model is hidden with no replacement until the heavy-model policy is decided.

Kept although under the crude face count (look right): nissan/micra 2004, suzuki/alto 2017, bmw/x3 2011, range-rover-evoque 2015.

Still open: 176 heavy models (119 on model pages, 31 of them cars with over 10,000 on the road).

Apply SQL:

```sql
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'over 20 MB (20.1 MB, 563696 faces) - 2026-11-23 audit' WHERE make_slug = 'kia' AND model_slug = 'sportage' AND sketchfab_uid = '8f794775950041d7a9ae867e40646a33' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'photo backdrop baked into the scan - 2026-11-23 audit' WHERE make_slug = 'suzuki' AND model_slug = 'sx4' AND sketchfab_uid = '9e2d42b640eb4fda830eaf192b8e1c35' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'over 20 MB (82.9 MB, 433170 faces) - 2026-11-23 audit' WHERE make_slug = 'hyundai' AND model_slug = 'kona' AND sketchfab_uid = '7d1d7fda8e0a445491ddff8634d8de95' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'flat untextured colours (toy look) - 2026-11-23 audit' WHERE make_slug = 'chevrolet' AND model_slug = 'spark' AND sketchfab_uid = '131573e2229e47e7ac626328bebb1848' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'wrong body: 70-series pickup, not the SUV - 2026-11-23 audit' WHERE make_slug = 'toyota' AND model_slug = 'land-cruiser' AND sketchfab_uid = '194b33a136f947b8aec574936aa8681e' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'wrong car: Proace City Verso van, not the Verso MPV - 2026-11-23 audit' WHERE make_slug = 'toyota' AND model_slug = 'verso' AND sketchfab_uid = '751c7d18c05946d18ba7953dc046dec6' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'showroom scene baked in - 2026-11-23 audit' WHERE make_slug = 'dacia' AND model_slug = 'duster' AND sketchfab_uid = 'a39e5e2fe34f45399e080f1491162898' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'loads upside down; 1.76M faces - 2026-11-23 audit' WHERE make_slug = 'suzuki' AND model_slug = 'ignis' AND sketchfab_uid = '658003a99e5a4ee2a933172f11501b2a' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'flat untextured colours (toy look) - 2026-11-23 audit' WHERE make_slug = 'hyundai' AND model_slug = 'ix35' AND sketchfab_uid = 'bf674c749d8548dbade14c113316f1e9' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'flat untextured colours (toy look) - 2026-11-23 audit' WHERE make_slug = 'toyota' AND model_slug = 'aygo' AND sketchfab_uid = '5f8828645587439fa827cfab98a7c04f' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'photo scan with ground patch - 2026-11-23 audit' WHERE make_slug = 'toyota' AND model_slug = 'aygo' AND sketchfab_uid = 'aaf87da9481f46ccba404f3156c70d9b' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'loose wheel floating beside the car - 2026-11-23 audit' WHERE make_slug = 'mercedes' AND model_slug = 'e-class' AND sketchfab_uid = '4b966f58cd3c40f4810e9e5983795428' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'over 20 MB (26.2 MB, 3631911 faces) - 2026-11-23 audit' WHERE make_slug = 'honda' AND model_slug = 'accord' AND sketchfab_uid = 'bb853259a542400eb3e6eaed0a4557a1' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'photo scan with ground patch - 2026-11-23 audit' WHERE make_slug = 'volkswagen' AND model_slug = 'passat' AND sketchfab_uid = 'f946c79a2e534137a5ffd30aa0173566' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'over 20 MB (33.1 MB, 877914 faces) - 2026-11-23 audit' WHERE make_slug = 'jeep' AND model_slug = 'wrangler' AND sketchfab_uid = '49a2914dff81428998a76a3043487404' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'over 20 MB (98.3 MB, 12094544 faces) - 2026-11-23 audit' WHERE make_slug = 'bmw' AND model_slug = 'x5' AND sketchfab_uid = 'e1b2382b65d542fea09ae27c53f82f4a' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'over 20 MB (31.8 MB, 1644165 faces) - 2026-11-23 audit' WHERE make_slug = 'cupra' AND model_slug = 'formentor' AND sketchfab_uid = '3674038309c84faa86c3be4642db2c27' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'wrong generation: 1980s Panda (page covers 2012+) - 2026-11-23 audit' WHERE make_slug = 'fiat' AND model_slug = 'panda' AND sketchfab_uid = '38887c2e43294e34a2e032af23a64a80' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'outdoor scene baked in - 2026-11-23 audit' WHERE make_slug = 'mercedes' AND model_slug = 'gle-coupe' AND sketchfab_uid = 'ac4667c76f4e4e6c813ff3e72bc07ff8' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'unfinished tuned truck (missing panels) - 2026-11-23 audit' WHERE make_slug = 'chevrolet' AND model_slug = 'colorado' AND sketchfab_uid = 'b6c9193bdfe545fbba8e90e9b60447e4' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'floor scene baked in; 114 textures - 2026-11-23 audit' WHERE make_slug = 'mercedes' AND model_slug = 'maybach-s' AND sketchfab_uid = '0136f984222c4f83b3b913cef8258a81' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'crude (26349 faces) - 2026-11-23 audit' WHERE make_slug = 'kia' AND model_slug = 'ceed' AND sketchfab_uid = '04103fee156843fbaab438b565cf5523' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'crude (16339 faces) - 2026-11-23 audit' WHERE make_slug = 'jeep' AND model_slug = 'grand-cherokee' AND sketchfab_uid = '73060e09d107476d809496e0b3216039' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'crude (16629 faces) - 2026-11-23 audit' WHERE make_slug = 'porsche' AND model_slug = 'macan' AND sketchfab_uid = 'c73dcaa815fb43e19c8d4aac0acf55fc' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'crude (12172 faces) - 2026-11-23 audit' WHERE make_slug = 'jeep' AND model_slug = 'renegade' AND sketchfab_uid = '90b81540c5e349ec94d7323f170a136b' AND hidden IS NOT 1;
UPDATE car_3d_models SET hidden = 1, hidden_reason = 'crude (4734 faces) - 2026-11-23 audit' WHERE make_slug = 'jeep' AND model_slug = 'renegade' AND sketchfab_uid = '192f7e81dce84c6780434f692a0f96c5' AND hidden IS NOT 1;
INSERT INTO car_3d_models (make_slug, model_slug, sketchfab_uid, sketchfab_name, sketchfab_author, license, hidden, year_from, year_to) VALUES ('toyota', 'verso', '717752a19f954e3284081f1d114260d3', 'Toyota Verso', 'niev', 'CC Attribution', 0, 2013, NULL);
```

Rollback:

```sql
UPDATE car_3d_models SET hidden = NULL, hidden_reason = NULL WHERE hidden_reason LIKE '% - 2026-11-23 audit';
DELETE FROM car_3d_models WHERE make_slug = 'toyota' AND model_slug = 'verso' AND sketchfab_uid = '717752a19f954e3284081f1d114260d3';
```
