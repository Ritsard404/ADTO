# ADMS System Gap Todos

Generated from a scan of:

- `legacy/Colegio de la Immaculada Concepcion - Gorordo - ACE Sessions 2025 -2026.xlsx`
- `src/app`, `src/features`, `prisma/schema.prisma`, `docs/adms-excel-source-map.md`, and deployment/config scripts

## Legacy Workbook Snapshot

- Workbook detected school: `Colegio de la Immaculada Concepcion - Gorordo`
- School code: `CDLIC-G`
- Deployed form: `CDLIC-G-001`
- Sheets: 23 total
- Hidden/reference sheets: `Data`, `BackendData`, `DataRef`, `04Apr`, `05May`, `06Jun26`
- Importable source rows:
  - `CleanedData`: 7,162 rows, about 1,032 valid session rows
  - `Projects`: 26 project rows
  - `GS-i`: 5 inventory items
  - `HS-i`: 47 inventory items
  - `School_Info`: 4 academic terms, 37 sections, 61 teachers

## Current System Coverage

- [x] Supabase Auth login with role-based profiles
- [x] Admin user creation/reset script
- [x] Admin dashboard and workbook governance queue
- [x] ADMS Excel upload/import page
- [x] School, facilitator, assignment, session, project, inventory, media, report, calendar, settings, help routes
- [x] Facilitator workspace and school-scoped access
- [x] School admin report access with membership/contact fallback
- [x] CSV report exports
- [x] PPTX/PDF report generation endpoint
- [x] Evidence link paste/import flow
- [x] Mock mode for local UI testing

## P0: Deployment And Admin Configuration

