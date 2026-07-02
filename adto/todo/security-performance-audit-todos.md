# ADTO Security, Performance, and System Gap TODOs

Audit date: 2026-06-30

Scope checked:
- `src/app`, `src/features`, `src/lib`, `prisma/schema.prisma`, `prisma/migrations`
- `package.json`, `package-lock.json`, `.env*` shape, `next.config.ts`
- Existing workbook parity tracker: `todo/adms-system-gap-todos.md`
- `npm audit`, `npm audit --omit=dev`, `npm outdated`, `npx prisma validate`

## Completed in this audit pass

- [x] Added safe deployment headers in `next.config.ts`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [x] Added `.env.example` with placeholder-only environment keys.
- [x] Updated `.gitignore` so `.env` and `.env.local` stay ignored while `.env.example` can be committed.
- [x] Split the Supabase service-role env accessor into `src/lib/supabase/server-env.ts` so browser Supabase helpers no longer share the same module as the service-role helper.
- [x] Added explicit missing-env errors for Supabase URL and publishable key configuration.
- [x] Moved direct `prisma` and `shadcn` entries from `dependencies` to `devDependencies`.
- [x] Refreshed `package-lock.json`.
- [x] Phase 1 P0 repo hardening:
  - Added `npm run env:check` for deployment env validation without printing secrets.
  - Added best-effort `AuditLog` writes for login attempts, password changes, admin password resets, user creation, workbook preview/import, report generation/download, report assistant requests, daily-log bulk saves, and evidence link saves.
  - Added in-process rate limiting for login, password changes/resets, workbook preview/import, report assistant requests, report generation/download, daily-log bulk saves, and evidence link saves.
  - Removed the hard-coded OpenAI model fallback; OpenAI is only used when both `OPENAI_API_KEY` and `OPENAI_MODEL` are configured.
  - Switched `npm run build` to `next build --webpack` after the local Turbopack build repeatedly hit a Windows Prisma junction conflict.
- [x] Phase 0-1 storage/import/performance pass:
  - Added private Supabase Storage helper with private bucket creation, uploads, and signed URL resolution.
  - Stored generated official report PPT/PDF artifacts as immutable private storage objects.
  - Added private evidence file uploads with validation and signed URL rendering.
  - Added workbook import batch/checksum tracking and duplicate completed-import blocking.
  - Added default bounded calendar date windows.
  - Added composite indexes for common session/project/inventory/media/report filters.

## P0 Security

- [ ] Rotate Supabase database password and service-role key if `.env` has ever been shared, pasted, committed, screen-shared, or exposed in logs.
  - Evidence: local `.env` contains real database and Supabase service-role secrets.
  - Current guard: `.env` and `.env.local` are git-ignored.
- [x] Add deployment secret checklist before production use.
  - Implemented as `npm run env:check`.
  - `ADTO_AUTH_BYPASS=false`
  - `ADTO_DATA_MODE=production`
  - `NEXT_PUBLIC_APP_URL` set to the deployed URL
  - `DATABASE_URL` uses Supabase pooler
  - `DIRECT_URL` is only used for migrations
  - `SUPABASE_SERVICE_ROLE_KEY` exists only in server environment variables
- [ ] Replace or isolate `xlsx`.
  - Evidence: `npm audit` reports high severity advisories for `xlsx@0.18.5`: prototype pollution and ReDoS.
  - Affected code: `src/features/import-export/services/adms-excel-import.ts`, `src/features/admin/services/workbook-governance.service.ts`.
  - Preferred action: migrate workbook parsing to a maintained package or a hardened server-only import worker.
- [x] Add abuse/rate limiting around high-risk actions.
  - Login/password actions.
  - Workbook preview/import actions.
  - AI report assistant.
  - Report download/generation routes.
- [x] Add an app-level security event log.
  - Failed login attempts if available from Supabase.
  - Admin user creation and password reset.
  - Workbook import preview/import.
  - Report generation/download.
  - Evidence link creation and bulk upload.
- [x] Wire existing `AuditLog` model into real writes.
  - Implemented for first-pass high-risk actions.
