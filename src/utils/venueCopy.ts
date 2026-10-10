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
