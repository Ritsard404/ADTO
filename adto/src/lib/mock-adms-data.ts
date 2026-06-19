import type {
  AssignmentStatus,
  InventoryCondition,
  ProjectStatus,
  ReportStatus,
  SchoolStatus,
  SessionStatus,
  UserRole,
  UserStatus,
} from "@/generated/prisma/enums";

export type MockProfile = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};

export const mockProfiles: MockProfile[] = [
  {
    id: "mock-admin",
    email: "admin@adto.local",
    fullName: "Mock ADTO Admin",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: new Date("2025-06-01"),
    updatedAt: new Date("2025-06-01"),
  },
  {
    id: "mock-facilitator",
    email: "facilitator@adto.local",
    fullName: "Francis Justin Cutamora",
    role: "FACILITATOR",
    status: "ACTIVE",
    createdAt: new Date("2025-06-01"),
    updatedAt: new Date("2025-06-01"),
  },
  {
    id: "mock-school-admin",
    email: "school-admin@adto.local",
    fullName: "CIC Gorordo School Admin",
    role: "SCHOOL_ADMIN",
    status: "ACTIVE",
    createdAt: new Date("2025-06-01"),
    updatedAt: new Date("2025-06-01"),
  },
];

export const mockSchools = [
  {
    id: "mock-cic-gorordo",
    name: "Colegio de la Immaculada Concepcion - Gorordo",
    address: "Cebu City, Philippines",
    contactPerson: "CIC Program Coordinator",
    contactEmail: "school-admin@adto.local",
    contactNumber: "+63 912 000 0000",
    schoolCode: "CDLIC-G",
    schoolType: "Private",
    region: "Region VII",
    division: "Cebu City",
    schoolYear: "2025 - 2026",
    adoptionYear: "2025",
    implementationYear: "1st",
    adoptionType: "Creative Coding + Physical Computing",
    scheduleArrangement: "Fixed Schedule",
    codingModality: "Classroom + Computer Laboratory",
    hardwareAllocation: "10 Makey-Makey, 10 Micro:bit v2, 10 Arduino Uno Kit, 20 Raspberry Pi",
    softwareAllocation: "ScratchJr, Scratch, mBlock, web-based coding tools",
    status: "ACTIVE" as SchoolStatus,
    createdAt: new Date("2025-06-01"),
    updatedAt: new Date("2025-06-01"),
  },
  {
    id: "mock-cic-mandaue",
    name: "Colegio de la Inmaculada Concepcion - Mandaue",
    address: "Mandaue City, Philippines",
    contactPerson: "Mandaue Program Coordinator",
    contactEmail: "mandaue-admin@adto.local",
    contactNumber: "+63 912 111 1111",
    schoolCode: "CDLIC-M",
    schoolType: "Private",
    region: "Region VII",
    division: "Mandaue City",
    schoolYear: "2025 - 2026",
    adoptionYear: "2025",
    implementationYear: "1st",
    adoptionType: "Software-based / Creative Coding",
    scheduleArrangement: "Fixed Schedule and Integrated",
    codingModality: "Classroom integrated coding",
    hardwareAllocation: "Shared school hardware pool",
    softwareAllocation: "Scratch, mBlock, browser coding tools",
    status: "ACTIVE" as SchoolStatus,
    createdAt: new Date("2025-06-01"),
    updatedAt: new Date("2025-06-01"),
  },
];

export const mockAssignments = [
  {
    id: "mock-assignment-gorordo",
    facilitatorId: "mock-facilitator",
    schoolId: "mock-cic-gorordo",
    startDate: new Date("2025-06-16"),
    endDate: null as Date | null,
    status: "ACTIVE" as AssignmentStatus,
    assignedBy: "mock-admin",
  },
  {
    id: "mock-assignment-mandaue-history",
    facilitatorId: "mock-facilitator",
    schoolId: "mock-cic-mandaue",
    startDate: new Date("2024-06-16"),
    endDate: new Date("2025-03-31"),
    status: "TRANSFERRED" as AssignmentStatus,
    assignedBy: "mock-admin",
  },
];

export const mockSections = [
  {
    id: "mock-section-g7-francis",
    schoolId: "mock-cic-gorordo",
    schoolYear: "2025 - 2026",
    gradeLevel: "Grade 7",
    sectionName: "St. Francis",
    adviserName: "Abejaron J",
    maleStudents: 20,
    femaleStudents: 18,
    totalStudents: 38,
    isActive: true,
    createdAt: new Date("2025-06-01"),
    updatedAt: new Date("2025-06-01"),
  },
  {
    id: "mock-section-g8-counsel",
    schoolId: "mock-cic-gorordo",
    schoolYear: "2025 - 2026",
    gradeLevel: "Grade 8",
    sectionName: "Counsel",
    adviserName: "Cabusas A",
    maleStudents: 19,
    femaleStudents: 21,
    totalStudents: 40,
    isActive: true,
    createdAt: new Date("2025-06-01"),
    updatedAt: new Date("2025-06-01"),
  },
];

