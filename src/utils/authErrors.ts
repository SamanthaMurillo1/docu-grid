import { AuthError } from "firebase/auth";

export function getAuthErrorMessage(error: unknown, mode: "signin" | "signup"): string {
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