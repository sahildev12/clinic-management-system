import { describe, expect, it } from "vitest";

import { assertValidDateTime, ValidationError } from "./validation";

describe("assertValidDateTime", () => {
  it("returns a Date for a valid ISO string", () => {
    const result = assertValidDateTime("2026-07-30T10:00:00.000Z", "Scheduled at");
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe("2026-07-30T10:00:00.000Z");
  });

  it("throws ValidationError when value is missing", () => {
    expect(() => assertValidDateTime(undefined, "Scheduled at")).toThrow(ValidationError);
    expect(() => assertValidDateTime(null, "Scheduled at")).toThrow("Scheduled at is required");
    expect(() => assertValidDateTime("", "Scheduled at")).toThrow("Scheduled at is required");
  });

  it("throws ValidationError for invalid date strings", () => {
    expect(() => assertValidDateTime("not-a-date", "Scheduled at")).toThrow(ValidationError);
    expect(() => assertValidDateTime("not-a-date", "Scheduled at")).toThrow(
      "Scheduled at is invalid"
    );
  });
});
