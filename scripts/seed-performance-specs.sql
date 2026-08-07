-- Performance specs seed — real-world data for popular Israeli market models
-- Run: npx wrangler d1 execute car-issues-db --remote --file=scripts/seed-performance-specs.sql

-- ── Toyota ─────────────────────────────────────────────────────────────────

-- Yaris (1.5 hybrid 116hp)
UPDATE car_trims SET acceleration_0_100=10.8, top_speed_kmh=175, torque_nm=141, fuel_consumption=4.3, cargo_liters=286, curb_weight_kg=1095
WHERE make_slug='toyota' AND model_slug='yaris' AND is_israel=1;

-- Yaris Cross (1.5 hybrid 116hp system)
UPDATE car_trims SET acceleration_0_100=11.2, top_speed_kmh=175, torque_nm=141, fuel_consumption=4.7, cargo_liters=270, curb_weight_kg=1310
WHERE make_slug='toyota' AND model_slug='yaris-cross' AND is_israel=1;

-- C-HR / chr (1.8 hybrid 122hp)
UPDATE car_trims SET acceleration_0_100=10.9, top_speed_kmh=180, torque_nm=142, fuel_consumption=5.0, cargo_liters=377, curb_weight_kg=1415
WHERE make_slug='toyota' AND model_slug='chr' AND is_israel=1;

-- Corolla Cross (1.8 hybrid 122hp)
UPDATE car_trims SET acceleration_0_100=10.9, top_speed_kmh=180, torque_nm=142, fuel_consumption=5.1, cargo_liters=392, curb_weight_kg=1435
WHERE make_slug='toyota' AND model_slug='corolla-cross' AND is_israel=1;

-- Corolla (sedan) — 1.8 hybrid 122hp
UPDATE car_trims SET acceleration_0_100=10.9, top_speed_kmh=180, torque_nm=142, fuel_consumption=4.5, cargo_liters=361, curb_weight_kg=1375
WHERE make_slug='toyota' AND model_slug='corolla' AND is_israel=1 AND engine_hp<=130;
-- Corolla 2.0 hybrid 196hp
UPDATE car_trims SET acceleration_0_100=8.1, top_speed_kmh=180, torque_nm=190, fuel_consumption=4.8, cargo_liters=361, curb_weight_kg=1395
WHERE make_slug='toyota' AND model_slug='corolla' AND is_israel=1 AND engine_hp>130;

-- RAV4 (2.5 hybrid 218hp)
UPDATE car_trims SET acceleration_0_100=8.1, top_speed_kmh=180, torque_nm=163, fuel_consumption=5.8, cargo_liters=580, curb_weight_kg=1695
WHERE make_slug='toyota' AND model_slug='rav4' AND is_israel=1 AND engine_hp<=230;
-- RAV4 PHEV 302hp
UPDATE car_trims SET acceleration_0_100=6.2, top_speed_kmh=180, torque_nm=163, fuel_consumption=1.4, cargo_liters=520, curb_weight_kg=1920
WHERE make_slug='toyota' AND model_slug='rav4' AND is_israel=1 AND engine_hp>230;

-- Camry (2.5 hybrid 218hp)
UPDATE car_trims SET acceleration_0_100=8.3, top_speed_kmh=180, torque_nm=221, fuel_consumption=5.4, cargo_liters=524, curb_weight_kg=1590
WHERE make_slug='toyota' AND model_slug='camry' AND is_israel=1;

-- Prius (2.0 hybrid 223hp)
UPDATE car_trims SET acceleration_0_100=7.5, top_speed_kmh=180, torque_nm=190, fuel_consumption=4.4, cargo_liters=284, curb_weight_kg=1420
WHERE make_slug='toyota' AND model_slug='prius' AND is_israel=1;

-- bZ4X EV (218hp RWD / 218hp AWD)
UPDATE car_trims SET acceleration_0_100=8.4, top_speed_kmh=160, torque_nm=265, fuel_consumption=0.0, cargo_liters=452, curb_weight_kg=1999
WHERE make_slug='toyota' AND model_slug='bz4x' AND is_israel=1 AND engine_hp<=220;
UPDATE car_trims SET acceleration_0_100=6.9, top_speed_kmh=160, torque_nm=337, fuel_consumption=0.0, cargo_liters=452, curb_weight_kg=2109
WHERE make_slug='toyota' AND model_slug='bz4x' AND is_israel=1 AND engine_hp>220;

-- ── Hyundai ────────────────────────────────────────────────────────────────

-- i20 (1.2 MPI 84hp)
UPDATE car_trims SET acceleration_0_100=14.6, top_speed_kmh=171, torque_nm=118, fuel_consumption=5.4, cargo_liters=352, curb_weight_kg=1068
WHERE make_slug='hyundai' AND model_slug='i20' AND is_israel=1 AND engine_hp<=90;
-- i20 1.0T 100-120hp
UPDATE car_trims SET acceleration_0_100=10.1, top_speed_kmh=184, torque_nm=172, fuel_consumption=5.3, cargo_liters=352, curb_weight_kg=1098
WHERE make_slug='hyundai' AND model_slug='i20' AND is_israel=1 AND engine_hp>90;

-- i30 (1.0T 120hp / 1.5T 160hp)
UPDATE car_trims SET acceleration_0_100=10.9, top_speed_kmh=193, torque_nm=200, fuel_consumption=5.7, cargo_liters=395, curb_weight_kg=1246
WHERE make_slug='hyundai' AND model_slug='i30' AND is_israel=1 AND engine_hp<=130;
UPDATE car_trims SET acceleration_0_100=8.9, top_speed_kmh=205, torque_nm=253, fuel_consumption=6.2, cargo_liters=395, curb_weight_kg=1290
WHERE make_slug='hyundai' AND model_slug='i30' AND is_israel=1 AND engine_hp>130;

-- Elantra (1.6 MPI 128hp / 1.6T 200hp N)
UPDATE car_trims SET acceleration_0_100=10.6, top_speed_kmh=198, torque_nm=158, fuel_consumption=6.4, cargo_liters=454, curb_weight_kg=1287
WHERE make_slug='hyundai' AND model_slug='elantra' AND is_israel=1 AND engine_hp<=130;
UPDATE car_trims SET acceleration_0_100=7.5, top_speed_kmh=240, torque_nm=353, fuel_consumption=8.8, cargo_liters=454, curb_weight_kg=1454
WHERE make_slug='hyundai' AND model_slug='elantra' AND is_israel=1 AND engine_hp>130;

-- Kona (1.0T 120hp)
UPDATE car_trims SET acceleration_0_100=12.0, top_speed_kmh=180, torque_nm=172, fuel_consumption=6.5, cargo_liters=361, curb_weight_kg=1261
WHERE make_slug='hyundai' AND model_slug='kona' AND is_israel=1 AND engine_hp<=130;
-- Kona 1.6T 198hp
UPDATE car_trims SET acceleration_0_100=7.9, top_speed_kmh=208, torque_nm=265, fuel_consumption=7.5, cargo_liters=361, curb_weight_kg=1393
WHERE make_slug='hyundai' AND model_slug='kona' AND is_israel=1 AND engine_hp>130;

-- Tucson (1.6T 150hp / 1.6T Hybrid 230hp)
UPDATE car_trims SET acceleration_0_100=9.4, top_speed_kmh=192, torque_nm=250, fuel_consumption=6.8, cargo_liters=539, curb_weight_kg=1491
WHERE make_slug='hyundai' AND model_slug='tucson' AND is_israel=1 AND engine_hp<=165;
UPDATE car_trims SET acceleration_0_100=8.0, top_speed_kmh=193, torque_nm=265, fuel_consumption=6.0, cargo_liters=539, curb_weight_kg=1683
WHERE make_slug='hyundai' AND model_slug='tucson' AND is_israel=1 AND engine_hp>165;

-- Santa Fe (2.5T 281hp / Hybrid 230hp)
UPDATE car_trims SET acceleration_0_100=8.7, top_speed_kmh=210, torque_nm=421, fuel_consumption=10.5, cargo_liters=625, curb_weight_kg=1775
WHERE make_slug='hyundai' AND model_slug='santa-fe' AND is_israel=1 AND engine_hp>250;
UPDATE car_trims SET acceleration_0_100=8.0, top_speed_kmh=195, torque_nm=265, fuel_consumption=7.0, cargo_liters=616, curb_weight_kg=1905
WHERE make_slug='hyundai' AND model_slug='santa-fe' AND is_israel=1 AND engine_hp<=250;

-- Bayon (1.0T 100hp)
UPDATE car_trims SET acceleration_0_100=13.0, top_speed_kmh=178, torque_nm=172, fuel_consumption=5.7, cargo_liters=411, curb_weight_kg=1128
WHERE make_slug='hyundai' AND model_slug='bayon' AND is_israel=1 AND engine_hp<=105;
UPDATE car_trims SET acceleration_0_100=10.6, top_speed_kmh=188, torque_nm=200, fuel_consumption=6.0, cargo_liters=411, curb_weight_kg=1153
WHERE make_slug='hyundai' AND model_slug='bayon' AND is_israel=1 AND engine_hp>105;

-- Venue (1.0T 120hp)
UPDATE car_trims SET acceleration_0_100=11.6, top_speed_kmh=185, torque_nm=172, fuel_consumption=6.2, cargo_liters=355, curb_weight_kg=1105
WHERE make_slug='hyundai' AND model_slug='venue' AND is_israel=1;

-- Ioniq 5 (RWD 217hp / AWD 325hp)
UPDATE car_trims SET acceleration_0_100=8.5, top_speed_kmh=185, torque_nm=350, fuel_consumption=0.0, cargo_liters=531, curb_weight_kg=1985
WHERE make_slug='hyundai' AND model_slug='ioniq-5' AND is_israel=1 AND engine_hp<=220;
UPDATE car_trims SET acceleration_0_100=5.1, top_speed_kmh=185, torque_nm=605, fuel_consumption=0.0, cargo_liters=531, curb_weight_kg=2100
WHERE make_slug='hyundai' AND model_slug='ioniq-5' AND is_israel=1 AND engine_hp>220;

-- Ioniq 6 (RWD 225hp / AWD 325hp)
UPDATE car_trims SET acceleration_0_100=7.4, top_speed_kmh=185, torque_nm=350, fuel_consumption=0.0, cargo_liters=401, curb_weight_kg=1950
WHERE make_slug='hyundai' AND model_slug='ioniq-6' AND is_israel=1 AND engine_hp<=230;
UPDATE car_trims SET acceleration_0_100=5.1, top_speed_kmh=185, torque_nm=605, fuel_consumption=0.0, cargo_liters=401, curb_weight_kg=2040
WHERE make_slug='hyundai' AND model_slug='ioniq-6' AND is_israel=1 AND engine_hp>230;

-- Sonata (2.5L 191hp)
UPDATE car_trims SET acceleration_0_100=8.5, top_speed_kmh=220, torque_nm=245, fuel_consumption=8.2, cargo_liters=510, curb_weight_kg=1530
WHERE make_slug='hyundai' AND model_slug='sonata' AND is_israel=1;

