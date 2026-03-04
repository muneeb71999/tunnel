import { NextRequest, NextResponse } from "next/server";
import { createServerPb } from "@/lib/pocketbase";
import { sendEmail, personalizeContent, selectABVariant } from "@/lib/email-engine";
import type { EmailAccount, Contact, Sequence } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return NextResponse.json({ success: false, error: "Missing campaign_id" }, { status: 400 });
    }

    const pb = createServerPb();
    const campaign = await pb.collection("campaigns").getOne(campaign_id);

    if (campaign.status !== "active") {
      return NextResponse.json({ success: false, error: "Campaign is not active" }, { status: 400 });
    }

    const emailAccount = await pb.collection("email_accounts").getOne(campaign.email_account_id) as unknown as EmailAccount;

    // Get pending campaign contacts
    const pendingContacts = await pb.collection("campaign_contacts").getList(1, campaign.daily_limit, {
      filter: `campaign_id = "${campaign_id}" && (status = "pending" || status = "in_progress")`,
      expand: "contact_id",
    });

    let emailsSent = 0;

    for (const campaignContact of pendingContacts.items) {
      const contact = campaignContact.expand?.contact_id as unknown as Contact;
      if (!contact) continue;

      // Determine which variant to use
      const variant = campaign.ab_testing_enabled
        ? selectABVariant(campaign.ab_variant_split)
        : "A";

      // Get the next sequence step
      const nextOrder = (campaignContact.current_sequence_order || 0) + 1;
      const sequences = await pb.collection("sequences").getList(1, 1, {
        filter: `campaign_id = "${campaign_id}" && variant = "${variant}" && order = ${nextOrder}`,
      });

      if (sequences.items.length === 0) {
        // No more steps, mark as completed
        await pb.collection("campaign_contacts").update(campaignContact.id, {
          status: "completed",
        });
        continue;
      }

      const sequence = sequences.items[0] as unknown as Sequence;

      // Check delay
      if (campaignContact.last_sent_at && sequence.delay_days > 0) {
        const lastSent = new Date(campaignContact.last_sent_at);
        const now = new Date();
        const daysSince = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < sequence.delay_days) continue;
      }

      try {
        await sendEmail(emailAccount, contact, sequence);

        // Log the email
        await pb.collection("email_logs").create({
          campaign_id,
          sequence_id: sequence.id,
          contact_id: contact.id,
          email_account_id: emailAccount.id,
          status: "sent",
          variant,
          subject: personalizeContent(sequence.subject, contact),
          body: personalizeContent(sequence.body, contact),
          sent_at: new Date().toISOString(),
        });

        // Update campaign contact
        await pb.collection("campaign_contacts").update(campaignContact.id, {
          status: "in_progress",
          current_sequence_order: nextOrder,
          last_sent_at: new Date().toISOString(),
        });

        emailsSent++;

        // Respect delay between emails
        if (campaign.delay_between_emails > 0) {
          await new Promise((resolve) => setTimeout(resolve, campaign.delay_between_emails * 60 * 1000));
        }

        // Respect daily limit
        if (emailsSent >= campaign.daily_limit) break;
      } catch (error) {
        console.error(`Failed to send email to ${contact.email}:`, error);

        await pb.collection("email_logs").create({
          campaign_id,
          sequence_id: sequence.id,
          contact_id: contact.id,
          email_account_id: emailAccount.id,
          status: "failed",
          variant,
          subject: personalizeContent(sequence.subject, contact),
          body: personalizeContent(sequence.body, contact),
        });
      }
    }

    return NextResponse.json({ success: true, emails_sent: emailsSent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
