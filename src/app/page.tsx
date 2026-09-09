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
  ShieldCheck,
  Cpu,
  ArrowRight,
  Check,
  Zap,
  Film,
  KeyRound,
  CloudUpload,
  Layers,
  MousePointerClick,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const PROVIDER_DOT: Record<string, string> = {
  NVIDIA: "bg-[#76B900]",
  Cloudflare: "bg-[#F6821F]",
  "Hugging Face": "bg-[#FFD21E]",
  Google: "bg-[#4285F4]",
};

const IMAGE_MODELS = [
  { name: "FLUX.2 Klein", provider: "NVIDIA", tag: "Fast" },
  { name: "Cosmos 3 Super", provider: "NVIDIA", tag: "Newest" },
  { name: "Nano Banana", provider: "Google", tag: "Gemini image" },
  { name: "FLUX.2 Klein 4B", provider: "Cloudflare", tag: "New" },
  { name: "FLUX.2 Klein 9B", provider: "Cloudflare", tag: "Quality" },
  { name: "Leonardo Phoenix", provider: "Cloudflare", tag: "Vivid" },
  { name: "Lucid Origin", provider: "Cloudflare", tag: "Sharp" },
  { name: "FLUX.1 Schnell", provider: "Cloudflare", tag: "Fast" },
  { name: "SDXL Lightning", provider: "Cloudflare", tag: "Realistic" },
  { name: "SDXL Base", provider: "Cloudflare", tag: "Classic" },
  { name: "DreamShaper 8", provider: "Cloudflare", tag: "Artistic" },
  { name: "FLUX.1 Schnell", provider: "Hugging Face", tag: "Fast" },
  { name: "SDXL", provider: "Hugging Face", tag: "Classic" },
  { name: "Qwen-Image", provider: "Hugging Face", tag: "Text-in-image" },
];

const VIDEO_MODELS = [
  { name: "LTX-Video", provider: "Hugging Face", tag: "Fastest" },
  { name: "Wan 2.2 (5B)", provider: "Hugging Face", tag: "Fast" },
  { name: "Wan 2.2 (14B)", provider: "Hugging Face", tag: "Cinematic" },
  { name: "HunyuanVideo", provider: "Hugging Face", tag: "13B" },
];

const STATS = [
  { value: "14", label: "image models" },
  { value: "4", label: "video models" },
  { value: "4", label: "free providers" },
  { value: "10", label: "daily credits" },
];

// ─── Floating pill navbar ────────────────────────────────────────────────────