-- ── Kia ───────────────────────────────────────────────────────────────────

-- Picanto (1.0 67hp / 1.0T 100hp)
UPDATE car_trims SET acceleration_0_100=14.5, top_speed_kmh=155, torque_nm=95, fuel_consumption=4.9, cargo_liters=255, curb_weight_kg=966
WHERE make_slug='kia' AND model_slug='picanto' AND is_israel=1 AND engine_hp<=70;
UPDATE car_trims SET acceleration_0_100=12.0, top_speed_kmh=175, torque_nm=172, fuel_consumption=5.5, cargo_liters=255, curb_weight_kg=996
WHERE make_slug='kia' AND model_slug='picanto' AND is_israel=1 AND engine_hp>70;

-- Stonic (1.0T 100hp / 1.0T 120hp)
UPDATE car_trims SET acceleration_0_100=13.0, top_speed_kmh=180, torque_nm=172, fuel_consumption=6.0, cargo_liters=352, curb_weight_kg=1196
WHERE make_slug='kia' AND model_slug='stonic' AND is_israel=1 AND engine_hp<=105;
UPDATE car_trims SET acceleration_0_100=10.9, top_speed_kmh=188, torque_nm=172, fuel_consumption=5.8, cargo_liters=352, curb_weight_kg=1221
WHERE make_slug='kia' AND model_slug='stonic' AND is_israel=1 AND engine_hp>105;

-- Niro (1.6 HEV 141hp / PHEV 183hp / EV 204hp)
UPDATE car_trims SET acceleration_0_100=9.8, top_speed_kmh=162, torque_nm=265, fuel_consumption=4.8, cargo_liters=451, curb_weight_kg=1395
WHERE make_slug='kia' AND model_slug='niro' AND is_israel=1 AND engine_hp<=145;
UPDATE car_trims SET acceleration_0_100=9.0, top_speed_kmh=162, torque_nm=265, fuel_consumption=1.4, cargo_liters=348, curb_weight_kg=1565
WHERE make_slug='kia' AND model_slug='niro' AND is_israel=1 AND engine_hp>145 AND engine_hp<=190;
UPDATE car_trims SET acceleration_0_100=7.8, top_speed_kmh=167, torque_nm=255, fuel_consumption=0.0, cargo_liters=475, curb_weight_kg=1707
WHERE make_slug='kia' AND model_slug='niro' AND is_israel=1 AND engine_hp>190;

-- Ceed (1.0T 120hp / 1.5T 160hp)
UPDATE car_trims SET acceleration_0_100=11.4, top_speed_kmh=193, torque_nm=200, fuel_consumption=6.0, cargo_liters=395, curb_weight_kg=1270
WHERE make_slug='kia' AND model_slug='ceed' AND is_israel=1 AND engine_hp<=125;
UPDATE car_trims SET acceleration_0_100=8.9, top_speed_kmh=211, torque_nm=253, fuel_consumption=6.5, cargo_liters=395, curb_weight_kg=1316
WHERE make_slug='kia' AND model_slug='ceed' AND is_israel=1 AND engine_hp>125;

-- Cerato (2.0L 150hp)
UPDATE car_trims SET acceleration_0_100=10.2, top_speed_kmh=204, torque_nm=196, fuel_consumption=7.2, cargo_liters=454, curb_weight_kg=1325
WHERE make_slug='kia' AND model_slug='cerato' AND is_israel=1;

-- Seltos (1.6T 177hp AWD)
UPDATE car_trims SET acceleration_0_100=8.5, top_speed_kmh=205, torque_nm=265, fuel_consumption=8.0, cargo_liters=433, curb_weight_kg=1419
WHERE make_slug='kia' AND model_slug='seltos' AND is_israel=1;

-- Sportage (1.6T 150hp / HEV 230hp / PHEV 265hp)
UPDATE car_trims SET acceleration_0_100=9.8, top_speed_kmh=193, torque_nm=250, fuel_consumption=7.1, cargo_liters=543, curb_weight_kg=1534
WHERE make_slug='kia' AND model_slug='sportage' AND is_israel=1 AND engine_hp<=165;
UPDATE car_trims SET acceleration_0_100=7.9, top_speed_kmh=193, torque_nm=265, fuel_consumption=6.0, cargo_liters=543, curb_weight_kg=1730
WHERE make_slug='kia' AND model_slug='sportage' AND is_israel=1 AND engine_hp>165 AND engine_hp<=250;
UPDATE car_trims SET acceleration_0_100=7.4, top_speed_kmh=193, torque_nm=265, fuel_consumption=1.4, cargo_liters=540, curb_weight_kg=1915
WHERE make_slug='kia' AND model_slug='sportage' AND is_israel=1 AND engine_hp>250;

-- Sorento (2.5T 281hp AWD / HEV 227hp / PHEV 261hp)
UPDATE car_trims SET acceleration_0_100=6.9, top_speed_kmh=215, torque_nm=421, fuel_consumption=10.5, cargo_liters=604, curb_weight_kg=1885
WHERE make_slug='kia' AND model_slug='sorento' AND is_israel=1 AND engine_hp>260;
UPDATE car_trims SET acceleration_0_100=8.2, top_speed_kmh=193, torque_nm=271, fuel_consumption=6.7, cargo_liters=616, curb_weight_kg=1912
WHERE make_slug='kia' AND model_slug='sorento' AND is_israel=1 AND engine_hp>200 AND engine_hp<=260;
UPDATE car_trims SET acceleration_0_100=8.7, top_speed_kmh=193, torque_nm=445, fuel_consumption=7.0, cargo_liters=604, curb_weight_kg=1985
WHERE make_slug='kia' AND model_slug='sorento' AND is_israel=1 AND engine_hp<=200;

-- EV6 (RWD 228hp / AWD 325hp / GT 585hp)
UPDATE car_trims SET acceleration_0_100=7.3, top_speed_kmh=185, torque_nm=350, fuel_consumption=0.0, cargo_liters=490, curb_weight_kg=1995
WHERE make_slug='kia' AND model_slug='ev6' AND is_israel=1 AND engine_hp<=250;
UPDATE car_trims SET acceleration_0_100=5.2, top_speed_kmh=185, torque_nm=605, fuel_consumption=0.0, cargo_liters=490, curb_weight_kg=2110
WHERE make_slug='kia' AND model_slug='ev6' AND is_israel=1 AND engine_hp>250 AND engine_hp<=400;
UPDATE car_trims SET acceleration_0_100=3.5, top_speed_kmh=260, torque_nm=740, fuel_consumption=0.0, cargo_liters=490, curb_weight_kg=2135
WHERE make_slug='kia' AND model_slug='ev6' AND is_israel=1 AND engine_hp>400;

-- EV9 (RWD 217hp / AWD 384hp)
UPDATE car_trims SET acceleration_0_100=9.4, top_speed_kmh=185, torque_nm=350, fuel_consumption=0.0, cargo_liters=828, curb_weight_kg=2590
WHERE make_slug='kia' AND model_slug='ev9' AND is_israel=1 AND engine_hp<=250;
UPDATE car_trims SET acceleration_0_100=5.3, top_speed_kmh=200, torque_nm=600, fuel_consumption=0.0, cargo_liters=828, curb_weight_kg=2640
WHERE make_slug='kia' AND model_slug='ev9' AND is_israel=1 AND engine_hp>250;

-- Carnival (3.5L V6 294hp / 2.2D 200hp)
UPDATE car_trims SET acceleration_0_100=8.0, top_speed_kmh=200, torque_nm=336, fuel_consumption=10.9, cargo_liters=689, curb_weight_kg=2067
WHERE make_slug='kia' AND model_slug='carnival' AND is_israel=1;

-- ── Skoda ─────────────────────────────────────────────────────────────────

-- Fabia (1.0 MPI 65hp / 1.0 TSI 95-115hp / 1.5 TSI 150hp)
UPDATE car_trims SET acceleration_0_100=14.5, top_speed_kmh=163, torque_nm=95, fuel_consumption=5.2, cargo_liters=380, curb_weight_kg=1098
WHERE make_slug='skoda' AND model_slug='fabia' AND is_israel=1 AND engine_hp<=70;
UPDATE car_trims SET acceleration_0_100=12.5, top_speed_kmh=175, torque_nm=160, fuel_consumption=5.5, cargo_liters=380, curb_weight_kg=1143
WHERE make_slug='skoda' AND model_slug='fabia' AND is_israel=1 AND engine_hp>70 AND engine_hp<=100;
UPDATE car_trims SET acceleration_0_100=10.2, top_speed_kmh=195, torque_nm=200, fuel_consumption=5.3, cargo_liters=380, curb_weight_kg=1163
WHERE make_slug='skoda' AND model_slug='fabia' AND is_israel=1 AND engine_hp>100 AND engine_hp<=120;
UPDATE car_trims SET acceleration_0_100=8.4, top_speed_kmh=215, torque_nm=250, fuel_consumption=5.8, cargo_liters=380, curb_weight_kg=1193
WHERE make_slug='skoda' AND model_slug='fabia' AND is_israel=1 AND engine_hp>120;

-- Scala (1.0 TSI 110hp / 1.5 TSI 150hp)
UPDATE car_trims SET acceleration_0_100=11.2, top_speed_kmh=191, torque_nm=200, fuel_consumption=5.7, cargo_liters=467, curb_weight_kg=1259
WHERE make_slug='skoda' AND model_slug='scala' AND is_israel=1 AND engine_hp<=120;
UPDATE car_trims SET acceleration_0_100=8.4, top_speed_kmh=225, torque_nm=250, fuel_consumption=6.1, cargo_liters=467, curb_weight_kg=1281
WHERE make_slug='skoda' AND model_slug='scala' AND is_israel=1 AND engine_hp>120;

-- Kamiq (1.0 TSI 95-115hp / 1.5 TSI 150hp)
UPDATE car_trims SET acceleration_0_100=11.5, top_speed_kmh=185, torque_nm=160, fuel_consumption=5.6, cargo_liters=400, curb_weight_kg=1207
WHERE make_slug='skoda' AND model_slug='kamiq' AND is_israel=1 AND engine_hp<=120;
UPDATE car_trims SET acceleration_0_100=8.7, top_speed_kmh=210, torque_nm=250, fuel_consumption=5.9, cargo_liters=400, curb_weight_kg=1254
WHERE make_slug='skoda' AND model_slug='kamiq' AND is_israel=1 AND engine_hp>120;

-- Karoq (1.5 TSI 150hp / 2.0 TSI 190hp AWD)
UPDATE car_trims SET acceleration_0_100=8.9, top_speed_kmh=214, torque_nm=250, fuel_consumption=6.6, cargo_liters=521, curb_weight_kg=1374
WHERE make_slug='skoda' AND model_slug='karoq' AND is_israel=1 AND engine_hp<=165;
UPDATE car_trims SET acceleration_0_100=7.0, top_speed_kmh=221, torque_nm=320, fuel_consumption=8.0, cargo_liters=521, curb_weight_kg=1499
WHERE make_slug='skoda' AND model_slug='karoq' AND is_israel=1 AND engine_hp>165;

