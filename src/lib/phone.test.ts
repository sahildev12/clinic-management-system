import { describe, expect, it } from "vitest";

import {
  isValidIndiaMobile,
  normalizePhone,
  sanitizeIndiaMobileDigits,
  toIndiaE164,
} from "./phone";

describe("normalizePhone", () => {
  it("strips non-digits from local numbers", () => {
    expect(normalizePhone("(987) 654-3210")).toBe("9876543210");
    expect(normalizePhone("98765 43210")).toBe("9876543210");
  });

  it("preserves a single leading + for international numbers", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizePhone("+1 (555) 123-4567")).toBe("+15551234567");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizePhone("  9876543210  ")).toBe("9876543210");
    expect(normalizePhone("  +919876543210  ")).toBe("+919876543210");
  });

  it("returns empty string for empty/whitespace input", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone("   ")).toBe("");
  });
});

describe("India mobile helpers", () => {
  it("keeps only digits up to 10", () => {
    expect(sanitizeIndiaMobileDigits("98a76-54321099")).toBe("9876543210");
  });

  it("builds +91 E.164", () => {
    expect(toIndiaE164("9876543210")).toBe("+919876543210");
  });

  it("validates 10-digit mobiles starting 6–9", () => {
    expect(isValidIndiaMobile("9876543210")).toBe(true);
    expect(isValidIndiaMobile("5876543210")).toBe(false);
    expect(isValidIndiaMobile("98765")).toBe(false);
  });
});
