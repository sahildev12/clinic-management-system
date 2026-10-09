import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "v1";

function vaultKey() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET is required to store recoverable passwords");
  }
  return createHash("sha256").update(`clinic-password-vault:${secret}`).digest();
}

/** Encrypt a plaintext password for ADMIN-only recovery. */
export function encryptPassword(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(
    "."
  );
}

/** Decrypt a vaulted password. Returns null if missing or invalid. */
export function decryptPassword(payload: string | null | undefined): string | null {
  if (!payload?.trim()) return null;
  const parts = payload.trim().split(".");
  if (parts.length !== 4 || parts[0] !== PREFIX) return null;

  try {
    const [, ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64!, "base64url");
    const tag = Buffer.from(tagB64!, "base64url");
    const data = Buffer.from(dataB64!, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", vaultKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
