import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ExtractedData } from "../types";
import { ArrowRight, FileText, CheckCircle2 } from "lucide-react";

export default function Review() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { extractedData: ExtractedData; fileName: string } | null;

  const [data, setData] = useState<ExtractedData>(
    state?.extractedData || { storeName: "", date: "", subtotal: 0, tax: 0, total: 0, items: [] }
  );

  if (!state) {
    return (
      <div className="p-8 text-center text-gray-500">
        No document data available. Please upload a document first.
      </div>
    );
  }

  const handleInputChange = (field: keyof ExtractedData, value: string | number) => {
    setData({ ...data, [field]: value });
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...data.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setData({ ...data, items: newItems });
  };

  const handleConfirm = () => {
    navigate("/mapping", { 
      state: { 
        extractedData: data, 
        fileName: state.fileName 
      } 
    });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Review Extraction</h1>
          <p className="text-gray-500 mt-1">Review and correct the OCR extracted data before mapping.</p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium text-sm">
          <FileText className="w-4 h-4" />
          {state.fileName}
        </div>
      </div>

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
                value={data.storeName || ""}
                onChange={(e) => handleInputChange("storeName", e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Date</label>
              <input
                type="text"
                value={data.date || ""}
                onChange={(e) => handleInputChange("date", e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
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
                value={data.subtotal || ""}
                onChange={(e) => handleInputChange("subtotal", parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax ($)</label>
              <input
                type="number"
                step="0.01"
                value={data.tax || ""}
                onChange={(e) => handleInputChange("tax", parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total ($)</label>
              <input
                type="number"
                step="0.01"
                value={data.total || ""}
                onChange={(e) => handleInputChange("total", parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-indigo-50/50 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-indigo-900 font-semibold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Line Items ({data.items?.length || 0})</h2>
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
              {data.items?.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-3">
                    <input
                      type="text"
                      value={item.name || ""}
                      onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                      className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded outline-none"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      value={item.quantity || ""}
                      onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value))}
                      className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded outline-none"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={item.price || ""}
                      onChange={(e) => handleItemChange(idx, "price", parseFloat(e.target.value))}
                      className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded outline-none"
                    />
                  </td>
                </tr>
              ))}
              {(!data.items || data.items.length === 0) && (
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

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 p-4 flex justify-between items-center z-10 px-8">
        <p className="text-sm text-gray-500">Ensure all fields are accurate before proceeding.</p>
        <button
          onClick={handleConfirm}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Confirm & Proceed to Mapping
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
