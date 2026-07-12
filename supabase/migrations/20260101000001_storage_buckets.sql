-- Storage buckets used by the app (src/pages/athletes/AthletesPage.tsx,
-- src/pages/performance/inbody/InBodyPage.tsx) but never captured in the
-- schema migration — they were created by hand in the real project's
-- dashboard, so a fresh local/pentest instance starts with no buckets and
-- no storage.objects policies, meaning uploads fail outright.
--
-- Bucket visibility inferred from usage: athlete-photos is read via
-- getPublicUrl() with no signed-URL fallback (public). inbody_diet_plans is
-- read via createSignedUrl() when actually opened (private) even though
-- getPublicUrl() is also called to build a path-extractable URL string.
--
-- Policies below grant any authenticated user full CRUD within these two
-- buckets, matching this app's existing pattern elsewhere (most tables'
-- INSERT/UPDATE policies only check auth.role() = 'authenticated', not a
-- specific role) — not a verified copy of the real project's actual
-- storage policies, since those were never captured anywhere either.

insert into storage.buckets (id, name, public)
values
  ('athlete-photos', 'athlete-photos', true),
  ('inbody_diet_plans', 'inbody_diet_plans', false)
on conflict (id) do nothing;

create policy "athlete-photos: read"
  on storage.objects for select
  using (bucket_id = 'athlete-photos');

create policy "athlete-photos: authenticated write"
  on storage.objects for insert
  with check (bucket_id = 'athlete-photos' and auth.role() = 'authenticated');

create policy "athlete-photos: authenticated update"
  on storage.objects for update
  using (bucket_id = 'athlete-photos' and auth.role() = 'authenticated');

create policy "athlete-photos: authenticated delete"
  on storage.objects for delete
  using (bucket_id = 'athlete-photos' and auth.role() = 'authenticated');

create policy "inbody_diet_plans: authenticated read"
  on storage.objects for select
  using (bucket_id = 'inbody_diet_plans' and auth.role() = 'authenticated');

create policy "inbody_diet_plans: authenticated write"
  on storage.objects for insert
  with check (bucket_id = 'inbody_diet_plans' and auth.role() = 'authenticated');

create policy "inbody_diet_plans: authenticated update"
  on storage.objects for update
  using (bucket_id = 'inbody_diet_plans' and auth.role() = 'authenticated');

create policy "inbody_diet_plans: authenticated delete"
  on storage.objects for delete
  using (bucket_id = 'inbody_diet_plans' and auth.role() = 'authenticated');
