import { useState, type FormEvent } from "react";
import { validateSignupForm } from "../utils/signupValidation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  AuthError,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";

function getAuthErrorMessage(error: unknown, mode: "signin" | "signup"): string {
  const code = (error as AuthError)?.code;

  switch (code) {
    case "auth/email-already-in-use":
      return "That email is already registered. Try signing in instead.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Incorrect email or password. Please try again.";
    case "auth/user-not-found":
      return "No account found with that email. Try signing up instead.";
    case "auth/invalid-email":
      return "That email address doesn't look valid.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Can't reach the server. Check your internet connection and try again.";
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled.";
    default:
      return mode === "signup"
        ? "Could not create your account. Please try again."
        : "Something went wrong signing in. Please try again.";
  }
}

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === "signup";

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
      navigate("/");
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setError(getAuthErrorMessage(error, "signin"));
    }
  };

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (isSignUp) {
      const validation = validateSignupForm(password, confirmPassword);
      if (!validation.valid) {
        setError(validation.error);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: username.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      navigate("/");
    } catch (error) {
      console.error("Error signing in with email and password:", error);
      setError(getAuthErrorMessage(error, mode));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl shadow-gray-200/50">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <FileText className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2 text-center">Welcome to DocuGrid</h1>
        <p className="text-gray-500 mb-8 text-center">
          Automate expense categorization and data extraction with intelligent OCR.
        </p>

        <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setConfirmPassword("");
            }}
            className={`py-2 rounded-lg text-sm font-medium transition-all ${
              !isSignUp ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`py-2 rounded-lg text-sm font-medium transition-all ${
              isSignUp ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignUp && (
            <div className="text-left">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="Your name"
                required={isSignUp}
              />
            </div>
          )}

          <div className="text-left">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="text-left">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </div>

          {isSignUp && (
            <div className="text-left">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="Re-enter your password"
                minLength={6}
                required={isSignUp}
              />
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            id="submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-sm active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-medium uppercase text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}