/**
 * Content-aware component enhancement
 * Post-processes AI output with context-sensitive improvements
 */

import { PromptComponents } from '../prompt-schema';
import { BrandStyle, styleProfiles } from './style-profiles';
import { PromptIntent, intentPatterns } from './intent-patterns';

export class ComponentGenerator {
  /**
   * Enhance subject with context-aware details (avoids redundancy)
   */
  enhanceSubject(
    rawSubject: string,
    context: {
      keywords: string[];
      entities: string[];
      tone: string;
      style?: BrandStyle;
      intent?: PromptIntent;
    }
  ): string {
    const subject = rawSubject.trim();
    const subjectLower = subject.toLowerCase();

    // Only add characteristics that aren't already implied by subject
    const characteristics: string[] = [];

    const relevantKeywords = context.keywords
      .filter(k => !subjectLower.includes(k.toLowerCase()) && k.length > 3)
      .slice(0, 3);
    characteristics.push(...relevantKeywords);

    // Add intent-based bias if not redundant
    if (context.intent && intentPatterns[context.intent]) {
      const bias = intentPatterns[context.intent].detailBias;
      if (bias && !subjectLower.includes(bias.toLowerCase()) && !characteristics.includes(bias)) {
        characteristics.push(bias);
      }
    }

    if (characteristics.length > 0) {
      return `${subject}, ${characteristics.slice(0, 3).join(', ')}`;
    }

    return subject;
  }

  /**
   * Enhance environment with style-appropriate context
   */
  enhanceEnvironment(
    rawEnvironment: string,
    context: {
      contentType: string;
      tone: string;
      hasTimeReference: boolean;
      style?: BrandStyle;
      imageType?: string;
    }
  ): string {
    let enhanced = rawEnvironment;

    // Apply style profile environment hints (only if relevant to the image type)
    if (context.style && styleProfiles[context.style]) {
      const profile = styleProfiles[context.style];
      if (profile.visualStyle && !enhanced.includes(profile.visualStyle.split(',')[0])) {
        // Only append style cues for scene/UI types, not isolated product shots
        if (context.imageType !== 'product_render' && context.imageType !== 'icon_or_sticker') {
          enhanced += `, ${profile.visualStyle.split(',')[0]}`;
        }
      }
    }

    // Add time of day only for scenes that benefit from it
    const sceneTypes: (string | undefined)[] = ['scene_illustration', 'character'];
    const timeKeywords = ['morning', 'afternoon', 'evening', 'night', 'golden hour', 'dawn', 'dusk'];
    const hasTime = timeKeywords.some(t => enhanced.toLowerCase().includes(t));

    if (!hasTime && context.hasTimeReference && (!context.imageType || sceneTypes.includes(context.imageType))) {
      if (context.tone.includes('warm') || context.tone.includes('friendly')) {
        enhanced += ', golden hour light';
      } else if (context.tone.includes('dramatic') || context.tone.includes('mysterious')) {
        enhanced += ', twilight atmosphere';
      }
    }

    return enhanced;
  }

  /**
   * Enhance lighting with image-type-aware technical details
   */
  enhanceLighting(
    rawLighting: string,
    context: {
      mood: string;
      visualStyle: string;
      style?: BrandStyle;
      imageType?: string;
    }
  ): string {
    let enhanced = rawLighting;

    // Apply style profile lighting if available
    if (context.style && styleProfiles[context.style]?.lighting) {
      const styleLighting = styleProfiles[context.style].lighting;
      if (!enhanced.includes(styleLighting)) {
        enhanced = `${styleLighting}, ${enhanced}`;
      }
    }

    // Only add inferred lighting if none is specified
    const lightingTypes = [
      'natural', 'studio', 'soft', 'dramatic', 'ambient',
      'volumetric', 'golden hour', 'diffused', 'backlit',
      'cinematic', 'rim light', 'high-key', 'low-key', 'neon'
    ];

    const hasLightingType = lightingTypes.some(t => enhanced.toLowerCase().includes(t));
    if (!hasLightingType) {
      // Image-type-aware lighting inference
      const imageType = context.imageType || '';
      if (imageType === 'ui_mockup' || imageType === 'data_viz') {
        enhanced = 'clean even lighting, no harsh shadows, ' + enhanced;
      } else if (imageType === 'product_render') {
        enhanced = 'studio three-point lighting, soft highlights, ' + enhanced;
      } else if (context.mood.includes('dramatic') || context.mood.includes('mysterious')) {
        enhanced = 'cinematic lighting with dramatic shadows, ' + enhanced;
      } else if (context.mood.includes('peaceful') || context.mood.includes('calm')) {
        enhanced = 'soft diffused natural light, ' + enhanced;
      } else {
        enhanced = 'balanced professional lighting, ' + enhanced;
      }
    }

    return enhanced;
  }

