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

## P0 Security

- [ ] Rotate Supabase database password and service-role key if `.env` has ever been shared, pasted, committed, screen-shared, or exposed in logs.
  - Evidence: local `.env` contains real database and Supabase service-role secrets.
  - Current guard: `.env` and `.env.local` are git-ignored.
- [ ] Add deployment secret checklist before production use.
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
- [ ] Add abuse/rate limiting around high-risk actions.
  - Login/password actions.
  - Workbook preview/import actions.
  - AI report assistant.
  - Report download/generation routes.
- [ ] Add an app-level security event log.
  - Failed login attempts if available from Supabase.
  - Admin user creation and password reset.
  - Workbook import preview/import.
  - Report generation/download.
  - Evidence link creation and bulk upload.
- [ ] Wire existing `AuditLog` and `ApprovalRequest` models into real writes.
  - Evidence: code reads these models in workbook governance, but scan found no app writes.
- [ ] Verify RLS state against the live Supabase database after deploy.
  - Existing migration enables RLS on public tables.
  - Because the app intentionally uses server-side Prisma, do not add broad anon/authenticated policies unless direct browser table access becomes a requirement.
- [ ] Add a strict Content Security Policy after route-by-route testing.
  - Do not add blindly; verify Next scripts, Supabase auth, downloads, fonts, and external evidence/report links first.

## P0 Data Protection And Reliability

- [ ] Store generated report artifacts in Supabase Storage or another private object store.
  - Current behavior: `ReportHistory` stores route URLs that regenerate files instead of immutable generated files.
  - Affected file: `src/app/(protected)/reports/official/route.ts`.
- [ ] Add real evidence file uploads with signed/private URLs.
  - Current behavior: evidence records are URL-only and depend on external Drive links.
  - Affected areas: `MediaUpload`, `/media`, `/facilitator/evidence`.
- [ ] Add workbook import checksums and import batches.
  - Prevent accidental re-imports.
  - Show imported/updated/skipped row counts by sheet.
  - Allow rollback of one import batch.
- [ ] Add backup/export/restore process for production.
  - Include database backup, object storage backup, and export verification.
- [ ] Add error monitoring.
  - Capture server action failures without leaking secrets or raw workbook contents.
  - Track failed imports and failed report generations.

## P1 Performance

- [ ] Add query limits and default date windows to the shared calendar.
  - Current risk: calendar can fetch every scoped session when no date range is supplied.
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
- [ ] Add composite indexes for common filters.
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
- [ ] Add file validation for future uploads.
  - MIME sniffing, extension allowlist, file size limits, storage path isolation, and optional malware scanning.
- [ ] Replace default AI model fallback with required config.
  - Current code uses a hard-coded fallback model.
  - Require `OPENAI_MODEL` in production or disable the assistant with a clear admin message.

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
  - Private upload, signed URL, tags, linked sessions/projects/reports, school-scoped browsing.

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

## Suggested Implementation Order

1. Rotate/confirm secrets and production env values.
2. Replace or isolate `xlsx`.
3. Add rate limiting and audit-log writes for admin/import/report actions.
4. Add storage-backed report and evidence uploads.
5. Add query windows, pagination, and indexes for calendar/search/workspace/dashboard.
6. Build Import Center, Data Quality Center, and Approval Queues.
7. Add monitoring, smoke tests, and dependency update routine.
