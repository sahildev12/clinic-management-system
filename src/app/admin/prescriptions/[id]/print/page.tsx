import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/admin/PrintButton";
import { buttonVariants } from "@/components/ui/button";
import { loadPrescriptionPrint } from "@/controllers/admin.controller";
import { formatDate } from "@/lib/admin-format";
import { requireModulePage } from "@/lib/page-auth";
import { cn } from "@/lib/utils";

export const metadata = { title: "Print prescription" };

export default async function PrintPrescriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Patient tracking links here, so the Patients module is enough on its own.
  await requireModulePage("prescriptions", "patients");
  const { id } = await params;
  const { prescription, settings } = await loadPrescriptionPrint(id);
  if (!prescription) notFound();

  return (
    <div>
      <div className="mb-4 flex gap-2 print:hidden">
        <Link href="/admin/prescriptions" className={cn(buttonVariants({ variant: "outline" }))}>
          Back
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-[800px] rounded-xl border bg-white p-8 print:border-0 print:p-0">
        <header className="mb-8 border-b pb-6 text-center">
          <h1 className="text-2xl font-bold text-[var(--brand-charcoal)]">{settings.clinicName}</h1>
          {settings.address ? (
            <p className="mt-1 text-sm text-muted-foreground">{settings.address}</p>
          ) : null}
          <p className="mt-1 text-sm text-muted-foreground">
            {[settings.phone, settings.email].filter(Boolean).join(" · ")}
          </p>
        </header>

        <div className="mb-6 grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="font-semibold">Patient:</span> {prescription.patient.name}
          </p>
          <p>
            <span className="font-semibold">Reference:</span>{" "}
            {prescription.patient.patientReference}
          </p>
          <p>
            <span className="font-semibold">Phone:</span> {prescription.patient.phone}
          </p>
          <p>
            <span className="font-semibold">Date:</span> {formatDate(prescription.createdAt)}
          </p>
          {prescription.diagnosis ? (
            <p>
              <span className="font-semibold">Diagnosis:</span> {prescription.diagnosis}
            </p>
          ) : null}
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Medicine</th>
              <th className="py-2 pr-2">Dosage</th>
              <th className="py-2 pr-2">Duration</th>
              <th className="py-2">Instructions</th>
            </tr>
          </thead>
          <tbody>
            {prescription.items.map((item, index) => (
              <tr key={item.id} className="border-b align-top">
                <td className="py-3 pr-2">{index + 1}</td>
                <td className="py-3 pr-2 font-medium">
                  {item.medicine.name}
                  {item.medicine.strength ? ` (${item.medicine.strength})` : ""}
                  {item.quantity ? (
                    <div className="text-xs text-muted-foreground">Qty: {item.quantity}</div>
                  ) : null}
                </td>
                <td className="py-3 pr-2">{item.dosage}</td>
                <td className="py-3 pr-2">{item.duration ?? "—"}</td>
                <td className="py-3">{item.instructions ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {prescription.notes ? (
          <p className="mt-6 text-sm">
            <span className="font-semibold">Notes:</span> {prescription.notes}
          </p>
        ) : null}

        <p className="mt-16 text-right text-sm text-muted-foreground">Authorized signature</p>
      </article>
    </div>
  );
}
