import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();
    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "");
    if (!cleanName || !cleanEmail || !cleanPassword) {
      return NextResponse.json({ error: "name, email, password are required" }, { status: 400 });
    }

    const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);
    if (exists) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const result = db
      .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')")
      .run(cleanName, cleanEmail, passwordHash);

    return NextResponse.json({ success: true, userId: Number(result.lastInsertRowid) });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