function LandingNav() {
  const { user, loading } = useAuth();

  return (
    <div className="sticky top-4 z-50 px-4">
      <header className="mx-auto max-w-6xl rounded-2xl border border-border/60 glass shadow-lg shadow-black/5">
        <div className="flex items-center justify-between px-4 md:px-5 py-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={34} className="rounded-xl shadow-md shadow-primary/20" />
            <span className="text-base font-bold font-headline tracking-tight">PromptStudio</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            {[
              ["#product", "Product"],
              ["#features", "Features"],
              ["#how", "How it works"],
              ["#models", "Models"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemePalette />
            {!loading && user ? (
              <Button asChild size="sm" className="rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90">
                <Link href="/studio">Open Studio<ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-full">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild size="sm" className="rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90">
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}

// ─── Hero mockup: the studio window, full-width under the headline ───────────

function HeroMockup() {
  // Real assets: two images generated with the app's own NVIDIA pipeline and
  // an actual Wan 2.2 text-to-video render, looping muted like a live result.
  const cells = [
    {
      label: "FLUX.2 Klein", provider: "NVIDIA", state: "done", meta: "1024×768 · 4.2s",
      art: (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src="/demo/render-garden.jpg" alt="AI render — rooftop garden at golden hour" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      ),
    },
    {
      label: "Leonardo Phoenix", provider: "Cloudflare", state: "done", meta: "1024×768 · 6.8s",
      art: (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src="/demo/render-aurora.jpg" alt="AI render — northern lights over mountains" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      ),
    },
    {
      label: "Qwen-Image", provider: "Hugging Face", state: "gen", meta: "68% · ~6s left",
      art: (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/demo/render-garden.jpg" alt="" className="absolute inset-0 w-full h-full object-cover blur-lg scale-110 opacity-40" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/15 to-transparent animate-pulse" />
          <div className="absolute inset-x-6 bottom-1/2 translate-y-1/2">
            <div className="h-1 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full w-[68%] rounded-full bg-primary" />
            </div>
          </div>
        </>
      ),
    },
    {
      label: "Wan 2.2 · video", provider: "Hugging Face", state: "video", meta: "0:05 · 16 fps",
      art: (
        <video
          src="/demo/render-video.mp4"
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ),
    },
  ];
  return (
    <div className="relative mx-auto w-full max-w-4xl animate-float">
      <div className="absolute -inset-8 bg-gradient-to-r from-primary/25 via-primary/10 to-accent/25 blur-3xl rounded-full opacity-70" />
      <div className="relative rounded-3xl border panel-warm bg-card/95 shadow-2xl shadow-primary/15 overflow-hidden backdrop-blur">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 px-5 py-3.5 border-b border-border/60 bg-muted/40">
          <span className="w-3 h-3 rounded-full bg-destructive/60" />
          <span className="w-3 h-3 rounded-full bg-primary/60" />
          <span className="w-3 h-3 rounded-full bg-secondary" />
          <span className="ml-3 text-xs text-muted-foreground font-code">promptstudio — image &amp; video studio</span>
          <span className="ml-auto hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            ⚡ 8/10 credits
          </span>
        </div>

        <div className="p-5 md:p-6 grid md:grid-cols-[1fr,1.4fr] gap-5">
          {/* Left: prompt + steps */}
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-border/60 bg-background/60 p-3.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <Wand2 className="h-3 w-3" /> Step 1 · Prompt
              </p>
              <p className="text-sm text-foreground/85 leading-snug">
                &ldquo;Lush rooftop garden at golden hour, cinematic wide angle, warm volumetric light&rdquo;
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-3.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <Layers className="h-3 w-3" /> Step 2 · Models
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cells.map((c) => (
                  <span key={c.label} className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-lg border border-primary/30 bg-primary/10">
                    <span className={`w-1.5 h-1.5 rounded-full ${PROVIDER_DOT[c.provider]}`} />
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-center text-xs font-semibold py-2.5 flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Step 3 · Generate 4 at once
            </div>
            <div className="mt-auto rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3 text-primary" /> Live status
              </p>
              {[
                ["FLUX.2 Klein", "done · 4.2s"],
                ["Leonardo Phoenix", "done · 6.8s"],
                ["Qwen-Image", "rendering · 68%"],
                ["Wan 2.2 video", "done · 0:05"],
              ].map(([name, st]) => (
                <div key={name} className="flex items-center justify-between text-[11px]">
                  <span className="font-medium">{name}</span>
                  <span className={st.startsWith("done") ? "text-primary" : "text-muted-foreground animate-pulse"}>{st}</span>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                All results save to your gallery automatically
              </p>
            </div>
          </div>

          {/* Right: results grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {cells.map((c) => (
              <div key={c.label} className="rounded-xl border border-primary/20 bg-background/40 overflow-hidden">
                <div className="px-2.5 py-1.5 border-b border-border/50 flex items-center justify-between bg-card/60">
                  <span className="text-[10px] font-semibold truncate">{c.label}</span>
                  {c.state === "done" && <Check className="w-3 h-3 text-primary shrink-0" />}
                </div>
                <div className="relative aspect-[4/3] overflow-hidden">
                  {c.art}
                  <span className="absolute bottom-1.5 right-2 text-[8px] font-code text-white/85 bg-black/40 px-1.5 py-0.5 rounded">
                    {c.meta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Scrolling model marquee ─────────────────────────────────────────────────

function ModelMarquee() {
  const all = [...IMAGE_MODELS, ...VIDEO_MODELS.map((m) => ({ ...m, tag: `${m.tag} video` }))];
  const Chip = ({ m }: { m: (typeof all)[number] }) => (
    <span className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border panel-warm bg-card whitespace-nowrap mx-1.5">
      <span className={`w-2 h-2 rounded-full ${PROVIDER_DOT[m.provider] || "bg-primary"}`} />
      {m.name}
      <span className="text-[10px] text-muted-foreground">{m.tag}</span>
    </span>
  );
  return (
    <div className="relative overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex w-max animate-marquee">
        {all.map((m, i) => <Chip key={`a-${i}`} m={m} />)}
        {all.map((m, i) => <Chip key={`b-${i}`} m={m} />)}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { user, loading } = useAuth();
  const primaryCta = !loading && user
    ? { href: "/studio", label: "Open Studio" }
    : { href: "/register", label: "Start creating — free" };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      {/* ─── Hero: centered statement + full-width studio window ── */}
      <section id="product" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid opacity-50 pointer-events-none" />
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary/15 blur-3xl rounded-full" />

        <div className="container relative mx-auto max-w-7xl px-4 md:px-6 pt-14 md:pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            18 AI models · 4 free providers · one studio
          </div>

          <h1 className="font-headline text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02] max-w-4xl mx-auto">
            One idea.{" "}
            <span className="text-gradient from-primary via-orange-400 to-primary animate-gradient">
              Every model.
            </span>
            <br className="hidden sm:block" />{" "}
            Best result wins.
          </h1>

          <p className="mt-7 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Turn ideas and screenshots into optimized prompts, then render them on up to{" "}
            <strong className="text-foreground font-semibold">4 image models</strong> and{" "}
            <strong className="text-foreground font-semibold">2 video models</strong> at once —
            compare side by side, keep only the best.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="h-12 px-8 text-base rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25">
              <Link href={primaryCta.href}>
                {primaryCta.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base rounded-full">
              <a href="#models">Explore the models</a>
            </Button>
          </div>

          {/* Stats row */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl border panel-warm bg-card/60 py-4">
                <p className="font-headline text-3xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-14">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ─── Model marquee ───────────────────────────────────── */}
      <section className="border-y border-border/50 bg-muted/30 py-6">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-4">
          The fleet — every model, one click away
        </p>
        <ModelMarquee />
      </section>

      {/* ─── Features: bento grid ────────────────────────────── */}
      <section id="features" className="container mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            A complete studio,<br />not just a prompt box
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Big card 1 */}
          <div className="md:col-span-2 card-hover rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-8 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 bg-primary/15 blur-3xl rounded-full" />
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center mb-5">
              <Wand2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-headline font-bold text-2xl mb-2.5">Multi-model generation — let them compete</h3>
            <p className="text-muted-foreground leading-relaxed max-w-lg">
              The same prompt, rendered simultaneously on up to 4 image models across NVIDIA,
              Cloudflare, and Hugging Face. Results land side by side with live progress, honest
              ETAs, and one-click download. The best shot is never a guess.
            </p>
          </div>

          {/* Small card */}
          <div className="card-hover rounded-3xl border panel-warm bg-card p-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center mb-5">
              <Film className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-headline font-bold text-xl mb-2.5">Text-to-video built in</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your prompt is auto-adapted with motion and camera language, then rendered with
              LTX-Video, Wan 2.2, or HunyuanVideo.
            </p>
          </div>

          {/* Small card */}
          <div className="card-hover rounded-3xl border panel-warm bg-card p-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center mb-5">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-headline font-bold text-xl mb-2.5">Semantic prompt engine</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Paste a blog post or upload a screenshot — get a master prompt plus versions tuned
              for Midjourney, DALL·E 3, Stable Diffusion, and Flux.
            </p>
          </div>

          {/* Big card 2 */}
          <div className="md:col-span-2 card-hover rounded-3xl border border-border bg-gradient-to-bl from-accent/20 via-card to-card p-8 relative overflow-hidden">
            <div className="pointer-events-none absolute -bottom-10 -left-10 w-48 h-48 bg-accent/20 blur-3xl rounded-full" />
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center mb-5">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-headline font-bold text-2xl mb-2.5">Bring your own keys — verified live</h3>
            <p className="text-muted-foreground leading-relaxed max-w-lg">
              Add your Hugging Face, NVIDIA, OpenAI, Gemini, DeepSeek, or Ollama keys. Each one is
              tested against the live provider before saving, stored encrypted, and re-testable
              anytime with one click — then generation runs on your own quota.
            </p>
          </div>

          {/* Row of three small */}
          {[
            {
              icon: Gauge,
              title: "Fair daily credits",
              body: "10 free credits daily (images 1, videos 2) — auto-refunded whenever a provider fails. Resets at midnight UTC.",
            },
            {
              icon: CloudUpload,
              title: "Cloud gallery",
              body: "Every generation saves to your account-synced gallery automatically — nothing gets lost between sessions.",
            },
            {
              icon: ShieldCheck,
              title: "Google sign-in",
              body: "Verified emails only, no fake accounts. Your account is created automatically on first sign-in.",
            },
          ].map((f) => (
            <div key={f.title} className="card-hover rounded-3xl border panel-warm bg-card p-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center mb-5">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-headline font-bold text-xl mb-2.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it works: connected timeline ────────────────── */}
      <section id="how" className="bg-muted/30 border-y border-border/50">
        <div className="container mx-auto max-w-5xl px-4 md:px-6 py-20 md:py-28">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Idea to image — or video —<br />in three moves
            </h2>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-7 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-primary/60 via-primary/30 to-primary/60" />
            <div className="grid md:grid-cols-3 gap-10 md:gap-6">
              {[
                {
                  icon: FileText,
                  title: "Drop in your idea",
                  body: "A sentence, a blog post, or a screenshot. One-click Enhance turns rough thoughts into a rich visual brief.",
                },
                {
                  icon: MousePointerClick,
                  title: "Pick your fighters",
                  body: "Choose up to 4 image models or 2 video models. Provider, speed, and style hints are right on the card.",
                },
                {
                  icon: Sparkles,
                  title: "Generate & compare",
                  body: "All models render in parallel with live progress. Keep the winner — everything saves to your gallery.",
                },
              ].map((s, i) => (
                <div key={s.title} className="text-center relative">
                  <div className="relative inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground items-center justify-center shadow-lg shadow-primary/25 mb-5">
                    <s.icon className="w-6 h-6" />
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border border-primary/40 text-primary text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-headline font-bold text-xl mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Models: provider columns ────────────────────────── */}
      <section id="models" className="container mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full mb-5">
            <Cpu className="w-3.5 h-3.5" /> 14 image models · 4 video models
          </div>
          <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            A real multi-model fleet
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Three free providers. Models come and go — dead ones are removed, new ones added, so
            everything you see actually works.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {(
            [
              {
                prov: "NVIDIA" as const,
                blurb: "Hosted free on build.nvidia.com — the fastest renders in the fleet, including the brand-new Cosmos 3 Super.",
              },
              {
                prov: "Google" as const,
                blurb: "Gemini's Nano Banana image model — great at following instructions. Runs on the app key or your own free Gemini key.",
              },
              {
                prov: "Cloudflare" as const,
                blurb: "Workers AI free tier — 10,000 neurons refresh every day, powering the biggest slice of the fleet.",
              },
              {
                prov: "Hugging Face" as const,
                blurb: "The HF router unlocks Qwen-Image and every video model. Bring your own free token for your own quota.",
              },
            ]
          ).map(({ prov, blurb }) => {
            const imgs = IMAGE_MODELS.filter((m) => m.provider === prov);
            const vids = VIDEO_MODELS.filter((m) => m.provider === prov);
            return (
              <div key={prov} className="flex flex-col rounded-3xl border panel-warm bg-card overflow-hidden">
                <div className="relative px-5 py-4 border-b border-primary/15 bg-gradient-to-r from-primary/10 to-transparent flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${PROVIDER_DOT[prov]}`} />
                  <span className="font-headline font-bold">{prov}</span>
                  <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {imgs.length + vids.length} models
                  </span>
                </div>
                <ul className="p-3 flex-1">
                  {imgs.map((m, i) => (
                    <li key={`${m.name}-${i}`} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-muted/50 transition-colors">
                      <ImageIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">{m.name}</span>
                      <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                        {m.tag}
                      </span>
                    </li>
                  ))}
                  {vids.map((m) => (
                    <li key={m.name} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-muted/50 transition-colors">
                      <Film className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">{m.name}</span>
                      <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/40 text-accent-foreground border border-border shrink-0">
                        {m.tag} video
                      </span>
                    </li>
                  ))}
                  {prov === "NVIDIA" && (
                    <li className="px-2.5 pt-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                        Straight from these models
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative rounded-lg overflow-hidden border border-primary/20 aspect-[4/3]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/demo/render-garden.jpg" alt="FLUX.2 Klein render" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                          <span className="absolute bottom-1 left-1.5 text-[8px] font-code text-white/90 bg-black/45 px-1.5 py-0.5 rounded">
                            Klein · 4.2s
                          </span>
                        </div>
                        <div className="relative rounded-lg overflow-hidden border border-primary/20 aspect-[4/3]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/demo/render-aurora.jpg" alt="NVIDIA render" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                          <span className="absolute bottom-1 left-1.5 text-[8px] font-code text-white/90 bg-black/45 px-1.5 py-0.5 rounded">
                            Klein · 3.4s
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                        <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          <span className="text-foreground font-semibold">Fastest in the fleet</span> — typical render 3–5s, no daily cap
                        </p>
                      </div>
                    </li>
                  )}
                </ul>
                <p className="px-5 py-4 border-t border-border/50 bg-muted/20 text-xs text-muted-foreground leading-relaxed">
                  {blurb}
                </p>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-primary" />
          Prompt engine powered by Google Gemini 2.5 Flash · video via the Hugging Face → fal pipeline
        </p>
      </section>

      {/* ─── Final CTA ───────────────────────────────────────── */}
      <section className="container mx-auto max-w-7xl px-4 md:px-6 pb-20 md:pb-28">
        {/* Gradient ring wrapper */}
        <div className="rounded-[2.5rem] bg-gradient-to-br from-primary/60 via-primary/15 to-primary/40 p-px shadow-2xl shadow-primary/15">
          <div className="relative overflow-hidden rounded-[calc(2.5rem-1px)] bg-gradient-to-b from-card via-background to-card p-10 md:p-16 text-center">
            <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-72 bg-primary/20 blur-3xl rounded-full" />
            <div className="relative">
              <Logo size={64} className="mx-auto rounded-2xl shadow-xl shadow-primary/25 mb-7" />
              <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight max-w-2xl mx-auto">
                Let the models{" "}
                <span className="text-gradient from-primary via-orange-400 to-primary animate-gradient">compete</span>
                {" "}for your best shot
              </h2>
              <p className="mt-5 text-muted-foreground text-lg max-w-xl mx-auto">
                Sign in with Google and start creating in seconds — no card, no setup.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-2.5">
                {["10 free credits daily", "17 AI models", "Images + video", "Bring your own keys"].map((chip) => (
                  <span key={chip} className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-full border border-primary/25 bg-primary/10 text-foreground/90">
                    <Check className="w-3 h-3 text-primary" />
                    {chip}
                  </span>
                ))}
              </div>
              <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg" className="h-12 px-8 text-base rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25">
                  <Link href={primaryCta.href}>
                    {primaryCta.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                {!user && (
                  <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base rounded-full">
                    <Link href="/login">I already have an account</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer: multi-column ────────────────────────────── */}
      <footer className="border-t border-border/50 bg-muted/20">
        <div className="container mx-auto max-w-7xl px-4 md:px-6 py-12 grid gap-10 md:grid-cols-[1.5fr,1fr,1fr,1fr]">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <Logo size={34} className="rounded-xl" />
              <span className="font-headline font-bold text-lg">PromptStudio</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              One idea, every model — optimized prompts, multi-model image generation, and
              text-to-video in a single studio.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Contact:{" "}
              <a href="mailto:promptstudios55@gmail.com" className="text-primary hover:underline">
                promptstudios55@gmail.com
              </a>
            </p>
          </div>

          {[
            {
              title: "Product",
              links: [
                ["/studio", "Open Studio"],
                ["/studio", "Image & Video"],
                ["/settings", "API Keys (BYOK)"],
                ["/feedback", "Feedback"],
              ],
            },
            {
              title: "Explore",
              links: [
                ["#features", "Features"],
                ["#how", "How it works"],
                ["#models", "The model fleet"],
                ["#product", "Product tour"],
              ],
            },
            {
              title: "Account",
              links: [
                ["/login", "Sign in"],
                ["/register", "Get started"],
                ["/settings", "Settings"],
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <p className="font-semibold text-sm mb-3">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map(([href, label]) => (
                  <li key={`${col.title}-${label}`}>
                    {href.startsWith("#") ? (
                      <a href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {label}
                      </a>
                    ) : (
                      <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border/50">
          <div className="container mx-auto max-w-7xl px-4 md:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              © 2026 PromptStudio · Built by <span className="text-foreground font-medium">Neel Sahani</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Powered by NVIDIA · Cloudflare · Hugging Face · Gemini
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
