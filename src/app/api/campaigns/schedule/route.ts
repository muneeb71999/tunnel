import { NextRequest, NextResponse } from "next/server";
import { createServerPb } from "@/lib/pocketbase";

export async function POST(req: NextRequest) {
  try {
    const { campaign_id, schedule_time } = await req.json();

    const pb = createServerPb();

    // Update campaign with scheduled time and activate
    await pb.collection("campaigns").update(campaign_id, {
      status: "active",
      scheduled_at: schedule_time || new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
