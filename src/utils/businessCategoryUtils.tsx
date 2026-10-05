import React from "react";
import {
  Building2,
  Hotel,
  Home,
  GraduationCap,
  HeartPulse,
  Briefcase,
  Landmark,
  User,
  Store,
} from "lucide-react";

export interface BusinessTypeMeta {
  key: string;
  label: string;
  shortLabel: string;
  categoryLabel: string;
  icon: React.ReactNode;
  iconClassName: string;
  badgeClassName: string;
}

export function getBusinessTypeMeta(
  type?: string | null,
  isCompany: boolean = true,
  className = "h-5 w-5"
): BusinessTypeMeta {
  const norm = (type || "").toLowerCase().trim();

  if (
    norm.includes("hotel") ||
    norm.includes("hospitality") ||
    norm.includes("resort") ||
    norm.includes("inn")
  ) {
    return {
      key: "hotel",
      label: "Hotel & Hospitality",
      shortLabel: "Hotel",
      categoryLabel: "Hospitality & Lodging",
      icon: <Hotel className={className} />,
      iconClassName: "text-amber-500 dark:text-amber-400",
      badgeClassName:
        "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  }

  if (
    norm.includes("coliving") ||
    norm.includes("pg") ||
    norm.includes("hostel") ||
    norm.includes("residential")
  ) {
    return {
      key: "coliving",
      label: "Co-living & PG",
      shortLabel: "Co-living",
      categoryLabel: "Residential Community",
      icon: <Home className={className} />,
      iconClassName: "text-indigo-500 dark:text-indigo-400",
      badgeClassName:
        "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    };
  }

  if (
    norm.includes("university") ||
    norm.includes("college") ||
    norm.includes("school") ||
    norm.includes("academy") ||
    norm.includes("education")
  ) {
    return {
      key: "education",
      label: "College & University",
      shortLabel: "Education",
      categoryLabel: "Educational Institution",
      icon: <GraduationCap className={className} />,
      iconClassName: "text-purple-500 dark:text-purple-400",
      badgeClassName:
        "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
    };
  }

  if (
    norm.includes("health") ||
    norm.includes("hospital") ||
    norm.includes("clinic") ||
    norm.includes("medical")
  ) {
    return {
      key: "healthcare",
      label: "Hospital & Healthcare",
      shortLabel: "Healthcare",
      categoryLabel: "Medical Care Facility",
      icon: <HeartPulse className={className} />,
      iconClassName: "text-rose-500 dark:text-rose-400",
      badgeClassName:
        "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    };
  }

  if (
    norm.includes("cowork") ||
    norm.includes("workspace") ||
    norm.includes("flex")
  ) {
    return {
      key: "coworking",
      label: "Coworking Space",
      shortLabel: "Coworking",
      categoryLabel: "Flexible Workspace",
      icon: <Briefcase className={className} />,
      iconClassName: "text-teal-500 dark:text-teal-400",
      badgeClassName:
        "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
    };
  }

  if (
    norm.includes("gov") ||
    norm.includes("public") ||
    norm.includes("ministry")
  ) {
    return {
      key: "government",
      label: "Government & Public",
      shortLabel: "Government",
      categoryLabel: "Public Authority",
      icon: <Landmark className={className} />,
      iconClassName: "text-blue-500 dark:text-blue-400",
      badgeClassName:
        "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    };
  }

  if (
    norm.includes("retail") ||
    norm.includes("store") ||
    norm.includes("shop")
  ) {
    return {
      key: "retail",
      label: "Retail & Commerce",
      shortLabel: "Retail",
      categoryLabel: "Commercial Retail",
      icon: <Store className={className} />,
      iconClassName: "text-emerald-500 dark:text-emerald-400",
      badgeClassName:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }

  if (!isCompany) {
    return {
      key: "individual",
      label: "Individual / Personal",
      shortLabel: "Individual",
      categoryLabel: "Personal Verification",
      icon: <User className={className} />,
      iconClassName: "text-slate-500 dark:text-slate-400",
      badgeClassName:
        "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    };
  }

  // Default Corporate & Enterprise
  return {
    key: "company",
    label: "Corporate & Enterprise",
    shortLabel: "Corporate",
    categoryLabel: "Commercial Facility",
    icon: <Building2 className={className} />,
    iconClassName: "text-cyan-500 dark:text-cyan-400",
    badgeClassName:
      "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  };
}
