-- ============================================================
-- Fix Alfa Romeo Giulietta images
-- ============================================================

-- 1. Hide vintage 1950s-1960s Giulietta images (classic cars at retro shows)
UPDATE car_images SET hidden = 1, hidden_reason = 'vintage-car'
WHERE make_slug = 'alfa-romeo' AND model_slug = 'giulietta'
  AND id IN (
    -- Year 2020 — all vintage/old photos tagged with 2020 event dates
    '50dddf1c-fff1-4a62-a5b2-db99bf8b8438', -- Sprint Speciale Retro Classics 2020
    '301aafb7-16c1-41ea-8e9b-8d1b74d76246', -- 1960 Sprint Speciale
    'dde21c7c-af69-40fd-823f-cc9b9cc46edf', -- Sprint del 1954 (MAUTO)
    '9e5f5878-20af-4f75-b741-159a70aa6331', -- Giulietta SS Coupé (vintage)
    'c8991dce-e6e8-4878-a37c-58dcf96fe2ab', -- Alpha Romeo back wheel (vague)
    -- Year 2019 — vintage/classic events
    '4f3278ac-739b-45e6-bb65-c581e82529b0', -- Sprint Zagato (1962) Solitude Revival
    'f6ca57e4-ac6a-4595-9ae4-efa772232755', -- Festival VBF 2019 (old car)
    'a69f7dfb-8298-4e42-8983-4ddf5c73983e', -- 1961 Giulietta Spider
    -- Year 2018 — vintage coupe + 1963 sprint at classic events
    '6a0960e0-269d-455c-9951-838666d86050', -- Giulietta Coupe Schaffen-Diest (vintage coupe)
    'c6faf6df-a7d9-4530-acff-ffdfb21da605', -- Sprint 1300 (1963)
    '2c0c5f09-0302-4fce-a001-146e28877152', -- Sprint 1300 (1963)
    -- Year 2017 — vintage Berlina at classic airshow
    'bb772149-c55b-429c-af04-0da90a068a10', -- Berlina TI at Schaffen-Diest (vintage)
    -- Year 2016 — classic car airshow (Schaffen-Diest is a vintage aircraft/car event)
    '784c3c56-c99e-4ded-8e7a-b9b487b10ed3', -- Giulietta Schaffen-Diest 2016 (vintage event)
    -- Year 2015 — vintage Spider + wrong car (SZ = Zagato)
    '86b9a7f2-2423-49ad-8fe5-3335d300ed78', -- Giulietta Spider front (1950s) Tokyo Auto Salon
    '3eaa9966-5715-408d-a367-9e8463d6c7b8', -- Giulietta Spider rear (1950s) Tokyo Auto Salon
    '699b532c-601d-4ab5-ad99-4ddc8b3d80cc', -- 1960 Alfa Romeo SZ (wrong car)
    '15143de6-adb4-4845-b9c6-89088ee4f936', -- Sprint at Schaffen-Diest 2015 (vintage)
    -- Year 2014 — Retromobile (classic car museum event)
    '7990a4a5-85c1-4c44-ab6c-3a527af9dc2e', -- Retromobile 2014 - 1960 berline
    '9dbad7d0-d32f-4451-91e9-5971339a8e1e', -- Retromobile 2014 - 1960 berline
    'ddb121c3-4948-440f-822f-984e6c769a81', -- Retromobile 2014 - 1963 berline
    -- Year 2013 — vintage sprint racing cars
    'bc3a100f-b297-4afa-bb25-e8a0805e7cad', -- Sprint Blaye 2013 (vintage)
    '7a0e3424-79b9-4de1-8909-b724a7c455fd', -- Sprint Blaye 2013 (vintage)
    -- Year 2012 — vintage sprint
    '12e9c69e-48ba-45a9-959a-ceaf72c7d235', -- Giulietta Sprint (vintage sprint)
    -- Year 2011 — wrong car
    '95b14861-5fdf-4f82-a657-27da3ae3cba0', -- Alfa Romeo MiTo (WRONG CAR)
    -- Null year — vintage 1950s-1960s classics
    '134725d4-78f9-43d4-a9f2-985885224c08', -- 1960 Berlina Normale (2nd series)
    '45cf8879-3efa-4885-9bdc-0151f25443ef', -- Sprint (1959) Solitude Revival 2022
    '59ea48bf-0ef4-44b6-acf1-bf06182b430c', -- 1958 Giulietta Sprint Coupe
    'b978d06d-3f94-49fe-ba96-a831663247d7', -- Giulietta Spider 1 (vintage)
    'b8fae706-5a1a-4370-b9e4-25ea37a457ad', -- Giulietta Sprint 2 (vintage sprint)
    '1f0e942c-ce55-4971-aac2-ce300678a616', -- Giulietta Spider 2 (vintage)
    -- Null year — early 2010 base model (outdated design, pre-facelift)
    'c37d1871-c708-42ef-a6eb-68be1fd1bd3d', -- Giulietta-1,8 Front-view (2010 base)
    '405f0671-fa6a-479f-97ae-2917f9a29a64', -- Giulietta-1,8 Rear-view (2010 base + rear)
    '67e3a3d0-454c-4332-b171-7e831a9bfcf1', -- 2010 Giulietta white cropped
    'b4de6c5c-e89e-4c75-aff1-9c3e075b9a26', -- REAR VIEW (rear angle)
    'e584aa38-d68e-45da-a1a9-e0c87161e07d'  -- 2010 white hatchback (early model)
  );

