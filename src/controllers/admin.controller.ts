import { auth } from "@/auth";
import { parsePageParams } from "@/lib/admin-format";
import {
  getRangeForView,
  parseDateKey,
  toDateKey,
  type CalendarView,
} from "@/lib/appointment-calendar";
import { prisma } from "@/lib/prisma";
import { doctorCategoryLabel } from "@/lib/doctor-categories";
import { isDoctorViewer } from "@/lib/doctor-scope";
import type { StaffModuleKey } from "@/lib/staff-modules";
import { loadTenantRequestContext, tenantListOptions } from "@/controllers/tenant-context";
import {
  assertPatientVisibleToViewer,
  getAppointment,
  getClinicSettings,
  getDashboardStats,
  getMedicine,
  getPatient,
  getPatientTracking,
  getPayment,
  getPrescription,
  getStaffModuleAccessByUserId,
  listAppointments,
  listAppointmentsPage,
  listContactMessagesPage,
  listExpensesPage,
  listInventoryTransactions,
  listMedicines,
  listMedicinesPage,
  listPatients,
  listPatientsPage,
  listPaymentsPage,
  listPrescriptionsPage,
  listProviders,
  listRemindersPage,
  getFinanceSummary,
} from "@/services/clinic.service";

export async function loadAdminDashboard(search?: { clinicId?: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      stats: await getDashboardStats(),
      role: "ADMIN" as const,
      modules: [] as StaffModuleKey[],
      isStaff: false,
      isDoctor: false,
      doctorProfile: null,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  const isStaff = user?.role === "STAFF";
  const modules = isStaff ? await getStaffModuleAccessByUserId(session.user.id) : [];
  const viewer = session?.user
    ? {
        role: user!.role,
        clinicId: session.user.clinicId ?? null,
        providerId: session.user.providerId ?? null,
        providerType: session.user.providerType ?? null,
        category: session.user.category ?? null,
      }
    : undefined;
  const stats = await getDashboardStats({
    forStaff: isStaff,
    modules,
    viewer,
    filterClinicId: search?.clinicId,
  });

  const isDoctor = isDoctorViewer(viewer);
  const doctorProfile = isDoctor
    ? {
        name: session.user.name ?? "Doctor",
        specialization: doctorCategoryLabel(session.user.category),
        providerId: session.user.providerId ?? null,
      }
    : null;

  return {
    stats,
    role: (user?.role ?? "ADMIN") as "ADMIN" | "STAFF",
    modules,
    isStaff,
    isDoctor,
    doctorProfile,
  };
}

export async function loadPatientsPage(search: {
  q?: string;
  page?: string;
  pageSize?: string;
  includeArchived?: string;
  clinicId?: string;
}) {
  const ctx = await loadTenantRequestContext(search);
  const { page, pageSize, skip } = parsePageParams(search);
  const includeArchived = search.includeArchived === "1" || search.includeArchived === "true";
  const { items, total } = await listPatientsPage({
    q: search.q,
    includeArchived,
    skip,
    take: pageSize,
    ...tenantListOptions(ctx),
  });
  return { patients: items, total, page, pageSize, q: search.q ?? "", includeArchived, ...ctx };
}

export async function loadPatientForm(id?: string) {
  if (!id) return null;
  const ctx = await loadTenantRequestContext();
  await assertPatientVisibleToViewer(id, ctx.viewer ?? undefined);
  return getPatient(id);
}

export async function loadPatientTracking(id: string) {
  const ctx = await loadTenantRequestContext();
  await assertPatientVisibleToViewer(id, ctx.viewer ?? undefined);
  return getPatientTracking(id);
}

export async function loadMedicinesPage(search: {
  q?: string;
  page?: string;
  pageSize?: string;
  clinicId?: string;
}) {
  const ctx = await loadTenantRequestContext(search);
  const { page, pageSize, skip } = parsePageParams(search);
  const { items, total } = await listMedicinesPage({
    q: search.q,
    skip,
    take: pageSize,
    ...tenantListOptions(ctx),
  });
  return { medicines: items, total, page, pageSize, q: search.q ?? "", ...ctx };
}

export async function loadMedicineForm(id?: string) {
  return id ? getMedicine(id) : null;
}

export async function loadAppointmentsPage(search: {
  status?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  source?: string;
  q?: string;
  page?: string;
  pageSize?: string;
  clinicId?: string;
  providerId?: string;
  category?: string;
  view?: string;
  anchor?: string;
}) {
  const ctx = await loadTenantRequestContext(search);
  const { page, pageSize, skip } = parsePageParams(search);
  const listOpts = tenantListOptions(ctx);
  const view = (search.view ?? "week") as CalendarView;
  const isListView = view === "list";
  const anchor = parseDateKey(search.anchor);
  const range = getRangeForView(isListView ? "week" : view, anchor);
  const dateFrom = search.dateFrom ?? toDateKey(range.from);
  const dateTo = search.dateTo ?? toDateKey(range.to);

  const [{ items, total }, patients, providers] = await Promise.all([
    isListView
      ? listAppointmentsPage({
          status: search.status,
          date: search.date,
          dateFrom: isListView ? search.dateFrom : dateFrom,
          dateTo: isListView ? search.dateTo : dateTo,
          source: search.source,
          q: search.q,
          providerId: search.providerId,
          category: search.category,
          skip,
          take: pageSize,
          ...listOpts,
        })
      : listAppointments({
          status: search.status,
          source: search.source,
          q: search.q,
          providerId: search.providerId,
          category: search.category,
          dateFrom: isListView ? search.dateFrom : dateFrom,
          dateTo: isListView ? search.dateTo : dateTo,
          sort: "asc",
          take: 1000,
          ...listOpts,
        }).then((rows) => ({ items: rows, total: rows.length })),
    listPatients(undefined, listOpts),
    listProviders({ activeOnly: true, ...listOpts }),
  ]);

  const doctors = providers.filter((provider) => provider.providerType === "DOCTOR");

  return {
    appointments: items,
    patients,
    providers: doctors,
    total,
    page,
    pageSize,
    ...ctx,
    viewerRole: {
      role: ctx.viewer?.role ?? "ADMIN",
      providerId: ctx.viewer?.providerId ?? null,
      providerType: ctx.viewer?.providerType ?? null,
      isDoctor:
        ctx.viewer?.providerType === "DOCTOR" && Boolean(ctx.viewer?.providerId),
      isAdmin: ctx.viewer?.role === "ADMIN",
    },
    filters: {
      status: search.status ?? "",
      date: search.date ?? "",
      dateFrom: search.dateFrom ?? "",
      dateTo: search.dateTo ?? "",
      source: search.source ?? "",
      q: search.q ?? "",
      providerId: search.providerId ?? "",
      category: search.category ?? "",
      view: view,
      anchor: toDateKey(anchor),
    },
  };
}

export async function loadAppointmentForm(id?: string, search?: { clinicId?: string }) {
  const ctx = await loadTenantRequestContext(search);
  const listOpts = tenantListOptions(ctx);
  const [appointment, patients, providers] = await Promise.all([
    id ? getAppointment(id) : null,
    listPatients(undefined, listOpts),
    listProviders({ activeOnly: true, ...listOpts }),
  ]);
  return { appointment, patients, providers, ...ctx };
}

export async function loadPaymentsPage(
  search: {
    method?: string;
    q?: string;
    page?: string;
    pageSize?: string;
    includeVoided?: string;
    clinicId?: string;
  } = {}
) {
  const ctx = await loadTenantRequestContext(search);
  const { page, pageSize, skip } = parsePageParams(search);
  const includeVoided = search.includeVoided === "1" || search.includeVoided === "true";
  const listOpts = tenantListOptions(ctx);
  const [{ items, total }, patients, appointments] = await Promise.all([
    listPaymentsPage({
      method: search.method,
      q: search.q,
      includeVoided,
      skip,
      take: pageSize,
      ...listOpts,
    }),
    listPatients(undefined, listOpts),
    listAppointments(listOpts),
  ]);
  return {
    payments: items,
    total,
    page,
    pageSize,
    patients,
    appointments,
    method: search.method ?? "",
    q: search.q ?? "",
    includeVoided,
    ...ctx,
  };
}

export async function loadRemindersPage(
  search: {
    status?: string;
    q?: string;
    page?: string;
    pageSize?: string;
    clinicId?: string;
  } = {}
) {
  const ctx = await loadTenantRequestContext(search);
  const { page, pageSize, skip } = parsePageParams(search);
  const listOpts = tenantListOptions(ctx);
  const [{ items, total }, patients, appointments] = await Promise.all([
    listRemindersPage({
      status: search.status,
      q: search.q,
      skip,
      take: pageSize,
      ...listOpts,
    }),
    listPatients(undefined, listOpts),
    listAppointments(listOpts),
  ]);
  return {
    reminders: items,
    total,
    page,
    pageSize,
    patients,
    appointments,
    status: search.status ?? "",
    q: search.q ?? "",
    ...ctx,
  };
}

export async function loadNotesPage(
  search: {
    q?: string;
    filter?: string;
    page?: string;
    pageSize?: string;
    clinicId?: string;
  } = {}
) {
  const ctx = await loadTenantRequestContext(search);
  const { page, pageSize, skip } = parsePageParams(search);
  const listOpts = tenantListOptions(ctx);
  const notesFilter =
    search.filter === "with-notes" || search.filter === "without-notes"
      ? search.filter
      : undefined;
  const { items, total } = await listAppointmentsPage({
    q: search.q,
    notesFilter,
    skip,
    take: pageSize,
    ...listOpts,
  });

  return {
    appointments: items,
    total,
    page,
    pageSize,
    q: search.q ?? "",
    filter: search.filter ?? "",
    hasActiveFilters: Boolean(search.q?.trim() || notesFilter),
    ...ctx,
  };
}

export async function loadPrescriptionsPage(search: {
  q?: string;
  page?: string;
  pageSize?: string;
  clinicId?: string;
}) {
  const ctx = await loadTenantRequestContext(search);
  const { page, pageSize, skip } = parsePageParams(search);
  const listOpts = tenantListOptions(ctx);
  const [{ items, total }, patients, medicines, appointments] = await Promise.all([
    listPrescriptionsPage({
      q: search.q,
      skip,
      take: pageSize,
      ...listOpts,
    }),
    listPatients(undefined, listOpts),
    listMedicines(undefined, listOpts),
    listAppointments(listOpts),
  ]);
  return {
    prescriptions: items,
    patients,
    medicines,
    appointments,
    total,
    page,
    pageSize,
    q: search.q ?? "",
    ...ctx,
  };
}

export async function loadPrescriptionForm(search?: { clinicId?: string }) {
  const ctx = await loadTenantRequestContext(search);
  const listOpts = tenantListOptions(ctx);
  const [patients, medicines, appointments] = await Promise.all([
    listPatients(undefined, listOpts),
    listMedicines(undefined, listOpts),
    listAppointments(listOpts),
  ]);
  return { patients, medicines, appointments, ...ctx };
}

export async function loadPrescriptionPrint(id: string) {
  const [prescription, settings] = await Promise.all([
    getPrescription(id),
    getClinicSettings(),
  ]);
  return { prescription, settings };
}

export async function loadPaymentPrint(id: string) {
  const [payment, settings] = await Promise.all([getPayment(id), getClinicSettings()]);
  return { payment, settings };
}

export async function loadAppointmentPrint(id: string) {
  const [appointment, settings] = await Promise.all([getAppointment(id), getClinicSettings()]);
  return { appointment, settings };
}

export async function loadMedicineDetail(id: string) {
  const [medicine, transactions] = await Promise.all([
    getMedicine(id),
    listInventoryTransactions(id),
  ]);
  return { medicine, transactions };
}

export async function loadMessagesPage(search: {
  q?: string;
  page?: string;
  pageSize?: string;
  clinicId?: string;
}) {
  const ctx = await loadTenantRequestContext(search);
  const { page, pageSize, skip } = parsePageParams(search);
  const { items, total } = await listContactMessagesPage({
    q: search.q,
    skip,
    take: pageSize,
    ...tenantListOptions(ctx),
  });
  return { messages: items, total, page, pageSize, q: search.q ?? "", ...ctx };
}

export async function loadSettingsPage(search?: { clinicId?: string }) {
  const ctx = await loadTenantRequestContext(search);
  const clinicId =
    ctx.filterClinicId ??
    (ctx.viewer?.role === "STAFF" ? ctx.viewer.clinicId ?? undefined : undefined);
  return { settings: await getClinicSettings(clinicId), ...ctx };
}

export async function loadProvidersPage(search?: { q?: string; clinicId?: string }) {
  const ctx = await loadTenantRequestContext(search);
  return {
    providers: await listProviders({
      q: search?.q,
      ...tenantListOptions(ctx),
    }),
    ...ctx,
  };
}

export async function loadFinancePage(
  search: {
    category?: string;
    method?: string;
    q?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
    includeVoided?: string;
    clinicId?: string;
  } = {}
) {
  const ctx = await loadTenantRequestContext(search);
  let { page, pageSize, skip } = parsePageParams(search);
  const includeVoided = search.includeVoided === "1" || search.includeVoided === "true";
  const listOpts = tenantListOptions(ctx);
  const listFilters = {
    category: search.category,
    method: search.method,
    q: search.q,
    from: search.from,
    to: search.to,
    includeVoided,
    ...listOpts,
  };

  let [{ items, total }, summary] = await Promise.all([
    listExpensesPage({ ...listFilters, skip, take: pageSize }),
    getFinanceSummary({ from: search.from, to: search.to }, listOpts),
  ]);

  if (total > 0 && skip >= total) {
    page = 1;
    skip = 0;
    ({ items, total } = await listExpensesPage({ ...listFilters, skip, take: pageSize }));
  }

  return {
    expenses: items,
    total,
    page,
    pageSize,
    summary,
    category: search.category ?? "",
    method: search.method ?? "",
    q: search.q ?? "",
    from: summary.from,
    to: summary.to,
    includeVoided,
    ...ctx,
  };
}
