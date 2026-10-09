import fs from "fs";
import path from "path";

/** Bust Next.js/browser cache when public hero image files are replaced in place. */
export function getVersionedPublicImageUrl(publicPath: string): string {
  try {
    const relativePath = publicPath.replace(/^\//, "");
    const filePath = path.join(process.cwd(), "public", relativePath);
    const { mtimeMs } = fs.statSync(filePath);
    return `${publicPath}?v=${Math.floor(mtimeMs)}`;
  } catch {
    return publicPath;
  }
}
