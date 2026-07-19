import { queryRow, exec } from './db';

/**
 * Daily generation credits. Every user gets DAILY_CREDITS per calendar day
 * (UTC): images cost 1, videos cost 2. Admins are unlimited. Usage is recorded
 * in the media_credits ledger; failed generations are refunded.
 */

export const DAILY_CREDITS = 10;
export const CREDIT_COSTS: Record<'image' | 'video', number> = { image: 1, video: 2 };

export async function getCreditsUsedToday(userId: number): Promise<number> {
  const row = await queryRow<{ used: number }>(
    `SELECT COALESCE(SUM(cost), 0)::int AS used
     FROM media_credits
     WHERE user_id = ? AND created_at::date = current_date`,
    userId
  );
  return Number(row?.used ?? 0);
}

/** Records a charge and returns the ledger row id (for refunds). */
export async function chargeCredits(
  userId: number,
  modelId: string,
  kind: 'image' | 'video'
): Promise<number> {
  const result = await exec(
    `INSERT INTO media_credits (user_id, user_name, model_id, kind, cost)
     VALUES (?, (SELECT name FROM users WHERE id = ?), ?, ?, ?)`,
    userId,
    userId,
    modelId,
    kind,
    CREDIT_COSTS[kind]
  );
  return Number(result.lastInsertRowid ?? 0);
}

/** Removes a charge (used when the provider fails, so users don't lose credits). */
export async function refundCredits(ledgerId: number): Promise<void> {
  if (!ledgerId) return;
  try {
    await exec('DELETE FROM media_credits WHERE id = ?', ledgerId);
  } catch (e) {
    console.warn('[credits] refund failed:', e);
  }
}
