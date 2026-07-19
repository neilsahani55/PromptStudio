import { useState, useEffect, useCallback } from 'react';

export interface GalleryImage {
  id: string;
  timestamp: number;
  dataUri: string; // base64 data URI (or a remote URL)
  prompt: string;
  platform: string; // 'flux' | 'sd35' | ...
  model: string;
  aspectRatio: string;
}

const STORAGE_KEY = 'promptstudio_image_gallery';
// Generated images are large base64 blobs; cap the gallery so we stay well
// under the ~5 MB localStorage quota. Oldest entries are trimmed automatically.
const MAX_IMAGES = 12;
const UPDATE_EVENT = 'promptstudio-gallery-update';

function readGallery(): GalleryImage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GalleryImage[]) : [];
  } catch {
    return [];
  }
}

function writeGallery(images: GalleryImage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
  } catch {
    // Quota exceeded — drop the oldest half and retry once.
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(images.slice(0, Math.floor(images.length / 2)))
      );
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  // Notify every hook instance (across components) to re-read.
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Local, no-infra image gallery backed by localStorage. Every hook instance
 * stays in sync via a window event, so saving from the results panel updates
 * the gallery dialog immediately.
 */
export function useImageGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);

  useEffect(() => {
    setImages(readGallery());
    const sync = () => setImages(readGallery());
    window.addEventListener(UPDATE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(UPDATE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const addImage = useCallback(
    (img: Omit<GalleryImage, 'id' | 'timestamp'>) => {
      const entry: GalleryImage = { ...img, id: makeId(), timestamp: Date.now() };
      const updated = [entry, ...readGallery()].slice(0, MAX_IMAGES);
      writeGallery(updated);
    },
    []
  );

  const removeImage = useCallback((id: string) => {
    writeGallery(readGallery().filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => writeGallery([]), []);

  return { images, addImage, removeImage, clear, max: MAX_IMAGES };
}
