import { NextRequest, NextResponse } from "next/server";
import { createSuperuserPb } from "@/lib/pocketbase";
import { sendWarmingEmail, calculateDailyWarmingLimit } from "@/lib/warming-engine";
import type { EmailAccount } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pb = await createSuperuserPb();

    // Find all accounts with warming enabled
    const warmingAccounts = await pb.collection("email_accounts").getList(1, 50, {
      filter: "is_warming = true",
    });

    const results: { account_id: string; emails_sent: number; error?: string }[] = [];

    for (const rawAccount of warmingAccounts.items) {
      const account = rawAccount as unknown as EmailAccount;
      try {
        const dailyLimit = calculateDailyWarmingLimit(account);

        // Check how many warming emails were already sent today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayLogs = await pb.collection("warming_logs").getList(1, 1, {
          filter: `email_account_id = "${account.id}" && created >= "${todayStart.toISOString()}"`,
        });

        const remaining = dailyLimit - todayLogs.totalItems;
        if (remaining <= 0) {
          results.push({ account_id: account.id, emails_sent: 0 });
          continue;
        }

        // Send warming emails to the account's own email (self-warming)
        // In a real setup, you'd have partner warming accounts to send between
        let emailsSent = 0;
        for (let i = 0; i < remaining; i++) {
          try {
            await sendWarmingEmail(account, account.email);

            await pb.collection("warming_logs").create({
              email_account_id: account.id,
              status: "sent",
              sent_at: new Date().toISOString(),
            });

            emailsSent++;

            // Small delay between warming emails
            await new Promise((resolve) => setTimeout(resolve, 30000));
          } catch (error) {
            console.error(`Warming email failed for ${account.email}:`, error);
            await pb.collection("warming_logs").create({
              email_account_id: account.id,
              status: "failed",
            });
            break;
          }
        }

        // Update the account's current warming limit
        await pb.collection("email_accounts").update(account.id, {
          warming_current_limit: dailyLimit,
        });

        results.push({ account_id: account.id, emails_sent: emailsSent });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.push({ account_id: account.id, emails_sent: 0, error: message });
      }
    }

    return NextResponse.json({
      success: true,
      processed: warmingAccounts.items.length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
