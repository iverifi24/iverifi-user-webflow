import { getBusinessTypeMeta } from "@/utils/businessCategoryUtils";

/**
 * Wording for the guest check-in flow, driven by the venue's businessType.
 * Hotels keep hotel language (front desk / check-in); every other venue gets
 * neutral language (reception / visit). Unknown types fall back to neutral
 * wording but keep every step available, so older venues behave as before.
 */
export interface VenueCopy {
  /** Normalised type key from getBusinessTypeMeta, or null when the venue has none */
  typeKey: string | null;
  /** Used when the venue name has not loaded yet */
  venueFallback: string;
  /** Who the visitor should speak to when stuck ("the front desk", "reception") */
  staffTerm: string;
  /** The thing being completed ("check-in", "visit") */
  actionNoun: string;
  /** Whether to offer the "visiting with companions" step */
  allowsCompanions: boolean;
}

// Venue types where visitors typically arrive as one person with their own pass
const SOLO_VISIT_TYPES = new Set(["company", "coworking", "education", "government", "retail"]);

export function getVenueCopy(businessType?: string | null): VenueCopy {
  if (!businessType) {
    return {
      typeKey: null,
      venueFallback: "the venue",
      staffTerm: "the reception desk",
      actionNoun: "check-in",
      allowsCompanions: true,
    };
  }

  const key = getBusinessTypeMeta(businessType).key;
  const isLodging = key === "hotel" || key === "coliving";

  return {
    typeKey: key,
    venueFallback: isLodging ? "the property" : "the venue",
    staffTerm:
      key === "hotel"
        ? "the front desk"
        : key === "government"
          ? "the security desk"
          : key === "healthcare"
            ? "the help desk"
            : "the reception desk",
    actionNoun: isLodging ? "check-in" : "visit",
    allowsCompanions: !SOLO_VISIT_TYPES.has(key),
  };
}

/**
 * What the "visit detail" a business records for a visit means to the person reading it. The value is stored in the
 * `room_number` field for every business type, so only the wording changes: a room for a hotel, but the person being
 * visited for an office. Venues with no business type keep the original "Room" wording (older hotel accounts).
 * Mirrors the labels of the business app (utils/businessTypes.ts) so both sides describe the field the same way.
 */
export function getVisitFieldLabel(businessType?: string | null): string {
  if (!businessType || !businessType.trim()) return "Room";
  switch (getBusinessTypeMeta(businessType).key) {
    case "hotel":
      return "Room";
    case "coliving":
      return "Room / Bed";
    case "company":
      return "Visiting";
    case "coworking":
      return "Host member / Desk";
    case "healthcare":
      return "Department / Ward";
    case "education":
      return "Department / Purpose";
    case "government":
      return "Officer / Department";
    default:
      return "Visit note";
  }
}
