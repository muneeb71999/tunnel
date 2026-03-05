import { NextRequest } from "next/server";
import { createSuperuserPb } from "@/lib/pocketbase";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    try {
      const pb = await createSuperuserPb();
      const log = await pb.collection("email_logs").getOne(id);

      // Only update if not already opened (keep first open time)
      if (!log.opened_at) {
        await pb.collection("email_logs").update(id, {
          status: log.status === "sent" ? "opened" : log.status,
          opened_at: new Date().toISOString(),
        });
      }
    } catch {
      // Don't fail the pixel response if DB update fails
    }
  }

  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
