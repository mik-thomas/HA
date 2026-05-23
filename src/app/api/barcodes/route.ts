import { NextResponse } from "next/server";
import { assignBarcode, readBarcodeStore } from "@/lib/barcodes/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = await readBarcodeStore();
    return NextResponse.json({ barcodes: store });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { device_id?: string; code?: string };
    if (!body.device_id) {
      return NextResponse.json({ error: "device_id is required" }, { status: 400 });
    }
    const result = await assignBarcode(body.device_id, body.code);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
