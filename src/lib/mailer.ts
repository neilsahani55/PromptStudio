import nodemailer from 'nodemailer';

/**
 * SMTP mailer for feedback notifications. Env-gated: if SMTP_USER/SMTP_PASS
 * are missing, sending is skipped with a log line (never throws to callers).
 *
 * Gmail setup: enable 2-Step Verification on the sender account, then create
 * an App Password at https://myaccount.google.com/apppasswords and use it as
 * SMTP_PASS (regular Gmail passwords do NOT work over SMTP).
 */

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const FEEDBACK_TO = process.env.FEEDBACK_EMAIL_TO || 'neilsahani55@gmail.com';
const FEEDBACK_CC = process.env.FEEDBACK_EMAIL_CC || 'promptstudios55@gmail.com';

function isConfigured(): boolean {
  return !!SMTP_USER && !!SMTP_PASS;
}

let transporter: nodemailer.Transporter | null = null;
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // 465 = implicit TLS; 587 = STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface FeedbackEmail {
  id: number;
  type: string;
  title: string;
  message: string;
  userName?: string | null;
  userEmail?: string | null;
}

const TYPE_EMOJI: Record<string, string> = { bug: '🐛', suggestion: '💡', improvement: '⬆️' };

/**
 * Sends the feedback-notification email. Best-effort: logs and returns false
 * on any failure so the feedback API never fails because of email problems.
 */
export async function sendFeedbackEmail(fb: FeedbackEmail): Promise<boolean> {
  if (!isConfigured()) {
    console.warn('[mail] SMTP_USER/SMTP_PASS not set — feedback email skipped.');
    return false;
  }
  const emoji = TYPE_EMOJI[fb.type] || '📩';
  const subject = `${emoji} PromptStudio feedback: ${fb.title}`.slice(0, 180);
  const who = [fb.userName, fb.userEmail && `<${fb.userEmail}>`].filter(Boolean).join(' ') || 'Unknown user';

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden">
    <div style="background:#c2570f;color:#fff;padding:14px 20px">
      <strong style="font-size:15px">PromptStudio — new ${esc(fb.type)}</strong>
    </div>
    <div style="padding:20px">
      <p style="margin:0 0 4px;font-size:13px;color:#666">From</p>
      <p style="margin:0 0 14px;font-size:14px"><strong>${esc(who)}</strong></p>
      <p style="margin:0 0 4px;font-size:13px;color:#666">Title</p>
      <p style="margin:0 0 14px;font-size:15px"><strong>${esc(fb.title)}</strong></p>
      <p style="margin:0 0 4px;font-size:13px;color:#666">Message</p>
      <p style="margin:0 0 14px;font-size:14px;white-space:pre-wrap">${esc(fb.message)}</p>
      <a href="https://promptstudios.vercel.app/admin/feedback"
         style="display:inline-block;background:#c2570f;color:#fff;text-decoration:none;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:600">
        Open in admin panel
      </a>
      <p style="margin:16px 0 0;font-size:11px;color:#999">Feedback #${fb.id} · automated notification</p>
    </div>
  </div>`;

  try {
    await getTransporter().sendMail({
      from: `"PromptStudio" <${SMTP_USER}>`,
      to: FEEDBACK_TO,
      cc: FEEDBACK_CC || undefined,
      replyTo: fb.userEmail || undefined,
      subject,
      html,
      text: `New ${fb.type} from ${who}\n\n${fb.title}\n\n${fb.message}\n\nFeedback #${fb.id}`,
    });
    return true;
  } catch (e) {
    console.error('[mail] Failed to send feedback email:', e instanceof Error ? e.message : e);
    return false;
  }
}
