import { NextResponse } from "next/server";
import { buildInventory } from "@/lib/ha/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const inventory = await buildInventory();
    return NextResponse.json(inventory);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
