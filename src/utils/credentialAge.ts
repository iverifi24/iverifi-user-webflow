import { differenceInYears } from "date-fns";

/** Prefer these document types for account-holder age (exclude children’s Aadhaar). */
const AGE_DOC_PRIORITY = [
  "AADHAAR_CARD",
  "PAN_CARD",
  "PASSPORT",
  "DRIVING_LICENSE",
  "C-Form (Foreign Guest)",
] as const;

function docPriorityIndex(documentType: string | undefined): number {
  if (!documentType) return 999;
  const i = AGE_DOC_PRIORITY.indexOf(documentType as (typeof AGE_DOC_PRIORITY)[number]);
  return i === -1 ? 500 : i;
}

function isChildCredential(documentType: string | undefined): boolean {
  if (!documentType) return false;
  return documentType.startsWith("Child ") && documentType.includes("Aadhaar");
}

function normalizeStatus(status: unknown): string {
  if (typeof status !== "string") return "";
  return status.trim().toLowerCase();
}

/** Treat as verified for age if state/status is empty or clearly approved. */
export function isCredentialVerifiedForAge(c: Record<string, unknown> | null | undefined): boolean {
  if (!c || typeof c !== "object") return false;
  const state = normalizeStatus((c as any).state);
  const status = normalizeStatus((c as any).status);
  const s = state || status;
  if (!s) return true;
  return s === "verified" || s === "auto_approved" || s === "active";
}

function pickFirst(obj: Record<string, any>, keys: string[]): unknown {
  for (const key of keys) {
    const v = obj?.[key];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

function pickByIncludes(obj: Record<string, any>, parts: string[]): unknown {
  for (const [key, value] of Object.entries(obj)) {
    const n = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (parts.some((p) => n.includes(p)) && value != null && value !== "") return value;
  }
  return null;
}

function flattenSources(source: Record<string, any> | null | undefined): Record<string, any> {
  if (!source || typeof source !== "object") return {};
  const nestedKeys = ["details", "display", "data", "payload", "document_data", "parsed_data", "metadata", "response"];
  const merged: Record<string, any> = { ...source };
  nestedKeys.forEach((key) => {
    let value = source[key];
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        /* ignore */
      }
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(merged, value as Record<string, any>);
    }
  });
  return merged;
}

function extractKwikOcr(credential: Record<string, any>): Record<string, any> {
  const step =
    credential?.session_data_array?.extras?.session_data?.summary_data?.data?.[0] ??
    credential?.sessionDataArray?.extras?.session_data?.summary_data?.data?.[0] ??
    null;
  const ocr = step?.ocr && typeof step.ocr === "object" ? step.ocr : {};
  const images = step?.images && typeof step.images === "object" ? step.images : {};
  return { ...ocr, ...images };
}

function deepFlatten(value: any, out: Record<string, any> = {}): Record<string, any> {
  if (!value || typeof value !== "object") return out;
  Object.entries(value).forEach(([k, v]) => {
    if (v == null) return;
    if (Array.isArray(v)) {
      v.forEach((item) => {
        if (item && typeof item === "object") deepFlatten(item, out);
      });
      return;
    }
    if (typeof v === "object") {
      deepFlatten(v, out);
      return;
    }
    out[k] = v;
  });
  return out;
}

function mergedIdentityFields(credential: Record<string, any>): Record<string, any> {
  const kwik = extractKwikOcr(credential);
  const merged = { ...flattenSources(credential), ...kwik };
  return deepFlatten(merged);
}

/**
 * Parse common DOB shapes: ISO, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY (ambiguous fallback).
 */
export function parseFlexibleDob(raw: unknown): Date | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const d = parseInt(dmy[1], 10);
    const m = parseInt(dmy[2], 10) - 1;
    const y = parseInt(dmy[3], 10);
    const dt = new Date(y, m, d);
    if (!Number.isNaN(dt.getTime()) && dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) {
      return dt;
    }
  }

  // YYYY-MM-DD
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymd) {
    const y = parseInt(ymd[1], 10);
    const m = parseInt(ymd[2], 10) - 1;
    const d = parseInt(ymd[3], 10);
    const dt = new Date(y, m, d);
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return null;
  const y = dt.getFullYear();
  if (y < 1900 || y > new Date().getFullYear() + 1) return null;
  if (dt.getTime() > Date.now()) return null;
  return dt;
}

function extractDobRaw(credential: Record<string, any>): unknown {
  const flat = mergedIdentityFields(credential);
  const yob =
    pickFirst(flat, ["yearOfBirth", "year_of_birth", "Year of Birth", "birthYear"]) ??
    pickByIncludes(flat, ["yearofbirth", "birthyear"]);
  if (yob != null && yob !== "") {
    const y = parseInt(String(yob).replace(/\D/g, "").slice(0, 4), 10);
    if (!Number.isNaN(y) && y >= 1900 && y <= new Date().getFullYear()) {
      return `01/01/${y}`;
    }
  }
  return (
    pickFirst(flat, [
      "dob",
      "dateOfBirth",
      "Date of Birth",
      "date_of_birth",
      "birth_date",
      "birthDate",
    ]) ?? pickByIncludes(flat, ["dateofbirth", "birthdate", "dob"])
  );
}

function readBooleanAbove18(credential: Record<string, any>): boolean | null {
  const flat = mergedIdentityFields(credential);
  const v =
    pickFirst(flat, ["isAbove18", "is_above_18", "isAbove18Verified", "age_verified"]) ??
    pickByIncludes(flat, ["above18", "ageverified"]);
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "True") return true;
  if (v === "false" || v === "False") return false;
  return null;
}

export type AgeCheckResolution =
  | { outcome: "above18"; source: "dob"; age: number; documentType: string }
  | { outcome: "under18"; source: "dob"; age: number; documentType: string }
  | { outcome: "above18"; source: "boolean"; documentType: string }
  | { outcome: "under18"; source: "boolean"; documentType: string }
  | { outcome: "no_verified_id" }
  | { outcome: "no_dob"; documentType: string };

/**
 * Use DOB from the highest-priority verified credential; fall back to isAbove18-style flags.
 */
export function resolveAgeCheckFromCredentials(credentials: unknown[] | undefined): AgeCheckResolution {
  const list = Array.isArray(credentials) ? credentials : [];
  const candidates = list
    .filter((c): c is Record<string, any> => c != null && typeof c === "object")
    .filter((c) => isCredentialVerifiedForAge(c))
    .filter((c) => !isChildCredential(c.document_type));

  if (candidates.length === 0) {
    return { outcome: "no_verified_id" };
  }

  const sorted = [...candidates].sort(
    (a, b) => docPriorityIndex(a.document_type) - docPriorityIndex(b.document_type)
  );

  for (const c of sorted) {
    const raw = extractDobRaw(c);
    const dob = parseFlexibleDob(raw);
    if (dob) {
      const age = differenceInYears(new Date(), dob);
      const documentType = String(c.document_type || "ID");
      return age >= 18
        ? { outcome: "above18", source: "dob", age, documentType }
        : { outcome: "under18", source: "dob", age, documentType };
    }
  }

  for (const c of sorted) {
    const b = readBooleanAbove18(c);
    if (b === true) {
      return { outcome: "above18", source: "boolean", documentType: String(c.document_type || "ID") };
    }
    if (b === false) {
      return { outcome: "under18", source: "boolean", documentType: String(c.document_type || "ID") };
    }
  }

  const first = sorted[0];
  return { outcome: "no_dob", documentType: String(first?.document_type || "ID") };
}
