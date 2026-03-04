import { NextRequest, NextResponse } from "next/server";
import { createServerPb } from "@/lib/pocketbase";
import Papa from "papaparse";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const listId = formData.get("list_id") as string;
    const userId = formData.get("user_id") as string;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const csvText = await file.text();
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const rows = parsed.data as Record<string, string>[];

    const pb = createServerPb();
    let success = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const email = row.email || row.Email || row.EMAIL || row.e_mail;
        if (!email) {
          failed++;
          continue;
        }

        const contact = await pb.collection("contacts").create({
          email,
          first_name: row.first_name || row.FirstName || row["First Name"] || "",
          last_name: row.last_name || row.LastName || row["Last Name"] || "",
          company: row.company || row.Company || "",
          title: row.title || row.Title || row["Job Title"] || "",
          phone: row.phone || row.Phone || "",
          status: "active",
          tags: [],
          custom_fields: {},
          user_id: userId,
        });

        if (listId) {
          await pb.collection("contact_list_members").create({
            contact_list_id: listId,
            contact_id: contact.id,
          });
        }

        success++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ success: true, imported: success, failed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
