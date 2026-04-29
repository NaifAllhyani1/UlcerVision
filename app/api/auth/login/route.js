import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import db from "@/lib/db";
import { authCookieOptions } from "@/lib/auth";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-only-change-this-secret");

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "");
    if (!cleanEmail || !cleanPassword) {
      return NextResponse.json({ error: "email and password are required" }, { status: 400 });
    }

    const user = db
      .prepare("SELECT id, name, email, role, password_hash FROM users WHERE email = ?")
      .get(cleanEmail);
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const ok = await bcrypt.compare(cleanPassword, user.password_hash);
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    const res = NextResponse.json({ user: payload });
    res.cookies.set("token", token, authCookieOptions());
    return res;
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

