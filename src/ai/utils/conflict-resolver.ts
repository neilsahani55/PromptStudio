
import { ai } from '@/ai/genkit';
import { PromptComponents } from '@/ai/prompt-schema';

const CONFLICT_PAIRS = [
  ['minimalist', 'cluttered'],
  ['minimalist', 'busy'],
  ['minimalist', 'ornate'],
  ['realistic', 'cartoon'],
  ['realistic', 'flat'],
  ['photographic', 'vector'],
  ['photographic', 'sketch'],
  ['professional', 'hand-drawn'],
  ['professional', 'sketchy'],
  ['clean', 'grunge'],
  ['modern', 'retro'], // Context dependent, but often conflicting
  ['matte', 'glossy'], // Context dependent
];

export async function detectAndResolveConflicts(components: PromptComponents): Promise<PromptComponents> {
  const allText = Object.values(components).join(' ').toLowerCase();
  const foundConflicts: string[][] = [];

  for (const pair of CONFLICT_PAIRS) {
    const [termA, termB] = pair;
    if (allText.includes(termA) && allText.includes(termB)) {
      foundConflicts.push(pair);
    }
  }

  if (foundConflicts.length === 0) {
    return components;
  }

  // If conflicts found, ask AI to resolve
  try {
    const { text } = await ai.generate({
      prompt: `You are a design director. I have detected style conflicts in these image prompt components:
      
      Conflicts: ${JSON.stringify(foundConflicts)}
      
      Current Components:
      ${JSON.stringify(components, null, 2)}
      
      Task:
      1. Choose the most coherent direction based on the overall intent.
      2. Rewrite the components to eliminate the conflict.
      3. Return ONLY the updated JSON object matching the PromptComponents schema.
      `,
      output: { format: 'json' } // Ask for JSON format
    });

    // Parse the result (assuming genkit handles JSON parsing if schema is provided, 
    // but here we might just get text if we don't pass the full Zod schema object easily.
    // Let's rely on Genkit's structured output if possible, or just parse text.)

    // Robust JSON extraction — find the outermost balanced braces
    let depth = 0, start = -1, end = -1;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') { if (depth === 0) start = i; depth++; }
      else if (text[i] === '}') { depth--; if (depth === 0 && start !== -1) { end = i; break; } }
    }
    if (start === -1 || end === -1) {
      throw new Error("No JSON found in response");
    }
    const parsed = JSON.parse(text.slice(start, end + 1));
    // Validate parsed result has expected shape
    if (!parsed || typeof parsed !== 'object' || !parsed.subject) {
      throw new Error("Parsed result does not match PromptComponents shape");
    }
    return parsed as PromptComponents;

  } catch (error) {
    console.warn("Failed to resolve conflicts with AI, returning original.", error);
    return components;
  }
}

export function resolveStyleConflicts(components: PromptComponents): PromptComponents {
  const result = { ...components };
  let text = Object.values(result).join(' ').toLowerCase();

  const conflicts = [
    { keep: 'minimalist', drop: ['cluttered', 'busy', 'ornate'] },
    { keep: 'flat vector', drop: ['photorealistic', 'cinematic photo'] },
    { keep: 'abstract', drop: ['screenshot', 'literal ui'] },
  ];

  for (const c of conflicts) {
    if (text.includes(c.keep)) {
      for (const d of c.drop) {
        for (const key of Object.keys(components) as (keyof PromptComponents)[]) {
          if (typeof result[key] === 'string') {
            result[key] = (result[key] as string).replace(
              new RegExp(`\\b${d}\\b`, 'gi'),
              ''
            );
          }
        }
      }
    }
  }

  return result;
}
