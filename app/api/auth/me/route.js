import { NextResponse } from "next/server";
import { verifyTokenFromCookies } from "@/lib/auth";

export async function GET() {
  const payload = await verifyTokenFromCookies();
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ id: payload.id, name: payload.name, email: payload.email, role: payload.role });
}

