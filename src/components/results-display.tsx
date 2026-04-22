"use client"

import { AppResult } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, AlertTriangle, Check, Sparkles, Image as ImageIcon, Palette, Zap, Layers, Globe, HelpCircle, ExternalLink, ThumbsUp, ThumbsDown, FileText, Loader2, Download, Columns, Send } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { submitFeedback } from "@/app/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { QuickFixChips, FixType } from "@/components/quick-fix-chips";
import { styleProfiles, BrandStyle } from "@/ai/utils/style-profiles";

const copyToClipboard = (text: string, toast: (options: any) => void, onCopySuccess?: () => void) => {
  const fallbackCopy = () => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      toast({ title: "Copied to clipboard!" });
      if (onCopySuccess) onCopySuccess();
    } catch (err) {
      console.error('Fallback copy failed', err);
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Your browser does not support automatic copying.",
      });
    }
    document.body.removeChild(textArea);
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied to clipboard!" });
      if (onCopySuccess) onCopySuccess();
    }).catch(() => {
      fallbackCopy();
    });
  } else {
    fallbackCopy();
  }
};

// ---- Export Helpers ----

function buildAllPromptsText(
  masterPrompt: string | undefined,
  prompts: Record<string, string> | undefined
): string {
  const lines: string[] = [];
  if (masterPrompt) {
    lines.push('=== Master (Universal) ===');
    lines.push(masterPrompt);
    lines.push('');
  }
  if (prompts) {
    const platformNames: Record<string, string> = {
      midjourney: 'Midjourney',
      dalle: 'DALL-E 3',
      stableDiffusion: 'Stable Diffusion',
      flux: 'Flux',
    };
    for (const [key, value] of Object.entries(prompts)) {
      lines.push(`=== ${platformNames[key] || key} ===`);
      lines.push(value);
      lines.push('');
    }
  }
  return lines.join('\n');
}

