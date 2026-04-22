import { UnifiedContext, UnifiedAnalysis, UserPromptOptions, PromptComponents, CustomColorTheme } from '../prompt-schema';

const COLOR_THEMES: Record<string, { description: string; moodHint: string }> = {
  light_neutral: { description: 'clean white and light gray background, dark text, subtle blue accents', moodHint: 'minimalist, professional, airy' },
  dark_saas: { description: 'deep slate or black background, white text, vibrant purple or blue primary buttons', moodHint: 'premium, modern, tech-focused' },
  warm_organic: { description: 'cream or beige background, earth tones, soft brown text, warm orange accents', moodHint: 'welcoming, natural, trustworthy' },
  cyber_blue: { description: 'dark background, neon cyan and electric blue highlights, futuristic feel', moodHint: 'energetic, futuristic, high-tech' },
  pastel_playful: { description: 'soft pastel background (mint, pink, or yellow), rounded shapes, friendly colors', moodHint: 'friendly, approachable, creative' },
  high_contrast: { description: 'stark black and white, bold typography, maximum legibility', moodHint: 'bold, clear, authoritative' },
};

function customThemeToText(theme?: CustomColorTheme): { description: string; moodHint: string } {
  if (!theme || !theme.stops?.length) return { description: '', moodHint: '' };

  const parts: string[] = [];
  const roleLabels: string[] = [];

  for (const stop of theme.stops) {
    const label =
      stop.name && stop.hex
        ? `${stop.name} (${stop.hex})`
        : stop.name || stop.hex || '';

    if (!label) continue;

    if (stop.role) {
      roleLabels.push(`${stop.role}: ${label}`);
    } else {
      parts.push(label);
    }
  }

  const paletteLine = [
    roleLabels.length ? `background/roles – ${roleLabels.join(', ')}` : '',
    parts.length ? `additional accents – ${parts.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('; ');

  return {
    description: `a custom brand color palette with ${paletteLine}`,
    moodHint: theme.mainMood || 'cohesive and consistent',
  };
}

function getColorThemeText(opts: UserPromptOptions): {
  description: string;
  moodHint: string;
} {
  if (!opts.colorThemeMode || opts.colorThemeMode === 'auto') {
    return { description: '', moodHint: '' };
  }

  if (opts.colorThemeMode === 'preset' && opts.presetColorThemeId) {
    return COLOR_THEMES[opts.presetColorThemeId] || { description: '', moodHint: '' };
  }

  if (opts.colorThemeMode === 'custom' && opts.customColorTheme && opts.customColorTheme.stops && opts.customColorTheme.stops.length > 0) {
    return customThemeToText(opts.customColorTheme);
  }

  if (opts.colorThemeMode === 'custom' && opts.customColorDescription) {
    return {
      description: opts.customColorDescription,
      moodHint: 'cohesive, consistent palette',
    };
  }

  return { description: '', moodHint: '' };
}

export function applyColorThemeToComponents(
  components: PromptComponents,
  opts: UserPromptOptions
): PromptComponents {
  const theme = getColorThemeText(opts);
  if (!theme.description) return components;

  const c = { ...components };
  c.lighting_color = `${c.lighting_color}. Use ${theme.description} with lighting that supports a ${theme.moodHint} feel.`.trim();
  c.mood_story = `${c.mood_story || ''} ${theme.moodHint}`.trim();
  return c;
}

/** Truncate text at the last word boundary before maxLen */
function truncateClean(text: string, maxLen: number): string {
  if (!text || text.length <= maxLen) return text;
  const trimmed = text.slice(0, maxLen);
  const lastSpace = trimmed.lastIndexOf(' ');
  return lastSpace > maxLen * 0.5 ? trimmed.slice(0, lastSpace) : trimmed;
}

/** Compact a component value: remove filler, limit length */
function compactValue(text: string | undefined, maxLen: number): string {
  if (!text) return '';
  // Remove filler phrases
  let t = text
    .replace(/\b(very|really|extremely|highly|super|ultra|absolutely|incredibly|amazingly)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return truncateClean(t, maxLen);
}

function buildEditSteps(updateAnalysis: UnifiedAnalysis): string[] {
  const steps: string[] = [];

  if (updateAnalysis.mustUpdate?.length) {
    for (const item of updateAnalysis.mustUpdate) {
      if (item.toLowerCase().includes('headline') || item.toLowerCase().includes('title')) {
        steps.push('Replace main headline to reflect new message, keep font style similar.');
      } else if (item.toLowerCase().includes('features') || item.toLowerCase().includes('sections')) {
        steps.push('Update feature cards/sections with new labels, same card layout.');
      } else if (item.toLowerCase().includes('metrics') || item.toLowerCase().includes('numbers')) {
        steps.push('Update charts/KPI tiles to match new metrics.');
      } else {
        steps.push(`Update: ${truncateClean(item, 80)}.`);
      }
    }
  }

  return steps;
}

/**
 * Build a clean, concise master prompt from the unified context.
 * The output should read like a professional creative brief, NOT a data dump.
 */
export function buildMasterPrompt(ctx: UnifiedContext): string {
  const { analysis: a, components: c, userOptions: u } = ctx;
  const imageType = u?.imageType || 'illustration';

  // ─── UPDATE MODE ─────────────────────────────────────────────
  if (a.screenshotMode === 'update_with_new_content') {
    const editSteps = buildEditSteps(a);
    const parts: string[] = [];

    parts.push(`Edit the existing image to match new content while preserving layout and brand style.`);

    if (a.oldSummary) parts.push(`Current: ${truncateClean(a.oldSummary, 120)}.`);
    if (a.newSummary) parts.push(`New: ${truncateClean(a.newSummary, 120)}.`);

    if (a.mustPreserve && a.mustPreserve.length > 0) {
      parts.push(`Preserve: ${a.mustPreserve.slice(0, 3).join('; ')}.`);
    }

    if (u) {
      const theme = getColorThemeText(u);
      if (theme.description) {
        parts.push(`Color theme: ${theme.description}.`);
      }
    }

    if (editSteps.length > 0) {
      parts.push(`Updates: ${editSteps.join(' ')}`);
    }

    parts.push(`Image type: ${imageType}. Senior designer quality, clear hierarchy.`);

    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  // ─── CREATE MODE ─────────────────────────────────────────────
  // Build a flowing creative brief, not a labeled data dump
  const parts: string[] = [];

  // Lead with the visual anchor if available — it's the strongest creative seed
  if (a.visual_anchor) {
    parts.push(truncateClean(a.visual_anchor, 200));
  }

  // Subject as the hero — weave into a natural sentence
  const subject = compactValue(c.subject, 160);
  if (subject) {
    parts.push(subject);
  }

  // Action in environment — combine for flow
  const action = compactValue(c.action_context, 100);
  const env = compactValue(c.environment, 120);
  if (action && env) {
    parts.push(`${action}, set in ${env}`);
  } else if (env) {
    parts.push(env);
  } else if (action) {
    parts.push(action);
  }

  // Style + mood woven naturally
  const style = compactValue(c.visual_style, 120);
  const mood = compactValue(c.mood_story, 80);
  if (style && mood) {
    parts.push(`Rendered in ${style}, evoking ${mood}`);
  } else if (style) {
    parts.push(`Rendered in ${style}`);
  } else if (mood) {
    parts.push(`Mood: ${mood}`);
  }

  // Lighting and camera as technical direction — combine for conciseness
  const lighting = compactValue(c.lighting_color, 100);
  const camera = compactValue(c.camera_composition, 100);
  if (lighting && camera) {
    parts.push(`${lighting}. ${camera}`);
  } else if (lighting) {
    parts.push(lighting);
  } else if (camera) {
    parts.push(camera);
  }

  // Detail texture — only if specific enough to matter
  const detail = compactValue(c.detail_texture, 100);
  if (detail && detail.length > 15) {
    parts.push(detail);
  }

  // Color theme
  if (u) {
    const theme = getColorThemeText(u);
    if (theme.description) {
      parts.push(`Color palette: ${theme.description}`);
    }
  }

  // Quality keywords
  const quality = compactValue(c.quality_realism, 80);
  if (quality) {
    parts.push(quality);
  }

  // Image type constraints — brief
  if (imageType === 'infographic') {
    parts.push('Infographic format: 1 title, max 6 short labels, 1 CTA, no body text');
  } else if (imageType === 'ui_mockup') {
    parts.push('Clean UI mockup with readable labels');
  }

  // Negative constraints
  if (c.negative_constraints) {
    const neg = compactValue(c.negative_constraints, 100);
    if (neg) parts.push(`Avoid: ${neg}`);
  }

  // Join with periods for clean sentence flow
  return parts
    .filter(Boolean)
    .map(s => s.replace(/[.,;]+$/, '').trim()) // strip trailing punctuation
    .join('. ')
    .replace(/\s+/g, ' ')
    .trim() + '.';
}
