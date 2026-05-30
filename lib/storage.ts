import { put, del } from "@vercel/blob";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function uploadFile(
  file: File,
  prefix: string
): Promise<string> {
  const ext = path.extname(file.name) || ".bin";
  const filename = `${prefix}/${randomBytes(8).toString("hex")}${ext}`;

  if (useBlob) {
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return blob.url;
  }

  try {
    await mkdir(path.join(UPLOAD_DIR, prefix), { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);
    return `/uploads/${filename}`;
  } catch {
    // On serverless hosts (e.g. Vercel) the filesystem is read-only, so the
    // local fallback fails. Surface a clear, actionable message instead of a
    // generic 500 — uploads need a Blob token in production.
    throw new Error(
      "رفع الملفات غير مفعّل على هذا الخادم. أضف BLOB_READ_WRITE_TOKEN في متغيّرات البيئة (Vercel → Storage → Blob) لتفعيل رفع الإيصالات."
    );
  }
}

export async function deleteFile(url: string): Promise<void> {
  if (!url) return;
  try {
    if (url.startsWith("http")) {
      if (useBlob) await del(url);
    } else {
      const fullPath = path.join(process.cwd(), "public", url);
      await unlink(fullPath);
    }
  } catch {
    // ignore — file may already be gone
  }
}
