"use server";

import { headers } from 'next/headers';
import { generateImagePromptsFromText } from "@/ai/flows/generate-image-prompts-from-text";
import { generateImagePromptsFromScreenshot } from "@/ai/flows/generate-image-prompts-from-screenshot";
import { AVAILABLE_MODELS } from "@/ai/genkit";

import { logFeedback, FeedbackEntry } from '@/ai/utils/feedback-store';
import { generationLimiter } from '@/ai/utils/rate-limiter';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { exec } from '@/lib/db';
import { getSettingBool, getSetting } from '@/lib/settings';

async function logUsage(model: string, inputType: string, durationMs: number) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId: number | null = null;
    if (token) {
      const auth = await verifyToken(token);
      if (auth) userId = auth.userId;
    }
    await exec(
      'INSERT INTO usage_log (user_id, model, input_type, duration_ms) VALUES (?, ?, ?, ?)',
      userId,
      model,
      inputType,
      durationMs
    );
  } catch (e) {
    console.warn('Failed to log usage:', e);
  }
}

type ActionResponse<T> = { success: true; data: T; meta?: Record<string, any> } | { success: false; error: string; errorType?: string };

async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get('x-forwarded-for')?.split(',')[0]?.trim()
    || hdrs.get('x-real-ip')
    || 'unknown';
}

export async function getAvailableModelsAction() {
  return AVAILABLE_MODELS;
}

export async function getRateLimitStatus() {
  const ip = await getClientIp();
  const [status, limit] = await Promise.all([
    generationLimiter.peek(ip),
    generationLimiter.getLimit(),
  ]);
  return {
    remaining: status.remaining,
    limit,
    used: status.used,
    resetIn: Math.ceil(status.resetIn / 60000), // minutes
  };
}

// ─── FALLBACK MODEL CHAIN ───────────────────────────────────────
// If selected model fails, automatically try the next model in the chain
// Only include models that are actually available (have API keys configured)
const FALLBACK_CHAIN = AVAILABLE_MODELS
  .filter(m => m.id === 'googleai/gemini-2.5-flash' || m.id === 'openai/deepseek-ai/deepseek-v3.2')
  .map(m => m.id);

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2000;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, attempt = 1): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      let delay = INITIAL_RETRY_DELAY_MS * Math.pow(1.5, attempt - 1);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Don't retry on 404 (model not found) — go to fallback instead
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        throw error;
      }

      const retryMatch = errorMessage.match(/retry in ([0-9.]+)s/);
      if (retryMatch && retryMatch[1]) {
        const recommendedWait = parseFloat(retryMatch[1]) * 1000;
        delay = Math.min(recommendedWait + 1000, 15000);
      }

      console.warn(`Action failed, retrying in ${Math.round(delay)}ms... (${retries} attempts left). Error: ${errorMessage.slice(0, 100)}`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, attempt + 1);
    }
    throw error;
  }
}

/**
 * Categorize errors for better user messaging
 */
function categorizeError(error: unknown): { message: string; type: string } {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes('404') || msg.includes('not found')) {
    return { message: 'The selected AI model is currently unavailable. Try a different model.', type: 'model_unavailable' };
  }
  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) {
    return { message: 'Rate limit reached. Please wait a moment and try again.', type: 'rate_limited' };
  }
  if (msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED')) {
    return { message: 'The AI service is slow or unreachable. Please try again.', type: 'timeout' };
  }
  if (msg.includes('Schema validation failed') || msg.includes('returned null')) {
    return { message: 'The AI model produced an invalid response. Try a different model or simpler input.', type: 'invalid_response' };
  }
  if (msg.includes('API key') || msg.includes('authentication') || msg.includes('unauthorized')) {
    return { message: 'API configuration error. Please check your settings.', type: 'auth_error' };
  }

  const truncated = msg.length > 120 ? msg.slice(0, 120) + '...' : msg;
  return { message: `Generation failed: ${truncated}`, type: 'unknown' };
}

