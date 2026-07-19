"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Image as ImageIcon, Film, Loader2, Download, Sparkles, Check, Wand2, Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useImageGallery } from "@/hooks/use-image-gallery";
import { getVideoMasterPrompt } from "@/app/actions";

interface StudioModel {
  id: string;
  label: string;
  kind: "image" | "video";
  note: string;
  provider: string;
}

type GenState = "idle" | "loading" | "done" | "error";
interface Result {
  state: GenState;
  media?: { base64: string | null; url: string | null };
  kind?: "image" | "video";
  error?: string;
}

const MAX_SELECT: Record<"image" | "video", number> = { image: 4, video: 2 };

interface CreditsInfo {
  total: number;
  used: number;
  remaining: number;
  unlimited: boolean;
  imageCost: number;
  videoCost: number;
}

// Poll the NVCF status endpoint for NVIDIA async jobs (each poll is its own
// short request — total time is not bound by any single 60s function).
async function pollStatus(reqId: string): Promise<{ base64: string | null; url: string | null }> {
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2500));
    let res: Response;
    try {
      res = await fetch(`/api/generate-image/status?reqId=${encodeURIComponent(reqId)}`, { credentials: "same-origin" });
    } catch { continue; }
    let data: any = null;
    try { data = JSON.parse(await res.text()); } catch { continue; }
    if (data?.pending) continue;
    if (!res.ok || data?.error) {
      throw new Error([data?.error || "Generation failed", data?.detail].filter(Boolean).join(" — "));
    }
    if (data?.image) return data.image;
  }
  throw new Error("Timed out after 4 minutes.");
}

// Poll a fal video job (via /api/generate-media/status). Video renders can
// take minutes — allow up to 8, with a gentle poll interval.
async function pollVideo(endpoint: string, requestId: string): Promise<{ base64: string | null; url: string | null }> {
  const deadline = Date.now() + 480_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5000));
    let res: Response;
    try {
      res = await fetch(
        `/api/generate-media/status?endpoint=${encodeURIComponent(endpoint)}&id=${encodeURIComponent(requestId)}`,
        { credentials: "same-origin" }
      );
    } catch { continue; }
    let data: any = null;
    try { data = JSON.parse(await res.text()); } catch { continue; }
    if (data?.pending) continue;
    if (!res.ok || data?.error) {
      throw new Error([data?.error || "Video generation failed", data?.detail].filter(Boolean).join(" — "));
    }
    if (data?.media) return data.media;
  }
  throw new Error("Video timed out after 8 minutes. Try again or use a shorter prompt.");
}

async function downloadMedia(src: string, filename: string) {
  try {
    const resp = await fetch(src);
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
    window.open(src, "_blank");
  }
}

