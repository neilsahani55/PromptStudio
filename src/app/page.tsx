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
  History,
  ShieldCheck,
  Cpu,
  ArrowRight,
  Check,
  Zap,
  Layers,
} from "lucide-react";

const PLATFORMS = ["Midjourney v6", "DALL·E 3", "Stable Diffusion XL", "Flux"];

const FEATURES = [
  {
    icon: FileText,
    title: "Semantic text-to-prompt",
    body: "Understands topic, tone, and context — not keyword stuffing. Paste a blog post and get prompts that actually capture the idea.",
  },
  {
    icon: Wand2,
    title: "Media Studio — up to 4 models at once",
    body: "Generate the same prompt on up to 4 image models side by side (FLUX, SDXL, Qwen-Image and more) and keep the best result.",
  },
  {
    icon: ImageIcon,
    title: "Video generation",
    body: "Turn your master prompt into motion: auto-adapted video prompts rendered with Wan 2.2 and HunyuanVideo.",
  },
  {
    icon: Cpu,
    title: "Bring your own API keys",
    body: "Add your own Hugging Face, NVIDIA, OpenAI, Gemini, DeepSeek or Ollama keys — verified live, stored encrypted, generation on your own quota.",
  },
  {
    icon: Gauge,
    title: "Fair daily credits",
    body: "10 free credits every day (images 1, videos 2) with automatic refunds when a provider fails. Resets at midnight UTC.",
  },
  {
    icon: Palette,
    title: "Cloud gallery + 10 themes",
    body: "Every generation saved to your account-synced gallery, in an interface that recolours across ten hand-tuned themes.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Drop in your content",
    body: "Paste a blog post, article, or idea — or upload a screenshot you want to reimagine.",
    icon: FileText,
  },
  {
    n: "02",
    title: "AI crafts the prompts",
    body: "PromptStudio analyses intent and generates optimized, platform-specific prompts with quality scores.",
    icon: Wand2,
  },
  {
    n: "03",
    title: "Generate & refine",
    body: "Create images in-app, tweak with quick-fix chips, and save everything to your searchable history.",
    icon: Sparkles,
  },
];

const HIGHLIGHTS = [
  { icon: Zap, label: "Automatic model fallback" },
  { icon: History, label: "Searchable local history" },
  { icon: ShieldCheck, label: "JWT auth + admin panel" },
  { icon: Layers, label: "3 creative variants per run" },
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
              Content to Image Prompt Generator
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

function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Glow */}
      <div className="absolute -inset-6 bg-primary/20 blur-3xl rounded-full opacity-60" />
      <div className="relative rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10 overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/60 bg-muted/40">
          <span className="w-3 h-3 rounded-full bg-destructive/60" />
          <span className="w-3 h-3 rounded-full bg-primary/60" />
          <span className="w-3 h-3 rounded-full bg-secondary" />
          <span className="ml-3 text-xs text-muted-foreground font-code">promptstudio / generate</span>
        </div>

        <div className="p-5 space-y-4">
          {/* Input */}
          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Blog input
            </p>
            <p className="text-sm text-foreground/80 leading-snug">
              &ldquo;How sustainable urban gardens are transforming city rooftops into green sanctuaries…&rdquo;
            </p>
          </div>

          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Wand2 className="h-4 w-4 animate-pulse" /> Generating optimized prompts
            </div>
          </div>

          {/* Output chips */}
          <div className="space-y-2">
            {[
              { p: "Midjourney", q: 96, t: "Lush rooftop garden at golden hour, cinematic wide angle --ar 16:9 --v 6" },
              { p: "Flux", q: 94, t: "Photorealistic urban green sanctuary, soft volumetric light, 4k detail" },
              { p: "DALL·E 3", q: 92, t: "Vibrant city rooftop farm, families tending raised beds, warm tones" },
            ].map((row) => (
              <div key={row.p} className="rounded-lg border border-border/60 bg-background/40 p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">{row.p}</span>
                  <span className="text-[10px] font-code px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {row.q}% quality
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-code leading-snug line-clamp-2">{row.t}</p>
              </div>
            ))}
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
        {/* Ambient blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 bg-primary/20 blur-3xl rounded-full" />
        <div className="pointer-events-none absolute top-40 -right-24 w-96 h-96 bg-accent/30 blur-3xl rounded-full" />

        <div className="container mx-auto max-w-6xl px-4 md:px-6 pt-4 md:pt-6 pb-20 md:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                AI-powered prompt engineering
              </div>

              <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
                Turn any content into{" "}
                <span className="text-gradient from-primary to-primary/50">stunning image prompts</span>
              </h1>

              <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                PromptStudio transforms blog posts, screenshots, and ideas into platform-optimized
                prompts — then generates <strong className="text-foreground">images and videos</strong> across
                multiple AI models at once, right in the app. Sign in with Google and create.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button asChild size="lg" className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20">
                  <Link href={primaryCta.href}>
                    {primaryCta.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#how">See how it works</a>
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

      {/* ─── Platforms strip ──────────────────────────────────── */}
      <section className="border-y border-border/50 bg-muted/30">
        <div className="container mx-auto max-w-6xl px-4 md:px-6 py-8">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-5">
            One input, optimized for every major platform
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {PLATFORMS.map((p) => (
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
            Everything you need to prompt like a pro
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            A complete studio — from intelligent analysis to in-app generation and quality scoring.
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
              From idea to image in three steps
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
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-5">
              <Cpu className="w-3.5 h-3.5" /> Six models, one interface
            </div>
            <h2 className="font-headline text-3xl sm:text-4xl font-bold tracking-tight">
              Powered by the best AI models — with automatic fallback
            </h2>
            <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
              Google Gemini 2.5 Flash runs by default. Add an NVIDIA NIM key to unlock DeepSeek,
              Qwen, GLM, Kimi, and GPT-OSS. If a model is slow or unavailable, PromptStudio
              seamlessly falls back to the next one so you always get a result.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Per-user rate limiting keeps costs predictable",
                "Hard request deadlines return clean errors, never hangs",
                "Every generation logged for usage analytics",
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

          <div className="grid grid-cols-2 gap-4">
            {[
              "Gemini 2.5 Flash",
              "DeepSeek V3.2",
              "Qwen 3.5",
              "GLM 4.7",
              "Kimi K2",
              "GPT-OSS 120B",
            ].map((m, i) => (
              <div
                key={m}
                className="card-hover rounded-xl border border-border bg-card p-5 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{m}</p>
                  <p className="text-[11px] text-muted-foreground">{i === 0 ? "Default" : "NVIDIA NIM"}</p>
                </div>
              </div>
            ))}
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
              Ready to create prompts that actually work?
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              Join PromptStudio and turn your next idea into gallery-worthy visuals in seconds.
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
            <span className="text-xs text-muted-foreground">· Content to Image Prompt Generator</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Get Started</Link>
          </div>
        </div>
        <div className="border-t border-border/50">
          <p className="container mx-auto max-w-6xl px-4 md:px-6 py-4 text-center text-xs text-muted-foreground">
            © 2026 PromptStudio · Built by <span className="text-foreground font-medium">Neel Sahani</span> · Contact:{" "}
            <a href="mailto:promptstudio55@gmail.com" className="text-primary hover:underline">promptstudio55@gmail.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
