import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

function predictionCountMap(rows) {
  const base = { healthy: 0, infection: 0, ischemia: 0, both: 0 };
  for (const row of rows) {
    if (row.prediction in base) base[row.prediction] = row.count;
  }
  return base;
}

export async function GET() {
  const admin = await requireAdmin();
  if (admin.response) return admin.response;

  const totalUsers = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'user'").get().c;
  const totalScans = db.prepare("SELECT COUNT(*) AS c FROM scans").get().c;
  const scansProcessed = db.prepare("SELECT COUNT(*) AS c FROM scans WHERE status = 'done'").get().c;
  const avgConfidence = db.prepare("SELECT AVG(confidence) AS c FROM scan_results").get().c ?? 0;
  const predictionRows = db.prepare("SELECT prediction, COUNT(*) AS count FROM scan_results GROUP BY prediction").all();

  return NextResponse.json({
    totalUsers,
    totalScans,
    scansProcessed,
    predictionCounts: predictionCountMap(predictionRows),
    avgConfidence,
  });
}

