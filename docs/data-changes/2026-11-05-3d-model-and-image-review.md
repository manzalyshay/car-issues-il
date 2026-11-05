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
