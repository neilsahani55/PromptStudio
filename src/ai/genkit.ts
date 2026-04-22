import {genkit, z, GenerationCommonConfigSchema} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {openAI} from 'genkitx-openai';

const OpenAiConfigSchema = GenerationCommonConfigSchema.extend({
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  logitBias: z.record(z.string(), z.number().min(-100).max(100)).optional(),
  logProbs: z.boolean().optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  seed: z.number().int().optional(),
  topLogProbs: z.number().int().min(0).max(20).optional(),
  user: z.string().optional(),
  visualDetailLevel: z.enum(["auto", "low", "high"]).optional(),
  extra_body: z.any().optional()
});

if (!process.env.GOOGLE_GENAI_API_KEY) {
  console.warn("WARNING: GOOGLE_GENAI_API_KEY not set. The default Gemini model will not work.");
}

const plugins = [googleAI()];

// Export available models list for the UI to consume
export const AVAILABLE_MODELS = [
  { id: 'googleai/gemini-2.5-flash', label: 'Gemini 2.5 Flash' }
];

if (process.env.NVIDIA_API_KEY) {
  plugins.push(
    openAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
      models: [
        {
          name: 'openai/gpt-oss-120b',
          info: {
            label: 'GPT-OSS 120B',
            supports: { multiturn: true, media: false, tools: true },
            versions: ['openai/gpt-oss-120b']
          },
          configSchema: OpenAiConfigSchema
        },
        {
          name: 'deepseek-ai/deepseek-v3.2',
          info: {
            label: 'DeepSeek V3.2',
            supports: { multiturn: true, media: false, tools: true },
            versions: ['deepseek-ai/deepseek-v3.2']
          },
          configSchema: OpenAiConfigSchema
        },
        {
          name: 'qwen/qwen3.5-397b-a17b',
          info: {
            label: 'Qwen 3.5 (397B)',
            supports: { multiturn: true, media: false, tools: true },
            versions: ['qwen/qwen3.5-397b-a17b']
          },
          configSchema: OpenAiConfigSchema
        },
        {
          name: 'z-ai/glm4.7',
          info: {
            label: 'GLM 4.7',
            supports: { multiturn: true, media: false, tools: true },
            versions: ['z-ai/glm4.7']
          },
          configSchema: OpenAiConfigSchema
        },
        {
          name: 'moonshotai/kimi-k2-instruct-0905',
          info: {
            label: 'Moonshot AI / Kimi k2 Instruct',
            supports: { multiturn: true, media: false, tools: true },
            versions: ['moonshotai/kimi-k2-instruct-0905']
          },
          configSchema: OpenAiConfigSchema
        }
      ]
    })
  );

  // Add NVIDIA models to available list
  AVAILABLE_MODELS.push(
    { id: 'openai/deepseek-ai/deepseek-v3.2', label: 'DeepSeek V3' },
    { id: 'openai/moonshotai/kimi-k2-instruct-0905', label: 'Moonshot Kimi k2 Instruct' },
    { id: 'openai/qwen/qwen3.5-397b-a17b', label: 'Qwen 3.5 (397B)' },
    { id: 'openai/z-ai/glm4.7', label: 'GLM 4.7' },
    { id: 'openai/openai/gpt-oss-120b', label: 'GPT-OSS 120B (NVIDIA)' }
  );
} else {
  console.warn("NVIDIA_API_KEY not found. NVIDIA models will be unavailable.");
}

export const ai = genkit({
  plugins,
  model: 'googleai/gemini-2.5-flash',
});
