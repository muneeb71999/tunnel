import type { EmailAccount } from "@/types";
import { createTransport } from "./email-engine";

const WARMING_TEMPLATES = [
  {
    subject: "Quick question about {{topic}}",
    body: "Hi there,\n\nI was wondering if you had any thoughts on {{topic}}? I've been looking into it and would love to get your perspective.\n\nBest regards",
  },
  {
    subject: "Following up on {{topic}}",
    body: "Hey,\n\nJust wanted to follow up on our earlier conversation about {{topic}}. Let me know if you have any updates.\n\nThanks!",
  },
  {
    subject: "Interesting article about {{topic}}",
    body: "Hi,\n\nI came across an interesting article about {{topic}} and thought you might find it useful. Let me know what you think!\n\nCheers",
  },
  {
    subject: "Re: {{topic}} discussion",
    body: "Thanks for the information about {{topic}}. I'll review it and get back to you with my thoughts.\n\nBest",
  },
];

const TOPICS = [
  "project management",
  "team collaboration",
  "productivity tips",
  "industry trends",
  "best practices",
  "upcoming events",
  "market research",
  "strategy planning",
];

export function generateWarmingEmail() {
  const template = WARMING_TEMPLATES[Math.floor(Math.random() * WARMING_TEMPLATES.length)];
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

  return {
    subject: template.subject.replace("{{topic}}", topic),
    body: template.body.replace(/\{\{topic\}\}/g, topic),
  };
}

export async function sendWarmingEmail(
  fromAccount: EmailAccount,
  toEmail: string
) {
  const transport = createTransport(fromAccount);
  const { subject, body } = generateWarmingEmail();

  const result = await transport.sendMail({
    from: `"${fromAccount.display_name}" <${fromAccount.email}>`,
    to: toEmail,
    subject,
    text: body,
  });

  return result;
}

export function calculateDailyWarmingLimit(account: EmailAccount): number {
  if (!account.warming_started_at) return 0;

  const startDate = new Date(account.warming_started_at);
  const now = new Date();
  const daysSinceStart = Math.floor(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Start with 2 emails per day, increase by warming_daily_increase each day
  const baseLimit = 2;
  const calculatedLimit = baseLimit + daysSinceStart * (account.warming_daily_increase || 1);

  // Cap at the account's daily send limit
  return Math.min(calculatedLimit, account.daily_send_limit || 50);
}
