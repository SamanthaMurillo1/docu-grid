/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Review from "./pages/Review";
import Mapping from "./pages/Mapping";
import Layout from "./components/Layout";
import Income from "./pages/Income";
import History from "./pages/History";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Forces a fresh user object so Layout/ProfilePanel re-render after
  // updateProfile() changes (display name, photo, etc.)
  const refreshUser = () => {
    if (auth.currentUser) {
      setUser({ ...auth.currentUser } as User);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />

        <Route path="/" element={user ? <Layout user={user} onUserUpdate={refreshUser} /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard user={user!} />} />
          <Route path="upload" element={<Upload />} />
          <Route path="review" element={<Review />} />
          <Route path="mapping" element={<Mapping />} />
          <Route path="income" element={<Income />} />
          <Route path="history" element={<History user={user!} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}