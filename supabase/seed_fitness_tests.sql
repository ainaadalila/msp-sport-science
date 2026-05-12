-- =============================================================
-- CORRECTED SEED: FITNESS TEST DEFINITIONS AND NORMS
-- All norms verified against official PDF document
-- Run this AFTER the main schema.sql
-- FIRST: DELETE old data
-- =============================================================

DELETE FROM fitness_test_norms;
DELETE FROM fitness_test_definitions;

-- MUSCULAR ENDURANCE TESTS
INSERT INTO fitness_test_definitions (test_name, category, unit, description) VALUES
  ('Push Up', 'muscular_endurance', 'reps', 'Push-ups (standard for men, modified for women) in 1 minute'),
  ('Squat', 'muscular_endurance', 'reps', 'Squats in 1 minute'),
  ('Sit Up', 'muscular_endurance', 'reps', 'Sit-ups in 1 minute'),
  ('Plank', 'muscular_endurance', 'seconds', 'Plank hold until fatigue'),
  ('Pull Up', 'muscular_endurance', 'reps', 'Pull-ups until fatigue')
ON CONFLICT DO NOTHING;

-- POWER TESTS
INSERT INTO fitness_test_definitions (test_name, category, unit, description) VALUES
  ('Standing Broad Jump', 'power', 'cm', 'Distance in centimeters'),
  ('Counter Movement Jump', 'power', 'cm', 'Jump height in centimeters'),
  ('Seated Medicine Ball Throw', 'power', 'm', 'Medicine ball throw distance (4kg men, 3kg women)')
ON CONFLICT DO NOTHING;

-- STRENGTH TESTS
INSERT INTO fitness_test_definitions (test_name, category, unit, description) VALUES
  ('Back Strength', 'strength', 'kg', 'Back extensor strength in kg'),
  ('Handgrip Strength', 'strength', 'kg', 'Grip strength in kg')
ON CONFLICT DO NOTHING;

-- FLEXIBILITY TESTS
INSERT INTO fitness_test_definitions (test_name, category, unit, description) VALUES
  ('Sit and Reach', 'flexibility', 'cm', 'Flexibility test in cm')
ON CONFLICT DO NOTHING;

-- AGILITY TESTS
INSERT INTO fitness_test_definitions (test_name, category, unit, description) VALUES
  ('T-Test', 'agility', 'seconds', 'T-test agility'),
  ('Hexagon Agility', 'agility', 'seconds', 'Hexagon agility test'),
  ('Change of Direction Dribble', 'agility', 'seconds', 'COD dribble for hockey/rugby'),
  ('Illinois Test', 'agility', 'seconds', 'Illinois agility test')
ON CONFLICT DO NOTHING;

-- SPEED TESTS
INSERT INTO fitness_test_definitions (test_name, category, unit, description) VALUES
  ('20m Sprint', 'speed', 'seconds', '20 meter sprint time'),
  ('40m Sprint', 'speed', 'seconds', '40 meter sprint time')
ON CONFLICT DO NOTHING;

-- CARDIOVASCULAR TESTS
INSERT INTO fitness_test_definitions (test_name, category, unit, description) VALUES
  ('Bleep Test', 'cardiovascular', 'meter', 'Total distance covered in meters'),
  ('Intermittent Recovery Test Level 2', 'cardiovascular', 'level', 'Performance level or distance'),
  ('24km Run Test', 'cardiovascular', 'seconds', 'Time in seconds')
ON CONFLICT DO NOTHING;

-- COORDINATION TESTS
INSERT INTO fitness_test_definitions (test_name, category, unit, description) VALUES
  ('Alternate Hand Wall Toss', 'coordination', 'reps', 'Catches in 30 seconds')
ON CONFLICT DO NOTHING;

-- BALANCE TESTS
INSERT INTO fitness_test_definitions (test_name, category, unit, description) VALUES
  ('Stock Balance Test', 'balance', 'seconds', 'Time held in seconds')
