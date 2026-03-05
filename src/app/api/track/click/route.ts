import { NextRequest, NextResponse } from "next/server";
import { createSuperuserPb } from "@/lib/pocketbase";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  if (id) {
    try {
      const pb = await createSuperuserPb();
      const log = await pb.collection("email_logs").getOne(id);

      const updates: Record<string, string> = {};

      // A click implies an open
      if (!log.opened_at) {
        updates.opened_at = new Date().toISOString();
      }
      if (!log.clicked_at) {
        updates.clicked_at = new Date().toISOString();
      }

      if (log.status === "sent" || log.status === "opened") {
        updates.status = "clicked";
      }

      if (Object.keys(updates).length > 0) {
        await pb.collection("email_logs").update(id, updates);
      }
    } catch {
      // Don't block the redirect if DB update fails
    }
  }

  return NextResponse.redirect(url);
}
