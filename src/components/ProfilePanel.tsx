import { useEffect, useState } from "react";
import { User, updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { db } from "../firebase";
import { X, Loader2, Check } from "lucide-react";
import { format } from "date-fns";

interface ProfilePanelProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate: () => void;
}

export default function ProfilePanel({ user, isOpen, onClose, onUserUpdate }: ProfilePanelProps) {
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [docCount, setDocCount] = useState<number | null>(null);
  const [incomeCount, setIncomeCount] = useState<number | null>(null);

  const hasPasswordProvider = user.providerData.some(p => p.providerId === "password");

  useEffect(() => {
    if (!isOpen) return;

    setDisplayName(user.displayName || "");
    setNameSaved(false);
    setPasswordSuccess(false);
    setPasswordError(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");

    async function fetchStats() {
      try {
        const docsSnap = await getCountFromServer(
          query(collection(db, "documents"), where("userId", "==", user.uid))
        );
        setDocCount(docsSnap.data().count);

        const incomeSnap = await getCountFromServer(
          query(collection(db, "income"), where("userId", "==", user.uid))
        );
        setIncomeCount(incomeSnap.data().count);
      } catch (err) {
        console.error("Error fetching profile stats:", err);
      }
    }

    fetchStats();
  }, [isOpen, user]);

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setIsSavingName(true);
    setNameSaved(false);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      onUserUpdate();
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch (err) {
      console.error("Error updating display name:", err);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      console.error("Error changing password:", err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setPasswordError("Current password is incorrect.");
      } else {
        setPasswordError("Could not change password. Please try again.");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">Your Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Avatar (read-only display) */}
          <div className="flex flex-col items-center gap-3">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-2xl font-medium">
                {user.displayName?.charAt(0) || user.email?.charAt(0)}
              </div>
            )}
            {!user.photoURL && (
              <p className="text-xs text-gray-400">
                Sign in with Google to show a profile photo here.
              </p>
            )}
          </div>

          {/* Display name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                onClick={handleSaveName}
                disabled={isSavingName || !displayName.trim() || displayName === user.displayName}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : nameSaved ? <Check className="w-4 h-4" /> : "Save"}
              </button>
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">{user.email}</p>
          </div>

          {/* Account stats */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Account Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{docCount ?? "—"}</p>
                <p className="text-xs text-gray-500 mt-1">Documents Processed</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{incomeCount ?? "—"}</p>
                <p className="text-xs text-gray-500 mt-1">Income Records</p>
              </div>
            </div>
            {user.metadata.creationTime && (
              <p className="text-xs text-gray-500 mt-3">
                Member since {format(new Date(user.metadata.creationTime), "MMMM d, yyyy")}
              </p>
            )}
          </div>

          {/* Change password */}
          {hasPasswordProvider ? (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Change Password</h3>
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  minLength={6}
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  minLength={6}
                />

                {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
                {passwordSuccess && <p className="text-sm text-green-600">Password updated successfully.</p>}

                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                  className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isChangingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Password
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
              You signed in with Google, so there's no password to change here.
            </p>
          )}
        </div>
      </div>
    </>
  );
}