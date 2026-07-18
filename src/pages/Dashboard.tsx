import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { DocumentRecord, IncomeRecord } from "../types";
import { aggregateByPeriod, Granularity } from "../utils/reportAggregation";
import { FileText, TrendingUp, DollarSign, Calendar, Wallet } from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#84cc16",
  "#06b6d4",
  "#f97316",
];

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function Dashboard({ user }: { user: User }) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [income, setIncome] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [granularity, setGranularity] = useState<Granularity>("daily");

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const q = query(
          collection(db, "documents"),
          where("userId", "==", user.uid)
        );

        const querySnapshot = await getDocs(q);

        const docs = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as DocumentRecord))
          .sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));

        setDocuments(docs);
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
      }
    }

    async function fetchIncome() {
      try {
        const q = query(
          collection(db, "income"),
          where("userId", "==", user.uid)
        );

        const querySnapshot = await getDocs(q);

        const records = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as IncomeRecord))
          .sort((a, b) => b.date.localeCompare(a.date));

        setIncome(records);
      } catch (error) {
        console.error("Error fetching income:", error);
      }
    }

    fetchDocuments();
    fetchIncome();
  }, [user]);

  const totalSpent = documents.reduce((sum, doc) => sum + (doc.data.total || 0), 0);
  const totalIncome = income.reduce((sum, r) => sum + (r.amount || 0), 0);
  const netCashFlow = totalIncome - totalSpent;

  // Period aggregation (daily/weekly/monthly), capped to the most recent 12 buckets
  const periodData = aggregateByPeriod(documents, income, granularity).slice(-12);

  // Group by category for the spending breakdown chart
  const categoryData = documents
    .reduce((acc, doc) => {
      const cat = doc.data.category || "Other";
      const existing = acc.find(item => item.name === cat);
      if (existing) {
        existing.value += doc.data.total || 0;
      } else {
        acc.push({ name: cat, value: doc.data.total || 0 });
      }
      return acc;
    }, [] as { name: string, value: number }[])
    .sort((a, b) => b.value - a.value);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your processed documents and expenses.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Documents Processed</p>
            <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-900">${totalSpent.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Avg. Per Document</p>
            <p className="text-2xl font-bold text-gray-900">
              ${documents.length ? (totalSpent / documents.length).toFixed(2) : "0.00"}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            netCashFlow >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
          }`}>
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Net (Income − Expenses)</p>
            <p className={`text-2xl font-bold ${netCashFlow >= 0 ? "text-green-700" : "text-red-700"}`}>
              {netCashFlow >= 0 ? "+" : "-"}${Math.abs(netCashFlow).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      {(periodData.length > 0 || categoryData.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {periodData.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Income vs. Expenses</h2>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  {GRANULARITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setGranularity(opt.value)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        granularity === opt.value
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={periodData}>
                    <XAxis dataKey="label" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name === "income" ? "Income" : "Expenses"]}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} name="Income" />
                    <Bar dataKey="expense" fill="#ef4444" radius={[6, 6, 0, 0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {categoryData.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Spending by Category</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => `$${value.toFixed(2)}`}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Period Summary Table */}
      {periodData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              {GRANULARITY_OPTIONS.find(o => o.value === granularity)?.label} Summary
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4">Income</th>
                  <th className="px-6 py-4">Expenses</th>
                  <th className="px-6 py-4">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...periodData].reverse().map((p) => (
                  <tr key={p.periodKey} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{p.label}</td>
                    <td className="px-6 py-4 text-green-700">${p.income.toFixed(2)}</td>
                    <td className="px-6 py-4 text-red-700">${p.expense.toFixed(2)}</td>
                    <td className={`px-6 py-4 font-medium ${p.net >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {p.net >= 0 ? "+" : "-"}${Math.abs(p.net).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Documents */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Documents</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No documents processed yet. Upload a receipt or invoice to get started.
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.slice(0, 10).map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400" />
                      {doc.fileName}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{doc.data.storeName || "Unknown"}</td>
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