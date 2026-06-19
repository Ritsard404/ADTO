# ADMS Excel Source Map

Source inspected: `legacy/Colegio de la Immaculada Concepcion - Gorordo - ACE Sessions 2025 -2026.xlsx`.

The task file referenced `C:\Users\richa\Documents\ADTO\ADMS Base File`, but that path is not present in this checkout. The workbook above is the available ADMS source sample.

| Sheet | Purpose | Important fields | Related app module | Formula/dependency notes |
| --- | --- | --- | --- | --- |
| `Data` | Hidden lookup/reference sheet for ADMS dropdown-like values and imported master data. | Team, facilitator/supervisor names and emails, grade levels, quarter/term labels, course IDs, month/week values. | Import parser, validations, future reference data. | Hidden. Contains imported/computed formulas including `IMPORTRANGE`/`COMPUTED_VALUE` fallbacks. |
| `BackendData` | Hidden normalized monthly session source. | School Code, Deployed Form, Week, Sequence, Year, Month, Day/date, Period, Gr&Sec, Subject, Teacher, Activity, Topic, Delivery, Completion, Remarks. | ACE session import and monthly session workflow. | Hidden. Month blocks are referenced by `DataRef`; status counts include scheduled/completed/cancelled summaries. |
| `DataRef` | Hidden sheet/range registry. | Named month ranges such as `LA06June`, sheet IDs, sheet links, named ranges. | Import parser source map only. | Hidden. Documents the source workbook ranges behind month sheets. |
| `CleanedData` | Flattened session log used as the import-friendly session table. | School Code, Deployed Form, Date, Period, Gr&Sec, Subject, Teacher, Activity, Topic, Delivery, Completion, Remarks, School Term, Extracted Grade, Extracted Section. | ACE sessions and calendar. | Preferred session import source because it is normalized across months. |
| `Usage QuickView` | School implementation summary/dashboard from the workbook. | Form ID, facilitator, school, grade levels, adoption year/type, implementation year, school/facilitator overview. | Dashboard/school information. | Uses workbook selections and formulas; not the canonical write target. |
| `AdoptionDetails` | School setup and personnel details. | School, School ID, deployed form, team, supervisor, EdTechs, ACE facilitators, grade adoption, adopted since, adoption type, implementation setup, schedule arrangement. | School profile, facilitator assignment, import defaults. | Many visible sheets reference this sheet for school name, address, facilitator, and form values. |
| `School_Info` | School academic terms, teacher masterlist, section/participation data. | Term schedule, teacher names, subjects taught, monthly participation breakdown. | School detail and future reporting. | Supplies term boundaries and teacher/class context. |
| `06Jun` through `06Jun26` | Monthly ACE session calendars. | School name, deployed form, facilitator, school year, month/year, week/day columns, period, grade/section, subject, teacher, activity, topic, delivery, completion, remarks. | Monthly Sessions view. | Visible calendar sheets mirror `BackendData`/`CleanedData`; `04Apr`, `05May`, and `06Jun26` are hidden future/unused sheets in the sample. |
| `Projects` | Student-created ACE project tracker. | Term, Grade Level, Students Involved, Grade & Section, Teachers Involved, Project Type, Project Title, Project Description, project link, Remarks, Date Submitted. | Facilitator project input/tracking. | Source statuses are not explicit; app uses minimal project status set while preserving remarks. |
| `GS-i` | Grade school ACE inventory report. | Item Name, Description, No. of Issued, Total, Unit, Borrowed, Working/Not Working, Complete/Incomplete, Remarks, prepared by/date. | Inventory verification. | Uses formulas for school, location, facilitator, and logo from `AdoptionDetails`/`Data`. |
| `HS-i` | High school ACE inventory report. | Item Name, Description, No. of Issued, Total, Unit, Borrowed, Working/Not Working, Complete/Incomplete, Remarks, prepared by/date. | Inventory verification. | Same structure as `GS-i`, with a larger item list. |

Session status mapping is derived from the workbook fields `Delivery`, `Completion`, and `Remarks`: completed-like completion values map to `COMPLETED`; cancelled remarks map to `CANCELLED`; otherwise sessions start as `NOT_STARTED` for facilitator verification.

Inventory condition mapping is derived from the boolean status columns: Working/Complete maps to `GOOD`; Not Working maps to `NEEDS_REPLACEMENT`; Incomplete maps to `FAIR`; blank rows are skipped.
