import { NextRequest, NextResponse } from "next/server";
import { createSuperuserPb } from "@/lib/pocketbase";

export async function POST(req: NextRequest) {
  try {
    const { account_id } = await req.json();

    const pb = await createSuperuserPb();

    await pb.collection("email_accounts").update(account_id, {
      is_warming: false,
    });

    return NextResponse.json({ success: true, message: "Warming stopped" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
