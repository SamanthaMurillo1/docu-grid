import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Loader2, Tag, AlertTriangle } from "lucide-react";
import { db, auth } from "../firebase";
import { ExtractedData, EXPENSE_CATEGORIES, MappedField, DocumentRecord } from "../types";
import { buildExportRows } from "../utils/buildExportRows";
import { findDuplicateDocument } from "../utils/duplicateDetection";
import { BatchResult } from "./Upload";

// Same default field-to-column mapping Mapping.tsx starts users off with.
// Batch mode saves time by applying it to every document at once.
const DEFAULT_MAPPINGS: MappedField[] = [
  { extractedKey: "storeName", excelColumn: "Vendor" },
  { extractedKey: "date", excelColumn: "Date" },
  { extractedKey: "category", excelColumn: "Category" },
  { extractedKey: "subtotal", excelColumn: "Subtotal" },
  { extractedKey: "tax", excelColumn: "Tax Amount" },
  { extractedKey: "total", excelColumn: "Total Cost" },
];

export default function BatchReview() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { results: BatchResult[] } | null;

  const failedResults = (state?.results || []).filter((r) => !r.extractedData);
  const initialDocuments = (state?.results || [])
    .filter((r): r is BatchResult & { extractedData: ExtractedData } => !!r.extractedData)
    .map((r) => ({ fileName: r.fileName, data: r.extractedData }));

  const [documents, setDocuments] = useState(initialDocuments);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Loaded once so each document in the batch can be checked against what's
  // already saved (same vendor, date, and total as an existing document).
  const [existingDocuments, setExistingDocuments] = useState<DocumentRecord[]>([]);

  useEffect(() => {
    async function fetchExisting() {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, "documents"),
          where("userId", "==", auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);
        setExistingDocuments(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DocumentRecord)));
      } catch (err) {
        console.error("Error checking for duplicate documents:", err);
      }
    }
    fetchExisting();
  }, []);

  // Also treat other documents already queued in this same batch as
  // potential duplicates (e.g. two copies of the same receipt uploaded
  // together), not just what's already saved to Firestore.
  const siblingDocuments: DocumentRecord[] = documents
    .map((doc, idx) =>
      idx === activeIndex
        ? null
        : ({ id: `batch-${idx}`, userId: "", fileName: doc.fileName, uploadedAt: 0, data: doc.data } as DocumentRecord)
    )
    .filter((d): d is DocumentRecord => d !== null);

  const active = documents[activeIndex];

  const duplicateMatch = useMemo(() => {
    if (!active) return null;
    return findDuplicateDocument([...existingDocuments, ...siblingDocuments], {
      storeName: active.data.storeName,
      date: active.data.date,
      total: active.data.total,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingDocuments, documents, activeIndex]);

  if (!state) {
    return (
      <div className="p-8 text-center text-gray-500">
        No batch upload data available. Please upload documents first.
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Batch Review</h1>
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-6">
          <p className="font-medium">None of the uploaded documents could be processed.</p>
          <ul className="mt-3 text-sm space-y-1 list-disc list-inside">
            {failedResults.map((r, i) => (
              <li key={i}>{r.fileName} — {r.error}</li>
            ))}
          </ul>
        </div>
        <button
          onClick={() => navigate("/upload")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Upload
        </button>
      </div>
    );
  }

  const isLast = activeIndex === documents.length - 1;

  const updateActiveDoc = (field: keyof ExtractedData, value: string | number) => {
    setDocuments((prev) =>
      prev.map((doc, i) => (i === activeIndex ? { ...doc, data: { ...doc.data, [field]: value } } : doc))
    );
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setDocuments((prev) =>
      prev.map((doc, i) => {
        if (i !== activeIndex) return doc;
        const newItems = [...doc.data.items];
        newItems[index] = { ...newItems[index], [field]: value };
        return { ...doc, data: { ...doc.data, items: newItems } };
      })
    );
  };

  const handleDiscardActive = () => {
    if (documents.length <= 1) {
      navigate("/upload");
      return;
    }
    setDocuments((prev) => prev.filter((_, i) => i !== activeIndex));
    setActiveIndex((i) => Math.min(i, documents.length - 2));
  };

  const handleSaveAll = async () => {
    if (!auth.currentUser) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const allRows: Record<string, any>[] = [];

      for (const doc of documents) {
        allRows.push(...buildExportRows(doc.data, DEFAULT_MAPPINGS));

        await addDoc(collection(db, "documents"), {
          userId: auth.currentUser.uid,
          fileName: doc.fileName,
          uploadedAt: Date.now(),
          data: doc.data,
          mappings: DEFAULT_MAPPINGS,
        });
      }

      const worksheet = XLSX.utils.json_to_sheet(allRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
      XLSX.writeFile(workbook, `DocuGrid_Batch_${documents.length}_Documents.xlsx`);

      navigate("/history");
    } catch (err) {
      console.error("Error saving batch:", err);
      setSaveError("Failed to save one or more documents. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Batch Review</h1>
          <p className="text-gray-500 mt-1">
            Review and correct each document, then save everything and export one spreadsheet.
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium text-sm">
          <FileText className="w-4 h-4" />
          {active.fileName}
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {documents.map((doc, idx) => (
          <button
            key={`${doc.fileName}-${idx}`}
            onClick={() => setActiveIndex(idx)}
            title={doc.fileName}
            className={`h-2 rounded-full transition-all ${
              idx === activeIndex ? "w-8 bg-indigo-600" : "w-2 bg-gray-200 hover:bg-gray-300"
            }`}
          />
        ))}
        <span className="ml-3 text-sm text-gray-500">
          Document {activeIndex + 1} of {documents.length}
        </span>
      </div>

      {duplicateMatch && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">This document looks like a duplicate.</p>
            <p className="mt-0.5">
              {duplicateMatch.userId
                ? `You already have "${duplicateMatch.fileName}" saved`
                : `"${duplicateMatch.fileName}" earlier in this batch has`}{" "}
              the same vendor, date, and total (${duplicateMatch.data.total?.toFixed(2)}). Adjust the
              date, vendor, or total below if this is actually a different receipt.
            </p>
          </div>
        </div>
      )}

      {failedResults.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">{failedResults.length} document{failedResults.length !== 1 ? "s" : ""} couldn't be processed and won't be saved:</p>
            <p className="mt-1">{failedResults.map((r) => r.fileName).join(", ")}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Header Fields */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900">Header Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store / Vendor Name</label>
              <input
                type="text"
                value={active.data.storeName || ""}
                onChange={(e) => updateActiveDoc("storeName", e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Date</label>
              <input
                type="text"
                value={active.data.date || ""}
                onChange={(e) => updateActiveDoc("date", e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                Category
              </label>
              <select
                value={active.data.category || ""}
                onChange={(e) => updateActiveDoc("category", e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              >
                <option value="">-- Select category --</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900">Totals</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal ($)</label>
              <input
                type="number"
                step="0.01"
                value={active.data.subtotal ?? ""}
                onChange={(e) => updateActiveDoc("subtotal", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax ($)</label>
              <input
                type="number"
                step="0.01"
                value={active.data.tax ?? ""}
                onChange={(e) => updateActiveDoc("tax", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total ($)</label>
              <input
                type="number"
                step="0.01"
                value={active.data.total ?? ""}
                onChange={(e) => updateActiveDoc("total", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold ${
                  duplicateMatch
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-indigo-50/50 border-indigo-100 text-indigo-900"
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Line Items ({active.data.items?.length || 0})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Item Name</th>
                <th className="px-6 py-4 w-32">Quantity</th>
                <th className="px-6 py-4 w-40">Price ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {active.data.items?.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-3">
                    <input
                      type="text"
                      value={item.name || ""}
                      onChange={(e) => updateItem(idx, "name", e.target.value)}
                      className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded outline-none"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      value={item.quantity ?? ""}
                      onChange={(e) => updateItem(idx, "quantity", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                      className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded outline-none"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={item.price ?? ""}
                      onChange={(e) => updateItem(idx, "price", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                      className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded outline-none"
                    />
                  </td>
                </tr>
              ))}
              {(!active.data.items || active.data.items.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No line items extracted.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {saveError && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm">
          {saveError}
        </div>
      )}

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 p-4 flex justify-between items-center z-10 px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            disabled={activeIndex === 0}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          {duplicateMatch && (
            <button
              onClick={handleDiscardActive}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Discard This Document
            </button>
          )}
        </div>

        {isLast ? (
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving & Exporting...
              </>
            ) : (
              `Save All ${documents.length} & Export Spreadsheet`
            )}
          </button>
        ) : (
          <button
            onClick={() => setActiveIndex((i) => Math.min(documents.length - 1, i + 1))}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
