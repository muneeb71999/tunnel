import { NextRequest, NextResponse } from "next/server";
import { createServerPb } from "@/lib/pocketbase";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { account_id } = await req.json();
    if (!account_id) {
      return NextResponse.json({ success: false, error: "Missing account_id" }, { status: 400 });
    }

    const pb = createServerPb();
    const account = await pb.collection("email_accounts").getOne(account_id);

    const transport = nodemailer.createTransport({
      host: account.smtp_host,
      port: account.smtp_port,
      secure: account.smtp_port === 465,
      auth: {
        user: account.smtp_username,
        pass: account.smtp_password,
      },
    });

    await transport.verify();

    await pb.collection("email_accounts").update(account_id, { is_verified: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
