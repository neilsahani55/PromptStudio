
import { PromptComponents, ImageType } from '../prompt-schema';

export type LayoutPattern = 
  | 'central-hub' 
  | 'two-column' 
  | 'grid-cards' 
  | 'radial-apps'
  | 'vertical-steps' 
  | 'split-hero'
  | 'dashboard-sidebar'
  | 'hero-left-kpi-right'
  | 'accordion-detail'
  | 'centered-hero'
  | 'isometric-stack'
  | 'left-visual-right-text'
  | 'right-visual-left-text'
  | 'diagonal-split'
  | 'asymmetric-cards'
  | 'chart-offset'
  | 'default';

export function pickLayoutPattern(
  imageType: ImageType,
  intent: string,
  seed: string
): LayoutPattern {
  // Mix in current time so repeated identical inputs get different layouts
  const timeSalt = Math.floor(Date.now() / 1000);
  const hash = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0) + timeSalt;
  
  // Define candidates based on image type and intent
  let candidates: LayoutPattern[] = ['default'];

  if (imageType === 'infographic') {
    if (intent.includes('platform') || intent.includes('explainer') || intent.includes('communication')) {
        candidates = ['two-column', 'grid-cards', 'vertical-steps', 'central-hub']; // Reduced central bias
    } else if (intent.includes('guide') || intent.includes('apps') || intent.includes('list')) {
        candidates = ['grid-cards', 'two-column', 'radial-apps'];
    } else if (intent.includes('tutorial') || intent.includes('how_to') || intent.includes('process')) {
      candidates = ['vertical-steps', 'two-column'];
    } else if (intent.includes('comparison') || intent.includes('features')) {
      candidates = ['grid-cards', 'split-hero', 'left-visual-right-text'];
    } else if (intent.includes('stats') || intent.includes('metrics')) {
      candidates = ['grid-cards', 'chart-offset', 'central-hub'];
    } else {
      candidates = ['two-column', 'vertical-steps', 'grid-cards', 'split-hero', 'radial-apps', 'central-hub'];
    }
  } else if (imageType === 'ui_mockup' || imageType === 'data_viz') {
    if (intent.includes('dashboard') || intent.includes('analytics')) {
      candidates = ['dashboard-sidebar', 'hero-left-kpi-right', 'chart-offset'];
    } else if (intent.includes('mobile') || intent.includes('app')) {
      candidates = ['isometric-stack', 'centered-hero'];
    } else {
      candidates = ['dashboard-sidebar', 'isometric-stack', 'hero-left-kpi-right', 'asymmetric-cards'];
    }
  } else if (imageType === 'scene_illustration' || imageType === 'product_render') {
      candidates = ['left-visual-right-text', 'right-visual-left-text', 'diagonal-split', 'split-hero'];
  } else if (imageType === 'abstract_visual') {
      candidates = ['diagonal-split', 'asymmetric-cards', 'split-hero'];
  }

  // Fallback if no specific candidates found
  if (candidates.length === 1 && candidates[0] === 'default') {
     return 'default';
  }

  return candidates[hash % candidates.length];
}

