import type { SessionStatus, UserRole } from "@/generated/prisma/enums";

export interface CalendarSessionEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    schoolId: string;
    schoolName: string;
    gradeLevel?: string;
    section?: string;
    teacherName?: string;
    facilitatorName?: string;
    subject?: string;
    activityType?: string;
    status: SessionStatus;
    durationMinutes?: number;
    modality?: string;
    remarks?: string;
    evidenceCount?: number;
    projectCount?: number;
    isReadOnly?: boolean;
  };
}

export interface CalendarFilterOptions {
  schools: Array<{ id: string; name: string }>;
  facilitators: Array<{ id: string; name: string }>;
  gradeLevels: string[];
  sections: string[];
  teachers: string[];
  activityTypes: string[];
  statuses: SessionStatus[];
}

export interface CalendarReadModel {
  role: UserRole;
  canCreateSessions: boolean;
  events: CalendarSessionEvent[];
  filters: CalendarFilterOptions;
}
