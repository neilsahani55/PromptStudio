"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Image as ImageIcon, Film, Loader2, Download, Sparkles, Check, Wand2, KeyRound,
  Zap, Clock, AlertCircle, RefreshCw,
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
  errorHint?: string;
  stage?: string;
  startedAt?: number;
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

// Provider branding for the model cards.
const PROVIDER_STYLE: Record<string, { dot: string; name: string }> = {
  nvidia: { dot: "bg-[#76B900]", name: "NVIDIA" },
  cloudflare: { dot: "bg-[#F6821F]", name: "Cloudflare" },
  hf: { dot: "bg-[#FFD21E]", name: "Hugging Face" },
};

// Rough per-model expectations shown while loading (and on the card).
function modelEta(id: string, kind: "image" | "video"): { label: string; slow: boolean } {
  if (id === "nvidia-cosmos3") return { label: "~3–4 min", slow: true };
  if (kind === "video") return { label: "~2–6 min", slow: true };
  return { label: "~5–20 sec", slow: false };
}

// Turn provider error blobs into a short human sentence + optional hint.
function friendlyError(raw: string): { title: string; hint?: string } {
  const t = raw || "Generation failed";
  if (/depleted your monthly included credits|HF free credits|Hugging Face free credits/i.test(t)) {
    return {
      title: "Out of Hugging Face credits for this month.",
      hint: "Add your own HF token in Settings → API Keys to generate on your own quota — free tokens at huggingface.co/settings/tokens.",
    };
  }
  if (/daily free allocation|10,000 neurons/i.test(t)) {
    return {
      title: "Cloudflare's free daily quota is used up.",
      hint: "It resets at midnight UTC — try an NVIDIA model meanwhile.",
    };
  }
  if (/Daily credit limit/i.test(t)) {
    return {
      title: "You've used today's free credits.",
      hint: "Credits reset at midnight UTC — see you tomorrow!",
    };
  }
  if (/content filter|safety|black image/i.test(t)) {
    return {
      title: "Blocked by the model's safety filter.",
      hint: "Rephrase the prompt: avoid brand names, named people, or 'photorealistic'.",
    };
  }
  if (/^Server Error \(5/i.test(t)) {
    return {
      title: "The server took too long to answer.",
      hint: "Usually a brief provider hiccup — hit Retry and it should go through.",
    };
  }
  if (/Timed out|timed out/i.test(t)) {
    return {
      title: "The model took too long and timed out.",
      hint: "Try again — or switch to a faster model.",
    };
  }
  if (/not configured/i.test(t)) {
    return {
      title: "This provider isn't set up yet.",
      hint: "Add its key in Settings → API Keys.",
    };
  }
  // Strip JSON noise from unknown errors and keep them short.
  const clean = t.replace(/[{}"\\]/g, " ").replace(/\s+/g, " ").trim();
  return { title: clean.length > 160 ? `${clean.slice(0, 157)}…` : clean };
}

// Poll the NVCF status endpoint for NVIDIA async jobs (each poll is its own
// short request — total time is not bound by any single 60s function).
async function pollStatus(reqId: string): Promise<{ base64: string | null; url: string | null }> {
  const deadline = Date.now() + 360_000;
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
  throw new Error("Timed out after 6 minutes.");
}

// Poll a fal video job. Reports queue progress via onStage so the card can
// show "Queued" / "Rendering" instead of a mute spinner.
async function pollVideo(
  endpoint: string,
  requestId: string,
  onStage: (stage: string) => void
): Promise<{ base64: string | null; url: string | null }> {
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
    if (data?.pending) {
      onStage(data.queue === "IN_QUEUE" ? "Waiting in queue…" : "Rendering frames…");
      continue;
    }
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
  standalone = false,
}: {
  masterPrompt: string;
  aspectRatio: string;
  standalone?: boolean;
}) {
  const { toast } = useToast();
  const { addImage } = useImageGallery();

  const [models, setModels] = useState<{ image: StudioModel[]; video: StudioModel[] }>({ image: [], video: [] });
  const [missingProviders, setMissingProviders] = useState<string[]>([]);
  const [hfDepleted, setHfDepleted] = useState(false);
  const [byok, setByok] = useState<string[]>([]);
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [mode, setMode] = useState<"image" | "video">("image");
  const [selected, setSelected] = useState<Record<"image" | "video", string[]>>({ image: [], video: [] });
  const [prompts, setPrompts] = useState<Record<"image" | "video", string>>({ image: "", video: "" });
  const [adapting, setAdapting] = useState(false);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);
  const [, setTick] = useState(0); // re-render every second while generating (elapsed timers)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadModels = useCallback((initial: boolean) => {
    fetch("/api/media-models", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setModels({ image: data.image || [], video: data.video || [] });
        setMissingProviders(data.missingProviders || []);
        setHfDepleted(!!data.hfDepleted);
        setByok(data.byokProviders || []);
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

  // Elapsed-time ticker only runs while something is generating.
  useEffect(() => {
    if (running && !tickRef.current) {
      tickRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    }
    if (!running && tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } };
  }, [running]);

  // Seed the image prompt from the master prompt whenever it changes, and
  // clear the stale video adaptation so it regenerates for the new content.
  useEffect(() => {
    if (!masterPrompt) return;
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
    const setStage = (stage: string) =>
      setResults((prev) => ({ ...prev, [modelId]: { ...prev[modelId], state: "loading", stage } }));
    setResults((prev) => ({
      ...prev,
      [modelId]: { state: "loading", stage: "Sending to the model…", startedAt: Date.now() },
    }));
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
        setStage("Rendering…");
        const media = await pollStatus(data.reqId);
        data = { ...data, media: { base64: media.base64, url: media.url }, kind: "image" };
      } else if (res.ok && data?.pending && data?.falRequestId) {
        // fal video job — polls for up to 8 minutes
        setStage("Waiting in queue…");
        const media = await pollVideo(data.falEndpoint, data.falRequestId, setStage);
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
      const fe = friendlyError(e?.message || "Failed");
      setResults((prev) => ({
        ...prev,
        [modelId]: { state: "error", error: fe.title, errorHint: fe.hint },
      }));
    }
  };

  const handleGenerate = async () => {
    const prompt = prompts[mode]?.trim();
    const chosen = selected[mode];
    if (!prompt) {
      toast({ variant: "destructive", title: mode === "video" ? "Adapt or write a video prompt first" : "Write a prompt first" });
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

  const retryOne = async (id: string) => {
    const prompt = prompts[mode]?.trim();
    if (!prompt) return;
    setRunning(true);
    await generateOne(id, prompt);
    setRunning(false);
    loadModels(false);
  };

  const outOfCredits = !!credits && !credits.unlimited && credits.remaining <= 0;

  const activeModels = models[mode];
  const chosen = selected[mode];
  const modelById = (id: string) => [...models.image, ...models.video].find((m) => m.id === id);

  const stepBadge = (n: number) => (
    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
      {n}
    </span>
  );

  return (
    <div className={standalone ? "space-y-5" : "mt-6 pt-5 border-t border-border/50 space-y-5"}>
      {/* Header: mode toggle + credits */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex rounded-xl border border-border overflow-hidden shadow-sm">
          {(["image", "video"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-5 py-2 text-sm font-semibold flex items-center gap-2 transition-colors ${
                mode === m ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {m === "image" ? <ImageIcon className="w-4 h-4" /> : <Film className="w-4 h-4" />}
              {m === "image" ? "Images" : "Video"}
            </button>
          ))}
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
            <Zap className="w-3 h-3" />
            {credits.unlimited ? "Unlimited (admin)" : `${credits.remaining}/${credits.total} credits today`}
          </span>
        )}
      </div>

      {/* Step 1 — Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            {stepBadge(1)}
            {mode === "image" ? "Describe your image" : "Describe your video"}
          </p>
          {mode === "video" && masterPrompt && (
            <Button variant="ghost" size="sm" onClick={adaptForVideo} disabled={adapting} className="h-7 gap-1.5 text-primary hover:text-primary hover:bg-primary/10">
              {adapting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {prompts.video ? "Re-adapt from master" : "Adapt master prompt for video"}
            </Button>
          )}
        </div>
        <Textarea
          value={prompts[mode]}
          onChange={(e) => setPrompts((prev) => ({ ...prev, [mode]: e.target.value }))}
          placeholder={
            mode === "video"
              ? "A slow cinematic dolly shot over a misty forest at sunrise, camera gliding forward…"
              : "A cozy home office with warm sunlight, plants on a wooden desk, cinematic wide angle…"
          }
          className={`${standalone ? "min-h-[110px]" : "min-h-[90px]"} text-sm bg-muted/30 rounded-xl`}
        />
      </div>

      {/* Step 2 — Models */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            {stepBadge(2)}
            Pick up to {MAX_SELECT[mode]} models
            <span className="normal-case font-normal">— results appear side by side</span>
          </p>
          <Link
            href="/settings"
            className="flex items-center gap-1 text-[11px] text-primary hover:underline shrink-0"
            title="Bring your own provider keys to generate on your own quota"
          >
            <KeyRound className="w-3 h-3" />
            Use your own API keys
          </Link>
        </div>
        {activeModels.length === 0 ? (
          <p className="text-xs text-muted-foreground border border-dashed border-border rounded-xl p-4">
            {mode === "video" ? (
              hfDepleted ? (
                <>
                  Video is paused — the app&apos;s free Hugging Face credits are used up this month. Add
                  your own HF token in{" "}
                  <Link href="/settings" className="text-primary hover:underline">Settings → API Keys</Link>{" "}
                  (free at huggingface.co/settings/tokens) to generate video on your own quota.
                </>
              ) : (
                "No video models configured. Add HF_TOKEN (free at huggingface.co) to unlock LTX-Video and Wan 2.2 — see ENVIRONMENT.md."
              )
            ) : (
              "No image models configured. Add NVIDIA_API_KEY — see ENVIRONMENT.md."
            )}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {activeModels.map((m) => {
              const isSel = chosen.includes(m.id);
              const p = PROVIDER_STYLE[m.provider];
              const eta = modelEta(m.id, m.kind);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleModel(m.id)}
                  className={`relative px-3 py-2.5 rounded-xl border text-left transition-all ${
                    isSel
                      ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
                      : "panel-warm bg-card hover:border-primary/50 hover:bg-muted/40"
                  }`}
                >
                  {isSel && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                  <span className="block text-xs font-semibold pr-5 truncate">{m.label}</span>
                  <span className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                    <span className={`w-1.5 h-1.5 rounded-full ${p?.dot || "bg-muted-foreground"}`} />
                    {p?.name || m.provider}
                    {byok.includes(m.provider) && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-primary bg-primary/10 border border-primary/25 px-1 py-px rounded" title="Generates on your own API key">
                        <KeyRound className="w-2 h-2" />
                        your key
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-0.5">
                      {eta.slow ? <Clock className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
                      {eta.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {hfDepleted && activeModels.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            ⏸ Hugging Face models are hidden — the app&apos;s free monthly credits are used up. Add your
            own HF token in{" "}
            <Link href="/settings" className="text-primary hover:underline">Settings → API Keys</Link>{" "}
            to bring them back on your own quota.
          </p>
        )}
        {missingProviders.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            💡 Unlock more free models: add{" "}
            {missingProviders.map((p) => (p === "cloudflare" ? "Cloudflare Workers AI" : p === "hf" ? "Hugging Face" : p)).join(" and ")}{" "}
            keys — both have free tiers. See ENVIRONMENT.md.
          </p>
        )}
      </div>

      {/* Step 3 — Generate */}
      <Button
        onClick={handleGenerate}
        disabled={running || chosen.length === 0 || outOfCredits}
        className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 gap-2 rounded-xl text-sm font-semibold"
      >
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "image" ? <ImageIcon className="w-4 h-4" /> : <Film className="w-4 h-4" />}
        {running
          ? "Generating…"
          : outOfCredits
          ? "Daily credits used — resets at midnight UTC"
          : `Generate ${chosen.length || ""} ${mode}${chosen.length > 1 ? "s" : ""}`}
      </Button>
      {outOfCredits && (
        <p className="text-xs text-center text-destructive -mt-2">
          You&apos;ve used all {credits!.total} free daily credits (images {credits!.imageCost}, videos {credits!.videoCost}).
        </p>
      )}

      {/* Results */}
      {chosen.some((id) => results[id]) && (
        <div className={`grid gap-3 md:gap-4 ${chosen.filter((id) => results[id]).length <= 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
          {chosen.map((id) => {
            const r = results[id];
            const m = modelById(id);
            if (!r) return null;
            const src = r.media?.base64 || r.media?.url || null;
            const elapsed = r.startedAt ? Math.floor((Date.now() - r.startedAt) / 1000) : 0;
            const eta = modelEta(id, (m?.kind || mode) as "image" | "video");
            return (
              <div key={id} className="rounded-2xl border panel-warm bg-card overflow-hidden shadow-md shadow-primary/5">
                <div className="px-3 py-2 border-b border-border/60 bg-muted/40 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold truncate flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${PROVIDER_STYLE[m?.provider || ""]?.dot || "bg-muted-foreground"}`} />
                    {m?.label || id}
                  </span>
                  {r.state === "loading" && (
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                      {elapsed}s · usually {eta.label}
                    </span>
                  )}
                  {src && r.state === "done" && (
                    <button
                      onClick={() => downloadMedia(src, `promptstudio-${id}.${r.kind === "video" ? "mp4" : "jpg"}`)}
                      className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="aspect-video bg-muted/50 flex items-center justify-center p-2 text-center relative overflow-hidden">
                  {r.state === "loading" && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-pulse" />
                      <div className="flex flex-col items-center gap-2 text-muted-foreground relative">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <span className="text-xs font-medium">{r.stage || "Generating…"}</span>
                        {eta.slow && (
                          <span className="text-[10px] text-muted-foreground/70">
                            This model is worth the wait — feel free to keep browsing.
                          </span>
                        )}
                      </div>
                    </>
                  )}
                  {r.state === "error" && (
                    <div className="flex flex-col items-center gap-2 px-4 max-w-sm">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      <p className="text-xs font-medium text-destructive">{r.error}</p>
                      {r.errorHint && <p className="text-[11px] text-muted-foreground">{r.errorHint}</p>}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs mt-1"
                        onClick={() => retryOne(id)}
                        disabled={running}
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </Button>
                    </div>
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

      {/* First-run helper (standalone tab, nothing generated yet) */}
      {standalone && !chosen.some((id) => results[id]) && (
        <div className="rounded-2xl border border-dashed border-border p-4 text-center">
          <Wand2 className="w-5 h-5 text-primary mx-auto mb-1.5" />
          <p className="text-sm font-medium">Describe it, pick your models, hit Generate.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Every image is saved to your <Link href="/studio" className="text-primary hover:underline">Gallery</Link> automatically.
            Want richer prompts? Use the <span className="font-medium">From Text</span> tab to turn an idea into an optimized prompt first.
          </p>
        </div>
      )}
    </div>
  );
}