export function MediaStudio({
  masterPrompt,
  aspectRatio,
}: {
  masterPrompt: string;
  aspectRatio: string;
}) {
  const { toast } = useToast();
  const { addImage } = useImageGallery();

  const [models, setModels] = useState<{ image: StudioModel[]; video: StudioModel[] }>({ image: [], video: [] });
  const [missingProviders, setMissingProviders] = useState<string[]>([]);
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [mode, setMode] = useState<"image" | "video">("image");
  const [selected, setSelected] = useState<Record<"image" | "video", string[]>>({ image: [], video: [] });
  const [prompts, setPrompts] = useState<Record<"image" | "video", string>>({ image: "", video: "" });
  const [adapting, setAdapting] = useState(false);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);

  const loadModels = useCallback((initial: boolean) => {
    fetch("/api/media-models", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setModels({ image: data.image || [], video: data.video || [] });
        setMissingProviders(data.missingProviders || []);
        if (data.credits) setCredits(data.credits);
        if (initial) {
          // Sensible defaults: first two image models pre-selected.
          setSelected((prev) => ({
            ...prev,
            image: (data.image || []).slice(0, 2).map((m: StudioModel) => m.id),
            video: (data.video || []).slice(0, 1).map((m: StudioModel) => m.id),
          }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadModels(true);
  }, [loadModels]);

  // Seed the image prompt from the master prompt whenever it changes, and
  // clear the stale video adaptation so it regenerates for the new content.
  useEffect(() => {
    setPrompts((prev) => ({ ...prev, image: masterPrompt, video: "" }));
  }, [masterPrompt]);

  // Auto-adapt the video prompt the first time the user opens Video mode.
  useEffect(() => {
    if (mode === "video" && !prompts.video && masterPrompt && !adapting) {
      adaptForVideo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, masterPrompt]);

  const toggleModel = (id: string) => {
    setSelected((prev) => {
      const list = prev[mode];
      if (list.includes(id)) return { ...prev, [mode]: list.filter((x) => x !== id) };
      if (list.length >= MAX_SELECT[mode]) {
        toast({ title: `Max ${MAX_SELECT[mode]} ${mode} models at once` });
        return prev;
      }
      return { ...prev, [mode]: [...list, id] };
    });
  };

  const adaptForVideo = useCallback(async () => {
    setAdapting(true);
    try {
      const res = await getVideoMasterPrompt(masterPrompt);
      if (res.success) {
        setPrompts((prev) => ({ ...prev, video: res.data }));
        toast({ title: "Video prompt ready 🎬", description: "Adapted with motion + camera language." });
      } else {
        toast({ variant: "destructive", title: "Adaptation failed", description: res.error });
      }
    } finally {
      setAdapting(false);
    }
  }, [masterPrompt, toast]);

  const generateOne = async (modelId: string, prompt: string) => {
    setResults((prev) => ({ ...prev, [modelId]: { state: "loading" } }));
    try {
      const res = await fetch("/api/generate-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ modelId, prompt, aspectRatio }),
      });
      let data: any = null;
      try { data = JSON.parse(await res.text()); } catch { throw new Error(`Server Error (${res.status})`); }
      if (res.ok && data?.pending && data?.reqId) {
        // NVIDIA async job
        const media = await pollStatus(data.reqId);
        data = { ...data, media: { base64: media.base64, url: media.url }, kind: "image" };
      } else if (res.ok && data?.pending && data?.falRequestId) {
        // fal video job — polls for up to 8 minutes
        const media = await pollVideo(data.falEndpoint, data.falRequestId);
        data = { ...data, media, kind: "video" };
      }
      if (!res.ok || !data?.media) {
        throw new Error([data?.error || "Generation failed", data?.detail, data?.hint].filter(Boolean).join(" — "));
      }
      const src = data.media.base64 || data.media.url;
      if (!src) throw new Error("No media returned");
      setResults((prev) => ({ ...prev, [modelId]: { state: "done", media: data.media, kind: data.kind || mode } }));
      if ((data.kind || mode) === "image") {
        addImage({ dataUri: src, prompt, platform: modelId, model: modelId, aspectRatio });
      }
    } catch (e: any) {
      setResults((prev) => ({ ...prev, [modelId]: { state: "error", error: e?.message || "Failed" } }));
    }
  };

  const handleGenerate = async () => {
    const prompt = prompts[mode]?.trim();
    const chosen = selected[mode];
    if (!prompt) {
      toast({ variant: "destructive", title: mode === "video" ? "Adapt or write a video prompt first" : "No prompt to generate" });
      return;
    }
    if (chosen.length === 0) {
      toast({ variant: "destructive", title: "Select at least one model" });
      return;
    }
    setRunning(true);
    // Clear only the chosen models' previous results.
    setResults((prev) => {
      const next = { ...prev };
      chosen.forEach((id) => delete next[id]);
      return next;
    });
    await Promise.all(chosen.map((id) => generateOne(id, prompt)));
    setRunning(false);
    // Refresh the credits badge with what the server actually charged.
    loadModels(false);
  };

  const outOfCredits = !!credits && !credits.unlimited && credits.remaining <= 0;

  const activeModels = models[mode];
  const chosen = selected[mode];
  const gridCols = chosen.length <= 1 ? "grid-cols-1" : chosen.length === 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-2";
  const modelById = (id: string) => [...models.image, ...models.video].find((m) => m.id === id);

  return (
    <div className="mt-6 pt-5 border-t border-border/50 space-y-4">
      {/* Header + mode toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" />
            Media Studio
          </p>
          <p className="text-xs text-muted-foreground">
            Generate with up to {MAX_SELECT[mode]} {mode} models at once, then pick the best.
          </p>
        </div>
        {credits && (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
              credits.unlimited
                ? "border-primary/30 bg-primary/10 text-primary"
                : outOfCredits
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-border bg-card text-foreground"
            }`}
            title={`Images cost ${credits.imageCost} credit, videos cost ${credits.videoCost}. Resets daily at midnight UTC.`}
          >
            ⚡ {credits.unlimited ? "Unlimited (admin)" : `${credits.remaining}/${credits.total} credits today`}
          </span>
        )}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["image", "video"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                mode === m ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "image" ? <ImageIcon className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
              {m === "image" ? "Image" : "Video"}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {mode === "image" ? "Image prompt (from master)" : "Video prompt"}
          </p>
          {mode === "video" && (
            <Button variant="ghost" size="sm" onClick={adaptForVideo} disabled={adapting} className="h-7 gap-1.5 text-primary hover:text-primary hover:bg-primary/10">
              {adapting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {prompts.video ? "Re-adapt from master" : "Adapt master prompt for video"}
            </Button>
          )}
        </div>
        <Textarea
          value={prompts[mode]}
          onChange={(e) => setPrompts((prev) => ({ ...prev, [mode]: e.target.value }))}
          placeholder={mode === "video" ? 'Click "Adapt master prompt for video" or write a video prompt with motion + camera movement…' : "Your image prompt…"}
          className="min-h-[90px] text-sm bg-muted/30"
        />
      </div>

      {/* Model selection */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Models · {chosen.length}/{MAX_SELECT[mode]} selected
        </p>
        {activeModels.length === 0 ? (
          <p className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-3">
            {mode === "video"
              ? "No video models configured. Add HF_TOKEN (free at huggingface.co) to unlock LTX-Video and Wan 2.2 — see ENVIRONMENT.md."
              : "No image models configured. Add NVIDIA_API_KEY — see ENVIRONMENT.md."}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activeModels.map((m) => {
              const isSel = chosen.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleModel(m.id)}
                  className={`px-3 py-2 rounded-lg border text-left transition-colors ${
                    isSel ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    {isSel ? <Check className="w-3 h-3 text-primary" /> : <Cpu className="w-3 h-3 text-muted-foreground" />}
                    {m.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{m.note}</span>
                </button>
              );
            })}
          </div>
        )}
        {missingProviders.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            💡 Unlock more free models: add{" "}
            {missingProviders.map((p) => (p === "cloudflare" ? "Cloudflare Workers AI" : p === "hf" ? "Hugging Face" : p)).join(" and ")}{" "}
            keys — both have free tiers. See ENVIRONMENT.md.
          </p>
        )}
      </div>

      {/* Generate */}
      <Button
        onClick={handleGenerate}
        disabled={running || chosen.length === 0 || outOfCredits}
        className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 gap-2"
      >
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "image" ? <ImageIcon className="w-4 h-4" /> : <Film className="w-4 h-4" />}
        {running ? "Generating…" : outOfCredits ? "Daily credits used" : `Generate ${chosen.length || ""} ${mode}${chosen.length > 1 ? "s" : ""}`}
      </Button>
      {outOfCredits && (
        <p className="text-xs text-center text-destructive -mt-2">
          You&apos;ve used all {credits!.total} free daily credits (images {credits!.imageCost}, videos {credits!.videoCost}).
          They reset at midnight UTC — see you tomorrow!
        </p>
      )}

      {/* Results grid */}
      {chosen.some((id) => results[id]) && (
        <div className={`grid ${gridCols} gap-3 md:gap-4`}>
          {chosen.map((id) => {
            const r = results[id];
            const m = modelById(id);
            if (!r) return null;
            const src = r.media?.base64 || r.media?.url || null;
            return (
              <div key={id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-3 py-2 border-b border-border/60 bg-muted/40 flex items-center justify-between">
                  <span className="text-xs font-semibold truncate">{m?.label || id}</span>
                  {src && r.state === "done" && (
                    <button
                      onClick={() => downloadMedia(src, `promptstudio-${id}.${r.kind === "video" ? "mp4" : "jpg"}`)}
                      className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="aspect-video bg-muted/50 flex items-center justify-center p-2 text-center">
                  {r.state === "loading" && (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="text-xs">Generating…</span>
                    </div>
                  )}
                  {r.state === "error" && (
                    <p className="text-[11px] text-destructive line-clamp-5 px-1">{r.error}</p>
                  )}
                  {r.state === "done" && src && (
                    r.kind === "video" ? (
                      <video src={src} controls autoPlay loop muted className="w-full h-full object-contain rounded-md" />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={src} alt={m?.label || id} className="w-full h-full object-cover rounded-md" />
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
