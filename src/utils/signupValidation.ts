export interface SignupValidationResult {
  valid: boolean;
  error: string | null;
}

export function validateSignupForm(
  password: string,
  confirmPassword: string
): SignupValidationResult {
  if (password.length < 6) {
    return { valid: false, error: "Password must be at least 6 characters." };
  }
  if (password !== confirmPassword) {
    return { valid: false, error: "Passwords don't match. Please re-enter them." };
  }
  return { valid: true, error: null };
}