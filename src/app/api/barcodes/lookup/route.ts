import { NextResponse } from "next/server";
import { codeToDeviceId, readBarcodeStore } from "@/lib/barcodes/store";
import { buildInventory } from "@/lib/ha/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get("c")?.trim();
    if (!code) {
      return NextResponse.json({ error: "Missing code parameter c" }, { status: 400 });
    }

    const store = await readBarcodeStore();
    const deviceId = codeToDeviceId(store, code);
    if (!deviceId) {
      return NextResponse.json({ error: "Unknown code", code: code.toUpperCase() }, { status: 404 });
    }

    const { devices } = await buildInventory();
    const device = devices.find((d) => d.device.id === deviceId);
    if (!device) {
      return NextResponse.json({ error: "Device not found in Home Assistant" }, { status: 404 });
    }

    return NextResponse.json({
      code: code.toUpperCase(),
      device_id: deviceId,
      device,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
