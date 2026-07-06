import { describe, it, expect } from "vitest";
import { homePathForRole } from "../src/lib/supabase";

// Guard against a route rename silently breaking post-login redirects.
describe("homePathForRole", () => {
  it("routes each role to its own dashboard", () => {
    expect(homePathForRole("coach")).toBe("/coach");
    expect(homePathForRole("athlete")).toBe("/athlete");
    expect(homePathForRole("parent")).toBe("/parent");
  });
});
