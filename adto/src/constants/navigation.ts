import {
  BarChart3,
  Boxes,
  FileText,
  GraduationCap,
  Home,
  Images,
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

export const navigationItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: Home, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
  { title: "Schools", href: "/schools", icon: School, roles: ["ADMIN"] },
  { title: "Facilitators", href: "/facilitators", icon: Users, roles: ["ADMIN"] },
  { title: "ACE Sessions", href: "/sessions", icon: GraduationCap, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
  { title: "Reports", href: "/reports", icon: FileText, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
  { title: "Inventory", href: "/inventory", icon: Boxes, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
  { title: "Media", href: "/media", icon: Images, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
  { title: "Analytics", href: "/dashboard", icon: BarChart3, roles: ["ADMIN"] },
  { title: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
];