-- Kodiaq (2.0 TSI 190hp AWD / 2.0 TSI 245hp AWD)
UPDATE car_trims SET acceleration_0_100=7.5, top_speed_kmh=215, torque_nm=320, fuel_consumption=8.9, cargo_liters=765, curb_weight_kg=1697
WHERE make_slug='skoda' AND model_slug='kodiaq' AND is_israel=1 AND engine_hp<=200;
UPDATE car_trims SET acceleration_0_100=6.7, top_speed_kmh=225, torque_nm=370, fuel_consumption=9.0, cargo_liters=765, curb_weight_kg=1750
WHERE make_slug='skoda' AND model_slug='kodiaq' AND is_israel=1 AND engine_hp>200;

-- Octavia (1.0 TSI 110hp / 1.5 TSI 150hp / 2.0 TSI 245hp RS)
UPDATE car_trims SET acceleration_0_100=11.4, top_speed_kmh=198, torque_nm=200, fuel_consumption=5.4, cargo_liters=600, curb_weight_kg=1250
WHERE make_slug='skoda' AND model_slug='octavia' AND is_israel=1 AND engine_hp<=120;
UPDATE car_trims SET acceleration_0_100=8.6, top_speed_kmh=224, torque_nm=250, fuel_consumption=6.1, cargo_liters=600, curb_weight_kg=1271
WHERE make_slug='skoda' AND model_slug='octavia' AND is_israel=1 AND engine_hp>120 AND engine_hp<=160;
UPDATE car_trims SET acceleration_0_100=6.5, top_speed_kmh=250, torque_nm=370, fuel_consumption=7.5, cargo_liters=600, curb_weight_kg=1426
WHERE make_slug='skoda' AND model_slug='octavia' AND is_israel=1 AND engine_hp>160;

-- Superb (2.0 TSI 218hp AWD / 2.0 TSI 265hp AWD)
UPDATE car_trims SET acceleration_0_100=7.0, top_speed_kmh=240, torque_nm=350, fuel_consumption=8.0, cargo_liters=645, curb_weight_kg=1566
WHERE make_slug='skoda' AND model_slug='superb' AND is_israel=1 AND engine_hp<=230;
UPDATE car_trims SET acceleration_0_100=6.3, top_speed_kmh=250, torque_nm=400, fuel_consumption=8.5, cargo_liters=645, curb_weight_kg=1620
WHERE make_slug='skoda' AND model_slug='superb' AND is_israel=1 AND engine_hp>230;

-- Enyaq EV (RWD 204hp / AWD 299hp / RS 306hp)
UPDATE car_trims SET acceleration_0_100=8.7, top_speed_kmh=160, torque_nm=310, fuel_consumption=0.0, cargo_liters=585, curb_weight_kg=2053
WHERE make_slug='skoda' AND model_slug='enyaq' AND is_israel=1 AND engine_hp<=210;
UPDATE car_trims SET acceleration_0_100=6.9, top_speed_kmh=180, torque_nm=425, fuel_consumption=0.0, cargo_liters=585, curb_weight_kg=2160
WHERE make_slug='skoda' AND model_slug='enyaq' AND is_israel=1 AND engine_hp>210;

-- ── Volkswagen ─────────────────────────────────────────────────────────────

-- Polo (1.0 TSI 95hp / 1.0 TSI 115hp / GTI 207hp)
UPDATE car_trims SET acceleration_0_100=12.5, top_speed_kmh=186, torque_nm=160, fuel_consumption=5.3, cargo_liters=351, curb_weight_kg=1105
WHERE make_slug='volkswagen' AND model_slug='polo' AND is_israel=1 AND engine_hp<=100;
UPDATE car_trims SET acceleration_0_100=10.0, top_speed_kmh=198, torque_nm=200, fuel_consumption=5.3, cargo_liters=351, curb_weight_kg=1121
WHERE make_slug='volkswagen' AND model_slug='polo' AND is_israel=1 AND engine_hp>100 AND engine_hp<=120;
UPDATE car_trims SET acceleration_0_100=6.5, top_speed_kmh=237, torque_nm=320, fuel_consumption=7.0, cargo_liters=351, curb_weight_kg=1264
WHERE make_slug='volkswagen' AND model_slug='polo' AND is_israel=1 AND engine_hp>120;

-- Golf (1.0 eTSI 110hp / 1.5 eTSI 130hp / 1.5 eTSI 150hp / R 333hp)
UPDATE car_trims SET acceleration_0_100=12.4, top_speed_kmh=197, torque_nm=200, fuel_consumption=5.3, cargo_liters=381, curb_weight_kg=1278
WHERE make_slug='volkswagen' AND model_slug='golf' AND is_israel=1 AND engine_hp<=115;
UPDATE car_trims SET acceleration_0_100=9.1, top_speed_kmh=218, torque_nm=250, fuel_consumption=5.9, cargo_liters=381, curb_weight_kg=1310
WHERE make_slug='volkswagen' AND model_slug='golf' AND is_israel=1 AND engine_hp>115 AND engine_hp<=140;
UPDATE car_trims SET acceleration_0_100=8.5, top_speed_kmh=225, torque_nm=250, fuel_consumption=6.3, cargo_liters=381, curb_weight_kg=1333
WHERE make_slug='volkswagen' AND model_slug='golf' AND is_israel=1 AND engine_hp>140 AND engine_hp<=160;
UPDATE car_trims SET acceleration_0_100=4.7, top_speed_kmh=250, torque_nm=420, fuel_consumption=9.5, cargo_liters=374, curb_weight_kg=1544
WHERE make_slug='volkswagen' AND model_slug='golf' AND is_israel=1 AND engine_hp>160;

-- Taigo (1.0 TSI 110hp / 1.5 TSI 150hp)
UPDATE car_trims SET acceleration_0_100=10.9, top_speed_kmh=196, torque_nm=200, fuel_consumption=5.7, cargo_liters=438, curb_weight_kg=1198
WHERE make_slug='volkswagen' AND model_slug='taigo' AND is_israel=1 AND engine_hp<=120;
UPDATE car_trims SET acceleration_0_100=8.3, top_speed_kmh=210, torque_nm=250, fuel_consumption=6.1, cargo_liters=438, curb_weight_kg=1249
WHERE make_slug='volkswagen' AND model_slug='taigo' AND is_israel=1 AND engine_hp>120;

-- T-Roc (1.5 TSI 150hp / 2.0 TSI 190hp AWD / R 300hp AWD)
UPDATE car_trims SET acceleration_0_100=8.9, top_speed_kmh=213, torque_nm=250, fuel_consumption=6.5, cargo_liters=445, curb_weight_kg=1362
WHERE make_slug='volkswagen' AND model_slug='troc' AND is_israel=1 AND engine_hp<=160;
UPDATE car_trims SET acceleration_0_100=7.4, top_speed_kmh=218, torque_nm=320, fuel_consumption=8.2, cargo_liters=445, curb_weight_kg=1457
WHERE make_slug='volkswagen' AND model_slug='troc' AND is_israel=1 AND engine_hp>160 AND engine_hp<=200;
UPDATE car_trims SET acceleration_0_100=4.9, top_speed_kmh=250, torque_nm=400, fuel_consumption=9.5, cargo_liters=445, curb_weight_kg=1545
WHERE make_slug='volkswagen' AND model_slug='troc' AND is_israel=1 AND engine_hp>200;

-- Tiguan (1.5 eTSI 130-150hp / 2.0 TSI 204hp AWD / eHybrid 272hp)
UPDATE car_trims SET acceleration_0_100=9.4, top_speed_kmh=204, torque_nm=250, fuel_consumption=7.0, cargo_liters=652, curb_weight_kg=1535
WHERE make_slug='volkswagen' AND model_slug='tiguan' AND is_israel=1 AND engine_hp<=155;
UPDATE car_trims SET acceleration_0_100=7.1, top_speed_kmh=222, torque_nm=320, fuel_consumption=8.1, cargo_liters=652, curb_weight_kg=1622
WHERE make_slug='volkswagen' AND model_slug='tiguan' AND is_israel=1 AND engine_hp>155 AND engine_hp<=210;
UPDATE car_trims SET acceleration_0_100=7.4, top_speed_kmh=220, torque_nm=400, fuel_consumption=1.1, cargo_liters=652, curb_weight_kg=1845
WHERE make_slug='volkswagen' AND model_slug='tiguan' AND is_israel=1 AND engine_hp>210;

-- Passat (1.5 eTSI 150hp / 2.0 TSI 204hp AWD)
UPDATE car_trims SET acceleration_0_100=8.9, top_speed_kmh=224, torque_nm=250, fuel_consumption=6.2, cargo_liters=650, curb_weight_kg=1509
WHERE make_slug='volkswagen' AND model_slug='passat' AND is_israel=1 AND engine_hp<=160;
UPDATE car_trims SET acceleration_0_100=7.1, top_speed_kmh=240, torque_nm=320, fuel_consumption=7.5, cargo_liters=650, curb_weight_kg=1595
WHERE make_slug='volkswagen' AND model_slug='passat' AND is_israel=1 AND engine_hp>160;

-- ID.3 EV (204hp / 231hp)
UPDATE car_trims SET acceleration_0_100=7.3, top_speed_kmh=160, torque_nm=310, fuel_consumption=0.0, cargo_liters=385, curb_weight_kg=1792
WHERE make_slug='volkswagen' AND model_slug='id3' AND is_israel=1 AND engine_hp<=210;
UPDATE car_trims SET acceleration_0_100=6.4, top_speed_kmh=200, torque_nm=545, fuel_consumption=0.0, cargo_liters=385, curb_weight_kg=1836
WHERE make_slug='volkswagen' AND model_slug='id3' AND is_israel=1 AND engine_hp>210;

-- ID.4 EV (RWD 204hp / AWD 299hp)
UPDATE car_trims SET acceleration_0_100=8.5, top_speed_kmh=160, torque_nm=310, fuel_consumption=0.0, cargo_liters=543, curb_weight_kg=2124
WHERE make_slug='volkswagen' AND model_slug='id4' AND is_israel=1 AND engine_hp<=210;
UPDATE car_trims SET acceleration_0_100=6.2, top_speed_kmh=180, torque_nm=679, fuel_consumption=0.0, cargo_liters=543, curb_weight_kg=2199
WHERE make_slug='volkswagen' AND model_slug='id4' AND is_israel=1 AND engine_hp>210;

-- ── Honda ─────────────────────────────────────────────────────────────────

-- Jazz (1.5 e:HEV 109hp)
UPDATE car_trims SET acceleration_0_100=12.6, top_speed_kmh=175, torque_nm=131, fuel_consumption=4.7, cargo_liters=304, curb_weight_kg=1189
WHERE make_slug='honda' AND model_slug='jazz' AND is_israel=1;

-- HR-V (1.5 e:HEV 131hp)
UPDATE car_trims SET acceleration_0_100=10.6, top_speed_kmh=175, torque_nm=253, fuel_consumption=5.3, cargo_liters=319, curb_weight_kg=1349
WHERE make_slug='honda' AND model_slug='hrv' AND is_israel=1;

