-- MSP Sport Science seed data
--
-- Real reference/lookup data (sports list, fitness test definitions and
-- norms) — not synthetic test accounts. Auto-loaded by the Supabase CLI
-- alongside seed.sql (see supabase/config.toml [db.seed] sql_paths) so the
-- local pentest environment looks like the real app instead of empty
-- reference tables.


--
-- Data for Name: fitness_test_definitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."fitness_test_definitions" ("id", "test_name", "category", "unit", "description", "created_at") VALUES
	('2f158be5-9771-4f8f-b33e-a81e5783cf00', 'Push Up', 'muscular_endurance', 'reps', 'Push-ups (standard for men, modified for women) in 1 minute', '2026-05-12 16:32:52.572617+00'),
	('db692e81-3fe9-4a63-aa8d-e392359575ab', 'Squat', 'muscular_endurance', 'reps', 'Squats in 1 minute', '2026-05-12 16:32:52.572617+00'),
	('1bb70675-1668-4a04-a1b5-2723ce161453', 'Sit Up', 'muscular_endurance', 'reps', 'Sit-ups in 1 minute', '2026-05-12 16:32:52.572617+00'),
	('2f0d20fe-be7c-4867-851f-69bb79327809', 'Plank', 'muscular_endurance', 'seconds', 'Plank hold until fatigue', '2026-05-12 16:32:52.572617+00'),
	('769aef93-1f57-4966-b3cd-342039f403a5', 'Pull Up', 'muscular_endurance', 'reps', 'Pull-ups until fatigue', '2026-05-12 16:32:52.572617+00'),
	('6f473af7-7578-42e3-bc5b-b6cb526738e2', 'Standing Broad Jump', 'power', 'cm', 'Distance in centimeters', '2026-05-12 16:32:52.572617+00'),
	('8f0c8424-b216-4e2c-928e-d447861cb588', 'Counter Movement Jump', 'power', 'cm', 'Jump height in centimeters', '2026-05-12 16:32:52.572617+00'),
	('51fc9ffc-3653-4bf3-b3bb-7f008d84fad3', 'Seated Medicine Ball Throw', 'power', 'm', 'Medicine ball throw distance (4kg men, 3kg women)', '2026-05-12 16:32:52.572617+00'),
	('3ffbc16b-3708-465e-91f9-0c195a59f820', 'Back Strength', 'strength', 'kg', 'Back extensor strength in kg', '2026-05-12 16:32:52.572617+00'),
	('d911490c-b212-45cc-8b1e-7240f60981b7', 'Handgrip Strength', 'strength', 'kg', 'Grip strength in kg', '2026-05-12 16:32:52.572617+00'),
	('e6cb807e-c378-4bba-ac0e-c595ee3e139c', 'Sit and Reach', 'flexibility', 'cm', 'Flexibility test in cm', '2026-05-12 16:32:52.572617+00'),
	('7923f792-a5ce-4519-800e-87feda3700c2', 'T-Test', 'agility', 'seconds', 'T-test agility', '2026-05-12 16:32:52.572617+00'),
	('43532d1d-8fb6-49d2-8d6c-74d17d14d3bf', 'Hexagon Agility', 'agility', 'seconds', 'Hexagon agility test', '2026-05-12 16:32:52.572617+00'),
	('cea35294-9e0d-4d0f-a42d-46398a206aa7', 'Change of Direction Dribble', 'agility', 'seconds', 'COD dribble for hockey/rugby', '2026-05-12 16:32:52.572617+00'),
	('1428b2f1-8f8d-4591-b8f8-51e19dd14cd1', 'Illinois Test', 'agility', 'seconds', 'Illinois agility test', '2026-05-12 16:32:52.572617+00'),
	('7e1eb989-cf44-4f40-8391-845c8be73863', '20m Sprint', 'speed', 'seconds', '20 meter sprint time', '2026-05-12 16:32:52.572617+00'),
	('67aa195f-88a0-4fd8-9ea4-31b89d52654f', '40m Sprint', 'speed', 'seconds', '40 meter sprint time', '2026-05-12 16:32:52.572617+00'),
	('449809d0-4880-4f34-9ff0-353cc9f7c19c', 'Bleep Test', 'cardiovascular', 'meter', 'Total distance covered in meters', '2026-05-12 16:32:52.572617+00'),
	('8f135a13-8ccf-4d43-8586-14240b8a81ac', 'Intermittent Recovery Test Level 2', 'cardiovascular', 'level', 'Performance level or distance', '2026-05-12 16:32:52.572617+00'),
	('e7c1b927-068c-44d1-945b-71ce1cea4aa5', '24km Run Test', 'cardiovascular', 'seconds', 'Time in seconds', '2026-05-12 16:32:52.572617+00'),
	('420c2e20-dcf1-4a60-8b92-f14964806f88', 'Alternate Hand Wall Toss', 'coordination', 'reps', 'Catches in 30 seconds', '2026-05-12 16:32:52.572617+00'),
	('c858ac79-e06e-4a66-8185-098917e3993e', 'Stock Balance Test', 'balance', 'seconds', 'Time held in seconds', '2026-05-12 16:32:52.572617+00'),
	('4ac08276-af5e-425f-9405-93688e7763d3', 'Cross Punch Power', 'martial_arts', 'average', 'Power value from software', '2026-05-12 16:32:52.572617+00'),
	('66c3aad0-c00a-4404-8fe6-53bee409070a', 'Cross Punch Speed', 'martial_arts', 'seconds', 'Punch speed in seconds', '2026-05-12 16:32:52.572617+00'),
	('115ce1dc-b77f-4930-8cb8-0ca6238c9cb8', 'Roundhouse Kick Speed', 'martial_arts', 'seconds', 'Kick speed in seconds', '2026-05-12 16:32:52.572617+00');


