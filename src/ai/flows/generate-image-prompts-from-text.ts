/**
 * @fileOverview Generates image prompts from blog text, including aspect ratio suggestions.
 *
 * - generateImagePromptsFromText - A function that generates image prompts from text.
 * - GenerateImagePromptsFromTextInput - The input type for the generateImagePromptsFromText function.
 * - GenerateImagePromptsFromTextOutput - The return type for the generateImagePromptsFromText function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { PromptComponentsSchema, ImageType, UnifiedAnalysis, UserPromptOptions } from '@/ai/prompt-schema';
import { generateEnhancedPrompts } from '@/ai/prompt-generator';
import { BrandStyle } from '@/ai/utils/style-profiles';
import { PromptIntent } from '@/ai/utils/intent-patterns';
import { LengthMode } from '@/ai/prompt-schema';
import { UnifiedContext } from '@/ai/prompt-schema';
import { buildMasterPrompt, applyColorThemeToComponents } from '@/ai/utils/master-prompt';
import { applyImageTypeBlueprint } from '@/ai/utils/image-type-blueprints';
import { resolveStyleConflicts } from '@/ai/utils/conflict-resolver';
import { analyzeAndSelectTheme } from '@/ai/utils/smart-theme-engine';
import { generateFreshnessProfile, buildFreshnessHint } from '@/ai/utils/freshness-engine';
import { textPromptCache, PromptCache } from '@/ai/utils/prompt-cache';

// Module loaded

const GenerateImagePromptsFromTextInputSchema = z.object({
  blogText: z.string().describe('The blog text to generate image prompts from.'),
  contentType: z.string().optional(),
  targetPlatform: z.enum(['midjourney', 'dalle', 'stable-diffusion', 'flux']).optional(),
  style: z.string().optional().describe('Brand style preset (e.g. modernSaaS)'),
  intent: z.string().optional().describe('Purpose intent (e.g. blog_hero)'),
  lengthMode: z.enum(['compact', 'balanced', 'rich']).optional(),
  model: z.string().optional().describe('The AI model to use for generation'),
  imageType: z.enum([
    'character', 
    'infographic', 
    'ui_mockup', 
    'scene_illustration', 
    'abstract_visual', 
    'product_render', 
    'icon_or_sticker', 
    'data_viz'
  ]).optional().describe('The specific type of image to generate'),
  glossLevel: z.enum(['matte', 'soft-glow', 'glassmorphism']).optional().describe('Surface finish and lighting style'),
  colorThemeMode: z.enum(['auto', 'preset', 'custom']).optional(),
  presetColorThemeId: z.enum(['light_neutral', 'dark_saas', 'warm_organic', 'cyber_blue', 'pastel_playful', 'high_contrast']).optional(),
  customColorDescription: z.string().optional(),
  customColorTheme: z.any().optional()
});
export type GenerateImagePromptsFromTextInput = z.infer<
  typeof GenerateImagePromptsFromTextInputSchema
>;

const GenerateImagePromptsFromTextOutputSchema = z.object({
  imagePrompt: z.string().describe('The generated image prompt (default/fallback).'),
  promptComponents: PromptComponentsSchema.describe('Structured prompt components.'),
  detailedPrompts: z.record(z.string()).describe('Platform-specific prompts keyed by platform name.'),
  masterPrompt: z.string().describe('Universal, platform-agnostic master prompt.'),
  aspectRatioSuggestions: z
    .array(z.string())
    .describe('The suggested aspect ratios (e.g., 1:1, 16:9, 9:16).'),
  qualityMetrics: z.object({
    overallScore: z.number(),
    rating: z.string(),
    suggestions: z.array(z.string()),
    suggestedAspectRatio: z.string()
  }).optional(),
  variants: z.array(z.object({
      name: z.string(),
      prompts: z.object({
          midjourney: z.string(),
          dalle: z.string(),
          stableDiffusion: z.string(),
          flux: z.string()
      })
  })).optional(),
  debugInfo: z.object({
      styleProfile: z.string(),
      intent: z.string(),
      lengthMode: z.string(),
      appliedRules: z.array(z.string()),
      sanityPreview: z.string().optional(),
      layoutPattern: z.string().optional(),
      glossLevel: z.string().optional(),
      finalPromptLength: z.number().optional()
  }).optional()
});
export type GenerateImagePromptsFromTextOutput = z.infer<
  typeof GenerateImagePromptsFromTextOutputSchema
>;

export async function generateImagePromptsFromText(
  input: GenerateImagePromptsFromTextInput
): Promise<GenerateImagePromptsFromTextOutput> {
  const startTime = Date.now();
  console.log("Entering generateImagePromptsFromText");

  // Check cache for identical inputs (skip freshness-sensitive fields)
  const cacheKey = PromptCache.makeKey(
    input.blogText,
    input.imageType,
    input.model,
    input.style,
    input.intent,
    input.glossLevel,
    input.colorThemeMode,
    input.presetColorThemeId,
    input.customColorDescription,
    JSON.stringify(input.customColorTheme || null)
  );

  const cached = textPromptCache.get(cacheKey);
  if (cached) {
    console.log(`CACHE_HIT: Returning cached result (key=${cacheKey.slice(0, 8)})`);
    return cached as GenerateImagePromptsFromTextOutput;
  }

  try {
    const result = await runGenerateImagePromptsFromTextLogic(input);

    // Cache successful results
    textPromptCache.set(cacheKey, result);
    console.log(`Generated in ${Date.now() - startTime}ms (cache size: ${textPromptCache.size})`);

    return result;
  } catch (e) {
    console.error("Error in generateImagePromptsFromText:", e);
    throw e;
  }
}

// Relaxed schema for NVIDIA/OpenAI-compatible models that can't handle minLength + refine validators
const RelaxedPromptComponentsSchema = z.object({
    subject: z.string().describe('Main focus with 2-4 concrete characteristics'),
    action_context: z.string().describe('What the subject is doing and the specific purpose'),
    environment: z.string().describe('Specific location, time of day, surrounding elements'),
    mood_story: z.string().describe('Emotion and implied narrative'),
    visual_style: z.string().describe('Specific artistic medium, era, and influences'),
    lighting_color: z.string().describe('Precise lighting type, direction, and color palette'),
    camera_composition: z.string().describe('Lens details, shot type, angle, framing, depth of field'),
    detail_texture: z.string().describe('Specific materials, surface details, tactile cues'),
    quality_realism: z.string().describe('Technical quality keywords (8k, octane render, etc)'),
    negative_constraints: z.string().describe('Elements to explicitly avoid'),
});

function isNvidiaModel(modelName?: string): boolean {
  if (!modelName) return false;
  return modelName.startsWith('openai/') && !modelName.includes('gemini');
}

function getModelConfig(modelName?: string, defaultTemp = 0.7) {
  if (modelName && modelName.includes('kimi-k2-instruct')) {
    return {
      temperature: 0.6,
      topP: 0.9,
      maxOutputTokens: 2500,
    };
  }
  if (modelName && modelName.includes('deepseek-v3.2')) {
    return {
      temperature: 0.8,
      topP: 0.95,
      maxOutputTokens: 2500,
      // thinking: true removed — it adds 30-50s of reasoning time on Vercel Hobby
    };
  }
  if (modelName && modelName.includes('gpt-oss-120b')) {
    return {
      temperature: 0.8,
      topP: 1.0,
      maxOutputTokens: 2500,
    };
  }
  if (modelName && (modelName.includes('qwen3') || modelName.includes('glm4'))) {
    return {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 2500,
    };
  }
  // Default (Gemini 2.5 Flash and others) — cap tokens to prevent unbounded generation
  return { temperature: defaultTemp, maxOutputTokens: 2500 };
}

function getImageTypeRule(imageType?: string): string {
  const rules: Record<string, string> = {
    infographic: 'Icon-driven, no photorealistic humans. Max 6 short labels from the content, 1 title, clean modular layout.',
    character: 'Full character focus, simple background, no data/charts.',
    abstract_visual: 'Metaphor/geometry that clearly relates to the content topic.',
    ui_mockup: 'Clean functional UI, no design tool chrome.',
    scene_illustration: 'Narrative moment that illustrates the article subject.',
    product_render: 'Studio-quality, material accuracy, commercial look.',
    data_viz: 'Clean charts, Tufte-style, precise geometry.',
    icon_or_sticker: 'Bold, simple icon on clean background.',
  };
  return rules[imageType || ''] || 'Scene illustration: show the article subject in a narrative moment.';
}

export async function runGenerateImagePromptsFromTextLogic(input: GenerateImagePromptsFromTextInput): Promise<GenerateImagePromptsFromTextOutput> {
    // Generate unique creative direction for this generation
    const freshness = generateFreshnessProfile();
    const freshnessHint = buildFreshnessHint(freshness);

    // Step 1: Session prompting with AI model
    const promptText = `You are a senior creative director creating image concepts for blog articles. Priority #1: content accuracy — the image must instantly communicate what the article is about.

**UNDERSTAND THE CONTENT FIRST**
Before any visual ideation, identify: (1) what this article is actually about, (2) the target audience, (3) 3-5 key concepts a reader would associate with the topic.

**VISUAL ANCHOR** — write a “visual_anchor”: 1–2 sentences describing ONE concrete, drawable scene that directly represents the article topic using recognizable objects/symbols. Be specific enough for any artist to recreate.
Good: “A split-screen showing a US phone dialing +44 connected by a glowing arc to a UK phone, with labeled steps floating alongside: country code, area code, local number”
Bad: “Abstract origami structures evoking geopolitical alliance” (too abstract, nobody knows it's about phone calls)

**10-PART COMPONENT SPEC** — using the visual anchor, fill each field with specific, concrete, content-relevant details:
- subject: main visual elements (exact objects, materials, colors) recognizable as related to the article
- action_context: what is happening that communicates the article's message
- environment: setting that reinforces the topic (tech guide = clean modern; cooking = kitchen)
- mood_story: emotional tone matching the article (helpful guide = clear and empowering)
- visual_style: art style appropriate for content and audience
- lighting_color: light source, direction, color palette supporting readability
- camera_composition: framing that showcases key information clearly
- detail_texture: relevant surface details and materials
- quality_realism: technical quality specs (8K, clean render, etc.)
- negative_constraints: elements to avoid, especially anything that would confuse the topic

**IMAGE TYPE** (${input.imageType || 'scene_illustration'}): ${getImageTypeRule(input.imageType)}

**RULES**: Labels/text must use terms from the actual content. Visual metaphors must be immediately understandable. Avoid: disembodied hands, generic laptop smiles, lightbulb=idea clichés.

${freshnessHint}

Output strict JSON matching the schema.

Content: ${input.blogText.slice(0, 1500)}
`;

    const useRelaxedSchema = isNvidiaModel(input.model);
    const componentsSchema = useRelaxedSchema ? RelaxedPromptComponentsSchema : PromptComponentsSchema;

    console.log("MODEL_DEBUG", { model: input.model || 'default (gemini)', useRelaxedSchema });

    const outputSchema = z.object({
      unifiedAnalysis: z.object({
        contentSummary: z.string(),
        keyPoints: z.array(z.string()),
        tone: z.string(),
        intent: z.string(),
        visualSummary: z.string(),
        layoutDescription: z.string(),
        brandStyle: z.string(),
        aspectRatioSuggestion: z.string(),
        visual_anchor: z.string().describe('1-2 sentences: a single concrete scene to draw.'),
      }),
      promptComponents: componentsSchema,
      aspectRatioSuggestions: z.array(z.string()),
    });

    const { output } = await ai.generate({
      model: input.model || undefined,
      config: getModelConfig(input.model, 0.7),
      prompt: promptText,
      output: {
        format: 'json',
        schema: outputSchema
      }
    });

    if (!output) throw new Error("Model returned null — failed to generate prompt components");

    // Conflict Resolution (sync — no extra AI call)
    output.promptComponents = resolveStyleConflicts(output.promptComponents);

    // Step 2: Extract context from text analysis
    const userOptions: UserPromptOptions = {
          imageType: input.imageType as ImageType,
          glossLevel: input.glossLevel as any,
          stylePreference: input.style,
          colorThemeMode: input.colorThemeMode as any,
          presetColorThemeId: input.presetColorThemeId as any,
          customColorDescription: input.customColorDescription,
          customColorTheme: input.customColorTheme
    };

    // Auto-Theme Logic: If mode is auto/undefined, analyze content to pick a theme
    if (!userOptions.colorThemeMode || userOptions.colorThemeMode === 'auto') {
        const autoTheme = analyzeAndSelectTheme(output.unifiedAnalysis);
        userOptions.colorThemeMode = 'custom';
        userOptions.customColorTheme = autoTheme;
        userOptions.customColorDescription = `Auto-generated theme: ${autoTheme.label}`;
    }

    // Apply Image Type Blueprint
    if (userOptions.imageType) {
        output.promptComponents = applyImageTypeBlueprint(output.promptComponents, userOptions.imageType);
    }
    
    // Apply Color Theme
    output.promptComponents = applyColorThemeToComponents(output.promptComponents, userOptions);

    const generationContext = {
        contentType: input.contentType || output.unifiedAnalysis.intent, // Use intent as fallback
        tone: output.unifiedAnalysis.tone,
        keywords: output.unifiedAnalysis.keyPoints,
        style: input.style as BrandStyle,
        intent: input.intent as PromptIntent,
        lengthMode: input.lengthMode as LengthMode,
        imageType: input.imageType as ImageType,
        analysis: output.unifiedAnalysis as UnifiedAnalysis,
        userOptions: userOptions
    };

    // Step 3: Generate enhanced prompts with quality scoring
    const enhancedOutput = generateEnhancedPrompts(output.promptComponents, generationContext);

    const masterPrompt = enhancedOutput.masterPrompt;
    const sanityPreview = "Skipped (Vercel timeout budget)";

    // Map to output format
    const detailedPrompts = {
        midjourney: enhancedOutput.midjourney.prompt,
        dalle: enhancedOutput.dalle.prompt,
        stableDiffusion: enhancedOutput.stableDiffusion.prompt,
        flux: enhancedOutput.flux.prompt
    };

    const imagePrompt = detailedPrompts.midjourney; // Default to Midjourney for backward compatibility

    return {
      imagePrompt,
      promptComponents: output.promptComponents,
      detailedPrompts,
      masterPrompt, 
      aspectRatioSuggestions: output.aspectRatioSuggestions,
      qualityMetrics: {
        overallScore: enhancedOutput.midjourney.qualityScore,
        rating: enhancedOutput.metadata.overallQualityRating,
        suggestions: enhancedOutput.metadata.suggestions,
        suggestedAspectRatio: enhancedOutput.metadata.suggestedAspectRatio
      },
      variants: enhancedOutput.variants,
      debugInfo: {
          sanityPreview, // Add to debug info
          styleProfile: enhancedOutput.debugInfo?.styleProfile || "default",
          intent: enhancedOutput.debugInfo?.intent || "general",
          lengthMode: enhancedOutput.debugInfo?.lengthMode || "default",
          appliedRules: enhancedOutput.debugInfo?.appliedRules || [],
          layoutPattern: output.unifiedAnalysis.layoutDescription,
          glossLevel: input.glossLevel,
          finalPromptLength: masterPrompt?.length || 0
      }
    };
}

const generateImagePromptsFromTextFlow = ai.defineFlow(
  {
    name: 'generateImagePromptsFromTextFlow',
    inputSchema: GenerateImagePromptsFromTextInputSchema,
    outputSchema: GenerateImagePromptsFromTextOutputSchema,
  },
  async input => {
    return runGenerateImagePromptsFromTextLogic(input);
  }
);