- [ ] Wire existing `ApprovalRequest` model into real approval workflows.
- [ ] Verify RLS state against the live Supabase database after deploy.
  - Existing migration enables RLS on public tables.
  - Because the app intentionally uses server-side Prisma, do not add broad anon/authenticated policies unless direct browser table access becomes a requirement.
- [ ] Add a strict Content Security Policy after route-by-route testing.
  - Do not add blindly; verify Next scripts, Supabase auth, downloads, fonts, and external evidence/report links first.

## P0 Data Protection And Reliability

- [x] Store generated report artifacts in Supabase Storage or another private object store.
  - Implemented: `ReportHistory` now stores private storage references for generated PPT/PDF artifacts and report history resolves signed URLs.
  - Affected files: `src/app/(protected)/reports/official/route.ts`, `src/app/(protected)/reports/page.tsx`.
- [x] Add real evidence file uploads with signed/private URLs.
  - Implemented: evidence can be uploaded to private storage or saved as an external link.
  - Affected areas: `MediaUpload`, `/media`, `/facilitator/evidence`.
- [ ] Add workbook import checksums and import batches.
  - [x] Prevent accidental re-imports when a workbook checksum already has a completed batch.
  - [x] Store import batch status, workbook checksum, facilitator email, school, and global row counters.
  - [x] Show imported/skipped/read row counts by sheet.
  - [x] Distinguish created rows from updated rows in sheet-level import counts.
  - Allow rollback of one import batch.
- [ ] Add backup/export/restore process for production.
  - Include database backup, object storage backup, and export verification.
- [ ] Add error monitoring.
  - Capture server action failures without leaking secrets or raw workbook contents.
  - Track failed imports and failed report generations.

## P1 Performance

- [x] Add query limits and default date windows to the shared calendar.
  - Implemented: missing/invalid date ranges default to a bounded two-school-year window and oversized ranges are capped.
  - Affected file: `src/features/calendar/services/calendar-read.service.ts`.
- [ ] Paginate or window the facilitator workspace.
  - Current risk: it loads schools, sessions, projects, inventory, reports, and evidence for all accessible schools.
  - Affected file: `src/features/facilitator/services/facilitator-workspace.service.ts`.
- [ ] Replace dashboard full session-row reads with database aggregates.
  - Current risk: dashboard reads session rows to compute coding hours and activity counts.
  - Affected file: `src/features/dashboard/services/dashboard-read.service.ts`.
- [ ] Add full-text or trigram search indexes for global search.
  - Current risk: global search uses many case-insensitive `contains` filters.
  - Affected file: `src/features/search/services/global-search.service.ts`.
- [x] Add composite indexes for common filters.
  - Candidates:
    - `ACESession(schoolId, scheduledDate)`
    - `ACESession(facilitatorId, scheduledDate)`
    - `ACESession(schoolId, status)`
    - `ACEProject(schoolId, updatedAt)`
    - `InventoryItem(schoolId, condition)`
    - `MediaUpload(schoolId, createdAt)`
    - `ReportHistory(schoolId, generatedAt)`
- [ ] Stream or filter CSV exports.
  - Current risk: admin exports load entire tables before returning CSV.
  - Affected file: `src/features/reports/services/adms-report-export.ts`.
- [ ] Optimize workbook imports.
  - Current risk: import code performs sequential row-by-row `upsert` calls.
  - Add chunked transactions, import-batch status, and background progress.

## P1 Security Hardening

- [ ] Add admin account controls.
  - Last sign-in, created-by, disabled-at, password-reset-at.
  - Force temporary-password change after admin reset.
  - Optional 2FA policy through Supabase if supported by the chosen auth plan.
- [ ] Add origin checks or CSRF review for server actions and route handlers.
  - Server actions already authenticate/authorize in the action files; this is a hardening pass for cross-origin abuse and high-risk forms.
- [ ] Review external URLs before rendering.
  - Project links and evidence links open in a new tab.
  - Keep `rel="noreferrer"` and add URL allowlist/warnings for unknown hosts.
