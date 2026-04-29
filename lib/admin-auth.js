import { NextResponse } from "next/server";
import { verifyTokenFromCookies } from "@/lib/auth";

export async function requireAdmin() {
  const payload = await verifyTokenFromCookies();
  if (!payload) return { payload: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (payload.role !== "admin")
    return { payload: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { payload, response: null };
}

