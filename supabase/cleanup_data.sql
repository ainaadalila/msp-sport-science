-- =============================================================
-- CLEANUP SCRIPT: Prepare for seed file rerun
-- Delete test data but PRESERVE profiles & supplements
-- IMPORTANT: Must rerun norms with corrected PDF values
-- =============================================================

-- Delete in reverse dependency order to avoid foreign key conflicts

DELETE FROM fitness_test_results;
DELETE FROM fitness_test_sessions;
DELETE FROM supplement_requests;
DELETE FROM physio_slots;
DELETE FROM physio_cases;
DELETE FROM strength_conditioning;
DELETE FROM inbody_records;
DELETE FROM sc_programs;
DELETE FROM athletes;

-- ⚠️ MUST DELETE & RERUN (norms corrected to match PDF)
DELETE FROM sport_fitness_tests;
DELETE FROM fitness_test_norms;
DELETE FROM fitness_test_definitions;

-- ✅ PRESERVED TABLES (unchanged):
-- - profiles (user accounts)
-- - supplements (inventory)

-- =============================================================
-- Verify cleanup results
-- =============================================================
SELECT 'Athletes' as table_name, COUNT(*) as remaining_rows FROM athletes
UNION ALL
SELECT 'Fitness Test Definitions (CLEANED)', COUNT(*) FROM fitness_test_definitions
UNION ALL
SELECT 'Fitness Test Norms (CLEANED)', COUNT(*) FROM fitness_test_norms
UNION ALL
SELECT 'Sport Fitness Tests (CLEANED)', COUNT(*) FROM sport_fitness_tests
UNION ALL
SELECT 'Fitness Test Sessions (CLEANED)', COUNT(*) FROM fitness_test_sessions
UNION ALL
SELECT 'Fitness Test Results (CLEANED)', COUNT(*) FROM fitness_test_results
UNION ALL
SELECT 'Physio Cases (CLEANED)', COUNT(*) FROM physio_cases
UNION ALL
SELECT 'Physio Slots (CLEANED)', COUNT(*) FROM physio_slots
UNION ALL
SELECT 'Strength & Conditioning (CLEANED)', COUNT(*) FROM strength_conditioning
UNION ALL
SELECT 'InBody Records (CLEANED)', COUNT(*) FROM inbody_records
UNION ALL
SELECT 'SC Programs (CLEANED)', COUNT(*) FROM sc_programs
UNION ALL
SELECT 'Supplement Requests (CLEANED)', COUNT(*) FROM supplement_requests
UNION ALL
SELECT 'Profiles (KEPT)', COUNT(*) FROM profiles
UNION ALL
SELECT 'Supplements (KEPT)', COUNT(*) FROM supplements;
