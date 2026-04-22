/**
 * Enhanced prompt generator with intelligent formatting
 * Integrates component generators, formatters, and quality scoring
 */

import { PromptComponents, LengthMode, UnifiedAnalysis, ImageType, UserPromptOptions } from './prompt-schema';
import { componentGenerator } from './utils/component-generators';
import { platformFormatter, PlatformType } from './utils/platform-formatters';
import { qualityScorer } from './utils/quality-scorer';
import { BrandStyle } from './utils/style-profiles';
import { PromptIntent } from './utils/intent-patterns';
import { buildMasterPrompt } from './utils/master-prompt';
import { resolveStyleConflicts } from './utils/conflict-resolver';
import {
  pickLayoutPattern,
  applyLayoutPattern,
  applyModernBaseline,
  applyGlossLevel,
  LayoutPattern
} from './utils/layout-orchestrator';
import { generateVariantProfiles, FreshnessProfile } from './utils/freshness-engine';

function pickVariant<T>(seed: string, choices: T[]): T {
  const hash = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  return choices[hash % choices.length];
}

function sanitizeForVisualFocus(text: string): string {
  if (!text) return text;
  return text
    .replace(/write the text/gi, 'visually represent')
    .replace(/include the following text.*$/gi, '')
    .replace(/paragraph/gi, 'section')
    .replace(/bullet points/gi, 'simple icons or cards')
    .replace(/copy/gi, 'visual elements');
}

