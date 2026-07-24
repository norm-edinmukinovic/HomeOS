import {
  Home,
  ListChecks,
  Wallet,
  CalendarDays,
  Bell,
  Sparkles,
  Users,
  Settings,
  LayoutGrid,
  StickyNote,
  Archive,
  type LucideIcon,
} from "lucide-react";

// Vizuelni identitet svakog app-a: ikonica + pastelne klase boja.
// Klase su pune (statične) da ih Tailwind sigurno uključi u build.
export interface AppTheme {
  icon: LucideIcon;
  iconBg: string;   // pozadina kruga s ikonicom
  iconText: string; // boja ikonice
  navActive: string; // aktivna stavka u navigaciji
  navHover: string;  // hover u navigaciji
  ring: string;      // rub kartice / naglasak
}

export const appTheme: Record<string, AppTheme> = {
  dashboard: {
    icon: Home, iconBg: "bg-mint-soft", iconText: "text-mint",
    navActive: "bg-mint-soft text-mint", navHover: "hover:bg-mint-soft", ring: "border-mint/30",
  },
  tasks: {
    icon: ListChecks, iconBg: "bg-sky-soft", iconText: "text-sky",
    navActive: "bg-sky-soft text-sky", navHover: "hover:bg-sky-soft", ring: "border-sky/30",
  },
  finance: {
    icon: Wallet, iconBg: "bg-peach-soft", iconText: "text-peach",
    navActive: "bg-peach-soft text-peach", navHover: "hover:bg-peach-soft", ring: "border-peach/30",
  },
  calendar: {
    icon: CalendarDays, iconBg: "bg-lav-soft", iconText: "text-lav",
    navActive: "bg-lav-soft text-lav", navHover: "hover:bg-lav-soft", ring: "border-lav/30",
  },
  reminders: {
    icon: Bell, iconBg: "bg-sun-soft", iconText: "text-sun",
    navActive: "bg-sun-soft text-sun", navHover: "hover:bg-sun-soft", ring: "border-sun/30",
  },
  kanban: {
    icon: LayoutGrid, iconBg: "bg-indigo-soft", iconText: "text-indigo",
    navActive: "bg-indigo-soft text-indigo", navHover: "hover:bg-indigo-soft", ring: "border-indigo/30",
  },
  notes: {
    icon: StickyNote, iconBg: "bg-note-soft", iconText: "text-note",
    navActive: "bg-note-soft text-note", navHover: "hover:bg-note-soft", ring: "border-note/30",
  },
  "life-admin": {
    icon: Archive, iconBg: "bg-life-soft", iconText: "text-life",
    navActive: "bg-life-soft text-life", navHover: "hover:bg-life-soft", ring: "border-life/30",
  },
  members: {
    icon: Users, iconBg: "bg-teal-soft", iconText: "text-teal",
    navActive: "bg-teal-soft text-teal", navHover: "hover:bg-teal-soft", ring: "border-teal/30",
  },
  custom: {
    icon: Sparkles, iconBg: "bg-indigo-soft", iconText: "text-indigo",
    navActive: "bg-indigo-soft text-indigo", navHover: "hover:bg-indigo-soft", ring: "border-indigo/30",
  },
  settings: {
    icon: Settings, iconBg: "bg-slate2-soft", iconText: "text-slate2",
    navActive: "bg-slate2-soft text-slate2", navHover: "hover:bg-slate2-soft", ring: "border-slate2/30",
  },
};

export function themeFor(id: string): AppTheme {
  if (id.startsWith("x:")) return appTheme.custom;
  return appTheme[id] ?? appTheme.custom;
}
