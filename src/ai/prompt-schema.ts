
import { z } from 'genkit';

const FORBIDDEN_WORDS = ['nice', 'good', 'cool', 'beautiful', 'awesome', 'bad', 'great'];

const validatedString = (minLength: number, description: string) => 
    z.string()
    .min(minLength, { message: `Must be at least ${minLength} characters.` })
    .refine(val => !FORBIDDEN_WORDS.some(word => val.toLowerCase().includes(` ${word} `) || val.toLowerCase() === word), {
        message: "Generic adjectives (nice, good, cool) are forbidden. Use concrete visual descriptors."
    })
    .describe(description);

export const PromptComponentsSchema = z.object({
    subject: validatedString(20, 'Main focus with 2-4 concrete characteristics (e.g., "frosted glass bottle", "middle-aged mechanic").'),
    action_context: validatedString(15, 'What the subject is doing and the specific purpose of the scene.'),
    environment: validatedString(15, 'Specific location, time of day, and surrounding elements.'),
    mood_story: validatedString(10, 'Emotion and implied narrative (e.g., "melancholic solitude", "energetic collaboration").'),
    visual_style: validatedString(15, 'Specific artistic medium, era, and influences (e.g., "Bauhaus graphic design", "Kodak Portra 400 photography").'),
    lighting_color: validatedString(15, 'Precise lighting type, direction, and color palette/grading.'),
    camera_composition: validatedString(15, 'Lens details (mm), shot type, angle, framing, and depth of field.'),
    detail_texture: validatedString(10, 'Specific materials, surface details, and tactile cues.'),
    quality_realism: validatedString(10, 'Technical quality keywords (e.g., "8k resolution", "octane render").'),
    negative_constraints: z.string().describe('Elements to explicitly avoid (artifacts, text, blur).'), // Negative constraints can be shorter or empty initially
});

export type PromptComponents = z.infer<typeof PromptComponentsSchema>;

export type LengthMode = 'compact' | 'balanced' | 'rich';

export type RedesignMode = 'preserve_base' | 'light_redesign' | 'full_reimagine';

export type ScreenshotMode = 'improve_only' | 'update_with_new_content';

export type ColorThemeId = 
  | 'auto' 
  | 'preset' 
  | 'custom'; 

export type PresetColorTheme = 
  | 'light_neutral' 
  | 'dark_saas' 
  | 'warm_organic' 
  | 'cyber_blue' 
  | 'pastel_playful' 
  | 'high_contrast';

export interface CustomColorStop {
  hex?: string;            // #0F172A (optional)
  name?: string;           // "deep navy"
  role?: 'background' | 'primary' | 'accent' | 'text' | 'neutral';
}

export interface CustomColorTheme {
  label?: string;          // "My brand palette"
  mainMood?: string;       // "calm, premium", "playful", etc.
  stops: CustomColorStop[]; // 2–6 items
}

export type GlossLevel = 'matte' | 'soft-glow' | 'glassmorphism';

export interface UserPromptOptions {
  imageType: ImageType;
  glossLevel?: GlossLevel;
  aspectPreference?: '16:9' | '9:16' | '1:1';
  stylePreference?: string;
  redesignMode?: RedesignMode;
  includeAccessibilityHints?: boolean;
  colorThemeMode?: ColorThemeId;     // auto | preset | custom
  presetColorThemeId?: PresetColorTheme; // only if mode = 'preset'
  customColorDescription?: string;   // Deprecated in favor of customColorTheme, but kept for backward compat or simple text
  customColorTheme?: CustomColorTheme; // NEW structured theme
} 

export type ImageType = 
  | 'character' 
  | 'infographic' 
  | 'ui_mockup' 
  | 'scene_illustration' 
  | 'abstract_visual' 
  | 'product_render' 
  | 'icon_or_sticker' 
  | 'data_viz';

export enum Platform {
    Midjourney = 'midjourney',
    Dalle = 'dalle',
    StableDiffusion = 'stable_diffusion',
    Flux = 'flux',
    Classic = 'classic',
}

export interface UnifiedAnalysis {
  // raw
  userText?: string;          // original text input
  ocrText?: string;           // text extracted from screenshot (if any)
  combinedText: string;       // merged userText + ocrText

  // LLM-derived
  contentSummary: string;     // 2–3 sentences
  keyPoints: string[];        // bullet-level key ideas
  tone: string;               // "professional, friendly"
  intent: string;             // "blog_hero", "feature_illustration", etc.
  audience: string;           // "B2B SaaS founders"

  // image analysis
  visualSummary: string;      // 1–2 sentences of what’s visible
  layoutDescription: string;  // "dashboard layout with sidebar + main chart"
  uiElements: string[];       // "navbar, cards, charts"
  keepStructure: boolean;     // preserve-base or not
  redesignMode?: RedesignMode; // 'preserve_base', 'light_redesign', 'full_reimagine'
  verdict: 'perfect' | 'needs_edit';

  // relevance & goals
  alignmentNotes: string;     // "missing eco-friendly visuals"
  visualGoals: string;        // "dark mode SaaS, premium"
  brandStyle: string;         // "clean B2B SaaS"
  aspectRatioSuggestion: string;

  // Layout & OCR Fusion
  detectedLayoutElements?: string[]; // e.g., ["Sidebar", "Login Form", "Bar Chart"]
  ocrKeyPoints?: string[];           // e.g., ["Q3 Revenue", "$1.2M", "Growth"]
  layoutIntent?: string;             // e.g., "We will keep the sidebar but modernize the typography."

  // New Visual Anchors (Task 1)
  visual_anchor?: string;      // 1-2 sentences concrete scene (Made optional via Zod if needed, but here defined as string. In flow schema we can make it optional)
  alt_anchors?: { anchor: string; type: string }[]; // Alternatives tagged by type

  // Sanity Preview (Task 5)
  sanity_preview?: string;    // Plain language description of the result

  // Update Mode Fields
  screenshotMode?: ScreenshotMode;
  oldSummary?: string;
  newSummary?: string;
  keyDifferences?: string[];
  mustUpdate?: string[];
  mustPreserve?: string[];

  // Feature 2, 3, 4: New Output Fields
  issuesDetected?: string[]; // e.g., ["Low contrast text", "Inconsistent spacing"]
  designBrief?: {
    primaryColorPalette: string;
    typographySummary: string;
    componentStyle: string;
  };
  transformationSummary?: string; // "Before vs After" explanation
}

export interface UnifiedContext {
  // From text analysis
  analysis: UnifiedAnalysis;

  // User Options
  userOptions?: UserPromptOptions;

  // 10-part framework components (post-processed)
  components: {
    subject: string;
    action_context: string; // Renamed from action
    environment: string;
    mood_story: string; // Renamed from mood
    visual_style: string; // Renamed from visualStyle
    lighting_color: string; // Renamed from lighting
    camera_composition: string; // Renamed from camera
    detail_texture: string; // Renamed from detail
    quality_realism: string; // Renamed from quality
    negative_constraints: string; // Renamed from constraints
  };
}
