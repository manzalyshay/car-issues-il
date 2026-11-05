# 2026-11-05: 3D model review (one by one with the owner) and Colt photos

Audit: all 345 car models' main 3D entries checked against the Sketchfab API (404s, face count,
textures, geometry size, wrong car). Each change below was approved by the owner in the Claude
session on 5 Nov 2026.

## car_3d_models

| Car | Change | Old uid | New uid |
|---|---|---|---|
| geely/ex5 | hidden (deleted on Sketchfab, 404) | 5c0f6a8defeb4b178a4c2e1f82c8f53b | - |
| mercedes/c43-amg | replaced (was an AMG GT2 race car) | 270e8baa9fdb4631aa7bdac9b8448d69 | 97baced3bcf14d9b8c3eedf6233bd4e9 (Mercedes Benz C43 AMG, 0verly, CC BY-NC) |
| byd/sealion6 | replaced (was a low-poly Sealion 7) | 4ef94b2780cd4290b7bd00ae8ba0ee81 | e3a2ef09dcc547ccafe1687328ec05f0 (2024 BYD Seal U DM-i, Ddiaz Design, CC BY-NC-SA) |
| mercedes/eqe-suv | hidden (was an EQS sedan, no EQE SUV model exists) | 835cd1fb7fc14e6d9fa83991b534c201 | - |
| mercedes/a-class | replaced (4k-face low-poly) | 1d9002fa93fa445bafba7775b6828348 | 5128eda253c14dbcb483313d2c697776 (Mercedes-Benz A200 Progressive line (V177), Wissawin) |
| hyundai/bayon | replaced (1.4k-face low-poly) | e99be501802449bc874e62e6a7c92b6f | e075522ff7d547e38d0cb4e1279a8782 (Hyundai Bayon 2022, SQUIR3D, Editorial) |
| mitsubishi/colt | kept (low-poly, but the only 2024 Colt model) | - | - |

Old name/author/license for replaced rows:
- c43-amg: 'Mercedes-Benz AMG GT2 2023'
- sealion6: 'Low Poly Car - BYD Sealion 7 2025'
- a-class: 'Mercedes-Benz A-Class 2021'
- bayon: 'Hyundai Bayon 2022' (slowpoly, Editorial)

Rollback for a hidden row: `UPDATE car_3d_models SET hidden = NULL WHERE sketchfab_uid = '<old uid>';`
Rollback for a replaced row: `UPDATE car_3d_models SET sketchfab_uid = '<old uid>', sketchfab_name = '<old name>' WHERE sketchfab_uid = '<new uid>';`

## car_images: mitsubishi/colt

The Colt page's main photo was an old 2000s Colt in Moscow. Hidden (`hidden = 1`), 22 rows of old
generations, other models (L300 van, Colt Plus MPV, Colt 600 replica) and street/bus scenes:

cdf2c676-cb99-4cfd-bc72-bd426f8a692c, e4532790-a168-4a85-a830-ed4789f996f6, 2b7a770e-9800-41a8-94b3-1a1200b617e8,
2c063bf8-0e1e-4085-8a9d-3e83b6724f42, ab2a3cf2-9631-440c-aacb-0769d36c1235, 3c684c04-e18f-4bf2-884b-2071cb34e1c7,
c29e2db5-744a-4c06-a858-e37639ad3d42, 169f4d27-9242-4f9b-bd7c-ce74606e8f47, 6b00689d-247b-4145-84d8-46a5e5cccae4,
833ad219-3165-45ab-b09b-2bf7a05749c5, dca1dae3-0797-48c1-8679-60242de17c31, c5a8a95d-9295-47cf-9ff0-05442b9c2909,
ef28ecfc-5366-462b-8c3e-0b7738fdb6fa, 66ca0a2a-f7ff-43e2-b647-f8e9e22c9035, 7e67f9c5-6342-4be4-ae8e-87036e8e3e40,
b41626bc-b27c-4429-812c-bb3f61371eb3, ca94d4a0-817f-4701-9b67-2431eb461783, a26d5791-fcf4-463d-a11c-52aa869a59d2,
69f8c3c1-7f6d-4b5a-9025-75c218298227, dceff9f3-d49f-4871-89bc-0507d031650f, 704c763b-37da-4c09-b272-77d7810ffc13,
58fe0e9f-98dd-4cb6-b79f-437edf7cd272

Set as main photo (`is_main = 1`, was NULL): 1c3595db-ed59-4b45-a306-95258fa75fed (red 2023 Colt, Auto Zuerich 2023).

Rollback: `UPDATE car_images SET hidden = NULL WHERE id IN (<ids above>);` and
`UPDATE car_images SET is_main = NULL WHERE id = '1c3595db-ed59-4b45-a306-95258fa75fed';`

