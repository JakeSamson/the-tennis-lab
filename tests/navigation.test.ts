import { describe, it, expect } from "vitest";
import { safeRedirect, buildClaimUrl } from "../src/lib/navigation";

describe("safeRedirect", () => {
  it("allows internal paths", () => {
    expect(safeRedirect("/claim/abc", "/x")).toBe("/claim/abc");
  });
  it("rejects full URLs, protocol-relative URLs, and empties", () => {
    expect(safeRedirect("https://evil.com", "/x")).toBe("/x");
    expect(safeRedirect("//evil.com", "/x")).toBe("/x");
    expect(safeRedirect(null, "/x")).toBe("/x");
    expect(safeRedirect("javascript:alert(1)", "/x")).toBe("/x");
  });
});

describe("buildClaimUrl", () => {
  it("builds the shareable link", () => {
    expect(buildClaimUrl("https://app.test", "tok-1")).toBe("https://app.test/claim/tok-1");
  });
});
