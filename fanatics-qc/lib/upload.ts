import "server-only";
import { createHash } from "crypto";
import type { UploadFile } from "@/lib/data/repo";

export const MAX_UPLOAD = 10 * 1024 * 1024;

type Kind = "image" | "evidence";

// Magic-byte signatures: the declared MIME type is never trusted on its own.
function sniff(b: Uint8Array): string | null {
  const s = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  if (s(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (s(0, 0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (s(0, 0x52, 0x49, 0x46, 0x46) && s(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  if (s(0, 0x25, 0x50, 0x44, 0x46)) return "application/pdf";
  return null;
}

function looksLikeText(b: Uint8Array) {
  const n = Math.min(b.length, 4096);
  for (let i = 0; i < n; i++) if (b[i] === 0) return false;
  return true;
}

/** Validates size, extension and content signature; returns bytes + SHA-256 for chain of custody. */
export async function readUpload(file: File | null, kind: Kind): Promise<UploadFile | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  if (file.size > MAX_UPLOAD) throw new Error("File exceeds 10 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  let mime = sniff(bytes);
  if (!mime && kind === "evidence") {
    if (ext === "csv" && looksLikeText(bytes)) mime = "text/csv";
    else if (["qtx", "cxf", "mif"].includes(ext)) mime = "application/octet-stream"; // spectrophotometer exports
  }
  const allowed = kind === "image" ? ["image/jpeg", "image/png", "image/webp"] : ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/csv", "application/octet-stream"];
  if (!mime || !allowed.includes(mime)) throw new Error("File type not allowed.");
  return {
    name: file.name.slice(0, 120),
    mime,
    size: bytes.length,
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
