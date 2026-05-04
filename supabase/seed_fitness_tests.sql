-- =============================================================
-- SEED FITNESS TEST DEFINITIONS AND NORMS
-- Run this AFTER the main schema.sql
-- =============================================================

-- MUSCULAR ENDURANCE TESTS
insert into fitness_test_definitions (test_name, category, unit, description) values
  ('Push Up (Men)', 'muscular_endurance', 'reps', 'Push-ups in 1 minute'),
  ('Push Up (Women)', 'muscular_endurance', 'reps', 'Modified push-ups from knee in 1 minute'),
  ('Squat (Men)', 'muscular_endurance', 'reps', 'Squats in 1 minute'),
  ('Squat (Women)', 'muscular_endurance', 'reps', 'Squats in 1 minute'),
  ('Sit Up (Men)', 'muscular_endurance', 'reps', 'Sit-ups in 1 minute'),
  ('Sit Up (Women)', 'muscular_endurance', 'reps', 'Sit-ups in 1 minute'),
  ('Plank', 'muscular_endurance', 'seconds', 'Plank hold until fatigue'),
  ('Pull Up (Men)', 'muscular_endurance', 'reps', 'Pull-ups until fatigue'),
  ('Pull Up (Women)', 'muscular_endurance', 'reps', 'Pull-ups until fatigue')
on conflict do nothing;

-- POWER TESTS
insert into fitness_test_definitions (test_name, category, unit, description) values
  ('Standing Broad Jump (Men)', 'power', 'cm', 'Distance in centimeters'),
  ('Standing Broad Jump (Women)', 'power', 'cm', 'Distance in centimeters'),
  ('Counter Movement Jump (Men)', 'power', 'cm', 'Jump height in centimeters'),
  ('Counter Movement Jump (Women)', 'power', 'cm', 'Jump height in centimeters'),
  ('Seated Medicine Ball Throw (Men)', 'power', 'm', '4kg medicine ball throw distance'),
  ('Seated Medicine Ball Throw (Women)', 'power', 'm', '3kg medicine ball throw distance')
on conflict do nothing;

-- STRENGTH TESTS
insert into fitness_test_definitions (test_name, category, unit, description) values
  ('Back Strength (Men)', 'strength', 'kg', 'Back extensor strength in kg'),
  ('Back Strength (Women)', 'strength', 'kg', 'Back extensor strength in kg'),
  ('Handgrip Strength (Men)', 'strength', 'kg', 'Grip strength in kg'),
  ('Handgrip Strength (Women)', 'strength', 'kg', 'Grip strength in kg')
on conflict do nothing;

-- FLEXIBILITY TESTS
insert into fitness_test_definitions (test_name, category, unit, description) values
  ('Sit and Reach (Men)', 'flexibility', 'cm', 'Flexibility test in cm'),
  ('Sit and Reach (Women)', 'flexibility', 'cm', 'Flexibility test in cm')
on conflict do nothing;

-- AGILITY TESTS
insert into fitness_test_definitions (test_name, category, unit, description) values
  ('T-Test (Men)', 'agility', 'seconds', 'T-test agility'),
  ('T-Test (Women)', 'agility', 'seconds', 'T-test agility'),
  ('Hexagon Agility (Men)', 'agility', 'seconds', 'Hexagon agility test'),
  ('Hexagon Agility (Women)', 'agility', 'seconds', 'Hexagon agility test'),
  ('Change of Direction Dribble (Men)', 'agility', 'seconds', 'COD dribble for hockey/rugby'),
  ('Change of Direction Dribble (Women)', 'agility', 'seconds', 'COD dribble for hockey/rugby'),
  ('Illinois Test (Men)', 'agility', 'seconds', 'Illinois agility test'),
  ('Illinois Test (Women)', 'agility', 'seconds', 'Illinois agility test')
on conflict do nothing;

-- SPEED TESTS
insert into fitness_test_definitions (test_name, category, unit, description) values
  ('20m Sprint (Men)', 'speed', 'seconds', '20 meter sprint time'),
  ('20m Sprint (Women)', 'speed', 'seconds', '20 meter sprint time'),
  ('40m Sprint (Men)', 'speed', 'seconds', '40 meter sprint time'),
  ('40m Sprint (Women)', 'speed', 'seconds', '40 meter sprint time')
on conflict do nothing;

