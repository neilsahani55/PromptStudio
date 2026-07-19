"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { Loader2, FileText, Image as ImageIcon, Sparkles, Wand2, Settings2, ChevronDown, History, Zap, Gauge, Crown, Lightbulb } from "lucide-react";
import type { AppResult } from "@/lib/types";
import {
  getPromptsFromText,
  getAnalysisFromImage,
  getAvailableModelsAction,
  getRateLimitStatus,
} from "@/app/actions";
import { detectImageType, imageTypeLabel } from "@/ai/utils/auto-detect";
import { GenerationProgress, GenerationStage } from "@/components/generation-progress";
import { fileToDataUri } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { styleProfiles } from "@/ai/utils/style-profiles";
import { intentPatterns } from "@/ai/utils/intent-patterns";
import { ImageType, ScreenshotMode, GlossLevel, ColorThemeId, PresetColorTheme, CustomColorTheme } from "@/ai/prompt-schema";

// New Components
import { WizardSelector, WizardPreset } from "@/components/wizard-selector";
import { InputHelpers } from "@/components/input-helpers";
import { VisualImageTypeSelector } from "@/components/visual-image-type-selector";
import { ColorThemeSelector } from "@/components/color-theme-selector";
import { SampleGallery } from "@/components/sample-gallery";
import { HistoryPanel } from "@/components/history-panel";
import { HistoryAnalytics } from "@/components/history-analytics";
import { useHistory } from "@/hooks/use-history";
import { FixType } from "@/components/quick-fix-chips";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";

const FileUpload = dynamic(() =>
  import("@/components/file-upload").then((m) => m.FileUpload),
  { ssr: false }
);
const ResultsDisplay = dynamic(() =>
  import("@/components/results-display").then((m) => m.ResultsDisplay),
  { ssr: false }
);

const SCREENSHOT_PRESETS = [
  {
    id: 'wireframe_to_mockup',
    label: 'Rough Wireframe → Mockup',
    description: 'Turn a sketch into a polished UI',
    config: {
      imageType: 'ui_mockup',
      redesignMode: 'full_reimagine',
      style: 'minimalBlog' // Mapped to existing style
    }
  },
  {
    id: 'existing_polish',
    label: 'Polish Existing UI',
    description: 'Better visual design, same layout',
    config: {
      imageType: 'ui_mockup',
      redesignMode: 'light_redesign',
      style: 'modernSaaS'
    }
  },
  {
    id: 'dashboard_cleanup',
    label: 'Dashboard Cleanup',
    description: 'Cleaner data & legibility',
    config: {
      imageType: 'data_viz',
      redesignMode: 'preserve_base',
      style: 'corporate' // Mapped to existing style
    }
  },
  {
    id: 'marketing_hero',
    label: 'Marketing Hero',
    description: 'Stronger visuals for landing page',
    config: {
      imageType: 'scene_illustration',
      redesignMode: 'full_reimagine',
      style: 'cyberpunk' // Mapped to existing style
    }
  }
];

const textFormSchema = z.object({
  content: z.string().trim().min(20, {
    message: "We need a bit more context. Try adding 1–2 sentences about who this is for and what the image should achieve.",
  }),
  style: z.string().optional(),
  intent: z.string().optional(),
  lengthMode: z.string().optional(),
  model: z.string().optional(),
  imageType: z.string().optional(),
  glossLevel: z.enum(['matte', 'soft-glow', 'glassmorphism']).optional(),
  colorThemeMode: z.enum(['auto', 'preset', 'custom']).optional(),
  presetColorThemeId: z.enum(['light_neutral', 'dark_saas', 'warm_organic', 'cyber_blue', 'pastel_playful', 'high_contrast']).optional(),
  customColorDescription: z.string().optional(),
  // For validation we can't easily validate the complex object here with basic zod without duplicating schema, 
  // but we can pass it through as any or define a minimal schema
  customColorTheme: z.any().optional() 
});

type ModelStrategy = 'auto' | 'fast' | 'quality';

