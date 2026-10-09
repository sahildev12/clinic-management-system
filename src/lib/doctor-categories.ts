export const DOCTOR_CATEGORY_LABELS: Record<string, string> = {
  // Doctor specializations within the single clinic
  GENERAL_DENTISTRY: "General dentistry",
  ORTHODONTICS: "Orthodontics",
  ENDODONTICS: "Endodontics",
  PERIODONTICS: "Periodontics",
  PEDIATRIC_DENTISTRY: "Pediatric dentistry",
  ORAL_SURGERY: "Oral surgery",
  PROSTHODONTICS: "Prosthodontics",
  OTHER: "Other",
};

export const DOCTOR_CATEGORY_OPTIONS = Object.entries(DOCTOR_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label })
);

export function doctorCategoryLabel(value?: string | null) {
  if (!value) return "—";
  return DOCTOR_CATEGORY_LABELS[value] ?? value;
}

/** Alias — UI label is "Specialization". */
export const doctorSpecializationLabel = doctorCategoryLabel;

export const DEFAULT_DOCTOR_MODULES = [
  "dashboard",
  "patients",
  "appointments",
  "prescriptions",
  "notes",
] as const;
