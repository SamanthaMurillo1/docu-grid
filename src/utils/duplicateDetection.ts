import { DocumentRecord } from "../types";

export interface DuplicateCandidate {
  storeName: string | null;
  date: string | null;
  total: number | null;
}

// Guards against floating point rounding (e.g. 45.90000000000001) — this is
// still an exact-match check on vendor + date + total, not fuzzy matching.
const TOTAL_EPSILON = 0.01;

function normalizeVendor(name: string | null | undefined): string {
  return (name || "").trim().toLowerCase();
}

function normalizeDate(date: string | null | undefined): string {
  return (date || "").trim();
}

/**
 * Returns the first existing document that exactly matches the candidate's
 * vendor name (case/whitespace-insensitive), date, and total (within a tiny
 * float tolerance), or null if no match is found.
 *
 * Pass `excludeId` when checking a document that may already be in
 * `existingDocuments` itself (e.g. re-checking after an edit) to avoid it
 * matching against itself.
 */
export function findDuplicateDocument(
  existingDocuments: DocumentRecord[],
  candidate: DuplicateCandidate,
  excludeId?: string
): DocumentRecord | null {
  const vendor = normalizeVendor(candidate.storeName);
  const date = normalizeDate(candidate.date);
  const total = candidate.total;

  // Without all three fields present, we don't have enough to call it a
  // confident match — better to miss a duplicate than false-flag a good doc.
  if (!vendor || !date || total === null || total === undefined) {
    return null;
  }

  for (const doc of existingDocuments) {
    if (excludeId && doc.id === excludeId) continue;

    const sameVendor = normalizeVendor(doc.data.storeName) === vendor;
    const sameDate = normalizeDate(doc.data.date) === date;
    const docTotal = doc.data.total;
    const sameTotal =
      docTotal !== null && docTotal !== undefined && Math.abs(docTotal - total) < TOTAL_EPSILON;

    if (sameVendor && sameDate && sameTotal) {
      return doc;
    }
  }

  return null;
}