-- CARDIOVASCULAR TESTS
insert into fitness_test_definitions (test_name, category, unit, description) values
  ('Bleep Test (Men)', 'cardiovascular', 'meter', 'Total distance covered in meters'),
  ('Bleep Test (Women)', 'cardiovascular', 'meter', 'Total distance covered in meters'),
  ('Intermittent Recovery Test Level 2 (Men)', 'cardiovascular', 'level', 'Performance level or distance'),
  ('Intermittent Recovery Test Level 2 (Women)', 'cardiovascular', 'level', 'Performance level or distance'),
  ('24km Run Test (Men)', 'cardiovascular', 'minute', 'Time in minutes'),
  ('24km Run Test (Women)', 'cardiovascular', 'minute', 'Time in minutes')
on conflict do nothing;

-- COORDINATION TESTS
insert into fitness_test_definitions (test_name, category, unit, description) values
  ('Alternate Hand Wall Toss', 'coordination', 'reps', 'Catches in 30 seconds')
on conflict do nothing;

-- BALANCE TESTS
insert into fitness_test_definitions (test_name, category, unit, description) values
  ('Stock Balance Test', 'balance', 'seconds', 'Time held in seconds')
on conflict do nothing;

-- MARTIAL ARTS TESTS (Power Kube)
insert into fitness_test_definitions (test_name, category, unit, description) values
  ('Cross Punch Power (Men)', 'martial_arts', 'power', 'Power value from software'),
  ('Cross Punch Power (Women)', 'martial_arts', 'power', 'Power value from software'),
  ('Cross Punch Speed (Men)', 'martial_arts', 'seconds', 'Punch speed in seconds'),
  ('Cross Punch Speed (Women)', 'martial_arts', 'seconds', 'Punch speed in seconds'),
  ('Roundhouse Kick Speed (Men)', 'martial_arts', 'seconds', 'Kick speed in seconds'),
  ('Roundhouse Kick Speed (Women)', 'martial_arts', 'seconds', 'Kick speed in seconds')
on conflict do nothing;

-- =============================================================
-- NORMS FOR TESTS
-- =============================================================

-- MUSCULAR ENDURANCE NORMS
insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'M', 41, 21, 39, 20, 'higher_is_better' from fitness_test_definitions where test_name = 'Push Up (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'F', 37, 12, 35, 11, 'higher_is_better' from fitness_test_definitions where test_name = 'Push Up (Women)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'M', 46, 29, 44, 28, 'higher_is_better' from fitness_test_definitions where test_name = 'Squat (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'F', 40, 21, 38, 20, 'higher_is_better' from fitness_test_definitions where test_name = 'Squat (Women)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'M', 41, 21, 39, 20, 'higher_is_better' from fitness_test_definitions where test_name = 'Sit Up (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'F', 41, 21, 39, 20, 'higher_is_better' from fitness_test_definitions where test_name = 'Sit Up (Women)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'both', 361, 121, 360, 120, 'higher_is_better' from fitness_test_definitions where test_name = 'Plank' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'M', 14, 7, 12, 6, 'higher_is_better' from fitness_test_definitions where test_name = 'Pull Up (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'F', 10, 4, 8, 3, 'higher_is_better' from fitness_test_definitions where test_name = 'Pull Up (Women)' on conflict do nothing;

-- POWER NORMS
insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'M', 251, 210, 249, 209, 'higher_is_better' from fitness_test_definitions where test_name = 'Standing Broad Jump (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'F', 201, 161, 199, 160, 'higher_is_better' from fitness_test_definitions where test_name = 'Standing Broad Jump (Women)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'M', 43, 38, 41, 37, 'higher_is_better' from fitness_test_definitions where test_name = 'Counter Movement Jump (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'F', 42, 37, 40, 36, 'higher_is_better' from fitness_test_definitions where test_name = 'Counter Movement Jump (Women)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'M', 3.26, 1.76, 3.24, 1.75, 'higher_is_better' from fitness_test_definitions where test_name = 'Seated Medicine Ball Throw (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'F', 3.76, 1.86, 3.74, 1.85, 'higher_is_better' from fitness_test_definitions where test_name = 'Seated Medicine Ball Throw (Women)' on conflict do nothing;

-- STRENGTH NORMS
insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'M', 171, 135, 169, 134, 'higher_is_better' from fitness_test_definitions where test_name = 'Back Strength (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'F', 151, 120, 149, 119, 'higher_is_better' from fitness_test_definitions where test_name = 'Back Strength (Women)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'M', 55.6, 35.7, 55.4, 35.6, 'higher_is_better' from fitness_test_definitions where test_name = 'Handgrip Strength (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'F', 31.1, 19.2, 30.9, 19.1, 'higher_is_better' from fitness_test_definitions where test_name = 'Handgrip Strength (Women)' on conflict do nothing;

