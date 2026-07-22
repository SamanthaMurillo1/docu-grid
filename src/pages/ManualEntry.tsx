import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ArrowRight, Tag } from "lucide-react";
import { EXPENSE_CATEGORIES, ExpenseCategory, ExtractedData } from "../types";

export default function ManualEntry() {
  const navigate = useNavigate();

  const [manualForm, setManualForm] = useState<{
    merchantName: string;
    date: string;
    category: ExpenseCategory;
    tax: string;
    total: string;
    lineItems: Array<{ id: string; name: string; price: string }>;
  }>({
    merchantName: "",
    date: new Date().toISOString().split("T")[0],
    category: "Other",
    tax: "",
    total: "",
    lineItems: [{ id: "1", name: "", price: "" }],
  });

  const handleAddLineItem = () => {
    setManualForm((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { id: String(Date.now()), name: "", price: "" },
      ],
    }));
  };

  const handleRemoveLineItem = (index: number) => {
    setManualForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  const handleLineItemChange = (
    index: number,
    field: "name" | "price",
    value: string
  ) => {
    setManualForm((prev) => {
      const updated = [...prev.lineItems];
      updated[index][field] = value;
      return { ...prev, lineItems: updated };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedTotal = parseFloat(manualForm.total) || 0;
    const parsedTax = parseFloat(manualForm.tax) || 0;

    const extractedData: ExtractedData = {
      storeName: manualForm.merchantName || null,
      date: manualForm.date || null,
      category: manualForm.category,
      subtotal: parsedTotal - parsedTax,
      tax: parsedTax,
      total: parsedTotal,
      items: manualForm.lineItems
        .filter((item) => item.name.trim() !== "")
        .map((item, idx) => ({
          id: item.id || String(idx),
          name: item.name,
          quantity: 1,
          price: parseFloat(item.price) || 0,
        })),
    };

    const manualResult = {
      fileName: manualForm.merchantName
        ? `Manual - ${manualForm.merchantName}`
        : "Manual Entry",
      extractedData,
    };

    navigate("/batch-review", {
      state: { results: [manualResult] },
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Manual Entry
        </h1>
        <p className="text-gray-500 mt-1">
          Input your transaction details manually to process new receipts or invoice documents.
        </p>
      </div>

      {/* Manual Form Container */}
      <form
        onSubmit={handleSubmit}
        className="form-card rounded-2xl border p-6 space-y-6 shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Store / Vendor Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Footlocker, Tim Hortons, etc."
              value={manualForm.merchantName}
              onChange={(e) =>
                setManualForm({ ...manualForm, merchantName: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={manualForm.date}
              onChange={(e) =>
                setManualForm({ ...manualForm, date: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 opacity-60" />
              Category
            </label>
            <select
              value={manualForm.category}
              onChange={(e) =>
                setManualForm({
                  ...manualForm,
                  category: e.target.value as ExpenseCategory,
                })
              }
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-colors"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Tax ($)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={manualForm.tax}
                onChange={(e) =>
                  setManualForm({ ...manualForm, tax: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Total ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={manualForm.total}
                onChange={(e) =>
                  setManualForm({ ...manualForm, total: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Line Item(s)
            </h3>
            <button
              type="button"
              onClick={handleAddLineItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 dark-add-btn rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-medium text-gray-500 px-1">
            <span className="flex-1">Item Description</span>
            <span className="w-36">Price ($)</span>
            {manualForm.lineItems.length > 1 && <span className="w-8"></span>}
          </div>

          {manualForm.lineItems.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-3">
              <input
                type="text"
                placeholder="e.g. Shoes, Coffee, etc."
                value={item.name}
                onChange={(e) =>
                  handleLineItemChange(idx, "name", e.target.value)
                }
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-colors"
              />

              <div className="relative w-36">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={item.price}
                  onChange={(e) =>
                    handleLineItemChange(idx, "price", e.target.value)
                  }
                  className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-colors"
                />
              </div>

              {manualForm.lineItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveLineItem(idx)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-70"
          >
            Review & Confirm <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}