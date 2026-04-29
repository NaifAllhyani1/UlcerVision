import { NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyTokenFromCookies } from "@/lib/auth";

export async function GET() {
  const payload = await verifyTokenFromCookies();
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scans = db
    .prepare(
      `SELECT s.id, s.user_id, s.image_path, s.status, s.uploaded_at,
              r.prediction, r.confidence, r.model_version, r.created_at AS result_created_at
       FROM scans s
       LEFT JOIN scan_results r ON r.scan_id = s.id
       WHERE s.user_id = ?
       ORDER BY s.uploaded_at DESC`
    )
    .all(payload.id);

  return NextResponse.json({ scans });
}

