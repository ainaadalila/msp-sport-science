-- =============================================================
-- POPULATE SPORT_FITNESS_TESTS (Maps sports to their relevant tests)
-- =============================================================

INSERT INTO sport_fitness_tests (sport, test_id) VALUES
-- Basketball tests
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = '20m Sprint')),
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Counter Movement Jump')),
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Hexagon Agility')),
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Push Up')),
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Squat')),
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Back Strength')),
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Bleep Test')),
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Sit and Reach')),
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Handgrip Strength')),
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Seated Medicine Ball Throw')),

-- Badminton tests
('Badminton', (SELECT id FROM fitness_test_definitions WHERE test_name = '20m Sprint')),
('Badminton', (SELECT id FROM fitness_test_definitions WHERE test_name = 'T-Test')),
('Badminton', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Counter Movement Jump')),
('Badminton', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Sit and Reach')),
('Badminton', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Push Up')),
('Badminton', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Back Strength')),
('Badminton', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Bleep Test')),
('Badminton', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Handgrip Strength')),

-- Martial Arts tests
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = '20m Sprint')),
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Counter Movement Jump')),
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Cross Punch Speed')),
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Roundhouse Kick Speed')),
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Cross Punch Power')),
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Push Up')),
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Back Strength')),
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Handgrip Strength')),
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Sit and Reach')),
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Squat')),

-- Football tests
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = '20m Sprint')),
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = '40m Sprint')),
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Illinois Test')),
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Counter Movement Jump')),
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Standing Broad Jump')),
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Intermittent Recovery Test Level 2')),
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Push Up')),
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Squat')),
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Back Strength')),
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Sit and Reach')),

-- Volleyball tests
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Counter Movement Jump')),
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = '20m Sprint')),
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Standing Broad Jump')),
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Alternate Hand Wall Toss')),
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Push Up')),
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Back Strength')),
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Bleep Test')),
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Sit and Reach')),
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Handgrip Strength')),
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Squat'))
ON CONFLICT DO NOTHING;

-- Verify population
SELECT sport, COUNT(*) as test_count FROM sport_fitness_tests GROUP BY sport ORDER BY sport;