function buildMarkdownExport(
  masterPrompt: string | undefined,
  prompts: Record<string, string> | undefined,
  qualityMetrics?: any,
  variants?: any[]
): string {
  const lines: string[] = [];
  lines.push('# PromptStudio - Generated Prompts');
  lines.push('');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('');

  if (qualityMetrics) {
    lines.push(`## Quality Score: ${qualityMetrics.overallScore}/10`);
    if (qualityMetrics.breakdown) {
      lines.push('');
      lines.push('| Metric | Score |');
      lines.push('|--------|-------|');
      lines.push(`| Completeness | ${Math.round(qualityMetrics.breakdown.completeness * 10)}/10 |`);
      lines.push(`| Specificity | ${Math.round(qualityMetrics.breakdown.specificity * 10)}/10 |`);
      lines.push(`| Coherence | ${Math.round(qualityMetrics.breakdown.coherence * 10)}/10 |`);
      lines.push(`| Length Optimization | ${Math.round(qualityMetrics.breakdown.lengthOptimization * 10)}/10 |`);
    }
    lines.push('');
  }

  if (masterPrompt) {
    lines.push('## Master (Universal)');
    lines.push('');
    lines.push('```');
    lines.push(masterPrompt);
    lines.push('```');
    lines.push('');
  }

  if (prompts) {
    const platformNames: Record<string, string> = {
      midjourney: 'Midjourney',
      dalle: 'DALL-E 3',
      stableDiffusion: 'Stable Diffusion',
      flux: 'Flux',
    };
    for (const [key, value] of Object.entries(prompts)) {
      lines.push(`## ${platformNames[key] || key}`);
      lines.push('');
      lines.push('```');
      lines.push(value);
      lines.push('```');
      lines.push('');
    }
  }

  if (variants && variants.length > 0) {
    lines.push('## Variants');
    lines.push('');
    for (const variant of variants) {
      lines.push(`### ${variant.name}`);
      if (variant.prompts) {
        for (const [key, value] of Object.entries(variant.prompts)) {
          lines.push(`\n**${key}**:`);
          lines.push('```');
          lines.push(value as string);
          lines.push('```');
        }
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('*Generated by PromptStudio*');
  return lines.join('\n');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- Components ----

function PromptDisplay({
  title,
  content,
  onCopy,
  onGenerate,
  isGenerating,
  generatedImage,
  generationError,
  platform
}: {
  title: string;
  content: string;
  onCopy: () => void;
  onGenerate?: () => void;
  isGenerating?: boolean;
  generatedImage?: string | null;
  generationError?: string | null;
  platform?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canGenerate = platform === 'flux' || platform === 'stableDiffusion';

  return (
    <div className="group relative">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
          {title}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="relative mb-4">
        <Textarea
          value={content}
          readOnly
          className="pr-12 text-base bg-muted/50 border-muted-foreground/20 focus-visible:ring-offset-0 min-h-[120px] resize-none"
        />
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 shadow-sm"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      {canGenerate && onGenerate && (
        <div className="space-y-4">
            <Button
                onClick={onGenerate}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-primary via-primary/90 to-primary/70 text-primary-foreground border-0 hover:opacity-90"
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Image...
                    </>
                ) : (
                    <>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Generate with {platform === 'flux' ? 'Flux' : 'SD 3.5'}
                    </>
                )}
            </Button>

            {generationError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                    Error: {generationError}
                </div>
            )}

            {generatedImage && (
                <div className="mt-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="relative rounded-lg overflow-hidden border shadow-md bg-muted/20">
                        <img src={generatedImage} alt="Generated result" className="w-full h-auto object-contain max-h-[500px]" />
                    </div>
                    <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(generatedImage, '_blank')}>
                            <ExternalLink className="w-4 h-4 mr-2" /> Open Full
                        </Button>
                        <a href={generatedImage} download={`promptstudio-${platform}-${Date.now()}.png`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                                <Download className="w-4 h-4 mr-2" /> Download
                            </Button>
                        </a>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
}

// ---- Comparison View ----

function ComparisonView({
  primaryPrompts,
  variants,
  masterPrompt,
}: {
  primaryPrompts: Record<string, string>;
  variants: any[];
  masterPrompt?: string;
}) {
  const [selectedPlatform, setSelectedPlatform] = useState('midjourney');
  const platforms = Object.keys(primaryPrompts);

  const getPlatformName = (p: string) => {
    const names: Record<string, string> = { midjourney: 'Midjourney', dalle: 'DALL-E 3', stableDiffusion: 'Stable Diffusion', flux: 'Flux' };
    return names[p] || p;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground uppercase">Compare platform:</span>
        {platforms.map(p => (
          <Button
            key={p}
            variant={selectedPlatform === p ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedPlatform(p)}
          >
            {getPlatformName(p)}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Primary */}
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="default" className="text-xs">Standard</Badge>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {primaryPrompts[selectedPlatform] || 'N/A'}
          </p>
        </div>

        {/* Variants */}
        {variants.map((variant, idx) => (
          <div key={idx} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">{variant.name}</Badge>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {variant.prompts?.[selectedPlatform] || 'N/A'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Refinement Input ----

function RefinementInput({
  onRefine,
  isRefining,
}: {
  onRefine: (instruction: string) => void;
  isRefining: boolean;
}) {
  const [instruction, setInstruction] = useState('');

  const handleSubmit = () => {
    if (!instruction.trim() || isRefining) return;
    onRefine(instruction.trim());
    setInstruction('');
  };

  const suggestions = [
    "Make it more dramatic",
    "Add warmer colors",
    "More minimalist",
    "Make it photorealistic",
    "Add a person",
    "Remove text elements",
  ];

  return (
    <div className="space-y-3 p-4 bg-muted/20 rounded-lg border border-dashed border-primary/20">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        Refine This Prompt
      </h4>
      <div className="flex gap-2">
        <Textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. Make it more cinematic, add golden hour lighting..."
          className="min-h-[60px] resize-none text-sm flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          onClick={handleSubmit}
          disabled={isRefining || !instruction.trim()}
          size="icon"
          className="h-[60px] w-12 shrink-0"
        >
          {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map(s => (
          <button
            key={s}
            onClick={() => setInstruction(s)}
            className="text-[11px] px-2 py-1 rounded-full bg-background border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Multi Platform Prompt ----

function MultiPlatformPrompt({
  prompts,
  qualityMetrics,
  variants,
  masterPrompt,
  onFix,
  isFixing,
  designBrief,
  onRefine,
  isRefining,
}: {
  prompts?: Record<string, string>,
  qualityMetrics?: any,
  variants?: any[],
  masterPrompt?: string,
  onFix?: (fix: FixType) => void,
  isFixing?: boolean,
  designBrief?: {
    primaryColorPalette: string;
    typographySummary: string;
    componentStyle: string;
  },
  onRefine?: (instruction: string) => void,
  isRefining?: boolean,
}) {
  const { toast } = useToast();
  const [activeVariantIndex, setActiveVariantIndex] = useState(-1);
  const [feedbackStatus, setFeedbackStatus] = useState<'none' | 'liked' | 'disliked'>('none');
  const [selectedStyle, setSelectedStyle] = useState<BrandStyle>('modern_saas_3d');
  const [showComparison, setShowComparison] = useState(false);

  // Generation State
  const [genState, setGenState] = useState<Record<string, 'idle' | 'loading' | 'done' | 'error'>>({});
  const [generatedImages, setGeneratedImages] = useState<Record<string, string | null>>({});
  const [genErrors, setGenErrors] = useState<Record<string, string | null>>({});

  const handleGenerate = async (platform: string, prompt: string) => {
    const model = platform === 'flux' ? 'flux' : 'sd35';

    setGenState(prev => ({ ...prev, [platform]: 'loading' }));
    setGenErrors(prev => ({ ...prev, [platform]: null }));

    try {
        const res = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt,
                aspectRatio: qualityMetrics?.suggestedAspectRatio || '16:9',
                stylePreset: selectedStyle
            }),
        });

        const text = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Server Error (${res.status})`);
        }

        if (!res.ok || !data.image) {
            // Surface the detailed reason and actionable hint from the server.
            // Coerce to strings defensively — a non-string value would render
            // as "[object Object]" when joined.
            const toStr = (v: unknown): string | null => {
              if (v == null) return null;
              if (typeof v === 'string') return v;
              try { return JSON.stringify(v); } catch { return String(v); }
            };
            const parts = [
              toStr(data.error) || 'Generation failed',
              toStr(data.detail),
              toStr(data.hint),
            ].filter(Boolean);
            throw new Error(parts.join(' — '));
        }

        const imageUrl = data.image.url || data.image.base64;
        if (!imageUrl) throw new Error("No image data received");

        setGeneratedImages(prev => ({ ...prev, [platform]: imageUrl }));
        setGenState(prev => ({ ...prev, [platform]: 'done' }));

        if (data.fallbackUsed) {
            toast({
                title: "Image Generated (via Flux)",
                description: "Stable Diffusion isn't enabled on your NVIDIA account, so we used Flux instead."
            });
        } else {
            toast({
                title: "Image Generated!",
                description: `Successfully generated with ${data.model === 'flux' ? 'Flux' : 'Stable Diffusion'}.`
            });
        }

    } catch (e: any) {
        console.error("Generation error:", e);
        setGenErrors(prev => ({ ...prev, [platform]: e.message || "Failed to generate image" }));
        setGenState(prev => ({ ...prev, [platform]: 'error' }));
    }
  };

  const handleFeedback = async (rating: number) => {
    if (feedbackStatus !== 'none') return;

    setFeedbackStatus(rating > 3 ? 'liked' : 'disliked');

    let contentHash = 'unknown';
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(masterPrompt || "");
      const buffer = await crypto.subtle.digest('SHA-256', data);
      const hex = Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      contentHash = hex.slice(0, 10);
    } catch {
      // crypto.subtle not available (non-HTTPS) — use simple hash fallback
      contentHash = String((masterPrompt || '').split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0) >>> 0).slice(0, 10);
    }

    await submitFeedback({
        content_hash: contentHash,
        master_prompt: masterPrompt || "",
        image_type: "unknown",
        platform: "master",
        rating
    });

    toast({
        title: "Thanks for feedback!",
        description: "We use this to improve prompt quality."
    });
  };

  const handleCopyAll = () => {
    const allText = buildAllPromptsText(masterPrompt, prompts);
    copyToClipboard(allText, toast);
  };

  const handleExportMarkdown = () => {
    const md = buildMarkdownExport(masterPrompt, prompts, qualityMetrics, variants);
    downloadFile(md, `promptstudio-prompts-${Date.now()}.md`, 'text/markdown');
    toast({ title: "Exported as Markdown!" });
  };

  const handleDownloadTxt = () => {
    const txt = buildAllPromptsText(masterPrompt, prompts);
    downloadFile(txt, `promptstudio-prompts-${Date.now()}.txt`, 'text/plain');
    toast({ title: "Downloaded as text file!" });
  };

  if (!prompts) return null;

  const currentPrompts = activeVariantIndex === -1
    ? prompts
    : variants && variants[activeVariantIndex] ? variants[activeVariantIndex].prompts : prompts;

  const getPlatformIcon = (platform: string) => {
    switch(platform) {
      case 'master': return <Globe className="w-4 h-4" />;
      case 'midjourney': return <ImageIcon className="w-4 h-4" />;
      case 'dalle': return <Palette className="w-4 h-4" />;
      case 'stableDiffusion': return <Zap className="w-4 h-4" />;
      case 'flux': return <Sparkles className="w-4 h-4" />;
      default: return <ImageIcon className="w-4 h-4" />;
    }
  };

  const getPlatformName = (platform: string) => {
    switch(platform) {
      case 'master': return 'Master (Universal)';
      case 'midjourney': return 'Midjourney';
      case 'dalle': return 'DALL-E 3';
      case 'stableDiffusion': return 'Stable Diffusion';
      case 'flux': return 'Flux';
      default: return platform;
    }
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return "Excellent (Ready)";
    if (score >= 6) return "Good (Works in most cases)";
    return "Needs Improvement";
  };

  return (
    <div className="space-y-6">
      {/* Style Preset Selector */}
      <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border/50">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-primary" />
            Visual Style
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {Object.entries(styleProfiles)
                .filter(([key]) => ['modern_saas_3d', 'minimal_abstract', 'editorial_tech'].includes(key))
                .map(([key, profile]) => (
                <div
                    key={key}
                    onClick={() => setSelectedStyle(key as BrandStyle)}
                    className={`
                        cursor-pointer p-3 rounded-lg border transition-all duration-200 relative overflow-hidden
                        ${selectedStyle === key
                            ? 'bg-background border-primary shadow-md shadow-primary/10 ring-1 ring-primary/20'
                            : 'bg-card border-border/50 hover:bg-muted/40 hover:border-border'
                        }
                    `}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{profile.label}</span>
                        {selectedStyle === key && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{profile.visualStyle}</p>
                </div>
            ))}
        </div>
      </div>

      {/* Variant Selector + Export Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
         <div className="flex items-center gap-2 flex-wrap">
           {variants && variants.length > 0 && (
            <div className="flex flex-wrap gap-2 p-1 bg-muted/30 rounded-lg">
               <Button
                 variant={activeVariantIndex === -1 ? "secondary" : "ghost"}
                 size="sm"
                 onClick={() => { setActiveVariantIndex(-1); setShowComparison(false); }}
                 className="gap-2"
               >
                 <Layers className="w-4 h-4" />
                 Standard
               </Button>
               {variants.map((variant, idx) => (
                 <Button
                   key={idx}
                   variant={activeVariantIndex === idx ? "secondary" : "ghost"}
                   size="sm"
                   onClick={() => { setActiveVariantIndex(idx); setShowComparison(false); }}
                 >
                   {variant.name}
                 </Button>
               ))}
               <Button
                 variant={showComparison ? "secondary" : "ghost"}
                 size="sm"
                 onClick={() => setShowComparison(!showComparison)}
                 className="gap-1.5"
               >
                 <Columns className="w-4 h-4" />
                 Compare
               </Button>
            </div>
           )}
         </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Buttons */}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleCopyAll}>
            <Copy className="w-3 h-3" /> Copy All
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleExportMarkdown}>
            <FileText className="w-3 h-3" /> Export MD
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleDownloadTxt}>
            <Download className="w-3 h-3" /> Download
          </Button>

          {/* Feedback */}
          <div className="flex gap-1 ml-2 border-l pl-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback(5)}
              disabled={feedbackStatus !== 'none'}
              className={`h-7 ${feedbackStatus === 'liked' ? "text-green-600 bg-green-50" : ""}`}
            >
                <ThumbsUp className="w-3.5 h-3.5 mr-1" />
                Good
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback(1)}
              disabled={feedbackStatus !== 'none'}
              className={`h-7 ${feedbackStatus === 'disliked' ? "text-red-600 bg-red-50" : ""}`}
            >
                <ThumbsDown className="w-3.5 h-3.5 mr-1" />
                Bad
            </Button>
          </div>
        </div>
      </div>

      {/* Comparison View */}
      {showComparison && variants && variants.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <ComparisonView
            primaryPrompts={prompts}
            variants={variants}
            masterPrompt={masterPrompt}
          />
        </div>
      )}

      {/* Quality Score */}
      {qualityMetrics && activeVariantIndex === -1 && !showComparison && (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium">Prompt Quality Score</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="w-80 p-4">
                      <div className="space-y-2">
                        <p className="font-semibold">Score Breakdown</p>
                        {qualityMetrics.breakdown ? (
                          <>
                            <div className="flex justify-between text-xs">
                              <span>Completeness</span>
                              <span>{Math.round(qualityMetrics.breakdown.completeness * 10)}/10</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Specificity</span>
                              <span>{Math.round(qualityMetrics.breakdown.specificity * 10)}/10</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Coherence</span>
                              <span>{Math.round(qualityMetrics.breakdown.coherence * 10)}/10</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Length Optimization</span>
                              <span>{Math.round(qualityMetrics.breakdown.lengthOptimization * 10)}/10</span>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs">Detailed breakdown not available.</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                          Based on our 10-part framework.
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-right">
                <span className="font-bold text-lg">{qualityMetrics.overallScore}/10</span>
                <span className="text-xs text-muted-foreground block font-normal">
                  {getScoreLabel(qualityMetrics.overallScore)}
                </span>
              </div>
            </div>
            <Progress value={qualityMetrics.overallScore * 10} className="h-2 mb-4" />
            <div className="flex flex-wrap gap-2">
               {qualityMetrics.suggestions?.map((suggestion: string, i: number) => (
                 <Badge key={i} variant="outline" className="text-xs bg-background">{suggestion}</Badge>
               ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Platform Tabs (hidden during comparison) */}
      {currentPrompts && !showComparison && (
      <Tabs defaultValue="master" className="w-full">
        <TabsList className={`grid w-full p-1 bg-muted/50 ${designBrief ? 'grid-cols-6' : 'grid-cols-5'}`}>
          <TabsTrigger value="master" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            {getPlatformIcon('master')}
            <span className="hidden sm:inline">{getPlatformName('master')}</span>
          </TabsTrigger>
          {Object.keys(currentPrompts).map((platform) => (
            <TabsTrigger key={platform} value={platform} className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              {getPlatformIcon(platform)}
              <span className="hidden sm:inline">{getPlatformName(platform)}</span>
            </TabsTrigger>
          ))}
          {designBrief && (
            <TabsTrigger value="design-brief" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">Design Brief</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="master" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-2">
                <Alert className="bg-primary/5 border-primary/20">
                    <Globe className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-sm font-semibold text-primary">Universal Format</AlertTitle>
                    <AlertDescription className="text-xs text-muted-foreground">
                        Works in any modern image model (Gemini, DALL-E, Midjourney, SD, Flux, etc.)
                    </AlertDescription>
                </Alert>
            </div>
            <PromptDisplay
              title="Master Universal Prompt"
              content={masterPrompt || "Master prompt not available."}
              onCopy={() => copyToClipboard(masterPrompt || "", toast)}
            />

            {onFix && activeVariantIndex === -1 && (
              <QuickFixChips onFix={onFix} isLoading={isFixing} />
            )}
        </TabsContent>

        {Object.entries(currentPrompts).map(([platform, prompt]) => (
          <TabsContent key={platform} value={platform} className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <PromptDisplay
              title={`${getPlatformName(platform)} Prompt`}
              content={prompt as string}
              onCopy={() => copyToClipboard(prompt as string, toast)}
              platform={platform}
              onGenerate={() => handleGenerate(platform, prompt as string)}
              isGenerating={genState[platform] === 'loading'}
              generatedImage={generatedImages[platform]}
              generationError={genErrors[platform]}
            />
          </TabsContent>
        ))}

        {designBrief && (
            <TabsContent value="design-brief" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="bg-muted/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                <Palette className="w-4 h-4" /> Palette
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm">{designBrief.primaryColorPalette}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Typography
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm">{designBrief.typographySummary}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-muted/30 col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                <Layers className="w-4 h-4" /> Component Style
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm">{designBrief.componentStyle}</p>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
        )}
      </Tabs>
      )}

      {/* Iterative Refinement */}
      {onRefine && !showComparison && (
        <RefinementInput onRefine={onRefine} isRefining={isRefining || false} />
      )}
    </div>
  );
}

export function ResultsDisplay({
  result,
  onFix,
  isFixing,
  onRefine,
  isRefining,
}: {
  result: AppResult,
  onFix?: (fix: FixType) => void,
  isFixing?: boolean,
  onRefine?: (instruction: string) => void,
  isRefining?: boolean,
}) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const renderLeftPanel = () => {
    switch (result.type) {
      case "text":
        return (
          <div className="space-y-4">
            {result.data.detailedPrompts ? (
              <MultiPlatformPrompt
                prompts={result.data.detailedPrompts}
                qualityMetrics={result.data.qualityMetrics}
                variants={result.data.variants}
                masterPrompt={result.data.masterPrompt}
                onFix={onFix}
                isFixing={isFixing}
                onRefine={onRefine}
                isRefining={isRefining}
              />
            ) : (
              <PromptDisplay title="Image Prompt" content={result.data.imagePrompt} onCopy={() => copyToClipboard(result.data.imagePrompt, toast)} />
            )}

            {result.data.debugInfo && (
                <div className="mt-8 pt-4 border-t text-xs text-muted-foreground font-mono">
                    <p className="font-bold mb-2">Explainability (Debug Mode)</p>
                    {result.data.debugInfo.sanityPreview && (
                        <div className="mb-4 p-3 bg-primary/5 rounded border border-primary/10">
                            <p className="font-semibold text-primary mb-1">Sanity Preview:</p>
                            <p className="italic">&quot;{result.data.debugInfo.sanityPreview}&quot;</p>
                        </div>
                    )}
                    <ul className="list-disc pl-4 space-y-1">
                        {result.data.debugInfo.appliedRules?.map((rule: string, i: number) => (
                            <li key={i}>{rule}</li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
        );
      case "image-screenshot":
        if (result.data.verdict === "Perfect") {
          return (
            <div className="space-y-6">
              <Alert className="border-green-500/50 bg-green-500/10 text-green-900 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <AlertTitle className="font-semibold text-lg flex items-center gap-2">
                  Verdict: Perfect
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">Excellent</Badge>
                </AlertTitle>
                <AlertDescription className="mt-2 text-base">
                  {result.data.analysis}
                </AlertDescription>
              </Alert>
            </div>
          )
        }
        return (
          <div className="space-y-6">
            {result.data.transformationSummary && (
                <div className="p-4 bg-primary/5 border-l-4 border-primary rounded-r-lg shadow-sm">
                    <h3 className="text-xs font-bold uppercase text-primary mb-1 flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> Transformation Summary
                    </h3>
                    <div className="flex justify-between items-start gap-4">
                        <p className="text-lg font-medium leading-tight">{result.data.transformationSummary}</p>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(result.data.transformationSummary!, toast)} className="shrink-0 h-8 w-8">
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            <Alert variant="default" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-500">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
              <AlertTitle className="font-semibold text-lg flex items-center gap-2">
                Verdict: Needs Edit
                <Badge variant="outline" className="border-amber-500 text-amber-600">Optimization Needed</Badge>
              </AlertTitle>
              <AlertDescription className="mt-2 text-base dark:text-amber-400 leading-relaxed">
                {result.data.analysis}
              </AlertDescription>
            </Alert>

            {/* Layout Analysis Section */}
            {(result.data.layoutIntent || result.data.detectedLayoutElements?.length || result.data.ocrKeyPoints?.length) && (
                <div className="grid gap-4 p-4 bg-muted/30 rounded-lg border border-muted">
                    {result.data.issuesDetected && result.data.issuesDetected.length > 0 && (
                        <div className="mb-2 pb-4 border-b border-muted">
                             <h4 className="text-xs font-semibold uppercase text-red-500 mb-2 flex items-center gap-2">
                                <AlertTriangle className="h-3 w-3" /> Issues Detected
                             </h4>
                             <ul className="space-y-1">
                                {result.data.issuesDetected.map((issue, i) => (
                                    <li key={i} className="text-sm flex items-start gap-2">
                                        <span className="text-red-400 font-bold">&bull;</span> {issue}
                                    </li>
                                ))}
                             </ul>
                        </div>
                    )}

                    {result.data.layoutIntent && (
                        <div>
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Layout Strategy</h4>
                            <p className="text-sm">{result.data.layoutIntent}</p>
                        </div>
                    )}

                    {result.data.detectedLayoutElements && result.data.detectedLayoutElements.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Detected Structure</h4>
                            <div className="flex flex-wrap gap-2">
                                {result.data.detectedLayoutElements.map((tag: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-xs bg-background border-primary/20 text-primary/80">
                                        <Layers className="w-3 h-3 mr-1" />
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {result.data.ocrKeyPoints && result.data.ocrKeyPoints.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Key Context (OCR)</h4>
                            <div className="flex flex-wrap gap-2">
                                {result.data.ocrKeyPoints.map((point: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs border-dashed">
                                        {point}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {result.data.detailedPrompts ? (
              <MultiPlatformPrompt
                prompts={result.data.detailedPrompts}
                qualityMetrics={result.data.qualityMetrics}
                variants={result.data.variants}
                masterPrompt={result.data.masterPrompt}
                onFix={onFix}
                isFixing={isFixing}
                designBrief={result.data.designBrief}
                onRefine={onRefine}
                isRefining={isRefining}
              />
            ) : result.data.newImagePrompt && (
              <PromptDisplay
                title="New Image Prompt"
                content={result.data.newImagePrompt}
                onCopy={() => copyToClipboard(result.data.newImagePrompt!, toast)}
              />
            )}

            {result.data.debugInfo && (
                <div className="mt-8 pt-4 border-t text-xs text-muted-foreground font-mono">
                    <p className="font-bold mb-2">Explainability (Debug Mode)</p>
                    {result.data.debugInfo.sanityPreview && (
                        <div className="mb-4 p-3 bg-primary/5 rounded border border-primary/10">
                            <p className="font-semibold text-primary mb-1">Sanity Preview:</p>
                            <p className="italic">&quot;{result.data.debugInfo.sanityPreview}&quot;</p>
                        </div>
                    )}
                    <ul className="list-disc pl-4 space-y-1">
                        {result.data.debugInfo.appliedRules?.map((rule: string, i: number) => (
                            <li key={i}>{rule}</li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className="shadow-xl shadow-primary/5 border-border/50 overflow-hidden rounded-2xl">
        <CardHeader className="bg-gradient-to-r from-muted/40 to-muted/20 border-b border-border/50 py-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-xl blur-sm" />
              <div className="relative p-2.5 bg-gradient-to-br from-primary to-accent rounded-xl shadow-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="font-headline text-xl">Generated Prompts</CardTitle>
              <CardDescription className="text-xs">Optimized for 4 platforms with quality scoring.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {renderLeftPanel()}
        </CardContent>
      </Card>
    </div>
  );
}
