"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Film, ImageIcon, Loader2, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MediaAssetItem = {
  id: string;
  originalName: string;
  fileName: string;
  url: string;
  mimeType: string;
  type: "IMAGE" | "VIDEO";
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  createdAt: string;
};

type ListResponse = {
  items: MediaAssetItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type MediaTab = "IMAGE" | "VIDEO";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDimensions(width?: number | null, height?: number | null): string | null {
  if (width == null || height == null || width <= 0 || height <= 0) return null;
  return `${width}×${height}`;
}

type Props = {
  selectable?: boolean;
  acceptType?: MediaTab;
  selectedUrl?: string | null;
  onSelect?: (asset: MediaAssetItem) => void;
  className?: string;
  compact?: boolean;
};

export function MediaLibrary({
  selectable = false,
  acceptType,
  selectedUrl,
  onSelect,
  className,
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mediaTab, setMediaTab] = useState<MediaTab>(acceptType ?? "IMAGE");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeType = acceptType ?? mediaTab;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeType]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: activeType,
        page: String(page),
        pageSize: compact ? "12" : "48",
      });
      if (debouncedSearch) params.set("q", debouncedSearch);

      const res = await fetch(`/api/admin/media?${params}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? "Failed to load files.");
        setData({ items: [], total: 0, page: 1, pageSize: 48, totalPages: 1 });
        return;
      }
      setData(body as ListResponse);
    } catch {
      toast.error("Failed to load files.");
    } finally {
      setLoading(false);
    }
  }, [activeType, page, debouncedSearch, compact]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    let uploaded: MediaAssetItem | null = null;

    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? `Could not upload ${file.name}`);
        continue;
      }
      uploaded = await res.json();
      toast.success(`Uploaded ${file.name}`);
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    setPage(1);
    await load();
    if (selectable && uploaded && onSelect) {
      if (!acceptType || uploaded.type === acceptType) onSelect(uploaded);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/media/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Failed to delete file.");
      return;
    }
    toast.success("File deleted");
    setDeleteId(null);
    await load();
  }

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const items = data?.items ?? [];

  return (
    <>
      <div
        className={cn(
          "space-y-4 rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-sm sm:p-5",
          className
        )}
      >
        {!acceptType ? (
          <div className="flex w-fit gap-1 rounded-lg border border-[#e3e3e3] bg-[#fafafa] p-1">
            <button
              type="button"
              onClick={() => setMediaTab("IMAGE")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
                mediaTab === "IMAGE"
                  ? "bg-white text-[#1a1a1a] shadow-sm"
                  : "text-[#6b7177] hover:text-[#1a1a1a]"
              )}
            >
              <ImageIcon className="size-4" />
              Images
            </button>
            <button
              type="button"
              onClick={() => setMediaTab("VIDEO")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
                mediaTab === "VIDEO"
                  ? "bg-white text-[#1a1a1a] shadow-sm"
                  : "text-[#6b7177] hover:text-[#1a1a1a]"
              )}
            >
              <Film className="size-4" />
              Videos
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#6b7177]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU, or ID…"
              className="h-9 w-full rounded-lg border border-[#e3e3e3] bg-white pr-3 pl-9 text-sm outline-none focus:border-[var(--brand-teal)] focus:ring-2 focus:ring-[var(--brand-teal)]/20"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-[#6b7177]">
              {total} file{total === 1 ? "" : "s"}
            </span>
            <Button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="gap-2"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Upload {activeType === "VIDEO" ? "video" : "image"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={
                activeType === "VIDEO"
                  ? "video/mp4,video/webm"
                  : "image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              }
              multiple={!selectable}
              className="sr-only"
              onChange={(e) => void onUpload(e.target.files)}
            />
          </div>
        </div>

        <div
          className="min-h-[320px] rounded-lg border border-[#ebebeb] bg-[#fafafa] p-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void onUpload(e.dataTransfer.files);
          }}
        >
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-[#6b7177]">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-[#6b7177]">
              {activeType === "VIDEO" ? (
                <Film className="size-10 opacity-40" />
              ) : (
                <ImageIcon className="size-10 opacity-40" />
              )}
              <p>
                {activeType === "VIDEO"
                  ? "No videos yet. Upload or drag video files here."
                  : "No files yet. Upload or drag images here."}
              </p>
            </div>
          ) : (
            <ul
              className={cn(
                "grid gap-3",
                compact
                  ? "grid-cols-2 sm:grid-cols-3"
                  : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
              )}
            >
              {items.map((item) => {
                const selected = selectedUrl === item.url;
                const isVideo = item.type === "VIDEO";
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "overflow-hidden rounded-lg border border-[#e3e3e3] bg-white shadow-sm",
                      selectable && "cursor-pointer",
                      selected && "ring-2 ring-[var(--brand-teal)]"
                    )}
                    onClick={() => {
                      if (selectable && onSelect) onSelect(item);
                    }}
                    onKeyDown={(e) => {
                      if (!selectable || !onSelect) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(item);
                      }
                    }}
                    role={selectable ? "button" : undefined}
                    tabIndex={selectable ? 0 : undefined}
                  >
                    <div className="relative aspect-square bg-[#f6f6f7]">
                      <span className="absolute top-1.5 left-1.5 z-10 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        #{item.id.slice(-4)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(item.id);
                        }}
                        className="absolute top-1.5 right-1.5 z-10 rounded bg-white/95 p-1 text-red-600 shadow hover:bg-white"
                        title={`Delete ${isVideo ? "video" : "image"}`}
                        aria-label={`Delete ${item.originalName}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                      {isVideo ? (
                        <video
                          src={item.url}
                          className="size-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt=""
                          className="size-full object-cover"
                        />
                      )}
                    </div>
                    <div className="space-y-0.5 p-2">
                      <p
                        className="truncate text-xs font-medium text-[#1a1a1a]"
                        title={item.originalName}
                      >
                        {item.originalName}
                      </p>
                      <p className="text-[10px] text-[#6b7177]">
                        {[
                          formatBytes(item.sizeBytes),
                          formatDimensions(item.width, item.height),
                          formatDate(item.createdAt),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between text-sm text-[#6b7177]">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete file?"
        description="This permanently removes the file from the media library and disk. Links that still use this URL will break."
        loading={deleting}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
