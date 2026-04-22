/**
 * Enhanced platform-specific prompt formatters
 * Each platform gets formatting optimized for its actual best practices
 */

import { PromptComponents, LengthMode } from '../prompt-schema';
import { componentGenerator } from './component-generators';

export type PlatformType = 'midjourney' | 'dalle' | 'stable-diffusion' | 'flux';

export interface FormattedPrompt {
  prompt: string;
  negativePrompt?: string;
  parameters: Record<string, any>;
  estimatedTokens: number;
}

export class PlatformFormatter {
  /**
   * Format for Midjourney v6/v7
   * Best: Natural language phrases, subject+style first, strong --no list
   */
  formatMidjourney(
    components: PromptComponents,
    context: {
      contentType: string;
      tone: string;
      lengthMode?: LengthMode;
      imageType?: string;
    }
  ): FormattedPrompt {
    const parts: string[] = [];

    // Subject is always the hero
    parts.push(components.subject);

    // Visual style immediately after subject — MJ weights early tokens more
    if (components.visual_style) parts.push(components.visual_style);

    if (context.lengthMode === 'compact') {
      if (components.lighting_color) parts.push(components.lighting_color);
      if (components.quality_realism) parts.push(components.quality_realism);
    } else {
      if (components.action_context) parts.push(components.action_context);
      if (components.environment) parts.push(components.environment);
      if (components.mood_story) parts.push(components.mood_story);
      if (components.lighting_color) parts.push(components.lighting_color);
      if (components.camera_composition) parts.push(components.camera_composition);
      if (context.lengthMode === 'rich' && components.detail_texture) parts.push(components.detail_texture);
      if (components.quality_realism) parts.push(components.quality_realism);
    }

    const prompt = parts.filter(Boolean).join(', ');

    const aspectRatio = componentGenerator.determineAspectRatio({
      contentType: context.contentType,
      platform: 'midjourney'
    });

    const stylize = componentGenerator.determineStylizeLevel({
      visualStyle: components.visual_style,
      mood: components.mood_story,
      contentType: context.contentType
    });

    const noTerms = 'text, words, letters, watermark, signature, blurry, deformed, stock photo';
    const formattedPrompt = `${prompt} --ar ${aspectRatio} --s ${stylize} --v 6.1 --q 1 --no ${noTerms}`;

    return {
      prompt: formattedPrompt,
      parameters: { quality: 1, stylize, aspectRatio, version: '6.1' },
      estimatedTokens: this.estimateTokens(formattedPrompt)
    };
  }

  /**
   * Format for DALL-E 3
   * Best: Rich narrative prose that reads like art direction.
   * DALL-E 3 excels when you describe a scene like a film director, not a tag list.
   */
  formatDALLE(
    components: PromptComponents,
    context: {
      contentType: string;
      tone: string;
      lengthMode?: LengthMode;
      imageType?: string;
    }
  ): FormattedPrompt {
    let prompt: string;

    if (context.lengthMode === 'compact') {
      prompt = [
        components.subject,
        components.environment ? `set in ${components.environment}` : '',
        components.visual_style ? `rendered as ${components.visual_style}` : '',
        components.lighting_color ? `with ${components.lighting_color}` : '',
        components.quality_realism,
      ].filter(Boolean).join('. ') + '.';
    } else {
      prompt = this.buildNarrative(components);
    }

    // DALL-E responds well to explicit "do not" instructions
    prompt += ' The image contains no paragraphs of text — only short labels, icons, and visual elements.';

    return {
      prompt,
      parameters: { size: '1024x1024', quality: 'hd', style: 'natural' },
      estimatedTokens: this.estimateTokens(prompt)
    };
  }

