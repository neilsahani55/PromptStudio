/**
 * Freshness Engine — injects variety into every generation
 * Ensures no two prompts feel alike by randomizing visual approach,
 * artistic direction, camera work, and creative metaphors.
 */

// ─── VISUAL APPROACH POOLS ─────────────────────────────────────

const VISUAL_METAPHORS = [
  'floating islands connected by light bridges',
  'nested translucent layers revealing depth',
  'organic growth patterns emerging from geometric forms',
  'liquid metal morphing between states',
  'crystal formations refracting colored light',
  'paper craft diorama with layered cutouts',
  'holographic projections on dark glass',
  'botanical illustration meets tech interface',
  'topographic map contours with data overlays',
  'stained glass mosaic with modern geometry',
  'origami structures unfolding in space',
  'aurora borealis gradients flowing through architecture',
  'microscopic cellular structures at macro scale',
  'clockwork mechanisms with transparent casings',
  'watercolor bleeds meeting sharp vector lines',
  'neon wireframe overlaid on matte surfaces',
  'terrazzo pattern with embedded icons',
  'satellite view of abstract data landscapes',
  'bioluminescent organisms in digital space',
  'architectural blueprint with 3D elements emerging',
];

const ART_DIRECTIONS = [
  'Bauhaus-inspired geometric clarity',
  'Japanese ukiyo-e woodblock aesthetic with modern palette',
  'Swiss International Style grid precision',
  'Art Deco metallic elegance',
  'Scandinavian minimal warmth',
  'Memphis Design playful geometry',
  'Cyberpunk neon noir atmosphere',
  'Brutalist raw concrete textures',
  'Retro-futurism 1960s space age optimism',
  'Wes Anderson symmetrical pastel palette',
  'Studio Ghibli painterly warmth',
  'Dieter Rams functional minimalism',
  'Isometric pixel art at high resolution',
  'Risograph print texture with offset colors',
  'Glassmorphism with depth and blur layers',
  'Claymation 3D render softness',
  'Duotone high-contrast editorial',
  'Vaporwave gradient dreamscape',
  'Nordic dark mode elegance',
  'Material Design 3 with dynamic color',
];

const CAMERA_APPROACHES = [
  'extreme close-up macro lens, f/1.4, razor-thin focus plane',
  'bird\'s eye view looking straight down, flat-lay composition',
  'dramatic low angle looking up, hero perspective',
  'Dutch angle tilt creating dynamic tension',
  'wide-angle 24mm establishing shot with foreground interest',
  'telephoto compression, stacked layers, shallow depth',
  'fisheye distortion at edges, immersive center',
  'tilt-shift miniature effect, selective focus band',
  'symmetrical dead-center framing, Kubrick-style',
  'over-the-shoulder perspective with depth layers',
  'split-screen diptych composition',
  'golden spiral composition guiding the eye',
  'negative space dominant, subject small but powerful',
  'frame-within-frame using architectural elements',
  'rack focus blur transitioning between foreground and background',
];

const LIGHTING_MOODS = [
  'golden hour warmth with long shadows',
  'blue hour twilight, cool ambient glow',
  'harsh top-down spotlight, deep pool shadows',
  'rim lighting silhouette with color-gelled edges',
  'overcast diffused light, no harsh shadows, even tone',
  'neon underglow reflecting off wet surfaces',
  'candlelight flicker, warm intimate pools',
  'split lighting, half face in shadow, dramatic',
  'backlit haze with volumetric god rays',
  'flat fashion lighting, beauty dish, minimal shadow',
  'chiaroscuro dramatic contrast, Caravaggio-inspired',
  'moonlight blue cast with specular highlights',
  'LED strip ambient glow in dark environment',
  'sunset gradient sky casting warm-to-cool transition',
  'studio three-point setup, clean commercial look',
];

const COLOR_MOODS = [
  'deep navy and burnt orange contrast',
  'sage green and warm cream natural palette',
  'electric violet and cyan futuristic scheme',
  'terracotta and dusty rose earthy warmth',
  'charcoal and gold premium luxury tones',
  'coral pink and teal refreshing energy',
  'midnight purple and silver tech elegance',
  'forest green and amber natural depth',
  'ice blue and white clinical purity',
  'rust and olive vintage warmth',
  'hot pink and lime bold pop energy',
  'slate blue and peach soft professionalism',
  'emerald and copper rich sophistication',
  'lavender and mint calming serenity',
  'black and neon yellow stark modernity',
];

// ─── FRESHNESS PICKER ───────────────────────────────────────────

function secureRandom(max: number): number {
  return Math.floor(Math.random() * max);
}

function pickRandom<T>(arr: T[]): T {
  return arr[secureRandom(arr.length)];
}

function pickMultiple<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export interface FreshnessProfile {
  visualMetaphor: string;
  artDirection: string;
  cameraApproach: string;
  lightingMood: string;
  colorMood: string;
}

/**
 * Generate a unique creative direction for this generation.
 * No two calls will return the same combination.
 */
export function generateFreshnessProfile(): FreshnessProfile {
  return {
    visualMetaphor: pickRandom(VISUAL_METAPHORS),
    artDirection: pickRandom(ART_DIRECTIONS),
    cameraApproach: pickRandom(CAMERA_APPROACHES),
    lightingMood: pickRandom(LIGHTING_MOODS),
    colorMood: pickRandom(COLOR_MOODS),
  };
}

/**
 * Build a freshness hint string to inject into the AI prompt.
 * These are OPTIONAL creative seeds — content accuracy always comes first.
 */
export function buildFreshnessHint(profile: FreshnessProfile): string {
  return `**CREATIVE SEEDS (optional inspiration — use ONLY if they fit the content):**
- Visual concept seed: ${profile.visualMetaphor}
- Art direction seed: ${profile.artDirection}
- Camera seed: ${profile.cameraApproach}
- Lighting seed: ${profile.lightingMood}
- Color seed: ${profile.colorMood}
⚠️ These seeds are SUGGESTIONS, not requirements. IGNORE any seed that doesn't naturally fit the content topic. A clear, accurate image always beats an artistically ambitious but confusing one. Never force a metaphor — if the content is about phone calls, show phones/communication, not origami structures.`;
}

/**
 * Generate 3 distinctly different freshness profiles for variants
 */
export function generateVariantProfiles(): [FreshnessProfile, FreshnessProfile, FreshnessProfile] {
  const metaphors = pickMultiple(VISUAL_METAPHORS, 3);
  const arts = pickMultiple(ART_DIRECTIONS, 3);
  const cameras = pickMultiple(CAMERA_APPROACHES, 3);
  const lights = pickMultiple(LIGHTING_MOODS, 3);
  const colors = pickMultiple(COLOR_MOODS, 3);

  return [
    { visualMetaphor: metaphors[0], artDirection: arts[0], cameraApproach: cameras[0], lightingMood: lights[0], colorMood: colors[0] },
    { visualMetaphor: metaphors[1], artDirection: arts[1], cameraApproach: cameras[1], lightingMood: lights[1], colorMood: colors[1] },
    { visualMetaphor: metaphors[2], artDirection: arts[2], cameraApproach: cameras[2], lightingMood: lights[2], colorMood: colors[2] },
  ];
}
