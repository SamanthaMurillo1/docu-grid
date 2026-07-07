import { describe, it, expect } from "vitest";
import { getAuthErrorMessage } from "../../src/utils/authErrors.ts";

describe("getAuthErrorMessage", () => {
  it("gives a clear message for an already-registered email", () => {
    const msg = getAuthErrorMessage({ code: "auth/email-already-in-use" }, "signup");
    expect(msg).toMatch(/already registered/i);
  });

  it("gives a clear message for wrong password", () => {
    const msg = getAuthErrorMessage({ code: "auth/wrong-password" }, "signin");
    expect(msg).toMatch(/incorrect/i);
  });

  it("gives a clear message for invalid credential (modern Firebase code)", () => {
    const msg = getAuthErrorMessage({ code: "auth/invalid-credential" }, "signin");
    expect(msg).toMatch(/incorrect/i);
  });

  it("gives a clear message when no account exists for that email", () => {
    const msg = getAuthErrorMessage({ code: "auth/user-not-found" }, "signin");
    expect(msg).toMatch(/no account found/i);
  });

  it("gives a clear message for an invalid email format", () => {
    const msg = getAuthErrorMessage({ code: "auth/invalid-email" }, "signup");
    expect(msg).toMatch(/doesn't look valid/i);
  });

  it("gives a clear message for a weak password", () => {
    const msg = getAuthErrorMessage({ code: "auth/weak-password" }, "signup");
    expect(msg).toMatch(/too weak/i);
  });

  it("gives a clear message for too many failed attempts", () => {
    const msg = getAuthErrorMessage({ code: "auth/too-many-requests" }, "signin");
    expect(msg).toMatch(/too many attempts/i);
  });

  it("gives a clear message when the server is unreachable", () => {
    const msg = getAuthErrorMessage({ code: "auth/network-request-failed" }, "signin");
    expect(msg).toMatch(/reach the server|internet connection/i);
  });

  it("gives a clear message when a Google popup is closed by the user", () => {
    const msg = getAuthErrorMessage({ code: "auth/popup-closed-by-user" }, "signin");
    expect(msg).toMatch(/cancelled/i);
  });

  it("falls back to a mode-appropriate generic message for unknown codes", () => {
    const signupMsg = getAuthErrorMessage({ code: "auth/some-new-error" }, "signup");
    const signinMsg = getAuthErrorMessage({ code: "auth/some-new-error" }, "signin");

    expect(signupMsg).toMatch(/create/i);
    expect(signinMsg).toMatch(/signing in/i);
  });

  it("handles an error object with no code property at all", () => {
    const msg = getAuthErrorMessage(new Error("something unrelated broke"), "signin");
    expect(msg).toMatch(/signing in/i);
  });

  it("handles a completely non-error value being thrown", () => {
    const msg = getAuthErrorMessage("just a string", "signup");
    expect(msg).toMatch(/create/i);
  });

  it("handles null being passed as the error", () => {
    const msg = getAuthErrorMessage(null, "signin");
    expect(msg).toMatch(/signing in/i);
  });

  it("handles undefined being passed as the error", () => {
    const msg = getAuthErrorMessage(undefined, "signup");
    expect(msg).toMatch(/create/i);
  });
});