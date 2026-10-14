import { z } from "zod";

import { isValidClinicPhone } from "@/lib/phone";
import { parsePatientReferenceTemplate } from "@/lib/patient-reference";

const providerNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name is too long");

const providerPhoneSchema = z
  .string()
  .trim()
  .min(1, "Phone is required")
  .refine(isValidClinicPhone, "Enter a valid 10-digit mobile number");

const providerEmailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address");

const providerModuleAccessSchema = z.array(
  z.enum([
    "dashboard",
    "patients",
    "appointments",
    "notes",
    "payments",
    "finance",
    "reminders",
    "prescriptions",
    "medicines",
    "messages",
    "media",
  ])
);

const doctorCategorySchema = z.enum([
  "GENERAL_DENTISTRY",
  "ORTHODONTICS",
  "ENDODONTICS",
  "PERIODONTICS",
  "PEDIATRIC_DENTISTRY",
  "ORAL_SURGERY",
  "PROSTHODONTICS",
  "OTHER",
]);

function refineProviderMember(
  data: {
    providerType?: "DOCTOR" | "STAFF";
    category?: string | null;
    active?: boolean;
    moduleAccess?: string[];
  },
  ctx: z.RefinementCtx
) {
  if (data.providerType === "DOCTOR" && !data.category) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Specialization is required for doctors",
      path: ["category"],
    });
  }
  if (data.active && (!data.moduleAccess || data.moduleAccess.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select at least one module for an active member",
      path: ["moduleAccess"],
    });
  }
}

function requiredDateTimeString(label: string) {
  return z
    .string()
    .min(1, `${label} is required`)
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: `${label} is invalid`,
    });
}

function optionalDateTimeString(label: string) {
  return z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), {
      message: `${label} is invalid`,
    });
}

export const patientSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone is required")
    .refine(isValidClinicPhone, "Enter a valid 10-digit mobile number"),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Enter a valid email address",
    }),
  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (value) => {
        if (!value) return true;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return false;
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return date.getTime() <= today.getTime();
      },
      { message: "Date of birth cannot be in the future" }
    ),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type PatientInput = z.infer<typeof patientSchema>;

export const medicineSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  strength: z.string().optional().or(z.literal("")),
  unit: z.string().optional().or(z.literal("")),
  stock: z.coerce.number().int().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).default(10),
  notes: z.string().optional().or(z.literal("")),
});

export type MedicineInput = z.infer<typeof medicineSchema>;

export const inventoryAdjustmentSchema = z.object({
  quantity: z.coerce
    .number()
    .int()
    .refine((value) => value !== 0, "Quantity must not be zero"),
  note: z.string().optional().or(z.literal("")),
});

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;

export const appointmentNotesSchema = z.object({
  notes: z.string().max(2000, "Notes must be 2000 characters or less").optional().or(z.literal("")),
});

export type AppointmentNotesInput = z.infer<typeof appointmentNotesSchema>;

export const appointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  providerId: z.string().optional().or(z.literal("")),
  dateTime: requiredDateTimeString("Date & time"),
  durationMinutes: z.coerce.number().int().min(15, "Minimum duration is 15 minutes").max(240, "Maximum duration is 240 minutes").default(30),
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]).default("PENDING"),
  source: z.enum(["WEBSITE", "WALK_IN"]).default("WALK_IN"),
  notes: z.string().optional().or(z.literal("")),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;

export const paymentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  appointmentId: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.enum(["CASH", "ONLINE"]).default("CASH"),
  paidAt: optionalDateTimeString("Paid at"),
  notes: z.string().optional().or(z.literal("")),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

export const voidPaymentSchema = z.object({
  reason: z.string().trim().min(1, "A void reason is required").max(500),
});

export type VoidPaymentInput = z.infer<typeof voidPaymentSchema>;

export const expenseSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  category: z
    .enum([
      "RENT",
      "UTILITIES",
      "SALARIES",
      "SUPPLIES",
      "EQUIPMENT",
      "MARKETING",
      "MAINTENANCE",
      "OTHER",
    ])
    .default("OTHER"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  vendor: z.string().optional().or(z.literal("")),
  method: z.enum(["CASH", "ONLINE"]).default("CASH"),
  paidAt: optionalDateTimeString("Paid at"),
  notes: z.string().optional().or(z.literal("")),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export const voidExpenseSchema = z.object({
  reason: z.string().trim().min(1, "A void reason is required").max(500),
});

export type VoidExpenseInput = z.infer<typeof voidExpenseSchema>;

export const bulkVoidPaymentSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Select at least one payment"),
  reason: z.string().trim().min(1, "A void reason is required").max(500),
});

export const reminderSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  appointmentId: z.string().optional().or(z.literal("")),
  dueAt: requiredDateTimeString("Due date"),
  message: z.string().trim().min(1, "Message is required"),
  status: z.enum(["PENDING", "DONE"]).default("PENDING"),
});

export type ReminderInput = z.infer<typeof reminderSchema>;

export const prescriptionItemSchema = z.object({
  medicineId: z.string().min(1),
  dosage: z.string().trim().min(1, "Dosage is required"),
  duration: z.string().optional().or(z.literal("")),
  instructions: z.string().optional().or(z.literal("")),
  quantity: z.union([z.coerce.number().int().positive(), z.nan(), z.undefined()]).optional(),
});