## Later the same day (car_3d_models)

Owner approved each of these one by one, then asked for the rest to follow Claude's recommendation.

| Car | Change | Old uid | New uid / name |
|---|---|---|---|
| mitsubishi/pajero | replaced (rusty low-poly game model) | bec38f586d9349ee9c1f295b6f5569cb | 4276159bda2f4c48a0bed3678f71fc75 Mitsubishi Pajero Mk3 Wagon 5door 2005 (niev) |
| polestar/polestar-3 | replaced (MY24 row) | 3c1378064d134eaabd554ee09fb61180 | 74c179e622394024acb762a27bddbf2c Polestar 3 (2027) (geyges) |
| mazda/mazda3 (2011-2019 row) | replaced (3.5k faces) | 4557b1ab51cc4f5a8c5373a2c5cfc8eb | a8d5301ccbf548b3bc3080d0193f254f 2011 Mazda 3 Sedan (outpiston) |
| hyundai/ioniq | added (had no 3D model) | - | 4ef473397ab04431a148a4b044025942 Hyundai Ioniq 2020 (SQUIR3D) |
| hyundai/i30 | replaced (31k-face i30 N with game decal) | 90c3bd24390b46299cf01c16d5e8091f | e6099de2b6e44a5ca55352c9bb07a671 Hyundai i30 Hatchback 2021 (SQUIR3D) |
| ford/focus | replaced (Focus RS, 55k faces) | 0216bf91e4184083b5af0f74ee9226d7 | 3c075fd7ab954d57b3b5ad709b64d787 2013 Ford Focus III (Indians) |
| subaru/forester | replaced (17.8 MB) | 611ae23685c14134b5a4f3decde248e9 | 847134597cf7475da0cf4f38598804ed Subaru Forester 2019 (SQUIR3D) |
| renault/clio | replaced (20.7 MB) | a5fe97bea44040dfa25a7082a54073b0 | 6e8fb3f12cf34c1095cdd89cfd77580c Renault Clio 2020 (SQUIR3D) |
| dacia/duster | hidden 2024 row (1.7k faces); the 2021 model now shows | 9cf346a1359c457aa8a3d96b9b8f9dfc | - |
| lexus/nx | replaced (23.5 MB) | ac4e031cf9d342639d9bdac46ad2a40f | 83dcea37774a4e9a924e6949ce67d8a7 Lexus NX 300 2022 |
| volvo/ex30 | replaced (untextured) | c5be588ea33d44cc8d2690ffdba389a4 | efe4b53d274a4559a9fbeb083e97b666 Volvo_ex30 (Eduardo.Puentes) |
| ssangyong/tivoli | replaced (20.7 MB) | 805ee9bb23fc4a869b3490e17ec06ec3 | 0262bbaa5a354bb981af2c1effd98c1b Ssangyong Tivoli 2020 (SQUIR3D) |
| ford/ranger | replaced (Cities Skylines game model) | c2d4113e6acd401cb1999f81bb318325 | e93ac097ee9a46a4a9decca9aceed03c Ford Ranger Next-Gen 2023 Sport |
| tesla/model-s | replaced (1.5k faces) | aec912ed367b4aebacc8676922f42beb | 48d246648f5b4f5e89cf1ecbf27a64ac Tesla Model S (Virtual Studio) |
| mercedes/slk | replaced (29k faces) | b51b361ad90b43909743608b77ecea51 | 48d06315b8d643cbae76e75feeda930a Mercedes SLK 2012 (Cinquez) |
| lexus/rx | replaced (26.2 MB) | 13ddc257995b4e3fa6be35af690251c8 | 00365979e4d54e559c3dbff392904924 Lexus RX 2020 (SQUIR3D) |
| mercedes/gle-coupe | replaced (1.4k faces) | f2ee88d34e6d4555a8bbec6e37aa4f0b | ac4667c76f4e4e6c813ff3e72bc07ff8 Mercedes-AMG GLE 63 Coupe 2022 (ceron_alex) |

Kept on purpose (listed in `scripts/3d-audit/reviewed.json`): Colt, Peugeot 3008, Mazda 3 (main), Geely
Starray, Jeep Avenger, Lexus RZ, Geely Coolray. Skipped: Hyundai i25 (no model added).

Rollback (replaced row): `UPDATE car_3d_models SET sketchfab_uid = '<old uid>' WHERE make_slug = ... AND model_slug = ... AND sketchfab_uid = '<new uid>';`
(old names are in the Sketchfab listing of the old uid). Hidden row: `SET hidden = NULL`. Added row: `DELETE ... WHERE sketchfab_uid = '4ef473397ab04431a148a4b044025942'`.
