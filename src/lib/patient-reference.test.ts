import { describe, expect, it } from "vitest";

import {
  DEFAULT_PATIENT_REFERENCE_TEMPLATE,
  formatPatientReference,
  parsePatientReferenceTemplate,
  patientDisplayLabel,
  previewPatientReference,
} from "./patient-reference";

describe("parsePatientReferenceTemplate", () => {
  it("accepts the default template", () => {
    const result = parsePatientReferenceTemplate(DEFAULT_PATIENT_REFERENCE_TEMPLATE);
    expect(result).toEqual({
      ok: true,
      template: "PAT-{YEAR}-{SEQ:6}",
      seqWidth: 6,
    });
  });

  it("rejects empty or overly long templates", () => {
    expect(parsePatientReferenceTemplate("")).toMatchObject({ ok: false });
    expect(parsePatientReferenceTemplate("x".repeat(61))).toMatchObject({ ok: false });
  });

  it("requires exactly one {SEQ:n} token with width 1–12", () => {
    expect(parsePatientReferenceTemplate("PAT-{YEAR}")).toMatchObject({ ok: false });
    expect(parsePatientReferenceTemplate("A-{SEQ:0}")).toMatchObject({ ok: false });
    expect(parsePatientReferenceTemplate("A-{SEQ:13}")).toMatchObject({ ok: false });
    expect(parsePatientReferenceTemplate("A-{SEQ:4}-{SEQ:4}")).toMatchObject({ ok: false });
  });

  it("rejects unsupported tokens", () => {
    expect(parsePatientReferenceTemplate("PAT-{MONTH}-{SEQ:4}")).toMatchObject({
      ok: false,
      error: expect.stringContaining("Unsupported token"),
    });
  });
});

describe("formatPatientReference", () => {
  it("formats year and zero-padded sequence", () => {
    expect(formatPatientReference("PAT-{YEAR}-{SEQ:6}", 42, 2026)).toBe("PAT-2026-000042");
  });

  it("throws when sequence exceeds width", () => {
    expect(() => formatPatientReference("PAT-{SEQ:2}", 100, 2026)).toThrow(
      /exceeds template width/
    );
  });

  it("throws for non-positive sequence", () => {
    expect(() => formatPatientReference("PAT-{SEQ:4}", 0, 2026)).toThrow(
      "Sequence must be a positive integer"
    );
  });
});

describe("previewPatientReference", () => {
  it("returns a preview for valid templates", () => {
    expect(previewPatientReference("PAT-{YEAR}-{SEQ:4}", 1, 2026)).toBe("PAT-2026-0001");
  });

  it("returns null for invalid templates", () => {
    expect(previewPatientReference("bad")).toBeNull();
  });
});

describe("patientDisplayLabel", () => {
  it("joins name, reference, and phone when present", () => {
    expect(
      patientDisplayLabel({
        name: "Ada",
        patientReference: "PAT-2026-000001",
        phone: "9876543210",
      })
    ).toBe("Ada · PAT-2026-000001 · 9876543210");
  });

  it("omits blank optional parts", () => {
    expect(patientDisplayLabel({ name: "Ada", phone: null })).toBe("Ada");
  });
});