export default function PromptStudioPage() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("text");
  const [result, setResult] = useState<AppResult | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [screenshotModel, setScreenshotModel] = useState("googleai/gemini-2.5-flash");
  const [screenshotImageType, setScreenshotImageType] = useState("ui_mockup");
  const [screenshotGlossLevel, setScreenshotGlossLevel] = useState<GlossLevel>("soft-glow");
  const [redesignMode, setRedesignMode] = useState("preserve_base");
  const [screenshotMode, setScreenshotMode] = useState<ScreenshotMode>("improve_only");
  const [updateContent, setUpdateContent] = useState("");
  const [includeAccessibility, setIncludeAccessibility] = useState(false);
  
  // Screenshot Color Theme State
  const [screenshotColorMode, setScreenshotColorMode] = useState<ColorThemeId>('auto');
  const [screenshotPresetId, setScreenshotPresetId] = useState<PresetColorTheme>('light_neutral');
  const [screenshotCustomColor, setScreenshotCustomColor] = useState("");
  const [screenshotCustomTheme, setScreenshotCustomTheme] = useState<CustomColorTheme>({ stops: [] });
  // Add new state for Text Custom Theme
  const [textCustomTheme, setTextCustomTheme] = useState<CustomColorTheme>({ stops: [] });

  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  // New State
  const {
    history, rawHistory, addToHistory, toggleFavorite, deleteItem,
    renameItem, addTag, removeTag, clearHistory,
    allImageTypes, searchQuery, setSearchQuery,
    sortBy, setSortBy, filterBy, setFilterBy,
  } = useHistory();
  const [modelStrategy, setModelStrategy] = useState<ModelStrategy>('auto');
  const [isFixing, setIsFixing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [availableModels, setAvailableModels] = useState<{id: string, label: string}[]>([]);

  useEffect(() => {
    setMounted(true);
    getAvailableModelsAction().then(models => {
      setAvailableModels(models);
    }).catch(() => {
      console.warn('Failed to load available models, using defaults');
    });
  }, []);

  const form = useForm<z.infer<typeof textFormSchema>>({
    resolver: zodResolver(textFormSchema),
    defaultValues: {
      content: "",
      style: "none",
      intent: "general",
      lengthMode: "balanced",
      model: "googleai/gemini-2.5-flash",
      imageType: "scene_illustration"
    },
  });

  // Watch content length for InputHelpers
  const contentLength = form.watch("content")?.length || 0;

  // Handle Model Strategy Change
  useEffect(() => {
    if (modelStrategy === 'fast') {
      form.setValue('model', 'googleai/gemini-2.5-flash');
    } else if (modelStrategy === 'quality') {
      form.setValue('model', 'openai/deepseek-ai/deepseek-v3.2');
    } else {
      // Auto: Default to Gemini for now, or could be dynamic
      form.setValue('model', 'googleai/gemini-2.5-flash');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelStrategy]);

  // ─── AUTOSAVE DRAFTS ──────────────────────────────────────────
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('promptstudio_draft');
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.content && draft.content.length > 10) {
          form.setValue('content', draft.content);
          if (draft.imageType) form.setValue('imageType', draft.imageType);
          if (draft.style) form.setValue('style', draft.style);
          if (draft.intent) form.setValue('intent', draft.intent);
          toast({ title: "Draft restored", description: "Your previous work has been loaded." });
        }
      }
    } catch {} // ignore parse errors
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save every 5 seconds when content changes
  useEffect(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      const content = form.getValues('content');
      if (content && content.length > 10) {
        try {
          localStorage.setItem('promptstudio_draft', JSON.stringify({
            content,
            imageType: form.getValues('imageType'),
            style: form.getValues('style'),
            intent: form.getValues('intent'),
          }));
        } catch {} // ignore quota errors
      }
    }, 5000);
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentLength]);

  // Clear draft on successful generation
  const clearDraft = useCallback(() => {
    try { localStorage.removeItem('promptstudio_draft'); } catch {}
  }, []);

  // ─── KEYBOARD SHORTCUTS ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + Enter → Submit
      if (isMod && e.key === 'Enter') {
        e.preventDefault();
        if (!loading && activeTab === 'text') {
          if (handleTextSubmitRef.current) {
            form.handleSubmit(handleTextSubmitRef.current)();
          }
        }
      }

      // Cmd/Ctrl + 1/2/3 → Switch tabs
      if (isMod && e.key === '1') { e.preventDefault(); setActiveTab('text'); }
      if (isMod && e.key === '2') { e.preventDefault(); setActiveTab('screenshot'); }
      if (isMod && e.key === '3') { e.preventDefault(); setActiveTab('history'); }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, activeTab]);

  // ─── GENERATION TIME TRACKING ─────────────────────────────────
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [usedModel, setUsedModel] = useState<string | null>(null);

  // ─── PROGRESSIVE LOADING ───────────────────────────────────────
  const [generationStage, setGenerationStage] = useState<GenerationStage>('analyzing');
  const [elapsedTime, setElapsedTime] = useState(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleTextSubmitRef = useRef<any>(null);

  // ─── RATE LIMIT ────────────────────────────────────────────────
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
  const [rateLimitTotal, setRateLimitTotal] = useState<number>(20);

  // ─── AUTO-DETECT IMAGE TYPE ────────────────────────────────────
  const [autoDetectedType, setAutoDetectedType] = useState<{ type: string; reason: string; confidence: number } | null>(null);
  const autoDetectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch rate limit status on mount
  useEffect(() => {
    getRateLimitStatus().then(status => {
      setRateLimitRemaining(status.remaining);
      setRateLimitTotal(status.limit);
    }).catch(() => {});
  }, []);

  // Auto-detect image type as user types (debounced)
  const watchedContent = form.watch("content");
  useEffect(() => {
    if (autoDetectTimerRef.current) clearTimeout(autoDetectTimerRef.current);
    if (!watchedContent || watchedContent.length < 30) {
      setAutoDetectedType(null);
      return;
    }
    autoDetectTimerRef.current = setTimeout(() => {
      const detection = detectImageType(watchedContent);
      if (detection.confidence >= 0.5) {
        setAutoDetectedType({
          type: detection.imageType,
          reason: detection.reason,
          confidence: detection.confidence,
        });
      } else {
        setAutoDetectedType(null);
      }
    }, 800);
    return () => { if (autoDetectTimerRef.current) clearTimeout(autoDetectTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedContent]);

  if (!mounted) return null;

  const handleApiError = (message: string, errorType?: string) => {
    toast({
      variant: "destructive",
      title: "An error occurred",
      description: message,
      action: errorType === 'model_unavailable' || errorType === 'invalid_response'
        ? undefined  // Could add retry button here in future
        : undefined,
    });
  };

  const handleTextSubmit = async (values: z.infer<typeof textFormSchema>) => {
    setLoading(true);
    setResult(null);
    setGenerationTime(null);
    setUsedModel(null);
    setElapsedTime(0);
    setGenerationStage('analyzing');

    // Start elapsed timer
    const startTime = Date.now();
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 200);

    // Simulate progressive stages based on time
    const stageTimers = [
      setTimeout(() => setGenerationStage('generating_components'), 2000),
      setTimeout(() => setGenerationStage('formatting'), 6000),
      setTimeout(() => setGenerationStage('scoring'), 10000),
    ];

    try {
      const response = await getPromptsFromText(
        values.content,
        values.style,
        values.intent,
        values.lengthMode,
        values.model,
        values.imageType,
        values.glossLevel,
        values.colorThemeMode,
        values.presetColorThemeId,
        values.customColorDescription,
        values.customColorTheme
      );

      // Clear stage timers
      stageTimers.forEach(clearTimeout);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      setGenerationStage('complete');

      if (response.success) {
        const elapsed = Date.now() - startTime;
        setGenerationTime(elapsed);
        if (response.meta?.model) setUsedModel(response.meta.model);
        if (response.meta?.remaining !== undefined) setRateLimitRemaining(response.meta.remaining);
        if (response.meta?.fallback) {
          toast({ title: "Model fallback", description: `Used ${response.meta.model} (original model was unavailable)` });
        }

        const newResult = { type: "text" as const, data: response.data };
        setResult(newResult);
        clearDraft();

        // Save to history
        addToHistory(
          values.content,
          newResult,
          values.imageType || "unknown",
          response.data.qualityMetrics?.overallScore || 0
        );
      } else {
        handleApiError(response.error, response.errorType);
      }
    } catch (e) {
      stageTimers.forEach(clearTimeout);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      handleApiError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  handleTextSubmitRef.current = handleTextSubmit;

  const applyPreset = (presetId: string) => {
    const preset = SCREENSHOT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setScreenshotImageType(preset.config.imageType);
    setRedesignMode(preset.config.redesignMode);
    // Note: We don't have a global 'style' state for screenshot tab yet, it's mostly inferred or we could add it.
    // For now we just set the flags we have.
    toast({
      title: "Preset Applied",
      description: `Configured for ${preset.label}`,
    });
  };

  const handleFileSubmit = async (file: File | null, additionalFiles: File[] = []) => {
    if (!file) return;

    setLoading(true);
    try {
      const base64 = await fileToDataUri(file);
      setUploadedImagePreview(base64);

      // Convert additional files
      const additionalBase64s = await Promise.all(
        additionalFiles.map(f => fileToDataUri(f))
      );

      const response = await getAnalysisFromImage(
        base64,
        screenshotModel,
        screenshotImageType,
        screenshotGlossLevel,
        redesignMode,
        additionalBase64s,
        includeAccessibility,
        undefined, // ocrText
        updateContent,
        screenshotMode,
        screenshotColorMode,
        screenshotPresetId,
        screenshotCustomColor,
        screenshotCustomTheme
      );

      if (response.success) {
        const resultData: AppResult = {
          type: 'image-screenshot',
          data: response.data,
          imageUrl: base64
        };
        setResult(resultData);
        addToHistory(
          "Screenshot Analysis",
          resultData,
          screenshotImageType || "screenshot",
          response.data.qualityMetrics?.overallScore || 0
        );
        setTimeout(() => {
          const resultEl = document.getElementById('results-section');
          if (resultEl) resultEl.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        handleApiError(response.error);
      }
    } catch (error) {
      console.error(error);
      handleApiError("Failed to process image.");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    const previousTab = activeTab;
    setActiveTab(value);
    // Don't clear result when switching to/from history tab
    if (value !== 'history' && previousTab !== 'history') {
      setResult(null);
      setUploadedImagePreview(null);
      form.reset();
    }
  }

  const handleWizardSelect = (preset: WizardPreset) => {
    form.setValue("imageType", preset.imageType);
    form.setValue("intent", preset.intent);
    form.setValue("style", preset.style);

    // Focus textarea
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.focus();
      textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    toast({
      title: "Settings configured!",
      description: `Optimized for ${preset.label}.`,
    });
  };

  const handleSampleSelect = (sample: any) => {
    form.setValue("content", sample.text);
    form.setValue("imageType", sample.imageType);
    form.setValue("style", sample.style);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHistorySelect = (item: any) => {
    if (item.result.type === 'text') {
      form.setValue("content", item.input);
      setActiveTab('text');
    } else {
      setActiveTab('screenshot');
      // For screenshots, we can't easily restore the file object, but we can show the result
    }
    setResult(item.result);
    // Scroll to result
    setTimeout(() => {
      const resultEl = document.getElementById('results-section');
      if (resultEl) resultEl.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleQuickFix = async (fix: FixType) => {
    setIsFixing(true);
    try {
      const currentStyle = form.getValues("style");

      // Apply fix logic
      let newStyle = currentStyle;
      switch (fix) {
        case 'less_busy':
        case 'more_minimal':
          newStyle = 'minimalBlog';
          break;
        case 'more_colorful':
          newStyle = 'cyberpunk';
          break;
        case 'more_realistic':
          newStyle = 'ecomPremium';
          break;
        case 'more_stylized':
          newStyle = 'modernSaaS';
          break;
      }

      form.setValue("style", newStyle);

      // Trigger re-generation
      await form.handleSubmit(handleTextSubmit)();
    } finally {
      setIsFixing(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    setIsRefining(true);
    try {
      // Prepend the refinement instruction to the existing content
      const currentContent = form.getValues("content");
      const refinedContent = `${currentContent}\n\n[Refinement: ${instruction}]`;
      form.setValue("content", refinedContent);

      // Trigger re-generation
      await form.handleSubmit(handleTextSubmit)();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Refinement failed",
        description: "Could not refine the prompt. Please try again.",
      });
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div suppressHydrationWarning className="flex flex-col min-h-screen bg-background">
      <AnnouncementBanner />
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12 flex-grow w-full max-w-5xl">
        <section className="relative text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="absolute inset-0 bg-dot-grid opacity-40 pointer-events-none -z-10 rounded-3xl" />
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 mb-5 rounded-full bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI-Powered Prompt Generator</span>
          </div>
          <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight leading-[1.1]">
            <span className="text-foreground">Turn Any Content into </span>
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Stunning Visuals
            </span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Generate optimized image prompts for Midjourney, DALL-E, Stable Diffusion, and Flux from your text or screenshots.
          </p>
        </section>

        {/* Wizard Section - Only show if no result is present */}
        {!result && activeTab === 'text' && (
          <WizardSelector onSelect={handleWizardSelect} />
        )}

        <Card className="w-full mx-auto shadow-xl shadow-primary/5 border-border/50 overflow-hidden rounded-2xl">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-12 rounded-none bg-muted/40 p-1 gap-1">
                <TabsTrigger
                  value="text"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg h-full transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <FileText className="w-4 h-4" />
                  From Text
                </TabsTrigger>
                <TabsTrigger
                  value="screenshot"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg h-full transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <ImageIcon className="w-4 h-4" />
                  From Screenshot
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg h-full transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <History className="w-4 h-4" />
                  History
                </TabsTrigger>
              </TabsList>

              <div className="p-6 md:p-8 bg-card">
                <TabsContent value="text" className="mt-0 animate-in fade-in duration-300">
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(handleTextSubmit)}
                      className="space-y-8"
                    >
                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              Your content
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Textarea
                                  placeholder="Describe what you want to create... e.g. 'A blog hero image about remote work showing a cozy home office with warm lighting'"
                                  className="min-h-[180px] text-[15px] resize-none rounded-xl border-border/60 bg-muted/30 focus:bg-background focus-visible:ring-primary/30 placeholder:text-muted-foreground/50 transition-colors"
                                  {...field}
                                />
                                <InputHelpers currentLength={contentLength} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="imageType"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center gap-2 mb-2">
                                <FormLabel className="text-sm font-semibold">Image Type</FormLabel>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Select the format that best fits your content.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <FormControl>
                                <VisualImageTypeSelector
                                  value={field.value as ImageType}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Auto-detect suggestion banner */}
                      {autoDetectedType && form.watch('imageType') !== autoDetectedType.type && (
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-300">
                          <Lightbulb className="w-4 h-4 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="text-muted-foreground">Detected: </span>
                              <span className="font-medium text-foreground">{imageTypeLabel(autoDetectedType.type as any)}</span>
                              <span className="text-xs text-muted-foreground ml-1">— {autoDetectedType.reason}</span>
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs flex-shrink-0"
                            onClick={() => {
                              form.setValue('imageType', autoDetectedType.type);
                              setAutoDetectedType(null);
                              toast({ title: "Image type updated", description: `Set to ${imageTypeLabel(autoDetectedType.type as any)}` });
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                      )}

                      <div className="p-4 border rounded-lg bg-card/50">
                        <FormField
                            control={form.control}
                            name="colorThemeMode"
                            render={({ field }) => (
                                <ColorThemeSelector
                                    mode={field.value || 'auto'}
                                    onModeChange={(val) => form.setValue('colorThemeMode', val)}
                                    presetId={form.watch('presetColorThemeId') as PresetColorTheme}
                                    onPresetChange={(val) => form.setValue('presetColorThemeId', val)}
                                    customDescription={form.watch('customColorDescription')}
                                    onCustomDescriptionChange={(val) => form.setValue('customColorDescription', val)}
                                    customTheme={textCustomTheme}
                                    onCustomThemeChange={setTextCustomTheme}
                                />
                            )}
                        />
                      </div>

                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="advanced-options" className="border rounded-lg px-4 bg-muted/20">
                          <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                              <Settings2 className="w-4 h-4" />
                              Advanced Configuration
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-4 pb-4">
                            <div className="space-y-6">
                              {/* Strategy Toggle */}
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-background rounded-lg border">
                                <div className="space-y-1">
                                  <h4 className="text-sm font-medium flex items-center gap-2">
                                    Model Strategy
                                    <Badge variant="outline" className="text-[10px]">New</Badge>
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {modelStrategy === 'auto' && "Automatically selects the best model for the task."}
                                    {modelStrategy === 'fast' && "Prioritizes speed (Gemini Flash)."}
                                    {modelStrategy === 'quality' && "Prioritizes quality (DeepSeek / GPT-4)."}
                                  </p>
                                  <div className="text-[10px] text-muted-foreground font-mono mt-1 flex items-center gap-1">
                                    Engine info:
                                    <span className="text-foreground">
                                      {modelStrategy === 'quality' ? 'DeepSeek V3.2' : 'Gemini 2.5'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex bg-muted/50 p-1 rounded-lg">
                                  <Button
                                    type="button"
                                    variant={modelStrategy === 'auto' ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setModelStrategy('auto')}
                                    className="flex-1"
                                  >
                                    <Wand2 className="w-4 h-4 mr-2" />
                                    Auto
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={modelStrategy === 'fast' ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setModelStrategy('fast')}
                                    className="flex-1"
                                  >
                                    <Zap className="w-4 h-4 mr-2" />
                                    Fast
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={modelStrategy === 'quality' ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setModelStrategy('quality')}
                                    className="flex-1"
                                  >
                                    <Crown className="w-4 h-4 mr-2" />
                                    High Quality
                                  </Button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <FormField
                                  control={form.control}
                                  name="style"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs font-semibold uppercase text-muted-foreground">Brand Style</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Select style" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {Object.values(styleProfiles).map((style) => (
                                            <SelectItem key={style.id} value={style.id}>{style.label}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="intent"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs font-semibold uppercase text-muted-foreground">Purpose / Intent</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Select intent" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {Object.values(intentPatterns).map((intent) => (
                                            <SelectItem key={intent.id} value={intent.id}>{intent.label}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="lengthMode"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs font-semibold uppercase text-muted-foreground">Prompt Budget</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Select length" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="compact">Compact (High Signal)</SelectItem>
                                          <SelectItem value="balanced">Balanced (Standard)</SelectItem>
                                          <SelectItem value="rich">Rich (Descriptive)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="glossLevel"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs font-semibold uppercase text-muted-foreground">Gloss Level</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Select gloss" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="matte">Matte (Flat/Clean)</SelectItem>
                                          <SelectItem value="soft-glow">Soft Glow (Standard)</SelectItem>
                                          <SelectItem value="glassmorphism">Glassmorphism (Frosted)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {/* Hidden Model Field (Controlled by Strategy) */}
                                <FormField
                                  control={form.control}
                                  name="model"
                                  render={({ field }) => (
                                    <FormItem className={modelStrategy !== 'auto' ? "" : "hidden"}>
                                       <FormLabel className="text-xs font-semibold uppercase text-muted-foreground">AI Model Override</FormLabel>
                                       <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Select model" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {availableModels.map(model => (
                                            <SelectItem key={model.id} value={model.id}>{model.label}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>

                      <Button
                        type="submit"
                        disabled={loading || isFixing}
                        className="w-full h-12 text-base font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 border-0 rounded-xl"
                        size="lg"
                      >
                        {loading || isFixing ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            {isFixing ? "Refining Prompt..." : "Analyzing Content..."}
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-5 w-5" />
                            Generate Prompts
                          </>
                        )}
                      </Button>
                      {rateLimitRemaining !== null && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                rateLimitRemaining / rateLimitTotal > 0.5
                                  ? 'bg-primary'
                                  : rateLimitRemaining / rateLimitTotal > 0.25
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                              }`}
                              style={{ width: `${(rateLimitRemaining / rateLimitTotal) * 100}%` }}
                            />
                          </div>
                          <span>{rateLimitRemaining} generations left</span>
                          {rateLimitRemaining < 5 && (
                            <span className="text-muted-foreground/70">· resets soon</span>
                          )}
                        </div>
                      )}
                    </form>
                  </Form>
                </TabsContent>
                <TabsContent value="screenshot" className="mt-0 animate-in fade-in duration-300">
                  {/* Screenshot Mode Selection */}
                  <div className="mb-6 space-y-3">
                    <label className="text-xs font-semibold uppercase text-muted-foreground block">Analysis Mode</label>
                    <RadioGroup
                      value={screenshotMode}
                      onValueChange={(v) => setScreenshotMode(v as ScreenshotMode)}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <div>
                        <RadioGroupItem value="improve_only" id="improve_only" className="peer sr-only" />
                        <Label
                          htmlFor="improve_only"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <span className="font-semibold text-sm">Improve Screenshot Only</span>
                          <span className="text-[10px] text-muted-foreground text-center mt-1">Enhance style, keep content</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="update_with_new_content" id="update_with_new_content" className="peer sr-only" />
                        <Label
                          htmlFor="update_with_new_content"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <span className="font-semibold text-sm">Update with New Content</span>
                          <span className="text-[10px] text-muted-foreground text-center mt-1">Change text/data, keep layout</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Update Content Input */}
                  {screenshotMode === 'update_with_new_content' && (
                    <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
                      <Label htmlFor="update-content" className="text-base font-semibold mb-2 block">New Content / Instructions</Label>
                      <Textarea
                        id="update-content"
                        placeholder="Describe the new message, features, or copy. We'll update the old image to match this, while keeping the layout."
                        className="min-h-[100px] resize-y"
                        value={updateContent}
                        onChange={(e) => setUpdateContent(e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground mt-2">
                        We will analyze the difference between the screenshot and this text to generate specific update instructions.
                      </p>
                    </div>
                  )}

                  {/* Presets Grid */}
                  <div className="mb-6">
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-3 block">Quick Start Presets</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {SCREENSHOT_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => applyPreset(preset.id)}
                          className="flex flex-col items-start p-3 rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all text-left group"
                        >
                          <span className="font-semibold text-sm group-hover:text-primary transition-colors">{preset.label}</span>
                          <span className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{preset.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6 p-4 border rounded-lg bg-card/50">
                     <ColorThemeSelector
                        mode={screenshotColorMode}
                        onModeChange={setScreenshotColorMode}
                        presetId={screenshotPresetId}
                        onPresetChange={setScreenshotPresetId}
                        customDescription={screenshotCustomColor}
                        onCustomDescriptionChange={setScreenshotCustomColor}
                        customTheme={screenshotCustomTheme}
                        onCustomThemeChange={setScreenshotCustomTheme}
                    />
                  </div>

                  <Accordion type="single" collapsible className="w-full mb-6">
                    <AccordionItem value="advanced-options" className="border-none">
                      <AccordionTrigger className="flex gap-2 py-2 hover:no-underline hover:bg-muted/50 px-4 rounded-lg transition-colors group">
                        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground group-hover:text-foreground">
                          <Settings2 className="w-4 h-4" />
                          Advanced Configuration
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 px-4 pb-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">AI Model</label>
                            <Select onValueChange={setScreenshotModel} defaultValue={screenshotModel}>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select model" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableModels.map(model => (
                                  <SelectItem key={model.id} value={model.id}>{model.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Image Type</label>
                            <Select onValueChange={setScreenshotImageType} defaultValue={screenshotImageType} value={screenshotImageType}>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ui_mockup">UI Mockup (Preserve Layout)</SelectItem>
                                <SelectItem value="infographic">Infographic</SelectItem>
                                <SelectItem value="character">Character</SelectItem>
                                <SelectItem value="scene_illustration">Scene Illustration</SelectItem>
                                <SelectItem value="abstract_visual">Abstract Visual</SelectItem>
                                <SelectItem value="product_render">Product Render</SelectItem>
                                <SelectItem value="icon_or_sticker">Icon/Sticker</SelectItem>
                                <SelectItem value="data_viz">Data Viz</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Gloss Level</label>
                            <Select onValueChange={(val) => setScreenshotGlossLevel(val as GlossLevel)} defaultValue={screenshotGlossLevel} value={screenshotGlossLevel}>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select gloss" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="matte">Matte (Flat/Clean)</SelectItem>
                                <SelectItem value="soft-glow">Soft Glow (Standard)</SelectItem>
                                <SelectItem value="glassmorphism">Glassmorphism (Frosted)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="mt-6 space-y-3">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Redesign Strategy</label>
                          <RadioGroup
                            defaultValue="preserve_base"
                            value={redesignMode}
                            onValueChange={setRedesignMode}
                            className="grid grid-cols-1 md:grid-cols-3 gap-4"
                          >
                            <div>
                              <RadioGroupItem value="preserve_base" id="preserve_base" className="peer sr-only" />
                              <Label
                                htmlFor="preserve_base"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                              >
                                <span className="font-semibold text-sm">Keep Layout</span>
                                <span className="text-[10px] text-muted-foreground text-center mt-1">Upgrade style only, preserve structure</span>
                              </Label>
                            </div>
                            <div>
                              <RadioGroupItem value="light_redesign" id="light_redesign" className="peer sr-only" />
                              <Label
                                htmlFor="light_redesign"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                              >
                                <span className="font-semibold text-sm">Slight Redesign</span>
                                <span className="text-[10px] text-muted-foreground text-center mt-1">Modernize spacing & alignment</span>
                              </Label>
                            </div>
                            <div>
                              <RadioGroupItem value="full_reimagine" id="full_reimagine" className="peer sr-only" />
                              <Label
                                htmlFor="full_reimagine"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                              >
                                <span className="font-semibold text-sm">New Visual</span>
                                <span className="text-[10px] text-muted-foreground text-center mt-1">Keep content, reimagine layout</span>
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div className="mt-6 flex items-center space-x-2 bg-muted/30 p-3 rounded-lg border border-border/50">
                          <Switch
                            id="accessibility-mode"
                            checked={includeAccessibility}
                            onCheckedChange={setIncludeAccessibility}
                          />
                          <div className="flex-1">
                            <Label htmlFor="accessibility-mode" className="font-semibold cursor-pointer">High Accessibility Mode</Label>
                            <p className="text-[10px] text-muted-foreground">Prioritize high contrast, clear hierarchy, and colorblind-safe palettes.</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <FileUpload onFileSelect={(file, additional) => handleFileSubmit(file, additional)} loading={loading} buttonText="Analyze & Generate Prompts" />
                </TabsContent>
                <TabsContent value="history" className="mt-0 animate-in fade-in duration-300">
                  <HistoryAnalytics history={rawHistory} />
                  <HistoryPanel
                    history={history}
                    onSelect={handleHistorySelect}
                    onDelete={deleteItem}
                    onToggleFavorite={toggleFavorite}
                    onRename={renameItem}
                    onAddTag={addTag}
                    onRemoveTag={removeTag}
                    onClearAll={clearHistory}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    filterBy={filterBy}
                    onFilterChange={setFilterBy}
                    allImageTypes={allImageTypes}
                    totalCount={rawHistory.length}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        <div id="results-section" className="mt-10 w-full mx-auto">
          {loading && (
            <GenerationProgress stage={generationStage} elapsed={elapsedTime} />
          )}
          {result && (
            <>
            {generationTime && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 px-1 flex-wrap">
                <span>Generated in {(generationTime / 1000).toFixed(1)}s</span>
                {usedModel && <span>· {usedModel.split('/').pop()}</span>}
                {rateLimitRemaining !== null && (
                  <span className={rateLimitRemaining < 5 ? 'text-amber-500' : ''}>
                    · {rateLimitRemaining}/{rateLimitTotal} remaining
                  </span>
                )}
                <span className="ml-auto opacity-60">Ctrl+Enter to regenerate</span>
              </div>
            )}
            <ResultsDisplay
              result={result}
              onFix={handleQuickFix}
              isFixing={isFixing}
              onRefine={handleRefine}
              isRefining={isRefining}
            />
            </>
          )}
        </div>

        {/* Sample Gallery - Show if no result and on Text tab */}
        {!result && activeTab === 'text' && (
          <div className="w-full max-w-4xl mx-auto">
            <SampleGallery onSelect={handleSampleSelect} />
          </div>
        )}
      </main>
      <footer className="text-center py-8 px-4 text-sm text-muted-foreground border-t border-border/50 bg-muted/30">
        <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-primary to-accent p-1 rounded-md">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-foreground">PromptStudio</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Midjourney &bull; DALL-E 3 &bull; Stable Diffusion &bull; Flux
          </p>
        </div>
      </footer>
      <FeedbackDialog />
    </div>
  );
}
