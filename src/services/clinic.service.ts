import { Prisma } from "@/generated/prisma/client";
import type { DoctorCategory, Gender, ProviderType } from "@/generated/prisma/client";
import type {
  AppointmentInput,
  EncounterInput,
  InventoryAdjustmentInput,
  MedicineInput,
  PatientAllergyInput,
  PatientConditionInput,
  PatientInput,
  PaymentInput,
  PrescriptionInput,
  ProviderCreateInput,
  ProviderScheduleInput,
  ProviderUpdateInput,
  ReminderInput,
  ExpenseInput,
} from "@/lib/schemas/clinic.schema";
import { writeAuditLog } from "@/lib/api-auth";
import { resolveFinanceDateRange } from "@/lib/admin-format";
import { hashPassword } from "@/lib/password";
import { decryptPassword, encryptPassword } from "@/lib/password-vault";
import { sanitizeStaffModules, type StaffModuleKey } from "@/lib/staff-modules";
import {
  DEFAULT_PATIENT_REFERENCE_TEMPLATE,
  formatPatientReference,
  parsePatientReferenceTemplate,
} from "@/lib/patient-reference";
import { normalizePhone, toIndiaE164, toIndiaMobileLocalDigits } from "@/lib/phone";
import { allocateBookingReference, allocateReceiptNumber } from "@/lib/reference-counters";
import {
  assertAppointmentBelongsToPatient,
  assertValidDateTime,
  ValidationError,
} from "@/lib/validation";
import {
  BOOKING_MAX_DAYS_AHEAD,
  BOOKING_SLOT_MINUTES,
  generateDaySlots,
  getPublicBookingMaxDate,
  isClinicClosedDay,
  isOutsidePublicBookingWindow,
  normalizeLunchHours,
  parseLocalDateKey,
  startOfLocalDay,
  toLocalDateKey,
} from "@/lib/booking-slots";
import {
  defaultProviderScheduleFromClinic,
  isProviderWorkDay,
  normalizeWorkDays,
  resolveProviderSchedule,
  type ProviderScheduleRecord,
} from "@/lib/provider-schedule";
import { DEFAULT_DOCTOR_MODULES } from "@/lib/doctor-categories";
import {
  buildPeriodStats,
  getStatsPeriodRange,
  type DoctorPeriodStats,
  type DoctorStatsPeriod,
} from "@/lib/doctor-dashboard";
import {
  doctorDashboardScope,
  doctorPatientWhere,
  isDoctorViewer,
  mergeDoctorPatientScope,
  resolveAppointmentProviderFilter,
} from "@/lib/doctor-scope";
import { prisma } from "@/lib/prisma";
import {
  type TenantViewer,
  clinicWhere,
  requireClinicIdForWrite,
  slugifyClinicName,
} from "@/lib/tenant-scope";

type Actor = { userId?: string | null; email?: string | null };
type QueryClient = typeof prisma | Prisma.TransactionClient;

type ClinicIdScope = { clinicId?: string };

function tenantClinicScope(
  viewer?: TenantViewer,
  filterClinicId?: string
): ClinicIdScope {
  if (!viewer) return {};
  return clinicWhere(viewer, { filterClinicId }) as ClinicIdScope;
}

function mergeClinicScope<W>(where: W, viewer?: TenantViewer, filterClinicId?: string): W {
  if (!viewer) return where;
  return { ...where, ...tenantClinicScope(viewer, filterClinicId) };
}

async function resolveClinicIdForWrite(
  viewer?: TenantViewer,
  explicitClinicId?: string | null
): Promise<string> {
  if (viewer?.role === "ADMIN") {
    const id = explicitClinicId?.trim();
    if (id) return id;
    return (await getClinicSettings()).clinicId;
  }
  if (viewer) return requireClinicIdForWrite(viewer, explicitClinicId);
  const id = explicitClinicId?.trim();
  if (id) return id;
  return (await getClinicSettings()).clinicId;
}

