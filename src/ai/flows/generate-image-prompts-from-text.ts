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
import { detectAndResolveConflicts } from '@/ai/utils/conflict-resolver';
import { generateSanityPreview } from '@/ai/utils/sanity-preview';
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
      maxOutputTokens: 4096,
    };
  }
  if (modelName && modelName.includes('deepseek-v3.2')) {
    return {
      temperature: 1,
      topP: 0.95,
      maxOutputTokens: 8192,
      extra_body: { chat_template_kwargs: { thinking: true } }
    };
  }
  if (modelName && modelName.includes('gpt-oss-120b')) {
    return {
      temperature: 0.8,
      topP: 1.0,
      maxOutputTokens: 4096,
    };
  }
  if (modelName && (modelName.includes('qwen3') || modelName.includes('glm4'))) {
    return {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 4096,
    };
  }
  return { temperature: defaultTemp };
}

export async function runGenerateImagePromptsFromTextLogic(input: GenerateImagePromptsFromTextInput): Promise<GenerateImagePromptsFromTextOutput> {
    // Generate unique creative direction for this generation
    const freshness = generateFreshnessProfile();
    const freshnessHint = buildFreshnessHint(freshness);

    // Step 1: Session prompting with AI model
    const promptText = `You are a senior creative director who creates image concepts for blog articles. Your #1 priority is **content accuracy** — the image must clearly represent what the article is about.

**STEP 0 — UNDERSTAND THE CONTENT (Critical — do this first)**
Before ANY visual ideation, answer these questions internally:
1. What is this article actually about? (e.g., “How to make international phone calls from US to UK”)
2. Who is the target audience? (e.g., “people who need to call UK numbers”)
3. What are the 3-5 key takeaways? (e.g., “dialing instructions, area codes, time zones, cost tips, VoIP services”)
4. What objects/concepts would a reader immediately associate with this topic? (e.g., “phones, flags, dial pads, world map, clock showing time zones”)

Your image MUST be instantly recognizable as being about this specific topic. If someone sees the image, they should immediately understand the article's subject.

**STEP 1 — VISUAL ANCHOR**
Write a “visual_anchor”: 1–2 sentences describing ONE concrete scene that:
- DIRECTLY represents the article's actual subject matter
- Uses objects and symbols the target audience would recognize
- Is specific enough for any artist to recreate

CONTENT-FIRST examples:
- Article about “How to Call UK from US”: “A clean split-screen showing a US smartphone on the left dialing +44, connected by a glowing line across a minimal world map to a UK phone on the right, with labeled steps floating alongside: country code, area code, local number”
- Article about “Best Coffee Brewing Methods”: “A top-down flat-lay of four distinct brewing setups — French press, pour-over, espresso machine, and AeroPress — each with its coffee cup showing different crema colors, arranged on a warm wooden counter with labeled brew times”
- BAD (for calling guide): “Two monumental origami structures evoking geopolitical alliance” ← This is completely disconnected from the content. Nobody would know this is about phone calls.

Also create 2-3 “alt_anchors” with genuinely DIFFERENT visual approaches that still clearly represent the same content topic.

**STEP 2 — 10-PART COMPONENT SPEC**
Using your visual_anchor, fill every component with SPECIFIC, CONCRETE details:
- subject: The main visual elements that represent the article topic. Name exact objects, materials, colors. Must be recognizable as related to the content.
- action_context: What is happening that communicates the article's message? Show the process/concept in action.
- environment: Setting that reinforces the topic. If it's a tech guide, use a clean modern setting. If it's cooking, use a kitchen. Match the content.
- mood_story: The emotional tone matching the article. A helpful guide should feel clear and empowering, not ominous.
- visual_style: Art style appropriate for the content and audience. A business article needs professional polish, a creative article can be more experimental.
- lighting_color: Light source, direction, color palette that supports readability and mood.
- camera_composition: Framing that showcases the key information clearly. Prioritize clarity over artistic angles.
- detail_texture: Surface details and materials. Keep them relevant to the subject matter.
- quality_realism: Technical quality specs (8K, clean render, etc.).
- negative_constraints: What to explicitly avoid — including anything that would confuse the topic.

**STEP 3 — IMAGE TYPE RULES**
Respect the imageType strictly:
- infographic: Icon-driven, no photorealistic humans. Labels MUST come from the actual content (e.g., article key points, steps, or data). Max 6 short labels derived from the article, 1 title matching the article topic, 1 CTA. Clean modular layout with generous whitespace, icon-based communication.
- character: Full character focus, simple background, no data/charts
- abstract_visual: Use metaphor/geometry, but the metaphor must clearly relate to the content topic
- ui_mockup: Clean functional UI, no design tool chrome
- scene_illustration: Narrative moment that illustrates the article's subject
- product_render: Studio-quality, material accuracy, commercial look
- data_viz: Clean charts, Tufte-style, precise geometry, data from the article

**CONTENT ACCURACY RULES (Critical — Higher Priority Than Creativity)**
1. The image title/headline MUST reflect the actual article topic, not an abstracted version
2. Any labels or text in the image MUST use terms from the actual content
3. Visual metaphors must be IMMEDIATELY understandable — if you need to explain the metaphor, it's too abstract
4. The image should work as a thumbnail — a viewer should know what the article is about just from the image
5. When in doubt, choose clarity over creativity

**ANTI-STOCK RULES**
Avoid generic stock imagery:
- Disembodied hands reaching for things
- Generic people smiling at laptops
- Cheesy metaphors (lightbulb = idea, puzzle = teamwork)
- Overused gradients with no subject
But DO use relevant, recognizable objects and symbols for the topic.

${freshnessHint}

**OUTPUT**: Strictly valid JSON matching the schema. Every string field must be specific, visual, AND relevant to the input content.

Input Content:
${input.blogText}

Image Type: ${input.imageType || 'scene_illustration'}
`;

    const useRelaxedSchema = isNvidiaModel(input.model);
    const componentsSchema = useRelaxedSchema ? RelaxedPromptComponentsSchema : PromptComponentsSchema;

    console.log("MODEL_DEBUG", { model: input.model || 'default (gemini)', useRelaxedSchema });

    const outputSchema = z.object({
      unifiedAnalysis: z.object({
        userText: z.string().optional(),
        ocrText: z.string().optional(),
        combinedText: z.string(),
        contentSummary: z.string(),
        keyPoints: z.array(z.string()),
        tone: z.string(),
        intent: z.string(),
        audience: z.string(),
        visualSummary: z.string(),
        layoutDescription: z.string(),
        uiElements: z.array(z.string()),
        keepStructure: z.boolean(),
        verdict: z.enum(['perfect', 'needs_edit']),
        alignmentNotes: z.string(),
        visualGoals: z.string(),
        brandStyle: z.string(),
        aspectRatioSuggestion: z.string(),
        visual_anchor: z.string().optional().describe('1-2 sentences that describe a single concrete scene you could draw.'),
        alt_anchors: z.array(z.object({
            anchor: z.string(),
            type: z.string()
        })).optional().describe('2-3 alternative visual ideas (scene, character, infographic, abstract) tagged by imageType.'),
      }),
      promptComponents: componentsSchema,
      aspectRatioSuggestions: z.array(z.string()),
      sanity_preview: z.string().optional()
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

    // Conflict Resolution
    output.promptComponents = await detectAndResolveConflicts(output.promptComponents);

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

    // Override master prompt with the new robust builder
    let masterPrompt = enhancedOutput.masterPrompt;

    // Sanity Preview & Auto-Correction
    let sanityPreview = await generateSanityPreview(masterPrompt, input.blogText);
    let wasAutoCorrected = false;

    const needsCorrection = sanityPreview && (
        sanityPreview.includes('STOCK-LIKE') || sanityPreview.includes('CONTENT-MISMATCH')
    );

    if (needsCorrection) {
        const isContentMismatch = sanityPreview!.includes('CONTENT-MISMATCH');

        if (isContentMismatch) {
            // Content mismatch: Re-ground the subject in the actual content topic
            const contentSummary = output.unifiedAnalysis.contentSummary || '';
            const keyPoints = output.unifiedAnalysis.keyPoints?.slice(0, 3).join(', ') || '';
            output.promptComponents.subject = `clear visual representation of: ${contentSummary}. Key elements: ${keyPoints}`;
            output.promptComponents.mood_story = `informative, clear, and directly relevant to the topic of ${contentSummary}`;
            output.promptComponents.negative_constraints = (output.promptComponents.negative_constraints || "") + ", abstract metaphors unrelated to the topic, confusing symbolism, architectural structures used as metaphor, anything that obscures the actual subject";
            sanityPreview += " [AUTO-CORRECTED: Re-grounded subject to match article content]";
        } else {
            // Stock-like: Enhance visual quality while keeping subject
            const originalSubject = output.promptComponents.subject || '';
            output.promptComponents.subject = `high-end 3D render representing ${originalSubject}, with clean modern iconography and premium visual treatment`;
            output.promptComponents.environment = output.promptComponents.environment
                ? `${output.promptComponents.environment}, modern premium aesthetic`
                : "modern SaaS UI interface with clean lines and polished background";
            output.promptComponents.negative_constraints = (output.promptComponents.negative_constraints || "") + ", human hands, stock photo, cheesy holograms, disembodied body parts, generic clipart";
            sanityPreview += " [AUTO-CORRECTED: Enhanced subject with premium visual treatment]";
        }

        // Rebuild prompt
        const correctedOutput = generateEnhancedPrompts(output.promptComponents, generationContext);
        masterPrompt = correctedOutput.masterPrompt;

        enhancedOutput.midjourney.prompt = correctedOutput.midjourney.prompt;
        enhancedOutput.dalle.prompt = correctedOutput.dalle.prompt;
        enhancedOutput.stableDiffusion.prompt = correctedOutput.stableDiffusion.prompt;
        enhancedOutput.flux.prompt = correctedOutput.flux.prompt;

        wasAutoCorrected = true;
    }

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

