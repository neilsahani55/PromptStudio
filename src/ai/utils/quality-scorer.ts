/**
 * Enhanced prompt quality scoring system
 * Platform-aware, with cross-component coherence and actionable suggestions
 */

import { PromptComponents } from '../prompt-schema';

export interface QualityScore {
  overall: number; // 0-10
  breakdown: {
    completeness: number; // 0-1
    specificity: number; // 0-1
    coherence: number; // 0-1
    lengthOptimization: number; // 0-1
  };
  rating: 'Excellent' | 'Very Good' | 'Good' | 'Fair' | 'Needs Improvement';
  suggestions: string[];
}

export class QualityScorer {
  private readonly vagueTerms = new Set([
    'nice', 'good', 'beautiful', 'interesting', 'thing', 'things',
    'stuff', 'various', 'some', 'many', 'few', 'great', 'awesome',
    'cool', 'amazing', 'wonderful', 'pretty', 'certain', 'etc',
    'overall', 'general', 'basically', 'really', 'very', 'quite',
    'somewhat', 'kind of', 'sort of', 'look like', 'and more'
  ]);

  private readonly qualityIndicators = [
    'high quality', '4k', '8k', 'professional', 'detailed',
    'sharp', 'crisp', 'clear', 'vibrant', 'rich', 'masterpiece',
    'octane render', 'unreal engine', 'ray tracing', 'photorealistic'
  ];

  private readonly contradictionPairs: [string[], string[]][] = [
    [['bright', 'light', 'daylight', 'high-key'], ['dark', 'dim', 'shadow', 'night', 'low-key']],
    [['modern', 'contemporary', 'futuristic'], ['vintage', 'antique', 'retro', 'old-fashioned', 'classical']],
    [['minimalist', 'simple', 'clean', 'sparse'], ['complex', 'ornate', 'busy', 'cluttered', 'baroque']],
    [['warm', 'cozy', 'golden'], ['cool', 'cold', 'icy', 'frigid']],
    [['professional', 'formal', 'corporate'], ['casual', 'informal', 'playful', 'whimsical']],
    [['natural', 'organic', 'earthy'], ['artificial', 'synthetic', 'neon', 'digital']],
    [['photorealistic', 'photographic', 'lifelike'], ['cartoon', 'anime', 'flat illustration', 'hand-drawn', 'watercolor']],
    [['matte', 'flat finish'], ['glossy', 'reflective', 'glass']],
    [['cinematic', 'dramatic'], ['clinical', 'sterile', 'documentary']],
    [['dreamy', 'ethereal', 'soft focus'], ['sharp', 'crisp', 'hyper-detailed']],
  ];

  // Platform-specific optimal length ranges (in characters)
  private readonly platformLengthRanges: Record<string, { ideal: [number, number]; good: [number, number] }> = {
    'midjourney': { ideal: [120, 350], good: [80, 500] },
    'dalle': { ideal: [200, 600], good: [150, 800] },
    'stable-diffusion': { ideal: [150, 400], good: [100, 550] },
    'flux': { ideal: [150, 450], good: [100, 600] },
    'default': { ideal: [140, 400], good: [80, 600] },
  };

  scorePrompt(
    components: PromptComponents,
    formattedPrompt: string,
    platform?: string
  ): QualityScore {
    const breakdown = {
      completeness: this.scoreCompleteness(components),
      specificity: this.scoreSpecificity(components),
      coherence: this.scoreCoherence(components),
      lengthOptimization: this.scoreLengthOptimization(formattedPrompt, platform)
    };

    // Weighted overall score
    const overall = (
      breakdown.completeness * 2.5 +
      breakdown.specificity * 3.5 +
      breakdown.coherence * 2.5 +
      breakdown.lengthOptimization * 1.5
    );

    const suggestions = this.generateSuggestions(breakdown, components, formattedPrompt);

    return {
      overall: Math.round(overall * 10) / 10,
      breakdown,
      rating: this.getRating(overall),
      suggestions
    };
  }

  private scoreCompleteness(components: PromptComponents): number {
    const requiredComponents = [
      'subject', 'environment', 'visual_style', 'lighting_color', 'quality_realism'
    ];
    const optionalComponents = [
      'action_context', 'mood_story', 'camera_composition', 'detail_texture'
    ];

    const requiredFilled = requiredComponents.filter(key =>
      components[key as keyof PromptComponents] &&
      String(components[key as keyof PromptComponents]).trim().length > 5
    ).length;

    const optionalFilled = optionalComponents.filter(key =>
      components[key as keyof PromptComponents] &&
      String(components[key as keyof PromptComponents]).trim().length > 5
    ).length;

    const requiredScore = requiredFilled / requiredComponents.length;
    const optionalScore = optionalFilled / optionalComponents.length;

    return requiredScore * 0.7 + optionalScore * 0.3;
  }

