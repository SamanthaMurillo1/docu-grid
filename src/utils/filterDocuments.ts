import { DocumentRecord } from "../types";

export interface DocumentFilters {
  searchTerm?: string;
  category?: string;
  minTotal?: string;
  maxTotal?: string;
}

/**
 * Filters documents for the Dashboard's Recent Documents table (and shares
 * the same filter shape as History's filter bar): matches the search term
 * against file name or vendor, an exact category match, and an inclusive
 * min/max total range. Blank/undefined filter values are treated as "no
 * constraint" rather than excluding everything.
 */
export function filterDocuments(
  documents: DocumentRecord[],
  filters: DocumentFilters
): DocumentRecord[] {
  const term = (filters.searchTerm || "").trim().toLowerCase();
  const category = filters.category || "";

  const min = filters.minTotal ? parseFloat(filters.minTotal) : null;
  const max = filters.maxTotal ? parseFloat(filters.maxTotal) : null;

  return documents.filter((doc) => {
    const matchesSearch =
      !term ||
      doc.fileName.toLowerCase().includes(term) ||
      (doc.data.storeName || "").toLowerCase().includes(term);

    const matchesCategory = !category || doc.data.category === category;

    const total = doc.data.total || 0;
    const matchesMin = min === null || isNaN(min) || total >= min;
    const matchesMax = max === null || isNaN(max) || total <= max;

    return matchesSearch && matchesCategory && matchesMin && matchesMax;
  });
}
