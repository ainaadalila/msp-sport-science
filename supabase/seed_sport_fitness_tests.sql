-- =============================================================
-- POPULATE SPORT_FITNESS_TESTS (Maps sports to their relevant tests)
-- Lean configuration - 7-8 core tests per sport
-- Same tests across all Fasa (phases)
-- =============================================================

-- Basketball (8 tests) - Speed, power, strength, agility
INSERT INTO sport_fitness_tests (sport, test_id) VALUES
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = '20m Sprint')),
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Counter Movement Jump')),
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Hexagon Agility')),
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Push Up')),
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Squat')),
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Sit Up')),
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Back Strength')),
('Basketball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Handgrip Strength')),

-- Badminton (7 tests) - Speed, agility, flexibility
('Badminton', (SELECT id FROM fitness_test_definitions WHERE test_name = '20m Sprint')),
('Badminton', (SELECT id FROM fitness_test_definitions WHERE test_name = 'T-Test')),
('Badminton', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Counter Movement Jump')),
('Badminton', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Push Up')),
('Badminton', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Sit Up')),
('Badminton', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Sit and Reach')),
('Badminton', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Handgrip Strength')),

-- Martial Arts (8 tests) - Speed, power, strength, punch/kick
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = '20m Sprint')),
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Counter Movement Jump')),
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Push Up')),
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Squat')),
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Back Strength')),
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Cross Punch Power')),
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Handgrip Strength')),
('Martial Arts', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Sit Up')),

-- Football (8 tests) - Speed, agility, power, endurance
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = '20m Sprint')),
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = '40m Sprint')),
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Standing Broad Jump')),
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Hexagon Agility')),
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Push Up')),
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Squat')),
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Sit Up')),
('Football', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Bleep Test')),

-- Volleyball (8 tests) - Vertical power, speed, strength
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Counter Movement Jump')),
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Standing Broad Jump')),
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = '20m Sprint')),
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Push Up')),
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Back Strength')),
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Sit Up')),
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Squat')),
('Volleyball', (SELECT id FROM fitness_test_definitions WHERE test_name = 'Bleep Test'))
ON CONFLICT DO NOTHING;

-- Verify population
SELECT sport, COUNT(*) as test_count FROM sport_fitness_tests GROUP BY sport ORDER BY sport;

-- Show detailed test configuration
SELECT
  sft.sport,
  fd.test_name,
  fd.category
FROM sport_fitness_tests sft
JOIN fitness_test_definitions fd ON fd.id = sft.test_id
ORDER BY sft.sport, fd.category, fd.test_name;