export const prescriptionSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  appointmentId: z.string().optional().or(z.literal("")),
  diagnosis: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  items: z.array(prescriptionItemSchema).min(1, "Add at least one medicine"),
});

export type PrescriptionInput = z.infer<typeof prescriptionSchema>;

export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .min(1, "Phone is required")
    .refine((value) => isValidClinicPhone(value), "Enter a valid 10-digit mobile number"),
  subject: z.string().optional().or(z.literal("")),
  message: z.string().trim().min(1, "Message is required"),
});

export const publicAppointmentSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(7, "Phone is required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  dateTime: requiredDateTimeString("Preferred date & time"),
  notes: z.string().optional().or(z.literal("")),
  paymentPreference: z.enum(["ONLINE", "COUNTER"], {
    message: "Please choose how you would like to pay",
  }),
  clinicSlug: z.string().optional().or(z.literal("")),
  providerId: z.string().optional().or(z.literal("")),
});

export type PublicAppointmentInput = z.infer<typeof publicAppointmentSchema>;

export const clinicSettingSchema = z.object({
  clinicName: z.string().trim().min(1, "Clinic name is required"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  logoUrl: z.string().optional().or(z.literal("")),
  headerBrandMode: z.enum(["ICON_AND_TEXT", "FULL_IMAGE"]).default("ICON_AND_TEXT"),
  lunchStartHour: z.coerce.number().int().min(0).max(23).default(13),
  lunchEndHour: z.coerce.number().int().min(0).max(23).default(14),
  patientReferenceTemplate: z
    .string()
    .trim()
    .min(1, "Patient reference template is required")
    .superRefine((value, ctx) => {
      const parsed = parsePatientReferenceTemplate(value);
      if (!parsed.ok) {
        ctx.addIssue({
          code: "custom",
          message: parsed.error,
        });
      }
    }),
}).superRefine((data, ctx) => {
  if (data.lunchEndHour <= data.lunchStartHour) {
    ctx.addIssue({
      code: "custom",
      message: "Lunch end must be after lunch start",
      path: ["lunchEndHour"],
    });
  }
});

export type ClinicSettingInput = z.infer<typeof clinicSettingSchema>;

export const providerCreateSchema = z
  .object({
    name: providerNameSchema,
    phone: providerPhoneSchema,
    email: providerEmailSchema,
    password: z.string().min(6, "Password must be at least 6 characters"),
    avatarUrl: z.string().optional().or(z.literal("")),
    active: z.boolean().default(true),
    providerType: z.enum(["DOCTOR", "STAFF"]).default("STAFF"),
    category: doctorCategorySchema.optional().nullable(),
    clinicId: z.string().optional().or(z.literal("")),
    clinicName: z.string().optional().or(z.literal("")),
    moduleAccess: providerModuleAccessSchema.default([]),
  })
  .superRefine(refineProviderMember);

export type ProviderCreateInput = z.infer<typeof providerCreateSchema>;

export const providerUpdateSchema = z
  .object({
    name: providerNameSchema,
    phone: providerPhoneSchema,
    email: providerEmailSchema,
    password: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((value) => !value?.trim() || value.trim().length >= 6, {
        message: "Password must be at least 6 characters",
      }),
    avatarUrl: z.string().optional().or(z.literal("")),
    active: z.boolean().default(true),
    providerType: z.enum(["DOCTOR", "STAFF"]).optional(),
    category: doctorCategorySchema.optional().nullable(),
    moduleAccess: providerModuleAccessSchema.default([]),
  })
  .superRefine(refineProviderMember);

export type ProviderUpdateInput = z.infer<typeof providerUpdateSchema>;

export const providerScheduleSchema = z
  .object({
    appointmentDurationMinutes: z
      .number()
      .int()
      .min(10, "Minimum appointment length is 10 minutes")
      .max(60, "Maximum appointment length is 60 minutes"),
    workDays: z
      .array(z.number().int().min(0).max(6))
      .min(1, "Select at least one working day"),
    workStartHour: z.number().int().min(0).max(23),
    workEndHour: z.number().int().min(1).max(24),
    lunchStartHour: z.number().int().min(0).max(23),
    lunchEndHour: z.number().int().min(1).max(24),
    useClinicHours: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.workEndHour <= data.workStartHour) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End hour must be after start hour",
        path: ["workEndHour"],
      });
    }
    if (data.lunchEndHour <= data.lunchStartHour) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Lunch end must be after lunch start",
        path: ["lunchEndHour"],
      });
    }
  });

export type ProviderScheduleInput = z.infer<typeof providerScheduleSchema>;

/** @deprecated Prefer providerCreateSchema / providerUpdateSchema */
export const providerSchema = providerUpdateSchema;

export type ProviderInput = ProviderUpdateInput;

export const patientAllergySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  severity: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type PatientAllergyInput = z.infer<typeof patientAllergySchema>;

export const patientConditionSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  status: z.enum(["ACTIVE", "RESOLVED"]).default("ACTIVE"),
  notes: z.string().optional().or(z.literal("")),
});

export type PatientConditionInput = z.infer<typeof patientConditionSchema>;

export const encounterSchema = z.object({
  appointmentId: z.string().optional().or(z.literal("")),
  providerId: z.string().optional().or(z.literal("")),
  visitedAt: optionalDateTimeString("Visited at"),
  chiefComplaint: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  vitalsJson: z.record(z.string(), z.unknown()).optional(),
});

export type EncounterInput = z.infer<typeof encounterSchema>;