export function applyLayoutPattern(
  components: PromptComponents,
  imageType: ImageType,
  pattern: LayoutPattern
): PromptComponents {
  const c = { ...components };

  // Apply pattern-specific layout overrides
  switch (pattern) {
    case 'central-hub':
      c.camera_composition = 'straight-on view, central dashboard card with 4–6 surrounding feature modules connected by lines';
      c.environment = 'clean radial layout with generous whitespace';
      break;
    case 'two-column':
      c.camera_composition = 'straight-on view, split layout with left column for categories and right column hero card for key features';
      c.environment = 'asymmetrical split screen, balanced visual weight';
      break;
    case 'radial-apps':
        c.camera_composition = 'straight-on view, central brand element with circular app and feature icons orbiting around it';
        c.environment = 'orbital layout with connected nodes';
        break;
    case 'vertical-steps':
      c.camera_composition = 'straight-on view, top-to-bottom vertical step layout with numbered panels';
      c.environment = 'structured vertical flow, clear directional cues';
      break;
    case 'grid-cards':
      c.camera_composition = 'straight-on view, top hero strip with headline and bottom 2x3 grid of feature cards with icons';
      c.environment = 'modular grid system, consistent card padding';
      break;
    case 'split-hero':
      c.camera_composition = 'straight-on view, split layout with left visual block and right stacked cards';
      c.environment = 'asymmetrical split screen, balanced visual weight';
      break;
    case 'dashboard-sidebar':
      c.camera_composition = 'straight-on view, standard dashboard sidebar layout with main content area';
      break;
    case 'hero-left-kpi-right':
      c.camera_composition = 'straight-on view, large hero chart on left, stacked KPI cards on right';
      break;
    case 'isometric-stack':
      c.camera_composition = 'isometric view, floating glass panels stacked in 3D space';
      break;
    case 'centered-hero':
      c.camera_composition = 'straight-on view, large centered hero element with symmetrical supporting details';
      break;
    case 'left-visual-right-text':
      c.camera_composition = 'straight-on view, strong visual hero element on left third, balanced whitespace on right';
      c.environment = 'asymmetrical composition, heavy left visual weight';
      break;
    case 'right-visual-left-text':
      c.camera_composition = 'straight-on view, strong visual hero element on right third, balanced whitespace on left';
      c.environment = 'asymmetrical composition, heavy right visual weight';
      break;
    case 'diagonal-split':
      c.camera_composition = 'dynamic angle, diagonal split composition separating two distinct conceptual zones';
      c.environment = 'dynamic motion, diagonal flow';
      break;
    case 'asymmetric-cards':
      c.camera_composition = 'straight-on view, masonry-style card layout with varied card sizes and organic flow';
      c.environment = 'organic grid, fluid layout';
      break;
    case 'chart-offset':
      c.camera_composition = 'straight-on view, large data visualization dominant on one side, supporting metrics stacked on the other';
      c.environment = 'data-heavy asymmetrical balance';
      break;
    default:
      // Keep original composition
      break;
  }
  
  // Apply Modern Details (Texture enhancements)
  if (pattern === 'grid-cards') {
      c.detail_texture = (c.detail_texture || '') + ', evenly spaced cards, consistent padding, soft drop shadows';
  } else if (pattern === 'two-column' || pattern === 'left-visual-right-text' || pattern === 'right-visual-left-text') {
      c.detail_texture = (c.detail_texture || '') + ', clear vertical separation, asymmetric columns, bold visual hierarchy';
  } else if (pattern === 'radial-apps') {
      c.detail_texture = (c.detail_texture || '') + ', circular badges, subtle radial lines connecting icons to the hub';
  } else if (pattern === 'central-hub') {
      c.detail_texture = (c.detail_texture || '') + ', central focal point, radiating connection lines, unified icon set';
  } else if (pattern === 'diagonal-split') {
      c.detail_texture = (c.detail_texture || '') + ', sharp diagonal lines, contrasting zones, dynamic energy';
  }

  return c;
}

export function applyGlossLevel(components: PromptComponents, glossLevel: 'matte' | 'soft-glow' | 'glassmorphism'): PromptComponents {
  const c = { ...components };

  if (glossLevel === 'matte') {
    c.visual_style = (c.visual_style || '') + ', matte finish, flat fills, minimal reflections, no strong glow';
    c.lighting_color = (c.lighting_color || '') + ', very subtle highlights, low specular reflections';
  } else if (glossLevel === 'soft-glow') {
    c.visual_style = (c.visual_style || '') + ', soft glows on key cards, gentle highlights, modern SaaS look';
    c.lighting_color = (c.lighting_color || '') + ', soft ambient glow around primary elements';
  } else if (glossLevel === 'glassmorphism') {
    c.visual_style = (c.visual_style || '') + ', pronounced glassmorphism, frosted glass cards, bright edge highlights, layered depth';
    c.lighting_color = (c.lighting_color || '') + ', stronger glow, specular highlights, depth through blur and translucency';
  }

  return c;
}

export function applyModernBaseline(components: PromptComponents, brandStyle: string) {
  const base = 'modern product UI, flat vector, soft gradients, smooth rounded cards, subtle shadows';
  const c = { ...components };
  const existing = c.visual_style || '';

  // Enhance existing visual_style with baseline rather than overwriting
  if (brandStyle.includes('Minimalist')) {
    c.visual_style = `${existing}, ${base}, minimalist, generous whitespace, clean sans-serif typography`;
  } else if (brandStyle.includes('Cyberpunk') || brandStyle.includes('Dark')) {
    c.visual_style = `${existing}, ${base}, neon accents, dark background, futuristic glow`;
  } else if (brandStyle.includes('Warm') || brandStyle.includes('Organic')) {
    c.visual_style = `${existing}, ${base}, warm earth tones, soft lighting, natural textures`;
  } else {
    c.visual_style = existing ? `${existing}, ${base}` : base;
  }

  return c;
}
