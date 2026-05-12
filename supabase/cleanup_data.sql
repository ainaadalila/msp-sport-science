-- =============================================================
-- CLEANUP SCRIPT: Delete all data except profiles and config tables
-- Keep: profiles, fitness_test_definitions, fitness_test_norms, supplements
-- =============================================================

-- Delete in reverse dependency order to avoid foreign key conflicts

DELETE FROM audit_logs;
DELETE FROM supplement_requests;
DELETE FROM sport_fitness_tests;
DELETE FROM fitness_test_results;
DELETE FROM fitness_test_sessions;
DELETE FROM fitness_tests;
DELETE FROM physio_slots;
DELETE FROM physio_cases;
DELETE FROM strength_conditioning;
DELETE FROM inbody_records;
DELETE FROM coach_assignments;
DELETE FROM sc_programs;
DELETE FROM athletes;

-- Verify cleanup
SELECT 'Athletes' as table_name, COUNT(*) as remaining_rows FROM athletes
UNION ALL
SELECT 'Strength & Conditioning', COUNT(*) FROM strength_conditioning
UNION ALL
SELECT 'InBody Records', COUNT(*) FROM inbody_records
UNION ALL
SELECT 'Physio Cases', COUNT(*) FROM physio_cases
UNION ALL
SELECT 'Physio Slots', COUNT(*) FROM physio_slots
UNION ALL
SELECT 'SC Programs', COUNT(*) FROM sc_programs
UNION ALL
SELECT 'Coach Assignments', COUNT(*) FROM coach_assignments
UNION ALL
SELECT 'Supplement Requests', COUNT(*) FROM supplement_requests
UNION ALL
SELECT 'Fitness Tests', COUNT(*) FROM fitness_tests
UNION ALL
SELECT 'Fitness Test Sessions', COUNT(*) FROM fitness_test_sessions
UNION ALL
SELECT 'Fitness Test Results', COUNT(*) FROM fitness_test_results
UNION ALL
SELECT 'Sport Fitness Tests', COUNT(*) FROM sport_fitness_tests
UNION ALL
SELECT 'Audit Logs', COUNT(*) FROM audit_logs
UNION ALL
SELECT 'Profiles (KEPT)', COUNT(*) FROM profiles
UNION ALL
SELECT 'Fitness Test Definitions (KEPT)', COUNT(*) FROM fitness_test_definitions
UNION ALL
SELECT 'Fitness Test Norms (KEPT)', COUNT(*) FROM fitness_test_norms
UNION ALL
SELECT 'Supplements (KEPT)', COUNT(*) FROM supplements;
