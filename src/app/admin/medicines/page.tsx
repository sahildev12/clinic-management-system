import { MedicinesManager } from "@/components/admin/MedicinesManager";
import { requireModulePage } from "@/lib/page-auth";
import { loadMedicinesPage } from "@/controllers/admin.controller";

export const metadata = { title: "Medicines" };

export default async function MedicinesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string; clinicId?: string }>;
}) {
  await requireModulePage("medicines");
  const search = await searchParams;
  const { medicines, total, page, pageSize } = await loadMedicinesPage(search);
  const hasActiveFilters = Boolean(search.q?.trim());

  return (
    <MedicinesManager
      medicines={medicines}
      total={total}
      page={page}
      pageSize={pageSize}
      hasActiveFilters={hasActiveFilters}
    />
  );
}
