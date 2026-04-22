import { ImageType } from '../prompt-schema';
import { PromptComponents } from '../prompt-schema';

export type LayoutVariant = 'A' | 'B' | 'C';
export type StyleVariant = 'minimal' | 'bold' | 'split' | 'hero';

export function applyStyleVariant(
  components: PromptComponents,
  styleVariant: StyleVariant
): PromptComponents {
  const c = { ...components };
  const base = c.visual_style || 'modern design';

  switch (styleVariant) {
    case 'minimal':
      c.visual_style = `${base}, ultra-minimal, thin lines, generous whitespace, subdued palette`;
      break;
    case 'bold':
      c.visual_style = `${base}, bold blocks, strong contrast, chunky cards, heavy typography`;
      break;
    case 'split':
      c.visual_style = `${base}, split layout with contrasting left/right panels, dual-tone scheme`;
      break;
    case 'hero':
      c.visual_style = `${base}, large hero band with supporting mini-panels, dramatic focal point`;
      break;
  }
  return c;
}

export function applyLayoutVariant(
  components: PromptComponents,
  imageType: ImageType,
  layoutVariant: LayoutVariant
): PromptComponents {
  const c = { ...components };

  switch (imageType) {
    case 'infographic':
      if (layoutVariant === 'A') {
        c.camera_composition = 'straight-on view, central circle with sidebars';
      } else if (layoutVariant === 'B') {
        c.camera_composition = 'straight-on view, vertical step-by-step timeline layout';
      } else if (layoutVariant === 'C') {
        c.camera_composition = 'straight-on view, 2x2 grid of cards with top hero strip';
      }
      break;
    
    case 'ui_mockup':
      if (layoutVariant === 'A') {
        c.camera_composition = 'straight-on view, standard dashboard sidebar layout';
      } else if (layoutVariant === 'B') {
        c.camera_composition = 'isometric view, floating glass panels';
      } else if (layoutVariant === 'C') {
        c.camera_composition = 'mobile-first single column card stack';
      }
      break;

    case 'scene_illustration':
      if (layoutVariant === 'A') {
        c.camera_composition = 'cinematic framing, rule of thirds, dynamic angle';
      } else if (layoutVariant === 'B') {
        c.camera_composition = 'wide establishing shot, atmospheric perspective';
      } else if (layoutVariant === 'C') {
        c.camera_composition = 'close-up detail shot with shallow depth of field';
      }
      break;
      
    // Add more types as needed, default to A (base blueprint) if no match
  }
  return c;
}

