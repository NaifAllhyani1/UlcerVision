import { NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyTokenFromCookies } from "@/lib/auth";

export async function GET(_, { params }) {
  const payload = await verifyTokenFromCookies();
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const row = db
    .prepare(
      `SELECT s.id, s.user_id, s.image_path, s.status, s.uploaded_at,
              r.prediction, r.confidence, r.raw_probabilities, r.model_version, r.created_at AS result_created_at
       FROM scans s
       LEFT JOIN scan_results r ON r.scan_id = s.id
       WHERE s.id = ? AND s.user_id = ?
       LIMIT 1`
    )
    .get(id, payload.id);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let raw = {};
  if (row.raw_probabilities) {
    try {
      raw = JSON.parse(row.raw_probabilities);
    } catch {
      raw = {};
    }
  }

  return NextResponse.json({ ...row, raw_probabilities: raw });
}

