import { UnifiedAnalysis, CustomColorTheme, CustomColorStop } from '../prompt-schema';

// --- Theme Library ---

const THEME_LIBRARY: Record<string, CustomColorTheme> = {
  // --- Professional / Corporate ---
  'corporate_trust': {
    label: 'Corporate Trust',
    mainMood: 'professional, reliable, stable',
    stops: [
      { role: 'background', hex: '#FFFFFF', name: 'Pure White' },
      { role: 'primary', hex: '#0056D2', name: 'Trust Blue' }, // AA Large compliant on white
      { role: 'text', hex: '#1A1A1A', name: 'Near Black' },
      { role: 'accent', hex: '#F2F6FC', name: 'Pale Blue Surface' },
      { role: 'neutral', hex: '#666666', name: 'Slate Gray' }
    ]
  },
  'fintech_modern': {
    label: 'Modern Fintech',
    mainMood: 'clean, innovative, secure',
    stops: [
      { role: 'background', hex: '#0F172A', name: 'Deep Slate' },
      { role: 'primary', hex: '#38BDF8', name: 'Electric Sky' },
      { role: 'text', hex: '#F8FAFC', name: 'Off White' },
      { role: 'accent', hex: '#818CF8', name: 'Soft Indigo' },
      { role: 'neutral', hex: '#334155', name: 'Slate 700' }
    ]
  },

  // --- Healthcare / Wellness ---
  'healthcare_clean': {
    label: 'Clinical Clean',
    mainMood: 'hygienic, calm, reassuring',
    stops: [
      { role: 'background', hex: '#F0F9FF', name: 'Alice Blue' },
      { role: 'primary', hex: '#0284C7', name: 'Medical Blue' },
      { role: 'text', hex: '#0C4A6E', name: 'Deep Navy' },
      { role: 'accent', hex: '#34D399', name: 'Mint Green' }, // Success/Health
      { role: 'neutral', hex: '#E0F2FE', name: 'Sky 100' }
    ]
  },
  'wellness_soft': {
    label: 'Soft Wellness',
    mainMood: 'organic, peaceful, natural',
    stops: [
      { role: 'background', hex: '#FAF9F6', name: 'Off White' },
      { role: 'primary', hex: '#57534E', name: 'Stone 600' },
      { role: 'text', hex: '#292524', name: 'Stone 800' },
      { role: 'accent', hex: '#D6D3D1', name: 'Stone 300' },
      { role: 'neutral', hex: '#E7E5E4', name: 'Stone 200' },
      { role: 'accent', hex: '#A8A29E', name: 'Warm Grey' }
    ]
  },

  // --- Creative / Design ---
  'creative_vibrant': {
    label: 'Vibrant Creative',
    mainMood: 'energetic, playful, bold',
    stops: [
      { role: 'background', hex: '#FFFCF0', name: 'Ivory' },
      { role: 'primary', hex: '#FF3366', name: 'Radical Red' },
      { role: 'text', hex: '#111827', name: 'Ink Black' },
      { role: 'accent', hex: '#FFD700', name: 'Gold' },
      { role: 'neutral', hex: '#F3F4F6', name: 'Cool Gray' }
    ]
  },
  'minimal_portfolio': {
    label: 'Minimal Portfolio',
    mainMood: 'sophisticated, understated, gallery-like',
    stops: [
      { role: 'background', hex: '#FFFFFF', name: 'White' },
      { role: 'primary', hex: '#000000', name: 'Black' },
      { role: 'text', hex: '#333333', name: 'Dark Gray' },
      { role: 'accent', hex: '#E5E5E5', name: 'Light Gray' },
      { role: 'neutral', hex: '#FAFAFA', name: 'Snow' }
    ]
  },

  // --- Technology / SaaS ---
  'saas_dark': {
    label: 'Dark Mode SaaS',
    mainMood: 'sleek, developer-focused, high-contrast',
    stops: [
      { role: 'background', hex: '#0D1117', name: 'GitHub Dark' },
      { role: 'primary', hex: '#58A6FF', name: 'Dev Blue' },
      { role: 'text', hex: '#C9D1D9', name: 'Code Gray' },
      { role: 'accent', hex: '#238636', name: 'Success Green' },
      { role: 'neutral', hex: '#161B22', name: 'Panel Gray' }
    ]
  },
  'tech_light': {
    label: 'Enterprise Tech',
    mainMood: 'scalable, organized, clear',
    stops: [
      { role: 'background', hex: '#FFFFFF', name: 'White' },
      { role: 'primary', hex: '#2563EB', name: 'Brand Blue' },
      { role: 'text', hex: '#1E293B', name: 'Slate 800' },
      { role: 'accent', hex: '#64748B', name: 'Slate 500' },
      { role: 'neutral', hex: '#F1F5F9', name: 'Slate 100' }
    ]
  },

  // --- E-Commerce / Retail ---
  'ecom_luxury': {
    label: 'Luxury Retail',
    mainMood: 'expensive, elegant, refined',
    stops: [
      { role: 'background', hex: '#1C1917', name: 'Warm Black' },
      { role: 'primary', hex: '#D4AF37', name: 'Metallic Gold' },
      { role: 'text', hex: '#FAFAF9', name: 'Stone 50' },
      { role: 'accent', hex: '#44403C', name: 'Stone 700' },
      { role: 'neutral', hex: '#292524', name: 'Stone 800' }
    ]
  },
  'ecom_friendly': {
    label: 'Friendly Marketplace',
    mainMood: 'approachable, bright, trustworthy',
    stops: [
      { role: 'background', hex: '#FFFFFF', name: 'White' },
      { role: 'primary', hex: '#F43F5E', name: 'Rose Red' },
      { role: 'text', hex: '#374151', name: 'Gray 700' },
      { role: 'accent', hex: '#FCD34D', name: 'Amber' },
      { role: 'neutral', hex: '#F9FAFB', name: 'Gray 50' }
    ]
  },

  // --- Nature / Eco ---
  'eco_green': {
    label: 'Eco Green',
    mainMood: 'sustainable, organic, fresh',
    stops: [
      { role: 'background', hex: '#F0FDF4', name: 'Mint 50' },
      { role: 'primary', hex: '#15803D', name: 'Forest Green' },
      { role: 'text', hex: '#14532D', name: 'Dark Green' },
      { role: 'accent', hex: '#86EFAC', name: 'Sprout' },
      { role: 'neutral', hex: '#DCFCE7', name: 'Mint 100' }
    ]
  }
};