- [x] Add file validation for future uploads.
  - MIME sniffing, extension allowlist, file size limits, storage path isolation, and optional malware scanning.
- [x] Replace default AI model fallback with required config.
  - OpenAI is used only when both `OPENAI_API_KEY` and `OPENAI_MODEL` are configured.
  - Otherwise the assistant stays on local fallback guidance.

## P1 System Gaps And Useful Features

- [ ] Create an Admin Security Dashboard.
  - Dependency audit state.
  - Missing env warnings.
  - Import failures.
  - Recent admin actions.
  - Users without matching Supabase Auth accounts.
- [ ] Create an Import Center.
  - Batch history, workbook checksum, sheet-level status, row errors, retry, rollback.
- [ ] Add Approval Queues.
  - Report approvals.
  - Inventory discrepancy approvals.
  - School admin access approvals.
  - Facilitator reassignment approvals.
- [ ] Add Notifications.
  - Import completed/failed.
  - Report ready for review.
  - Inventory item needs attention.
  - Session schedule conflict.
- [ ] Add Data Quality Center.
  - Missing teachers, missing sections, duplicate schools, sessions without status, projects without links, inventory without verification.
- [ ] Add Report Artifact Library.
  - Versioned PPT/PDF files.
  - Download history.
  - Generated-by and generated-at metadata.
- [ ] Add Evidence Library.
  - [x] Private upload and signed URL rendering.
  - [x] Linked school/session/project evidence records.
  - [ ] Tags, linked reports, and richer school-scoped browsing.

## P2 Performance And Maintainability

- [ ] Generate real Supabase database types if browser Supabase access expands.
  - Current `src/types/database.ts` is effectively empty, which is acceptable while direct table access is not used.
- [ ] Add query timing logs around slow surfaces.
  - Dashboard.
  - Calendar.
  - Global search.
  - Workbook import.
  - Report generation.
- [ ] Add smoke tests for protected routes and role access.
  - Admin routes blocked for facilitator and school admin.
  - School admin cannot access unassigned schools.
  - Facilitator cannot mutate inactive/historical assignments.
- [ ] Add dependency update routine.
  - Run `npm audit`.
  - Run `npm outdated`.
  - Verify with `npm run lint`, `npx tsc --noEmit`, and `npm run build`.

## Audit Results To Recheck

- `npx prisma validate`: passed during this audit.
- `npm audit`: 6 findings total, 5 moderate and 1 high.
- `npm audit --omit=dev`: still reports 6 findings.
  - `xlsx@0.18.5`: high, no automatic fix available.
  - `next@16.2.9` includes nested `postcss@8.4.31`: moderate advisory.
  - `@prisma/client@7.8.0` install tree includes `prisma@7.8.0 -> @prisma/dev@0.24.3 -> @hono/node-server@1.19.11`: moderate advisory.
- `npm outdated`: patch/minor updates exist for React, React DOM, Tailwind, lucide-react, react-hook-form, recharts, shadcn, and tooling; update in a separate tested dependency pass.
- Latest phase 0-1 checks:
  - `npx prisma validate`: passed.
  - `npx prisma generate`: passed.
  - `npx tsc --noEmit`: passed.
  - `npm run lint`: passed.
  - `npm run build`: passed.
  - `git diff --check`: passed.
  - `npm run prisma:deploy`: applied `20260630120000_storage_import_batches_and_indexes`.
  - `npx prisma migrate status`: database schema is up to date.
  - `npm run env:check`: fails until `SUPABASE_STORAGE_BUCKET` is set explicitly and `NEXT_PUBLIC_APP_URL` is changed from localhost to the deployed URL.

## Suggested Implementation Order

1. Rotate/confirm secrets and production env values.
2. Replace or isolate `xlsx`.
3. Add rate limiting and audit-log writes for admin/import/report actions.
4. Add storage-backed report and evidence uploads.
5. Add query windows, pagination, and indexes for calendar/search/workspace/dashboard.
6. Build Import Center, Data Quality Center, and Approval Queues.
7. Add monitoring, smoke tests, and dependency update routine.
