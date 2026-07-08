-- ============================================================
-- DocManager - Storage Policies
-- Run AFTER you have created the 'documents' bucket manually
-- in Supabase > Storage > New bucket (name: documents, private)
-- ============================================================

-- Drop existing policies first (safe re-run)
drop policy if exists "storage_upload" on storage.objects;
drop policy if exists "storage_select" on storage.objects;
drop policy if exists "storage_delete" on storage.objects;

create policy "storage_upload"
  on storage.objects for insert
  with check (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "storage_select"
  on storage.objects for select
  using (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