ON CONFLICT DO NOTHING;

-- MARTIAL ARTS TESTS (Power Kube)
INSERT INTO fitness_test_definitions (test_name, category, unit, description) VALUES
  ('Cross Punch Power', 'martial_arts', 'average', 'Power value from software'),
  ('Cross Punch Speed', 'martial_arts', 'seconds', 'Punch speed in seconds'),
  ('Roundhouse Kick Speed', 'martial_arts', 'seconds', 'Kick speed in seconds')
ON CONFLICT DO NOTHING;

-- =============================================================
-- NORMS FOR TESTS (CORRECTED - PDF VERIFIED)
-- =============================================================

-- MUSCULAR ENDURANCE NORMS (CORRECTED - PDF VERIFIED)
-- Push Up Men: GOOD >40, AVERAGE 21-39, POOR <20
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 40, 21, 39, 20, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Push Up' ON CONFLICT DO NOTHING;

-- Push Up Women: GOOD >36, AVERAGE 12-35, POOR <11
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 36, 12, 35, 11, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Push Up' ON CONFLICT DO NOTHING;

-- Squat Men: GOOD >45, AVERAGE 29-44, POOR <28
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 45, 29, 44, 28, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Squat' ON CONFLICT DO NOTHING;

-- Squat Women: GOOD >39, AVERAGE 21-38, POOR <20
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 39, 21, 38, 20, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Squat' ON CONFLICT DO NOTHING;

-- Sit Up Men: GOOD >40, AVERAGE 21-39, POOR <20
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 40, 21, 39, 20, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Sit Up' ON CONFLICT DO NOTHING;

-- Sit Up Women: GOOD >40, AVERAGE 21-39, POOR <20
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 40, 21, 39, 20, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Sit Up' ON CONFLICT DO NOTHING;

-- Plank Test (both): GOOD >6m (360s), AVERAGE 2m-6m (120-360s), POOR <2m (<120s)
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'both', 360, 120, 360, 119, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Plank' ON CONFLICT DO NOTHING;

-- Pull Up Men: GOOD >13, AVERAGE 7-12, POOR <6
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 13, 7, 12, 6, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Pull Up' ON CONFLICT DO NOTHING;

-- Pull Up Women: GOOD >9, AVERAGE 4-8, POOR <3
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 9, 4, 8, 3, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Pull Up' ON CONFLICT DO NOTHING;

-- POWER NORMS (CORRECTED - PDF VERIFIED)
-- Standing Broad Jump Men: GOOD >250M, AVERAGE 210-249M, POOR <209M
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 250, 210, 249, 209, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Standing Broad Jump' ON CONFLICT DO NOTHING;

-- Standing Broad Jump Women: GOOD >200M, AVERAGE 161-199M, POOR <160M
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 200, 161, 199, 160, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Standing Broad Jump' ON CONFLICT DO NOTHING;

-- Counter Movement Jump Men: GOOD >42CM, AVERAGE 38-41CM, POOR <37CM
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 42, 38, 41, 37, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Counter Movement Jump' ON CONFLICT DO NOTHING;

-- Counter Movement Jump Women: GOOD >41CM, AVERAGE 37-40CM, POOR <36CM
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 41, 37, 40, 36, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Counter Movement Jump' ON CONFLICT DO NOTHING;

-- Seated Medicine Ball Throw Men: GOOD >3.25M, AVERAGE 1.76-3.24M, POOR <1.75M
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 3.25, 1.76, 3.24, 1.75, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Seated Medicine Ball Throw' ON CONFLICT DO NOTHING;

-- Seated Medicine Ball Throw Women: GOOD >3.75M, AVERAGE 1.86-3.74M, POOR <1.85M
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 3.75, 1.86, 3.74, 1.85, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Seated Medicine Ball Throw' ON CONFLICT DO NOTHING;

