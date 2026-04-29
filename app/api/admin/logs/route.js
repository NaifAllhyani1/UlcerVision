import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const admin = await requireAdmin();
  if (admin.response) return admin.response;

  try {
    const logs = db
      .prepare(
        `SELECT
           s.id AS scan_id,
           u.name AS user_name,
           u.email AS user_email,
           s.image_path,
           s.status,
           s.uploaded_at,
           r.prediction,
           r.confidence
         FROM scans s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN scan_results r ON r.scan_id = s.id
         ORDER BY s.uploaded_at DESC
         LIMIT 100`
      )
      .all();

    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