- [ ] Set production env vars in the deployed host:
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ADTO_DATA_MODE=production`
  - `ADTO_AUTH_BYPASS=false`
- [ ] Provision the first admin account using `npm run auth:admin`.
- [ ] Confirm database migrations are applied with `npm run prisma:deploy`.
- [ ] Confirm Supabase public table RLS policies match the app access model.
- [ ] Add deployment health checks for `/login`, `/dashboard`, `/imports`, and `/reports`.
- [ ] Configure backup and restore for the production Postgres database.
- [ ] Document where production secrets are stored and who can rotate them.

## P0: Import Reliability Gaps

- [ ] Add an `ImportBatch` database model to record each uploaded workbook, uploader, file name, checksum, status, counts, started time, completed time, and failure reason.
- [ ] Add `ImportBatchRow` or similar row-level logging for skipped rows, validation errors, and source row ranges.
- [ ] Add a true dry-run preview before import:
  - [ ] rows to create
  - [ ] rows to update
  - [ ] rows to skip
  - [ ] duplicate schools/deployed forms
  - [ ] missing facilitator/profile mappings
- [ ] Add import rollback or undo by batch.
- [ ] Add import idempotency by workbook checksum and source keys.
- [ ] Add conflict UI when the uploaded workbook school code or deployed form matches multiple existing records.
- [ ] Move large imports to a background job or route-handler workflow if Vercel Server Action timeouts become a problem.
- [ ] Add tests using the legacy workbook as a fixture:
  - [ ] school metadata extraction
  - [ ] session import count
  - [ ] project import count
  - [ ] inventory import count
  - [ ] repeated import does not duplicate records

## P0: Workbook Parity Gaps

- [ ] Import teacher masterlist from `School_Info` into `Teacher`.
- [ ] Import teacher-section-subject relationships from `School_Info` into `TeacherAssignment`.
- [ ] Import teacher participation metrics:
  - [ ] sessions participated
  - [ ] hours supported
  - [ ] projects facilitated
  - [ ] attendance/participation score
- [ ] Decide whether `BackendData` should become the canonical import source for any fields not present in `CleanedData`.
- [ ] Preserve monthly sheet identity (`06Jun`, `07Jul`, etc.) when a session is imported from workbook-derived data.
- [ ] Store workbook formula/reference metadata from `DataRef` only if needed for audit parity.
- [ ] Import school setup fields not fully mapped yet:
  - [ ] school logo file ID
  - [ ] address line 1/line 2
  - [ ] EdTech emails
  - [ ] supervisor emails
  - [ ] coding modality
  - [ ] software allocation
  - [ ] adoption remarks/addendum
- [ ] Add validation for required ADMS sheets before allowing import.

## P0: Evidence And File Storage Gaps

- [ ] Add real file upload to Supabase Storage for evidence files.
- [ ] Keep link-based evidence import as a fast path for Google Drive URLs.
- [ ] Add file metadata:
  - [ ] storage bucket/path
  - [ ] file size
  - [ ] MIME type
  - [ ] original source
  - [ ] uploaded/verified status
- [ ] Add evidence tagging by school, session, project, teacher, grade, section, and report period.
- [ ] Add evidence review status:
  - [ ] pending
  - [ ] accepted
  - [ ] needs replacement
  - [ ] rejected
- [ ] Add permission checks so school admins can view evidence but cannot modify facilitator uploads unless explicitly allowed.

## P0: Report Output Gaps

- [ ] Store generated PPTX/PDF files in Supabase Storage instead of only streaming downloads.
- [ ] Update `ReportHistory` to point to stored file URLs.
- [ ] Add report versioning:
  - [ ] draft
  - [ ] submitted
  - [ ] reviewed
  - [ ] returned
  - [ ] final
- [ ] Add report narrative editor using `ReportNarrative`.
- [ ] Add report lock/freeze once a final report is approved.
- [ ] Add official ACE template upload/config so reports can use a real branded template instead of generated slide layout only.
- [ ] Add report completeness checklist before final download:
  - [ ] sessions imported
  - [ ] projects linked
  - [ ] evidence attached
  - [ ] inventory verified
  - [ ] school admin reviewed

## P0: Audit, Approval, And Governance Gaps

- [ ] Wire `AuditLog` writes into critical actions:
  - [ ] user creation/update/password reset
  - [ ] school updates
  - [ ] facilitator assignment changes
  - [ ] workbook imports
  - [ ] report generation
  - [ ] evidence changes
  - [ ] inventory verification
- [ ] Add `ApprovalRequest` UI and actions:
  - [ ] request approval
  - [ ] approve
  - [ ] return for revision
  - [ ] reject
  - [ ] assign reviewer
- [ ] Add an admin queue page for approvals and audit events.
- [ ] Add school-admin review flow for reports and evidence.
- [ ] Add change diff display for governed school setup fields.

## P1: Account And Access Features

- [ ] Add school admin invitation flow.
- [ ] Add password reset email flow through Supabase Auth.
- [ ] Add account disabled-state handling in auth/session checks.
- [ ] Add role-specific onboarding pages after first login.
- [ ] Add user activity history on the Settings page.
- [ ] Add bulk user import for schools/facilitators if account setup becomes repetitive.
- [ ] Add tests for admin, facilitator, and school-admin route access.

## P1: Scheduling And Session Workflow

- [ ] Add holiday/exam blackout dates from `School_Info` terms or a separate calendar table.
- [ ] Add conflict resolution UI for duplicate schedules and overlapping facilitator assignments.
- [ ] Add recurring schedule templates by school/grade/section.
- [ ] Add session verification queue:
  - [ ] facilitator marks complete
  - [ ] admin/school admin verifies
  - [ ] returned sessions require remarks
- [ ] Add attendance and actual duration fields to session update forms.
- [ ] Add bulk edit for imported session corrections.
- [ ] Add monthly close process so previous months can be locked.

## P1: Inventory Features

- [ ] Add asset-level tracking for devices with serial numbers and QR codes.
- [ ] Add borrow/return workflow for kits and components.
- [ ] Add maintenance tickets from `InventoryMaintenanceLog`.
- [ ] Add inventory condition history timeline per item.
- [ ] Add low-stock/lost/damaged alerts.
- [ ] Add printable inventory sign-off sheet per school.
- [ ] Add inventory import validation for quantity mismatches.

## P1: Dashboard And Analytics Features

- [ ] Add workbook import health dashboard:
  - [ ] last import by school
  - [ ] imported row counts
  - [ ] errors by sheet
  - [ ] stale schools with no recent import
- [ ] Add school readiness score based on sessions, projects, evidence, inventory, and report status.
- [ ] Add trend charts by month, grade, teacher, activity type, and modality.
- [ ] Add facilitator load dashboard showing active schools and session volume.
- [ ] Add data quality filters for missing teacher, subject, evidence, project link, or inventory remarks.
- [ ] Add exportable admin dashboard snapshot.

## P1: Search And Navigation Improvements

- [ ] Add direct search results for imported workbook batches.
- [ ] Add search result links to exact school/session/project/inventory records.
- [ ] Add saved filters for admin dashboards.
- [ ] Add breadcrumbs for nested facilitator and school workflows.
- [ ] Add mobile-friendly import/status review screens.

## P1: AI And Automation Suggestions

- [ ] Keep the report assistant disabled/fallback unless `OPENAI_API_KEY` is configured.
- [ ] Set `OPENAI_MODEL` explicitly in production instead of relying on the current default.
- [ ] Add AI-generated report narrative draft, but require human review before saving.
- [ ] Add AI-assisted data quality explanations for imported workbook errors.
- [ ] Add AI summary for a school month:
  - [ ] strongest grade participation
  - [ ] missing evidence
  - [ ] sessions needing verification
  - [ ] report-ready recommendations

## P2: Nice-To-Have Product Features

- [ ] Add offline-friendly facilitator data entry for school visits.
- [ ] Add printable monthly school report packet.
- [ ] Add QR-code evidence upload links per session/project.
- [ ] Add parent/admin share links for final reports.
- [ ] Add import comparison against the original Excel workbook totals.
- [ ] Add school logo and brand assets to reports.
- [ ] Add CSV/XLSX export for every major table.
- [ ] Add API endpoint for external ADMS integrations.

## Recommended Build Order

- [ ] 1. Finish import batch logging and dry-run preview.
- [ ] 2. Import teacher masterlist and teacher assignments from `School_Info`.
- [ ] 3. Add Supabase Storage for evidence and generated report files.
- [ ] 4. Wire audit logs into every mutation.
- [ ] 5. Build approval/review workflows for reports and evidence.
- [ ] 6. Add production monitoring, backup, and import health dashboards.
- [ ] 7. Add advanced analytics and AI-assisted narratives.

## Acceptance Checks Before Marking Production Ready

- [ ] A real deployed admin can create users and reset passwords.
- [ ] A facilitator can import/update assigned-school sessions without touching other schools.
- [ ] A school admin can only see their school data.
- [ ] The legacy workbook imports without duplicate rows on repeated runs.
- [ ] Import errors are visible and actionable.
- [ ] Evidence files or links are attached to projects/sessions.
- [ ] Generated reports are persisted and listed in report history.
- [ ] Every admin mutation has an audit record.
- [ ] Critical flows have route/action tests.
- [ ] Database backup and restore process has been tested.
