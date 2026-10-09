import { MediaLibrary } from "@/components/admin/media/MediaLibrary";
import { requireModulePage } from "@/lib/page-auth";

export const metadata = { title: "Uploaded files" };

export default async function MediaPage() {
  await requireModulePage("media");

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a]">Uploaded files</h1>
        <p className="mt-1 text-sm text-[#6b7177]">
          Media library for logos, blog images, and videos — reusable across the site.
        </p>
      </header>
      <MediaLibrary />
    </div>
  );
}
