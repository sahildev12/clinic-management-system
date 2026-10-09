import { notFound } from "next/navigation";

import { PatientTracking } from "@/components/admin/PatientTracking";
import { requireModulePage } from "@/lib/page-auth";
import { loadPatientTracking } from "@/controllers/admin.controller";

export const metadata = { title: "Patient tracking" };

export default async function PatientTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModulePage("patients");
  const { id } = await params;
  const patient = await loadPatientTracking(id);
  if (!patient) notFound();

  return <PatientTracking patient={patient} />;
}
