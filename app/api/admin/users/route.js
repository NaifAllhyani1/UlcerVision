import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const admin = await requireAdmin();
  if (admin.response) return admin.response;

  const users = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.created_at, COUNT(s.id) AS scan_count
       FROM users u
       LEFT JOIN scans s ON s.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    )
    .all();

  return NextResponse.json({ users });
}