  /**
   * Enhance camera composition with contextual lens language
   */
  enhanceCamera(
    rawCamera: string,
    context: {
      contentType: string;
      tone: string;
      intent?: PromptIntent;
      imageType?: string;
    }
  ): string {
    let enhanced = rawCamera;

    // Apply intent-based composition
    if (context.intent && intentPatterns[context.intent]) {
      const intentComp = intentPatterns[context.intent].composition;
      if (!enhanced.includes(intentComp)) {
        enhanced = `${intentComp}, ${enhanced}`;
      }
    }

    // Add lens language based on image type (more nuanced than content-type matching)
    const hasLens = ['mm', 'lens', 'macro', 'wide angle', 'telephoto'].some(
      t => enhanced.toLowerCase().includes(t)
    );

    if (!hasLens) {
      const imageType = context.imageType || '';
      switch (imageType) {
        case 'ui_mockup':
        case 'data_viz':
          enhanced += ', front-facing flat perspective, clean framing';
          break;
        case 'product_render':
          enhanced += ', product photography angle, controlled depth of field';
          break;
        case 'character':
          enhanced += ', 85mm portrait lens, medium shot';
          break;
        case 'infographic':
          enhanced += ', overhead or isometric view, full layout visible';
          break;
        case 'icon_or_sticker':
          enhanced += ', centered close-up, isolated subject';
          break;
        default:
          enhanced += ', 35mm cinematic lens, balanced composition';
      }
    }

    return enhanced;
  }

  /**
   * Generate targeted negative prompts based on actual content needs
   */
  generateNegativePrompts(context: {
    visualStyle: string;
    mood: string;
    contentType: string;
    tone: string;
    style?: BrandStyle;
    imageType?: string;
  }): string {
    const negativeTerms = new Set<string>();

    // Universal quality exclusions
    negativeTerms.add('blurry');
    negativeTerms.add('low quality');
    negativeTerms.add('distorted');
    negativeTerms.add('artifacts');
    negativeTerms.add('watermark');

    // Style profile negatives
    if (context.style && styleProfiles[context.style]) {
      styleProfiles[context.style].negativePrompts.forEach(term => negativeTerms.add(term));
    }

    // Style-based exclusions (only add what conflicts with the chosen style)
    const style = context.visualStyle.toLowerCase();
    if (style.includes('realistic') || style.includes('photographic')) {
      negativeTerms.add('cartoon');
      negativeTerms.add('anime');
    } else if (style.includes('flat') || style.includes('vector') || style.includes('illustration')) {
      negativeTerms.add('photorealistic');
      negativeTerms.add('photograph');
    }

    if (style.includes('minimalist') || style.includes('clean')) {
      negativeTerms.add('cluttered');
      negativeTerms.add('busy background');
    }

    // Tone-based exclusions
    if (context.tone.includes('professional') || context.tone.includes('corporate')) {
      negativeTerms.add('amateur');
      negativeTerms.add('messy');
    }

    // Human-specific (only when content involves people)
    if (context.contentType.includes('person') || context.contentType.includes('portrait') || context.contentType.includes('character')) {
      negativeTerms.add('extra limbs');
      negativeTerms.add('bad anatomy');
      negativeTerms.add('disfigured');
    }

    return Array.from(negativeTerms).sort().join(', ');
  }

  /**
   * Determine optimal aspect ratio based on content type
   */
  determineAspectRatio(context: {
    contentType: string;
    platform: string;
    purpose?: string;
    intent?: PromptIntent;
  }): string {
    if (context.intent && intentPatterns[context.intent]) {
      return intentPatterns[context.intent].aspectRatio;
    }

    const content = context.contentType.toLowerCase();

    if (content.includes('portrait') || content.includes('headshot') || content.includes('person standing')) {
      return '2:3';
    }
    if (content.includes('instagram') || content.includes('product photo') || content.includes('square') || context.purpose?.includes('social media post')) {
      return '1:1';
    }
    if (content.includes('story') || content.includes('tiktok') || content.includes('reels') || content.includes('vertical')) {
      return '9:16';
    }
    if (content.includes('banner') || content.includes('header') || content.includes('panorama')) {
      return '21:9';
    }

    return '16:9';
  }

  /**
   * Determine stylize parameter for Midjourney based on content
   */
  determineStylizeLevel(context: {
    visualStyle: string;
    mood: string;
    contentType: string;
  }): number {
    const text = (context.visualStyle + ' ' + context.mood).toLowerCase();

    // High stylization (750-1000)
    const highKeywords = ['artistic', 'creative', 'painterly', 'illustrated', 'fantasy', 'abstract', 'bold', 'expressive'];
    // Low stylization (250-500)
    const lowKeywords = ['realistic', 'photographic', 'documentary', 'natural', 'authentic', 'lifelike', 'editorial'];

    if (highKeywords.some(k => text.includes(k))) return 850;
    if (lowKeywords.some(k => text.includes(k))) return 400;
    return 650;
  }

  /**
   * Assess content complexity for processing decisions
   */
  assessComplexity(components: PromptComponents): number {
    let complexity = 0;

    const componentValues = Object.values(components);
    const filledComponents = componentValues.filter(v => v && typeof v === 'string' && v.trim().length > 10).length;
    complexity += (filledComponents / 10) * 0.4;

    const technicalTerms = ['volumetric', 'ray tracing', 'depth of field', 'bokeh', 'chromatic aberration', 'lens flare', 'cinematic', 'anamorphic', 'tilt-shift'];
    const allText = componentValues.join(' ').toLowerCase();
    const technicalCount = technicalTerms.filter(t => allText.includes(t)).length;
    complexity += Math.min(technicalCount / 5, 1) * 0.3;

    const totalLength = allText.length;
    if (totalLength > 500) complexity += 0.3;
    else if (totalLength > 300) complexity += 0.2;
    else complexity += 0.1;

    return Math.min(complexity, 1.0);
  }
}

export const componentGenerator = new ComponentGenerator();
