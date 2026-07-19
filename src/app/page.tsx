"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Logo } from "@/components/logo";
import { ThemePalette } from "@/components/theme-palette";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Wand2,
  FileText,
  Image as ImageIcon,
  Gauge,
  Palette,
  ShieldCheck,
  Cpu,
  ArrowRight,
  Check,
  Zap,
  Film,
  KeyRound,
  CloudUpload,
} from "lucide-react";

const PROMPT_FORMATS = ["Master (Universal)", "Midjourney v6", "DALL·E 3", "Stable Diffusion", "Flux"];

const IMAGE_MODELS = [
  { name: "FLUX.2 Klein", provider: "NVIDIA", tag: "Fast" },
  { name: "FLUX.1 Dev", provider: "NVIDIA", tag: "High quality" },
  { name: "FLUX.1 Schnell", provider: "Cloudflare", tag: "Fast" },
  { name: "SDXL Lightning", provider: "Cloudflare", tag: "Realistic" },
  { name: "SDXL Base", provider: "Cloudflare", tag: "Classic" },
  { name: "DreamShaper 8", provider: "Cloudflare", tag: "Artistic" },
  { name: "FLUX.1 Schnell", provider: "Hugging Face", tag: "Fast" },
  { name: "SDXL", provider: "Hugging Face", tag: "Classic" },
  { name: "Qwen-Image", provider: "Hugging Face", tag: "Text-in-image" },
];

const VIDEO_MODELS = [
  { name: "Wan 2.2", provider: "Hugging Face · fal", tag: "Cinematic" },
  { name: "HunyuanVideo", provider: "Hugging Face · fal", tag: "13B cinematic" },
];

const FEATURES = [
  {
    icon: FileText,
    title: "Semantic text-to-prompt",
    body: "Understands topic, tone, and context — not keyword stuffing. Paste a blog post and get prompts that actually capture the idea.",
  },
  {
    icon: Wand2,
    title: "Media Studio — 4 models at once",
    body: "Generate the same prompt on up to 4 image models side by side and keep the best. FLUX, SDXL, Qwen-Image and more.",
  },
  {
    icon: Film,
    title: "Video generation",
    body: "Your master prompt is auto-adapted with motion and camera language, then rendered with Wan 2.2 or HunyuanVideo.",
  },
  {
    icon: KeyRound,
    title: "Bring your own API keys",
    body: "Add your own Hugging Face, NVIDIA, OpenAI, Gemini, DeepSeek or Ollama keys — live-verified, stored encrypted, generation on your own quota.",
  },
  {
    icon: Gauge,
    title: "Fair daily credits",
    body: "10 free credits every day (images 1, videos 2) with automatic refunds when a provider fails. Resets at midnight UTC.",
  },
  {
    icon: CloudUpload,
    title: "Cloud gallery + 10 themes",
    body: "Every generation saved to your account-synced gallery, in an interface that recolours across ten hand-tuned themes.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Drop in your content",
    body: "Paste a blog post, article, or idea — or upload a screenshot you want to reimagine. One-click Enhance turns rough ideas into rich briefs.",
    icon: FileText,
  },
  {
    n: "02",
    title: "AI crafts the prompts",
    body: "A master universal prompt plus platform-tuned versions for Midjourney, DALL·E 3, Stable Diffusion and Flux — with quality scores and 3 creative variants.",
    icon: Wand2,
  },
  {
    n: "03",
    title: "Generate images & video",
    body: "Fire up to 4 image models at once, compare results side by side, switch to Video mode for motion — everything lands in your gallery.",
    icon: Sparkles,
  },
];

const HIGHLIGHTS = [
  { icon: ImageIcon, label: "9 image models · 2 video models" },
  { icon: KeyRound, label: "Bring your own API keys" },
  { icon: Zap, label: "10 free credits daily" },
  { icon: ShieldCheck, label: "Google sign-in — no fake accounts" },
];

