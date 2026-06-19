# Codex Task: Implement Excel-Like Schedule Duplication and Bulk Session Entry for ADMS

## Goal
Implement an Excel-like scheduling workflow for ADMS so ACE Facilitators can quickly duplicate, paste, and update session schedules instead of manually re-encoding repetitive weekly data.

The system must support workflows similar to the legacy Excel file:

```txt
adto\legacy\Colegio de la Immaculada Concepcion - Gorordo - ACE Sessions 2025 -2026.xlsx
```

Codex must scan and study this legacy Excel file before implementation to understand the existing schedule structure, columns, sheet organization, repeated patterns, formulas, and session-entry workflow.

---

## Required Legacy File Review
Before coding, inspect:

```txt
adto\legacy\Colegio de la Immaculada Concepcion - Gorordo - ACE Sessions 2025 -2026.xlsx
```

Identify:

- Sheet names used for ACE session logging
- Columns related to session date, day, time, grade level, section, subject, adviser/teacher, ACE facilitator, venue/modality, activity type, session topic, remarks, status, and duration
- Repeated weekly schedule patterns
- How copied sessions are usually updated in Excel
- Any formulas, dropdown-like values, calculated totals, or summary dependencies
- Data validation patterns that should be preserved in the web app

Do not hardcode assumptions without checking the file first.

---

## Feature 1: Duplicate Previous Week Schedule
Add a feature that lets a facilitator copy all sessions from a previous week into the current or selected week.

### Required behavior
The facilitator should be able to select:

- Source week
- Target week
- School
- Optional grade level filter
- Optional section filter
- Optional facilitator filter
- Optional day filter

Example:

```txt
Copy sessions from: June 10-14, 2026
Apply to: June 17-21, 2026
```

The system should duplicate the selected sessions and shift the dates to the matching day in the target week.

### Fields copied as-is
Copy these fields unless the system model uses different names:

- School
- Grade level
- Section
- Subject
- Adviser/Teacher
- Facilitator
- Time start
- Time end
- Venue / modality
- Session duration
- Activity type
- Implementation setup
- Notes that are schedule-related

### Fields that should reset or become editable after duplication
Reset these fields because they are session-result-specific:

- Attendance status
- Completion status
- Actual remarks
- Evidence / attachments
- Inventory remarks
- Session output count
- Project/artifact count
- Final verification status
- Last updated by
- Last updated at

For copied topic/activity fields, allow the user to choose whether to:

1. Copy exactly
2. Clear for editing
3. Auto-increment session number if pattern exists, such as `Session 1` → `Session 2`

---

## Feature 2: Copy Specific Day Schedule
Add a faster action for fixed-schedule schools.

Example:

```txt
Copy Tuesday schedule from last week to Tuesday this week
```

### Required UI action
Add actions like:

- `Copy This Day to Next Week`
- `Copy This Day to Selected Date`
- `Duplicate Tuesday Schedule`

### Required behavior
When copied, preserve the same time slots and class assignments, but update the date.

The facilitator must be shown a preview before saving.

---

## Feature 3: Bulk Excel Paste Schedule Input
Add a bulk paste modal or page where users can copy rows from Excel and paste them into ADMS.

### Required behavior
The input should accept tab-separated values copied from Excel.

Example pasted data:

```txt
Date	Day	Start Time	End Time	Grade Level	Section	Subject	Teacher	Facilitator	Venue	Activity Type	Topic	Remarks
2026-06-23	Tuesday	08:00	09:00	7	St. Anne	Mathematics	Juan Dela Cruz	Richard Quirante	ACE Hub	Coding Session	Variables and Loops	For encoding
2026-06-23	Tuesday	09:00	10:00	8	St. Paul	Science	Maria Santos	Richard Quirante	ACE Hub	Project Creation	Sensor Prototype	For encoding
```

### Required features
- Parse pasted rows into a preview table
- Auto-map columns where possible
- Allow manual column mapping if headers differ
- Validate required fields
- Highlight invalid rows
- Allow saving only valid rows
- Prevent duplicate sessions unless user confirms
- Support paste without headers if the user selects a saved column format

---

## Feature 4: Recurring Schedule Templates
Add reusable templates for fixed ACE schedules.

### Example template

```txt
School: CIC Gorordo
Day: Tuesday
Time: 8:00 AM - 9:00 AM
Grade Level: 7
Section: St. Anne
Subject: Mathematics
Teacher: Juan Dela Cruz
Facilitator: Richard Quirante
Venue: ACE Hub
Repeat: Weekly
```

### Required behavior
Admin or authorized facilitator can create templates and generate sessions from them.

Template generation should support:

- Weekly recurrence
- Date range
- Selected school days only
- Excluded dates / holidays / no-class days
- Preview before creation
- Conflict detection

---

