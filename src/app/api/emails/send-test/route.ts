import { NextRequest, NextResponse } from "next/server";
import { createServerPb } from "@/lib/pocketbase";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { account_id, to_email, subject, body } = await req.json();

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

    await transport.sendMail({
      from: `"${account.display_name}" <${account.email}>`,
      to: to_email,
      subject: subject || "Test email from OutreachPro",
      html: body || "<p>This is a test email from OutreachPro.</p>",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
