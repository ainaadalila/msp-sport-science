-- =============================================================
-- REFACTORED SEED: FITNESS TEST DEFINITIONS AND NORMS
-- Single test per test type, with gender-specific norms
-- Run this AFTER the main schema.sql
-- FIRST: DELETE old data
-- =============================================================

-- DELETE old data first
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
  ('24km Run Test', 'cardiovascular', 'minute', 'Time in minutes')
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
  ('Cross Punch Power', 'martial_arts', 'power', 'Power value from software'),
  ('Cross Punch Speed', 'martial_arts', 'seconds', 'Punch speed in seconds'),
  ('Roundhouse Kick Speed', 'martial_arts', 'seconds', 'Kick speed in seconds')
ON CONFLICT DO NOTHING;

-- =============================================================
-- NORMS FOR TESTS (GENDER-SPECIFIC)
-- =============================================================

-- MUSCULAR ENDURANCE NORMS
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 41, 21, 39, 20, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Push Up' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 37, 12, 35, 11, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Push Up' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 46, 29, 44, 28, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Squat' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 40, 21, 38, 20, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Squat' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 41, 21, 39, 20, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Sit Up' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 41, 21, 39, 20, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Sit Up' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'both', 361, 121, 360, 120, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Plank' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 14, 7, 12, 6, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Pull Up' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 10, 4, 8, 3, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Pull Up' ON CONFLICT DO NOTHING;

-- POWER NORMS
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 251, 210, 249, 209, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Standing Broad Jump' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 201, 161, 199, 160, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Standing Broad Jump' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 43, 38, 41, 37, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Counter Movement Jump' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 42, 37, 40, 36, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Counter Movement Jump' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 3.26, 1.76, 3.24, 1.75, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Seated Medicine Ball Throw' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 3.76, 1.86, 3.74, 1.85, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Seated Medicine Ball Throw' ON CONFLICT DO NOTHING;

-- STRENGTH NORMS
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 171, 135, 169, 134, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Back Strength' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 151, 120, 149, 119, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Back Strength' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 55.6, 35.7, 55.4, 35.6, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Handgrip Strength' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 31.1, 19.2, 30.9, 19.1, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Handgrip Strength' ON CONFLICT DO NOTHING;

-- FLEXIBILITY NORMS
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 40, 25, 38, 24, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Sit and Reach' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 42, 28, 40, 27, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Sit and Reach' ON CONFLICT DO NOTHING;

-- AGILITY NORMS
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 9.49, 9.51, 10.52, 10.53, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'T-Test' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 10.49, 10.51, 11.50, 11.51, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'T-Test' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 11.19, 11.30, 17.70, 17.80, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Hexagon Agility' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 12.19, 12.30, 21.70, 21.80, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Hexagon Agility' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 9.99, 10.10, 11.00, 11.10, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Change of Direction Dribble' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 10.99, 11.10, 12.00, 12.10, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Change of Direction Dribble' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 15.19, 15.30, 18.10, 18.20, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Illinois Test' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 16.99, 17.10, 22.90, 23.0, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Illinois Test' ON CONFLICT DO NOTHING;

-- SPEED NORMS
INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 2.69, 2.70, 3.20, 3.10, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = '20m Sprint' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 3.19, 3.10, 3.50, 3.51, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = '20m Sprint' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 3.99, 4.10, 4.50, 4.60, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = '40m Sprint' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 4.49, 4.60, 4.90, 5.0, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = '40m Sprint' ON CONFLICT DO NOTHING;

-- CARDIOVASCULAR NORMS
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 2700, 2000, 2600, 1900, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Bleep Test' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 2200, 1600, 2100, 1500, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Bleep Test' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 21, 16, 19, 15, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Intermittent Recovery Test Level 2' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 19, 14, 17, 13, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Intermittent Recovery Test Level 2' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 84, 90, 96, 102, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = '24km Run Test' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 102, 108, 114, 120, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = '24km Run Test' ON CONFLICT DO NOTHING;

-- COORDINATION NORMS
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'both', 24, 16, 22, 14, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Alternate Hand Wall Toss' ON CONFLICT DO NOTHING;

-- BALANCE NORMS
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'both', 60, 30, 58, 28, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Stock Balance Test' ON CONFLICT DO NOTHING;

-- MARTIAL ARTS NORMS
INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'M', 600, 400, 550, 350, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Cross Punch Power' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
SELECT id, 'F', 400, 250, 350, 200, 'higher_is_better' FROM fitness_test_definitions WHERE test_name = 'Cross Punch Power' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 0.4, 0.45, 0.55, 0.6, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Cross Punch Speed' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 0.45, 0.50, 0.60, 0.65, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Cross Punch Speed' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'M', 0.5, 0.55, 0.65, 0.7, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Roundhouse Kick Speed' ON CONFLICT DO NOTHING;

INSERT INTO fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
SELECT id, 'F', 0.55, 0.60, 0.70, 0.75, 'lower_is_better' FROM fitness_test_definitions WHERE test_name = 'Roundhouse Kick Speed' ON CONFLICT DO NOTHING;
