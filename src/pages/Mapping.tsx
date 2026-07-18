import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ExtractedData, MappedField } from "../types";
import { Save, Download, ArrowLeft, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { addDoc, collection } from "firebase/firestore";
import { db, auth } from "../firebase";
import { buildExportRows } from "../utils/buildExportRows";

const AVAILABLE_COLUMNS = [
  "Date",
  "Vendor",
  "Subtotal",
  "Tax Amount",
  "Total Cost",
  "Category",
  "Notes"
];

export default function Mapping() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { extractedData: ExtractedData; fileName: string } | null;

  const [mappings, setMappings] = useState<MappedField[]>([
    { extractedKey: "storeName", excelColumn: "Vendor" },
    { extractedKey: "date", excelColumn: "Date" },
    { extractedKey: "category", excelColumn: "Category" }, 
    { extractedKey: "subtotal", excelColumn: "Subtotal" },
    { extractedKey: "tax", excelColumn: "Tax Amount" },
    { extractedKey: "total", excelColumn: "Total Cost" },
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  if (!state) {
    return (
      <div className="p-8 text-center text-gray-500">
        No document data available. Please upload and review a document first.
      </div>
    );
  }

  const handleMappingChange = (extractedKey: string, newExcelColumn: string) => {
    setMappings(prev => 
      prev.map(m => m.extractedKey === extractedKey ? { ...m, excelColumn: newExcelColumn } : m)
    );
  };

  const handleExportAndSave = async () => {
    if (!auth.currentUser) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const rowsToExport = buildExportRows(state.extractedData, mappings);

      const worksheet = XLSX.utils.json_to_sheet(rowsToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

      await addDoc(collection(db, "documents"), {
        userId: auth.currentUser.uid,
        fileName: state.fileName,
        uploadedAt: Date.now(),
        data: state.extractedData,
        mappings: mappings,
      });

      XLSX.writeFile(workbook, `DocuGrid_${state.fileName.split(".")[0] || "export"}.xlsx`);

      setSaveMessage("Document saved and spreadsheet exported successfully.");
    } catch (error) {
      console.error("Error saving document:", error);
      alert("Failed to save data. Please try again.");
    } finally {
      setIsSaving(false);
    }
};

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Map to Excel Columns</h1>
        <p className="text-gray-500 mt-1">Map the extracted fields to your desired spreadsheet columns.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-100 font-medium text-sm text-gray-500">
          <div className="p-4 px-6">Extracted Field</div>
          <div className="p-4 px-6 border-l border-gray-100">Target Excel Column</div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {mappings.map((mapping, idx) => (
            <div key={idx} className="grid grid-cols-2 items-center hover:bg-gray-50/30 transition-colors">
              <div className="p-4 px-6">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                  {mapping.extractedKey}
                </span>
                <span className="ml-3 text-sm text-gray-600">
                  {String((state.extractedData as any)[mapping.extractedKey] || "N/A")}
                </span>
              </div>
              <div className="p-4 px-6 border-l border-gray-100">
                <select
                  value={mapping.excelColumn}
                  onChange={(e) => handleMappingChange(mapping.extractedKey, e.target.value)}
                  className="w-full text-sm bg-white border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="">-- Do not export --</option>
                  {AVAILABLE_COLUMNS.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                  {/* Allow custom columns if needed, simplified for now */}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {saveMessage && (
        <div className="fixed bottom-20 left-64 right-0 px-8 z-10">
          <div className="bg-green-50 border border-green-100 text-green-700 rounded-xl px-4 py-3 text-sm max-w-4xl mx-auto">
            {saveMessage}
          </div>
        </div>
      )}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 p-4 flex justify-between items-center z-10 px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-4 py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Review
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={handleExportAndSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving & Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Save & Export Spreadsheet
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
