import { useEffect, useState, type FormEvent } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { IncomeRecord, INCOME_CATEGORIES, IncomeCategory } from "../types";
import { PlusCircle, Trash2, Wallet, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function Income() {
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [source, setSource] = useState("");
  const [category, setCategory] = useState<IncomeCategory>("Salary");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  const userId = auth.currentUser?.uid;

  async function fetchRecords() {
    if (!userId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "income"),
        where("userId", "==", userId),
        orderBy("date", "desc")
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as IncomeRecord));
      setRecords(docs);
    } catch (err) {
      console.error("Error fetching income records:", err);
      setError("Could not load income records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const parsedAmount = parseFloat(amount);
    if (!source.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a source and a valid positive amount.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, "income"), {
        userId,
        source: source.trim(),
        category,
        amount: parsedAmount,
        date,
        notes: notes.trim() || null,
        createdAt: Date.now(),
      });

      setSource("");
      setAmount("");
      setNotes("");
      setCategory("Salary");
      setDate(format(new Date(), "yyyy-MM-dd"));

      await fetchRecords();
    } catch (err) {
      console.error("Error saving income record:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this income record?")) return;
    try {
      await deleteDoc(doc(db, "income", id));
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error("Error deleting income record:", err);
      alert("Failed to delete. Please try again.");
    }
  };

  const totalIncome = records.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Income & Savings</h1>
        <p className="text-gray-500 mt-1">
          Log income sources and savings contributions to track your net cash flow.
        </p>
      </div>

      {/* Add form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-6">
          <Wallet className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Add Income</h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Employer, Client name"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IncomeCategory)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {INCOME_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional detail"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {error && (
            <div className="md:col-span-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              Add Income Record
            </button>
          </div>
        </form>
      </div>

      {/* Records table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Income History</h2>
          <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full">
            Total: ${totalIncome.toFixed(2)}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No income records yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{r.source}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        {r.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{r.date}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">${r.amount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        aria-label="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}