--
-- Data for Name: fitness_test_norms; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."fitness_test_norms" ("id", "test_id", "gender", "good_min", "good_max", "average_min", "average_max", "poor_min", "poor_max", "rating_direction", "created_at") VALUES
	('5b057602-b308-448a-86d3-7a07d36e544c', '3ffbc16b-3708-465e-91f9-0c195a59f820', 'F', 151, NULL, 120, 149, NULL, 119, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('7b3afd79-3320-4c78-b1bf-a34dde221992', '3ffbc16b-3708-465e-91f9-0c195a59f820', 'M', 171, NULL, 135, 169, NULL, 134, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('c0f59436-bb86-43b6-9e7f-6283b6743512', '8f0c8424-b216-4e2c-928e-d447861cb588', 'F', 42, NULL, 37, 40, NULL, 36, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('27fd0713-b934-4704-abc6-a65a61a8b0de', '8f0c8424-b216-4e2c-928e-d447861cb588', 'M', 43, NULL, 38, 41, NULL, 37, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('96b50951-8bf8-456c-8ec8-98f86ebb41c4', 'd911490c-b212-45cc-8b1e-7240f60981b7', 'F', 31.1, NULL, 19.2, 30.9, NULL, 19.1, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('cae2c4e4-3460-44aa-aa72-99e1d2524bfb', 'd911490c-b212-45cc-8b1e-7240f60981b7', 'M', 55.6, NULL, 35.7, 55.4, NULL, 35.6, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('38d86544-28d5-4779-aefe-d76150a10d1e', '2f0d20fe-be7c-4867-851f-69bb79327809', 'both', 361, NULL, 120, 360, NULL, 119, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('88fb1f1f-78bb-4c27-a614-e19263e5dfb1', '769aef93-1f57-4966-b3cd-342039f403a5', 'F', 10, NULL, 4, 8, NULL, 3, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('c7b4e17c-164a-4a0a-9fe8-2f6842d86c4d', '769aef93-1f57-4966-b3cd-342039f403a5', 'M', 14, NULL, 7, 12, NULL, 6, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('d3f3528c-2301-43be-b6b5-b6ae60fb40f6', '2f158be5-9771-4f8f-b33e-a81e5783cf00', 'F', 37, NULL, 12, 35, NULL, 11, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('0b4f738f-978e-4894-8a4f-2f0e108b592e', '2f158be5-9771-4f8f-b33e-a81e5783cf00', 'M', 41, NULL, 21, 39, NULL, 20, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('a3b150ef-14f3-4c60-84da-2d7f25ad00d4', '51fc9ffc-3653-4bf3-b3bb-7f008d84fad3', 'F', 3.76, NULL, 1.86, 3.74, NULL, 1.85, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('fe12da26-38e4-4be6-8b3d-0682e12c651e', '51fc9ffc-3653-4bf3-b3bb-7f008d84fad3', 'M', 3.26, NULL, 1.76, 3.24, NULL, 1.75, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('ec918846-427f-4ef0-954f-0f7ecd126dec', 'e6cb807e-c378-4bba-ac0e-c595ee3e139c', 'F', 42, NULL, 28, 40, NULL, 27, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('4ba52c46-79a3-4a7f-95d1-d33f895cd473', 'e6cb807e-c378-4bba-ac0e-c595ee3e139c', 'M', 40, NULL, 25, 38, NULL, 24, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('83625a3b-f31e-4970-b2ed-66a22ce78e01', '1bb70675-1668-4a04-a1b5-2723ce161453', 'F', 41, NULL, 21, 39, NULL, 20, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('4c27186d-8193-4e4e-9ff5-4e0a5a60092c', '1bb70675-1668-4a04-a1b5-2723ce161453', 'M', 41, NULL, 21, 39, NULL, 20, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('bff13d51-16a1-470e-a647-a5cdcd169408', 'db692e81-3fe9-4a63-aa8d-e392359575ab', 'F', 40, NULL, 21, 38, NULL, 20, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('42579ee5-a202-4fb8-a126-7a34b7219dd8', 'db692e81-3fe9-4a63-aa8d-e392359575ab', 'M', 46, NULL, 29, 44, NULL, 28, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('f18484da-d784-49cf-9460-e4d598742353', '6f473af7-7578-42e3-bc5b-b6cb526738e2', 'F', 201, NULL, 161, 199, NULL, 160, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('a72440a7-974e-48af-897b-83ba8e119a16', '6f473af7-7578-42e3-bc5b-b6cb526738e2', 'M', 251, NULL, 210, 249, NULL, 209, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('12177cc5-880a-4b1a-9e29-3825f47ce422', '7923f792-a5ce-4519-800e-87feda3700c2', 'F', NULL, 10.49, 10.51, 11.50, 11.51, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00'),
	('e9d9bcc7-6987-40a3-b6f9-9b69531f5c25', '7923f792-a5ce-4519-800e-87feda3700c2', 'M', NULL, 9.49, 9.51, 10.52, 10.53, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00'),
	('50daad98-32d7-4118-8849-fd4fec73a1a1', '43532d1d-8fb6-49d2-8d6c-74d17d14d3bf', 'M', NULL, 11.19, 11.30, 17.70, 17.80, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00'),
	('2d7366d2-7fba-4819-a72a-04d5817fc454', '449809d0-4880-4f34-9ff0-353cc9f7c19c', 'M', 2621, NULL, 1022, 2600, NULL, 1020, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('1112db6a-6ab9-4232-b3ec-a663e7dc373a', '449809d0-4880-4f34-9ff0-353cc9f7c19c', 'F', 2261, NULL, 820, 2240, NULL, 800, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('e0028913-2d7f-4c77-9f3d-038f72c38d35', '420c2e20-dcf1-4a60-8b92-f14964806f88', 'both', 36, NULL, 16, 34, NULL, 15, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('3a6bccf0-2691-4228-8208-b27c69d8dfc7', '4ac08276-af5e-425f-9405-93688e7763d3', 'F', 7501, NULL, 1200, 7500, NULL, 1199, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('afebdb1f-643d-4936-9117-c50f1e676428', '4ac08276-af5e-425f-9405-93688e7763d3', 'M', 9501, NULL, 1500, 9500, NULL, 1499, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('e8ae5aa0-0621-423c-8aff-87227e582a2a', '8f135a13-8ccf-4d43-8586-14240b8a81ac', 'F', 21.2, NULL, 19.2, 20.1, NULL, 19.1, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('3b5318e5-e79f-4980-b195-34aa803db1d4', '8f135a13-8ccf-4d43-8586-14240b8a81ac', 'M', 21.7, NULL, 20.1, 21.6, NULL, 20.0, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('04c688d4-d0e6-4071-ae57-fea79f3595e3', 'c858ac79-e06e-4a66-8185-098917e3993e', 'both', 51, NULL, 25, 49, NULL, 24, 'higher_is_better', '2026-05-12 16:32:52.572617+00'),
	('6f6d1c69-522f-4d35-a4ff-06a4bd73cc98', '43532d1d-8fb6-49d2-8d6c-74d17d14d3bf', 'F', NULL, 12.19, 12.30, 21.70, 21.80, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00'),
	('ee302190-afbf-4c7f-b517-5208bf3474c4', 'cea35294-9e0d-4d0f-a42d-46398a206aa7', 'M', NULL, 9.99, 10.10, 11.00, 11.10, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00'),
	('d3545fb1-a5c4-49a8-838a-e7695b5e419d', 'cea35294-9e0d-4d0f-a42d-46398a206aa7', 'F', NULL, 10.99, 11.10, 12.00, 12.10, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00'),
	('e9b4f072-5097-4c85-a1e6-25ff148744a2', '1428b2f1-8f8d-4591-b8f8-51e19dd14cd1', 'M', NULL, 15.19, 15.30, 18.10, 18.20, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00'),
	('dea50296-717c-4cf5-be27-5b00ebbd56d5', '1428b2f1-8f8d-4591-b8f8-51e19dd14cd1', 'F', NULL, 16.99, 17.10, 22.90, 23.0, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00'),
	('8b1e546d-4b78-479a-baad-49863da27725', '7e1eb989-cf44-4f40-8391-845c8be73863', 'M', NULL, 2.69, 2.70, 3.10, 3.11, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00'),
	('244c9c45-3744-4aac-a7cf-71d278b8818a', '7e1eb989-cf44-4f40-8391-845c8be73863', 'F', NULL, 3.19, 3.10, 3.50, 3.51, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00'),
	('f0d211b8-7893-4651-bab2-a92ffa199a7a', '67aa195f-88a0-4fd8-9ea4-31b89d52654f', 'M', NULL, 3.99, 4.10, 4.50, 4.60, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00'),
	('9cbde11c-85f6-4d67-85a6-8c65c8f5638d', '67aa195f-88a0-4fd8-9ea4-31b89d52654f', 'F', NULL, 4.49, 4.60, 4.90, 5.0, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00'),
	('191883d3-1cbc-47b7-9f55-69f9e9514b7d', 'e7c1b927-068c-44d1-945b-71ce1cea4aa5', 'M', NULL, 585, 586, 840, 841, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00'),
	('225b8d6d-d37c-4d0c-a852-fb6cda7de96c', 'e7c1b927-068c-44d1-945b-71ce1cea4aa5', 'F', NULL, 750, 751, 1110, 1111, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00'),
	('8674c143-1791-4b65-8530-c42ae42ea7f9', '66c3aad0-c00a-4404-8fe6-53bee409070a', 'M', NULL, 0.49, 0.51, 0.74, 0.75, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00'),
	('cb018bdb-5707-4450-a965-b0ec0852f1e9', '66c3aad0-c00a-4404-8fe6-53bee409070a', 'F', NULL, 0.64, 0.66, 0.84, 0.85, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00'),
	('4e6cce13-d748-415e-a8dc-808a0314da3e', '115ce1dc-b77f-4930-8cb8-0ca6238c9cb8', 'M', NULL, 0.54, 0.56, 0.78, 0.79, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00'),
	('5fa6de21-a808-4d0c-9bb5-b9a96569a1f9', '115ce1dc-b77f-4930-8cb8-0ca6238c9cb8', 'F', NULL, 0.67, 0.69, 0.86, 0.87, NULL, 'lower_is_better', '2026-05-12 16:32:52.572617+00');


--
-- Data for Name: sports; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."sports" ("id", "name", "created_at") VALUES
	('399cfcfe-a89e-4d7f-9ea5-76739018dca6', 'AKUATIK RENANG', '2026-06-20 00:51:35.621986+00'),
	('316192d0-5e63-4e65-a636-dad042c83f1b', 'AKUATIK TERJUN', '2026-06-20 00:51:35.621986+00'),
	('21edf5f5-5b28-4fea-831b-736c8041ab18', 'ANGKAT BERAT', '2026-06-20 00:51:35.621986+00'),
	('8f99f834-d028-4b85-99f4-f64eba563c24', 'BADMINTON', '2026-06-20 00:51:35.621986+00'),
	('0ee6f510-fd8b-43e1-a88a-39173d1b16cd', 'BERBASIKAL', '2026-06-20 00:51:35.621986+00'),
	('3345ae37-d15b-4fa5-b6b2-68d5ff133672', 'BOLA JARING', '2026-06-20 00:51:35.621986+00'),
	('e991d2da-db56-408b-a776-17302a6f59d1', 'BOLA KERANJANG LELAKI', '2026-06-20 00:51:35.621986+00'),
	('0cfd1c95-9154-4a30-a53d-23fbd556821f', 'BOLA KERANJANG WANITA', '2026-06-20 00:51:35.621986+00'),
	('bc3f2a1f-e15b-4c1e-be96-8ffa48f18394', 'BOLA SEPAK LELAKI', '2026-06-20 00:51:35.621986+00'),
	('038eec43-577f-4f08-9c8c-f26b5a2b969e', 'BOLA SEPAK WANITA', '2026-06-20 00:51:35.621986+00'),
	('440cb67c-b02b-4c37-a853-49082ec89731', 'BOLA TAMPAR DEWAN LELAKI', '2026-06-20 00:51:35.621986+00'),
	('8ac52a63-d674-4c4a-8b23-75d12f54eb3a', 'BOLA TAMPAR DEWAN WANITA', '2026-06-20 00:51:35.621986+00'),
	('e9de9010-d3c2-45cf-88f6-1cbef79aea8e', 'BOLA TAMPAR PANTAI', '2026-06-20 00:51:35.621986+00'),
	('fc7a4466-36c0-4029-98af-9591cd3b22cd', 'CATUR', '2026-06-20 00:51:35.621986+00'),
	('7e751551-8246-4cb9-b64f-df8a3965ca3b', 'E-SPORT', '2026-06-20 00:51:35.621986+00'),
	('159eb2d2-870b-4426-9a74-3e8462453017', 'FUTSAL LELAKI', '2026-06-20 00:51:35.621986+00'),
	('69d16072-a989-4fc6-bf67-6f6eb8a8d505', 'FUTSAL WANITA', '2026-06-20 00:51:35.621986+00'),
	('4c5f9ac0-626a-4a4e-b4b8-4d4cddcdb47e', 'GIMNASTIK', '2026-06-20 00:51:35.621986+00'),
	('5bcf1fd5-1ad2-4158-b275-54f2128e2f0d', 'GIMRAMA', '2026-06-20 00:51:35.621986+00'),
	('434aec12-05a7-4e6e-b0a2-9641d7475346', 'GOLF', '2026-06-20 00:51:35.621986+00'),
	('87558795-1789-4f28-9b7e-fcd5986b3f69', 'HOKI LELAKI', '2026-06-20 00:51:35.621986+00'),
	('a45139b4-1d96-47ca-8658-a9ede16813ca', 'HOKI WANITA', '2026-06-20 00:51:35.621986+00'),
	('6f402d63-bb2a-4ee5-a8b9-ffec33a40e6b', 'JUDO', '2026-06-20 00:51:35.621986+00'),
	('a7fa3506-17d0-46bf-97f8-7cf99b31bd50', 'KABADDI LELAKI', '2026-06-20 00:51:35.621986+00'),
	('cc239b1b-62d2-4867-a405-8f8fc3e83e96', 'KABADDI WANITA', '2026-06-20 00:51:35.621986+00'),
	('7b7bf087-fbb9-49be-b6dc-f3da708fcb17', 'KARATE', '2026-06-20 00:51:35.621986+00'),
	('2f6bbbaa-36e7-4330-9389-1da09dabf013', 'KRIKET LELAKI', '2026-06-20 00:51:35.621986+00'),
	('55c4f65d-601c-4804-9e6f-6484da133be1', 'KRIKET WANITA', '2026-06-20 00:51:35.621986+00'),
	('47df0755-3a5d-4d6a-97ad-83b9f4e2c12f', 'LAWAN PEDANG', '2026-06-20 00:51:35.621986+00'),
	('8472a2fa-1d27-4fc8-a023-ac09c2a14c2a', 'LAWN BOWLS', '2026-06-20 00:51:35.621986+00'),
	('9aa48d7c-b5c4-4603-9fd9-a402e21c91ca', 'MEMANAH', '2026-06-20 00:51:35.621986+00'),
	('138ecd9f-41d7-434f-a01d-b05a96ee43b4', 'MENEMBAK', '2026-06-20 00:51:35.621986+00'),
	('745ffa75-b62d-4324-bbd2-a53e5a7bf445', 'MUAY THAI', '2026-06-20 00:51:35.621986+00'),
	('23397b1d-c5d8-4085-8b19-a3ae451c761f', 'OLAHRAGA', '2026-06-20 00:51:35.621986+00'),
	('e5bb973e-f06e-4254-aff4-304a0386a942', 'PELAYARAN', '2026-06-20 00:51:35.621986+00'),
	('a58d0909-02d6-4e29-8c9e-13b3cb14a9c5', 'PENCAK SILAT', '2026-06-20 00:51:35.621986+00'),
	('9441e724-6755-44ae-ae13-a971b25c9321', 'PETANQUE', '2026-06-20 00:51:35.621986+00'),
	('646a0f1e-449c-4b7e-9605-a98d9ae8d93b', 'PING PONG', '2026-06-20 00:51:35.621986+00'),
	('70854176-0f31-4d4c-a4a1-7af652c4a60d', 'RAGBI LELAKI', '2026-06-20 00:51:35.621986+00'),
	('faf2c242-1252-4567-8840-4a309c942fae', 'RAGBI WANITA', '2026-06-20 00:51:35.621986+00'),
	('ff2bc4d7-7754-48f3-ac69-852d2701f52b', 'SEPAK TAKRAW', '2026-06-20 00:51:35.621986+00'),
	('c3176041-b22f-46dc-9418-c0040faff0cc', 'SILAMBAM', '2026-06-20 00:51:35.621986+00'),
	('e2011a26-d606-47ea-827b-10a69aace0a6', 'SKUASY', '2026-06-20 00:51:35.621986+00'),
	('5212b034-83f5-45a1-ae6a-adb1b18cc46b', 'SOFBOL LELAKI', '2026-06-20 00:51:35.621986+00'),
	('da35b416-650c-4ca2-b02d-523651f85f05', 'SOFBOL WANITA', '2026-06-20 00:51:35.621986+00'),
	('19f9a324-373e-4b89-89c6-40e630995a67', 'TAEKWANDO', '2026-06-20 00:51:35.621986+00'),
	('8127afa1-78ca-4613-b0ca-2659cd926f4b', 'TENIS', '2026-06-20 00:51:35.621986+00'),
	('e2aee809-59ec-4cb6-91cf-775fe7e41590', 'TENPIN BOLING', '2026-06-20 00:51:35.621986+00'),
	('a6546da9-1c65-4ffa-a61b-638f72714954', 'TINJU', '2026-06-20 00:51:35.621986+00'),
	('8ccc6dcf-5c61-45d0-bed6-c15b1a295020', 'WUSHU', '2026-06-20 00:51:35.621986+00');

