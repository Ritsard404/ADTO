# Codex Pending Task: ADMS Admin Features

## Project Context

This task is for the **ADMS / ADTO system**.

The existing ADMS source of truth is the school Excel base file located locally at:

```txt
C:\Users\richa\Documents\ADTO\ADMS Base File
```

Before implementing anything, inspect and understand the current ADMS Excel structure, including:

- School information
- Assigned AF / facilitator information
- Calendar and monthly schedules
- Coding session records
- Project input records
- Inventory records and remarks
- Reports and summary sheets
- Any formulas, references, validations, computed fields, and hidden dependencies

Do **not** invent new fields if the Excel file already contains equivalent columns or logic.

---

## Main Goal

Implement the **Admin feature/module** for ADMS.

The Admin role should have broad control over school, facilitator, inventory, report, and user-related data, but must **not** be allowed to create, input, edit, or update coding session records.

Coding session updates are reserved for the facilitator workflow.

---

## Admin Permissions

### Admin CAN manage:

- School records
- Assigned AF / facilitator assignments
- Facilitator-related data
- User accounts and roles
- Project data
- Inventory data
- Inventory remarks verification/update
- Reports and downloadable summaries
- Imported or migrated Excel-based ADMS data
- General dashboard summaries
- Data corrections for non-session records

### Admin CANNOT manage:

- Create coding sessions
- Input coding session records
- Update coding session records
- Delete coding session records
- Modify monthly session entries coming from the ADMS calendar
- Override facilitator session logs

The UI, backend actions, services, validations, and database permissions must enforce this restriction.

---

## Required Admin Features

## 1. Admin Dashboard

Create or update the Admin dashboard to display a high-level ADMS overview.

Recommended dashboard cards:

- Total schools
- Active schools
- Total facilitators / AFs
- Assigned AFs
- Unassigned schools
- Total projects encoded
- Inventory items requiring remarks review
- Downloadable reports available

Dashboard data must be fetched from existing ADMS data models or migrated Excel-derived records.

Avoid hardcoded sample values.

---

## 2. School Management

Admin must be able to:

- View all schools
- Search schools
- Filter schools by status, location, assigned AF, or available Excel-derived fields
- View school details
- Update school information when needed
- See assigned facilitator / AF
- See related projects, inventory, and reports

Admin should not be able to directly modify coding session records inside the school detail page.

If coding sessions are displayed, they must be **read-only** for Admin.

---

## 3. AF / Facilitator Assignment

Admin must be able to assign and update AF assignments.

Features:

- Assign an AF to a school
- Reassign an AF
- Remove an AF assignment when needed
- View schools assigned to each AF
- View AF assignment history if supported by existing data

Rules:

- Do not duplicate AF records.
- Reuse existing user/facilitator models if available.
- If no assignment history exists yet, implement only the current assignment unless the architecture already supports history.

---

## 4. User Management

Admin must be able to manage users.

Features:

- View all users
- Search users
- Filter by role/status
- Create or invite user if the current app supports it
- Update user role
- Activate/deactivate user
- Assign user to facilitator/AF profile if applicable

Suggested roles:

- Admin
- Facilitator / AF
- Viewer / Read-only, if already supported or useful

Do not create unnecessary roles unless the existing architecture supports them.

---

## 5. Project Data Management

Admin must be able to manage project-related data.

Features:

- View projects by school
- View projects by AF
- Search and filter projects
- Add project data if this is part of the Excel source logic
- Update project details
- Correct project records
- Export project records

Rules:

- Project records are different from coding session records.
- Admin can manage projects, but must not update session logs or monthly session calendar entries.

---

## 6. Inventory Management

Admin must be able to manage and verify inventory information.

Features:

- View inventory per school
- Search inventory items
- Filter by school, item type, status, or remarks status
- Update inventory data
- Verify remarks
- Update remarks when needed
- Track items requiring review

Inventory remarks should support clear status handling, such as:

- Pending review
- Verified
- Needs correction
- Updated

Use existing Excel values if statuses already exist.

---

## 7. Reports and Downloads

Admin must be able to generate and download reports.

Reports may include:

- School summary report
- AF assignment report
- Project report
- Inventory report
- Inventory remarks report
- Overall ADMS summary report

Download formats:

- Excel/XLSX if already supported or appropriate
- CSV as fallback
- PDF only if already part of the project pattern

Rules:

- Reports must be based on actual stored data.
- Avoid frontend-only fake exports.
- Preserve Excel-compatible formatting where reasonable.

---

## 8. Coding Sessions Are Read-Only for Admin

Admin may view coding session information for monitoring, but only as read-only data.

Admin must not see action buttons such as:

- Add session
- Edit session
- Update session
- Delete session
- Save session changes
- Bulk update sessions

Backend must also block these actions even if attempted manually.

Required enforcement:

- Hide restricted UI actions
- Block restricted server actions/API routes
- Validate role permissions in service layer
- Return a safe error message for unauthorized session modification attempts

Suggested message:

```txt
Admins can view coding sessions but cannot modify them. Session updates are handled by facilitators.
```

---

## Implementation Rules

Follow the ADMS / ADTO workspace rules:

- Reuse existing components before creating new ones.
- Reuse existing services, actions, DTOs, validators, and database models.
- Do not duplicate Excel-derived structures.
- Do not hardcode school, AF, project, inventory, or report values.
- Preserve strict TypeScript typing.
- Keep UI consistent with the existing ADMS theme.
- Keep Admin features separate from Facilitator-only session workflows.
- Keep permission rules enforced on both frontend and backend.

---

## Suggested Technical Structure

Use existing architecture first. If matching files already exist, update them instead of creating duplicates.

Possible areas to inspect:

```txt
app/admin
components/admin
features/admin
lib/actions
lib/services
lib/validators
lib/dto
prisma/schema.prisma
```

Do not create these folders unless the current codebase already follows or needs this structure.

---

## Acceptance Criteria

The task is complete when:

- Admin can view and manage schools.
- Admin can assign, reassign, and remove AF assignments.
- Admin can manage users and roles.
- Admin can view, update, and correct project data.
- Admin can view and update inventory data.
- Admin can verify and update inventory remarks.
- Admin can download reports.
- Admin can view coding sessions only as read-only records.
- Admin cannot create, update, or delete coding sessions from the UI.
- Admin cannot create, update, or delete coding sessions through backend/API/server actions.
- Permission rules are covered consistently across UI, server actions, services, and validators.
- Existing Excel-derived ADMS logic is respected.

---

## Important Restriction

Do not implement Admin coding session editing.

The Admin role is powerful, but coding session input and updates must remain part of the facilitator workflow.

