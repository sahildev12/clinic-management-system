"use client";

import { useState } from "react";
import { ImagePlus, X } from "lucide-react";

import {
  MediaLibrary,
  type MediaAssetItem,
} from "@/components/admin/media/MediaLibrary";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  value?: string | null;
  onChange: (url: string) => void;
  acceptType?: "IMAGE" | "VIDEO";
  label?: string;
  helpText?: string;
  required?: boolean;
  className?: string;
};

export function MediaPicker({
  value,
  onChange,
  acceptType = "IMAGE",
  label = "Image",
  helpText,
  required,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const url = value?.trim() || "";

  function handleSelect(asset: MediaAssetItem) {
    onChange(asset.url);
    setOpen(false);
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <p className="text-sm font-medium text-[#1a1a1a]">
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#d4d4d8] bg-[#fafafa]">
          {url ? (
            acceptType === "VIDEO" ? (
              <video src={url} className="size-full object-contain" muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="Selected media" className="size-full object-contain" />
            )
          ) : (
            <span className="px-2 text-center text-xs text-[#9ca3af]">No file selected</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
            <ImagePlus className="size-4" aria-hidden />
            {url ? "Change" : "Choose"} {acceptType === "VIDEO" ? "video" : "image"}
          </Button>
          {url ? (
            <Button
              type="button"
              variant="ghost"
              className="gap-1 text-[#6b7177]"
              onClick={() => onChange("")}
            >
              <X className="size-4" aria-hidden />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {helpText ? <p className="text-xs text-[#6b7177]">{helpText}</p> : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>Media library</DialogTitle>
            <DialogDescription>
              Select an existing {acceptType === "VIDEO" ? "video" : "image"} or upload a new one.
            </DialogDescription>
          </DialogHeader>
          <MediaLibrary
            selectable
            compact
            acceptType={acceptType}
            selectedUrl={url || null}
            onSelect={handleSelect}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
