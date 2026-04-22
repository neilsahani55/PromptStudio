/**
 * @fileOverview Generates image prompts from a screenshot.
 *
 * - generateImagePromptsFromScreenshot - A function that handles the image prompt generation process.
 * - GenerateImagePromptsFromScreenshotInput - The input type for the generateImagePromptsFromScreenshot function.
 * - GenerateImagePromptsFromScreenshotOutput - The return type for the generateImagePromptsFromScreenshot function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { PromptComponentsSchema, ImageType, UnifiedAnalysis, ScreenshotMode, RedesignMode } from '@/ai/prompt-schema';
import { generateEnhancedPrompts } from '@/ai/prompt-generator';
import { UnifiedContext, UserPromptOptions } from '@/ai/prompt-schema';
import { buildMasterPrompt, applyColorThemeToComponents } from '@/ai/utils/master-prompt';
import { applyImageTypeBlueprint } from '@/ai/utils/image-type-blueprints';
import { cleanOCRText } from '@/ai/utils/clean-ocr';
import { detectAndResolveConflicts } from '@/ai/utils/conflict-resolver';
import { generateSanityPreview } from '@/ai/utils/sanity-preview';
import { analyzeAndSelectTheme } from '@/ai/utils/smart-theme-engine';

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

const GenerateImagePromptsFromScreenshotInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a screenshot, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  additionalImages: z.array(z.string()).optional().describe('Additional screenshots for style reference (base64 data URIs).'),
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
  redesignMode: z.enum(['preserve_base', 'light_redesign', 'full_reimagine']).optional().describe('How to treat the screenshot structure.'),
  ocrText: z.string().optional().describe('Text extracted from the screenshot via OCR (mocked for now).'),
  includeAccessibilityHints: z.boolean().optional().describe('Whether to include accessibility guidelines in the prompt.'),
  userText: z.string().optional().describe('New content text for update mode.'),
  mode: z.enum(['improve_only', 'update_with_new_content']).default('improve_only').describe('The operation mode.'),
  colorThemeMode: z.enum(['auto', 'preset', 'custom']).optional(),
  presetColorThemeId: z.enum(['light_neutral', 'dark_saas', 'warm_organic', 'cyber_blue', 'pastel_playful', 'high_contrast']).optional(),
  customColorDescription: z.string().optional(),
  customColorTheme: z.any().optional()
});
export type GenerateImagePromptsFromScreenshotInput = z.infer<typeof GenerateImagePromptsFromScreenshotInputSchema>;

const GenerateImagePromptsFromScreenshotOutputSchema = z.object({
  verdict: z.enum(["Perfect", "Needs Edit"]).describe('A one-word verdict on whether the image is perfect or needs editing.'),
  analysis: z.string().describe('An analysis of why the image is or is not a good fit for the content.'),
  newImagePrompt: z.string().optional().describe('A new image prompt (default/fallback).'),
  promptComponents: PromptComponentsSchema.optional().describe('Structured components for the new prompt.'),
  detectedLayoutElements: z.array(z.string()).optional(),
  ocrKeyPoints: z.array(z.string()).optional(),
  layoutIntent: z.string().optional(),
  
  // New Features
  issuesDetected: z.array(z.string()).optional(),
  designBrief: z.object({
    primaryColorPalette: z.string(),
    typographySummary: z.string(),
    componentStyle: z.string()
  }).optional(),
  transformationSummary: z.string().optional(),

  // Enhanced fields
  detailedPrompts: z.object({
    midjourney: z.string(),
    dalle: z.string(),
    stableDiffusion: z.string(),
    flux: z.string()
  }).optional().describe('Platform-specific prompts.'),
  masterPrompt: z.string().optional().describe('Universal, platform-agnostic master prompt.'),
  parameters: z.record(z.any()).optional().describe('Platform parameters.'),
  qualityMetrics: z.object({
    overallScore: z.number(),
    rating: z.string(),
    suggestions: z.array(z.string()),
    suggestedAspectRatio: z.string()
  }).optional().describe('Quality scores and suggestions.'),
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
export type GenerateImagePromptsFromScreenshotOutput = z.infer<typeof GenerateImagePromptsFromScreenshotOutputSchema>;

export async function generateImagePromptsFromScreenshot(
  input: GenerateImagePromptsFromScreenshotInput
): Promise<GenerateImagePromptsFromScreenshotOutput> {
  // Bypass flow wrapper to avoid Next.js Server Action conflicts
  return runGenerateImagePromptsFromScreenshotLogic(input);
}

const prompt = ai.definePrompt({
  name: 'generateImagePromptsFromScreenshotPrompt',
  input: { schema: GenerateImagePromptsFromScreenshotInputSchema },
  output: {
    schema: z.object({
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
        redesignMode: z.enum(['preserve_base', 'light_redesign', 'full_reimagine']).optional(),
        detectedLayoutElements: z.array(z.string()).optional(),
        ocrKeyPoints: z.array(z.string()).optional(),
        layoutIntent: z.string().optional(),
        verdict: z.enum(['perfect', 'needs_edit']),
        alignmentNotes: z.string(),
        visualGoals: z.string(),
        brandStyle: z.string(),
        aspectRatioSuggestion: z.string(),
        visual_anchor: z.string().optional(),
        alt_anchors: z.array(z.object({ anchor: z.string(), type: z.string() })).optional(),
        
        // New Fields
        issuesDetected: z.array(z.string()).optional(),
        designBrief: z.object({
            primaryColorPalette: z.string(),
            typographySummary: z.string(),
            componentStyle: z.string()
        }).optional(),
        transformationSummary: z.string().optional(),
      }),
      promptComponents: PromptComponentsSchema.optional(),
    })
  },
  prompt: `You are a senior creative director and AI prompt engineer.
Your task is to analyze a screenshot (and its optional OCR text) to create a fully specified, industry-level image brief.

**Step 1: Unified Analysis (Fusion)**
Analyze the visual screenshot AND any provided OCR text together.
- **Layout Tags**: Identify key structures (e.g., "Sidebar", "Chart", "Login Form", "Hero Section").
- **OCR Context**: Extract 3-5 "ocrKeyPoints" (crucial headings/metrics) that give meaning to the screen.
- **Redesign Mode**: 
  - If user specified 'redesignMode', respect it.
  - If not, default to 'preserve_base' for UI mockups/infographics, or 'full_reimagine' for generic topics.
- **Layout Intent**: Write a 1-sentence "layoutIntent" describing the plan (e.g., "We will keep the sidebar layout but modernize the typography and colors.").

**Step 2: Component Generation (if "Needs Edit")**
Create the 10-part visual specification.
- **Image Type Rules**:
  - **ui_mockup**: 
    - Subject: "High-fidelity UI mockup of [purpose]..."
    - Environment: "Clean device frame / browser window..."
    - Constraints: "No design tool chrome, no tiny illegible text, keep key headings intact."
  - **dashboard**: Mention "sidebar navigation, top bar, main chart area" if detected.
- **Redesign Logic**:
  - **preserve_base**: 'subject' and 'camera_composition' MUST imply strictly keeping the original layout.
  - **light_redesign**: Keep structure but upgrade styling significantly.
  - **full_reimagine**: Use the content ideas but create a fresh composition.

**Step 3: New Features**
1. **Issues Detected**: Identify 2-4 UI/UX flaws in the ORIGINAL image (e.g., "Low contrast text", "Crowded layout", "Inconsistent spacing").
2. **Design Brief**: Summarize the NEW design choices:
   - Primary Color Palette (e.g., "Deep Indigo, Teal Accents")
   - Typography Summary (e.g., "Sans-serif, Bold Headings")
   - Component Style (e.g., "Rounded corners (8px), Flat Design")
3. **Transformation Summary**: A 1-sentence "Before vs After" for a Jira ticket (e.g., "Keeps the sidebar structure but upgrades to a dark SaaS theme with high-contrast data viz.").
4. **Accessibility Hints**: {{#if includeAccessibilityHints}}
   - CRITICAL: Add specific constraints to 'negative_constraints' or 'quality_realism' to ensure:
     - High contrast text (WCAG AA compliant)
     - Clear visual hierarchy
     - Colorblind-safe charts
   {{/if}}
5. **Multi-Image Context**: {{#if additionalImages}}
   - The first image is the PRIMARY layout reference.
   - The additional images are STYLE references. Use their colors/vibes but apply them to the primary layout.
   {{/if}}

**CONTENT ACCURACY RULES (Highest Priority):**
1.  **TOPIC FIDELITY**: The generated visual must clearly represent what the screenshot/content is actually about. A viewer should immediately understand the subject from the image alone.
2.  **LABELS FROM CONTENT**: Any text labels, titles, or annotations in the output must come from the actual OCR text or content — never invent abstract or disconnected labels.
3.  **NO ABSTRACT METAPHORS**: Do not replace the actual subject with abstract architectural, geometric, or artistic metaphors that obscure the real topic.

**CRITICAL RULES:**
1.  **OCR USAGE**: Use OCR text to understand *what* the screen is about. Do NOT output long paragraphs of text.
2.  **JSON OUTPUT**: Return the result strictly as a JSON object matching the schema.
3.  **VISUAL FOCUS**: The image should not contain long sentences or body text. Use only minimal labels (titles, short headings, UI tags) and rely on layout, color, icons, and shapes to communicate information.

Input Context:
Image Type: {{imageType}}
Redesign Mode Preference: {{redesignMode}}
OCR Text: {{ocrText}}
Include Accessibility Hints: {{includeAccessibilityHints}}
Image: {{media url=photoDataUri}}
{{#each additionalImages}}
Style Ref Image: {{media url=this}}
{{/each}}`,
});

const TEXT_ONLY_MODELS = [
  'openai/deepseek-ai/deepseek-v3.2',
  'openai/qwen/qwen3.5-397b-a17b',
  'openai/z-ai/glm4.7',
  'openai/moonshotai/kimi-k2-instruct-0905',
  'openai/openai/gpt-oss-120b'
];

function getModelConfig(modelName?: string, defaultTemp = 0.5) {
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

const refineAnalysisPrompt = ai.definePrompt({
  name: 'refineAnalysisPrompt',
  input: {
    schema: z.object({
      analysisContext: z.string(),
      imageType: z.string().optional(),
      redesignMode: z.string().optional(),
      includeAccessibilityHints: z.boolean().optional()
    })
  },
  output: {
    schema: z.object({
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
        redesignMode: z.enum(['preserve_base', 'light_redesign', 'full_reimagine']).optional(),
        detectedLayoutElements: z.array(z.string()).optional(),
        ocrKeyPoints: z.array(z.string()).optional(),
        layoutIntent: z.string().optional(),
        verdict: z.enum(['perfect', 'needs_edit']),
        alignmentNotes: z.string(),
        visualGoals: z.string(),
        brandStyle: z.string(),
        aspectRatioSuggestion: z.string(),
        visual_anchor: z.string().optional(),
        alt_anchors: z.array(z.object({ anchor: z.string(), type: z.string() })).optional(),
        
        // New Fields
        issuesDetected: z.array(z.string()).optional(),
        designBrief: z.object({
            primaryColorPalette: z.string(),
            typographySummary: z.string(),
            componentStyle: z.string()
        }).optional(),
        transformationSummary: z.string().optional(),
      }),
      promptComponents: PromptComponentsSchema.optional(),
    })
  },
  prompt: `You are a senior creative director and AI prompt engineer.
Your task is to take a raw visual analysis of a screenshot and RE-ENGINEER it into a superior image brief.

**Input Context**:
- **Raw Analysis**: {{analysisContext}}
- **Target Image Type**: {{imageType}}
- **Redesign Mode**: {{redesignMode}}
- **Accessibility**: {{includeAccessibilityHints}}

**Your Goal**:
1.  **Refine the Analysis**: Improve the "layoutIntent" and "visualGoals" based on the Redesign Mode.
    - If 'light_redesign': Suggest modern spacing, cleaner fonts, but keep the structure.
    - If 'full_reimagine': Propose a bold new layout that preserves the *content* but changes the *form*.
2.  **Generate Prompt Components**: Create the 10-part visual specification (PromptComponents).
    - Ensure 'subject' and 'composition' match the Redesign Mode.
    - Make the 'visualStyle' specific and high-quality.
    - If Accessibility is ON: Explicitly request high contrast and clear hierarchy.
3.  **Generate New Insights**:
    - **Issues Detected**: List 3 flaws in the original concept inferred from the analysis.
    - **Design Brief**: Define the new style (Colors, Type, Components).
    - **Transformation Summary**: A one-line pitch of the upgrade.

**VISUAL FOCUS**: The image should not contain long sentences or body text. Use only minimal labels (titles, short headings, UI tags) and rely on layout, color, icons, and shapes to communicate information.

**CONTENT ACCURACY (Highest Priority):**
- The refined image brief must clearly represent the original screenshot's actual subject matter.
- Labels, titles, and annotations must be derived from the actual content — never invent abstract labels.
- Visual metaphors are fine only if they clearly relate to the topic. Never use abstract architectural or geometric metaphors that obscure the real subject.

**FRESHNESS**: For images with similar topics, vary the visual approach (composition, focal point, layout pattern) so each prompt feels fresh.
- You may be assigned a specific layout pattern (e.g., "central-hub", "two-column", "grid-cards", "radial-apps", "vertical-steps").
- Respect the layout pattern and describe composition accordingly — don't default to a central hero unless explicitly specified.
- Reuse the core content but change how it is visually arranged while keeping the topic recognizable.

**Output**:
Return the refined UnifiedAnalysis and PromptComponents as JSON.`
});

const updateReasoningPrompt = ai.definePrompt({
  name: 'updateReasoningPrompt',
  input: {
    schema: z.object({
      ocrText: z.string(),
      visualSummary: z.string(),
      userNewContent: z.string(),
    })
  },
  output: {
    schema: z.object({
        oldSummary: z.string(),
        newSummary: z.string(),
        keyDifferences: z.array(z.string()),
        mustUpdate: z.array(z.string()),
        mustPreserve: z.array(z.string()),
    })
  },
  prompt: `You are updating an existing design to match new content.
OCR text from existing image: {{ocrText}}
Visual description of existing image: {{visualSummary}}
New content provided by the user: {{userNewContent}}

Summarize what the existing image currently communicates in 2–3 sentences.

Summarize what the new content needs to communicate in 2–3 sentences.

List 3–7 key differences between old and new (focus on message, features, audience, or tone).

From a visual point of view, list which parts of the existing image must be UPDATED to reflect the new content.
CRITICAL: Only update components that logically change based on the new text (e.g., headlines, charts, icons). Preserve layout and style unless the content demands a shift.

List which parts must be PRESERVED (layout, brand colors, general style, key components).

**VISUAL FOCUS**: The image should not contain long sentences or body text. Use only minimal labels (titles, short headings, UI tags) and rely on layout, color, icons, and shapes to communicate information.

Return strict JSON with:
{
"oldSummary": string,
"newSummary": string,
"keyDifferences": string[],
"mustUpdate": string[],
"mustPreserve": string[]
}`
});

export async function runGenerateImagePromptsFromScreenshotLogic(
  input: GenerateImagePromptsFromScreenshotInput
): Promise<GenerateImagePromptsFromScreenshotOutput> {
    // Clean OCR Text
    const ocrResult = await cleanOCRText(input.ocrText || "");
    
    let output;

    // Define schemas locally for ai.generate
    const mainOutputSchema = z.object({
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
        redesignMode: z.enum(['preserve_base', 'light_redesign', 'full_reimagine']).optional(),
        detectedLayoutElements: z.array(z.string()).optional(),
        ocrKeyPoints: z.array(z.string()).optional(),
        layoutIntent: z.string().optional(),
        verdict: z.enum(['perfect', 'needs_edit']),
        alignmentNotes: z.string(),
        visualGoals: z.string(),
        brandStyle: z.string(),
        aspectRatioSuggestion: z.string(),
        visual_anchor: z.string().optional(),
        alt_anchors: z.array(z.object({ anchor: z.string(), type: z.string() })).optional(),
        
        // New Fields
        issuesDetected: z.array(z.string()).optional(),
        designBrief: z.object({
            primaryColorPalette: z.string(),
            typographySummary: z.string(),
            componentStyle: z.string()
        }).optional(),
        transformationSummary: z.string().optional(),
      }),
      promptComponents: PromptComponentsSchema.optional(),
    });

    const useRelaxedSchema = isNvidiaModel(input.model);
    const componentsSchema = useRelaxedSchema ? RelaxedPromptComponentsSchema : PromptComponentsSchema;
    console.log("SCREENSHOT_MODEL_DEBUG", { model: input.model || 'default (gemini)', useRelaxedSchema });

    const updateReasoningOutputSchema = z.object({
        oldSummary: z.string(),
        newSummary: z.string(),
        keyDifferences: z.array(z.string()),
        mustUpdate: z.array(z.string()),
        mustPreserve: z.array(z.string()),
    });

    const refineAnalysisOutputSchema = z.object({
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
        redesignMode: z.enum(['preserve_base', 'light_redesign', 'full_reimagine']).optional(),
        detectedLayoutElements: z.array(z.string()).optional(),
        ocrKeyPoints: z.array(z.string()).optional(),
        layoutIntent: z.string().optional(),
        verdict: z.enum(['perfect', 'needs_edit']),
        alignmentNotes: z.string(),
        visualGoals: z.string(),
        brandStyle: z.string(),
        aspectRatioSuggestion: z.string(),
        visual_anchor: z.string().optional(),
        alt_anchors: z.array(z.object({ anchor: z.string(), type: z.string() })).optional(),

        // New Fields
        issuesDetected: z.array(z.string()).optional(),
        designBrief: z.object({
            primaryColorPalette: z.string(),
            typographySummary: z.string(),
            componentStyle: z.string()
        }).optional(),
        transformationSummary: z.string().optional(),
      }),
      promptComponents: componentsSchema.optional(),
    });

    if (input.mode === 'update_with_new_content') {
        // Step 1: Vision Analysis (using Gemini or other vision model)
        const visionPromptParts: any[] = [
            { text: `You are a senior creative director and AI prompt engineer.
Your task is to analyze a screenshot (and its optional OCR text) to create a fully specified, industry-level image brief.

**Step 1: Unified Analysis (Fusion)**
Analyze the visual screenshot AND any provided OCR text together.
- **Layout Tags**: Identify key structures (e.g., "Sidebar", "Chart", "Login Form", "Hero Section").
- **OCR Context**: Extract 3-5 "ocrKeyPoints" (crucial headings/metrics) that give meaning to the screen.
- **Redesign Mode**: 
  - If user specified 'redesignMode', respect it.
  - If not, default to 'preserve_base' for UI mockups/infographics, or 'full_reimagine' for generic topics.
- **Layout Intent**: Write a 1-sentence "layoutIntent" describing the plan (e.g., "We will keep the sidebar layout but modernize the typography and colors.").

**Step 2: Component Generation (if "Needs Edit")**
Create the 10-part visual specification.
- **Image Type Rules**:
  - **ui_mockup**: 
    - Subject: "High-fidelity UI mockup of [purpose]..."
    - Environment: "Clean device frame / browser window..."
    - Constraints: "No design tool chrome, no tiny illegible text, keep key headings intact."
  - **dashboard**: Mention "sidebar navigation, top bar, main chart area" if detected.
- **Redesign Logic**:
  - **preserve_base**: 'subject' and 'camera_composition' MUST imply strictly keeping the original layout.
  - **light_redesign**: Keep structure but upgrade styling significantly.
  - **full_reimagine**: Use the content ideas but create a fresh composition.

**Step 3: New Features**
1. **Issues Detected**: Identify 2-4 UI/UX flaws in the ORIGINAL image (e.g., "Low contrast text", "Crowded layout", "Inconsistent spacing").
2. **Design Brief**: Summarize the NEW design choices:
   - Primary Color Palette (e.g., "Deep Indigo, Teal Accents")
   - Typography Summary (e.g., "Sans-serif, Bold Headings")
   - Component Style (e.g., "Rounded corners (8px), Flat Design")
3. **Transformation Summary**: A 1-sentence "Before vs After" for a Jira ticket (e.g., "Keeps the sidebar structure but upgrades to a dark SaaS theme with high-contrast data viz.").
4. **Accessibility Hints**: ${input.includeAccessibilityHints ? `
   - CRITICAL: Add specific constraints to 'negative_constraints' or 'quality_realism' to ensure:
     - High contrast text (WCAG AA compliant)
     - Clear visual hierarchy
     - Colorblind-safe charts` : ''}
5. **Multi-Image Context**: ${input.additionalImages ? `
   - The first image is the PRIMARY layout reference.
   - The additional images are STYLE references. Use their colors/vibes but apply them to the primary layout.` : ''}

**CONTENT ACCURACY RULES (Highest Priority):**
1.  **TOPIC FIDELITY**: The generated visual must clearly represent what the screenshot/content is actually about. A viewer should immediately understand the subject from the image alone.
2.  **LABELS FROM CONTENT**: Any text labels, titles, or annotations in the output must come from the actual OCR text or content — never invent abstract or disconnected labels.
3.  **NO ABSTRACT METAPHORS**: Do not replace the actual subject with abstract architectural, geometric, or artistic metaphors that obscure the real topic.

**CRITICAL RULES:**
1.  **OCR USAGE**: Use OCR text to understand *what* the screen is about. Do NOT output long paragraphs of text.
2.  **JSON OUTPUT**: Return the result strictly as a JSON object matching the schema.
3.  **VISUAL FOCUS**: The image should not contain long sentences or body text. Use only minimal labels (titles, short headings, UI tags) and rely on layout, color, icons, and shapes to communicate information.

Input Context:
Image Type: ${input.imageType}
Redesign Mode Preference: ${input.redesignMode}
OCR Text: ${ocrResult}
Include Accessibility Hints: ${input.includeAccessibilityHints}
Image:` },
            { media: { url: input.photoDataUri } }
        ];

        if (input.additionalImages) {
            input.additionalImages.forEach(img => {
                visionPromptParts.push({ text: "Style Ref Image:" });
                visionPromptParts.push({ media: { url: img } });
            });
        }

        const visionResult = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            config: { temperature: 0.5 },
            prompt: visionPromptParts,
            output: { format: 'json', schema: mainOutputSchema }
        });
        
        if (!visionResult.output || !visionResult.output.unifiedAnalysis) {
            throw new Error("Vision analysis failed");
        }
        
        const visionAnalysis = visionResult.output.unifiedAnalysis;
        
        // Ensure OpenAI models have the correct prefix for Genkit
        let modelName = input.model || 'googleai/gemini-2.5-flash';
        if (input.model && !input.model.startsWith('googleai/') && !input.model.startsWith('openai/')) {
             modelName = `openai/${input.model}`;
        }
        
        // Step 2: Reasoning (Update Analysis)
        const updateReasoningPromptText = `You are updating an existing design to match new content.
OCR text from existing image: ${ocrResult}
Visual description of existing image: ${visionAnalysis.visualSummary}
New content provided by the user: ${input.userText || ""}

Summarize what the existing image currently communicates in 2–3 sentences.

Summarize what the new content needs to communicate in 2–3 sentences.

List 3–7 key differences between old and new (focus on message, features, audience, or tone).

From a visual point of view, list which parts of the existing image must be UPDATED to reflect the new content.
CRITICAL: Only update components that logically change based on the new text (e.g., headlines, charts, icons). Preserve layout and style unless the content demands a shift.

List which parts must be PRESERVED (layout, brand colors, general style, key components).

**VISUAL FOCUS**: The image should not contain long sentences or body text. Use only minimal labels (titles, short headings, UI tags) and rely on layout, color, icons, and shapes to communicate information.

Return strict JSON with:
{
"oldSummary": string,
"newSummary": string,
"keyDifferences": string[],
"mustUpdate": string[],
"mustPreserve": string[]
}`;

        const reasoningResult = await ai.generate({
            model: modelName,
            config: getModelConfig(modelName, 0.5),
            prompt: updateReasoningPromptText,
            output: { format: 'json', schema: updateReasoningOutputSchema }
        });
        
        if (!reasoningResult.output) throw new Error("Update reasoning failed");

        const updateAnalysis = reasoningResult.output;
        
        // Merge results
        output = {
            unifiedAnalysis: {
                ...visionAnalysis,
                ...updateAnalysis,
                screenshotMode: 'update_with_new_content' as ScreenshotMode,
                verdict: 'needs_edit' as const,
                transformationSummary: `We will: Keep ${(updateAnalysis.mustPreserve ?? []).slice(0, 3).join(', ')}... Update ${(updateAnalysis.mustUpdate ?? []).slice(0, 3).join(', ')}.`
            },
            promptComponents: visionResult.output.promptComponents // Reuse base components for layout/style
        };

    }
    // Check if the selected model is text-only
    else if (input.model && TEXT_ONLY_MODELS.includes(input.model)) {
      // Step 1: Vision Bridge (Use Gemini to see the image)
      const visionPromptParts: any[] = [
        { text: `You are a senior creative director and AI prompt engineer.
Your task is to analyze a screenshot (and its optional OCR text) to create a fully specified, industry-level image brief.

... (Same prompt as above, truncated for brevity in this logic block, but assume full prompt logic) ...
Input Context:
Image Type: ${input.imageType}
Redesign Mode Preference: ${input.redesignMode}
OCR Text: ${ocrResult}
Include Accessibility Hints: ${input.includeAccessibilityHints}
Image:` },
        { media: { url: input.photoDataUri } }
      ];
       // NOTE: For brevity I'm reusing the logic. In real implementation I should duplicate the full prompt string or make a helper. 
       // To be safe I will construct the prompt parts fully here too.
       
       const visionPromptFullParts: any[] = [
            { text: `You are a senior creative director and AI prompt engineer.
Your task is to analyze a screenshot (and its optional OCR text) to create a fully specified, industry-level image brief.

**Step 1: Unified Analysis (Fusion)**
Analyze the visual screenshot AND any provided OCR text together.
- **Layout Tags**: Identify key structures (e.g., "Sidebar", "Chart", "Login Form", "Hero Section").
- **OCR Context**: Extract 3-5 "ocrKeyPoints" (crucial headings/metrics) that give meaning to the screen.
- **Redesign Mode**: 
  - If user specified 'redesignMode', respect it.
  - If not, default to 'preserve_base' for UI mockups/infographics, or 'full_reimagine' for generic topics.
- **Layout Intent**: Write a 1-sentence "layoutIntent" describing the plan (e.g., "We will keep the sidebar layout but modernize the typography and colors.").

**Step 2: Component Generation (if "Needs Edit")**
Create the 10-part visual specification.
- **Image Type Rules**:
  - **ui_mockup**: 
    - Subject: "High-fidelity UI mockup of [purpose]..."
    - Environment: "Clean device frame / browser window..."
    - Constraints: "No design tool chrome, no tiny illegible text, keep key headings intact."
  - **dashboard**: Mention "sidebar navigation, top bar, main chart area" if detected.
- **Redesign Logic**:
  - **preserve_base**: 'subject' and 'camera_composition' MUST imply strictly keeping the original layout.
  - **light_redesign**: Keep structure but upgrade styling significantly.
  - **full_reimagine**: Use the content ideas but create a fresh composition.

**Step 3: New Features**
1. **Issues Detected**: Identify 2-4 UI/UX flaws in the ORIGINAL image (e.g., "Low contrast text", "Crowded layout", "Inconsistent spacing").
2. **Design Brief**: Summarize the NEW design choices:
   - Primary Color Palette (e.g., "Deep Indigo, Teal Accents")
   - Typography Summary (e.g., "Sans-serif, Bold Headings")
   - Component Style (e.g., "Rounded corners (8px), Flat Design")
3. **Transformation Summary**: A 1-sentence "Before vs After" for a Jira ticket (e.g., "Keeps the sidebar structure but upgrades to a dark SaaS theme with high-contrast data viz.").
4. **Accessibility Hints**: ${input.includeAccessibilityHints ? `
   - CRITICAL: Add specific constraints to 'negative_constraints' or 'quality_realism' to ensure:
     - High contrast text (WCAG AA compliant)
     - Clear visual hierarchy
     - Colorblind-safe charts` : ''}
5. **Multi-Image Context**: ${input.additionalImages ? `
   - The first image is the PRIMARY layout reference.
   - The additional images are STYLE references. Use their colors/vibes but apply them to the primary layout.` : ''}

**CONTENT ACCURACY RULES (Highest Priority):**
1.  **TOPIC FIDELITY**: The generated visual must clearly represent what the screenshot/content is actually about. A viewer should immediately understand the subject from the image alone.
2.  **LABELS FROM CONTENT**: Any text labels, titles, or annotations in the output must come from the actual OCR text or content — never invent abstract or disconnected labels.
3.  **NO ABSTRACT METAPHORS**: Do not replace the actual subject with abstract architectural, geometric, or artistic metaphors that obscure the real topic.

**CRITICAL RULES:**
1.  **OCR USAGE**: Use OCR text to understand *what* the screen is about. Do NOT output long paragraphs of text.
2.  **JSON OUTPUT**: Return the result strictly as a JSON object matching the schema.
3.  **VISUAL FOCUS**: The image should not contain long sentences or body text. Use only minimal labels (titles, short headings, UI tags) and rely on layout, color, icons, and shapes to communicate information.

Input Context:
Image Type: ${input.imageType}
Redesign Mode Preference: ${input.redesignMode}
OCR Text: ${ocrResult}
Include Accessibility Hints: ${input.includeAccessibilityHints}
Image:` },
            { media: { url: input.photoDataUri } }
       ];
       if (input.additionalImages) {
            input.additionalImages.forEach(img => {
                visionPromptFullParts.push({ text: "Style Ref Image:" });
                visionPromptFullParts.push({ media: { url: img } });
            });
       }

      const visionResult = await ai.generate({
        model: 'googleai/gemini-2.5-flash', // Force Gemini for vision
        config: { temperature: 0.5 },
        prompt: visionPromptFullParts,
        output: { format: 'json', schema: mainOutputSchema }
      });
      
      if (!visionResult.output) throw new Error("Vision analysis failed");

      // Step 2: Reasoning Refinement (Use selected text model)
       // Ensure OpenAI models have the correct prefix for Genkit
       const modelName = !input.model ? 'googleai/gemini-2.5-flash' : (input.model.startsWith('openai/') || input.model.startsWith('googleai/') ? input.model : `openai/${input.model}`);

       const refineAnalysisPromptText = `You are a senior creative director and AI prompt engineer.
Your task is to take a raw visual analysis of a screenshot and RE-ENGINEER it into a superior image brief.

**Input Context**:
- **Raw Analysis**: ${JSON.stringify(visionResult.output.unifiedAnalysis)}
- **Target Image Type**: ${input.imageType}
- **Redesign Mode**: ${input.redesignMode}
- **Accessibility**: ${input.includeAccessibilityHints}

**Your Goal**:
1.  **Refine the Analysis**: Improve the "layoutIntent" and "visualGoals" based on the Redesign Mode.
    - If 'light_redesign': Suggest modern spacing, cleaner fonts, but keep the structure.
    - If 'full_reimagine': Propose a bold new layout that preserves the *content* but changes the *form*.
2.  **Generate Prompt Components**: Create the 10-part visual specification (PromptComponents).
    - Ensure 'subject' and 'composition' match the Redesign Mode.
    - Make the 'visualStyle' specific and high-quality.
    - If Accessibility is ON: Explicitly request high contrast and clear hierarchy.
3.  **Generate New Insights**:
    - **Issues Detected**: List 3 flaws in the original concept inferred from the analysis.
    - **Design Brief**: Define the new style (Colors, Type, Components).
    - **Transformation Summary**: A one-line pitch of the upgrade.

**VISUAL FOCUS**: The image should not contain long sentences or body text. Use only minimal labels (titles, short headings, UI tags) and rely on layout, color, icons, and shapes to communicate information.

**CONTENT ACCURACY (Highest Priority):**
- The refined image brief must clearly represent the original screenshot's actual subject matter.
- Labels, titles, and annotations must be derived from the actual content — never invent abstract labels.
- Visual metaphors are fine only if they clearly relate to the topic. Never use abstract architectural or geometric metaphors that obscure the real subject.

**FRESHNESS**: For images with similar topics, vary the visual approach (composition, focal point, layout pattern) so each prompt feels fresh.
- You may be assigned a specific layout pattern (e.g., "central-hub", "two-column", "grid-cards", "radial-apps", "vertical-steps").
- Respect the layout pattern and describe composition accordingly — don't default to a central hero unless explicitly specified.
- Reuse the core content but change how it is visually arranged while keeping the topic recognizable.

**Output**:
Return the refined UnifiedAnalysis and PromptComponents as JSON.`;

       const refinementResult = await ai.generate({
         model: modelName,
         config: getModelConfig(modelName, 0.7),
         prompt: refineAnalysisPromptText,
         output: { format: 'json', schema: refineAnalysisOutputSchema }
       });

      if (!refinementResult.output) throw new Error("Refinement failed");
      output = refinementResult.output;
      
    } else {
      // Standard Single-Step Flow (Multimodal)
      const visionPromptParts: any[] = [
            { text: `You are a senior creative director and AI prompt engineer.
Your task is to analyze a screenshot (and its optional OCR text) to create a fully specified, industry-level image brief.

**Step 1: Unified Analysis (Fusion)**
Analyze the visual screenshot AND any provided OCR text together.
- **Layout Tags**: Identify key structures (e.g., "Sidebar", "Chart", "Login Form", "Hero Section").
- **OCR Context**: Extract 3-5 "ocrKeyPoints" (crucial headings/metrics) that give meaning to the screen.
- **Redesign Mode**: 
  - If user specified 'redesignMode', respect it.
  - If not, default to 'preserve_base' for UI mockups/infographics, or 'full_reimagine' for generic topics.
- **Layout Intent**: Write a 1-sentence "layoutIntent" describing the plan (e.g., "We will keep the sidebar layout but modernize the typography and colors.").

**Step 2: Component Generation (if "Needs Edit")**
Create the 10-part visual specification.
- **Image Type Rules**:
  - **ui_mockup**: 
    - Subject: "High-fidelity UI mockup of [purpose]..."
    - Environment: "Clean device frame / browser window..."
    - Constraints: "No design tool chrome, no tiny illegible text, keep key headings intact."
  - **dashboard**: Mention "sidebar navigation, top bar, main chart area" if detected.
- **Redesign Logic**:
  - **preserve_base**: 'subject' and 'camera_composition' MUST imply strictly keeping the original layout.
  - **light_redesign**: Keep structure but upgrade styling significantly.
  - **full_reimagine**: Use the content ideas but create a fresh composition.

**Step 3: New Features**
1. **Issues Detected**: Identify 2-4 UI/UX flaws in the ORIGINAL image (e.g., "Low contrast text", "Crowded layout", "Inconsistent spacing").
2. **Design Brief**: Summarize the NEW design choices:
   - Primary Color Palette (e.g., "Deep Indigo, Teal Accents")
   - Typography Summary (e.g., "Sans-serif, Bold Headings")
   - Component Style (e.g., "Rounded corners (8px), Flat Design")
3. **Transformation Summary**: A 1-sentence "Before vs After" for a Jira ticket (e.g., "Keeps the sidebar structure but upgrades to a dark SaaS theme with high-contrast data viz.").
4. **Accessibility Hints**: ${input.includeAccessibilityHints ? `
   - CRITICAL: Add specific constraints to 'negative_constraints' or 'quality_realism' to ensure:
     - High contrast text (WCAG AA compliant)
     - Clear visual hierarchy
     - Colorblind-safe charts` : ''}
5. **Multi-Image Context**: ${input.additionalImages ? `
   - The first image is the PRIMARY layout reference.
   - The additional images are STYLE references. Use their colors/vibes but apply them to the primary layout.` : ''}

**CONTENT ACCURACY RULES (Highest Priority):**
1.  **TOPIC FIDELITY**: The generated visual must clearly represent what the screenshot/content is actually about. A viewer should immediately understand the subject from the image alone.
2.  **LABELS FROM CONTENT**: Any text labels, titles, or annotations in the output must come from the actual OCR text or content — never invent abstract or disconnected labels.
3.  **NO ABSTRACT METAPHORS**: Do not replace the actual subject with abstract architectural, geometric, or artistic metaphors that obscure the real topic.

**CRITICAL RULES:**
1.  **OCR USAGE**: Use OCR text to understand *what* the screen is about. Do NOT output long paragraphs of text.
2.  **JSON OUTPUT**: Return the result strictly as a JSON object matching the schema.
3.  **VISUAL FOCUS**: The image should not contain long sentences or body text. Use only minimal labels (titles, short headings, UI tags) and rely on layout, color, icons, and shapes to communicate information.

Input Context:
Image Type: ${input.imageType}
Redesign Mode Preference: ${input.redesignMode}
OCR Text: ${ocrResult}
Include Accessibility Hints: ${input.includeAccessibilityHints}
Image:` },
            { media: { url: input.photoDataUri } }
       ];
       if (input.additionalImages) {
            input.additionalImages.forEach(img => {
                visionPromptParts.push({ text: "Style Ref Image:" });
                visionPromptParts.push({ media: { url: img } });
            });
       }

      // Always use Gemini for vision (NVIDIA models don't support multimodal/image input)
      const visionModel = 'googleai/gemini-2.5-flash';
      const result = await ai.generate({
        model: visionModel,
        config: { temperature: 0.5 },
        prompt: visionPromptParts,
        output: { format: 'json', schema: mainOutputSchema }
      });

      // If user selected a non-Gemini model, use it for refinement
      if (input.model && isNvidiaModel(input.model) && result.output) {
        const refinePrompt = `You are a senior creative director. Refine and enhance this image brief analysis.

**Raw Analysis**: ${JSON.stringify(result.output.unifiedAnalysis)}
**Raw Components**: ${JSON.stringify(result.output.promptComponents)}
**Target Image Type**: ${input.imageType}

Improve the visual specificity and coherence while maintaining clear connection to the original content topic. Make the prompt components more vivid and detailed, but keep labels and subject matter true to what the screenshot actually shows.
Return the refined UnifiedAnalysis and PromptComponents as JSON.`;

        try {
          const refined = await ai.generate({
            model: input.model,
            config: getModelConfig(input.model, 0.7),
            prompt: refinePrompt,
            output: { format: 'json', schema: refineAnalysisOutputSchema }
          });
          if (refined.output) {
            output = refined.output;
          } else {
            console.warn("NVIDIA refinement returned null, using Gemini result");
            output = result.output;
          }
        } catch (refineErr) {
          console.warn("NVIDIA refinement failed, using Gemini result:", refineErr);
          output = result.output;
        }
      } else {
        output = result.output;
      }
    }

    if (!output) throw new Error("Failed to generate analysis");

    // Apply Image Type Blueprint if applicable
    if (input.imageType && output.promptComponents) {
        output.promptComponents = applyImageTypeBlueprint(output.promptComponents, input.imageType as ImageType);
    }

    // CLAMP & SANITIZE FOR UPDATE MODE
    // If this is an update flow, we must clamp the components before they hit the generator
    if (input.mode === 'update_with_new_content' && output.promptComponents) {
        // We import these dynamically or use the helpers if they were exported. 
        // Since sanitize/clamp are local to prompt-generator, we rely on the prompt generator's internal sanitization pass 
        // which we just added (sanitizeForVisualFocus + clampComponentTextForImage).
        // However, we can also do a quick pre-pass here if needed, but the generator handles it now.
    }

    let detailedPrompts = undefined;
    let parameters = undefined;
    let qualityMetrics = undefined;
    let newImagePrompt = undefined;
    let variants = undefined;
    let debugInfo = undefined;
    let masterPrompt = undefined;
    let sanityPreview = undefined;

    if (output.unifiedAnalysis.verdict === "needs_edit" && output.promptComponents) {
      
      // Conflict Resolution
      output.promptComponents = await detectAndResolveConflicts(output.promptComponents);

      const userOptions: UserPromptOptions = {
            imageType: input.imageType as ImageType,
            glossLevel: input.glossLevel as any,
            redesignMode: input.redesignMode,
            includeAccessibilityHints: input.includeAccessibilityHints,
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

      // Apply Color Theme
      output.promptComponents = applyColorThemeToComponents(output.promptComponents, userOptions);

      // Step 3: Generate enhanced prompts with quality scoring and variants
      const enhancedOutput = generateEnhancedPrompts(
        output.promptComponents,
        {
            contentType: output.unifiedAnalysis.intent || 'general',
            tone: output.unifiedAnalysis.tone || 'professional',
            keywords: output.unifiedAnalysis.keyPoints || [],
            imageType: input.imageType as ImageType,
            analysis: output.unifiedAnalysis as UnifiedAnalysis,
            userOptions: userOptions
        }
      );

      detailedPrompts = {
        midjourney: enhancedOutput.midjourney.prompt,
        dalle: enhancedOutput.dalle.prompt,
        stableDiffusion: enhancedOutput.stableDiffusion.prompt,
        flux: enhancedOutput.flux.prompt
      };
      
      // Override master prompt with the new robust builder
      masterPrompt = enhancedOutput.masterPrompt;

      // Sanity Preview
      sanityPreview = await generateSanityPreview(masterPrompt, output.unifiedAnalysis.contentSummary || input.ocrText);

      parameters = {
        midjourney: enhancedOutput.midjourney.parameters,
        dalle: enhancedOutput.dalle.parameters,
        stableDiffusion: enhancedOutput.stableDiffusion.parameters
      };

      qualityMetrics = {
        overallScore: enhancedOutput.midjourney.qualityScore,
        rating: enhancedOutput.metadata.overallQualityRating,
        suggestions: enhancedOutput.metadata.suggestions,
        suggestedAspectRatio: enhancedOutput.metadata.suggestedAspectRatio
      };

      newImagePrompt = enhancedOutput.midjourney.prompt;
      variants = enhancedOutput.variants;
      debugInfo = {
          sanityPreview,
          styleProfile: enhancedOutput.debugInfo?.styleProfile || "default",
          intent: enhancedOutput.debugInfo?.intent || "general",
          lengthMode: enhancedOutput.debugInfo?.lengthMode || "default",
          appliedRules: enhancedOutput.debugInfo?.appliedRules || [],
          layoutPattern: output.unifiedAnalysis.layoutDescription,
          glossLevel: input.glossLevel,
          finalPromptLength: masterPrompt?.length || 0
      };
    }

    return {
      verdict: (output.unifiedAnalysis.verdict === 'needs_edit' ? 'Needs Edit' : 'Perfect') as "Needs Edit" | "Perfect",
      analysis: output.unifiedAnalysis.contentSummary, // Map summary to analysis field for backward compatibility
      promptComponents: output.promptComponents,
      detectedLayoutElements: output.unifiedAnalysis.detectedLayoutElements,
      ocrKeyPoints: output.unifiedAnalysis.ocrKeyPoints,
      layoutIntent: output.unifiedAnalysis.layoutIntent,
      newImagePrompt,
      detailedPrompts,
      masterPrompt,
      parameters,
      qualityMetrics,
      variants,
      debugInfo,
      
      // New Output Fields
      issuesDetected: output.unifiedAnalysis.issuesDetected,
      designBrief: output.unifiedAnalysis.designBrief,
      transformationSummary: output.unifiedAnalysis.transformationSummary
    };
}

const generateImagePromptsFromScreenshotFlow = ai.defineFlow(
  {
    name: 'generateImagePromptsFromScreenshotFlow',
    inputSchema: GenerateImagePromptsFromScreenshotInputSchema,
    outputSchema: GenerateImagePromptsFromScreenshotOutputSchema,
  },
  async input => {
    // Clean OCR Text
    const ocrResult = await cleanOCRText(input.ocrText || "");
    
    let output;

    if (input.mode === 'update_with_new_content') {
        // Step 1: Vision Analysis (using Gemini or other vision model)
        // We reuse the main prompt to get the visual structure
        const visionResult = await prompt({ ...input, ocrText: ocrResult }, {
            model: 'googleai/gemini-2.5-flash', // Force vision model
            config: { temperature: 0.5 }
        });
        
        if (!visionResult.output || !visionResult.output.unifiedAnalysis) {
            throw new Error("Vision analysis failed");
        }
        
        const visionAnalysis = visionResult.output.unifiedAnalysis;
        
        // Ensure OpenAI models have the correct prefix for Genkit
        let modelName = input.model || 'googleai/gemini-2.5-flash';
        if (input.model && !input.model.startsWith('googleai/') && !input.model.startsWith('openai/')) {
             modelName = `openai/${input.model}`;
        }
        
        // Step 2: Reasoning (Update Analysis)
        const reasoningResult = await updateReasoningPrompt({
            ocrText: ocrResult,
            visualSummary: visionAnalysis.visualSummary,
            userNewContent: input.userText || ""
        }, {
            model: modelName,
            config: getModelConfig(modelName, 0.5)
        });
        
        if (!reasoningResult.output) throw new Error("Update reasoning failed");

        const updateAnalysis = reasoningResult.output;
        
        // Merge results
        output = {
            unifiedAnalysis: {
                ...visionAnalysis,
                ...updateAnalysis,
                screenshotMode: 'update_with_new_content' as ScreenshotMode,
                verdict: 'needs_edit' as const,
                transformationSummary: `We will: Keep ${(updateAnalysis.mustPreserve ?? []).slice(0, 3).join(', ')}... Update ${(updateAnalysis.mustUpdate ?? []).slice(0, 3).join(', ')}.`
            },
            promptComponents: visionResult.output.promptComponents // Reuse base components for layout/style
        };

    }
    // Check if the selected model is text-only
    else if (input.model && TEXT_ONLY_MODELS.includes(input.model)) {
      // Step 1: Vision Bridge (Use Gemini to see the image)
      const visionResult = await prompt({ ...input, ocrText: ocrResult }, {
        model: 'googleai/gemini-2.5-flash', // Force Gemini for vision
        config: { temperature: 0.5 }
      });
      
      if (!visionResult.output) throw new Error("Vision analysis failed");

      // Step 2: Reasoning Refinement (Use selected text model)
       // Ensure OpenAI models have the correct prefix for Genkit
       const modelName = !input.model ? 'googleai/gemini-2.5-flash' : (input.model.startsWith('openai/') || input.model.startsWith('googleai/') ? input.model : `openai/${input.model}`);

       const refinementResult = await refineAnalysisPrompt({
         analysisContext: JSON.stringify(visionResult.output.unifiedAnalysis),
         imageType: input.imageType,
         redesignMode: input.redesignMode,
         includeAccessibilityHints: input.includeAccessibilityHints
       }, {
         model: modelName,
         config: getModelConfig(modelName, 0.7)
       });

      if (!refinementResult.output) throw new Error("Refinement failed");
      output = refinementResult.output;
      
    } else {
      // Standard Single-Step Flow (Multimodal)
      const result = await prompt({ ...input, ocrText: ocrResult }, {
        model: input.model || undefined,
        config: getModelConfig(input.model, 0.5)
      });
      output = result.output;
    }

    if (!output) throw new Error("Failed to generate analysis");

    // Apply Image Type Blueprint if applicable
    if (input.imageType && output.promptComponents) {
        output.promptComponents = applyImageTypeBlueprint(output.promptComponents, input.imageType as ImageType);
    }

    // CLAMP & SANITIZE FOR UPDATE MODE
    // If this is an update flow, we must clamp the components before they hit the generator
    if (input.mode === 'update_with_new_content' && output.promptComponents) {
        // We import these dynamically or use the helpers if they were exported. 
        // Since sanitize/clamp are local to prompt-generator, we rely on the prompt generator's internal sanitization pass 
        // which we just added (sanitizeForVisualFocus + clampComponentTextForImage).
        // However, we can also do a quick pre-pass here if needed, but the generator handles it now.
    }

    let detailedPrompts = undefined;
    let parameters = undefined;
    let qualityMetrics = undefined;
    let newImagePrompt = undefined;
    let variants = undefined;
    let debugInfo = undefined;
    let masterPrompt = undefined;
    let sanityPreview = undefined;

// Inside generateImagePromptsFromScreenshotFlow
    if (output.unifiedAnalysis.verdict === "needs_edit" && output.promptComponents) {
      
      // Conflict Resolution
      output.promptComponents = await detectAndResolveConflicts(output.promptComponents);

      const userOptions: UserPromptOptions = {
            imageType: input.imageType as ImageType,
            glossLevel: input.glossLevel as any,
            redesignMode: input.redesignMode,
            includeAccessibilityHints: input.includeAccessibilityHints,
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

      // Apply Color Theme
      output.promptComponents = applyColorThemeToComponents(output.promptComponents, userOptions);

      // Step 3: Generate enhanced prompts with quality scoring and variants
      const enhancedOutput = generateEnhancedPrompts(
        output.promptComponents,
        {
            contentType: output.unifiedAnalysis.intent || 'general',
            tone: output.unifiedAnalysis.tone || 'professional',
            keywords: output.unifiedAnalysis.keyPoints || [],
            imageType: input.imageType as ImageType,
            analysis: output.unifiedAnalysis as UnifiedAnalysis,
            userOptions: userOptions
        }
      );

      detailedPrompts = {
        midjourney: enhancedOutput.midjourney.prompt,
        dalle: enhancedOutput.dalle.prompt,
        stableDiffusion: enhancedOutput.stableDiffusion.prompt,
        flux: enhancedOutput.flux.prompt
      };
      
      // Override master prompt with the new robust builder
      masterPrompt = enhancedOutput.masterPrompt;

      // Sanity Preview
      sanityPreview = await generateSanityPreview(masterPrompt, output.unifiedAnalysis.contentSummary || input.ocrText);

      parameters = {
        midjourney: enhancedOutput.midjourney.parameters,
        dalle: enhancedOutput.dalle.parameters,
        stableDiffusion: enhancedOutput.stableDiffusion.parameters
      };

      qualityMetrics = {
        overallScore: enhancedOutput.midjourney.qualityScore,
        rating: enhancedOutput.metadata.overallQualityRating,
        suggestions: enhancedOutput.metadata.suggestions,
        suggestedAspectRatio: enhancedOutput.metadata.suggestedAspectRatio
      };

      newImagePrompt = enhancedOutput.midjourney.prompt;
      variants = enhancedOutput.variants;
      debugInfo = {
          sanityPreview,
          styleProfile: enhancedOutput.debugInfo?.styleProfile || "default",
          intent: enhancedOutput.debugInfo?.intent || "general",
          lengthMode: enhancedOutput.debugInfo?.lengthMode || "default",
          appliedRules: enhancedOutput.debugInfo?.appliedRules || [],
          layoutPattern: output.unifiedAnalysis.layoutDescription,
          glossLevel: input.glossLevel,
          finalPromptLength: masterPrompt?.length || 0
      };
    }

    return {
      verdict: (output.unifiedAnalysis.verdict === 'needs_edit' ? 'Needs Edit' : 'Perfect') as "Needs Edit" | "Perfect",
      analysis: output.unifiedAnalysis.contentSummary, // Map summary to analysis field for backward compatibility
      promptComponents: output.promptComponents,
      detectedLayoutElements: output.unifiedAnalysis.detectedLayoutElements,
      ocrKeyPoints: output.unifiedAnalysis.ocrKeyPoints,
      layoutIntent: output.unifiedAnalysis.layoutIntent,
      newImagePrompt,
      detailedPrompts,
      masterPrompt,
      parameters,
      qualityMetrics,
      variants,
      debugInfo,
      
      // New Output Fields
      issuesDetected: output.unifiedAnalysis.issuesDetected,
      designBrief: output.unifiedAnalysis.designBrief,
      transformationSummary: output.unifiedAnalysis.transformationSummary
    };
  }
);