## Feature 5: Schedule Conflict Detection
Before saving duplicated or pasted sessions, detect conflicts.

Flag conflicts when:

- Same section has overlapping sessions
- Same facilitator has overlapping sessions
- Same room/venue has overlapping sessions
- Same session already exists with same school, section, date, start time, and end time

Show conflicts in the preview table with clear warnings.

Allow these actions:

- Skip conflicted rows
- Edit conflicted rows
- Save anyway only if user role allows override

---

## Feature 6: Preview Before Save
All duplication and bulk paste actions must show a preview before committing to the database.

Preview table must include:

- Date
- Day
- Start time
- End time
- Grade level
- Section
- Subject
- Teacher
- Facilitator
- Venue
- Activity type
- Topic
- Status
- Validation result

Add badges for:

- New
- Duplicate
- Conflict
- Missing data
- Ready to save

---

## Feature 7: Fast Editing After Duplication
After sessions are duplicated, redirect to an editable schedule table.

The table should feel close to Excel:

- Dense rows
- Inline editing
- Keyboard navigation
- Copy/paste support
- Multi-row selection
- Batch update selected rows
- Save all changes button
- Autosave draft before final save if possible

Common batch updates:

- Set facilitator
- Set venue
- Set activity type
- Set topic
- Set status
- Set remarks
- Clear remarks
- Move selected sessions to another date

---

## Suggested Data Model Additions
Adapt to the existing schema. Do not duplicate models if existing tables already support this.

Possible additions:

```ts
ScheduleTemplate
- id
- schoolId
- name
- dayOfWeek
- startTime
- endTime
- gradeLevelId
- sectionId
- subjectId
- teacherId
- facilitatorId
- venueId
- activityType
- defaultTopic
- defaultRemarks
- recurrenceRule
- isActive
- createdById
- createdAt
- updatedAt
```

```ts
ScheduleDuplicationBatch
- id
- sourceStartDate
- sourceEndDate
- targetStartDate
- targetEndDate
- schoolId
- createdById
- createdAt
- status
- copiedCount
- skippedCount
- conflictCount
```

Only add these if needed. Prefer reusing the current ADMS models.

---

## API / Server Action Requirements
Implement server-side actions or API routes for:

```txt
getSessionsForCopyPreview()
duplicateWeekSessions()
duplicateDaySessions()
parseBulkSchedulePaste()
validateScheduleRows()
saveBulkScheduleRows()
createScheduleTemplate()
generateSessionsFromTemplate()
```

All write actions must:

- Validate user role
- Validate school access
- Sanitize input
- Use transactions where needed
- Return structured validation errors
- Avoid partial saves unless explicitly requested

---

## Role Rules

### Admin
Can:

- Duplicate schedules for any school
- Create and manage schedule templates
- Override conflicts
- Import bulk schedules
- Edit generated sessions

### ACE Facilitator
Can:

- Duplicate schedules only for assigned schools/classes
- Bulk paste sessions for assigned schedules
- Edit copied session details
- Update status and remarks
- Cannot override major conflicts unless allowed by admin setting

### School Admin
Can:

- View schedules
- Download reports
- View generated session logs
- Should not directly encode or modify ACE session logs unless the current system already allows it

---

## UI Requirements
Make the UI mobile-friendly and dense because ACE Facilitators may encode on laptops, tablets, or phones.

Required UI areas:

1. Schedule calendar view
2. Table/list view
3. Duplicate schedule modal
4. Bulk paste modal
5. Conflict preview table
6. Template management page

Design requirements:

- Sticky sidebar on desktop
- Compact spacing
- Clean inputs
- Mobile-friendly controls
- Horizontal scroll only where necessary
- Clear save/cancel buttons
- Validation messages near the affected row
- Avoid large empty spaces

---

## Acceptance Criteria
The task is complete when:

- Codex has inspected the legacy Excel file path
- User can copy last Tuesday's schedule to the current Tuesday
- User can duplicate a full previous week into the current week
- User can paste rows copied from Excel and save valid sessions
- Duplicate/conflict detection works
- Preview-before-save exists for all bulk actions
- Result-specific fields reset correctly after duplication
- Admin and facilitator permissions are respected
- The implementation reuses existing ADMS models/components where possible
- No duplicate feature files are created unnecessarily
- TypeScript, validation, and database logic are clean and consistent with the existing codebase

---

## Important Implementation Notes
- Do not create a separate isolated scheduling system if ADMS already has session models.
- Reuse existing school, grade level, section, subject, adviser, facilitator, and session entities.
- Preserve reporting compatibility because year-end reports depend on accurate session logs.
- Use the legacy Excel file only as a reference for behavior, fields, workflow, and data patterns.
- Avoid hardcoding CIC Gorordo-specific data; make the feature reusable for all schools.
- Keep the workflow faster than Excel, not more complicated.
