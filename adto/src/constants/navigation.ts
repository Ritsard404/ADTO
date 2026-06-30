import {
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  FileText,
  FileSpreadsheet,
  GraduationCap,
  HelpCircle,
  Home,
  Images,
  KeyRound,
  School,
  Settings,
  Users,
} from "lucide-react";
import type { UserRole } from "@/generated/prisma/enums";

export type NavItem = {
  title: string;
  href: string;
  icon: typeof Home;
  roles: UserRole[];
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navigationGroups: NavGroup[] = [
  {
    title: "Dashboard",
    items: [
      { title: "Overview", href: "/dashboard", icon: Home, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
      { title: "Facilitator Workspace", href: "/facilitator/dashboard", icon: BriefcaseBusiness, roles: ["FACILITATOR"] },
    ],
  },
  {
    title: "Management",
    items: [
      { title: "Schools", href: "/schools", icon: School, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
      { title: "Facilitators", href: "/facilitators", icon: Users, roles: ["ADMIN"] },
      { title: "Assignments", href: "/facilitators?view=assignments", icon: ClipboardList, roles: ["ADMIN"] },
    ],
  },
  {
    title: "Operations",
    items: [
      { title: "ACE Sessions", href: "/sessions", icon: GraduationCap, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
      { title: "Calendar", href: "/calendar", icon: CalendarDays, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
      { title: "Reports", href: "/reports", icon: FileText, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
      { title: "ADMS Import", href: "/imports", icon: FileSpreadsheet, roles: ["ADMIN"] },
    ],
  },
  {
    title: "Resources",
    items: [
      { title: "Inventory", href: "/inventory", icon: Boxes, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
      { title: "Media Uploads", href: "/media", icon: Images, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
    ],
  },
  {
    title: "Insights",
    items: [
      { title: "Analytics", href: "/dashboard?view=analytics", icon: BarChart3, roles: ["ADMIN"] },
      { title: "Facilitator Analytics", href: "/facilitator/analytics", icon: BarChart3, roles: ["FACILITATOR"] },
    ],
  },
  {
    title: "System",
    items: [
      { title: "Account", href: "/account", icon: KeyRound, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
      { title: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
      { title: "Help Center", href: "/help", icon: HelpCircle, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
    ],
  },
];

export const navigationItems = navigationGroups.flatMap((group) => group.items);