function clampComponentTextForImage(components: PromptComponents): PromptComponents {
  /** Truncate at last word boundary before maxChars */
  const clamp = (text: string, maxChars: number) => {
    if (!text || text.length <= maxChars) return text;
    const trimmed = text.slice(0, maxChars);
    const lastSpace = trimmed.lastIndexOf(' ');
    return lastSpace > maxChars * 0.4 ? trimmed.slice(0, lastSpace) : trimmed;
  };

  return {
    ...components,
    subject: clamp(components.subject, 160),
    environment: clamp(components.environment, 160),
    mood_story: clamp(components.mood_story, 120),
    visual_style: clamp(components.visual_style, 140),
    lighting_color: clamp(components.lighting_color, 120),
    camera_composition: clamp(components.camera_composition, 120),
    detail_texture: clamp(components.detail_texture, 140),
    action_context: components.action_context?.replace(/\".+?\"/g, '"short label"') ?? components.action_context,
  };
}

function sanitizeComponent(text: string): string {
  if (!text) return text;
  const banned = ['nice', 'good', 'beautiful', 'great', 'amazing', 'awesome'];
  let t = text;

  for (const w of banned) {
    t = t.replace(new RegExp(`\\b${w}\\b`, 'gi'), '');
  }

  // Collapse double spaces
  return t.replace(/\s+/g, ' ').trim();
}

export interface PromptVariant {
  name: string;
  prompts: {
    midjourney: string;
    dalle: string;
    stableDiffusion: string;
    flux: string;
  };
}

export interface EnhancedPromptOutput {
  midjourney: {
    prompt: string;
    parameters: Record<string, any>;
    qualityScore: number;
  };
  dalle: {
    prompt: string;
    parameters: Record<string, any>;
    qualityScore: number;
  };
  stableDiffusion: {
    prompt: string;
    negativePrompt: string;
    parameters: Record<string, any>;
    qualityScore: number;
  };
  flux: {
    prompt: string;
    parameters: Record<string, any>;
    qualityScore: number;
  };
  masterPrompt: string; // Universal prompt
  variants?: PromptVariant[];
  debugInfo?: {
    styleProfile: string;
    intent: string;
    lengthMode: string;
    appliedRules: string[];
    layoutPattern?: string;
    glossLevel?: string;
    finalPromptLength?: number;
  };
  metadata: {
    suggestedAspectRatio: string;
    complexity: number;
    overallQualityRating: string;
    suggestions: string[];
  };
}

/**
 * Generate platform-specific prompts with quality scoring
 */
export class PromptGenerator {
  static generateEnhancedPrompts(
    components: PromptComponents,
    context: {
      contentType: string;
      tone: string;
      keywords: string[];
      style?: BrandStyle;
      intent?: PromptIntent;
      lengthMode?: LengthMode;
      analysis?: UnifiedAnalysis;
      imageType?: ImageType;
      userOptions?: UserPromptOptions;
      forcedLayoutPattern?: LayoutPattern;
    }
  ): EnhancedPromptOutput {
    // Enhance components with intelligent post-processing
    let enhancedComponents: PromptComponents = {
      subject: componentGenerator.enhanceSubject(components.subject, {
        keywords: context.keywords,
        entities: [],
        tone: context.tone,
        style: context.style,
        intent: context.intent
      }),
      action_context: components.action_context,
      environment: componentGenerator.enhanceEnvironment(components.environment, {
        contentType: context.contentType,
        tone: context.tone,
        hasTimeReference: components.lighting_color?.toLowerCase().includes('hour') || false,
        style: context.style
      }),
      mood_story: components.mood_story,
      visual_style: components.visual_style,
      lighting_color: componentGenerator.enhanceLighting(components.lighting_color, {
        mood: components.mood_story,
        visualStyle: components.visual_style,
        style: context.style
      }),
      camera_composition: componentGenerator.enhanceCamera(components.camera_composition, {
        contentType: context.contentType,
        tone: context.tone,
        intent: context.intent
      }),
      detail_texture: components.detail_texture,
      quality_realism: components.quality_realism || 'high quality, professional grade, sharp focus, 4K resolution',
      negative_constraints: componentGenerator.generateNegativePrompts({
        visualStyle: components.visual_style,
        mood: components.mood_story,
        contentType: context.contentType,
        tone: context.tone,
        style: context.style
      })
    };

    // Conflict Resolution
    enhancedComponents = resolveStyleConflicts(enhancedComponents);

    // Apply Layout Orchestration (New Centralized Engine)
    // Seed based on subject + action
    const seed = (enhancedComponents.subject || '') + (enhancedComponents.action_context || '');
    
    // 1. Enforce Modern Baseline Style
    enhancedComponents = applyModernBaseline(enhancedComponents, context.style || 'none');

    // 2. Pick and Apply Layout Pattern
    let layoutPattern: LayoutPattern | undefined;
    if (context.imageType) {
        layoutPattern = context.forcedLayoutPattern || pickLayoutPattern(
            context.imageType, 
            context.intent || 'general', 
            seed
        );
        
        enhancedComponents = applyLayoutPattern(
            enhancedComponents, 
            context.imageType, 
            layoutPattern
        );
        
        if (process.env.NODE_ENV === 'development') {
            console.log('LAYOUT_DEBUG', {
                imageType: context.imageType,
                intent: context.intent,
                pattern: layoutPattern,
                forced: !!context.forcedLayoutPattern
            });
        }
    }

    // Apply Gloss Level
    const glossLevel = context.userOptions?.glossLevel || 'soft-glow';
    enhancedComponents = applyGlossLevel(enhancedComponents, glossLevel);

    // De-vagueness pass
    enhancedComponents.subject = sanitizeForVisualFocus(sanitizeComponent(enhancedComponents.subject));
    enhancedComponents.action_context = sanitizeForVisualFocus(sanitizeComponent(enhancedComponents.action_context));
    enhancedComponents.environment = sanitizeForVisualFocus(sanitizeComponent(enhancedComponents.environment));
    enhancedComponents.visual_style = sanitizeForVisualFocus(sanitizeComponent(enhancedComponents.visual_style));
    enhancedComponents.mood_story = sanitizeForVisualFocus(sanitizeComponent(enhancedComponents.mood_story));
    enhancedComponents.detail_texture = sanitizeForVisualFocus(sanitizeComponent(enhancedComponents.detail_texture));

    // Global Clamping
    enhancedComponents = clampComponentTextForImage(enhancedComponents);

    // Ensure minimal defaults to avoid completeness penalties
    if (!enhancedComponents.detail_texture || enhancedComponents.detail_texture.length < 10) {
      enhancedComponents.detail_texture = 'clean, crisp details without visual clutter';
    }
    
    if (!enhancedComponents.camera_composition || enhancedComponents.camera_composition.length < 10) {
      enhancedComponents.camera_composition = 'balanced composition with a clear focal point';
    }
    
    if (!enhancedComponents.negative_constraints || enhancedComponents.negative_constraints.length < 10) {
      enhancedComponents.negative_constraints = 'no blurriness, no distortion, no watermarks';
    }

    // Format for each platform (Primary Variant - Safe/On-Brand)
    const platforms: PlatformType[] = ['midjourney', 'dalle', 'stable-diffusion', 'flux'];
    const formattedPrompts: Record<string, any> = {};

    for (const platform of platforms) {
      const formatted = platformFormatter.format(platform, enhancedComponents, {
        contentType: context.contentType,
        tone: context.tone,
        lengthMode: context.lengthMode || 'balanced',
        imageType: context.imageType
      });

      const quality = qualityScorer.scorePrompt(enhancedComponents, formatted.prompt);

      if (process.env.NODE_ENV === 'development') {
        console.log('QUALITY_DEBUG', {
          platform: platform,
          completeness: quality.breakdown.completeness,
          specificity: quality.breakdown.specificity,
          coherence: quality.breakdown.coherence,
          length: quality.breakdown.lengthOptimization,
          overall: quality.overall,
        });
      }

      formattedPrompts[platform] = {
        prompt: formatted.prompt,
        negativePrompt: formatted.negativePrompt,
        parameters: formatted.parameters,
        qualityScore: quality.overall
      };
    }

    // Generate Variants with truly different creative directions
    const variants: PromptVariant[] = [];

    // Helper to map keys
    const mapKeys = (prompts: Record<string, string>) => ({
        midjourney: prompts['midjourney'],
        dalle: prompts['dalle'],
        stableDiffusion: prompts['stable-diffusion'],
        flux: prompts['flux']
    });

    // Get 3 distinct freshness profiles for variants
    const variantProfiles = generateVariantProfiles();

    // Helper: apply a freshness profile to create a genuinely different variant
    // IMPORTANT: Keep subject and core environment intact — only vary style, lighting, and camera
    // This ensures variants still represent the same content topic
    const buildVariantComponents = (base: PromptComponents, profile: FreshnessProfile): PromptComponents => {
      const v = { ...base };
      // Blend art direction with existing style (don't replace entirely)
      v.visual_style = `${profile.artDirection}, ${(v.visual_style || '').split(',').slice(0, 2).join(',')}`.trim();
      // Blend lighting (keep base color context, add profile mood)
      v.lighting_color = `${profile.lightingMood}, ${profile.colorMood}`;
      // Use profile camera approach
      v.camera_composition = profile.cameraApproach;
      // Keep the original environment intact — don't inject unrelated visual metaphors
      // Only add the metaphor if the environment is very short/generic
      if (!v.environment || v.environment.length < 30) {
        v.environment = `${profile.visualMetaphor}, ${(v.environment || '')}`.trim();
      }
      return v;
    };

    // Variant B: Bold & Cinematic
    const variantB = buildVariantComponents(enhancedComponents, variantProfiles[0]);
    variantB.mood_story = `cinematic intensity, ${enhancedComponents.mood_story || 'dramatic atmosphere'}`;
    const variantBPrompts: Record<string, string> = {};
    for (const p of platforms) variantBPrompts[p] = platformFormatter.format(p, variantB, { ...context, lengthMode: 'rich' as LengthMode }).prompt;
    variants.push({ name: 'Variant B – Bold & Cinematic', prompts: mapKeys(variantBPrompts) });

    // Variant C: Minimal & Abstract
    const variantC = buildVariantComponents(enhancedComponents, variantProfiles[1]);
    variantC.mood_story = `serene minimalism, ${enhancedComponents.mood_story || 'quiet elegance'}`;
    variantC.detail_texture = 'clean geometric shapes, flat matte surfaces, precise edges';
    const variantCPrompts: Record<string, string> = {};
    for (const p of platforms) variantCPrompts[p] = platformFormatter.format(p, variantC, { ...context, lengthMode: 'compact' as LengthMode }).prompt;
    variants.push({ name: 'Variant C – Minimal & Abstract', prompts: mapKeys(variantCPrompts) });

    // Add Primary as Variant A for completeness in UI if needed, though usually main display is separate
    const safePrompts: Record<string, string> = {};
    for (const p of platforms) safePrompts[p] = formattedPrompts[p].prompt;
    variants.unshift({ name: 'Variant A – Safe/On-Brand', prompts: mapKeys(safePrompts) });


    // Calculate metadata
    const aspectRatio = componentGenerator.determineAspectRatio({
      contentType: context.contentType,
      platform: 'midjourney',
      intent: context.intent
    });

    const complexity = componentGenerator.assessComplexity(enhancedComponents);

    // Get overall quality assessment (use Midjourney as reference)
    const midjourneyQuality = qualityScorer.scorePrompt(
      enhancedComponents,
      formattedPrompts['midjourney'].prompt
    );

    // Generate Master Prompt
    // Construct a UnifiedContext from available data
    if (!context.analysis) {
        throw new Error('Analysis is required for prompt generation');
    }

    const unifiedContext = {
      analysis: context.analysis,
      userOptions: {
          imageType: context.imageType || 'scene_illustration',
      },
      components: enhancedComponents,
    };
    
    const masterPrompt = buildMasterPrompt(unifiedContext);

    return {
      midjourney: {
        prompt: formattedPrompts['midjourney'].prompt,
        parameters: formattedPrompts['midjourney'].parameters,
        qualityScore: formattedPrompts['midjourney'].qualityScore
      },
      dalle: {
        prompt: formattedPrompts['dalle'].prompt,
        parameters: formattedPrompts['dalle'].parameters,
        qualityScore: formattedPrompts['dalle'].qualityScore
      },
      stableDiffusion: {
        prompt: formattedPrompts['stable-diffusion'].prompt,
        negativePrompt: formattedPrompts['stable-diffusion'].negativePrompt || '',
        parameters: formattedPrompts['stable-diffusion'].parameters,
        qualityScore: formattedPrompts['stable-diffusion'].qualityScore
      },
      flux: {
        prompt: formattedPrompts['flux'].prompt,
        parameters: formattedPrompts['flux'].parameters,
        qualityScore: formattedPrompts['flux'].qualityScore
      },
      masterPrompt,
      variants,
      debugInfo: {
          styleProfile: context.style || 'none',
          intent: context.intent || 'general',
          lengthMode: context.lengthMode || 'balanced',
          layoutPattern: layoutPattern,
          glossLevel: glossLevel,
          finalPromptLength: masterPrompt.length,
          appliedRules: [
              context.style ? `Applied style: ${context.style}` : '',
              context.intent ? `Applied intent: ${context.intent}` : '',
              `Aspect Ratio: ${aspectRatio}`
          ].filter(Boolean)
      },
      metadata: {
        suggestedAspectRatio: aspectRatio,
        complexity,
        overallQualityRating: midjourneyQuality.rating,
        suggestions: midjourneyQuality.suggestions
      }
    };
  }

  // Keep existing functions for backward compatibility
  static generateAll(components: PromptComponents) {
    const context = {
        contentType: 'general',
        tone: 'professional',
        keywords: [],
        analysis: {
          userText: '',
          combinedText: '',
          contentSummary: 'General content',
          keyPoints: [],
          tone: 'professional',
          intent: 'general',
          audience: 'general',
          visualSummary: '',
          layoutDescription: '',
          uiElements: [],
          keepStructure: false,
          verdict: 'needs_edit' as const,
          alignmentNotes: '',
          visualGoals: '',
          brandStyle: '',
          aspectRatioSuggestion: '16:9',
        }
    };
    const enhanced = this.generateEnhancedPrompts(components, context);
    return {
        midjourney: enhanced.midjourney.prompt,
        dalle: enhanced.dalle.prompt,
        stableDiffusion: enhanced.stableDiffusion.prompt,
        flux: enhanced.flux.prompt
    };
  }
}

export function generateEnhancedPrompts(
  components: PromptComponents,
  context: {
    contentType: string;
    tone: string;
    keywords: string[];
    style?: BrandStyle;
    intent?: PromptIntent;
    lengthMode?: LengthMode;
    analysis?: UnifiedAnalysis;
    imageType?: ImageType;
    userOptions?: UserPromptOptions;
    forcedLayoutPattern?: LayoutPattern;
  }
): EnhancedPromptOutput {
  return PromptGenerator.generateEnhancedPrompts(components, context);
}