export function applyImageTypeBlueprint(
  base: PromptComponents,
  imageType: ImageType
): PromptComponents {
  const c = { ...base };

  switch (imageType) {
    case 'infographic':
      c.subject = `clean infographic about ${c.subject}`;
      c.action_context = `(Visuals only, minimal text) ${c.action_context || ''}. Labels and title MUST be derived from the actual content topic — do not invent abstract labels.`;
      c.environment = c.environment || `clean, modular layout with generous whitespace, using relevant icons and data-viz shapes instead of paragraphs`;
      c.visual_style = c.visual_style ? `${c.visual_style}, crisp, professional infographic aesthetic` : `flat vector style, crisp, professional infographic aesthetic with clear visual hierarchy`;
      c.camera_composition = c.camera_composition || `straight-on view, 2D flat lay, organized grid or step-by-step layout`;
      c.detail_texture = c.detail_texture ? `${c.detail_texture}, topic-relevant vector icons, simple charts` : `topic-relevant vector icons, simple charts (donuts/bars), 1 main title matching article topic, max 6 short labels from the actual content key points (2-3 words each), 1 short CTA`;
      c.negative_constraints = (c.negative_constraints || '') + `, no body copy, no explanatory text blocks, no long sentences, no cluttered backgrounds, no photorealistic humans, no abstract labels disconnected from content`;
      break;

    case 'character':
      c.subject = `full-body character: ${c.subject}`;
      c.environment = c.environment || `simple background that does not distract from the character`;
      c.visual_style = c.visual_style || `highly detailed character concept art`;
      c.camera_composition = c.camera_composition || `3/4 view, full body, centered composition`;
      c.detail_texture = c.detail_texture ? `${c.detail_texture}, facial expression, clothing materials, consistent proportions` : `facial expression, clothing materials, small accessories, consistent proportions`;
      c.negative_constraints = (c.negative_constraints || '') + `, no flat infographic style, no data charts, avoid extra limbs, distorted anatomy, inconsistent face between shots`;
      break;

    case 'abstract_visual':
      c.subject = `abstract visual metaphor for ${c.subject}`;
      c.environment = c.environment || `minimal background with geometric shapes and gradients`;
      c.visual_style = c.visual_style || `abstract illustration, soft gradients, modern design`;
      c.camera_composition = c.camera_composition || `graphic, top-down or flat composition`;
      c.detail_texture = c.detail_texture || `smooth gradients, subtle texture, clear focal shape`;
      c.negative_constraints = (c.negative_constraints || '') + `, no literal screenshots, no text-heavy UI layouts, no literal human faces, no realistic objects unless they support the metaphor`;
      break;

    case 'ui_mockup':
      c.subject = `high-fidelity UI mockup for ${c.subject}`;
      c.environment = c.environment || `app screen or dashboard layout on a clean device frame`;
      c.visual_style = c.visual_style || `modern SaaS product UI, flat, clean, consistent spacing`;
      c.camera_composition = c.camera_composition || `straight-on view of the screen, slight perspective allowed`;
      c.detail_texture = c.detail_texture || `legible text blocks, consistent spacing, clear hierarchy, properly aligned components`;
      c.negative_constraints = (c.negative_constraints || '') + `, no hand-drawn elements, no fake design tool chrome, no unreadable tiny text`;
      break;

    case 'scene_illustration':
      c.subject = `a full narrative scene showing: ${c.subject}`;
      c.visual_style = c.visual_style || `digital illustration, vibrant colors, expressive lighting`;
      c.camera_composition = c.camera_composition || `cinematic framing, rule of thirds, dynamic angle`;
      c.detail_texture = c.detail_texture || `atmospheric elements, environmental storytelling details`;
      break;

    case 'product_render':
      c.subject = `photorealistic studio render of ${c.subject}`;
      c.environment = c.environment || `professional studio setting with controlled lighting`;
      c.visual_style = c.visual_style ? `${c.visual_style}, high-end product photography` : `high-end product photography, commercial advertising style`;
      c.camera_composition = c.camera_composition || `hero shot, slightly elevated angle, shallow depth of field`;
      c.detail_texture = c.detail_texture || `material properties, reflections, surface imperfections, brand logos`;
      c.lighting_color = c.lighting_color || `softbox lighting, rim lights, clean highlights`;
      break;

    case 'icon_or_sticker':
      c.subject = `single vector icon or sticker of ${c.subject}`;
      c.environment = c.environment || `plain white or transparent background`;
      c.visual_style = c.visual_style || `flat design, thick outlines, bold colors, sticker art style`;
      c.camera_composition = c.camera_composition || `centered, isolated subject, no cropping`;
      c.detail_texture = c.detail_texture || `clean lines, simple shapes, vector precision`;
      c.negative_constraints = (c.negative_constraints || '') + `, no background elements, no noise, no complexity`;
      break;
    
    case 'data_viz':
        c.subject = `data visualization chart representing ${c.subject}`;
        c.environment = c.environment || `clean dashboard background or white paper background`;
        c.visual_style = c.visual_style || `Tufte-style minimalist data viz, precise geometry`;
        c.camera_composition = c.camera_composition || `flat, 2D straight-on`;
        c.detail_texture = c.detail_texture || `precise grid lines, clear data points, legend`;
        break;

    default:
      break;
  }

  // Basic cleanup
  c.negative_constraints = c.negative_constraints.trim().replace(/^,/, '').trim();

  return c;
}