-- Civic (1.5T 182hp / 2.0T Type R 329hp)
UPDATE car_trims SET acceleration_0_100=8.0, top_speed_kmh=218, torque_nm=240, fuel_consumption=6.9, cargo_liters=419, curb_weight_kg=1382
WHERE make_slug='honda' AND model_slug='civic' AND is_israel=1 AND engine_hp<=200;
UPDATE car_trims SET acceleration_0_100=5.4, top_speed_kmh=275, torque_nm=420, fuel_consumption=9.7, cargo_liters=420, curb_weight_kg=1432
WHERE make_slug='honda' AND model_slug='civic' AND is_israel=1 AND engine_hp>200;

-- CR-V (1.5T 192hp / e:HEV 204hp AWD)
UPDATE car_trims SET acceleration_0_100=8.9, top_speed_kmh=205, torque_nm=243, fuel_consumption=8.2, cargo_liters=589, curb_weight_kg=1529
WHERE make_slug='honda' AND model_slug='crv' AND is_israel=1 AND engine_hp<=195;
UPDATE car_trims SET acceleration_0_100=8.0, top_speed_kmh=180, torque_nm=315, fuel_consumption=5.9, cargo_liters=589, curb_weight_kg=1748
WHERE make_slug='honda' AND model_slug='crv' AND is_israel=1 AND engine_hp>195;

-- ── Suzuki ─────────────────────────────────────────────────────────────────

-- Swift (1.2 NA 83hp / 1.4T Sport 129hp)
UPDATE car_trims SET acceleration_0_100=12.3, top_speed_kmh=165, torque_nm=108, fuel_consumption=5.3, cargo_liters=265, curb_weight_kg=927
WHERE make_slug='suzuki' AND model_slug='swift' AND is_israel=1 AND engine_hp<=90;
UPDATE car_trims SET acceleration_0_100=8.1, top_speed_kmh=210, torque_nm=230, fuel_consumption=6.7, cargo_liters=267, curb_weight_kg=975
WHERE make_slug='suzuki' AND model_slug='swift' AND is_israel=1 AND engine_hp>90;

-- Vitara (1.4T 129hp MHEV / 1.4T AWD 129hp)
UPDATE car_trims SET acceleration_0_100=10.0, top_speed_kmh=185, torque_nm=235, fuel_consumption=5.8, cargo_liters=375, curb_weight_kg=1090
WHERE make_slug='suzuki' AND model_slug='vitara' AND is_israel=1;

-- S-Cross (1.4T 129hp MHEV / 1.4T AWD)
UPDATE car_trims SET acceleration_0_100=9.9, top_speed_kmh=192, torque_nm=235, fuel_consumption=6.1, cargo_liters=430, curb_weight_kg=1210
WHERE make_slug='suzuki' AND model_slug='scross' AND is_israel=1;

-- Jimny (1.5L 102hp 4WD)
UPDATE car_trims SET acceleration_0_100=14.5, top_speed_kmh=150, torque_nm=130, fuel_consumption=8.4, cargo_liters=85, curb_weight_kg=1090
WHERE make_slug='suzuki' AND model_slug='jimny' AND is_israel=1;

-- ── Seat ───────────────────────────────────────────────────────────────────

-- Ibiza (1.0 MPI 80hp / 1.0 TSI 95-115hp / 1.5 TSI 150hp)
UPDATE car_trims SET acceleration_0_100=13.2, top_speed_kmh=174, torque_nm=95, fuel_consumption=5.5, cargo_liters=355, curb_weight_kg=1095
WHERE make_slug='seat' AND model_slug='ibiza' AND is_israel=1 AND engine_hp<=85;
UPDATE car_trims SET acceleration_0_100=11.2, top_speed_kmh=185, torque_nm=175, fuel_consumption=5.3, cargo_liters=355, curb_weight_kg=1118
WHERE make_slug='seat' AND model_slug='ibiza' AND is_israel=1 AND engine_hp>85 AND engine_hp<=100;
UPDATE car_trims SET acceleration_0_100=9.6, top_speed_kmh=195, torque_nm=200, fuel_consumption=5.5, cargo_liters=355, curb_weight_kg=1148
WHERE make_slug='seat' AND model_slug='ibiza' AND is_israel=1 AND engine_hp>100 AND engine_hp<=120;
UPDATE car_trims SET acceleration_0_100=8.0, top_speed_kmh=220, torque_nm=250, fuel_consumption=5.8, cargo_liters=355, curb_weight_kg=1181
WHERE make_slug='seat' AND model_slug='ibiza' AND is_israel=1 AND engine_hp>120;

-- Leon (1.5 TSI 150hp / 2.0 TSI 190hp / Cupra 300hp)
UPDATE car_trims SET acceleration_0_100=8.4, top_speed_kmh=221, torque_nm=250, fuel_consumption=6.0, cargo_liters=380, curb_weight_kg=1281
WHERE make_slug='seat' AND model_slug='leon' AND is_israel=1 AND engine_hp<=160;
UPDATE car_trims SET acceleration_0_100=7.1, top_speed_kmh=231, torque_nm=320, fuel_consumption=7.5, cargo_liters=380, curb_weight_kg=1370
WHERE make_slug='seat' AND model_slug='leon' AND is_israel=1 AND engine_hp>160 AND engine_hp<=200;
UPDATE car_trims SET acceleration_0_100=5.7, top_speed_kmh=250, torque_nm=400, fuel_consumption=9.4, cargo_liters=380, curb_weight_kg=1439
WHERE make_slug='seat' AND model_slug='leon' AND is_israel=1 AND engine_hp>200;

-- Arona (1.0 TSI 95-115hp / 1.5 TSI 150hp)
UPDATE car_trims SET acceleration_0_100=11.9, top_speed_kmh=183, torque_nm=160, fuel_consumption=5.5, cargo_liters=400, curb_weight_kg=1157
WHERE make_slug='seat' AND model_slug='arona' AND is_israel=1 AND engine_hp<=100;
UPDATE car_trims SET acceleration_0_100=10.9, top_speed_kmh=188, torque_nm=200, fuel_consumption=5.5, cargo_liters=400, curb_weight_kg=1186
WHERE make_slug='seat' AND model_slug='arona' AND is_israel=1 AND engine_hp>100 AND engine_hp<=120;
UPDATE car_trims SET acceleration_0_100=8.4, top_speed_kmh=205, torque_nm=250, fuel_consumption=5.8, cargo_liters=400, curb_weight_kg=1231
WHERE make_slug='seat' AND model_slug='arona' AND is_israel=1 AND engine_hp>120;

-- Ateca (1.5 TSI 150hp / 2.0 TSI 190hp AWD)
UPDATE car_trims SET acceleration_0_100=9.0, top_speed_kmh=210, torque_nm=250, fuel_consumption=6.5, cargo_liters=510, curb_weight_kg=1403
WHERE make_slug='seat' AND model_slug='ateca' AND is_israel=1 AND engine_hp<=160;
UPDATE car_trims SET acceleration_0_100=7.2, top_speed_kmh=218, torque_nm=320, fuel_consumption=7.8, cargo_liters=510, curb_weight_kg=1512
WHERE make_slug='seat' AND model_slug='ateca' AND is_israel=1 AND engine_hp>160;

-- ── Mitsubishi ─────────────────────────────────────────────────────────────

-- Space Star (1.0 71hp / 1.2 80hp)
UPDATE car_trims SET acceleration_0_100=15.2, top_speed_kmh=155, torque_nm=88, fuel_consumption=5.0, cargo_liters=235, curb_weight_kg=865
WHERE make_slug='mitsubishi' AND model_slug='space-star' AND is_israel=1 AND engine_hp<=75;
UPDATE car_trims SET acceleration_0_100=13.5, top_speed_kmh=165, torque_nm=102, fuel_consumption=4.9, cargo_liters=235, curb_weight_kg=895
WHERE make_slug='mitsubishi' AND model_slug='space-star' AND is_israel=1 AND engine_hp>75;

-- Colt (1.0T 96hp)
UPDATE car_trims SET acceleration_0_100=11.3, top_speed_kmh=178, torque_nm=200, fuel_consumption=5.5, cargo_liters=279, curb_weight_kg=1066
WHERE make_slug='mitsubishi' AND model_slug='colt' AND is_israel=1;

-- ASX (2.0L 150hp / 1.3T 160hp)
UPDATE car_trims SET acceleration_0_100=11.5, top_speed_kmh=190, torque_nm=196, fuel_consumption=7.9, cargo_liters=393, curb_weight_kg=1354
WHERE make_slug='mitsubishi' AND model_slug='asx' AND is_israel=1 AND engine_hp<=155;
UPDATE car_trims SET acceleration_0_100=9.8, top_speed_kmh=198, torque_nm=270, fuel_consumption=6.8, cargo_liters=393, curb_weight_kg=1359
WHERE make_slug='mitsubishi' AND model_slug='asx' AND is_israel=1 AND engine_hp>155;

-- Eclipse Cross (1.5T 163hp / PHEV 188hp)
UPDATE car_trims SET acceleration_0_100=9.5, top_speed_kmh=200, torque_nm=250, fuel_consumption=8.1, cargo_liters=341, curb_weight_kg=1519
WHERE make_slug='mitsubishi' AND model_slug='eclipse-cross' AND is_israel=1 AND engine_hp<=170;
UPDATE car_trims SET acceleration_0_100=10.5, top_speed_kmh=170, torque_nm=332, fuel_consumption=1.6, cargo_liters=344, curb_weight_kg=1839
WHERE make_slug='mitsubishi' AND model_slug='eclipse-cross' AND is_israel=1 AND engine_hp>170;

-- Outlander (2.5L 182hp / PHEV 241hp)
UPDATE car_trims SET acceleration_0_100=9.9, top_speed_kmh=200, torque_nm=245, fuel_consumption=8.9, cargo_liters=478, curb_weight_kg=1820
WHERE make_slug='mitsubishi' AND model_slug='outlander' AND is_israel=1 AND engine_hp<=190;
UPDATE car_trims SET acceleration_0_100=7.5, top_speed_kmh=200, torque_nm=332, fuel_consumption=1.7, cargo_liters=448, curb_weight_kg=2030
WHERE make_slug='mitsubishi' AND model_slug='outlander' AND is_israel=1 AND engine_hp>190;

-- Pajero Sport (2.4D 181hp AWD)
UPDATE car_trims SET acceleration_0_100=11.5, top_speed_kmh=185, torque_nm=430, fuel_consumption=9.8, cargo_liters=502, curb_weight_kg=1995
WHERE make_slug='mitsubishi' AND model_slug='pajero-sport' AND is_israel=1;

-- ── Nissan ─────────────────────────────────────────────────────────────────

-- Note (1.2L e-Power 136hp)
UPDATE car_trims SET acceleration_0_100=9.7, top_speed_kmh=145, torque_nm=290, fuel_consumption=4.5, cargo_liters=290, curb_weight_kg=1097
WHERE make_slug='nissan' AND model_slug='note' AND is_israel=1;

