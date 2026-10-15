import type { Project } from "@/lib/api/types";
import {
  BuildingIcon,
  ClipboardIcon,
  GraphIcon,
  GridIcon,
  LayersIcon,
  MessageIcon,
  SparkleIcon,
} from "@/components/ui/icons";

export type NavSection = {
  label: string;
  href: string;
  Icon: typeof GridIcon;
  group: "Project" | "Data" | "Explore";
  count?: keyof Project["counts"];
  exact?: boolean; // only active on this exact URL
};

// Sections inside a project, shared by the sidebar and the mobile tab bar.
export const projectSections = (projectId: string): NavSection[] => {
  const base = `/projects/${projectId}`;
  return [
    { label: "Dashboard", href: base, Icon: GridIcon, group: "Project", exact: true },
    { label: "Insights", href: `${base}/insights`, Icon: SparkleIcon, group: "Project" },
    { label: "Features", href: `${base}/features`, Icon: LayersIcon, group: "Data", count: "features" },
    { label: "Vendors", href: `${base}/vendors`, Icon: BuildingIcon, group: "Data", count: "vendors" },
    { label: "Responses", href: `${base}/responses`, Icon: MessageIcon, group: "Data", count: "responses" },
    { label: "Surveys", href: `${base}/surveys`, Icon: ClipboardIcon, group: "Data", count: "surveys" },
    { label: "Relationship map", href: `${base}/map`, Icon: GraphIcon, group: "Explore" },
  ];
};

export const isActive = (pathname: string, href: string, exact?: boolean) =>
  exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
