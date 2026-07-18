import { useEffect, useMemo, useState } from "react";
import { User } from "firebase/auth";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { Calendar, Eye, FileText, Search, Trash2, X } from "lucide-react";
import { db } from "../firebase";
import { DocumentRecord, EXPENSE_CATEGORIES } from "../types";

export default function History({ user }: { user: User }) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);

      try {
        const q = query(
        collection(db, "documents"),
        where("userId", "==", user.uid)
        );

        const querySnapshot = await getDocs(q);

        const docs = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as DocumentRecord))
        .sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));

        setDocuments(docs);
      } catch (error) {
        console.error("Error fetching document history:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, [user]);

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const min = minTotal === "" ? null : Number(minTotal);
    const max = maxTotal === "" ? null : Number(maxTotal);

    return documents.filter((doc) => {
      const fileName = doc.fileName?.toLowerCase() || "";
      const vendor = doc.data.storeName?.toLowerCase() || "";
      const category = doc.data.category || "Other";
      const total = doc.data.total || 0;

      const matchesSearch =
        !normalizedSearch ||
        fileName.includes(normalizedSearch) ||
        vendor.includes(normalizedSearch);

      const matchesCategory = !categoryFilter || category === categoryFilter;
      const matchesMin = min === null || total >= min;
      const matchesMax = max === null || total <= max;

      return matchesSearch && matchesCategory && matchesMin && matchesMax;
    });
  }, [documents, searchTerm, categoryFilter, minTotal, maxTotal]);

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("");
    setMinTotal("");
    setMaxTotal("");
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;

    setIsDeleting(true);

    try {
      await deleteDoc(doc(db, "documents", documentToDelete.id));

      setDocuments((prev) => prev.filter((document) => document.id !== documentToDelete.id));

      if (selectedDocument?.id === documentToDelete.id) {
        setSelectedDocument(null);
      }

      setDocumentToDelete(null);
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete document. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Document History</h1>
        <p className="text-gray-500 mt-1">
          Browse, search, and filter your processed receipts, invoices, and statements.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by file name or vendor"
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All categories</option>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Clear Filters
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Total ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={minTotal}
              onChange={(e) => setMinTotal(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Total ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxTotal}
              onChange={(e) => setMaxTotal(e.target.value)}
              placeholder="100.00"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-900">
                {filteredDocuments.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-gray-900">
                {documents.length}
              </span>{" "}
              processed documents.
            </p>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Processed Documents</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading document history...</div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No documents match your current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4">File Name</th>
                  <th className="px-6 py-4">Store / Vendor</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-gray-400" />
                        {doc.fileName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {doc.data.storeName || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {doc.data.category || "Other"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {doc.data.date || "Unknown"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      ${doc.data.total?.toFixed(2) || "0.00"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedDocument(doc)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelectedDocument(null)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Document Details</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedDocument.fileName}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDocument(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailCard label="Store / Vendor" value={selectedDocument.data.storeName || "Unknown"} />
                <DetailCard label="Category" value={selectedDocument.data.category || "Other"} />
                <DetailCard label="Transaction Date" value={selectedDocument.data.date || "Unknown"} />
                <DetailCard
                  label="Uploaded"
                  value={
                    selectedDocument.uploadedAt
                      ? new Date(selectedDocument.uploadedAt).toLocaleString()
                      : "Unknown"
                  }
                />
                <DetailCard
                  label="Subtotal"
                  value={`$${selectedDocument.data.subtotal?.toFixed(2) || "0.00"}`}
                />
                <DetailCard
                  label="Tax"
                  value={`$${selectedDocument.data.tax?.toFixed(2) || "0.00"}`}
                />
                <DetailCard
                  label="Total"
                  value={`$${selectedDocument.data.total?.toFixed(2) || "0.00"}`}
                  emphasized
                />
              </div>

              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">
                    Line Items ({selectedDocument.data.items?.length || 0})
                  </h3>
                </div>

                {!selectedDocument.data.items || selectedDocument.data.items.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No line items available.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                          <th className="px-4 py-3">Item</th>
                          <th className="px-4 py-3">Quantity</th>
                          <th className="px-4 py-3">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedDocument.data.items.map((item, index) => (
                          <tr key={item.id || index}>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {item.name || "Unnamed item"}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {item.quantity ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-gray-900 font-medium">
                              ${item.price?.toFixed(2) || "0.00"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setDocumentToDelete(selectedDocument)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-100 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Document
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDocument(null)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {documentToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!isDeleting) {
                setDocumentToDelete(null);
              }
            }}
          />

          <div className="relative bg-white border border-gray-100 shadow-2xl rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Delete document?
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  This will remove the document from your History and Dashboard.
                </p>
                <p className="text-xs text-gray-400 mt-2 break-all">
                  {documentToDelete.fileName}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDocumentToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteDocument}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailCard({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 ${emphasized ? "text-xl font-bold text-gray-900" : "text-sm font-semibold text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}