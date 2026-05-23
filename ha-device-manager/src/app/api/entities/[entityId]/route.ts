import { NextResponse } from "next/server";
import { updateEntity } from "@/lib/ha/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> },
) {
  try {
    const { entityId: encoded } = await params;
    const entityId = decodeURIComponent(encoded);
    const body = (await request.json()) as {
      name?: string;
      area_id?: string | null;
      enabled?: boolean;
    };

    const updates: {
      name?: string | null;
      area_id?: string | null;
      disabled_by?: string | null;
    } = {};

    if (body.name !== undefined) {
      updates.name = body.name.trim() || null;
    }
    if (body.area_id !== undefined) {
      updates.area_id = body.area_id || null;
    }
    if (body.enabled !== undefined) {
      updates.disabled_by = body.enabled ? null : "user";
    }

    await updateEntity(entityId, updates);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
