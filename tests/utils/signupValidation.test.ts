import { describe, it, expect } from "vitest";
import { validateSignupForm } from "../../src/utils/signupValidation";

describe("validateSignupForm", () => {
  it("rejects a password shorter than 6 characters", () => {
    const result = validateSignupForm("abc12", "abc12");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at least 6 characters/i);
  });

  it("rejects mismatched passwords", () => {
    const result = validateSignupForm("password1", "password2");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/don't match/i);
  });

  it("checks length before checking match", () => {
    // Both problems present — short AND mismatched — length error should win
    const result = validateSignupForm("abc", "xyz");
    expect(result.error).toMatch(/at least 6 characters/i);
  });

  it("accepts matching passwords of valid length", () => {
    const result = validateSignupForm("password123", "password123");
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("is case-sensitive when comparing passwords", () => {
    const result = validateSignupForm("Password123", "password123");
    expect(result.valid).toBe(false);
  });
});