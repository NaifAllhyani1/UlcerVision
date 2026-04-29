import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function DELETE(_, { params }) {
  const admin = await requireAdmin();
  if (admin.response) return admin.response;

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
  if (!result.changes) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

