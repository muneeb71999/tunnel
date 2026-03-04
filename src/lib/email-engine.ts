import nodemailer from "nodemailer";
import type { EmailAccount, Contact, Sequence } from "@/types";

export function createTransport(account: EmailAccount) {
  return nodemailer.createTransport({
    host: account.smtp_host,
    port: account.smtp_port,
    secure: account.smtp_port === 465,
    auth: {
      user: account.smtp_username,
      pass: account.smtp_password,
    },
  });
}

export function personalizeContent(
  template: string,
  contact: Contact,
  customVars: Record<string, string> = {}
): string {
  let result = template;
  result = result.replace(/\{\{first_name\}\}/g, contact.first_name || "");
  result = result.replace(/\{\{last_name\}\}/g, contact.last_name || "");
  result = result.replace(/\{\{email\}\}/g, contact.email || "");
  result = result.replace(/\{\{company\}\}/g, contact.company || "");
  result = result.replace(/\{\{title\}\}/g, contact.title || "");
  result = result.replace(/\{\{phone\}\}/g, contact.phone || "");

  // Custom fields
  if (contact.custom_fields) {
    for (const [key, value] of Object.entries(contact.custom_fields)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
  }

  // Additional custom variables
  for (const [key, value] of Object.entries(customVars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }

  return result;
}

export async function sendEmail(
  account: EmailAccount,
  contact: Contact,
  sequence: Sequence,
  trackingPixelUrl?: string
) {
  const transport = createTransport(account);

  const subject = personalizeContent(sequence.subject, contact);
  let body = personalizeContent(sequence.body, contact);

  // Add tracking pixel if tracking is enabled
  if (trackingPixelUrl) {
    body += `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none" />`;
  }

  // Add signature
  if (account.signature) {
    body += `<br/><br/>${account.signature}`;
  }

  const result = await transport.sendMail({
    from: `"${account.display_name}" <${account.email}>`,
    to: contact.email,
    subject,
    html: body,
  });

  return result;
}

export function selectABVariant(splitPercentage: number): "A" | "B" {
  return Math.random() * 100 < splitPercentage ? "A" : "B";
}
