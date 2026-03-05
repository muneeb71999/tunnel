import { NextRequest, NextResponse } from "next/server";
import { createSuperuserPb } from "@/lib/pocketbase";
import { sendEmail, personalizeContent, selectABVariant } from "@/lib/email-engine";
import type { EmailAccount, Contact, Sequence } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pb = await createSuperuserPb();

    // Find all active campaigns
    const activeCampaigns = await pb.collection("campaigns").getList(1, 50, {
      filter: 'status = "active"',
    });

    const results: { campaign_id: string; emails_sent: number; error?: string }[] = [];

    for (const campaign of activeCampaigns.items) {
      try {
        const emailAccount = await pb
          .collection("email_accounts")
          .getOne(campaign.email_account_id) as unknown as EmailAccount;

        // Get pending campaign contacts
        const pendingContacts = await pb.collection("campaign_contacts").getList(1, campaign.daily_limit || 50, {
          filter: `campaign_id = "${campaign.id}" && (status = "pending" || status = "in_progress")`,
          expand: "contact_id",
        });

        let emailsSent = 0;

        for (const campaignContact of pendingContacts.items) {
          // Re-check campaign status in case it was paused mid-batch
          const freshCampaign = await pb.collection("campaigns").getOne(campaign.id);
          if (freshCampaign.status !== "active") break;

          const contact = campaignContact.expand?.contact_id as unknown as Contact;
          if (!contact) continue;

          const variant = campaign.ab_testing_enabled
            ? selectABVariant(campaign.ab_variant_split)
            : "A";

          const nextOrder = (campaignContact.current_sequence_order || 0) + 1;
          const sequences = await pb.collection("sequences").getList(1, 1, {
            filter: `campaign_id = "${campaign.id}" && variant = "${variant}" && order = ${nextOrder}`,
          });

          if (sequences.items.length === 0) {
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

          // Dedup: skip if this exact email was already sent
          const alreadySent = await pb.collection("email_logs").getList(1, 1, {
            filter: `campaign_id = "${campaign.id}" && contact_id = "${contact.id}" && sequence_id = "${sequence.id}" && (status = "sent" || status = "sending")`,
          });
          if (alreadySent.totalItems > 0) {
            // Email was sent but campaign_contact wasn't updated — fix it now
            const totalSteps = await pb.collection("sequences").getList(1, 1, {
              filter: `campaign_id = "${campaign.id}" && variant = "${variant}" && order > ${nextOrder}`,
            });
            await pb.collection("campaign_contacts").update(campaignContact.id, {
              status: totalSteps.totalItems === 0 ? "completed" : "in_progress",
              current_sequence_order: nextOrder,
              last_sent_at: alreadySent.items[0].sent_at || new Date().toISOString(),
            });
            continue;
          }

          // Create log BEFORE sending so we have an ID for tracking URLs
          let emailLog: { id: string } | null = null;
          try {
            emailLog = await pb.collection("email_logs").create({
              campaign_id: campaign.id,
              sequence_id: sequence.id,
              contact_id: contact.id,
              email_account_id: emailAccount.id,
              status: "sending",
              variant,
              subject: personalizeContent(sequence.subject, contact),
              body: personalizeContent(sequence.body, contact),
            });

            const tracking = campaign.tracking_enabled
              ? { baseUrl: process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin, emailLogId: emailLog.id }
              : undefined;

            await sendEmail(emailAccount, contact, sequence, tracking);

            await pb.collection("email_logs").update(emailLog.id, {
              status: "sent",
              sent_at: new Date().toISOString(),
            });

            // Check if there are more steps after this one
            const remainingSteps = await pb.collection("sequences").getList(1, 1, {
              filter: `campaign_id = "${campaign.id}" && variant = "${variant}" && order > ${nextOrder}`,
            });

            await pb.collection("campaign_contacts").update(campaignContact.id, {
              status: remainingSteps.totalItems === 0 ? "completed" : "in_progress",
              current_sequence_order: nextOrder,
              last_sent_at: new Date().toISOString(),
            });

            emailsSent++;

            // Respect delay between emails
            if (campaign.delay_between_emails > 0) {
              await new Promise((resolve) =>
                setTimeout(resolve, campaign.delay_between_emails * 60 * 1000)
              );
            }

            if (emailsSent >= (campaign.daily_limit || 50)) break;
          } catch (error) {
            console.error(`Failed to send email to ${contact.email}:`, error);

            if (emailLog) {
              await pb.collection("email_logs").update(emailLog.id, { status: "failed" });
            }
          }
        }

        // If no more pending contacts, mark campaign as completed
        const remaining = await pb.collection("campaign_contacts").getList(1, 1, {
          filter: `campaign_id = "${campaign.id}" && (status = "pending" || status = "in_progress")`,
        });
        if (remaining.totalItems === 0) {
          await pb.collection("campaigns").update(campaign.id, { status: "completed" });
        }

        results.push({ campaign_id: campaign.id, emails_sent: emailsSent });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.push({ campaign_id: campaign.id, emails_sent: 0, error: message });
      }
    }

    return NextResponse.json({
      success: true,
      processed: activeCampaigns.items.length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