-- Juke (1.0T 114hp / 1.6 hybrid 143hp)
UPDATE car_trims SET acceleration_0_100=11.3, top_speed_kmh=187, torque_nm=180, fuel_consumption=6.1, cargo_liters=422, curb_weight_kg=1232
WHERE make_slug='nissan' AND model_slug='juke' AND is_israel=1 AND engine_hp<=120;
UPDATE car_trims SET acceleration_0_100=9.3, top_speed_kmh=170, torque_nm=148, fuel_consumption=5.2, cargo_liters=354, curb_weight_kg=1354
WHERE make_slug='nissan' AND model_slug='juke' AND is_israel=1 AND engine_hp>120;

-- Kicks (1.6 e-Power 136hp)
UPDATE car_trims SET acceleration_0_100=10.5, top_speed_kmh=163, torque_nm=260, fuel_consumption=5.9, cargo_liters=432, curb_weight_kg=1270
WHERE make_slug='nissan' AND model_slug='kicks' AND is_israel=1;

-- Qashqai (1.3 DiG-T 140hp / 158hp / e-Power 190hp)
UPDATE car_trims SET acceleration_0_100=9.9, top_speed_kmh=193, torque_nm=240, fuel_consumption=6.6, cargo_liters=504, curb_weight_kg=1390
WHERE make_slug='nissan' AND model_slug='qashqai' AND is_israel=1 AND engine_hp<=145;
UPDATE car_trims SET acceleration_0_100=8.9, top_speed_kmh=200, torque_nm=270, fuel_consumption=7.0, cargo_liters=504, curb_weight_kg=1417
WHERE make_slug='nissan' AND model_slug='qashqai' AND is_israel=1 AND engine_hp>145 AND engine_hp<=165;
UPDATE car_trims SET acceleration_0_100=7.9, top_speed_kmh=170, torque_nm=330, fuel_consumption=5.3, cargo_liters=504, curb_weight_kg=1640
WHERE make_slug='nissan' AND model_slug='qashqai' AND is_israel=1 AND engine_hp>165;

-- X-Trail (1.5 e-Power 204hp / 252hp AWD)
UPDATE car_trims SET acceleration_0_100=8.9, top_speed_kmh=170, torque_nm=330, fuel_consumption=6.2, cargo_liters=585, curb_weight_kg=1755
WHERE make_slug='nissan' AND model_slug='x-trail' AND is_israel=1 AND engine_hp<=210;
UPDATE car_trims SET acceleration_0_100=7.4, top_speed_kmh=170, torque_nm=330, fuel_consumption=5.5, cargo_liters=585, curb_weight_kg=1915
WHERE make_slug='nissan' AND model_slug='x-trail' AND is_israel=1 AND engine_hp>210;

-- Leaf (EV 150hp / 218hp e+)
UPDATE car_trims SET acceleration_0_100=7.9, top_speed_kmh=150, torque_nm=320, fuel_consumption=0.0, cargo_liters=435, curb_weight_kg=1579
WHERE make_slug='nissan' AND model_slug='leaf' AND is_israel=1 AND engine_hp<=155;
UPDATE car_trims SET acceleration_0_100=6.5, top_speed_kmh=157, torque_nm=340, fuel_consumption=0.0, cargo_liters=435, curb_weight_kg=1685
WHERE make_slug='nissan' AND model_slug='leaf' AND is_israel=1 AND engine_hp>155;

-- ── Subaru ─────────────────────────────────────────────────────────────────

-- XV / Impreza (2.0i 156hp AWD)
UPDATE car_trims SET acceleration_0_100=10.4, top_speed_kmh=195, torque_nm=194, fuel_consumption=7.5, cargo_liters=385, curb_weight_kg=1389
WHERE make_slug='subaru' AND model_slug='xv' AND is_israel=1;
UPDATE car_trims SET acceleration_0_100=10.4, top_speed_kmh=195, torque_nm=194, fuel_consumption=7.5, cargo_liters=345, curb_weight_kg=1409
WHERE make_slug='subaru' AND model_slug='impreza' AND is_israel=1;

-- Forester (2.5L 184hp AWD / 2.0 e-Boxer 150hp hybrid)
UPDATE car_trims SET acceleration_0_100=9.0, top_speed_kmh=200, torque_nm=239, fuel_consumption=9.0, cargo_liters=509, curb_weight_kg=1521
WHERE make_slug='subaru' AND model_slug='forester' AND is_israel=1 AND engine_hp>155;
UPDATE car_trims SET acceleration_0_100=11.7, top_speed_kmh=200, torque_nm=175, fuel_consumption=7.2, cargo_liters=509, curb_weight_kg=1595
WHERE make_slug='subaru' AND model_slug='forester' AND is_israel=1 AND engine_hp<=155;

-- Outback (2.5L 169hp AWD / 2.5T 265hp AWD)
UPDATE car_trims SET acceleration_0_100=9.6, top_speed_kmh=200, torque_nm=239, fuel_consumption=9.2, cargo_liters=559, curb_weight_kg=1596
WHERE make_slug='subaru' AND model_slug='outback' AND is_israel=1 AND engine_hp<=180;
UPDATE car_trims SET acceleration_0_100=6.5, top_speed_kmh=230, torque_nm=350, fuel_consumption=9.5, cargo_liters=559, curb_weight_kg=1670
WHERE make_slug='subaru' AND model_slug='outback' AND is_israel=1 AND engine_hp>180;

-- ── Mazda ─────────────────────────────────────────────────────────────────

-- Mazda 3 (2.0L 122hp / 2.5L 186hp / 2.5T 265hp)
UPDATE car_trims SET acceleration_0_100=10.0, top_speed_kmh=197, torque_nm=213, fuel_consumption=6.1, cargo_liters=295, curb_weight_kg=1313
WHERE make_slug='mazda' AND model_slug='mazda3' AND is_israel=1 AND engine_hp<=130;
UPDATE car_trims SET acceleration_0_100=8.7, top_speed_kmh=213, torque_nm=254, fuel_consumption=7.2, cargo_liters=295, curb_weight_kg=1399
WHERE make_slug='mazda' AND model_slug='mazda3' AND is_israel=1 AND engine_hp>130 AND engine_hp<=200;
UPDATE car_trims SET acceleration_0_100=6.6, top_speed_kmh=255, torque_nm=420, fuel_consumption=9.5, cargo_liters=295, curb_weight_kg=1459
WHERE make_slug='mazda' AND model_slug='mazda3' AND is_israel=1 AND engine_hp>200;

-- Mazda 6 (2.5L 192hp)
UPDATE car_trims SET acceleration_0_100=8.4, top_speed_kmh=218, torque_nm=252, fuel_consumption=7.6, cargo_liters=480, curb_weight_kg=1465
WHERE make_slug='mazda' AND model_slug='mazda6' AND is_israel=1;

-- CX-3 (2.0L 122hp)
UPDATE car_trims SET acceleration_0_100=9.4, top_speed_kmh=195, torque_nm=213, fuel_consumption=6.4, cargo_liters=264, curb_weight_kg=1213
WHERE make_slug='mazda' AND model_slug='cx3' AND is_israel=1;

-- CX-30 (2.0L 122hp MHEV / 2.0T 265hp)
UPDATE car_trims SET acceleration_0_100=9.7, top_speed_kmh=200, torque_nm=213, fuel_consumption=6.3, cargo_liters=430, curb_weight_kg=1365
WHERE make_slug='mazda' AND model_slug='cx30' AND is_israel=1 AND engine_hp<=130;
UPDATE car_trims SET acceleration_0_100=6.5, top_speed_kmh=255, torque_nm=420, fuel_consumption=8.9, cargo_liters=430, curb_weight_kg=1509
WHERE make_slug='mazda' AND model_slug='cx30' AND is_israel=1 AND engine_hp>130;

-- CX-5 (2.0L 165hp / 2.5L 194hp / 2.5T 231hp AWD)
UPDATE car_trims SET acceleration_0_100=10.2, top_speed_kmh=193, torque_nm=213, fuel_consumption=7.5, cargo_liters=442, curb_weight_kg=1481
WHERE make_slug='mazda' AND model_slug='cx5' AND is_israel=1 AND engine_hp<=170;
UPDATE car_trims SET acceleration_0_100=9.7, top_speed_kmh=204, torque_nm=252, fuel_consumption=8.5, cargo_liters=442, curb_weight_kg=1550
WHERE make_slug='mazda' AND model_slug='cx5' AND is_israel=1 AND engine_hp>170 AND engine_hp<=200;
UPDATE car_trims SET acceleration_0_100=8.3, top_speed_kmh=224, torque_nm=420, fuel_consumption=9.0, cargo_liters=442, curb_weight_kg=1620
WHERE make_slug='mazda' AND model_slug='cx5' AND is_israel=1 AND engine_hp>200;

-- MX-5 (1.5L 132hp / 2.0L 184hp)
UPDATE car_trims SET acceleration_0_100=8.3, top_speed_kmh=214, torque_nm=150, fuel_consumption=6.7, cargo_liters=130, curb_weight_kg=985
WHERE make_slug='mazda' AND model_slug='mx5' AND is_israel=1 AND engine_hp<=140;
UPDATE car_trims SET acceleration_0_100=6.5, top_speed_kmh=226, torque_nm=205, fuel_consumption=7.2, cargo_liters=130, curb_weight_kg=1012
WHERE make_slug='mazda' AND model_slug='mx5' AND is_israel=1 AND engine_hp>140;

-- ── Ford ───────────────────────────────────────────────────────────────────

-- Fiesta (1.0 eTSI 100hp / 125hp / ST 200hp)
UPDATE car_trims SET acceleration_0_100=11.8, top_speed_kmh=188, torque_nm=170, fuel_consumption=5.4, cargo_liters=292, curb_weight_kg=1026
WHERE make_slug='ford' AND model_slug='fiesta' AND is_israel=1 AND engine_hp<=105;
UPDATE car_trims SET acceleration_0_100=10.0, top_speed_kmh=202, torque_nm=190, fuel_consumption=5.4, cargo_liters=292, curb_weight_kg=1090
WHERE make_slug='ford' AND model_slug='fiesta' AND is_israel=1 AND engine_hp>105 AND engine_hp<=135;
UPDATE car_trims SET acceleration_0_100=6.5, top_speed_kmh=222, torque_nm=290, fuel_consumption=7.3, cargo_liters=292, curb_weight_kg=1164
WHERE make_slug='ford' AND model_slug='fiesta' AND is_israel=1 AND engine_hp>135;

-- Focus (1.0 eTSI 125hp / 155hp / 2.3T ST 280hp)
UPDATE car_trims SET acceleration_0_100=10.0, top_speed_kmh=202, torque_nm=190, fuel_consumption=5.5, cargo_liters=341, curb_weight_kg=1270
WHERE make_slug='ford' AND model_slug='focus' AND is_israel=1 AND engine_hp<=130;
UPDATE car_trims SET acceleration_0_100=8.5, top_speed_kmh=218, torque_nm=240, fuel_consumption=6.0, cargo_liters=341, curb_weight_kg=1307
WHERE make_slug='ford' AND model_slug='focus' AND is_israel=1 AND engine_hp>130 AND engine_hp<=165;
UPDATE car_trims SET acceleration_0_100=5.8, top_speed_kmh=250, torque_nm=420, fuel_consumption=9.5, cargo_liters=341, curb_weight_kg=1449
WHERE make_slug='ford' AND model_slug='focus' AND is_israel=1 AND engine_hp>165;

