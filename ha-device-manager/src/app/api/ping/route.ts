import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight health check for Railway (no HA credentials required). */
export async function GET() {
  return NextResponse.json({ ok: true });
}
