import { describe, it, expect } from "vitest";
import { formatDate } from "../src/lib/format";

describe("formatDate", () => {
  it("formats ISO dates", () => expect(formatDate("2026-07-05")).toBe("5 Jul 2026"));
  it("handles missing and invalid input", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });
});

import { formatTimestamp } from "../src/lib/format";

describe("formatTimestamp", () => {
  it("formats mm:ss", () => {
    expect(formatTimestamp(0)).toBe("0:00");
    expect(formatTimestamp(83.4)).toBe("1:23");
    expect(formatTimestamp(600)).toBe("10:00");
  });
  it("clamps negatives", () => expect(formatTimestamp(-5)).toBe("0:00"));
});

import { formatShotType } from "../src/lib/format";

describe("formatShotType", () => {
  it("humanises shot types", () => {
    expect(formatShotType("match_play")).toBe("Match play");
    expect(formatShotType("serve")).toBe("Serve");
  });
});

import { formatCategory } from "../src/lib/format";

describe("formatCategory", () => {
  it("labels the three engine categories", () => {
    expect(formatCategory("strength")).toBe("Strength & Conditioning");
    expect(formatCategory("mentality")).toBe("Mentality & Psychology");
    expect(formatCategory("recovery")).toBe("Rest & Recovery");
  });
  it("passes unknown values through", () => expect(formatCategory("x")).toBe("x"));
});

import { formatDateTime, formatTime, formatEventType } from "../src/lib/format";

describe("schedule formatting", () => {
  it("formats invalid timestamps as a dash", () => {
    expect(formatDateTime("nope")).toBe("—");
    expect(formatTime("nope")).toBe("—");
  });
  it("labels event types", () => {
    expect(formatEventType("group_session")).toBe("Group session");
    expect(formatEventType("lesson")).toBe("Lesson");
  });
});

import { parseTags } from "../src/features/drills/hooks";

describe("parseTags", () => {
  it("trims, lowercases, dedupes", () => {
    expect(parseTags("Serve, footwork , serve,")).toEqual(["serve", "footwork"]);
  });
  it("handles empty input", () => expect(parseTags(undefined)).toEqual([]));
});

import { slugify } from "../src/lib/format";

describe("slugify", () => {
  it("makes safe filenames", () => {
    expect(slugify("Jane O'Brien")).toBe("jane-o-brien");
    expect(slugify("  Ana / María!  ")).toBe("ana-mar-a");
  });
  it("falls back for empty input", () => expect(slugify("!!!")).toBe("player"));
});
