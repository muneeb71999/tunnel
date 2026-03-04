import { NextRequest, NextResponse } from "next/server";
import { createServerPb } from "@/lib/pocketbase";

export async function POST(req: NextRequest) {
  try {
    const { account_id } = await req.json();

    const pb = createServerPb();

    await pb.collection("email_accounts").update(account_id, {
      is_warming: true,
      warming_started_at: new Date().toISOString(),
      warming_current_limit: 2,
    });

    // In production, this would register a cron job or worker
    // to send warming emails daily

    return NextResponse.json({ success: true, message: "Warming started" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
