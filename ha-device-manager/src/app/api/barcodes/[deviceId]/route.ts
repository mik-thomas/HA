import { NextResponse } from "next/server";
import { assignBarcode, removeBarcode } from "@/lib/barcodes/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  try {
    const { deviceId } = await params;
    const store = await removeBarcode(deviceId);
    return NextResponse.json({ ok: true, store });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  try {
    const { deviceId } = await params;
    const body = (await request.json()) as { code?: string; regenerate?: boolean };
    if (body.regenerate) {
      await removeBarcode(deviceId);
    }
    const result = await assignBarcode(deviceId, body.regenerate ? undefined : body.code);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
