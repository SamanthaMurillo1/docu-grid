import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { User, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { LayoutDashboard, FileUp, Wallet, LogOut, Moon, Sun, History, Edit3 } from "lucide-react";
import ProfilePanel from "./ProfilePanel";

const APP_THEME_KEY = "docugrid-app-theme";

export default function Layout({ user, onUserUpdate }: { user: User; onUserUpdate: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem(APP_THEME_KEY) === "dark";
  });

  useEffect(() => {
    localStorage.setItem(APP_THEME_KEY, isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/", icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: "Upload Document", path: "/upload", icon: <FileUp className="w-5 h-5" /> },
    { name: "Manual Entry", path: "/manual-entry", icon: <Edit3 className="w-5 h-5" /> },
    { name: "Income & Savings", path: "/income", icon: <Wallet className="w-5 h-5" /> },
    { name: "History", path: "/history", icon: <History className="w-5 h-5" /> },
  ];

  return (
    <div className={`flex h-screen bg-gray-50 text-gray-900 font-sans ${isDarkMode ? "theme-dark" : ""}`}>
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold font-mono">DG</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">DocuGrid</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-3 px-3 py-3 rounded-lg mb-2 bg-gray-50 hover:bg-gray-100 transition-colors w-full text-left"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium">
                {user.displayName?.charAt(0) || user.email?.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.displayName || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </button>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        {/* App-wide Theme Button */}
        <div className="absolute top-6 right-7 z-30">
          <button
            type="button"
            onClick={() => setThemeMenuOpen((open) => !open)}
            className="theme-button flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            Theme
          </button>

          {themeMenuOpen && (
            <div className="theme-menu absolute right-0 mt-2 w-40 rounded-xl border p-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setIsDarkMode(false);
                  setThemeMenuOpen(false);
                }}
                className={`theme-menu-item w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  !isDarkMode ? "theme-menu-item-active" : ""
                }`}
              >
                Light Mode
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDarkMode(true);
                  setThemeMenuOpen(false);
                }}
                className={`theme-menu-item w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  isDarkMode ? "theme-menu-item-active" : ""
                }`}
              >
                Dark Mode
              </button>
            </div>
          )}
        </div>

        <Outlet />
      </main>



      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowLogoutConfirm(false)}
          />

          <div className="relative bg-white border border-gray-100 shadow-2xl rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                <LogOut className="w-5 h-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Log out?
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Are you sure you want to log out of DocuGrid?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}


      <ProfilePanel
        user={user}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onUserUpdate={onUserUpdate}
      />
    </div>
  );
}