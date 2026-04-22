
import { ai } from '@/ai/genkit';

export async function cleanOCRText(rawText: string): Promise<string> {
  if (!rawText || rawText.length < 10) return rawText;

  // Simple regex cleanup first
  let cleaned = rawText
    .replace(/File|Edit|View|Help|Window/g, '') // Common menu items
    .replace(/© \d{4}.*/g, '') // Copyright
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();

  // If text is still long/messy, use AI
  if (cleaned.length > 200) {
    try {
        const { text } = await ai.generate({
            prompt: `Here is noisy OCR output from a UI screenshot. Clean and compress it into:
            - Main heading(s)
            - Key section titles
            - 3–7 most important labels
            
            Ignore repeated or irrelevant UI boilerplate.
            
            OCR Text:
            ${cleaned}`,
        });
        return text;
    } catch (e) {
        console.warn("OCR cleaning failed", e);
        return cleaned;
    }
  }

  return cleaned;
}