-- STRENGTH NORMS (CORRECTED - PDF VERIFIED)
-- Back Strength Men: GOOD >170KG, AVERAGE 135-169KG, POOR <134KG
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 170, 135, 169, 134, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Back Strength' ON CONFLICT DO NOTHING;

-- Back Strength Women: GOOD >150KG, AVERAGE 120-149KG, POOR <119KG
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 150, 120, 149, 119, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Back Strength' ON CONFLICT DO NOTHING;

-- Handgrip Strength Men: GOOD >55.5Kg, AVERAGE 35.7Kg-55.4Kg, POOR <35.6Kg
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 55.5, 35.7, 55.4, 35.6, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Handgrip Strength' ON CONFLICT DO NOTHING;

-- Handgrip Strength Women: GOOD >31Kg, AVERAGE 19.2Kg-30.9Kg, POOR <19.1Kg
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 31, 19.2, 30.9, 19.1, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Handgrip Strength' ON CONFLICT DO NOTHING;

-- FLEXIBILITY NORMS (CORRECTED - PDF VERIFIED)
-- Sit and Reach Men: GOOD >39CM, AVERAGE 25-38CM, POOR <24CM
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 39, 25, 38, 24, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Sit and Reach' ON CONFLICT DO NOTHING;

-- Sit and Reach Women: GOOD >41CM, AVERAGE 28-40CM, POOR <27CM
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 41, 28, 40, 27, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Sit and Reach' ON CONFLICT DO NOTHING;

-- AGILITY NORMS (CORRECTED - PDF VERIFIED)
-- T-Test Men: GOOD <9.5, AVERAGE 9.51-10.52, POOR >10.52
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 9.5, 9.51, 10.52, 10.53, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'T-Test' ON CONFLICT DO NOTHING;

-- T-Test Women: GOOD <10.5, AVERAGE 10.51-11.50, POOR >11.50
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 10.5, 10.51, 11.50, 11.51, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'T-Test' ON CONFLICT DO NOTHING;

-- Hexagon Agility Men: GOOD <11.2S, AVERAGE 11.3S-17.7S, POOR >17.8S
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 11.19, 11.30, 17.70, 17.80, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Hexagon Agility' ON CONFLICT DO NOTHING;

-- Hexagon Agility Women: GOOD <12.2S, AVERAGE 12.3S-21.7S, POOR >21.8S
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 12.19, 12.30, 21.70, 21.80, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Hexagon Agility' ON CONFLICT DO NOTHING;

-- Change of Direction Men: GOOD <10.00S, AVERAGE 10.10S-11.00S, POOR >11.10S
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 9.99, 10.10, 11.00, 11.10, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Change of Direction Dribble' ON CONFLICT DO NOTHING;

-- Change of Direction Women: GOOD <11.00S, AVERAGE 11.10-12.00S, POOR >12.10S
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 10.99, 11.10, 12.00, 12.10, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Change of Direction Dribble' ON CONFLICT DO NOTHING;

-- Illinois Test Men: GOOD <15.2S, AVERAGE 15.3-18.1S, POOR >18.2S
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 15.19, 15.30, 18.10, 18.20, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Illinois Test' ON CONFLICT DO NOTHING;

-- Illinois Test Women: GOOD <17.0S, AVERAGE 17.1-22.9S, POOR >23.0S
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 16.99, 17.10, 22.90, 23.0, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Illinois Test' ON CONFLICT DO NOTHING;

-- SPEED NORMS
-- 20m Sprint Men: GOOD <2.7S, AVERAGE 2.7-3.1S, POOR >3.1S
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 2.69, 2.70, 3.10, 3.11, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = '20m Sprint' ON CONFLICT DO NOTHING;

-- 20m Sprint Women: GOOD <3.2S, AVERAGE 3.1-3.5S, POOR >3.5S
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 3.19, 3.10, 3.50, 3.51, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = '20m Sprint' ON CONFLICT DO NOTHING;

-- 40m Sprint Men: GOOD <4.0S, AVERAGE 4.1-4.5S, POOR >4.6S
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 3.99, 4.10, 4.50, 4.60, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = '40m Sprint' ON CONFLICT DO NOTHING;

