export const DEFAULT_PATIENT_REFERENCE_TEMPLATE = "PAT-{YEAR}-{SEQ:6}";

const SEQ_TOKEN = /\{SEQ:(\d+)\}/g;
const YEAR_TOKEN = /\{YEAR\}/g;
const ANY_TOKEN = /\{([A-Z]+)(?::(\d+))?\}/g;

export type PatientReferenceParseResult =
  | { ok: true; template: string; seqWidth: number }
  | { ok: false; error: string };

export function parsePatientReferenceTemplate(
  templateRaw: string
): PatientReferenceParseResult {
  const template = templateRaw.trim();
  if (!template) {
    return { ok: false, error: "Patient reference template is required" };
  }
  if (template.length > 60) {
    return { ok: false, error: "Template must be 60 characters or fewer" };
  }

  const seqMatches = [...template.matchAll(SEQ_TOKEN)];
  if (seqMatches.length !== 1) {
    return {
      ok: false,
      error: "Template must include exactly one {SEQ:n} token (n = 1–12)",
    };
  }

  const seqWidth = Number(seqMatches[0]?.[1] ?? 0);
  if (!Number.isInteger(seqWidth) || seqWidth < 1 || seqWidth > 12) {
    return { ok: false, error: "Sequence width must be between 1 and 12" };
  }

  for (const match of template.matchAll(ANY_TOKEN)) {
    const token = match[1];
    if (token === "YEAR") continue;
    if (token === "SEQ") continue;
    return {
      ok: false,
      error: `Unsupported token {${token}}. Use {YEAR} and {SEQ:n} only.`,
    };
  }

  return { ok: true, template, seqWidth };
}

export function formatPatientReference(
  template: string,
  sequence: number,
  year = new Date().getFullYear()
) {
  const parsed = parsePatientReferenceTemplate(template);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("Sequence must be a positive integer");
  }

  const padded = String(sequence).padStart(parsed.seqWidth, "0");
  if (padded.length > parsed.seqWidth) {
    throw new Error(
      `Sequence ${sequence} exceeds template width {SEQ:${parsed.seqWidth}}`
    );
  }

  return parsed.template
    .replace(YEAR_TOKEN, String(year))
    .replace(SEQ_TOKEN, padded);
}

export function previewPatientReference(
  template: string,
  sequence = 1,
  year = new Date().getFullYear()
) {
  const parsed = parsePatientReferenceTemplate(template);
  if (!parsed.ok) return null;
  try {
    return formatPatientReference(parsed.template, sequence, year);
  } catch {
    return null;
  }
}

export function patientDisplayLabel(patient: {
  name: string;
  patientReference?: string | null;
  phone?: string | null;
}) {
  return [patient.name, patient.patientReference, patient.phone]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" · ");
}