  /**
   * Build natural narrative prose (for DALL-E / natural language platforms)
   */
  private buildNarrative(c: PromptComponents): string {
    const sentences: string[] = [];

    // Opening scene: subject + action + environment as one cinematic sentence
    let opening = c.subject;
    if (c.action_context) opening += `, ${c.action_context}`;
    if (c.environment) opening += `. The scene is set in ${c.environment}`;
    sentences.push(opening + '.');

    // Art direction: style + mood woven together
    const styleMood: string[] = [];
    if (c.visual_style) styleMood.push(`The image is rendered in ${c.visual_style}`);
    if (c.mood_story) styleMood.push(`evoking a feeling of ${c.mood_story}`);
    if (styleMood.length > 0) sentences.push(styleMood.join(', ') + '.');

    // Technical direction: lighting + camera
    if (c.lighting_color && c.camera_composition) {
      sentences.push(`The lighting features ${c.lighting_color}. Framed with ${c.camera_composition}.`);
    } else if (c.lighting_color) {
      sentences.push(`Lit with ${c.lighting_color}.`);
    } else if (c.camera_composition) {
      sentences.push(`Framed with ${c.camera_composition}.`);
    }

    // Texture + quality
    const finish: string[] = [];
    if (c.detail_texture) finish.push(c.detail_texture);
    if (c.quality_realism) finish.push(c.quality_realism);
    if (finish.length > 0) sentences.push(finish.join('. ') + '.');

    return sentences.join(' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Format for Stable Diffusion (SDXL / SD3)
   * Best: Weighted tags with graduated emphasis + strong negative prompt
   */
  formatStableDiffusion(
    components: PromptComponents,
    context: {
      contentType: string;
      tone: string;
      lengthMode?: LengthMode;
      imageType?: string;
    }
  ): FormattedPrompt {
    const keywords: string[] = [];

    // Highest priority: subject (1.4)
    if (components.subject) keywords.push(`(${components.subject}:1.4)`);

    // High priority: style + quality (1.2-1.3)
    if (components.visual_style) keywords.push(`(${components.visual_style}:1.3)`);
    if (components.quality_realism) keywords.push(`(${components.quality_realism}:1.2)`);

    // Medium priority: environment + lighting (1.1)
    if (components.environment) keywords.push(`(${components.environment}:1.1)`);
    if (components.lighting_color) keywords.push(`(${components.lighting_color}:1.1)`);

    // Standard priority: supporting details
    if (components.action_context) keywords.push(components.action_context);
    if (components.mood_story) keywords.push(components.mood_story);
    if (components.camera_composition) keywords.push(components.camera_composition);
    if (components.detail_texture) keywords.push(components.detail_texture);

    let filteredKeywords = keywords;
    if (context.lengthMode === 'compact') {
      filteredKeywords = keywords.slice(0, 6);
    }

    const prompt = filteredKeywords.join(', ');

    // Build comprehensive negative prompt
    let negativePrompt = componentGenerator.generateNegativePrompts({
      visualStyle: components.visual_style,
      mood: components.mood_story,
      contentType: context.contentType,
      tone: context.tone
    });
    negativePrompt += ', long text, paragraphs, body copy, excessive labels, stock photo, watermark, blurry, low quality, deformed';

    return {
      prompt,
      negativePrompt,
      parameters: { steps: 40, cfgScale: 7.5, sampler: 'DPM++ 2M SDE Karras' },
      estimatedTokens: this.estimateTokens(prompt + ' ' + negativePrompt)
    };
  }

  /**
   * Format for Flux
   * Best: Clean descriptive sentences. No filler quality words (Flux ignores "masterpiece", "8k").
   * Focus on WHAT to show, not quality boosters.
   */
  formatFlux(
    components: PromptComponents,
    context: {
      contentType: string;
      tone: string;
      lengthMode?: LengthMode;
      imageType?: string;
    }
  ): FormattedPrompt {
    const sentences: string[] = [];

    // Core scene description
    let core = components.subject;
    if (components.action_context) core += `, ${components.action_context}`;
    if (components.environment) core += `. Set in ${components.environment}`;
    sentences.push(core + '.');

    // Art direction — Flux responds well to specific style references
    if (components.visual_style) {
      // Strip quality booster words that Flux ignores
      const cleanStyle = components.visual_style
        .replace(/\b(masterpiece|best quality|8k|4k|ultra high|high quality|professional)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleanStyle) sentences.push(cleanStyle + '.');
    }

    // Atmosphere: lighting + mood
    const atmosphere: string[] = [];
    if (components.lighting_color) atmosphere.push(components.lighting_color);
    if (components.mood_story) atmosphere.push(components.mood_story);
    if (atmosphere.length > 0) sentences.push(atmosphere.join(', ') + '.');

    // Composition and texture for non-compact
    if (context.lengthMode !== 'compact') {
      if (components.camera_composition) sentences.push(components.camera_composition + '.');
      if (components.detail_texture) sentences.push(components.detail_texture + '.');
    }

    let prompt = sentences.join(' ').replace(/\s+/g, ' ').trim();
    prompt += ' No paragraphs of text in the image — only short labels and visual elements.';

    return {
      prompt,
      parameters: {},
      estimatedTokens: this.estimateTokens(prompt)
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Main formatting method - routes to appropriate formatter
   */
  format(
    platform: PlatformType,
    components: PromptComponents,
    context: {
      contentType: string;
      tone: string;
      lengthMode?: LengthMode;
      imageType?: string;
    }
  ): FormattedPrompt {

    // INFOGRAPHIC COMPRESSION — adapt components for visual-heavy output
    if (context.imageType === 'infographic') {
       const compressed = { ...components };
       compressed.subject = `Infographic layout: ${components.subject}`;
       compressed.environment = `${components.environment || ''} Clean modular layout with generous whitespace, icon-based communication.`;
       compressed.detail_texture = `${components.detail_texture || ''} Visuals only. 1 title, max 6 short labels (2-3 words each), 1 short CTA.`;
       components = compressed;
    }

    switch (platform) {
      case 'midjourney':
        return this.formatMidjourney(components, context);
      case 'dalle':
        return this.formatDALLE(components, context);
      case 'stable-diffusion':
        return this.formatStableDiffusion(components, context);
      case 'flux':
        return this.formatFlux(components, context);
      default:
        return this.formatMidjourney(components, context);
    }
  }
}

export const platformFormatter = new PlatformFormatter();