-- Puma (1.0 eTSI 125hp / 155hp / ST 200hp)
UPDATE car_trims SET acceleration_0_100=10.3, top_speed_kmh=200, torque_nm=190, fuel_consumption=5.4, cargo_liters=456, curb_weight_kg=1249
WHERE make_slug='ford' AND model_slug='puma' AND is_israel=1 AND engine_hp<=130;
UPDATE car_trims SET acceleration_0_100=9.4, top_speed_kmh=220, torque_nm=240, fuel_consumption=5.8, cargo_liters=456, curb_weight_kg=1268
WHERE make_slug='ford' AND model_slug='puma' AND is_israel=1 AND engine_hp>130 AND engine_hp<=160;
UPDATE car_trims SET acceleration_0_100=6.7, top_speed_kmh=240, torque_nm=320, fuel_consumption=7.8, cargo_liters=456, curb_weight_kg=1330
WHERE make_slug='ford' AND model_slug='puma' AND is_israel=1 AND engine_hp>160;

-- Kuga (1.5 EcoB 150hp / PHEV 225hp / Plug-in)
UPDATE car_trims SET acceleration_0_100=9.8, top_speed_kmh=209, torque_nm=240, fuel_consumption=7.0, cargo_liters=475, curb_weight_kg=1481
WHERE make_slug='ford' AND model_slug='kuga' AND is_israel=1 AND engine_hp<=160;
UPDATE car_trims SET acceleration_0_100=9.0, top_speed_kmh=200, torque_nm=200, fuel_consumption=1.3, cargo_liters=475, curb_weight_kg=1885
WHERE make_slug='ford' AND model_slug='kuga' AND is_israel=1 AND engine_hp>160;

-- ── Opel ───────────────────────────────────────────────────────────────────

-- Corsa (1.2T 100hp / 1.2T 130hp / Electric 136hp)
UPDATE car_trims SET acceleration_0_100=12.5, top_speed_kmh=185, torque_nm=190, fuel_consumption=5.6, cargo_liters=267, curb_weight_kg=1093
WHERE make_slug='opel' AND model_slug='corsa' AND is_israel=1 AND engine_hp<=105;
UPDATE car_trims SET acceleration_0_100=9.7, top_speed_kmh=205, torque_nm=230, fuel_consumption=5.8, cargo_liters=267, curb_weight_kg=1163
WHERE make_slug='opel' AND model_slug='corsa' AND is_israel=1 AND engine_hp>105 AND engine_hp<=135;
UPDATE car_trims SET acceleration_0_100=8.1, top_speed_kmh=150, torque_nm=260, fuel_consumption=0.0, cargo_liters=267, curb_weight_kg=1504
WHERE make_slug='opel' AND model_slug='corsa' AND is_israel=1 AND engine_hp>135;

-- Mokka (1.2T 130hp / Electric 136hp)
UPDATE car_trims SET acceleration_0_100=9.9, top_speed_kmh=202, torque_nm=230, fuel_consumption=5.9, cargo_liters=350, curb_weight_kg=1190
WHERE make_slug='opel' AND model_slug='mokka' AND is_israel=1 AND engine_hp<=135;
UPDATE car_trims SET acceleration_0_100=9.0, top_speed_kmh=150, torque_nm=260, fuel_consumption=0.0, cargo_liters=310, curb_weight_kg=1535
WHERE make_slug='opel' AND model_slug='mokka' AND is_israel=1 AND engine_hp>135;

-- Crossland (1.2T 110hp / 1.2T 130hp)
UPDATE car_trims SET acceleration_0_100=11.3, top_speed_kmh=188, torque_nm=205, fuel_consumption=6.3, cargo_liters=410, curb_weight_kg=1226
WHERE make_slug='opel' AND model_slug='crossland' AND is_israel=1 AND engine_hp<=115;
UPDATE car_trims SET acceleration_0_100=9.9, top_speed_kmh=200, torque_nm=230, fuel_consumption=6.5, cargo_liters=410, curb_weight_kg=1261
WHERE make_slug='opel' AND model_slug='crossland' AND is_israel=1 AND engine_hp>115;

-- Grandland (1.2T 130hp / 1.6T 225hp AWD PHEV)
UPDATE car_trims SET acceleration_0_100=9.9, top_speed_kmh=205, torque_nm=230, fuel_consumption=6.5, cargo_liters=514, curb_weight_kg=1383
WHERE make_slug='opel' AND model_slug='grandland' AND is_israel=1 AND engine_hp<=160;
UPDATE car_trims SET acceleration_0_100=7.5, top_speed_kmh=222, torque_nm=320, fuel_consumption=1.4, cargo_liters=514, curb_weight_kg=1881
WHERE make_slug='opel' AND model_slug='grandland' AND is_israel=1 AND engine_hp>160;

-- Astra (1.2T 130hp / 1.6 PHEV 225hp)
UPDATE car_trims SET acceleration_0_100=9.9, top_speed_kmh=208, torque_nm=230, fuel_consumption=6.3, cargo_liters=422, curb_weight_kg=1325
WHERE make_slug='opel' AND model_slug='astra' AND is_israel=1 AND engine_hp<=160;
UPDATE car_trims SET acceleration_0_100=7.5, top_speed_kmh=222, torque_nm=360, fuel_consumption=1.3, cargo_liters=422, curb_weight_kg=1765
WHERE make_slug='opel' AND model_slug='astra' AND is_israel=1 AND engine_hp>160;

-- ── Chery ──────────────────────────────────────────────────────────────────

-- Arrizo 6 (1.5T 147hp)
UPDATE car_trims SET acceleration_0_100=10.0, top_speed_kmh=185, torque_nm=210, fuel_consumption=7.5, cargo_liters=510, curb_weight_kg=1290
WHERE make_slug='chery' AND model_slug='arrizo6' AND is_israel=1;

-- Omoda 5 (1.6T 150hp)
UPDATE car_trims SET acceleration_0_100=9.8, top_speed_kmh=185, torque_nm=210, fuel_consumption=8.0, cargo_liters=374, curb_weight_kg=1436
WHERE make_slug='chery' AND model_slug='omoda5' AND is_israel=1;

-- Tiggo 7 (1.5T 147hp)
UPDATE car_trims SET acceleration_0_100=10.5, top_speed_kmh=185, torque_nm=210, fuel_consumption=8.0, cargo_liters=475, curb_weight_kg=1480
WHERE make_slug='chery' AND model_slug='tiggo7' AND is_israel=1;

-- Tiggo 8 (1.5T 147hp / 1.5T PHEV 335hp)
UPDATE car_trims SET acceleration_0_100=10.0, top_speed_kmh=185, torque_nm=210, fuel_consumption=8.5, cargo_liters=425, curb_weight_kg=1696
WHERE make_slug='chery' AND model_slug='tiggo8' AND is_israel=1 AND engine_hp<=160;
UPDATE car_trims SET acceleration_0_100=8.5, top_speed_kmh=180, torque_nm=290, fuel_consumption=1.7, cargo_liters=425, curb_weight_kg=1960
WHERE make_slug='chery' AND model_slug='tiggo8' AND is_israel=1 AND engine_hp>160;

-- ── BYD ────────────────────────────────────────────────────────────────────

-- Dolphin (EV 95hp / 204hp)
UPDATE car_trims SET acceleration_0_100=12.3, top_speed_kmh=150, torque_nm=180, fuel_consumption=0.0, cargo_liters=308, curb_weight_kg=1490
WHERE make_slug='byd' AND model_slug='dolphin' AND is_israel=1 AND engine_hp<=100;
UPDATE car_trims SET acceleration_0_100=7.0, top_speed_kmh=160, torque_nm=310, fuel_consumption=0.0, cargo_liters=308, curb_weight_kg=1550
WHERE make_slug='byd' AND model_slug='dolphin' AND is_israel=1 AND engine_hp>100;

-- Atto 3 (EV 204hp)
UPDATE car_trims SET acceleration_0_100=7.3, top_speed_kmh=160, torque_nm=310, fuel_consumption=0.0, cargo_liters=440, curb_weight_kg=1750
WHERE make_slug='byd' AND model_slug='atto3' AND is_israel=1;

-- Seal (RWD 313hp / AWD 523hp)
UPDATE car_trims SET acceleration_0_100=5.9, top_speed_kmh=180, torque_nm=360, fuel_consumption=0.0, cargo_liters=400, curb_weight_kg=2005
WHERE make_slug='byd' AND model_slug='seal' AND is_israel=1 AND engine_hp<=320;
UPDATE car_trims SET acceleration_0_100=3.8, top_speed_kmh=200, torque_nm=670, fuel_consumption=0.0, cargo_liters=400, curb_weight_kg=2150
WHERE make_slug='byd' AND model_slug='seal' AND is_israel=1 AND engine_hp>320;

-- Han (EV RWD 286hp / AWD 517hp)
UPDATE car_trims SET acceleration_0_100=7.9, top_speed_kmh=180, torque_nm=350, fuel_consumption=0.0, cargo_liters=410, curb_weight_kg=2090
WHERE make_slug='byd' AND model_slug='han' AND is_israel=1 AND engine_hp<=300;
UPDATE car_trims SET acceleration_0_100=3.9, top_speed_kmh=180, torque_nm=700, fuel_consumption=0.0, cargo_liters=410, curb_weight_kg=2250
WHERE make_slug='byd' AND model_slug='han' AND is_israel=1 AND engine_hp>300;

-- Sealion 6 PHEV (AWD 308hp)
UPDATE car_trims SET acceleration_0_100=6.9, top_speed_kmh=185, torque_nm=350, fuel_consumption=1.2, cargo_liters=425, curb_weight_kg=1955
WHERE make_slug='byd' AND model_slug='sealion6' AND is_israel=1;

-- Sealion 7 (EV RWD 313hp / AWD 475hp)
UPDATE car_trims SET acceleration_0_100=6.7, top_speed_kmh=175, torque_nm=360, fuel_consumption=0.0, cargo_liters=580, curb_weight_kg=2200
WHERE make_slug='byd' AND model_slug='sealion7' AND is_israel=1 AND engine_hp<=320;
UPDATE car_trims SET acceleration_0_100=4.5, top_speed_kmh=200, torque_nm=680, fuel_consumption=0.0, cargo_liters=580, curb_weight_kg=2310
WHERE make_slug='byd' AND model_slug='sealion7' AND is_israel=1 AND engine_hp>320;

-- Tang (AWD EV 456hp)
UPDATE car_trims SET acceleration_0_100=4.6, top_speed_kmh=180, torque_nm=680, fuel_consumption=0.0, cargo_liters=235, curb_weight_kg=2545
WHERE make_slug='byd' AND model_slug='tang' AND is_israel=1;

-- ── BMW ─────────────────────────────────────────────────────────────────────

