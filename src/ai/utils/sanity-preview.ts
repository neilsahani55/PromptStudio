
import { ai } from '@/ai/genkit';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2000;

async function generateWithRetry(prompt: string, retries = MAX_RETRIES, attempt = 1): Promise<string> {
  try {
    const { text } = await ai.generate({
      prompt: prompt,
      config: {
        temperature: 0.5,
      }
    });
    return text;
  } catch (error) {
    if (retries > 0) {
      let delay = INITIAL_RETRY_DELAY_MS * Math.pow(1.5, attempt - 1); // Exponential backoff

      // Check for specific "retry in Xs" message from Gemini
      const errorMessage = error instanceof Error ? error.message : String(error);
      const retryMatch = errorMessage.match(/retry in ([0-9.]+)s/);
      if (retryMatch && retryMatch[1]) {
        const recommendedWait = parseFloat(retryMatch[1]) * 1000;
        // Cap the wait time to 15 seconds to avoid hanging too long
        delay = Math.min(recommendedWait + 1000, 15000);
      }

      console.warn(`Sanity Preview failed, retrying in ${Math.round(delay)}ms... (${retries} attempts left). Error: ${errorMessage.slice(0, 100)}`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return generateWithRetry(prompt, retries - 1, attempt + 1);
    }
    throw error;
  }
}

export async function generateSanityPreview(masterPrompt: string, originalContent?: string): Promise<string> {
  try {
    const contentClause = originalContent
      ? `\n\nOriginal article topic: "${originalContent.slice(0, 200)}..."\n\nAlso check: Would a viewer immediately understand this image is about the article's topic? If the image subject is disconnected from the article topic (e.g., article is about phone calls but image shows architectural structures), mark as CONTENT-MISMATCH.`
      : '';

    const text = await generateWithRetry(`Imagine an image model rendered this prompt exactly:

      "${masterPrompt}"

      In 2 sentences, describe what the resulting image would look like in plain language.
      Focus on the subject, action, and mood.

      Then on a new line, write one of these verdicts:
      - GOOD: The image is specific, visually interesting, and clearly communicates its subject
      - STOCK-LIKE: The image feels generic, cliché, or like stock photography
      - CONTENT-MISMATCH: The image doesn't clearly represent the actual topic${contentClause}`);
    return text;
  } catch (e) {
    console.error("Sanity Preview completely failed:", e);
    return "Preview unavailable (High Traffic).";
  }
}
