-- 2026-11-03: add five verified publisher ratings to pro_review_scores (owner-approved).
-- Ratings read from each page's schema.org ratingValue on 2026-11-02; numbers + link only.
-- Each source is appended to the model's existing set; set score = mean of source norms (1 dp), n += 1.

-- Range Rover (L460, 2022-): What Car? 4/5 -> 8.0. Set 8.8, 9.0, 8.0 -> 8.6 (n 3)
UPDATE pro_review_scores SET n = 3, score = 8.6, sources = json_insert(sources, '$[#]', json('{"site":"What Car?","market":"UK","original":"4/5","norm":8.0,"date":"2024-01-09","url":"https://www.whatcar.com/land-rover/range-rover/4x4/review/n17353","evidence":"schema ratingValue=4/5 (datePublished=2024-01-09; dateModified=2025-05-19); checked 2026-11-02"}')) WHERE id = 849 AND n = 2;

-- Mercedes EQS saloon (2021-): What Car? 3/5 -> 6.0. Set 9.0, 6.0 -> 7.5 (n 2)
UPDATE pro_review_scores SET n = 2, score = 7.5, sources = json_insert(sources, '$[#]', json('{"site":"What Car?","market":"UK","original":"3/5","norm":6.0,"date":"2022-02-03","url":"https://www.whatcar.com/mercedes-benz/eqs/saloon/review/n24120","evidence":"schema ratingValue=3/5 (datePublished=2022-02-03; dateModified=2023-05-31); EQS saloon; checked 2026-11-02"}')) WHERE id = 891 AND n = 1;

-- Suzuki SX4 (2006-2014): Parkers 3.5/5 -> 7.0. Set 2.0, 7.0 -> 4.5 (n 2)
UPDATE pro_review_scores SET n = 2, score = 4.5, sources = json_insert(sources, '$[#]', json('{"site":"Parkers","market":"UK","original":"3.5/5","norm":7.0,"date":"2019-06-06","url":"https://www.parkers.co.uk/suzuki/sx4/review/","evidence":"schema ratingValue=3.5/5 (datePublished=2019-06-06); page: Suzuki SX4 Hatchback (2006 - 2014); checked 2026-11-02"}')) WHERE id = 988 AND n = 1;

-- Hyundai ix35 (2010-2015): Parkers 4/5 -> 8.0. Set 4.0, 8.0 -> 6.0 (n 2)
UPDATE pro_review_scores SET n = 2, score = 6.0, sources = json_insert(sources, '$[#]', json('{"site":"Parkers","market":"UK","original":"4/5","norm":8.0,"date":"2019-06-06","url":"https://www.parkers.co.uk/hyundai/ix35/review/","evidence":"schema ratingValue=4/5 (datePublished=2019-06-06); page: Hyundai ix35 Estate (2010 - 2015); checked 2026-11-02"}')) WHERE id = 803 AND n = 1;

-- Lamborghini Revuelto (2024-): evo 5/5 -> 10.0. Set 9.0, 10.0 -> 9.5 (n 2)
UPDATE pro_review_scores SET n = 2, score = 9.5, sources = json_insert(sources, '$[#]', json('{"site":"evo","market":"UK","original":"5/5","norm":10.0,"date":"2023-10-04","url":"https://www.evo.co.uk/lamborghini/revuelto","evidence":"schema ratingValue=5/5 (datePublished=2023-10-04; dateModified=2026-01-28); checked 2026-11-02"}')) WHERE id = 844 AND n = 1;

-- ROLLBACK (restores the pre-change values; JSON whitespace may differ):
-- UPDATE pro_review_scores SET n = 2, score = 8.9, sources = json_remove(sources, '$[2]') WHERE id = 849;
-- UPDATE pro_review_scores SET n = 1, score = 9.0, sources = json_remove(sources, '$[1]') WHERE id = 891;
-- UPDATE pro_review_scores SET n = 1, score = 2.0, sources = json_remove(sources, '$[1]') WHERE id = 988;
-- UPDATE pro_review_scores SET n = 1, score = 4.0, sources = json_remove(sources, '$[1]') WHERE id = 803;
-- UPDATE pro_review_scores SET n = 1, score = 9.0, sources = json_remove(sources, '$[1]') WHERE id = 844;
