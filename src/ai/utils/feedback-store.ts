
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'data', 'prompt-feedback-log.json');

export interface FeedbackEntry {
  timestamp: string;
  content_hash: string;
  master_prompt: string;
  image_type: string;
  platform: string;
  rating: number;
  notes?: string;
}

let writeLock = false;

export async function logFeedback(entry: FeedbackEntry) {
  // Simple lock to prevent concurrent writes
  while (writeLock) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  writeLock = true;
  try {
    let logs: FeedbackEntry[] = [];
    if (fsSync.existsSync(LOG_FILE)) {
      try {
        const data = await fs.readFile(LOG_FILE, 'utf-8');
        logs = JSON.parse(data);
      } catch {
        // ignore corrupted file
      }
    }
    logs.push(entry);
    await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2));
  } finally {
    writeLock = false;
  }
}
