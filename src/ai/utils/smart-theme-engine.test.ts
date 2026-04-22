
import { analyzeAndSelectTheme } from './smart-theme-engine';
import { UnifiedAnalysis } from '../prompt-schema';

console.log('Running Content-Aware Theme Engine Tests...\n');

const testCases: { name: string; input: Partial<UnifiedAnalysis>; expectedTheme: string }[] = [
  {
    name: 'Healthcare - Medical Clinic',
    input: {
      intent: 'healthcare website',
      tone: 'professional, clean, medical',
      keyPoints: ['doctor', 'patient care', 'clinic', 'health'],
      contentSummary: 'A website for a local medical clinic offering patient care.',
      visualGoals: 'clean, hygienic, trustworthy'
    },
    expectedTheme: 'healthcare_clean'
  },
  {
    name: 'Finance - Crypto Wallet',
    input: {
      intent: 'fintech app',
      tone: 'modern, secure, innovative',
      keyPoints: ['crypto', 'blockchain', 'wallet', 'bitcoin'],
      contentSummary: 'A mobile app for managing cryptocurrency assets.',
      visualGoals: 'dark mode, neon accents, tech-forward'
    },
    expectedTheme: 'fintech_modern'
  },
  {
    name: 'Creative - Art Festival',
    input: {
      intent: 'event poster',
      tone: 'vibrant, artistic, bold',
      keyPoints: ['art', 'festival', 'music', 'creative'],
      contentSummary: 'A poster for a summer art and music festival.',
      visualGoals: 'colorful, energetic, expressive'
    },
    expectedTheme: 'creative_vibrant'
  },
  {
    name: 'E-commerce - Luxury Watch',
    input: {
      intent: 'product landing page',
      tone: 'luxury, premium, exclusive',
      keyPoints: ['watch', 'gold', 'expensive', 'timepiece'],
      contentSummary: 'A landing page for a high-end luxury watch brand.',
      visualGoals: 'elegant, sophisticated, high-end'
    },
    expectedTheme: 'ecom_luxury'
  },
  {
    name: 'SaaS - Developer Tool',
    input: {
      intent: 'dashboard',
      tone: 'technical, sleek, dark mode',
      keyPoints: ['code', 'developer', 'terminal', 'api'],
      contentSummary: 'A dashboard for developers to manage API keys.',
      visualGoals: 'dark UI, code snippets, high contrast'
    },
    expectedTheme: 'saas_dark'
  },
  {
    name: 'Wellness - Yoga Studio',
    input: {
      intent: 'brochure',
      tone: 'calm, peaceful, organic',
      keyPoints: ['yoga', 'meditation', 'wellness', 'nature'],
      contentSummary: 'A brochure for a new yoga and meditation retreat.',
      visualGoals: 'soft colors, natural textures, zen'
    },
    expectedTheme: 'wellness_soft'
  },
  {
    name: 'Corporate - Law Firm',
    input: {
      intent: 'corporate website',
      tone: 'professional, trustworthy, serious',
      keyPoints: ['law', 'legal', 'attorney', 'justice'],
      contentSummary: 'A website for a prestigious corporate law firm.',
      visualGoals: 'traditional, stable, reliable'
    },
    expectedTheme: 'corporate_trust'
  },
  {
    name: 'Eco - Sustainable Energy',
    input: {
      intent: 'infographic',
      tone: 'green, sustainable, eco-friendly',
      keyPoints: ['solar', 'energy', 'environment', 'recycle'],
      contentSummary: 'An infographic about renewable energy sources.',
      visualGoals: 'natural, fresh, clean'
    },
    expectedTheme: 'eco_green'
  },
  {
    name: 'Tech - Cloud Platform',
    input: {
      intent: 'b2b landing page',
      tone: 'scalable, corporate, blue',
      keyPoints: ['cloud', 'data', 'server', 'network'],
      contentSummary: 'A B2B platform for enterprise cloud storage.',
      visualGoals: 'clean, organized, tech-blue'
    },
    expectedTheme: 'tech_light'
  },
  {
    name: 'Retail - Toy Store',
    input: {
      intent: 'social media post',
      tone: 'friendly, playful, fun',
      keyPoints: ['toys', 'kids', 'family', 'game'],
      contentSummary: 'A promo post for a local toy store sale.',
      visualGoals: 'bright, happy, colorful'
    },
    expectedTheme: 'ecom_friendly'
  }
];

let passed = 0;
let failed = 0;

testCases.forEach((tc, index) => {
  // Cast partial input to UnifiedAnalysis (mocking required fields)
  const mockAnalysis = {
    ...tc.input,
    combinedText: tc.input.contentSummary || '',
    userText: '',
    ocrText: '',
    audience: 'general',
    visualSummary: '',
    layoutDescription: '',
    uiElements: [],
    keepStructure: false,
    verdict: 'perfect',
    alignmentNotes: '',
    brandStyle: '',
    aspectRatioSuggestion: '',
  } as UnifiedAnalysis;

  const result = analyzeAndSelectTheme(mockAnalysis);
  
  // Strict check: Map labels to keys for verification
  const labelMap: Record<string, string> = {
      'Corporate Trust': 'corporate_trust',
      'Modern Fintech': 'fintech_modern',
      'Clinical Clean': 'healthcare_clean',
      'Soft Wellness': 'wellness_soft',
      'Vibrant Creative': 'creative_vibrant',
      'Minimal Portfolio': 'minimal_portfolio',
      'Dark Mode SaaS': 'saas_dark',
      'Enterprise Tech': 'tech_light',
      'Luxury Retail': 'ecom_luxury',
      'Friendly Marketplace': 'ecom_friendly',
      'Eco Green': 'eco_green'
  };
  
  const detectedKey = labelMap[result.label || ''] || 'unknown';
  
  if (detectedKey === tc.expectedTheme) {
      console.log(`✅ Test ${index + 1}: ${tc.name} -> MATCHED (${detectedKey})`);
      passed++;
  } else {
      console.log(`❌ Test ${index + 1}: ${tc.name} -> FAILED`);
      console.log(`   Expected: ${tc.expectedTheme}`);
      console.log(`   Got:      ${detectedKey} ("${result.label}")`);
      failed++;
  }
});

console.log(`\nResults: ${passed} Passed, ${failed} Failed`);

if (failed > 0) process.exit(1);