  private scoreSpecificity(components: PromptComponents): number {
    const allText = Object.values(components)
      .filter(v => typeof v === 'string')
      .join(' ')
      .toLowerCase();

    const words = allText.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return 0;

    // Count vague terms (penalty)
    let vagueCount = 0;
    for (const word of words) {
      if (this.vagueTerms.has(word)) vagueCount++;
    }

    // Specific indicators (bonus): words >8 chars that are actual descriptors, not filler
    const fillerLongWords = new Set(['unfortunately', 'approximately', 'representing', 'particularly', 'professional']);
    const longWords = words.filter(w => w.length > 8 && !fillerLongWords.has(w)).length;

    // Quality indicator bonus
    const qualityCount = this.qualityIndicators.filter(ind => allText.includes(ind)).length;

    // Concrete visual terms bonus (color names, materials, art movements)
    const visualTerms = ['cobalt', 'crimson', 'ivory', 'marble', 'glass', 'steel', 'oak', 'velvet',
      'bauhaus', 'art deco', 'impressionist', 'gothic', 'cyberpunk', 'steampunk',
      'isometric', 'bokeh', 'macro', 'telephoto', 'wide-angle'];
    const visualCount = visualTerms.filter(t => allText.includes(t)).length;

    const vaguePenalty = Math.min(vagueCount / words.length, 0.4);
    const specificBonus = Math.min(longWords / words.length, 0.25);
    const qualityBonus = Math.min(qualityCount * 0.08, 0.15);
    const visualBonus = Math.min(visualCount * 0.06, 0.15);

    const score = 0.5 - vaguePenalty + specificBonus + qualityBonus + visualBonus;
    return Math.max(0, Math.min(1, score));
  }

  private scoreCoherence(components: PromptComponents): number {
    const allText = Object.values(components)
      .filter(v => typeof v === 'string')
      .join(' ')
      .toLowerCase();

    let contradictionCount = 0;

    for (const [terms1, terms2] of this.contradictionPairs) {
      const hasTerms1 = terms1.some(term => allText.includes(term));
      const hasTerms2 = terms2.some(term => allText.includes(term));
      if (hasTerms1 && hasTerms2) contradictionCount++;
    }

    // Cross-component coherence: check subject-environment alignment
    const subject = (components.subject || '').toLowerCase();
    const environment = (components.environment || '').toLowerCase();

    // Penalize if subject suggests outdoor but environment says indoor (or vice versa)
    const outdoorTerms = ['outdoor', 'forest', 'ocean', 'mountain', 'field', 'garden', 'beach', 'sky'];
    const indoorTerms = ['office', 'studio', 'room', 'indoor', 'interior', 'desk', 'workspace'];
    const subjectOutdoor = outdoorTerms.some(t => subject.includes(t));
    const envIndoor = indoorTerms.some(t => environment.includes(t));
    const subjectIndoor = indoorTerms.some(t => subject.includes(t));
    const envOutdoor = outdoorTerms.some(t => environment.includes(t));

    if ((subjectOutdoor && envIndoor) || (subjectIndoor && envOutdoor)) {
      contradictionCount += 0.5;
    }

    if (contradictionCount === 0) return 1.0;
    if (contradictionCount <= 1) return 0.7;
    if (contradictionCount <= 2) return 0.4;
    return 0.2;
  }

  private scoreLengthOptimization(prompt: string, platform?: string): number {
    const length = prompt.length;
    const ranges = this.platformLengthRanges[platform || 'default'] || this.platformLengthRanges['default'];

    const [idealMin, idealMax] = ranges.ideal;
    const [goodMin, goodMax] = ranges.good;

    if (length >= idealMin && length <= idealMax) return 1.0;
    if (length >= goodMin && length <= goodMax) return 0.75;
    if (length >= goodMin * 0.7 && length <= goodMax * 1.3) return 0.5;
    return 0.25;
  }

  private getRating(score: number): QualityScore['rating'] {
    if (score >= 9.0) return 'Excellent';
    if (score >= 7.5) return 'Very Good';
    if (score >= 6.0) return 'Good';
    if (score >= 4.5) return 'Fair';
    return 'Needs Improvement';
  }

  private generateSuggestions(
    breakdown: QualityScore['breakdown'],
    components: PromptComponents,
    prompt: string
  ): string[] {
    const suggestions: string[] = [];

    if (breakdown.completeness < 0.8) {
      const missing: string[] = [];
      if (!components.environment || components.environment.length < 6) missing.push('environment/setting');
      if (!components.visual_style || components.visual_style.length < 6) missing.push('visual style');
      if (!components.lighting_color || components.lighting_color.length < 6) missing.push('lighting');
      if (missing.length > 0) {
        suggestions.push(`Add detail to: ${missing.join(', ')}`);
      }
    }

    if (breakdown.specificity < 0.5) {
      const allText = Object.values(components).join(' ').toLowerCase();
      const foundVague = Array.from(this.vagueTerms).filter(t => allText.includes(t)).slice(0, 3);
      if (foundVague.length > 0) {
        suggestions.push(`Replace vague terms (${foundVague.join(', ')}) with concrete visual descriptors`);
      } else {
        suggestions.push('Add specific visual details: colors, materials, art style references');
      }
    }

    if (breakdown.coherence < 0.7) {
      suggestions.push('Style contradiction detected — check that mood, lighting, and visual style align');
    }

    if (breakdown.lengthOptimization < 0.5) {
      const length = prompt.length;
      if (length < 100) {
        suggestions.push('Prompt is very short — add environment, mood, or composition details');
      } else if (length > 700) {
        suggestions.push('Prompt is very long — focus on the 3-4 most important visual elements');
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('Prompt quality is excellent! Ready to use.');
    }

    return suggestions;
  }
}

export const qualityScorer = new QualityScorer();
