import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { DocumentRecord } from "../types";
import { FileText, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Dashboard({ user }: { user: User }) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const q = query(
          collection(db, "documents"),
          where("userId", "==", user.uid),
          orderBy("uploadedAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentRecord));
        setDocuments(docs);
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, [user]);

  const totalSpent = documents.reduce((sum, doc) => sum + (doc.data.total || 0), 0);
  
  // Group by date for chart
  const chartData = documents
    .map(doc => ({
      date: doc.data.date || format(doc.uploadedAt, 'yyyy-MM-dd'),
      amount: doc.data.total || 0
    }))
    .reduce((acc, curr) => {
      const existing = acc.find(item => item.date === curr.date);
      if (existing) {
        existing.amount += curr.amount;
      } else {
        acc.push({ ...curr });
      }
      return acc;
    }, [] as { date: string, amount: number }[])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your processed documents and expenses.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Cash Flow Trends</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#4f46e5', fontWeight: 600 }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                />
                <Area type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
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