async function uniqueClinicSlug(base: string, client: QueryClient = prisma) {
  const root = slugifyClinicName(base);
  let slug = root;
  let attempt = 0;
  while (await client.clinic.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${root}-${attempt}`;
  }
  return slug;
}

function emptyToNull(value?: string | null) {
  const v = value?.trim();
  return v ? v : null;
}

function providerPhoneForStorage(phone?: string | null) {
  const trimmed = phone?.trim();
  if (!trimmed) return null;
  return normalizePhone(toIndiaE164(toIndiaMobileLocalDigits(trimmed)));
}

function parseGender(value?: string | null): Gender | null {
  if (value === "MALE" || value === "FEMALE" || value === "OTHER") return value;
  return null;
}

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------

function patientSearchWhere(q?: string, includeArchived = false): Prisma.PatientWhereInput {
  const base: Prisma.PatientWhereInput = includeArchived ? {} : { archivedAt: null };
  if (!q?.trim()) return base;
  return {
    ...base,
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
      { patientReference: { contains: q, mode: "insensitive" } },
    ],
  };
}

async function allocatePatientReference(clinicId: string, client: QueryClient = prisma) {
  const settings = await client.clinicSetting.findUnique({ where: { clinicId } });
  let template =
    settings?.patientReferenceTemplate?.trim() || DEFAULT_PATIENT_REFERENCE_TEMPLATE;
  let parsed = parsePatientReferenceTemplate(template);
  if (!parsed.ok) {
    throw new ValidationError(parsed.error);
  }

  const existingCounter = await client.patientReferenceCounter.findUnique({
    where: { clinicId },
  });
  const counter = existingCounter
    ? await client.patientReferenceCounter.update({
        where: { clinicId },
        data: { nextValue: { increment: 1 } },
      })
    : await client.patientReferenceCounter.create({
        data: { clinicId, nextValue: 2 },
      });

  const sequence = counter.nextValue - 1;
  const neededWidth = String(sequence).length;

  // Clinic settings sometimes use a narrow {SEQ:1}; widen when the counter outgrows it.
  if (neededWidth > parsed.seqWidth) {
    const newWidth = Math.min(12, Math.max(neededWidth, 6));
    template = template.replace(/\{SEQ:\d+\}/, `{SEQ:${newWidth}}`);
    parsed = parsePatientReferenceTemplate(template);
    if (!parsed.ok) {
      throw new ValidationError(parsed.error);
    }
    if (settings?.id) {
      await client.clinicSetting.update({
        where: { id: settings.id },
        data: { patientReferenceTemplate: template },
      });
    }
  }

  return formatPatientReference(parsed.template, sequence);
}

// ---------------------------------------------------------------------------
// Clinics
// ---------------------------------------------------------------------------

export async function listClinics() {
  return prisma.clinic.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { settings: true },
  });
}

export async function getClinicBySlug(slug: string) {
  return prisma.clinic.findFirst({
    where: { slug, active: true },
    include: { settings: true },
  });
}

export async function listDoctorsByClinicSlug(slug: string) {
  const clinic = await getClinicBySlug(slug);
  if (!clinic) return { clinic: null, doctors: [] };
  const doctors = await prisma.provider.findMany({
    where: { clinicId: clinic.id, active: true, providerType: "DOCTOR" },
    orderBy: { name: "asc" },
  });
  return { clinic, doctors };
}

export async function seedClinicDefaults(
  clinicId: string,
  clinicName?: string,
  client: QueryClient = prisma
) {
  await client.clinicSetting.upsert({
    where: { clinicId },
    create: {
      clinicId,
      clinicName: clinicName?.trim() || "Clinic",
      patientReferenceTemplate: DEFAULT_PATIENT_REFERENCE_TEMPLATE,
    },
    update: {},
  });

  await client.patientReferenceCounter.upsert({
    where: { clinicId },
    create: { clinicId, nextValue: 1 },
    update: {},
  });
}

export async function listPatients(
  q?: string,
  options?: {
    includeArchived?: boolean;
    viewer?: TenantViewer;
    filterClinicId?: string;
  }
) {
  const where = mergeDoctorPatientScope(
    mergeClinicScope(
      patientSearchWhere(q, options?.includeArchived),
      options?.viewer,
      options?.filterClinicId
    ),
    options?.viewer
  );
  return prisma.patient.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}

export async function listPatientsPage(filters: {
  q?: string;
  skip: number;
  take: number;
  includeArchived?: boolean;
  viewer?: TenantViewer;
  filterClinicId?: string;
}) {
  const where = mergeDoctorPatientScope(
    mergeClinicScope(
      patientSearchWhere(filters.q, filters.includeArchived),
      filters.viewer,
      filters.filterClinicId
    ),
    filters.viewer
  );

  const [items, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: filters.skip,
      take: filters.take,
    }),
    prisma.patient.count({ where }),
  ]);
  return { items, total };
}

export async function getPatient(id: string) {
  return prisma.patient.findUnique({ where: { id } });
}

export async function assertPatientVisibleToViewer(id: string, viewer?: TenantViewer) {
  if (!isDoctorViewer(viewer) || !viewer?.providerId) return;
  const allowed = await prisma.patient.count({
    where: { id, ...doctorPatientWhere(viewer.providerId) },
  });
  if (!allowed) throw new ValidationError("Patient not found");
}

const TRACKING_SECTION_TAKE = 20;

export async function getPatientTracking(id: string) {
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) return null;

  const [
    appointments,
    appointmentCount,
    prescriptions,
    prescriptionCount,
    payments,
    paymentCount,
    paymentTotalAgg,
    reminders,
    reminderCount,
    allergies,
    allergyCount,
    conditions,
    conditionCount,
    encounters,
    encounterCount,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId: id },
      orderBy: { dateTime: "desc" },
      take: TRACKING_SECTION_TAKE,
      include: {
        provider: true,
        prescriptions: {
          include: { items: { include: { medicine: true } } },
          orderBy: { createdAt: "desc" },
        },
        encounters: {
          include: { provider: true },
          orderBy: { visitedAt: "desc" },
        },
        payments: { orderBy: { paidAt: "desc" } },
      },
    }),
    prisma.appointment.count({ where: { patientId: id } }),
    prisma.prescription.findMany({
      where: { patientId: id },
      orderBy: { createdAt: "desc" },
      take: TRACKING_SECTION_TAKE,
      include: {
        items: { include: { medicine: true } },
        appointment: { select: { id: true, dateTime: true } },
      },
    }),
    prisma.prescription.count({ where: { patientId: id } }),
    prisma.payment.findMany({
      where: { patientId: id },
      orderBy: { paidAt: "desc" },
      take: TRACKING_SECTION_TAKE,
    }),
    prisma.payment.count({ where: { patientId: id } }),
    prisma.payment.aggregate({
      where: { patientId: id, voidedAt: null },
      _sum: { amount: true },
    }),
    prisma.reminder.findMany({
      where: { patientId: id },
      orderBy: { dueAt: "desc" },
      take: TRACKING_SECTION_TAKE,
    }),
    prisma.reminder.count({ where: { patientId: id } }),
    prisma.patientAllergy.findMany({
      where: { patientId: id },
      orderBy: { createdAt: "desc" },
      take: TRACKING_SECTION_TAKE,
    }),
    prisma.patientAllergy.count({ where: { patientId: id } }),
    prisma.patientCondition.findMany({
      where: { patientId: id },
      orderBy: { createdAt: "desc" },
      take: TRACKING_SECTION_TAKE,
    }),
    prisma.patientCondition.count({ where: { patientId: id } }),
    prisma.encounter.findMany({
      where: { patientId: id },
      orderBy: { visitedAt: "desc" },
      take: TRACKING_SECTION_TAKE,
      include: { provider: true },
    }),
    prisma.encounter.count({ where: { patientId: id } }),
  ]);

  return {
    ...patient,
    appointments: appointments.map((appointment) => ({
      ...appointment,
      payments: appointment.payments.map((payment) => ({
        ...payment,
        amount: Number(payment.amount),
      })),
    })),
    appointmentCount,
    prescriptions,
    prescriptionCount,
    payments: payments.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
    })),
    paymentCount,
    paymentTotal: Number(paymentTotalAgg._sum.amount ?? 0),
    reminders,
    reminderCount,
    allergies,
    allergyCount,
    conditions,
    conditionCount,
    encounters,
    encounterCount,
  };
}

export async function createPatient(
  data: PatientInput,
  viewer?: TenantViewer,
  explicitClinicId?: string
) {
  const clinicId = await resolveClinicIdForWrite(viewer, explicitClinicId);
  return prisma.$transaction(async (tx) => {
    const patientReference = await allocatePatientReference(clinicId, tx);
    return tx.patient.create({
      data: {
        clinicId,
        patientReference,
        name: data.name.trim(),
        phone: normalizePhone(data.phone),
        email: emptyToNull(data.email),
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: parseGender(data.gender),
        address: emptyToNull(data.address),
        notes: emptyToNull(data.notes),
      },
    });
  });
}

export async function updatePatient(id: string, data: PatientInput) {
  return prisma.patient.update({
    where: { id },
    data: {
      name: data.name.trim(),
      phone: normalizePhone(data.phone),
      email: emptyToNull(data.email),
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      gender: parseGender(data.gender),
      address: emptyToNull(data.address),
      notes: emptyToNull(data.notes),
      // archivedAt is intentionally untouched here — use archivePatient/restorePatient.
    },
  });
}

export async function archivePatient(id: string, actor?: Actor) {
  const patient = await prisma.patient.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  await writeAuditLog({
    actorUserId: actor?.userId,
    actorEmail: actor?.email,
    action: "PATIENT_ARCHIVED",
    entityType: "Patient",
    entityId: id,
  });

  return patient;
}

export async function restorePatient(id: string, actor?: Actor) {
  const patient = await prisma.patient.update({
    where: { id },
    data: { archivedAt: null },
  });

  await writeAuditLog({
    actorUserId: actor?.userId,
    actorEmail: actor?.email,
    action: "PATIENT_RESTORED",
    entityType: "Patient",
    entityId: id,
  });

  return patient;
}

export async function findOrCreatePatientByPhone(
  input: {
    name: string;
    phone: string;
    email?: string | null;
  },
  clinicId?: string
) {
  const resolvedClinicId = clinicId ?? (await getClinicSettings()).clinicId;
  const phone = normalizePhone(input.phone);
  const existing = await prisma.patient.findFirst({
    where: { phone, clinicId: resolvedClinicId },
  });
  if (existing) {
    // Never overwrite an existing patient's name/email from a booking form —
    // only backfill email if the record didn't have one yet.
    const newEmail = emptyToNull(input.email);
    if (!existing.email && newEmail) {
      return prisma.patient.update({
        where: { id: existing.id },
        data: { email: newEmail },
      });
    }
    return existing;
  }

  return prisma.$transaction(async (tx) => {
    const patientReference = await allocatePatientReference(resolvedClinicId, tx);
    return tx.patient.create({
      data: {
        clinicId: resolvedClinicId,
        patientReference,
        name: input.name.trim(),
        phone,
        email: emptyToNull(input.email),
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

export async function listProviders(filters?: {
  activeOnly?: boolean;
  q?: string;
  viewer?: TenantViewer;
  filterClinicId?: string;
}) {
  const q = filters?.q?.trim();
  const where: Prisma.ProviderWhereInput = mergeClinicScope(
    {
      AND: [
        filters?.activeOnly ? { active: true } : {},
        q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    filters?.viewer,
    filters?.filterClinicId
  );
  return prisma.provider.findMany({
    where,
    orderBy: { name: "asc" },
    include: { clinic: { select: { id: true, name: true, slug: true } } },
  });
}

/** Active doctors patients can pick on the public booking form (with their schedule summary). */
export async function listPublicDoctors(clinicId?: string) {
  const resolvedClinicId = clinicId ?? (await getClinicSettings()).clinicId;
  const doctors = await prisma.provider.findMany({
    where: { clinicId: resolvedClinicId, providerType: "DOCTOR", active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      specialty: true,
      category: true,
      avatarUrl: true,
      schedule: { select: { workDays: true, appointmentDurationMinutes: true } },
    },
  });
  return doctors.map((doctor) => ({
    id: doctor.id,
    name: doctor.name,
    specialty: doctor.specialty,
    category: doctor.category,
    avatarUrl: doctor.avatarUrl,
    workDays: normalizeWorkDays(doctor.schedule?.workDays),
    durationMinutes: doctor.schedule?.appointmentDurationMinutes ?? BOOKING_SLOT_MINUTES,
  }));
}

export async function getStaffModuleAccessByUserId(userId: string) {
  const provider = await prisma.provider.findFirst({
    where: { userId },
    select: { moduleAccess: true, active: true },
  });
  if (!provider || !provider.active) return [];
  return sanitizeStaffModules(provider.moduleAccess);
}

export async function getProvider(id: string) {
  return prisma.provider.findUnique({ where: { id }, include: { user: true } });
}

/** ADMIN-only: return recoverable login password for a team member, if vaulted. */
export async function getProviderLoginPassword(id: string): Promise<{
  available: boolean;
  password: string | null;
}> {
  const provider = await prisma.provider.findUnique({
    where: { id },
    select: {
      id: true,
      user: { select: { passwordEncrypted: true } },
    },
  });
  if (!provider) throw new ValidationError("Team member not found");
  if (!provider.user) {
    return { available: false, password: null };
  }
  const password = decryptPassword(provider.user.passwordEncrypted);
  return { available: Boolean(password), password };
}

export async function createProvider(
  data: ProviderCreateInput & {
    providerType?: ProviderType;
    category?: DoctorCategory | null;
    clinicId?: string;
    clinicName?: string;
  },
  viewer?: TenantViewer
) {
  const email = data.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ValidationError("An account with this email already exists");
  }

  const passwordHash = await hashPassword(data.password);
  const passwordEncrypted = encryptPassword(data.password);
  const providerType = data.providerType ?? "STAFF";
  const moduleAccess =
    providerType === "DOCTOR"
      ? sanitizeStaffModules([...DEFAULT_DOCTOR_MODULES])
      : sanitizeStaffModules(data.moduleAccess);

  return prisma.$transaction(async (tx) => {
    const clinicId = await resolveClinicIdForWrite(viewer, data.clinicId);

    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        passwordEncrypted,
        name: data.name.trim(),
        phone: providerPhoneForStorage(data.phone),
        role: "STAFF",
        banned: !data.active,
      },
    });

    return tx.provider.create({
      data: {
        clinicId,
        name: data.name.trim(),
        phone: providerPhoneForStorage(data.phone),
        email,
        avatarUrl: emptyToNull(data.avatarUrl),
        active: data.active,
        providerType,
        category: providerType === "DOCTOR" ? data.category ?? "GENERAL_DENTISTRY" : null,
        moduleAccess,
        userId: user.id,
      },
    }).then(async (provider) => {
      if (providerType === "DOCTOR") {
        await ensureProviderScheduleTx(tx, provider.id, clinicId);
      }
      return provider;
    });
  });
}

async function ensureProviderScheduleTx(
  tx: QueryClient,
  providerId: string,
  clinicId: string
) {
  const existing = await tx.providerSchedule.findUnique({ where: { providerId } });
  if (existing) return existing;

  const settings = await tx.clinicSetting.findUnique({ where: { clinicId } });
  const defaults = defaultProviderScheduleFromClinic(settings ?? undefined);
  return tx.providerSchedule.create({
    data: {
      providerId,
      appointmentDurationMinutes: defaults.appointmentDurationMinutes,
      workDays: defaults.workDays,
      workStartHour: defaults.workStartHour,
      workEndHour: defaults.workEndHour,
      lunchStartHour: defaults.lunchStartHour,
      lunchEndHour: defaults.lunchEndHour,
      useClinicHours: defaults.useClinicHours,
    },
  });
}

export async function getProviderSchedule(providerId: string) {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true, providerType: true, clinicId: true, name: true },
  });
  if (!provider) throw new ValidationError("Team member not found");
  if (provider.providerType !== "DOCTOR") {
    throw new ValidationError("Schedule settings apply to doctors only");
  }

  let schedule = await prisma.providerSchedule.findUnique({ where: { providerId } });
  if (!schedule) {
    schedule = await ensureProviderScheduleTx(prisma, providerId, provider.clinicId);
  }

  const settings = await getClinicSettings(provider.clinicId);
  const resolved = resolveProviderSchedule(schedule, settings);

  return {
    providerId: provider.id,
    providerName: provider.name,
    ...resolved,
    workDays: normalizeWorkDays(schedule.workDays),
  };
}

export async function updateProviderSchedule(providerId: string, data: ProviderScheduleInput) {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true, providerType: true, clinicId: true },
  });
  if (!provider) throw new ValidationError("Team member not found");
  if (provider.providerType !== "DOCTOR") {
    throw new ValidationError("Schedule settings apply to doctors only");
  }

  const workDays = normalizeWorkDays(data.workDays);
  const settings = await getClinicSettings(provider.clinicId);
  let lunchStartHour = data.lunchStartHour;
  let lunchEndHour = data.lunchEndHour;
  if (data.useClinicHours) {
    lunchStartHour = settings.lunchStartHour;
    lunchEndHour = settings.lunchEndHour;
  }

  const schedule = await prisma.providerSchedule.upsert({
    where: { providerId },
    create: {
      providerId,
      appointmentDurationMinutes: data.appointmentDurationMinutes,
      workDays,
      workStartHour: data.workStartHour,
      workEndHour: data.workEndHour,
      lunchStartHour,
      lunchEndHour,
      useClinicHours: data.useClinicHours,
    },
    update: {
      appointmentDurationMinutes: data.appointmentDurationMinutes,
      workDays,
      workStartHour: data.workStartHour,
      workEndHour: data.workEndHour,
      lunchStartHour,
      lunchEndHour,
      useClinicHours: data.useClinicHours,
    },
  });

  const resolved = resolveProviderSchedule(schedule, settings);
  return {
    providerId: provider.id,
    ...resolved,
    workDays: normalizeWorkDays(schedule.workDays),
  };
}

async function resolveScheduleForSlots(
  providerId?: string | null,
  clinicId?: string
): Promise<{
  slotMinutes: number;
  workDays: number[];
  schedule: ProviderScheduleRecord;
} | null> {
  if (!providerId?.trim()) return null;

  const provider = await prisma.provider.findUnique({
    where: { id: providerId.trim() },
    select: { id: true, providerType: true, clinicId: true, schedule: true },
  });
  if (!provider || provider.providerType !== "DOCTOR") return null;

  let record = provider.schedule;
  if (!record) {
    record = await ensureProviderScheduleTx(prisma, provider.id, provider.clinicId);
  }

  const settings = await getClinicSettings(clinicId ?? provider.clinicId);
  const resolved = resolveProviderSchedule(record, settings);
  return {
    slotMinutes: resolved.appointmentDurationMinutes,
    workDays: normalizeWorkDays(record.workDays),
    schedule: resolved,
  };
}

export async function updateProvider(id: string, data: ProviderUpdateInput) {
  const existing = await prisma.provider.findUnique({ where: { id } });
  if (!existing) throw new ValidationError("Team member not found");

  const email = data.email.trim().toLowerCase();
  const emailTaken = await prisma.user.findFirst({
    where: {
      email,
      ...(existing.userId ? { id: { not: existing.userId } } : {}),
    },
  });
  if (emailTaken) {
    throw new ValidationError("An account with this email already exists");
  }

  const password = data.password?.trim();
  const passwordHash = password ? await hashPassword(password) : null;
  const passwordEncrypted = password ? encryptPassword(password) : null;
  const moduleAccess = sanitizeStaffModules(data.moduleAccess);

  return prisma.$transaction(async (tx) => {
    let userId = existing.userId;

    if (userId) {
      await tx.user.update({
        where: { id: userId },
        data: {
          email,
          name: data.name.trim(),
          phone: providerPhoneForStorage(data.phone),
          banned: !data.active,
          ...(passwordHash && passwordEncrypted
            ? { passwordHash, passwordEncrypted }
            : {}),
        },
      });
    } else if (passwordHash && passwordEncrypted) {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          passwordEncrypted,
          name: data.name.trim(),
          phone: providerPhoneForStorage(data.phone),
          role: "STAFF",
          banned: !data.active,
        },
      });
      userId = user.id;
    }

    const providerType = data.providerType ?? existing.providerType;
    const category =
      providerType === "DOCTOR"
        ? data.category ?? existing.category ?? "GENERAL_DENTISTRY"
        : null;

    return tx.provider.update({
      where: { id },
      data: {
        name: data.name.trim(),
        phone: providerPhoneForStorage(data.phone),
        email,
        avatarUrl: emptyToNull(data.avatarUrl),
        active: data.active,
        providerType,
        category,
        moduleAccess,
        userId,
      },
    });
  });
}

export async function deleteProvider(id: string) {
  const existing = await prisma.provider.findUnique({ where: { id } });
  if (!existing) throw new ValidationError("Team member not found");

  return prisma.$transaction(async (tx) => {
    await tx.provider.delete({ where: { id } });
    if (existing.userId) {
      await tx.user.delete({ where: { id: existing.userId } }).catch(() => null);
    }
  });
}

// ---------------------------------------------------------------------------
// Medicines & inventory
// ---------------------------------------------------------------------------

export async function listMedicines(
  q?: string,
  options?: { viewer?: TenantViewer; filterClinicId?: string }
) {
  const where: Prisma.MedicineWhereInput = mergeClinicScope(
    q ? { name: { contains: q, mode: "insensitive" } } : {},
    options?.viewer,
    options?.filterClinicId
  );
  return prisma.medicine.findMany({
    where,
    orderBy: { name: "asc" },
    take: 500,
  });
}

export async function listMedicinesPage(filters: {
  q?: string;
  skip: number;
  take: number;
  viewer?: TenantViewer;
  filterClinicId?: string;
}) {
  const where: Prisma.MedicineWhereInput = mergeClinicScope(
    filters.q ? { name: { contains: filters.q, mode: "insensitive" } } : {},
    filters.viewer,
    filters.filterClinicId
  );
  const [items, total] = await Promise.all([
    prisma.medicine.findMany({
      where,
      orderBy: { name: "asc" },
      skip: filters.skip,
      take: filters.take,
    }),
    prisma.medicine.count({ where }),
  ]);
  return { items, total };
}

export async function getMedicine(id: string) {
  return prisma.medicine.findUnique({ where: { id } });
}

export async function createMedicine(
  data: MedicineInput,
  viewer?: TenantViewer,
  explicitClinicId?: string
) {
  const clinicId = await resolveClinicIdForWrite(viewer, explicitClinicId);
  return prisma.medicine.create({
    data: {
      clinicId,
      name: data.name.trim(),
      strength: emptyToNull(data.strength),
      unit: emptyToNull(data.unit),
      stock: data.stock ?? 0,
      reorderLevel: data.reorderLevel ?? 10,
      notes: emptyToNull(data.notes),
    },
  });
}

export async function updateMedicine(id: string, data: MedicineInput) {
  return prisma.medicine.update({
    where: { id },
    data: {
      name: data.name.trim(),
      strength: emptyToNull(data.strength),
      unit: emptyToNull(data.unit),
      stock: data.stock ?? 0,
      reorderLevel: data.reorderLevel ?? 10,
      notes: emptyToNull(data.notes),
    },
  });
}

export async function deleteMedicine(id: string) {
  try {
    return await prisma.medicine.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2014")
    ) {
      throw new ValidationError("Medicine is used in prescriptions and cannot be deleted");
    }
    throw error;
  }
}

export async function createInventoryAdjustment(
  medicineId: string,
  data: InventoryAdjustmentInput,
  actor?: Actor
) {
  return prisma.$transaction(async (tx) => {
    const medicine = await tx.medicine.findUnique({ where: { id: medicineId } });
    if (!medicine) throw new ValidationError("Medicine not found");

    const newStock = medicine.stock + data.quantity;
    if (newStock < 0) {
      throw new ValidationError("Adjustment would result in negative stock");
    }

    const updated = await tx.medicine.update({
      where: { id: medicineId },
      data: { stock: newStock },
    });

    await tx.inventoryTransaction.create({
      data: {
        medicineId,
        type: "ADJUSTMENT",
        quantity: data.quantity,
        note: emptyToNull(data.note),
        createdByUserId: actor?.userId ?? null,
      },
    });

    return updated;
  });
}

export async function listInventoryTransactions(medicineId: string) {
  return prisma.inventoryTransaction.findMany({
    where: { medicineId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export async function listAppointments(filters?: {
  status?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  source?: string;
  q?: string;
  providerId?: string;
  category?: string;
  sort?: "asc" | "desc";
  take?: number;
  viewer?: TenantViewer;
  filterClinicId?: string;
}) {
  const where = buildAppointmentWhere(filters);
  return prisma.appointment.findMany({
    where,
    include: { patient: true, provider: true },
    orderBy: { dateTime: filters?.sort === "asc" ? "asc" : "desc" },
    take: filters?.take ?? 500,
  });
}

export async function listAppointmentsPage(filters: {
  status?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  source?: string;
  q?: string;
  providerId?: string;
  category?: string;
  notesFilter?: "with-notes" | "without-notes";
  skip: number;
  take: number;
  viewer?: TenantViewer;
  filterClinicId?: string;
}) {
  const where = buildAppointmentWhere(filters);
  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: { patient: true, provider: true },
      orderBy: { dateTime: "desc" },
      skip: filters.skip,
      take: filters.take,
    }),
    prisma.appointment.count({ where }),
  ]);
  return { items, total };
}

function resolveAppointmentDateRange(filters?: {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  if (filters?.dateFrom || filters?.dateTo) {
    const from = filters.dateFrom ? new Date(filters.dateFrom) : new Date(filters.dateTo!);
    const to = filters.dateTo ? new Date(filters.dateTo) : new Date(filters.dateFrom!);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    if (from.getTime() > to.getTime()) {
      return { gte: to, lte: from };
    }
    return { gte: from, lte: to };
  }
  if (filters?.date) {
    const start = new Date(filters.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filters.date);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  return undefined;
}

function buildAppointmentWhere(filters?: {
  status?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  source?: string;
  q?: string;
  providerId?: string;
  category?: string;
  notesFilter?: "with-notes" | "without-notes";
  viewer?: TenantViewer;
  filterClinicId?: string;
}): Prisma.AppointmentWhereInput {
  const where: Prisma.AppointmentWhereInput = {};
  if (filters?.status) {
    where.status = filters.status as Prisma.EnumAppointmentStatusFilter["equals"];
  }
  if (filters?.source) {
    where.source = filters.source as Prisma.EnumAppointmentSourceFilter["equals"];
  }
  const dateRange = resolveAppointmentDateRange(filters);
  if (dateRange) {
    where.dateTime = dateRange;
  }
  const providerId = resolveAppointmentProviderFilter(filters?.viewer, filters?.providerId);
  if (providerId) {
    where.providerId = providerId;
  }
  if (filters?.category) {
    where.provider = {
      category: filters.category as Prisma.EnumDoctorCategoryNullableFilter["equals"],
    };
  }
  if (filters?.q) {
    where.OR = [
      { patient: { name: { contains: filters.q, mode: "insensitive" } } },
      { patient: { phone: { contains: filters.q } } },
      { patient: { patientReference: { contains: filters.q, mode: "insensitive" } } },
      { id: { contains: filters.q } },
      { bookingReference: { contains: filters.q, mode: "insensitive" } },
      { notes: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters?.notesFilter === "with-notes") {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      { notes: { not: null } },
      { notes: { not: "" } },
    ];
  } else if (filters?.notesFilter === "without-notes") {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      { OR: [{ notes: null }, { notes: "" }] },
    ];
  }
  return mergeClinicScope(where, filters?.viewer, filters?.filterClinicId);
}

export async function getAppointment(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    include: { patient: true, provider: true },
  });
}

const MAX_APPOINTMENT_DURATION_MINUTES = 240;

async function assertNoProviderOverlap(
  client: QueryClient,
  params: {
    providerId: string;
    start: Date;
    durationMinutes: number;
    excludeAppointmentId?: string;
  }
) {
  const end = new Date(params.start.getTime() + params.durationMinutes * 60_000);
  const windowStart = new Date(
    params.start.getTime() - MAX_APPOINTMENT_DURATION_MINUTES * 60_000
  );

  const candidates = await client.appointment.findMany({
    where: {
      providerId: params.providerId,
      status: { not: "CANCELLED" },
      ...(params.excludeAppointmentId ? { id: { not: params.excludeAppointmentId } } : {}),
      dateTime: { gte: windowStart, lt: end },
    },
    select: { dateTime: true, durationMinutes: true },
  });

  const hasOverlap = candidates.some((appointment) => {
    const appointmentEnd = new Date(
      appointment.dateTime.getTime() + appointment.durationMinutes * 60_000
    );
    return appointment.dateTime < end && appointmentEnd > params.start;
  });

  if (hasOverlap) {
    throw new ValidationError("This provider already has an appointment in that time range");
  }
}

export async function createAppointment(
  data: AppointmentInput,
  viewer?: TenantViewer,
  explicitClinicId?: string
) {
  const dateTime = assertValidDateTime(data.dateTime, "Date & time");
  const providerId = emptyToNull(data.providerId);
  let durationMinutes = data.durationMinutes ?? 30;

  if (providerId && !data.durationMinutes) {
    const providerSchedule = await resolveScheduleForSlots(providerId);
    if (providerSchedule) {
      durationMinutes = providerSchedule.slotMinutes;
    }
  }

  return prisma.$transaction(async (tx) => {
    const patient = await tx.patient.findUnique({
      where: { id: data.patientId },
      select: { clinicId: true },
    });
    if (!patient) throw new ValidationError("Patient not found");

    const clinicId = viewer
      ? requireClinicIdForWrite(viewer, explicitClinicId ?? patient.clinicId)
      : explicitClinicId ?? patient.clinicId;
    if (patient.clinicId !== clinicId) {
      throw new ValidationError("Patient does not belong to this clinic");
    }

    if (providerId && data.status !== "CANCELLED") {
      await assertNoProviderOverlap(tx, { providerId, start: dateTime, durationMinutes });
    }

    const bookingReference = await allocateBookingReference(tx);

    return tx.appointment.create({
      data: {
        clinicId,
        patientId: data.patientId,
        providerId,
        dateTime,
        durationMinutes,
        bookingReference,
        status: data.status,
        source: data.source,
        notes: emptyToNull(data.notes),
      },
      include: { patient: true, provider: true },
    });
  });
}

export async function updateAppointment(id: string, data: AppointmentInput) {
  const dateTime = assertValidDateTime(data.dateTime, "Date & time");
  const providerId = emptyToNull(data.providerId);
  const durationMinutes = data.durationMinutes ?? 30;

  return prisma.$transaction(async (tx) => {
    if (providerId && data.status !== "CANCELLED") {
      await assertNoProviderOverlap(tx, {
        providerId,
        start: dateTime,
        durationMinutes,
        excludeAppointmentId: id,
      });
    }

    return tx.appointment.update({
      where: { id },
      data: {
        patientId: data.patientId,
        providerId,
        dateTime,
        durationMinutes,
        status: data.status,
        source: data.source,
        notes: emptyToNull(data.notes),
      },
      include: { patient: true, provider: true },
    });
  });
}

export async function updateAppointmentNotes(
  id: string,
  notes: string | null | undefined,
  viewer?: TenantViewer
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true, providerId: true },
  });
  if (!appointment) throw new ValidationError("Appointment not found");

  if (isDoctorViewer(viewer) && viewer?.providerId && appointment.providerId !== viewer.providerId) {
    throw new ValidationError("You can only update your own appointments");
  }

  return prisma.appointment.update({
    where: { id },
    data: { notes: emptyToNull(notes) },
    include: { patient: true, provider: true },
  });
}

export async function deleteAppointment(id: string) {
  const result = await prisma.appointment.deleteMany({
    where: { id, status: "CANCELLED" },
  });
  if (result.count === 0) {
    throw new ValidationError("Only cancelled appointments can be deleted");
  }
  return result;
}

export async function deleteCancelledAppointments(ids: string[]) {
  const cancelledCount = await prisma.appointment.count({
    where: { id: { in: ids }, status: "CANCELLED" },
  });
  if (cancelledCount !== ids.length) {
    throw new ValidationError("Only cancelled appointments can be deleted");
  }
  return prisma.appointment.deleteMany({
    where: { id: { in: ids }, status: "CANCELLED" },
  });
}

export async function listPublicAppointmentSlots(
  dateKey: string,
  options?: {
    enforceBookingWindow?: boolean;
    clinicId?: string;
    clinicSlug?: string;
    providerId?: string | null;
  }
) {
  const day = parseLocalDateKey(dateKey);
  if (!day) {
    throw new ValidationError("Date is invalid");
  }

  const today = startOfLocalDay();
  if (day < today) {
    throw new ValidationError("Date must be today or in the future");
  }

  const enforceWindow = options?.enforceBookingWindow !== false;
  if (enforceWindow && isOutsidePublicBookingWindow(day)) {
    throw new ValidationError(
      `Bookings are only open for the next ${BOOKING_MAX_DAYS_AHEAD} days`
    );
  }

  let resolvedClinicId: string;
  if (options?.clinicId) {
    resolvedClinicId = options.clinicId;
  } else if (options?.clinicSlug?.trim()) {
    const clinic = await getClinicBySlug(options.clinicSlug.trim());
    if (!clinic) throw new ValidationError("Clinic not found");
    resolvedClinicId = clinic.id;
  } else {
    resolvedClinicId = (await getClinicSettings()).clinicId;
  }

  const providerSchedule = await resolveScheduleForSlots(options?.providerId, resolvedClinicId);
  const slotMinutes = providerSchedule?.slotMinutes ?? BOOKING_SLOT_MINUTES;
  const workDays = providerSchedule?.workDays;

  const closedByDay = providerSchedule
    ? !isProviderWorkDay(day, workDays ?? [])
    : isClinicClosedDay(day);

  if (closedByDay) {
    const settings = await getClinicSettings(resolvedClinicId);
    const lunch = providerSchedule?.schedule ?? {
      lunchStartHour: settings.lunchStartHour,
      lunchEndHour: settings.lunchEndHour,
    };
    return {
      date: toLocalDateKey(day),
      closed: true,
      slotMinutes,
      workDays: workDays ?? [],
      lunchStartHour: lunch.lunchStartHour,
      lunchEndHour: lunch.lunchEndHour,
      maxDate: toLocalDateKey(getPublicBookingMaxDate()),
      slots: [] as {
        value: string;
        label12: string;
        label24: string;
        available: boolean;
      }[],
    };
  }

  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId: resolvedClinicId,
      ...(options?.providerId?.trim() ? { providerId: options.providerId.trim() } : {}),
      dateTime: { gte: start, lte: end },
      status: { not: "CANCELLED" },
    },
    select: { dateTime: true, durationMinutes: true },
  });

  const now = Date.now();
  const settings = await getClinicSettings(resolvedClinicId);
  const resolved = providerSchedule?.schedule;
  const lunch = resolved
    ? {
        lunchStartHour: resolved.lunchStartHour,
        lunchEndHour: resolved.lunchEndHour,
      }
    : {
        lunchStartHour: settings.lunchStartHour,
        lunchEndHour: settings.lunchEndHour,
      };
  const dayStartHour = resolved?.workStartHour ?? undefined;
  const dayEndHour = resolved?.workEndHour ?? undefined;

  const slots = generateDaySlots({
    ...lunch,
    dayStartHour,
    dayEndHour,
    slotMinutes,
  }).map((slot) => {
    const slotStart = new Date(day);
    slotStart.setHours(slot.hours, slot.minutes, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60_000);

    const overlaps = appointments.some((appointment) => {
      const apptStart = appointment.dateTime.getTime();
      const apptEnd = apptStart + appointment.durationMinutes * 60_000;
      return slotStart.getTime() < apptEnd && slotEnd.getTime() > apptStart;
    });

    return {
      value: slot.value,
      label12: slot.label12,
      label24: slot.label24,
      available: !overlaps && slotStart.getTime() > now,
    };
  });

  return {
    date: toLocalDateKey(day),
    closed: false,
    slotMinutes,
    workDays: workDays ?? [],
    lunchStartHour: lunch.lunchStartHour,
    lunchEndHour: lunch.lunchEndHour,
    maxDate: toLocalDateKey(getPublicBookingMaxDate()),
    slots,
  };
}

export async function createPublicAppointment(input: {
  name: string;
  phone: string;
  email?: string | null;
  dateTime: string;
  notes?: string | null;
  paymentPreference: "ONLINE" | "COUNTER";
  clinicSlug?: string | null;
  providerId?: string | null;
}) {
  const dateTime = assertValidDateTime(input.dateTime, "Preferred date & time");
  if (dateTime.getTime() < Date.now()) {
    throw new ValidationError("Preferred date & time must be in the future");
  }
  if (isOutsidePublicBookingWindow(dateTime)) {
    throw new ValidationError(
      `Bookings are only open for the next ${BOOKING_MAX_DAYS_AHEAD} days`
    );
  }

  let clinicId: string;
  if (input.clinicSlug?.trim()) {
    const clinic = await getClinicBySlug(input.clinicSlug.trim());
    if (!clinic) throw new ValidationError("Clinic not found");
    clinicId = clinic.id;
  } else {
    clinicId = (await getClinicSettings()).clinicId;
  }

  // Optional: patient picked a specific doctor. Then that doctor's own schedule rules apply.
  const providerId = emptyToNull(input.providerId);
  let doctorSchedule: Awaited<ReturnType<typeof resolveScheduleForSlots>> = null;
  if (providerId) {
    const doctor = await prisma.provider.findFirst({
      where: { id: providerId, clinicId, providerType: "DOCTOR", active: true },
      select: { id: true },
    });
    if (!doctor) throw new ValidationError("The selected doctor is not available");
    doctorSchedule = await resolveScheduleForSlots(providerId, clinicId);
  }

  const settings = await getClinicSettings(clinicId);
  const lunch = doctorSchedule
    ? {
        lunchStartHour: doctorSchedule.schedule.lunchStartHour,
        lunchEndHour: doctorSchedule.schedule.lunchEndHour,
      }
    : normalizeLunchHours(settings.lunchStartHour, settings.lunchEndHour);
  const slotMinutes = doctorSchedule?.slotMinutes ?? BOOKING_SLOT_MINUTES;
  const dayStartHour = doctorSchedule?.schedule.workStartHour ?? 9;
  const dayEndHour = doctorSchedule?.schedule.workEndHour ?? 18;

  if (doctorSchedule) {
    if (!isProviderWorkDay(dateTime, doctorSchedule.workDays)) {
      throw new ValidationError("This doctor is not available on the selected day");
    }
  } else if (isClinicClosedDay(dateTime)) {
    throw new ValidationError("The clinic is closed on Sundays");
  }

  const hour = dateTime.getHours();
  if (hour >= lunch.lunchStartHour && hour < lunch.lunchEndHour) {
    throw new ValidationError("That time falls in the lunch break");
  }
  if (hour < dayStartHour || hour >= dayEndHour) {
    throw new ValidationError("Please choose a time during clinic hours");
  }

  const patient = await findOrCreatePatientByPhone(input, clinicId);

  return prisma.$transaction(async (tx) => {
    const slotEnd = new Date(dateTime.getTime() + slotMinutes * 60_000);
    const dayStart = startOfLocalDay(dateTime);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    // With a doctor chosen, only that doctor's bookings block the slot.
    const sameDay = await tx.appointment.findMany({
      where: {
        clinicId,
        ...(providerId ? { providerId } : {}),
        dateTime: { gte: dayStart, lte: dayEnd },
        status: { not: "CANCELLED" },
      },
      select: { dateTime: true, durationMinutes: true },
    });
    const overlaps = sameDay.some((appointment) => {
      const apptStart = appointment.dateTime.getTime();
      const apptEnd = apptStart + appointment.durationMinutes * 60_000;
      return dateTime.getTime() < apptEnd && slotEnd.getTime() > apptStart;
    });
    if (overlaps) {
      throw new ValidationError("That time slot is no longer available");
    }

    const bookingReference = await allocateBookingReference(tx);
    const appointment = await tx.appointment.create({
      data: {
        clinicId,
        patientId: patient.id,
        providerId,
        dateTime,
        durationMinutes: slotMinutes,
        status: "PENDING",
        source: "WEBSITE",
        paymentPreference: input.paymentPreference,
        notes: emptyToNull(input.notes),
        bookingReference,
      },
      include: { patient: true },
    });

    await writeAuditLog({
      actorEmail: emptyToNull(input.email),
      action: "PUBLIC_APPOINTMENT_CREATED",
      entityType: "Appointment",
      entityId: appointment.id,
      metadata: {
        bookingReference,
        patientId: patient.id,
        paymentPreference: input.paymentPreference,
        ...(providerId ? { providerId } : {}),
      },
    });

    return appointment;
  });
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

function buildPaymentWhere(filters?: {
  method?: string;
  q?: string;
  includeVoided?: boolean;
  viewer?: TenantViewer;
  filterClinicId?: string;
}): Prisma.PaymentWhereInput {
  const where: Prisma.PaymentWhereInput = filters?.includeVoided ? {} : { voidedAt: null };
  if (filters?.method) {
    where.method = filters.method as Prisma.EnumPaymentMethodFilter["equals"];
  }
  if (filters?.q) {
    where.OR = [
      { patient: { name: { contains: filters.q, mode: "insensitive" } } },
      { patient: { phone: { contains: filters.q } } },
      { notes: { contains: filters.q, mode: "insensitive" } },
      { receiptNumber: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  const scoped = mergeClinicScope(where, filters?.viewer, filters?.filterClinicId);
  if (isDoctorViewer(filters?.viewer) && filters?.viewer?.providerId) {
    return {
      AND: [scoped, { patient: doctorPatientWhere(filters.viewer.providerId) }],
    };
  }
  return scoped;
}

export async function listPayments(filters?: {
  method?: string;
  q?: string;
  includeVoided?: boolean;
  viewer?: TenantViewer;
  filterClinicId?: string;
}) {
  const where = buildPaymentWhere(filters);
  return prisma.payment.findMany({
    where,
    include: { patient: true, appointment: true },
    orderBy: { paidAt: "desc" },
    take: 500,
  });
}

export async function listPaymentsPage(filters: {
  method?: string;
  q?: string;
  includeVoided?: boolean;
  skip: number;
  take: number;
  viewer?: TenantViewer;
  filterClinicId?: string;
}) {
  const where = buildPaymentWhere(filters);
  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { patient: true, appointment: true },
      orderBy: { paidAt: "desc" },
      skip: filters.skip,
      take: filters.take,
    }),
    prisma.payment.count({ where }),
  ]);
  return { items, total };
}

export async function getPayment(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: {
      patient: true,
      appointment: { select: { id: true, dateTime: true } },
    },
  });
}

export async function createPayment(
  data: PaymentInput,
  viewer?: TenantViewer,
  explicitClinicId?: string
) {
  const appointmentId = emptyToNull(data.appointmentId);
  const paidAt = data.paidAt ? assertValidDateTime(data.paidAt, "Paid at") : new Date();

  return prisma.$transaction(async (tx) => {
    const patient = await tx.patient.findUnique({
      where: { id: data.patientId },
      select: { clinicId: true },
    });
    if (!patient) throw new ValidationError("Patient not found");

    const clinicId = viewer
      ? requireClinicIdForWrite(viewer, explicitClinicId ?? patient.clinicId)
      : explicitClinicId ?? patient.clinicId;
    if (patient.clinicId !== clinicId) {
      throw new ValidationError("Patient does not belong to this clinic");
    }

    if (appointmentId) {
      await assertAppointmentBelongsToPatient(appointmentId, data.patientId, tx);
    }

    const receiptNumber = await allocateReceiptNumber(tx);

    return tx.payment.create({
      data: {
        clinicId,
        patientId: data.patientId,
        appointmentId,
        amount: data.amount,
        method: data.method,
        paidAt,
        notes: emptyToNull(data.notes),
        receiptNumber,
      },
      include: { patient: true, appointment: true },
    });
  });
}

export async function updatePayment(id: string, data: PaymentInput) {
  const appointmentId = emptyToNull(data.appointmentId);
  // Only touch paidAt when the caller actually supplied a value — omitting
  // it must never silently reset the original payment date to "now".
  const paidAt = data.paidAt ? assertValidDateTime(data.paidAt, "Paid at") : undefined;

  if (appointmentId) {
    await assertAppointmentBelongsToPatient(appointmentId, data.patientId);
  }

  return prisma.payment.update({
    where: { id },
    data: {
      patientId: data.patientId,
      appointmentId,
      amount: data.amount,
      method: data.method,
      ...(paidAt ? { paidAt } : {}),
      notes: emptyToNull(data.notes),
    },
    include: { patient: true, appointment: true },
  });
}

export async function voidPayment(id: string, reason: string, actor: Actor) {
  const existing = await prisma.payment.findUnique({ where: { id }, select: { voidedAt: true } });
  if (!existing) throw new ValidationError("Payment not found");
  if (existing.voidedAt) throw new ValidationError("Payment is already voided");

  const payment = await prisma.payment.update({
    where: { id },
    data: {
      voidedAt: new Date(),
      voidReason: reason.trim(),
      voidedByUserId: actor.userId ?? null,
    },
  });

  await writeAuditLog({
    actorUserId: actor.userId,
    actorEmail: actor.email,
    action: "PAYMENT_VOIDED",
    entityType: "Payment",
    entityId: id,
    metadata: { reason },
  });

  return payment;
}

export async function voidPayments(ids: string[], reason: string, actor: Actor) {
  const result = await prisma.payment.updateMany({
    where: { id: { in: ids }, voidedAt: null },
    data: {
      voidedAt: new Date(),
      voidReason: reason.trim(),
      voidedByUserId: actor.userId ?? null,
    },
  });

  await writeAuditLog({
    actorUserId: actor.userId,
    actorEmail: actor.email,
    action: "PAYMENT_BULK_VOIDED",
    entityType: "Payment",
    metadata: { ids, reason, count: result.count },
  });

  return result;
}

// ---------------------------------------------------------------------------
// Expenses & finance
// ---------------------------------------------------------------------------

function buildExpenseWhere(filters?: {
  category?: string;
  method?: string;
  q?: string;
  includeVoided?: boolean;
  from?: string;
  to?: string;
  viewer?: TenantViewer;
  filterClinicId?: string;
}): Prisma.ExpenseWhereInput {
  const where: Prisma.ExpenseWhereInput = filters?.includeVoided ? {} : { voidedAt: null };
  if (filters?.category) {
    where.category = filters.category as Prisma.EnumExpenseCategoryFilter["equals"];
  }
  if (filters?.method) {
    where.method = filters.method as Prisma.EnumPaymentMethodFilter["equals"];
  }
  const range = resolveFinanceDateRange(filters?.from, filters?.to);
  where.paidAt = { gte: range.start, lte: range.end };
  if (filters?.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { vendor: { contains: filters.q, mode: "insensitive" } },
      { notes: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  return mergeClinicScope(where, filters?.viewer, filters?.filterClinicId);
}

export async function listExpensesPage(filters: {
  category?: string;
  method?: string;
  q?: string;
  includeVoided?: boolean;
  from?: string;
  to?: string;
  skip: number;
  take: number;
  viewer?: TenantViewer;
  filterClinicId?: string;
}) {
  const where = buildExpenseWhere(filters);
  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { paidAt: "desc" },
      skip: filters.skip,
      take: filters.take,
    }),
    prisma.expense.count({ where }),
  ]);
  return { items, total };
}

export async function getExpense(id: string) {
  return prisma.expense.findUnique({ where: { id } });
}

export async function createExpense(
  data: ExpenseInput,
  viewer?: TenantViewer,
  explicitClinicId?: string
) {
  const paidAt = data.paidAt ? assertValidDateTime(data.paidAt, "Paid at") : new Date();
  const clinicId = await resolveClinicIdForWrite(viewer, explicitClinicId);

  return prisma.expense.create({
    data: {
      clinicId,
      title: data.title.trim(),
      category: data.category,
      amount: data.amount,
      vendor: emptyToNull(data.vendor),
      method: data.method,
      paidAt,
      notes: emptyToNull(data.notes),
    },
  });
}

export async function updateExpense(id: string, data: ExpenseInput) {
  const existing = await prisma.expense.findUnique({
    where: { id },
    select: { voidedAt: true },
  });
  if (!existing) throw new ValidationError("Expense not found");
  if (existing.voidedAt) throw new ValidationError("Voided expenses cannot be edited");

  const paidAt = data.paidAt ? assertValidDateTime(data.paidAt, "Paid at") : undefined;

  return prisma.expense.update({
    where: { id },
    data: {
      title: data.title.trim(),
      category: data.category,
      amount: data.amount,
      vendor: emptyToNull(data.vendor),
      method: data.method,
      ...(paidAt ? { paidAt } : {}),
      notes: emptyToNull(data.notes),
    },
  });
}

export async function voidExpense(id: string, reason: string, actor: Actor) {
  const existing = await prisma.expense.findUnique({ where: { id }, select: { voidedAt: true } });
  if (!existing) throw new ValidationError("Expense not found");
  if (existing.voidedAt) throw new ValidationError("Expense is already voided");

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      voidedAt: new Date(),
      voidReason: reason.trim(),
      voidedByUserId: actor.userId ?? null,
    },
  });

  await writeAuditLog({
    actorUserId: actor.userId,
    actorEmail: actor.email,
    action: "EXPENSE_VOIDED",
    entityType: "Expense",
    entityId: id,
    metadata: { reason },
  });

  return expense;
}

export async function getFinanceSummary(
  range?: { from?: string; to?: string },
  options?: { viewer?: TenantViewer; filterClinicId?: string }
) {
  const { start, end, from, to } = resolveFinanceDateRange(range?.from, range?.to);
  const activePayment = { voidedAt: null } as const;
  const activeExpense = { voidedAt: null } as const;
  const paidAtRange = { gte: start, lte: end };
  const clinicScope = tenantClinicScope(options?.viewer, options?.filterClinicId);

  const [revenueAgg, expenseAgg] = await Promise.all([
    prisma.payment.aggregate({
      where: { ...activePayment, paidAt: paidAtRange, ...clinicScope },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { ...activeExpense, paidAt: paidAtRange, ...clinicScope },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const revenue = Number(revenueAgg._sum?.amount ?? 0);
  const expenses = Number(expenseAgg._sum?.amount ?? 0);

  return {
    from,
    to,
    revenue,
    revenueCount: revenueAgg._count,
    expenses,
    expenseCount: expenseAgg._count,
    profit: revenue - expenses,
  };
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

function buildReminderWhere(filters?: {
  status?: string;
  q?: string;
  viewer?: TenantViewer;
  filterClinicId?: string;
}): Prisma.ReminderWhereInput {
  const where: Prisma.ReminderWhereInput = {};
  if (filters?.status) {
    where.status = filters.status as Prisma.EnumReminderStatusFilter["equals"];
  }
  if (filters?.q) {
    where.OR = [
      { patient: { name: { contains: filters.q, mode: "insensitive" } } },
      { message: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  const scoped = mergeClinicScope(where, filters?.viewer, filters?.filterClinicId);
  if (isDoctorViewer(filters?.viewer) && filters?.viewer?.providerId) {
    return {
      AND: [scoped, { patient: doctorPatientWhere(filters.viewer.providerId) }],
    };
  }
  return scoped;
}

export async function listReminders(filters?: {
  status?: string;
  q?: string;
  viewer?: TenantViewer;
  filterClinicId?: string;
}) {
  const where = buildReminderWhere(filters);
  return prisma.reminder.findMany({
    where,
    include: { patient: true, appointment: true },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 500,
  });
}

export async function listRemindersPage(filters: {
  status?: string;
  q?: string;
  skip: number;
  take: number;
  viewer?: TenantViewer;
  filterClinicId?: string;
}) {
  const where = buildReminderWhere(filters);
  const [items, total] = await Promise.all([
    prisma.reminder.findMany({
      where,
      include: { patient: true, appointment: true },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      skip: filters.skip,
      take: filters.take,
    }),
    prisma.reminder.count({ where }),
  ]);
  return { items, total };
}

export async function createReminder(
  data: ReminderInput,
  viewer?: TenantViewer,
  explicitClinicId?: string
) {
  const appointmentId = emptyToNull(data.appointmentId);
  const dueAt = assertValidDateTime(data.dueAt, "Due date");

  const patient = await prisma.patient.findUnique({
    where: { id: data.patientId },
    select: { clinicId: true },
  });
  if (!patient) throw new ValidationError("Patient not found");

  const clinicId = viewer
    ? requireClinicIdForWrite(viewer, explicitClinicId ?? patient.clinicId)
    : explicitClinicId ?? patient.clinicId;
  if (patient.clinicId !== clinicId) {
    throw new ValidationError("Patient does not belong to this clinic");
  }

  if (appointmentId) {
    await assertAppointmentBelongsToPatient(appointmentId, data.patientId);
  }

  return prisma.reminder.create({
    data: {
      clinicId,
      patientId: data.patientId,
      appointmentId,
      dueAt,
      message: data.message.trim(),
      status: data.status,
    },
    include: { patient: true },
  });
}

export async function updateReminderStatus(id: string, status: "PENDING" | "DONE") {
  return prisma.reminder.update({
    where: { id },
    data: { status },
  });
}

export async function deleteReminder(id: string) {
  return prisma.reminder.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Prescriptions
// ---------------------------------------------------------------------------

export async function listPrescriptions(options?: {
  viewer?: TenantViewer;
  filterClinicId?: string;
}) {
  const where: Prisma.PrescriptionWhereInput = mergeClinicScope(
    {},
    options?.viewer,
    options?.filterClinicId
  );
  return prisma.prescription.findMany({
    where,
    include: {
      patient: true,
      items: { include: { medicine: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}

export async function listPrescriptionsPage(filters: {
  q?: string;
  skip: number;
  take: number;
  viewer?: TenantViewer;
  filterClinicId?: string;
}) {
  const where: Prisma.PrescriptionWhereInput = mergeClinicScope(
    filters.q
      ? {
          OR: [
            { patient: { name: { contains: filters.q, mode: "insensitive" } } },
            { diagnosis: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {},
    filters.viewer,
    filters.filterClinicId
  );
  const [items, total] = await Promise.all([
    prisma.prescription.findMany({
      where,
      include: {
        patient: true,
        items: { include: { medicine: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: filters.skip,
      take: filters.take,
    }),
    prisma.prescription.count({ where }),
  ]);
  return { items, total };
}

export async function getPrescription(id: string) {
  return prisma.prescription.findUnique({
    where: { id },
    include: {
      patient: true,
      appointment: true,
      items: { include: { medicine: true } },
    },
  });
}

function dispenseQuantitiesByMedicine(items: PrescriptionInput["items"]) {
  const map = new Map<string, number>();
  for (const item of items) {
    if (item.quantity && Number.isFinite(item.quantity) && item.quantity > 0) {
      map.set(item.medicineId, (map.get(item.medicineId) ?? 0) + item.quantity);
    }
  }
  return map;
}

export async function createPrescription(
  data: PrescriptionInput,
  actor?: Actor,
  viewer?: TenantViewer,
  explicitClinicId?: string
) {
  const appointmentId = emptyToNull(data.appointmentId);

  return prisma.$transaction(async (tx) => {
    const patient = await tx.patient.findUnique({
      where: { id: data.patientId },
      select: { clinicId: true },
    });
    if (!patient) throw new ValidationError("Patient not found");

    const clinicId = viewer
      ? requireClinicIdForWrite(viewer, explicitClinicId ?? patient.clinicId)
      : explicitClinicId ?? patient.clinicId;
    if (patient.clinicId !== clinicId) {
      throw new ValidationError("Patient does not belong to this clinic");
    }

    if (appointmentId) {
      await assertAppointmentBelongsToPatient(appointmentId, data.patientId, tx);
    }

    const needed = dispenseQuantitiesByMedicine(data.items);
    for (const [medicineId, quantity] of needed) {
      const medicine = await tx.medicine.findUnique({ where: { id: medicineId } });
      if (!medicine) throw new ValidationError("Medicine not found");
      if (medicine.stock < quantity) {
        throw new ValidationError(
          `Insufficient stock for ${medicine.name} (have ${medicine.stock}, need ${quantity})`
        );
      }
    }

    const prescription = await tx.prescription.create({
      data: {
        clinicId,
        patientId: data.patientId,
        appointmentId,
        diagnosis: emptyToNull(data.diagnosis),
        notes: emptyToNull(data.notes),
        items: {
          create: data.items.map((item) => ({
            medicineId: item.medicineId,
            dosage: item.dosage.trim(),
            duration: emptyToNull(item.duration),
            instructions: emptyToNull(item.instructions),
            quantity: item.quantity && Number.isFinite(item.quantity) ? item.quantity : null,
          })),
        },
      },
      include: {
        patient: true,
        items: { include: { medicine: true } },
      },
    });

    for (const [medicineId, quantity] of needed) {
      await tx.medicine.update({
        where: { id: medicineId },
        data: { stock: { decrement: quantity } },
      });
      await tx.inventoryTransaction.create({
        data: {
          medicineId,
          type: "DISPENSE",
          quantity: -quantity,
          prescriptionId: prescription.id,
          createdByUserId: actor?.userId ?? null,
        },
      });
    }

    await writeAuditLog({
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: "PRESCRIPTION_CREATED",
      entityType: "Prescription",
      entityId: prescription.id,
    });

    return prescription;
  });
}

export async function updatePrescription(id: string, data: PrescriptionInput, actor?: Actor) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.prescription.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) throw new ValidationError("Prescription not found");

    const appointmentId = emptyToNull(data.appointmentId);
    if (appointmentId) {
      await assertAppointmentBelongsToPatient(appointmentId, data.patientId, tx);
    }

    // Reconcile stock by netting what was previously dispensed against what
    // the amended prescription now needs, per medicine.
    const previouslyDispensed = new Map<string, number>();
    for (const item of existing.items) {
      if (item.quantity) {
        previouslyDispensed.set(
          item.medicineId,
          (previouslyDispensed.get(item.medicineId) ?? 0) + item.quantity
        );
      }
    }
    const nowNeeded = dispenseQuantitiesByMedicine(data.items);

    const medicineIds = new Set([...previouslyDispensed.keys(), ...nowNeeded.keys()]);
    const netStockDeltas = new Map<string, number>();
    for (const medicineId of medicineIds) {
      const previous = previouslyDispensed.get(medicineId) ?? 0;
      const next = nowNeeded.get(medicineId) ?? 0;
      // Positive delta = stock returned; negative = additional stock needed.
      netStockDeltas.set(medicineId, previous - next);
    }

    for (const [medicineId, delta] of netStockDeltas) {
      if (delta >= 0) continue;
      const medicine = await tx.medicine.findUnique({ where: { id: medicineId } });
      if (!medicine) throw new ValidationError("Medicine not found");
      if (medicine.stock + delta < 0) {
        throw new ValidationError(`Insufficient stock for ${medicine.name} to amend prescription`);
      }
    }

    for (const [medicineId, delta] of netStockDeltas) {
      if (delta === 0) continue;
      await tx.medicine.update({
        where: { id: medicineId },
        data: { stock: { increment: delta } },
      });
      await tx.inventoryTransaction.create({
        data: {
          medicineId,
          type: delta > 0 ? "REVERSAL" : "DISPENSE",
          quantity: delta,
          prescriptionId: id,
          createdByUserId: actor?.userId ?? null,
          note: "Prescription amended",
        },
      });
    }

    await tx.prescriptionItem.deleteMany({ where: { prescriptionId: id } });

    const updated = await tx.prescription.update({
      where: { id },
      data: {
        patientId: data.patientId,
        appointmentId,
        diagnosis: emptyToNull(data.diagnosis),
        notes: emptyToNull(data.notes),
        items: {
          create: data.items.map((item) => ({
            medicineId: item.medicineId,
            dosage: item.dosage.trim(),
            duration: emptyToNull(item.duration),
            instructions: emptyToNull(item.instructions),
            quantity: item.quantity && Number.isFinite(item.quantity) ? item.quantity : null,
          })),
        },
      },
      include: {
        patient: true,
        items: { include: { medicine: true } },
      },
    });

    await writeAuditLog({
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: "PRESCRIPTION_UPDATED",
      entityType: "Prescription",
      entityId: id,
    });

    return updated;
  });
}

export async function deletePrescription(id: string, actor?: Actor) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.prescription.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) throw new ValidationError("Prescription not found");

    for (const item of existing.items) {
      if (!item.quantity) continue;
      await tx.medicine.update({
        where: { id: item.medicineId },
        data: { stock: { increment: item.quantity } },
      });
      await tx.inventoryTransaction.create({
        data: {
          medicineId: item.medicineId,
          type: "REVERSAL",
          quantity: item.quantity,
          prescriptionId: id,
          createdByUserId: actor?.userId ?? null,
          note: "Prescription deleted",
        },
      });
    }

    const deleted = await tx.prescription.delete({ where: { id } });

    await writeAuditLog({
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: "PRESCRIPTION_DELETED",
      entityType: "Prescription",
      entityId: id,
    });

    return deleted;
  });
}

// ---------------------------------------------------------------------------
// Clinical history: allergies, conditions, encounters
// ---------------------------------------------------------------------------

export async function listPatientAllergies(patientId: string) {
  return prisma.patientAllergy.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPatientAllergy(patientId: string, data: PatientAllergyInput) {
  return prisma.patientAllergy.create({
    data: {
      patientId,
      name: data.name.trim(),
      severity: emptyToNull(data.severity),
      notes: emptyToNull(data.notes),
    },
  });
}

export async function deletePatientAllergy(patientId: string, allergyId: string) {
  const result = await prisma.patientAllergy.deleteMany({
    where: { id: allergyId, patientId },
  });
  if (result.count === 0) throw new ValidationError("Allergy not found");
  return result;
}

export async function listPatientConditions(patientId: string) {
  return prisma.patientCondition.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPatientCondition(patientId: string, data: PatientConditionInput) {
  return prisma.patientCondition.create({
    data: {
      patientId,
      name: data.name.trim(),
      status: data.status,
      notes: emptyToNull(data.notes),
    },
  });
}

export async function updatePatientCondition(
  patientId: string,
  conditionId: string,
  data: PatientConditionInput
) {
  const result = await prisma.patientCondition.updateMany({
    where: { id: conditionId, patientId },
    data: {
      name: data.name.trim(),
      status: data.status,
      notes: emptyToNull(data.notes),
    },
  });
  if (result.count === 0) throw new ValidationError("Condition not found");
  return prisma.patientCondition.findUnique({ where: { id: conditionId } });
}

export async function deletePatientCondition(patientId: string, conditionId: string) {
  const result = await prisma.patientCondition.deleteMany({
    where: { id: conditionId, patientId },
  });
  if (result.count === 0) throw new ValidationError("Condition not found");
  return result;
}

export async function listPatientEncounters(patientId: string) {
  return prisma.encounter.findMany({
    where: { patientId },
    orderBy: { visitedAt: "desc" },
    include: { provider: true, appointment: { select: { id: true, dateTime: true } } },
  });
}

export async function createEncounter(patientId: string, data: EncounterInput) {
  const appointmentId = emptyToNull(data.appointmentId);
  if (appointmentId) {
    await assertAppointmentBelongsToPatient(appointmentId, patientId);
  }

  return prisma.encounter.create({
    data: {
      patientId,
      appointmentId,
      providerId: emptyToNull(data.providerId),
      visitedAt: data.visitedAt ? assertValidDateTime(data.visitedAt, "Visited at") : new Date(),
      chiefComplaint: emptyToNull(data.chiefComplaint),
      notes: emptyToNull(data.notes),
      vitalsJson: (data.vitalsJson as Prisma.InputJsonValue | undefined) ?? undefined,
    },
    include: { provider: true },
  });
}

export async function updateEncounter(
  patientId: string,
  encounterId: string,
  data: EncounterInput
) {
  const existing = await prisma.encounter.findFirst({ where: { id: encounterId, patientId } });
  if (!existing) throw new ValidationError("Encounter not found");

  const appointmentId = emptyToNull(data.appointmentId);
  if (appointmentId) {
    await assertAppointmentBelongsToPatient(appointmentId, patientId);
  }

  return prisma.encounter.update({
    where: { id: encounterId },
    data: {
      appointmentId,
      providerId: emptyToNull(data.providerId),
      visitedAt: data.visitedAt
        ? assertValidDateTime(data.visitedAt, "Visited at")
        : existing.visitedAt,
      chiefComplaint: emptyToNull(data.chiefComplaint),
      notes: emptyToNull(data.notes),
      vitalsJson: (data.vitalsJson as Prisma.InputJsonValue | undefined) ?? undefined,
    },
    include: { provider: true },
  });
}

export async function deleteEncounter(patientId: string, encounterId: string) {
  const result = await prisma.encounter.deleteMany({ where: { id: encounterId, patientId } });
  if (result.count === 0) throw new ValidationError("Encounter not found");
  return result;
}

// ---------------------------------------------------------------------------
// Contact messages
// ---------------------------------------------------------------------------

export async function listContactMessages(options?: {
  viewer?: TenantViewer;
  filterClinicId?: string;
}) {
  const where: Prisma.ContactMessageWhereInput = mergeClinicScope(
    {},
    options?.viewer,
    options?.filterClinicId
  );
  return prisma.contactMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}

export async function listContactMessagesPage(filters: {
  q?: string;
  skip: number;
  take: number;
  viewer?: TenantViewer;
  filterClinicId?: string;
}) {
  const where: Prisma.ContactMessageWhereInput = mergeClinicScope(
    filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" } },
            { email: { contains: filters.q, mode: "insensitive" } },
            { subject: { contains: filters.q, mode: "insensitive" } },
            { message: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {},
    filters.viewer,
    filters.filterClinicId
  );
  const [items, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: filters.skip,
      take: filters.take,
    }),
    prisma.contactMessage.count({ where }),
  ]);
  return { items, total };
}

export async function markMessageRead(id: string, read = true) {
  return prisma.contactMessage.update({
    where: { id },
    data: { read },
  });
}

export async function createContactMessage(
  input: {
    name: string;
    email?: string | null;
    phone?: string | null;
    subject?: string | null;
    message: string;
  },
  clinicId?: string
) {
  const resolvedClinicId = clinicId ?? (await getClinicSettings()).clinicId;
  return prisma.contactMessage.create({
    data: {
      clinicId: resolvedClinicId,
      name: input.name.trim(),
      email: emptyToNull(input.email?.trim().toLowerCase()),
      phone: emptyToNull(input.phone),
      subject: emptyToNull(input.subject),
      message: input.message.trim(),
    },
  });
}

// ---------------------------------------------------------------------------
// Clinic settings
// ---------------------------------------------------------------------------

export async function getClinicSettings(clinicId?: string) {
  if (clinicId) {
    const existing = await prisma.clinicSetting.findUnique({ where: { clinicId } });
    if (existing) return existing;
    await seedClinicDefaults(clinicId);
    return prisma.clinicSetting.findUniqueOrThrow({ where: { clinicId } });
  }

  const fallback = await prisma.clinicSetting.findFirst({ orderBy: { createdAt: "asc" } });
  if (fallback) return fallback;

  const clinic =
    (await prisma.clinic.findFirst({ orderBy: { createdAt: "asc" } })) ??
    (await prisma.clinic.create({
      data: {
        name: "CarePlus Clinic",
        slug: "careplus-clinic",
      },
    }));

  await seedClinicDefaults(clinic.id, clinic.name);
  return prisma.clinicSetting.findUniqueOrThrow({ where: { clinicId: clinic.id } });
}

export async function updateClinicSettings(
  data: {
    clinicName: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    description?: string | null;
    logoUrl?: string | null;
    headerBrandMode?: "ICON_AND_TEXT" | "FULL_IMAGE" | null;
    patientReferenceTemplate?: string | null;
    lunchStartHour?: number | null;
    lunchEndHour?: number | null;
  },
  actor?: Actor,
  viewer?: TenantViewer,
  explicitClinicId?: string
) {
  const templateRaw =
    data.patientReferenceTemplate?.trim() || DEFAULT_PATIENT_REFERENCE_TEMPLATE;
  const parsed = parsePatientReferenceTemplate(templateRaw);
  if (!parsed.ok) {
    throw new ValidationError(parsed.error);
  }

  const headerBrandMode = data.headerBrandMode === "FULL_IMAGE" ? "FULL_IMAGE" : "ICON_AND_TEXT";
  if (headerBrandMode === "FULL_IMAGE" && !emptyToNull(data.logoUrl)) {
    throw new ValidationError("Logo image URL is required for full-image header branding");
  }

  const lunch = normalizeLunchHours(data.lunchStartHour, data.lunchEndHour);

  const clinicId = viewer
    ? requireClinicIdForWrite(viewer, explicitClinicId)
    : explicitClinicId ?? (await getClinicSettings()).clinicId;
  const current = await getClinicSettings(clinicId);
  const updated = await prisma.clinicSetting.update({
    where: { id: current.id },
    data: {
      clinicName: data.clinicName.trim(),
      phone: emptyToNull(data.phone),
      email: emptyToNull(data.email),
      address: emptyToNull(data.address),
      description: emptyToNull(data.description),
      logoUrl: emptyToNull(data.logoUrl),
      headerBrandMode,
      patientReferenceTemplate: parsed.template,
      lunchStartHour: lunch.lunchStartHour,
      lunchEndHour: lunch.lunchEndHour,
    },
  });

  await writeAuditLog({
    actorUserId: actor?.userId,
    actorEmail: actor?.email,
    action: "SETTINGS_UPDATED",
    entityType: "ClinicSetting",
    entityId: updated.id,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboardStats(options?: {
  forStaff?: boolean;
  modules?: StaffModuleKey[];
  viewer?: TenantViewer;
  filterClinicId?: string;
}) {
  const forStaff = Boolean(options?.forStaff);
  const modules = options?.modules ?? [];
  const clinicScope = tenantClinicScope(options?.viewer, options?.filterClinicId);
  const doctorScope = doctorDashboardScope(options?.viewer);
  const appointmentScope = { ...clinicScope, ...doctorScope };
  const doctorPatients =
    isDoctorViewer(options?.viewer) && options?.viewer?.providerId
      ? doctorPatientWhere(options.viewer.providerId)
      : null;

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  const needReminders = !forStaff || modules.includes("reminders");
  const needMessages = !forStaff || modules.includes("messages");
  const needMedicines = !forStaff || modules.includes("medicines");

  const [
    todayAppointments,
    todayAppointmentStatusGroups,
    monthAppointmentStatusGroups,
    pendingReminders,
    overdueReminders,
    todayPayments,
    monthPayments,
    weekPayments,
    patientCount,
    newPatientsThisMonth,
    recentPatients,
    unreadMessages,
    allMedicines,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { ...appointmentScope, dateTime: { gte: startOfDay, lte: endOfDay } },
      include: {
        patient: {
          select: { id: true, name: true, phone: true, patientReference: true },
        },
      },
      orderBy: { dateTime: "asc" },
      take: 20,
    }),
    prisma.appointment.groupBy({
      by: ["status"],
      where: { ...appointmentScope, dateTime: { gte: startOfDay, lte: endOfDay } },
      _count: { _all: true },
    }),
    prisma.appointment.groupBy({
      by: ["status"],
      where: { ...appointmentScope, dateTime: { gte: startOfMonth } },
      _count: { _all: true },
    }),
    needReminders
      ? prisma.reminder.count({
          where: {
            ...clinicScope,
            ...(doctorPatients ? { patient: doctorPatients } : {}),
            status: "PENDING",
          },
        })
      : Promise.resolve(0),
    needReminders
      ? prisma.reminder.count({
          where: {
            ...clinicScope,
            ...(doctorPatients ? { patient: doctorPatients } : {}),
            status: "PENDING",
            dueAt: { lt: now },
          },
        })
      : Promise.resolve(0),
    forStaff
      ? Promise.resolve({ _sum: { amount: null }, _count: 0 })
      : prisma.payment.aggregate({
          where: {
            ...clinicScope,
            paidAt: { gte: startOfDay, lte: endOfDay },
            voidedAt: null,
          },
          _sum: { amount: true },
          _count: true,
        }),
    forStaff
      ? Promise.resolve({ _sum: { amount: null }, _count: 0 })
      : prisma.payment.aggregate({
          where: { ...clinicScope, paidAt: { gte: startOfMonth }, voidedAt: null },
          _sum: { amount: true },
          _count: true,
        }),
    forStaff
      ? Promise.resolve([] as { paidAt: Date; amount: Prisma.Decimal }[])
      : prisma.payment.findMany({
          where: {
            ...clinicScope,
            paidAt: { gte: startOfWeek, lte: endOfDay },
            voidedAt: null,
          },
          select: { paidAt: true, amount: true },
        }),
    forStaff && !doctorPatients
      ? Promise.resolve(0)
      : prisma.patient.count({
          where: {
            AND: [
              clinicScope,
              { archivedAt: null },
              ...(doctorPatients ? [doctorPatients] : []),
            ],
          },
        }),
    forStaff && !doctorPatients
      ? Promise.resolve(0)
      : prisma.patient.count({
          where: {
            AND: [
              clinicScope,
              { archivedAt: null },
              { createdAt: { gte: startOfMonth } },
              ...(doctorPatients ? [doctorPatients] : []),
            ],
          },
        }),
    forStaff && !doctorPatients
      ? Promise.resolve(
          [] as {
            id: string;
            name: string;
            phone: string;
            patientReference: string;
            createdAt: Date;
          }[]
        )
      : prisma.patient.findMany({
          where: {
            AND: [
              clinicScope,
              { archivedAt: null },
              ...(doctorPatients ? [doctorPatients] : []),
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            name: true,
            phone: true,
            patientReference: true,
            createdAt: true,
          },
        }),
    needMessages
      ? prisma.contactMessage.count({ where: { ...clinicScope, read: false } })
      : Promise.resolve(0),
    needMedicines
      ? prisma.medicine.findMany({
          where: clinicScope,
          select: {
            id: true,
            name: true,
            strength: true,
            stock: true,
            unit: true,
            reorderLevel: true,
          },
          take: 2000,
        })
      : Promise.resolve(
          [] as {
            id: string;
            name: string;
            strength: string | null;
            stock: number;
            unit: string | null;
            reorderLevel: number;
          }[]
        ),
  ]);

  const statusKeys = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

  function toStatusCounts(
    groups: { status: string; _count: { _all: number } }[]
  ) {
    const map = Object.fromEntries(statusKeys.map((key) => [key, 0])) as Record<
      (typeof statusKeys)[number],
      number
    >;
    for (const group of groups) {
      if (group.status in map) {
        map[group.status as (typeof statusKeys)[number]] = group._count._all;
      }
    }
    return map;
  }

  function localDateKey(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const last7Days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + index);
    return {
      date: localDateKey(day),
      label: new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
      }).format(day),
      amount: 0,
      count: 0,
    };
  });

  const byDay = new Map(last7Days.map((day) => [day.date, day]));
  for (const payment of weekPayments) {
    const key = localDateKey(payment.paidAt);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.amount += Number(payment.amount);
    bucket.count += 1;
  }

  const todayStatusCounts = toStatusCounts(todayAppointmentStatusGroups);
  const monthStatusCounts = toStatusCounts(monthAppointmentStatusGroups);

  const lowStockMedicines = allMedicines
    .filter((medicine) => medicine.stock <= medicine.reorderLevel)
    .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name))
    .slice(0, 6);

  const isDoctor = isDoctorViewer(options?.viewer);
  let doctorRecentPatients: {
    patientId: string;
    name: string;
    patientReference: string;
    visitDate: Date;
    source: string;
    status: string;
  }[] = [];
  let doctorPeriodStats: Record<DoctorStatsPeriod, DoctorPeriodStats> = {
    today: buildPeriodStats([], now),
    week: buildPeriodStats([], now),
    month: buildPeriodStats([], now),
  };
  let doctorReminders: {
    id: string;
    patientId: string;
    patientName: string;
    title: string;
    subtitle: string;
    href: string;
    kind: "reminder" | "note" | "appointment";
  }[] = [];

  if (isDoctor && options?.viewer?.providerId) {
    const weekRange = getStatsPeriodRange("week", now);
    const monthRange = getStatsPeriodRange("month", now);

    const [recentAppointmentRows, weekRows, monthRows, pendingReminderRows, appointmentNoteRows] =
      await Promise.all([
        prisma.appointment.findMany({
          where: {
            ...appointmentScope,
            status: { not: "CANCELLED" },
          },
          orderBy: { dateTime: "desc" },
          take: 40,
          select: {
            id: true,
            patientId: true,
            dateTime: true,
            status: true,
            source: true,
            patient: {
              select: { id: true, name: true, patientReference: true },
            },
          },
        }),
        prisma.appointment.findMany({
          where: {
            ...appointmentScope,
            dateTime: { gte: weekRange.from, lte: weekRange.to },
          },
          select: { status: true, dateTime: true },
        }),
        prisma.appointment.findMany({
          where: {
            ...appointmentScope,
            dateTime: { gte: monthRange.from, lte: monthRange.to },
          },
          select: { status: true, dateTime: true },
        }),
        prisma.reminder.findMany({
          where: {
            ...clinicScope,
            ...(doctorPatients ? { patient: doctorPatients } : {}),
            status: "PENDING",
            dueAt: { gte: startOfDay, lte: weekRange.to },
          },
          include: {
            patient: { select: { id: true, name: true } },
            appointment: { select: { dateTime: true } },
          },
          orderBy: { dueAt: "asc" },
          take: 20,
        }),
        prisma.appointment.findMany({
          where: {
            ...appointmentScope,
            AND: [{ notes: { not: null } }, { notes: { not: "" } }],
          },
          orderBy: { dateTime: "desc" },
          take: 20,
          select: {
            id: true,
            patientId: true,
            notes: true,
            dateTime: true,
            patient: { select: { id: true, name: true } },
          },
        }),
      ]);

    const seenPatients = new Set<string>();
    for (const row of recentAppointmentRows) {
      if (seenPatients.has(row.patientId)) continue;
      seenPatients.add(row.patientId);
      doctorRecentPatients.push({
        patientId: row.patient.id,
        name: row.patient.name,
        patientReference: row.patient.patientReference,
        visitDate: row.dateTime,
        source: row.source,
        status: row.status,
      });
      if (doctorRecentPatients.length >= 15) break;
    }

    doctorPeriodStats = {
      today: buildPeriodStats(
        todayAppointments.map((appt) => ({
          status: appt.status,
          dateTime: appt.dateTime,
        })),
        now
      ),
      week: buildPeriodStats(weekRows, now),
      month: buildPeriodStats(monthRows, now),
    };

    doctorReminders = pendingReminderRows.map((reminder) => ({
      id: reminder.id,
      patientId: reminder.patient.id,
      patientName: reminder.patient.name,
      title: reminder.message,
      subtitle: reminder.appointment
        ? `${reminder.patient.name} · ${new Intl.DateTimeFormat("en-GB", {
            hour: "numeric",
            minute: "2-digit",
          }).format(reminder.appointment.dateTime)}`
        : reminder.patient.name,
      href: `/admin/patients/${reminder.patient.id}`,
      kind: "reminder" as const,
    }));

    for (const appt of appointmentNoteRows) {
      const preview = appt.notes?.trim() ?? "";
      doctorReminders.push({
        id: `note-${appt.id}`,
        patientId: appt.patientId,
        patientName: appt.patient.name,
        title: preview.length > 64 ? `${preview.slice(0, 64)}…` : preview,
        subtitle: `${appt.patient.name} · ${new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(appt.dateTime)}`,
        href: `/admin/appointments/${appt.id}`,
        kind: "note",
      });
    }

    if (doctorReminders.length < 12) {
      for (const appt of todayAppointments) {
        if (doctorReminders.length >= 12) break;
        if (appt.status === "CANCELLED" || appt.status === "COMPLETED") continue;
        const apptTime = new Date(appt.dateTime).getTime();
        if (apptTime < now.getTime() && appt.status !== "PENDING") continue;
        doctorReminders.push({
          id: `appt-${appt.id}`,
          patientId: appt.patientId,
          patientName: appt.patient.name,
          title:
            appt.status === "PENDING"
              ? "Pending appointment confirmation"
              : "Upcoming appointment today",
          subtitle: `${appt.patient.name} · ${new Intl.DateTimeFormat("en-GB", {
            hour: "numeric",
            minute: "2-digit",
          }).format(appt.dateTime)}`,
          href: `/admin/appointments/${appt.id}`,
          kind: "appointment",
        });
      }
    }
  }

  return {
    todayAppointments,
    todayAppointmentCount: Object.values(todayStatusCounts).reduce(
      (sum, count) => sum + count,
      0
    ),
    todayStatusCounts,
    monthStatusCounts,
    pendingReminders,
    overdueReminders,
    todayCollection: Number(todayPayments._sum?.amount ?? 0),
    todayPaymentCount: todayPayments._count,
    monthCollection: Number(monthPayments._sum?.amount ?? 0),
    monthPaymentCount: monthPayments._count,
    last7DaysCollections: last7Days,
    patientCount,
    newPatientsThisMonth,
    recentPatients,
    unreadMessages,
    lowStockMedicines,
    doctorRecentPatients,
    doctorPeriodStats,
    doctorReminders,
  };
}