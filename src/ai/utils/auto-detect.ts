/**
 * Auto-detect optimal image type from user content
 * Analyzes text to suggest the best image type
 */

import { ImageType } from '../prompt-schema';

interface DetectionResult {
  imageType: ImageType;
  confidence: number; // 0-1
  reason: string;
}

const PATTERNS: { type: ImageType; keywords: RegExp; reason: string; weight: number }[] = [
  {
    type: 'infographic',
    keywords: /\b(infographic|data|statistic|percent|chart|graph|comparison|steps|process|timeline|workflow|funnel|pipeline|metrics|kpi|numbers|survey|report)\b/i,
    reason: 'Content mentions data, statistics, or process steps',
    weight: 1.2,
  },
  {
    type: 'ui_mockup',
    keywords: /\b(ui|ux|interface|dashboard|app|screen|wireframe|mockup|layout|button|form|navigation|sidebar|header|footer|landing page|saas|signup|login|modal|dropdown|settings)\b/i,
    reason: 'Content describes a user interface or app screen',
    weight: 1.3,
  },
  {
    type: 'data_viz',
    keywords: /\b(visualization|analytics|revenue|growth|performance|benchmark|trend|forecast|quarterly|annual|roi|conversion|traffic|engagement)\b/i,
    reason: 'Content focuses on analytics or business metrics',
    weight: 1.1,
  },
  {
    type: 'character',
    keywords: /\b(character|avatar|mascot|person|portrait|face|hero image|team|founder|ceo|user persona|illustration of a person)\b/i,
    reason: 'Content describes a person or character',
    weight: 1.0,
  },
  {
    type: 'product_render',
    keywords: /\b(product|render|3d|packaging|bottle|box|device|gadget|phone|laptop|hardware|physical|merchandise|ecommerce|e-commerce|store|shop)\b/i,
    reason: 'Content describes a physical product',
    weight: 1.1,
  },
  {
    type: 'icon_or_sticker',
    keywords: /\b(icon|sticker|emoji|logo|badge|symbol|minimal|simple|flat design|vector)\b/i,
    reason: 'Content describes a simple icon or sticker',
    weight: 1.0,
  },
  {
    type: 'abstract_visual',
    keywords: /\b(abstract|pattern|texture|gradient|geometric|artistic|conceptual|mood|atmosphere|background|wallpaper)\b/i,
    reason: 'Content describes an abstract or artistic concept',
    weight: 0.9,
  },
  {
    type: 'scene_illustration',
    keywords: /\b(scene|illustration|landscape|environment|setting|world|nature|city|office|workspace|room|outdoor|indoor|building|architecture)\b/i,
    reason: 'Content describes a scene or environment',
    weight: 0.8,
  },
];

/**
 * Analyze text and suggest the best image type
 */
export function detectImageType(text: string): DetectionResult {
  if (!text || text.length < 10) {
    return { imageType: 'scene_illustration', confidence: 0, reason: 'Not enough text to analyze' };
  }

  const scores: { type: ImageType; score: number; reason: string }[] = [];

  for (const pattern of PATTERNS) {
    const matches = text.match(new RegExp(pattern.keywords.source, 'gi'));
    if (matches) {
      scores.push({
        type: pattern.type,
        score: matches.length * pattern.weight,
        reason: pattern.reason,
      });
    }
  }

  if (scores.length === 0) {
    return { imageType: 'scene_illustration', confidence: 0.3, reason: 'General content — defaulting to scene illustration' };
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  const maxPossible = Math.max(best.score, 5); // normalize
  const confidence = Math.min(best.score / maxPossible, 1);

  return {
    imageType: best.type,
    confidence,
    reason: best.reason,
  };
}

/**
 * Get a human-friendly label for an image type
 */
export function imageTypeLabel(type: ImageType): string {
  const labels: Record<ImageType, string> = {
    scene_illustration: 'Scene Illustration',
    infographic: 'Infographic',
    ui_mockup: 'UI Mockup',
    character: 'Character',
    abstract_visual: 'Abstract Visual',
    product_render: 'Product Render',
    icon_or_sticker: 'Icon/Sticker',
    data_viz: 'Data Visualization',
  };
  return labels[type] || type.replace(/_/g, ' ');
}