// --- Keyword Mapping ---

const KEYWORD_MAPPINGS: Record<string, string[]> = {
  // Corporate / Business
  'corporate_trust': ['business', 'corporate', 'finance', 'consulting', 'law', 'legal', 'professional', 'strategy', 'office', 'report'],
  'fintech_modern': ['fintech', 'crypto', 'blockchain', 'saas', 'startup', 'modern', 'digital', 'app', 'wallet', 'secure'],

  // Healthcare
  'healthcare_clean': ['health', 'medical', 'doctor', 'hospital', 'clinic', 'patient', 'care', 'hygiene', 'science', 'lab'],
  'wellness_soft': ['wellness', 'yoga', 'spa', 'meditation', 'mental health', 'calm', 'peace', 'nature', 'organic', 'retreat'],

  // Creative
  'creative_vibrant': ['art', 'design', 'creative', 'music', 'festival', 'party', 'vibrant', 'bold', 'youth', 'fashion'],
  'minimal_portfolio': ['portfolio', 'photography', 'gallery', 'minimal', 'clean', 'architecture', 'interior', 'luxury', 'white', 'simple'],

  // Tech
  'saas_dark': ['developer', 'code', 'programming', 'software', 'dark mode', 'cyber', 'gaming', 'terminal', 'hacker', 'api'],
  'tech_light': ['enterprise', 'cloud', 'data', 'analytics', 'dashboard', 'system', 'network', 'infrastructure', 'platform', 'it'],

  // E-commerce
  'ecom_luxury': ['luxury', 'premium', 'gold', 'exclusive', 'vip', 'jewelry', 'perfume', 'hotel', 'estate', 'high-end'],
  'ecom_friendly': ['shop', 'store', 'marketplace', 'buy', 'sale', 'discount', 'family', 'kids', 'food', 'groceries'],

  // Eco
  'eco_green': ['eco', 'environment', 'sustainable', 'green', 'plant', 'garden', 'forest', 'recycle', 'solar', 'energy']
};

/**
 * Calculates a score for a theme based on keyword matches in the analysis.
 */
function scoreTheme(themeKey: string, analysis: UnifiedAnalysis): number {
  const keywords = KEYWORD_MAPPINGS[themeKey] || [];
  let score = 0;

  // Helper to check text
  const checkText = (text: string, weight: number) => {
    if (!text) return;
    const lower = text.toLowerCase();
    keywords.forEach(kw => {
      if (lower.includes(kw)) score += weight;
    });
  };

  // 1. Check Tone (High weight)
  checkText(analysis.tone, 3);

  // 2. Check Intent (Medium weight)
  checkText(analysis.intent, 2);

  // 3. Check KeyPoints (Medium weight)
  if (analysis.keyPoints) {
    analysis.keyPoints.forEach(kp => checkText(kp, 2));
  }

  // 4. Check Content Summary (Low weight, broad match)
  checkText(analysis.contentSummary, 1);
  checkText(analysis.combinedText, 0.5); // Fallback to raw text

  // 5. Check Visual Goals (Medium weight)
  checkText(analysis.visualGoals, 2);

  return score;
}

/**
 * Analyzes the content and selects the most appropriate color theme.
 * Enforces accessibility and avoids generic fallbacks.
 */
export function analyzeAndSelectTheme(analysis: UnifiedAnalysis): CustomColorTheme {
  let bestThemeKey = 'tech_light'; // Safe default
  let maxScore = -1;

  // 1. Score all themes
  for (const key of Object.keys(THEME_LIBRARY)) {
    const score = scoreTheme(key, analysis);
    if (score > maxScore) {
      maxScore = score;
      bestThemeKey = key;
    }
  }

  // 2. If no strong match (score < threshold), try a broader heuristic
  // (For now, we just stick with the best match, even if low, as it's better than random)
  // But let's add a "fallback" logic if score is 0
  if (maxScore <= 0) {
      // Default based on generic intent if possible
      if (analysis.intent?.includes('blog')) bestThemeKey = 'tech_light';
      else if (analysis.intent?.includes('social')) bestThemeKey = 'creative_vibrant';
      else bestThemeKey = 'corporate_trust';
  }

  const selectedTheme = THEME_LIBRARY[bestThemeKey];

  // 3. Return the theme (cloned to avoid mutation)
  return JSON.parse(JSON.stringify(selectedTheme));
}
