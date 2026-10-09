import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { MediaType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ValidationError } from "@/lib/validation";
import { writeAuditLog } from "@/lib/api-auth";
import { getClinicSettings } from "@/services/clinic.service";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const PUBLIC_URL_PREFIX = "/uploads";

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const VIDEO_MIME = new Set(["video/mp4", "video/webm"]);

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

type Actor = { userId?: string | null; email?: string | null };

export type MediaListFilters = {
  type?: MediaType;
  q?: string;
  page?: number;
  pageSize?: number;
};

function mimeToType(mime: string): MediaType | null {
  if (IMAGE_MIME.has(mime)) return "IMAGE";
  if (VIDEO_MIME.has(mime)) return "VIDEO";
  return null;
}

function extensionForMime(mime: string, originalName: string): string {
  const fromName = path.extname(originalName).toLowerCase().replace(/^\./, "");
  if (fromName && /^[a-z0-9]+$/i.test(fromName)) return fromName;

  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    default:
      return "bin";
  }
}

function sanitizeOriginalName(name: string): string {
  const trimmed = name.trim().slice(0, 180) || "file";
  return trimmed.replace(/[^\w.\- ()[\]]+/g, "_");
}

export function formatMediaSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function listMediaAssets(filters: MediaListFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? 24));
  const q = filters.q?.trim();

  const where: Prisma.MediaAssetWhereInput = {};
  if (filters.type) where.type = filters.type;
  if (q) {
    where.OR = [
      { originalName: { contains: q, mode: "insensitive" } },
      { id: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.mediaAsset.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function uploadMediaAsset(file: File, actor?: Actor, clinicId?: string) {
  const mimeType = (file.type || "").toLowerCase();
  const type = mimeToType(mimeType);
  if (!type) {
    throw new ValidationError(
      "Unsupported file type. Use JPEG, PNG, WebP, GIF, SVG, MP4, or WebM."
    );
  }

  const maxBytes = type === "IMAGE" ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
  if (file.size <= 0) {
    throw new ValidationError("File is empty");
  }
  if (file.size > maxBytes) {
    throw new ValidationError(
      type === "IMAGE"
        ? "Image must be 5 MB or smaller"
        : "Video must be 50 MB or smaller"
    );
  }

  const originalName = sanitizeOriginalName(file.name || "upload");
  const ext = extensionForMime(mimeType, originalName);
  const hash = createHash("sha1").update(`${Date.now()}-${randomUUID()}`).digest("hex").slice(0, 12);
  const fileName = `${hash}-${randomUUID().slice(0, 8)}.${ext}`;
  const absolutePath = path.join(UPLOAD_DIR, fileName);
  const url = `${PUBLIC_URL_PREFIX}/${fileName}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  try {
    const resolvedClinicId = clinicId ?? (await getClinicSettings()).clinicId;
    const asset = await prisma.mediaAsset.create({
      data: {
        clinicId: resolvedClinicId,
        originalName,
        fileName,
        url,
        mimeType,
        type,
        sizeBytes: file.size,
      },
    });

    await writeAuditLog({
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: "MEDIA_UPLOADED",
      entityType: "MediaAsset",
      entityId: asset.id,
      metadata: { originalName, type, sizeBytes: file.size },
    });

    return asset;
  } catch (error) {
    await unlink(absolutePath).catch(() => undefined);
    throw error;
  }
}

export async function deleteMediaAsset(id: string, actor?: Actor) {
  const existing = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!existing) {
    throw new ValidationError("Media file not found");
  }

  await prisma.mediaAsset.delete({ where: { id } });

  const absolutePath = path.join(UPLOAD_DIR, existing.fileName);
  await unlink(absolutePath).catch(() => undefined);

  await writeAuditLog({
    actorUserId: actor?.userId,
    actorEmail: actor?.email,
    action: "MEDIA_DELETED",
    entityType: "MediaAsset",
    entityId: id,
    metadata: { originalName: existing.originalName, url: existing.url },
  });

  return existing;
}

export async function getMediaAsset(id: string) {
  return prisma.mediaAsset.findUnique({ where: { id } });
}
