export type PromptIntent = 'general' | 'blog_hero' | 'social_story' | 'linkedin_post' | 'product_showcase' | 'feature_highlight';

export interface IntentPattern {
  id: PromptIntent;
  label: string;
  composition: string;
  detailBias: string;
  aspectRatio: string;
}

export const intentPatterns: Record<PromptIntent, IntentPattern> = {
  general: {
    id: 'general',
    label: 'General Use',
    composition: 'balanced central composition',
    detailBias: 'balanced details',
    aspectRatio: '16:9'
  },
  blog_hero: {
    id: 'blog_hero',
    label: 'Blog Header / Hero',
    composition: 'wide cinematic shot, negative space on the left for text overlay',
    detailBias: 'clear silhouette, readable at small size, high quality background',
    aspectRatio: '16:9'
  },
  social_story: {
    id: 'social_story',
    label: 'Instagram/TikTok Story',
    composition: 'vertical layout, focal point in center-bottom, room for stickers at top',
    detailBias: 'bold shapes, high contrast, visually arresting',
    aspectRatio: '9:16'
  },
  linkedin_post: {
    id: 'linkedin_post',
    label: 'LinkedIn Post',
    composition: 'professional square or landscape composition, clean background',
    detailBias: 'professional, sharp details, not too busy',
    aspectRatio: '1.91:1'
  },
  product_showcase: {
    id: 'product_showcase',
    label: 'Product Showcase',
    composition: 'centered product shot, macro details, depth of field blurring background',
    detailBias: 'extreme texture detail, product focus',
    aspectRatio: '4:5'
  },
  feature_highlight: {
    id: 'feature_highlight',
    label: 'Feature Illustration',
    composition: 'isometric view or diagrammatic layout, organized elements',
    detailBias: 'clean lines, explanatory visual style',
    aspectRatio: '3:2'
  }
};
