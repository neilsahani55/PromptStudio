import { useState, useEffect, useCallback, useRef } from 'react';

export interface GalleryImage {
  id: string;
  timestamp: number;
  dataUri: string; // base64 data URI (local) or a hosted Blob URL (server)
  prompt: string;
  platform: string;
  model: string;
  aspectRatio: string;
}

const STORAGE_KEY = 'promptstudio_image_gallery';
// Local (fallback) images are large base64 blobs; cap them to stay under the
// ~5 MB localStorage quota. Server-backed galleries are not limited here.
const MAX_LOCAL_IMAGES = 12;
const UPDATE_EVENT = 'promptstudio-gallery-update';

// ─── local (fallback) storage ───────────────────────────────────────────────
function readLocal(): GalleryImage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GalleryImage[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(images: GalleryImage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
  } catch {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(images.slice(0, Math.floor(images.length / 2))));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function notify() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(UPDATE_EVENT));
}

function mapServerRow(r: any): GalleryImage {
  // created_at may be ISO (Postgres timestamptz) or legacy "YYYY-MM-DD HH:MM:SS".
  const parsed = r.created_at ? Date.parse(r.created_at) || Date.parse(r.created_at + 'Z') : NaN;
  return {
    id: String(r.id),
    timestamp: Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now(),
    dataUri: r.url,
    prompt: r.prompt ?? '',
    platform: r.platform ?? '',
    model: r.model ?? '',
    aspectRatio: r.aspect_ratio ?? '16:9',
  };
}

/**
 * Hybrid image gallery. Prefers the server (Vercel Blob + DB) so images persist
 * across devices; transparently falls back to device-local storage when the
 * Blob store isn't configured or the user is offline. All hook instances stay
 * in sync via a window event.
 */
export function useImageGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  // null = still detecting; true = server-backed; false = local fallback.
  const modeRef = useRef<boolean | null>(null);
  const [serverMode, setServerMode] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/gallery', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        if (data.configured) {
          modeRef.current = true;
          setServerMode(true);
          setImages((data.images || []).map(mapServerRow));
          return;
        }
      }
    } catch {
      // fall through to local
    }
    modeRef.current = false;
    setServerMode(false);
    setImages(readLocal());
  }, []);

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener(UPDATE_EVENT, onUpdate);
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener(UPDATE_EVENT, onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, [load]);

  const saveLocal = useCallback((img: Omit<GalleryImage, 'id' | 'timestamp'>) => {
    const entry: GalleryImage = { ...img, id: makeId(), timestamp: Date.now() };
    writeLocal([entry, ...readLocal()].slice(0, MAX_LOCAL_IMAGES));
    notify();
  }, []);

  const addImage = useCallback(
    async (img: Omit<GalleryImage, 'id' | 'timestamp'>) => {
      // Try the server first (unless we already know it's local-only).
      if (modeRef.current !== false) {
        try {
          const res = await fetch('/api/gallery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(img),
          });
          if (res.ok) {
            modeRef.current = true;
            notify();
            return;
          }
          // 501 = Blob not configured → permanently fall back to local.
          if (res.status === 501) {
            modeRef.current = false;
            setServerMode(false);
          }
        } catch {
          // network error — fall back to local for this save
        }
      }
      saveLocal(img);
    },
    [saveLocal]
  );

  const removeImage = useCallback(
    async (id: string) => {
      if (modeRef.current) {
        try {
          await fetch(`/api/gallery/${id}`, { method: 'DELETE', credentials: 'same-origin' });
        } catch {
          /* ignore */
        }
        notify();
        return;
      }
      writeLocal(readLocal().filter((i) => i.id !== id));
      notify();
    },
    []
  );

  const clear = useCallback(async () => {
    if (modeRef.current) {
      const current = images;
      await Promise.all(
        current.map((i) =>
          fetch(`/api/gallery/${i.id}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => {})
        )
      );
      notify();
      return;
    }
    writeLocal([]);
    notify();
  }, [images]);

  return { images, addImage, removeImage, clear, serverMode, max: MAX_LOCAL_IMAGES };
}