-- Series 1 (118i 136hp / 120i 170hp / M135i 306hp / M140i 340hp)
UPDATE car_trims SET acceleration_0_100=10.2, top_speed_kmh=202, torque_nm=230, fuel_consumption=6.2, cargo_liters=380, curb_weight_kg=1435
WHERE make_slug='bmw' AND model_slug='series1' AND is_israel=1 AND engine_hp<=140;
UPDATE car_trims SET acceleration_0_100=8.5, top_speed_kmh=230, torque_nm=280, fuel_consumption=6.9, cargo_liters=380, curb_weight_kg=1460
WHERE make_slug='bmw' AND model_slug='series1' AND is_israel=1 AND engine_hp>140 AND engine_hp<=180;
UPDATE car_trims SET acceleration_0_100=4.9, top_speed_kmh=250, torque_nm=450, fuel_consumption=9.0, cargo_liters=380, curb_weight_kg=1540
WHERE make_slug='bmw' AND model_slug='series1' AND is_israel=1 AND engine_hp>180 AND engine_hp<=310;
UPDATE car_trims SET acceleration_0_100=4.5, top_speed_kmh=250, torque_nm=500, fuel_consumption=9.5, cargo_liters=380, curb_weight_kg=1590
WHERE make_slug='bmw' AND model_slug='series1' AND is_israel=1 AND engine_hp>310;

-- Series 3 (318i 156hp / 320i 184hp / 330i 258hp / M340i 374hp)
UPDATE car_trims SET acceleration_0_100=9.7, top_speed_kmh=210, torque_nm=250, fuel_consumption=6.8, cargo_liters=480, curb_weight_kg=1495
WHERE make_slug='bmw' AND model_slug='series3' AND is_israel=1 AND engine_hp<=160;
UPDATE car_trims SET acceleration_0_100=8.0, top_speed_kmh=235, torque_nm=300, fuel_consumption=7.1, cargo_liters=480, curb_weight_kg=1540
WHERE make_slug='bmw' AND model_slug='series3' AND is_israel=1 AND engine_hp>160 AND engine_hp<=190;
UPDATE car_trims SET acceleration_0_100=5.8, top_speed_kmh=250, torque_nm=400, fuel_consumption=8.1, cargo_liters=480, curb_weight_kg=1595
WHERE make_slug='bmw' AND model_slug='series3' AND is_israel=1 AND engine_hp>190 AND engine_hp<=270;
UPDATE car_trims SET acceleration_0_100=4.4, top_speed_kmh=250, torque_nm=500, fuel_consumption=9.5, cargo_liters=480, curb_weight_kg=1720
WHERE make_slug='bmw' AND model_slug='series3' AND is_israel=1 AND engine_hp>270;

-- Series 5 (520i 208hp / 530i 245hp / 540i 380hp)
UPDATE car_trims SET acceleration_0_100=8.3, top_speed_kmh=240, torque_nm=300, fuel_consumption=7.5, cargo_liters=530, curb_weight_kg=1685
WHERE make_slug='bmw' AND model_slug='series5' AND is_israel=1 AND engine_hp<=220;
UPDATE car_trims SET acceleration_0_100=6.6, top_speed_kmh=250, torque_nm=400, fuel_consumption=8.1, cargo_liters=530, curb_weight_kg=1720
WHERE make_slug='bmw' AND model_slug='series5' AND is_israel=1 AND engine_hp>220 AND engine_hp<=260;
UPDATE car_trims SET acceleration_0_100=4.6, top_speed_kmh=250, torque_nm=500, fuel_consumption=9.2, cargo_liters=530, curb_weight_kg=1830
WHERE make_slug='bmw' AND model_slug='series5' AND is_israel=1 AND engine_hp>260;

-- X1 (sDrive18i 136hp / xDrive23i 218hp / xDrive25e PHEV)
UPDATE car_trims SET acceleration_0_100=9.7, top_speed_kmh=207, torque_nm=230, fuel_consumption=6.7, cargo_liters=540, curb_weight_kg=1530
WHERE make_slug='bmw' AND model_slug='x1' AND is_israel=1 AND engine_hp<=145;
UPDATE car_trims SET acceleration_0_100=6.9, top_speed_kmh=242, torque_nm=300, fuel_consumption=7.5, cargo_liters=540, curb_weight_kg=1705
WHERE make_slug='bmw' AND model_slug='x1' AND is_israel=1 AND engine_hp>145 AND engine_hp<=230;
UPDATE car_trims SET acceleration_0_100=6.1, top_speed_kmh=202, torque_nm=450, fuel_consumption=1.5, cargo_liters=540, curb_weight_kg=1895
WHERE make_slug='bmw' AND model_slug='x1' AND is_israel=1 AND engine_hp>230;

-- X3 (xDrive20i 184hp / xDrive30i 258hp / M40i 360hp)
UPDATE car_trims SET acceleration_0_100=8.0, top_speed_kmh=210, torque_nm=290, fuel_consumption=8.0, cargo_liters=550, curb_weight_kg=1770
WHERE make_slug='bmw' AND model_slug='x3' AND is_israel=1 AND engine_hp<=200;
UPDATE car_trims SET acceleration_0_100=6.0, top_speed_kmh=245, torque_nm=400, fuel_consumption=9.0, cargo_liters=550, curb_weight_kg=1830
WHERE make_slug='bmw' AND model_slug='x3' AND is_israel=1 AND engine_hp>200 AND engine_hp<=270;
UPDATE car_trims SET acceleration_0_100=4.5, top_speed_kmh=250, torque_nm=500, fuel_consumption=10.5, cargo_liters=550, curb_weight_kg=1920
WHERE make_slug='bmw' AND model_slug='x3' AND is_israel=1 AND engine_hp>270;

-- X5 (xDrive40i 340hp / xDrive50i 530hp / xDrive45e PHEV)
UPDATE car_trims SET acceleration_0_100=5.5, top_speed_kmh=250, torque_nm=450, fuel_consumption=11.0, cargo_liters=650, curb_weight_kg=2090
WHERE make_slug='bmw' AND model_slug='x5' AND is_israel=1 AND engine_hp<=360;
UPDATE car_trims SET acceleration_0_100=4.3, top_speed_kmh=250, torque_nm=750, fuel_consumption=12.5, cargo_liters=650, curb_weight_kg=2270
WHERE make_slug='bmw' AND model_slug='x5' AND is_israel=1 AND engine_hp>360;

-- iX3 (EV 286hp)
UPDATE car_trims SET acceleration_0_100=6.8, top_speed_kmh=180, torque_nm=400, fuel_consumption=0.0, cargo_liters=510, curb_weight_kg=2185
WHERE make_slug='bmw' AND model_slug='ix3' AND is_israel=1;

-- ── Alfa Romeo ─────────────────────────────────────────────────────────────

-- Giulietta (1.4T 120hp / 1.4T 150hp)
UPDATE car_trims SET acceleration_0_100=10.2, top_speed_kmh=200, torque_nm=215, fuel_consumption=6.4, cargo_liters=350, curb_weight_kg=1314
WHERE make_slug='alfa-romeo' AND model_slug='giulietta' AND is_israel=1 AND engine_hp<=125;
UPDATE car_trims SET acceleration_0_100=8.2, top_speed_kmh=218, torque_nm=250, fuel_consumption=6.7, cargo_liters=350, curb_weight_kg=1332
WHERE make_slug='alfa-romeo' AND model_slug='giulietta' AND is_israel=1 AND engine_hp>125;

-- Giulia (2.0T 200hp / 2.0T 280hp / QV 510hp)
UPDATE car_trims SET acceleration_0_100=7.0, top_speed_kmh=230, torque_nm=330, fuel_consumption=8.2, cargo_liters=480, curb_weight_kg=1524
WHERE make_slug='alfa-romeo' AND model_slug='giulia' AND is_israel=1 AND engine_hp<=210;
UPDATE car_trims SET acceleration_0_100=5.2, top_speed_kmh=240, torque_nm=400, fuel_consumption=9.0, cargo_liters=480, curb_weight_kg=1585
WHERE make_slug='alfa-romeo' AND model_slug='giulia' AND is_israel=1 AND engine_hp>210 AND engine_hp<=300;
UPDATE car_trims SET acceleration_0_100=3.9, top_speed_kmh=307, torque_nm=600, fuel_consumption=12.9, cargo_liters=480, curb_weight_kg=1585
WHERE make_slug='alfa-romeo' AND model_slug='giulia' AND is_israel=1 AND engine_hp>300;

-- Stelvio (2.0T 200hp AWD / 2.0T 280hp AWD / QV 510hp AWD)
UPDATE car_trims SET acceleration_0_100=6.6, top_speed_kmh=230, torque_nm=330, fuel_consumption=9.4, cargo_liters=525, curb_weight_kg=1766
WHERE make_slug='alfa-romeo' AND model_slug='stelvio' AND is_israel=1 AND engine_hp<=210;
UPDATE car_trims SET acceleration_0_100=5.5, top_speed_kmh=243, torque_nm=400, fuel_consumption=10.2, cargo_liters=525, curb_weight_kg=1830
WHERE make_slug='alfa-romeo' AND model_slug='stelvio' AND is_israel=1 AND engine_hp>210 AND engine_hp<=300;
UPDATE car_trims SET acceleration_0_100=3.8, top_speed_kmh=283, torque_nm=600, fuel_consumption=13.8, cargo_liters=525, curb_weight_kg=1830
WHERE make_slug='alfa-romeo' AND model_slug='stelvio' AND is_israel=1 AND engine_hp>300;

-- Tonale (1.3T 130hp / 1.5T 160hp / PHEV 280hp AWD)
UPDATE car_trims SET acceleration_0_100=10.0, top_speed_kmh=200, torque_nm=230, fuel_consumption=6.5, cargo_liters=500, curb_weight_kg=1533
WHERE make_slug='alfa-romeo' AND model_slug='tonale' AND is_israel=1 AND engine_hp<=140;
UPDATE car_trims SET acceleration_0_100=8.8, top_speed_kmh=210, torque_nm=240, fuel_consumption=6.8, cargo_liters=500, curb_weight_kg=1560
WHERE make_slug='alfa-romeo' AND model_slug='tonale' AND is_israel=1 AND engine_hp>140 AND engine_hp<=170;
UPDATE car_trims SET acceleration_0_100=6.2, top_speed_kmh=205, torque_nm=370, fuel_consumption=1.5, cargo_liters=405, curb_weight_kg=1882
WHERE make_slug='alfa-romeo' AND model_slug='tonale' AND is_israel=1 AND engine_hp>170;

-- ── Audi ───────────────────────────────────────────────────────────────────

-- A3 (1.5T 150hp / 2.0T S3 310hp / RS3 400hp)
UPDATE car_trims SET acceleration_0_100=8.4, top_speed_kmh=224, torque_nm=250, fuel_consumption=6.5, cargo_liters=325, curb_weight_kg=1365
WHERE make_slug='audi' AND model_slug='a3' AND is_israel=1 AND engine_hp<=160;
UPDATE car_trims SET acceleration_0_100=4.9, top_speed_kmh=250, torque_nm=400, fuel_consumption=9.0, cargo_liters=325, curb_weight_kg=1490
WHERE make_slug='audi' AND model_slug='a3' AND is_israel=1 AND engine_hp>160 AND engine_hp<=320;
UPDATE car_trims SET acceleration_0_100=3.8, top_speed_kmh=290, torque_nm=500, fuel_consumption=10.5, cargo_liters=325, curb_weight_kg=1570
WHERE make_slug='audi' AND model_slug='a3' AND is_israel=1 AND engine_hp>320;