function LandingNav() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 glass">
      <div className="container mx-auto max-w-6xl flex items-center justify-between px-4 md:px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md" />
            <Logo size={38} className="relative rounded-xl shadow-lg shadow-primary/20" />
          </div>
          <div>
            <span className="text-lg font-bold font-headline tracking-tight">PromptStudio</span>
            <p className="text-[11px] text-muted-foreground leading-none hidden sm:block">
              Prompts · Images · Video
            </p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#models" className="hover:text-foreground transition-colors">Models</a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemePalette />
          {!loading && user ? (
            <Button asChild size="sm" className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90">
              <Link href="/studio">Open Studio<ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90">
                <Link href="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// Mockup of the Media Studio: prompt → 4 image models generating side by side.
function HeroMockup() {
  const cells = [
    { label: "FLUX.2 Klein", state: "done" },
    { label: "SDXL Lightning", state: "done" },
    { label: "Qwen-Image", state: "gen" },
    { label: "Wan 2.2 · video", state: "video" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-6 bg-primary/20 blur-3xl rounded-full opacity-60" />
      <div className="relative rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10 overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/60 bg-muted/40">
          <span className="w-3 h-3 rounded-full bg-destructive/60" />
          <span className="w-3 h-3 rounded-full bg-primary/60" />
          <span className="w-3 h-3 rounded-full bg-secondary" />
          <span className="ml-3 text-xs text-muted-foreground font-code">promptstudio / media-studio</span>
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            ⚡ 8/10 credits
          </span>
        </div>

        <div className="p-5 space-y-4">
          {/* Prompt */}
          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
              <Wand2 className="h-3 w-3" /> Master prompt
            </p>
            <p className="text-sm text-foreground/80 leading-snug">
              &ldquo;Lush rooftop garden at golden hour, cinematic wide angle, warm volumetric light…&rdquo;
            </p>
          </div>

          {/* Model grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {cells.map((c) => (
              <div key={c.label} className="rounded-lg border border-border/60 bg-background/40 overflow-hidden">
                <div className="px-2.5 py-1.5 border-b border-border/50 flex items-center justify-between">
                  <span className="text-[10px] font-semibold truncate">{c.label}</span>
                  {c.state === "done" && <Check className="w-3 h-3 text-primary shrink-0" />}
                </div>
                <div className="aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-primary/15 via-accent/10 to-secondary/20">
                  {c.state === "gen" && (
                    <span className="text-[10px] text-muted-foreground animate-pulse">generating…</span>
                  )}
                  {c.state === "video" && <Film className="w-5 h-5 text-primary/70" />}
                  {c.state === "done" && <ImageIcon className="w-5 h-5 text-primary/70" />}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Pick the best — all saved to your gallery
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const primaryCta = !loading && user
    ? { href: "/studio", label: "Open Studio" }
    : { href: "/register", label: "Start creating — free" };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-dot-grid">
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 bg-primary/20 blur-3xl rounded-full" />
        <div className="pointer-events-none absolute top-40 -right-24 w-96 h-96 bg-accent/30 blur-3xl rounded-full" />

        <div className="container mx-auto max-w-6xl px-4 md:px-6 pt-4 md:pt-6 pb-20 md:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Prompts · Images · Video — one studio
              </div>

              <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
                One idea.{" "}
                <span className="text-gradient from-primary to-primary/50">Every model.</span>{" "}
                Best result wins.
              </h1>

              <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                PromptStudio turns blog posts, screenshots, and ideas into platform-optimized prompts —
                then generates <strong className="text-foreground">images on up to 4 AI models at once</strong> and{" "}
                <strong className="text-foreground">videos on 2</strong>, so you compare and keep only the best.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button asChild size="lg" className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20">
                  <Link href={primaryCta.href}>
                    {primaryCta.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#models">See the models</a>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 justify-center lg:justify-start">
                {HIGHLIGHTS.map((h) => (
                  <span key={h.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <h.icon className="w-3.5 h-3.5 text-primary" />
                    {h.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:pl-6">
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Prompt formats strip ─────────────────────────────── */}
      <section className="border-y border-border/50 bg-muted/30">
        <div className="container mx-auto max-w-6xl px-4 md:px-6 py-8">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-5">
            Every generation includes prompts tuned for
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {PROMPT_FORMATS.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full border border-border bg-card"
              >
                <span className="w-2 h-2 rounded-full bg-primary" />
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────── */}
      <section id="features" className="container mx-auto max-w-6xl px-4 md:px-6 py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-headline text-3xl sm:text-4xl font-bold tracking-tight">
            A complete studio, not just a prompt box
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            From intelligent analysis to multi-model generation, credits, and your own API keys.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="card-hover rounded-2xl border border-border bg-card p-6"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────── */}
      <section id="how" className="bg-muted/30 border-y border-border/50">
        <div className="container mx-auto max-w-6xl px-4 md:px-6 py-20 md:py-28">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-headline text-3xl sm:text-4xl font-bold tracking-tight">
              From idea to image — or video — in three steps
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              No prompt-engineering expertise required. PromptStudio does the heavy lifting.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative rounded-2xl border border-border bg-card p-7">
                <div className="flex items-center justify-between mb-5">
                  <span className="font-headline text-4xl font-extrabold text-primary/25">{s.n}</span>
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 text-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Models ───────────────────────────────────────────── */}
      <section id="models" className="container mx-auto max-w-6xl px-4 md:px-6 py-20 md:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-5">
              <Cpu className="w-3.5 h-3.5" /> 9 image models · 2 video models · 3 providers
            </div>
            <h2 className="font-headline text-3xl sm:text-4xl font-bold tracking-tight">
              A real multi-model fleet — pick up to 4 and let them compete
            </h2>
            <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
              Image generation runs across NVIDIA, Cloudflare Workers AI, and Hugging Face.
              Video runs on Wan 2.2 and HunyuanVideo. The prompt engine itself is powered by
              Google Gemini 2.5 Flash.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Select up to 4 image models — all generate in parallel",
                "Video prompts auto-adapted with motion + camera language",
                "Bring your own keys and generate on your own quota",
                "10 free daily credits, auto-refunded if a provider fails",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </span>
                  <span className="text-foreground/80">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5 text-primary" /> Image models
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {IMAGE_MODELS.map((m, i) => (
                <div key={`${m.name}-${i}`} className="card-hover rounded-xl border border-border bg-card p-3.5">
                  <p className="font-semibold text-sm truncate">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">{m.provider}</p>
                  <span className="mt-1.5 inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {m.tag}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pt-2">
              <Film className="w-3.5 h-3.5 text-primary" /> Video models
            </p>
            <div className="grid grid-cols-2 gap-3">
              {VIDEO_MODELS.map((m) => (
                <div key={m.name} className="card-hover rounded-xl border border-border bg-card p-3.5">
                  <p className="font-semibold text-sm truncate">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">{m.provider}</p>
                  <span className="mt-1.5 inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {m.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ────────────────────────────────────────── */}
      <section className="container mx-auto max-w-6xl px-4 md:px-6 pb-20 md:pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-10 md:p-16 text-center">
          <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-80 bg-primary/20 blur-3xl rounded-full" />
          <div className="relative">
            <Logo size={56} className="mx-auto rounded-2xl shadow-lg shadow-primary/20 mb-6" />
            <h2 className="font-headline text-3xl sm:text-4xl font-bold tracking-tight max-w-2xl mx-auto">
              Ready to create images and videos that actually impress?
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              Sign in with Google, get 10 free credits every day, and let the models compete for your best shot.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20">
                <Link href={primaryCta.href}>
                  {primaryCta.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {!user && (
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">I already have an account</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border/50">
        <div className="container mx-auto max-w-6xl px-4 md:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo size={28} className="rounded-lg" />
            <span className="font-semibold text-sm">PromptStudio</span>
            <span className="text-xs text-muted-foreground">· Prompts · Images · Video</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#models" className="hover:text-foreground transition-colors">Models</a>
            <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Get Started</Link>
          </div>
        </div>
        <div className="border-t border-border/50">
          <p className="container mx-auto max-w-6xl px-4 md:px-6 py-4 text-center text-xs text-muted-foreground">
            © 2026 PromptStudio · Built by <span className="text-foreground font-medium">Neel Sahani</span> · Contact:{" "}
            <a href="mailto:promptstudios55@gmail.com" className="text-primary hover:underline">promptstudios55@gmail.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
