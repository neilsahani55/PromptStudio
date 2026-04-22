import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Client-side image downscale. Returns a data URI for `file`, resizing huge
// images to `MAX_DIMENSION` on the longest edge and re-encoding as JPEG at
// `JPEG_QUALITY`. Small files are returned untouched to preserve PNG alpha.
//
// Why: Vercel's serverless functions have a 4.5 MB request body limit on the
// Hobby tier. A raw 4032x3024 phone screenshot is ~6 MB on disk and ~8 MB as
// a base64 data URI — well over the limit. Downscaling to 1920px caps
// the payload at ~500 KB while keeping visual fidelity fine for AI vision.
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.85;
const SIZE_SKIP_RESIZE = 2_000_000; // 2 MB: below this we don't bother

export function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Non-image or already small: read as-is.
    if (
      !file.type.startsWith("image/") ||
      (file.size < SIZE_SKIP_RESIZE && file.type !== "image/heic")
    ) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
      reader.readAsDataURL(file);
      return;
    }

    // Canvas-based downscale for large images.
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const { width, height } = img;
      const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height, 1);
      const targetW = Math.round(width * scale);
      const targetH = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, targetW, targetH);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for resizing"));
    };

    img.src = objectUrl;
  });
}