-- A4 (2.0T 204hp AWD)
UPDATE car_trims SET acceleration_0_100=7.1, top_speed_kmh=240, torque_nm=320, fuel_consumption=8.0, cargo_liters=495, curb_weight_kg=1610
WHERE make_slug='audi' AND model_slug='a4' AND is_israel=1;

-- A6 (2.0T 245hp / 3.0T 340hp)
UPDATE car_trims SET acceleration_0_100=7.0, top_speed_kmh=250, torque_nm=370, fuel_consumption=8.5, cargo_liters=530, curb_weight_kg=1705
WHERE make_slug='audi' AND model_slug='a6' AND is_israel=1 AND engine_hp<=250;
UPDATE car_trims SET acceleration_0_100=5.1, top_speed_kmh=250, torque_nm=500, fuel_consumption=9.5, cargo_liters=530, curb_weight_kg=1840
WHERE make_slug='audi' AND model_slug='a6' AND is_israel=1 AND engine_hp>250;

-- Q3 (1.5T 150hp / 2.0T 190hp AWD)
UPDATE car_trims SET acceleration_0_100=9.2, top_speed_kmh=208, torque_nm=250, fuel_consumption=7.2, cargo_liters=530, curb_weight_kg=1400
WHERE make_slug='audi' AND model_slug='q3' AND is_israel=1 AND engine_hp<=155;
UPDATE car_trims SET acceleration_0_100=7.1, top_speed_kmh=219, torque_nm=320, fuel_consumption=8.2, cargo_liters=530, curb_weight_kg=1545
WHERE make_slug='audi' AND model_slug='q3' AND is_israel=1 AND engine_hp>155 AND engine_hp<=210;
UPDATE car_trims SET acceleration_0_100=5.0, top_speed_kmh=250, torque_nm=480, fuel_consumption=10.5, cargo_liters=530, curb_weight_kg=1655
WHERE make_slug='audi' AND model_slug='q3' AND is_israel=1 AND engine_hp>210;

-- Q5 (2.0T 204hp AWD / 3.0T 261-268hp AWD SQ5 354hp)
UPDATE car_trims SET acceleration_0_100=7.4, top_speed_kmh=232, torque_nm=320, fuel_consumption=8.9, cargo_liters=620, curb_weight_kg=1765
WHERE make_slug='audi' AND model_slug='q5' AND is_israel=1 AND engine_hp<=210;
UPDATE car_trims SET acceleration_0_100=6.3, top_speed_kmh=245, torque_nm=400, fuel_consumption=9.7, cargo_liters=620, curb_weight_kg=1900
WHERE make_slug='audi' AND model_slug='q5' AND is_israel=1 AND engine_hp>210 AND engine_hp<=280;
UPDATE car_trims SET acceleration_0_100=5.4, top_speed_kmh=250, torque_nm=500, fuel_consumption=10.0, cargo_liters=620, curb_weight_kg=1990
WHERE make_slug='audi' AND model_slug='q5' AND is_israel=1 AND engine_hp>280;

-- e-tron (EV 313hp / 408hp / S 503hp)
UPDATE car_trims SET acceleration_0_100=6.8, top_speed_kmh=200, torque_nm=540, fuel_consumption=0.0, cargo_liters=660, curb_weight_kg=2490
WHERE make_slug='audi' AND model_slug='etron' AND is_israel=1 AND engine_hp<=320;
UPDATE car_trims SET acceleration_0_100=5.7, top_speed_kmh=200, torque_nm=664, fuel_consumption=0.0, cargo_liters=660, curb_weight_kg=2535
WHERE make_slug='audi' AND model_slug='etron' AND is_israel=1 AND engine_hp>320 AND engine_hp<=420;
UPDATE car_trims SET acceleration_0_100=4.5, top_speed_kmh=210, torque_nm=975, fuel_consumption=0.0, cargo_liters=660, curb_weight_kg=2630
WHERE make_slug='audi' AND model_slug='etron' AND is_israel=1 AND engine_hp>420;

-- ── Cupra ──────────────────────────────────────────────────────────────────

-- Formentor (1.5T 150hp / 2.0T 190hp / VZ 245hp AWD / VZ5 390hp AWD)
UPDATE car_trims SET acceleration_0_100=8.9, top_speed_kmh=210, torque_nm=250, fuel_consumption=6.5, cargo_liters=420, curb_weight_kg=1370
WHERE make_slug='cupra' AND model_slug='formentor' AND is_israel=1 AND engine_hp<=160;
UPDATE car_trims SET acceleration_0_100=7.5, top_speed_kmh=221, torque_nm=320, fuel_consumption=7.5, cargo_liters=420, curb_weight_kg=1440
WHERE make_slug='cupra' AND model_slug='formentor' AND is_israel=1 AND engine_hp>160 AND engine_hp<=200;
UPDATE car_trims SET acceleration_0_100=6.7, top_speed_kmh=240, torque_nm=400, fuel_consumption=8.5, cargo_liters=420, curb_weight_kg=1533
WHERE make_slug='cupra' AND model_slug='formentor' AND is_israel=1 AND engine_hp>200 AND engine_hp<=260;
UPDATE car_trims SET acceleration_0_100=4.2, top_speed_kmh=250, torque_nm=500, fuel_consumption=10.5, cargo_liters=420, curb_weight_kg=1640
WHERE make_slug='cupra' AND model_slug='formentor' AND is_israel=1 AND engine_hp>260;

-- Ateca (2.0T 190hp AWD)
UPDATE car_trims SET acceleration_0_100=7.4, top_speed_kmh=218, torque_nm=320, fuel_consumption=8.2, cargo_liters=510, curb_weight_kg=1520
WHERE make_slug='cupra' AND model_slug='ateca' AND is_israel=1;

-- Born (EV 204hp / 231hp)
UPDATE car_trims SET acceleration_0_100=7.3, top_speed_kmh=160, torque_nm=310, fuel_consumption=0.0, cargo_liters=385, curb_weight_kg=1765
WHERE make_slug='cupra' AND model_slug='born' AND is_israel=1 AND engine_hp<=210;
UPDATE car_trims SET acceleration_0_100=6.6, top_speed_kmh=200, torque_nm=545, fuel_consumption=0.0, cargo_liters=385, curb_weight_kg=1800
WHERE make_slug='cupra' AND model_slug='born' AND is_israel=1 AND engine_hp>210;

-- ── Dacia ──────────────────────────────────────────────────────────────────

-- Sandero (1.0 SCe 65hp / 1.0 TCe 90-100hp)
UPDATE car_trims SET acceleration_0_100=15.8, top_speed_kmh=158, torque_nm=95, fuel_consumption=5.6, cargo_liters=328, curb_weight_kg=1085
WHERE make_slug='dacia' AND model_slug='sandero' AND is_israel=1 AND engine_hp<=70;
UPDATE car_trims SET acceleration_0_100=12.3, top_speed_kmh=175, torque_nm=160, fuel_consumption=5.3, cargo_liters=328, curb_weight_kg=1118
WHERE make_slug='dacia' AND model_slug='sandero' AND is_israel=1 AND engine_hp>70;

-- Duster (1.0T 90hp / 1.3T 150hp AWD)
UPDATE car_trims SET acceleration_0_100=13.0, top_speed_kmh=170, torque_nm=160, fuel_consumption=5.8, cargo_liters=445, curb_weight_kg=1225
WHERE make_slug='dacia' AND model_slug='duster' AND is_israel=1 AND engine_hp<=100;
UPDATE car_trims SET acceleration_0_100=8.9, top_speed_kmh=190, torque_nm=250, fuel_consumption=7.4, cargo_liters=445, curb_weight_kg=1365
WHERE make_slug='dacia' AND model_slug='duster' AND is_israel=1 AND engine_hp>100;

-- Spring (EV 45hp / 65hp)
UPDATE car_trims SET acceleration_0_100=19.1, top_speed_kmh=125, torque_nm=125, fuel_consumption=0.0, cargo_liters=290, curb_weight_kg=974
WHERE make_slug='dacia' AND model_slug='spring' AND is_israel=1 AND engine_hp<=50;
UPDATE car_trims SET acceleration_0_100=13.7, top_speed_kmh=135, torque_nm=113, fuel_consumption=0.0, cargo_liters=290, curb_weight_kg=989
WHERE make_slug='dacia' AND model_slug='spring' AND is_israel=1 AND engine_hp>50;

-- ── Fiat ───────────────────────────────────────────────────────────────────

-- 500 (1.0 MHEV 70hp / 1.2 69hp)
UPDATE car_trims SET acceleration_0_100=13.8, top_speed_kmh=165, torque_nm=92, fuel_consumption=5.6, cargo_liters=185, curb_weight_kg=1010
WHERE make_slug='fiat' AND model_slug='500' AND is_israel=1;

-- 500e (EV 118hp / 95hp)
UPDATE car_trims SET acceleration_0_100=9.5, top_speed_kmh=135, torque_nm=220, fuel_consumption=0.0, cargo_liters=185, curb_weight_kg=1385
WHERE make_slug='fiat' AND model_slug='500e' AND is_israel=1 AND engine_hp<=100;
UPDATE car_trims SET acceleration_0_100=9.0, top_speed_kmh=150, torque_nm=220, fuel_consumption=0.0, cargo_liters=185, curb_weight_kg=1395
WHERE make_slug='fiat' AND model_slug='500e' AND is_israel=1 AND engine_hp>100;

-- 500X (1.3T 150hp)
UPDATE car_trims SET acceleration_0_100=8.8, top_speed_kmh=200, torque_nm=270, fuel_consumption=7.1, cargo_liters=350, curb_weight_kg=1393
WHERE make_slug='fiat' AND model_slug='500x' AND is_israel=1;

-- Doblo (1.5T 130hp)
UPDATE car_trims SET acceleration_0_100=10.5, top_speed_kmh=185, torque_nm=230, fuel_consumption=6.5, cargo_liters=800, curb_weight_kg=1500
WHERE make_slug='fiat' AND model_slug='doblo' AND is_israel=1;

-- ── Chevrolet ──────────────────────────────────────────────────────────────

-- Spark (1.2L 84hp)
UPDATE car_trims SET acceleration_0_100=13.5, top_speed_kmh=161, torque_nm=118, fuel_consumption=5.6, cargo_liters=170, curb_weight_kg=991
WHERE make_slug='chevrolet' AND model_slug='spark' AND is_israel=1;

-- Cruze (1.4T 140hp)
UPDATE car_trims SET acceleration_0_100=9.5, top_speed_kmh=200, torque_nm=200, fuel_consumption=6.5, cargo_liters=428, curb_weight_kg=1330
WHERE make_slug='chevrolet' AND model_slug='cruze' AND is_israel=1;
