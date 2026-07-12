-- Local-only test accounts for pentesting this app against a disposable
-- `supabase start` Docker instance. Auto-loaded by the Supabase CLI after
-- migrations run (`supabase start` / `supabase db reset`). These rows only
-- ever exist inside that local Postgres container — never run this against
-- a real/hosted Supabase project.
--
-- Deliberately limited to 2 accounts (superadmin + the lowest-privilege
-- default role) to give the widest privilege contrast with the fewest
-- credentials to hand out.
--
-- All accounts share the same password. Do not reuse it anywhere real.
--   password: PentestLocal123!

DO $$
DECLARE
  test_password text := 'PentestLocal123!';
  test_users jsonb := '[
    {"role": "superadmin",          "email": "superadmin.test@local.dev",          "full_name": "Test Superadmin"},
    {"role": "pegawai_belia_sukan", "email": "pegawai-belia-sukan.test@local.dev", "full_name": "Test Pegawai Belia Sukan"}
  ]'::jsonb;
  u jsonb;
  new_user_id uuid;
BEGIN
  FOR u IN SELECT * FROM jsonb_array_elements(test_users)
  LOOP
    new_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, recovery_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      u->>'email',
      extensions.crypt(test_password, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', u->>'full_name', 'role', u->>'role'),
      now(), now(),
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', u->>'email'),
      'email', new_user_id::text, now(), now(), now()
    );

    -- handle_new_user() (if attached as an auth.users trigger) already
    -- inserts a default 'pegawai_belia_sukan' profile row; upsert here so
    -- the intended test role wins either way.
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (new_user_id, u->>'full_name', u->>'role')
    ON CONFLICT (id) DO UPDATE SET full_name = excluded.full_name, role = excluded.role;
  END LOOP;
END $$;