-- 2. Promote the best modern front-facing image (940 Series 3, 2016-2020 facelift)
--    to year=2020 so it sorts first as the main hero image
UPDATE car_images
SET year = 2020
WHERE id = '25b3f9e0-5a79-478b-ba19-f5e4b4db16b6'; -- 2017 Giulietta (940 Series 3) Super hatchback 01 — clear front view


-- ============================================================
-- Fix Mazda 6 images
-- ============================================================

-- 1. Hide old-generation Mazda 6 images (GG1 = 2002-2007, GH1 = 2007-2012, pre-2012 models)
UPDATE car_images SET hidden = 1, hidden_reason = 'old-generation'
WHERE make_slug = 'mazda' AND model_slug = 'mazda6'
  AND id IN (
    -- GG1 (1st generation 2002-2007) — year-tagged
    'a43dd43e-770e-4ba8-9385-9409fc0f8084', -- MAZDA6 WAGON (GG1) China
    '7094fe91-b3a0-4e49-8bd3-160c802b0d8a', -- MAZDA6 WAGON (GG1) China (2)
    'b2018abc-1b47-4b7b-817d-73e2690a6c55', -- MAZDA6 SEDAN (GG1) China (9)
    '23aaa0ed-67ab-47ac-83c1-fbb935bbf934', -- MAZDA6 SEDAN (GG1) China
    -- GH1 (2nd generation 2007-2012) — year-tagged
    '4346f39c-a424-43b9-b9fb-ba34ffafb62a', -- MAZDA6 LIFTBACK (GH1) China (4)
    '8002178a-5f0a-430c-95bf-5e4d47c5aa3f', -- MAZDA6 SEDAN (GH1) China (2)
    -- Old model year photos
    '5e0c7cdf-69b2-443a-a5fe-39c7d1f40142', -- 2004 Mazda6 i Sports Sedan, front left
    '4e439fe0-4730-445b-a060-4656cd95a520', -- 2004 Mazda6 i Sports Sedan, rear left
    'e15de1e9-e5b5-4ebf-b63b-ecda11ff820f', -- Mazda 6 GG Shishi 02 (GG = 1st gen)
    '0ce64864-39d6-47a5-acb7-c71ed348738c', -- Mazda 6 GG Shishi 01 (GG = 1st gen)
    'f03f1e4c-5282-4228-b17a-7cc838c6ecd0', -- Mazda 6 GG facelift Sanming (GG = 1st gen)
    '3a295fa1-831f-4970-86ec-a1c8677c23f8', -- 2010 Mazda6 (Canada) — 2nd gen era
    '4762e1c4-c33a-4bba-9adb-29541a220008', -- 2008 Mazda6 i Sport (1st gen)
    '9a31b473-dd61-4632-ae05-d1be2765364b', -- 2007 Mazda6 GS (1st gen)
    'c565db82-c89d-47f3-9173-ae2240b73123', -- 2007 Mazda6 S Wagon (1st gen)
    'd918d467-2590-4c88-b993-810528416202', -- Mazda 6 GG Hatchback (2002-2005)
    '2cdc2a65-7d6a-45de-b9e1-d51fd115bc70', -- 2009 Mazda6 SL Diesel Estate (2nd gen)
    '857910f7-27a1-4bb8-a75b-3b94b706065b', -- Mazda6 S V6 (2nd gen GH)
    'd1e3e92c-4f9d-4a0d-b032-0f3df13ab3ae', -- Mazda6 S V6 Rear Left (2nd gen GH)
    -- GG1/GH1 null-year images
    '4b871974-706d-4228-b2cd-a97f26e1b698', -- 2003 Mazda6 GG Classic Hatch
    '918acb44-0805-4ea5-baff-301078f5acbf', -- MAZDA6 LIFTBACK (GH1) China
    '72569614-7536-4d76-b6e1-63f1b53f42e7', -- MAZDA6 SEDAN (GG1) China (3)
    '2a796af8-af02-4b50-a65b-d974ffbada96', -- MAZDA6 SEDAN (GH1) China
    '039536f8-64c9-4cb6-b8fc-cf3ae50d6d8c', -- MAZDA6 LIFTBACK (GH1) China (3)
    '0058e66e-f45d-40ba-9ced-7fdbeb372261', -- MAZDA6 LIFTBACK (GG1) China
    -- Unrelated/wrong images
    '0fab216d-c4c3-4084-adb4-39b19875751f', -- Mazda MX-5 RF 2022 (WRONG CAR)
    '68186b0e-a79b-4cc5-9bc5-449c9cb373d7', -- Moscow BMW Nissan Mazda6 (multiple cars, unclear)
    '991f4f3d-1a9d-4679-ad9b-403ba0500520'  -- Yango Finland (not a car photo)
  );

-- 2. Promote the best modern front-facing image of the global Mazda 6 (GJ gen)
--    "2024 Mazda6 Sports Appearance in Rhodium White, front right" — clean front-right studio shot
UPDATE car_images
SET year = 2025, created_at = '2024-01-01T00:00:00.000Z'
WHERE id = 'bd159ded-c0fa-4a7e-aa1c-7945cf8842b3';
