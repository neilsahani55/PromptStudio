"use client";

import { useState } from "react";
import { Images, Download, Trash2, Copy, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useImageGallery, type GalleryImage } from "@/hooks/use-image-gallery";
import { useToast } from "@/hooks/use-toast";

function platformLabel(p: string): string {
  if (p === "flux") return "Flux";
  if (p === "sd35") return "Stable Diffusion 3.5";
  return p;
}

async function downloadImage(img: GalleryImage) {
  const filename = `promptstudio-${img.platform || "image"}-${img.id.slice(0, 8)}.jpg`;
  try {
    // Works for both base64 data URIs and cross-origin Blob URLs.
    const resp = await fetch(img.dataUri);
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    window.open(img.dataUri, "_blank");
  }
}

export function ImageGallery({
  onReusePrompt,
}: {
  onReusePrompt?: (prompt: string) => void;
}) {
  const { images, removeImage, clear, max, serverMode } = useImageGallery();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyPrompt = async (img: GalleryImage) => {
    try {
      await navigator.clipboard.writeText(img.prompt);
      setCopiedId(img.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast({ variant: "destructive", title: "Copy failed" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="relative gap-1.5 text-sm font-medium">
          <Images className="w-4 h-4" />
          <span className="hidden sm:inline">Gallery</span>
          {images.length > 0 && (
            <span className="min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
              {images.length}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Images className="w-5 h-5 text-primary" />
            My Gallery
            <span className="text-xs font-normal text-muted-foreground">
              {serverMode ? `${images.length} saved images` : `${images.length}/${max} recent images`}
            </span>
          </DialogTitle>
        </DialogHeader>

        {images.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <p className="font-medium">No images yet</p>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              Generate an image with Flux or SD 3.5 and it will be saved here
              automatically.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto -mx-2 px-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="group relative rounded-xl overflow-hidden border border-border bg-card"
                  >
                    <div className="relative aspect-square bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.dataUri}
                        alt={img.prompt.slice(0, 60)}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-white/90 bg-white/15 px-2 py-0.5 rounded-full backdrop-blur">
                          {platformLabel(img.platform)}
                        </span>
                        <button
                          onClick={() => removeImage(img.id)}
                          className="w-7 h-7 rounded-full bg-white/15 hover:bg-destructive text-white flex items-center justify-center backdrop-blur transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <p className="text-[11px] text-white/85 line-clamp-2 mb-2 leading-snug">
                          {img.prompt}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => downloadImage(img)}
                            className="flex-1 h-7 rounded-md bg-white/15 hover:bg-white/25 text-white text-[11px] font-medium flex items-center justify-center gap-1 backdrop-blur transition-colors"
                            title="Download"
                          >
                            <Download className="w-3 h-3" /> Save
                          </button>
                          <button
                            onClick={() => copyPrompt(img)}
                            className="flex-1 h-7 rounded-md bg-white/15 hover:bg-white/25 text-white text-[11px] font-medium flex items-center justify-center gap-1 backdrop-blur transition-colors"
                            title="Copy prompt"
                          >
                            {copiedId === img.id ? (
                              <><Check className="w-3 h-3" /> Copied</>
                            ) : (
                              <><Copy className="w-3 h-3" /> Prompt</>
                            )}
                          </button>
                          {onReusePrompt && (
                            <button
                              onClick={() => {
                                onReusePrompt(img.prompt);
                                setOpen(false);
                              }}
                              className="flex-1 h-7 rounded-md bg-primary hover:opacity-90 text-primary-foreground text-[11px] font-medium flex items-center justify-center gap-1 transition-opacity"
                              title="Reuse this prompt"
                            >
                              <Sparkles className="w-3 h-3" /> Reuse
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                {serverMode
                  ? "Synced to your account — available on any device."
                  : `Stored locally on this device. Newest ${max} kept.`}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={clear}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear all
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