export const mockSessions = [
  {
    id: "mock-session-1",
    schoolId: "mock-cic-gorordo",
    facilitatorId: "mock-facilitator",
    title: "Student Orientation",
    gradeLevel: "Grade 7",
    section: "Chastity",
    sessionNumber: 1,
    scheduledDate: new Date("2025-07-03"),
    actualDate: new Date("2025-07-03"),
    status: "COMPLETED" as SessionStatus,
    remarks: "Orientation completed with teacher participation.",
    sourceKey: "mock-session-1",
    sourceSheet: "CleanedData",
    period: "1",
    startTime: "08:00",
    durationHours: 1,
    subject: "Computer",
    teacher: "Abejaron J",
    activity: "Student Orientation",
    delivery: "Classroom",
    completion: "Completed",
    updatedAt: new Date("2025-07-03"),
  },
  {
    id: "mock-session-2",
    schoolId: "mock-cic-gorordo",
    facilitatorId: "mock-facilitator",
    title: "Build and Code Session",
    gradeLevel: "Grade 8",
    section: "Counsel",
    sessionNumber: 2,
    scheduledDate: new Date("2025-08-12"),
    actualDate: null as Date | null,
    status: "FOR_VERIFICATION" as SessionStatus,
    remarks: "Needs completion remarks.",
    sourceKey: "mock-session-2",
    sourceSheet: "CleanedData",
    period: "2",
    startTime: "10:00",
    durationHours: 1,
    subject: "Science",
    teacher: "Cabusas A",
    activity: "Build and Code Session",
    delivery: "Com Lab",
    completion: "",
    updatedAt: new Date("2025-08-12"),
  },
  {
    id: "mock-session-3",
    schoolId: "mock-cic-mandaue",
    facilitatorId: "mock-facilitator",
    title: "Project Creation",
    gradeLevel: "Grade 10",
    section: "Concern",
    sessionNumber: 3,
    scheduledDate: new Date("2026-02-18"),
    actualDate: new Date("2026-02-18"),
    status: "COMPLETED" as SessionStatus,
    remarks: "Students prepared app prototypes.",
    sourceKey: "mock-session-3",
    sourceSheet: "CleanedData",
    period: "3",
    startTime: "13:00",
    durationHours: 1.5,
    subject: "Research",
    teacher: "Peñafor Th",
    activity: "Project Creation",
    delivery: "Classroom",
    completion: "Completed",
    updatedAt: new Date("2026-02-18"),
  },
];

export const mockProjects = [
  {
    id: "mock-project-1",
    schoolId: "mock-cic-gorordo",
    sessionId: "mock-session-2",
    title: "Paths of Peace",
    term: "Quarter 3",
    gradeLevel: "Grade 8",
    section: "Grade 8 - Counsel",
    students: "Grade 8 students",
    teacher: "Abejaron J",
    projectType: "Interactive Storybook",
    description: "Interactive digital story about peace and community decisions.",
    projectUrl: "https://drive.google.com/mock-paths-of-peace",
    remarks: "For checking",
    submittedAt: new Date("2026-03-16"),
    status: "SUBMITTED" as ProjectStatus,
    sourceKey: "mock-project-1",
    createdAt: new Date("2026-03-16"),
    updatedAt: new Date("2026-03-16"),
  },
  {
    id: "mock-project-2",
    schoolId: "mock-cic-mandaue",
    sessionId: "mock-session-3",
    title: "EkonoTrack",
    term: "Quarter 3",
    gradeLevel: "Grade 9",
    section: "Grade 9 - Integrity",
    students: "Grade 9 students",
    teacher: "Peñafor Th",
    projectType: "Educational App",
    description: "Educational app for GDP and GNP concepts.",
    projectUrl: "https://drive.google.com/mock-ekonotrack",
    remarks: "Checked",
    submittedAt: new Date("2026-03-16"),
    status: "CHECKED" as ProjectStatus,
    sourceKey: "mock-project-2",
    createdAt: new Date("2026-03-16"),
    updatedAt: new Date("2026-03-18"),
  },
];

