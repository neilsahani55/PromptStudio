export type BrandStyle = 'none' | 'modern_saas_3d' | 'minimal_abstract' | 'editorial_tech' | 'modernSaaS' | 'minimalBlog' | 'ecomPremium' | 'cyberpunk' | 'corporate';

export interface StyleProfile {
  id: BrandStyle;
  label: string;
  visualStyle: string;
  lighting: string;
  negativePrompts: string[];
  colorPalette: string;
}

export const styleProfiles: Record<BrandStyle, StyleProfile> = {
  none: {
    id: 'none',
    label: 'No Preset',
    visualStyle: '',
    lighting: '',
    negativePrompts: [],
    colorPalette: ''
  },
  modern_saas_3d: {
    id: 'modern_saas_3d',
    label: 'Modern SaaS 3D',
    visualStyle: 'soft 3D render, subtle gradients, rounded cards, glassmorphism highlights, high contrast typography, octane render style, premium UI',
    lighting: 'soft studio lighting, purple and blue rim lights, volumetric glow',
    negativePrompts: ['stock photo', 'disembodied hands', 'low-detail icons', 'blurry glow effects', 'messy background', 'watermark', 'ui toolbars', 'extra text', 'grunge', 'rustic'],
    colorPalette: 'cool blues, electric purples, clean white, teal and navy'
  },
  minimal_abstract: {
    id: 'minimal_abstract',
    label: 'Minimal Abstract',
    visualStyle: 'flat vector, geometric shapes, limited color palette, strong focal icon, abstract data flow',
    lighting: 'flat even lighting, no shadows, high key',
    negativePrompts: ['photorealistic', '3D', 'detailed textures', 'complex', 'chaotic', 'perspective', 'depth of field'],
    colorPalette: 'monochrome with single accent, pastel tones'
  },
  editorial_tech: {
    id: 'editorial_tech',
    label: 'Editorial Tech',
    visualStyle: 'isometric illustration, thin lines, modern magazine tech style, architectural precision',
    lighting: 'soft directional light, clean shadows',
    negativePrompts: ['3d render', 'glossy', 'shiny', 'neon', 'dark', 'moody', 'photo'],
    colorPalette: 'muted earth tones, technical blue, slate gray'
  },
  modernSaaS: {
    id: 'modernSaaS',
    label: 'Modern SaaS',
    visualStyle: 'clean 3D abstract isometric style, smooth gradients, glassmorphism elements, tech-forward',
    lighting: 'soft studio lighting, purple and blue rim lights',
    negativePrompts: ['grunge', 'messy', 'vintage', 'rustic', 'hand-drawn', 'sketch'],
    colorPalette: 'cool blues, electric purples, clean white'
  },
  minimalBlog: {
    id: 'minimalBlog',
    label: 'Minimalist Blog',
    visualStyle: 'flat minimal vector illustration, plenty of whitespace, clean lines, geometric shapes',
    lighting: 'flat even lighting, no shadows',
    negativePrompts: ['photorealistic', '3D', 'detailed textures', 'complex', 'chaotic'],
    colorPalette: 'pastel tones, soft grays, single accent color'
  },
  ecomPremium: {
    id: 'ecomPremium',
    label: 'Premium E-commerce',
    visualStyle: 'high-end product photography, luxury aesthetic, sharp focus, 85mm lens',
    lighting: 'professional studio strobe, softbox, dramatic shadows',
    negativePrompts: ['low quality', 'amateur', 'blurry', 'distorted', 'cartoon'],
    colorPalette: 'rich dark tones, gold accents, neutral background'
  },
  cyberpunk: {
    id: 'cyberpunk',
    label: 'Cyberpunk / Tech',
    visualStyle: 'futuristic cyberpunk aesthetic, neon lights, high contrast, cinematic atmosphere',
    lighting: 'volumetric neon lighting, dark environment with bright accents',
    negativePrompts: ['daylight', 'natural', 'soft', 'pastel', 'vintage'],
    colorPalette: 'neon pink, cyan, dark blue, black'
  },
  corporate: {
    id: 'corporate',
    label: 'Corporate Professional',
    visualStyle: 'professional stock photography style, diverse team, modern office environment',
    lighting: 'bright natural daylight, well-lit office',
    negativePrompts: ['dark', 'moody', 'abstract', 'artistic', 'surreal'],
    colorPalette: 'navy blue, gray, white, professional tones'
  }
};
