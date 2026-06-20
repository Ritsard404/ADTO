# Phase: Global Search And Navigation Command Bar

Goal:

- Create a fast, convenient search bar that helps users find pages, schools, sessions, reports, projects, inventory, evidence, users, and common actions without navigating manually through the sidebar.

Current system context:

- Protected layout uses `src/app/(protected)/layout.tsx`.
- Desktop navigation lives in `src/components/layout/app-sidebar.tsx`.
- Mobile navigation lives in `src/components/layout/bottom-nav.tsx`.
- Header lives in `src/components/layout/app-header.tsx`.
- Route metadata lives in `src/constants/navigation.ts`.
- Access scoping is role-aware through `getAccessibleSchoolIds()` and route-specific report/calendar services.
- Business logic should stay under `src/features/*`; shared layout components should stay presentational.

## Phase 1 - Search Requirements And Index Shape

Status: TODO

Required scope:

- Define searchable categories: navigation pages, schools, facilitators, sessions, calendar events, projects, inventory, reports, media/evidence, settings, and help guides.
- Define role scoping:
  - Admin can search all operational records.
  - Facilitator can search only assigned-school operational records.
  - School admin can search only membership-scoped school records.
- Define result fields: title, subtitle, category, href, matched fields, status, date, school, and action label.
- Keep sensitive details out of search snippets.

Acceptance checks:

- Search requirements clearly map to existing modules and access rules.
- No result type bypasses role-based scoping.

## Phase 2 - Feature-Owned Search Service

Status: TODO

Required scope:

- Create `src/features/search/services/global-search.service.ts`.
- Reuse `navigationItems` for page/action results.
- Query existing Prisma records for schools, sessions, projects, inventory, reports, media, profiles, and help content where appropriate.
- Accept a compact query object: search text, role/profile, optional category, and limit.
- Return DTO-safe search results only; do not return raw Prisma records.
- Include empty-state recommendations for short or no-query searches.

Acceptance checks:

- Search service returns role-scoped results across key modules.
- Result links point to existing routes and include useful query parameters where practical.

## Phase 3 - Server Action Or Route Handler

Status: TODO

Required scope:

- Add a feature-owned server action or route handler for global search.
- Validate query input with Zod.
- Sanitize errors so users never see raw database or framework errors.
- Keep response small and fast; cap results per category.

Acceptance checks:

- Search requests work for admin, facilitator, and school admin users.
- Invalid or empty queries return safe, helpful responses.

## Phase 4 - Header Search Bar

Status: TODO

Required scope:

- Add a compact search input to `AppHeader`.
- Use a command palette or popover interaction:
  - Keyboard shortcut: `/` or `Ctrl+K`.
  - Mobile-safe full-width dialog.
  - Group results by category.
  - Show icons, status, school, and date where useful.
- Preserve dense layout and avoid horizontal scrolling.
- Keep icon-only buttons accessible with labels/tooltips.

Acceptance checks:

- Users can search from any protected page.
- Keyboard and mobile flows are usable.
- Header remains compact and does not overlap content.

## Phase 5 - Navigation And Quick Actions

Status: TODO

Required scope:

- Include navigation results from `src/constants/navigation.ts`.
- Add quick actions where safe:
  - Create session
  - Open schedule workbench
  - Add evidence
  - Open report preview
  - Verify inventory
  - Manage school access
- Only show actions allowed for the current role.

Acceptance checks:

- Search helps users navigate faster than the sidebar for common workflows.
- Users do not see actions they cannot use.

## Phase 6 - Search Result Deep Links

Status: TODO

Required scope:

- Add useful links:
  - School result -> `/schools?q=<name>`
  - Session result -> `/sessions?schoolId=...`
  - Calendar result -> `/calendar?schoolId=...&startDate=...`
  - Report result -> `/reports?schoolId=...`
  - Inventory result -> `/inventory?schoolId=...`
  - Evidence result -> `/media?schoolId=...`
  - Facilitator result -> `/facilitators`
- Add route query handling only where it already exists or is low-risk.

Acceptance checks:

- Search results land users near the target record, not just the broad module.
- Deep links do not break existing page behavior.

## Phase 7 - Help And Documentation Search

Status: TODO

Required scope:

- Add user-guide/help results for existing docs:
  - Navigation
  - Facilitator workspace
  - Facilitator workbook tools
  - Admin workbook governance
  - School admin portal
  - Assignments
  - Calendar
  - Schedules
  - Passwords
- If a real Help Center route is added later, link results there; otherwise link to the closest existing account/help surface or docs route.

Acceptance checks:

- Users can discover how-to content from the same global search.
- Help results are role-relevant where possible.

## Phase 8 - Performance, Empty States, And Tests

Status: TODO

Required scope:

- Debounce client searches.
- Avoid expensive broad scans for very short queries.
- Add loading, empty, and error states.
- Add focused tests or at least validation coverage for scoping and result shaping.
- Validate with `npx.cmd prisma validate`, `npx.cmd prisma generate`, `npx.cmd tsc --noEmit`, targeted lint, and `npm.cmd run build`.

Acceptance checks:

- Search feels fast with existing seed/imported data.
- No role can discover records outside their scope.
- Build and TypeScript remain clean.

## Implementation Rules

- Keep search business logic under `src/features/search`.
- Keep layout/header components presentation-focused.
- Reuse existing route/navigation constants before creating new metadata.
- Keep mobile search full-width and avoid horizontal scrolling.
- Do not implement fuzzy ranking with a heavy dependency unless simple matching is not enough.
- Update user guide and any in-app help entry when the search feature is implemented.