-- FLEXIBILITY NORMS
insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'M', 40, 25, 38, 24, 'higher_is_better' from fitness_test_definitions where test_name = 'Sit and Reach (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'F', 42, 28, 40, 27, 'higher_is_better' from fitness_test_definitions where test_name = 'Sit and Reach (Women)' on conflict do nothing;

-- AGILITY NORMS
insert into fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
select id, 'M', 9.49, 9.51, 10.52, 10.53, 'lower_is_better' from fitness_test_definitions where test_name = 'T-Test (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
select id, 'F', 10.49, 10.51, 11.50, 11.51, 'lower_is_better' from fitness_test_definitions where test_name = 'T-Test (Women)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
select id, 'M', 11.19, 11.30, 17.70, 17.80, 'lower_is_better' from fitness_test_definitions where test_name = 'Hexagon Agility (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
select id, 'F', 12.19, 12.30, 21.70, 21.80, 'lower_is_better' from fitness_test_definitions where test_name = 'Hexagon Agility (Women)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
select id, 'M', 9.99, 10.10, 11.00, 11.10, 'lower_is_better' from fitness_test_definitions where test_name = 'Change of Direction Dribble (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
select id, 'F', 10.99, 11.10, 12.00, 12.10, 'lower_is_better' from fitness_test_definitions where test_name = 'Change of Direction Dribble (Women)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
select id, 'M', 15.19, 15.30, 18.10, 18.20, 'lower_is_better' from fitness_test_definitions where test_name = 'Illinois Test (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
select id, 'F', 16.99, 17.10, 22.90, 23.0, 'lower_is_better' from fitness_test_definitions where test_name = 'Illinois Test (Women)' on conflict do nothing;

-- SPEED NORMS
insert into fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
select id, 'M', 2.69, 2.70, 3.20, 3.10, 'lower_is_better' from fitness_test_definitions where test_name = '20m Sprint (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
select id, 'F', 3.19, 3.10, 3.50, 3.51, 'lower_is_better' from fitness_test_definitions where test_name = '20m Sprint (Women)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
select id, 'M', 3.99, 4.10, 4.50, 4.60, 'lower_is_better' from fitness_test_definitions where test_name = '40m Sprint (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
select id, 'F', 4.49, 4.60, 4.90, 5.0, 'lower_is_better' from fitness_test_definitions where test_name = '40m Sprint (Women)' on conflict do nothing;

-- CARDIOVASCULAR NORMS
insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'M', 2621, 1022, 2600, 1020, 'higher_is_better' from fitness_test_definitions where test_name = 'Bleep Test (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'F', 2261, 820, 2240, 800, 'higher_is_better' from fitness_test_definitions where test_name = 'Bleep Test (Women)' on conflict do nothing;

-- COORDINATION NORMS
insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'both', 36, 16, 34, 15, 'higher_is_better' from fitness_test_definitions where test_name = 'Alternate Hand Wall Toss' on conflict do nothing;

-- BALANCE NORMS
insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'both', 51, 25, 49, 24, 'higher_is_better' from fitness_test_definitions where test_name = 'Stock Balance Test' on conflict do nothing;

-- MARTIAL ARTS NORMS
insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'M', 9501, 1500, 9500, 1499, 'higher_is_better' from fitness_test_definitions where test_name = 'Cross Punch Power (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_min, average_min, average_max, poor_max, rating_direction)
select id, 'F', 7501, 1200, 7500, 1199, 'higher_is_better' from fitness_test_definitions where test_name = 'Cross Punch Power (Women)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
select id, 'M', 0.49, 0.51, 0.74, 0.75, 'lower_is_better' from fitness_test_definitions where test_name = 'Cross Punch Speed (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
select id, 'F', 0.64, 0.66, 0.84, 0.85, 'lower_is_better' from fitness_test_definitions where test_name = 'Cross Punch Speed (Women)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
select id, 'M', 0.54, 0.56, 0.78, 0.79, 'lower_is_better' from fitness_test_definitions where test_name = 'Roundhouse Kick Speed (Men)' on conflict do nothing;

insert into fitness_test_norms (test_id, gender, good_max, average_min, average_max, poor_min, rating_direction)
select id, 'F', 0.67, 0.69, 0.86, 0.87, 'lower_is_better' from fitness_test_definitions where test_name = 'Roundhouse Kick Speed (Women)' on conflict do nothing;
