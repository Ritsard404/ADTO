## Feature: School Admin Reports & PPT Generation

### Objective

Implement a School Admin reporting module that allows authorized school administrators to:

* View school reports
* Filter reports by school year
* Preview reports before export
* Download reports as PowerPoint (.pptx)
* Generate reports only using the official ACE PowerPoint template

School Admin users are NOT allowed to:

* Modify coding sessions
* Create coding sessions
* Edit coding session records
* Assign ACE Facilitators
* Modify implementation data

---

# Role Permissions

## School Admin

Allowed:

✓ View school dashboard

✓ View coding statistics

✓ View implementation reports

✓ View teacher participation reports

✓ View project reports

✓ View facilitator reports

✓ Download PowerPoint reports

✓ Download PDF reports

✓ Download Excel summaries

✓ View charts and analytics

✓ View inventory status

✓ View school implementation progress

Not Allowed:

✗ Create Coding Sessions

✗ Update Coding Sessions

✗ Delete Coding Sessions

✗ Assign Facilitators

✗ Edit Facilitator Schedules

✗ Modify ACE Calendar

✗ Modify Session Logs

✗ Modify Inventory Records

✗ Manage Users

---

# Report Generation Rules

## IMPORTANT

DO NOT create report layouts from scratch.

Codex must use:

.agents/skills/powerpoint

as the official report generation skill.

---

# PowerPoint Template Standard

Analyze the existing ACE Year-End Report template first before implementation.

Reference:

Colegio de la Immaculada Concepcion - Gorordo Year-End Report

The generated report must follow:

* Same slide order
* Same branding
* Same colors
* Same typography
* Same layout structure
* Same chart style
* Same narrative structure
* Same KPI card design

No custom report themes allowed.

---

# Report Types

## 1. Year-End Report

Generate:

* Coding Sessions Logged
* Coding Hours Delivered
* Activities Count
* Computational Artifacts Created
* Participating Teachers
* Student Coders
* Active Facilitators
* Subject Integration
* Modalities
* Project Types
* Teacher Participation

Output:

* PPTX
* PDF

---

## 2. Mid-Year Report

Generate the same sections but limited to:

Term 1
Term 2

---

## 3. School Dashboard Report

Generate executive summary:

* Total Sessions
* Total Students
* Total Teachers
* Total Projects
* Total Activities
* Most Active Grade
* Most Active Teacher
* Most Active Facilitator

---

# Data Source Rules

ALL report data must come from:

ADMS Database

Never manually encode values.

All charts must be dynamically computed.

---

# PowerPoint Generation Pipeline

Step 1

Collect school data

Step 2

Calculate metrics

Step 3

Generate charts

Step 4

Populate official PPT template

Step 5

Generate PPTX

Step 6

Generate PDF copy

Step 7

Store report history

---

# Report History

Create ReportHistory table

Fields:

id
schoolId
schoolYear
reportType
generatedBy
generatedAt
pptFileUrl
pdfFileUrl

School Admin can:

* View previous reports
* Re-download reports

Cannot:

* Edit generated reports

---

# Dashboard Preview

Before downloading:

Show preview slides

School Admin can:

* Review report
* Verify statistics

Then:

Download PPT
Download PDF

---

# UI Requirements

Reports Page

Tabs:

* Dashboard Reports
* Mid-Year Reports
* Year-End Reports
* Download History

Actions:

[Preview]
[Generate]
[Download PPT]
[Download PDF]

---

# Security

Only School Admin may access reports for their own school.

Admin may access reports from all schools.

Facilitators may not generate official reports.

---

# Success Criteria

A School Admin can:

1. Open Reports
2. Select School Year
3. Generate Report
4. Preview Report
5. Download Official ACE PPT
6. Download PDF Version

while preserving the exact ACE report structure and branding standards from the official Year-End Report template.