export const mockInventoryItems = [
  {
    id: "mock-inventory-1",
    schoolId: "mock-cic-gorordo",
    itemName: "MICROBIT",
    category: "Invention Kits",
    quantity: 10,
    unit: "sets",
    condition: "GOOD" as InventoryCondition,
    remarks: "Complete and working.",
    sourceKey: "mock-inventory-1",
    lastCheckedAt: new Date("2025-07-14"),
    lastCheckedBy: "Francis Justin Cutamora",
  },
  {
    id: "mock-inventory-2",
    schoolId: "mock-cic-gorordo",
    itemName: "ARDUINO UNO",
    category: "Raspberry Pi and Arduino Kit Components",
    quantity: 20,
    unit: "pc/s",
    condition: "FAIR" as InventoryCondition,
    remarks: "",
    sourceKey: "mock-inventory-2",
    lastCheckedAt: null as Date | null,
    lastCheckedBy: null as string | null,
  },
];

export const mockReports = [
  {
    id: "mock-report-1",
    schoolId: "mock-cic-gorordo",
    facilitatorId: "mock-facilitator",
    sessionId: "mock-session-1",
    reportType: "Implementation",
    title: "Mock CIC Gorordo Implementation Report",
    summary: "Mock report summary for UI testing.",
    submittedAt: new Date("2026-03-20"),
    status: "SUBMITTED" as ReportStatus,
  },
];

export const mockReportHistories = [
  {
    id: "mock-history-1",
    schoolId: "mock-cic-gorordo",
    schoolYear: "2025 - 2026",
    reportType: "year-end",
    generatedBy: "mock-school-admin",
    generatedAt: new Date("2026-04-15"),
    pptFileUrl: "/reports/official?schoolId=mock-cic-gorordo&schoolYear=2025%20-%202026&reportType=year-end&format=pptx",
    pdfFileUrl: "/reports/official?schoolId=mock-cic-gorordo&schoolYear=2025%20-%202026&reportType=year-end&format=pdf",
  },
];

export const mockInventoryChecks = [
  {
    id: "mock-check-1",
    itemId: "mock-inventory-1",
    checkedBy: "Francis Justin Cutamora",
    condition: "GOOD" as InventoryCondition,
    quantity: 10,
    remarks: "Complete and working.",
    checkedAt: new Date("2025-07-14"),
  },
];

export function withMockRelations() {
  const profilesById = new Map(mockProfiles.map((profile) => [profile.id, profile]));
  const schoolsById = new Map(mockSchools.map((school) => [school.id, school]));
  const sessionsById = new Map(mockSessions.map((session) => [session.id, session]));

  const assignments = mockAssignments.map((assignment) => ({
    ...assignment,
    facilitator: profilesById.get(assignment.facilitatorId)!,
    school: schoolsById.get(assignment.schoolId)!,
  }));

  const sessions = mockSessions.map((session) => ({
    ...session,
    school: schoolsById.get(session.schoolId)!,
    facilitator: profilesById.get(session.facilitatorId)!,
  }));

  const schools = mockSchools.map((school) => ({
    ...school,
    assignments: assignments.filter((assignment) => assignment.schoolId === school.id),
    sessions: sessions.filter((session) => session.schoolId === school.id),
    projects: mockProjects.filter((project) => project.schoolId === school.id),
    inventoryItems: mockInventoryItems.filter((item) => item.schoolId === school.id),
    reports: mockReports.filter((report) => report.schoolId === school.id),
    sections: mockSections.filter((section) => section.schoolId === school.id),
    schoolYears: [],
    teacherAssignments: [],
    remarks: [],
  }));

  const projects = mockProjects.map((project) => ({
    ...project,
    school: schoolsById.get(project.schoolId)!,
    session: project.sessionId ? sessionsById.get(project.sessionId) ?? null : null,
  }));

  const inventoryItems = mockInventoryItems.map((item) => ({
    ...item,
    school: schoolsById.get(item.schoolId)!,
  }));

  const inventoryChecks = mockInventoryChecks.map((check) => ({
    ...check,
    item: inventoryItems.find((item) => item.id === check.itemId)!,
  }));

  const reports = mockReports.map((report) => ({
    ...report,
    school: schoolsById.get(report.schoolId)!,
    facilitator: profilesById.get(report.facilitatorId)!,
  }));

  const reportHistories = mockReportHistories.map((history) => ({
    ...history,
    school: schoolsById.get(history.schoolId)!,
  }));

  const facilitators = mockProfiles
    .filter((profile) => profile.role === "FACILITATOR")
    .map((facilitator) => ({
      ...facilitator,
      facilitatorAssignments: assignments.filter((assignment) => assignment.facilitatorId === facilitator.id),
    }));

  return { profiles: mockProfiles, schools, sessions, projects, inventoryItems, inventoryChecks, reports, reportHistories, assignments, facilitators };
}