export async function getPromptsFromText(
  blogText: string,
  style?: string,
  intent?: string,
  lengthMode?: string,
  model?: string,
  imageType?: string,
  glossLevel?: string,
  colorThemeMode?: string,
  presetColorThemeId?: string,
  customColorDescription?: string,
  customColorTheme?: any
): Promise<ActionResponse<Awaited<ReturnType<typeof generateImagePromptsFromText>>>> {
  // Maintenance mode check
  if (await getSettingBool('maintenance_mode')) {
    const msg = (await getSetting('maintenance_message')) || 'System is under maintenance. Please try again later.';
    return { success: false, error: msg, errorType: 'maintenance' };
  }

  // Rate limit check
  const ip = await getClientIp();
  const rateCheck = await generationLimiter.check(ip);
  if (!rateCheck.allowed) {
    const resetMin = Math.ceil(rateCheck.resetIn / 60000);
    const limit = await generationLimiter.getLimit();
    return {
      success: false,
      error: `Rate limit reached (${limit}/hour). Try again in ~${resetMin} minutes.`,
      errorType: 'rate_limited',
    };
  }

  const startTime = Date.now();
  const inputParams = {
    blogText,
    style: style as any,
    intent: intent as any,
    lengthMode: lengthMode as any,
    imageType: imageType as any,
    glossLevel: glossLevel as any,
    colorThemeMode: colorThemeMode as any,
    presetColorThemeId: presetColorThemeId as any,
    customColorDescription,
    customColorTheme
  };

  // Try with selected model first, then fallback chain
  const modelsToTry = [model, ...FALLBACK_CHAIN.filter(m => m !== model)];
  let lastError: unknown = null;
  let usedModel = model || 'googleai/gemini-2.5-flash';

  for (const currentModel of modelsToTry) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Trying model: ${currentModel || 'default'}`);
      }

      const result = await withRetry(() => generateImagePromptsFromText({
        ...inputParams,
        model: currentModel,
      }));

      usedModel = currentModel || 'googleai/gemini-2.5-flash';
      const elapsed = Date.now() - startTime;

      // Log usage for analytics
      logUsage(usedModel, 'text', elapsed);

      return {
        success: true,
        data: result,
        meta: {
          model: usedModel,
          elapsed,
          fallback: currentModel !== model,
          remaining: rateCheck.remaining,
        }
      };
    } catch (e) {
      lastError = e;
      const errMsg = e instanceof Error ? e.message : String(e);
      console.warn(`Model ${currentModel || 'default'} failed: ${errMsg.slice(0, 80)}. Trying next...`);
      continue;
    }
  }

  // All models failed
  console.error("All models failed:", lastError);
  const { message, type } = categorizeError(lastError);
  return { success: false, error: message, errorType: type };
}

export async function getAnalysisFromImage(
  photoDataUri: string,
  model?: string,
  imageType?: string,
  glossLevel?: string,
  redesignMode?: string,
  additionalImages?: string[],
  includeAccessibilityHints?: boolean,
  ocrText?: string,
  userText?: string,
  mode?: 'improve_only' | 'update_with_new_content',
  colorThemeMode?: string,
  presetColorThemeId?: string,
  customColorDescription?: string,
  customColorTheme?: any
): Promise<ActionResponse<Awaited<ReturnType<typeof generateImagePromptsFromScreenshot>>>> {
  // Maintenance mode check
  if (await getSettingBool('maintenance_mode')) {
    const msg = (await getSetting('maintenance_message')) || 'System is under maintenance. Please try again later.';
    return { success: false, error: msg, errorType: 'maintenance' };
  }

  // Rate limit check
  const ip = await getClientIp();
  const rateCheck = await generationLimiter.check(ip);
  if (!rateCheck.allowed) {
    const resetMin = Math.ceil(rateCheck.resetIn / 60000);
    const limit = await generationLimiter.getLimit();
    return {
      success: false,
      error: `Rate limit reached (${limit}/hour). Try again in ~${resetMin} minutes.`,
      errorType: 'rate_limited',
    };
  }

  const startTime = Date.now();
  const inputParams = {
    photoDataUri,
    imageType: imageType as any,
    glossLevel: glossLevel as any,
    redesignMode: redesignMode as any,
    additionalImages,
    includeAccessibilityHints,
    ocrText,
    userText,
    mode: (mode || 'improve_only') as 'improve_only' | 'update_with_new_content',
    colorThemeMode: colorThemeMode as any,
    presetColorThemeId: presetColorThemeId as any,
    customColorDescription,
    customColorTheme
  };

  // Try with selected model first, then fallback chain
  const modelsToTry = [model, ...FALLBACK_CHAIN.filter(m => m !== model)];
  let lastError: unknown = null;
  let usedModel = model || 'googleai/gemini-2.5-flash';

  for (const currentModel of modelsToTry) {
    try {
      const result = await withRetry(() => generateImagePromptsFromScreenshot({
        ...inputParams,
        model: currentModel,
      }));

      usedModel = currentModel || 'googleai/gemini-2.5-flash';
      const elapsed = Date.now() - startTime;

      // Log usage for analytics
      logUsage(usedModel, 'screenshot', elapsed);

      return {
        success: true,
        data: result,
        meta: {
          model: usedModel,
          elapsed,
          fallback: currentModel !== model,
          remaining: rateCheck.remaining,
        }
      };
    } catch (e) {
      lastError = e;
      const errMsg = e instanceof Error ? e.message : String(e);
      console.warn(`Screenshot model ${currentModel || 'default'} failed: ${errMsg.slice(0, 80)}. Trying next...`);
      continue;
    }
  }

  // All models failed
  console.error("All screenshot models failed:", lastError);
  const { message, type } = categorizeError(lastError);
  return { success: false, error: message, errorType: type };
}

export async function submitFeedback(entry: Omit<FeedbackEntry, 'timestamp'>): Promise<ActionResponse<void>> {
  try {
    await logFeedback({
      ...entry,
      timestamp: new Date().toISOString()
    });
    return { success: true, data: undefined };
  } catch (e) {
    console.error("Feedback submission failed:", e);
    return { success: false, error: "Failed to submit feedback." };
  }
}
