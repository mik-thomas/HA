import { NextResponse } from "next/server";
import { automationsFromStates } from "@/lib/ha/automations";
import { fetchStates } from "@/lib/ha/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const states = await fetchStates();
    const automations = automationsFromStates(states);
    return NextResponse.json({ automations });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
