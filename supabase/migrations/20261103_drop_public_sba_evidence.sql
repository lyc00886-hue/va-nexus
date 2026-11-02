-- Applied via MCP:
--   tmp_allow_sba_evidence_delete (temp Storage API delete policy)
--   edge fn admin-drop-sba-evidence-bucket (service-role deleteBucket; now retired 410 stub)
--   drop_sba_evidence_table
-- Smoke-test object smoke-test/step-1/x.png removed; public bucket sba-evidence deleted;
-- public.sba_evidence dropped. Private sba-private / sba_private_evidence untouched.

drop policy if exists "tmp sba-evidence anon delete" on storage.objects;
drop policy if exists "sba-evidence anon select" on storage.objects;
drop policy if exists "sba-evidence anon insert" on storage.objects;
drop policy if exists "sba_evidence anon select" on public.sba_evidence;
drop policy if exists "sba_evidence anon insert" on public.sba_evidence;
drop table if exists public.sba_evidence;
