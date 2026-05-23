import { NextResponse } from "next/server";
import { fetchStates } from "@/lib/ha/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const states = await fetchStates();
    return NextResponse.json({ states });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
