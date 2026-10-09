import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/admin/PrintButton";
import { buttonVariants } from "@/components/ui/button";
import { loadPaymentPrint } from "@/controllers/admin.controller";
import { formatCurrency, formatDateTime } from "@/lib/admin-format";
import { requireModulePage } from "@/lib/page-auth";
import { cn } from "@/lib/utils";

export const metadata = { title: "Print receipt" };

export default async function PrintPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModulePage("payments");
  const { id } = await params;
  const { payment, settings } = await loadPaymentPrint(id);
  if (!payment) notFound();

  return (
    <div>
      <div className="mb-4 flex gap-2 print:hidden">
        <Link href="/admin/payments" className={cn(buttonVariants({ variant: "outline" }))}>
          Back
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-[640px] rounded-xl border bg-white p-8 print:border-0 print:p-0">
        <header className="mb-8 border-b pb-6 text-center">
          <h1 className="text-2xl font-bold text-[var(--brand-charcoal)]">{settings.clinicName}</h1>
          {settings.address ? (
            <p className="mt-1 text-sm text-muted-foreground">{settings.address}</p>
          ) : null}
          <p className="mt-1 text-sm text-muted-foreground">
            {[settings.phone, settings.email].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-[#6b7177]">
            Payment receipt
          </p>
        </header>

        <div className="mb-6 grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="font-semibold">Receipt:</span> {payment.receiptNumber ?? payment.id}
          </p>
          <p>
            <span className="font-semibold">Paid at:</span> {formatDateTime(payment.paidAt)}
          </p>
          <p>
            <span className="font-semibold">Patient:</span> {payment.patient.name}
          </p>
          <p>
            <span className="font-semibold">Reference:</span> {payment.patient.patientReference}
          </p>
          <p>
            <span className="font-semibold">Phone:</span> {payment.patient.phone}
          </p>
          <p>
            <span className="font-semibold">Method:</span> {payment.method}
          </p>
          {payment.appointment ? (
            <p className="sm:col-span-2">
              <span className="font-semibold">Appointment:</span>{" "}
              {formatDateTime(payment.appointment.dateTime)}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border bg-[#fafafa] px-4 py-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">Amount paid</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-[#1a1a1a]">
            {formatCurrency(Number(payment.amount))}
          </p>
          {payment.voidedAt ? (
            <p className="mt-2 text-sm font-semibold text-red-600">
              VOIDED{payment.voidReason ? ` — ${payment.voidReason}` : ""}
            </p>
          ) : null}
        </div>

        {payment.notes?.trim() ? (
          <p className="mt-6 text-sm">
            <span className="font-semibold">Notes:</span> {payment.notes}
          </p>
        ) : null}

        <p className="mt-16 text-right text-sm text-muted-foreground">Authorized signature</p>
      </article>
    </div>
  );
}