-- 40m Sprint Women: GOOD <4.5S, AVERAGE 4.6-4.9S, POOR >5.0S
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 4.49, 4.60, 4.90, 5.0, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = '40m Sprint' ON CONFLICT DO NOTHING;

-- CARDIOVASCULAR NORMS
-- Bleep Test Men: GOOD >2620M, AVERAGE 1022-2620M, POOR <1022M
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 2621, 1022, 2620, 1021, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Bleep Test' ON CONFLICT DO NOTHING;

-- Bleep Test Women: GOOD >2260M, AVERAGE 820-2260M, POOR <820M
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 2261, 820, 2260, 819, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Bleep Test' ON CONFLICT DO NOTHING;

-- Intermittent Recovery Level 2 Men: GOOD >21.6, AVERAGE 20.1-21.6, POOR <20.1
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 21.6, 20.1, 21.6, 20.0, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Intermittent Recovery Test Level 2' ON CONFLICT DO NOTHING;

-- Intermittent Recovery Level 2 Women: GOOD >21.1, AVERAGE 19.2-20.1, POOR <19.2
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 21.1, 19.2, 20.1, 19.1, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Intermittent Recovery Test Level 2' ON CONFLICT DO NOTHING;

-- 24km Run Test Men: GOOD <9m45s (585s), AVERAGE 9m46s-14m (586-840s), POOR >14m01s (841s)
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 585, 586, 840, 841, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = '24km Run Test' ON CONFLICT DO NOTHING;

-- 24km Run Test Women: GOOD <12m30s (750s), AVERAGE 12m31s-18m30s (751-1110s), POOR >18m31s (1111s)
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 750, 751, 1110, 1111, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = '24km Run Test' ON CONFLICT DO NOTHING;

-- COORDINATION NORMS (CORRECTED - PDF VERIFIED)
-- Alternate Hand Wall Toss: GOOD >35, AVERAGE 16-34, POOR <15
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'both', 35, 16, 34, 15, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Alternate Hand Wall Toss' ON CONFLICT DO NOTHING;

-- BALANCE NORMS (CORRECTED - PDF VERIFIED)
-- Stock Balance Test: GOOD >50s, AVERAGE 25s-49s, POOR <24s
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'both', 50, 25, 49, 24, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Stock Balance Test' ON CONFLICT DO NOTHING;

-- MARTIAL ARTS NORMS (CORRECTED - PDF VERIFIED)
-- Cross Punch Power Men: GOOD >9500, AVERAGE 1500-9500, POOR <1500
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 9500, 1500, 9500, 1499, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Cross Punch Power' ON CONFLICT DO NOTHING;

-- Cross Punch Power Women: GOOD >7500, AVERAGE 1200-7500, POOR <1200
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 7500, 1200, 7500, 1199, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Cross Punch Power' ON CONFLICT DO NOTHING;

-- Cross Punch Speed Men: GOOD <0.50, AVERAGE 0.51-0.74, POOR >0.75
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 0.49, 0.51, 0.74, 0.75, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Cross Punch Speed' ON CONFLICT DO NOTHING;

-- Cross Punch Speed Women: GOOD <0.65, AVERAGE 0.66-0.84, POOR >0.85
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 0.64, 0.66, 0.84, 0.85, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Cross Punch Speed' ON CONFLICT DO NOTHING;

-- Roundhouse Kick Speed Men: GOOD <0.55, AVERAGE 0.56-0.78, POOR >0.79
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 0.54, 0.56, 0.78, 0.79, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Roundhouse Kick Speed' ON CONFLICT DO NOTHING;

-- Roundhouse Kick Speed Women: GOOD <0.68, AVERAGE 0.69-0.86, POOR >0.87
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 0.67, 0.69, 0.86, 0.87, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Roundhouse Kick Speed' ON CONFLICT DO NOTHING;
