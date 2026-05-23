import { NextResponse } from "next/server";
import { updateDevice } from "@/lib/ha/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      area_id?: string | null;
    };

    const updates: { name_by_user?: string | null; area_id?: string | null } = {};
    if (body.name !== undefined) {
      updates.name_by_user = body.name.trim() || null;
    }
    if (body.area_id !== undefined) {
      updates.area_id = body.area_id || null;
    }

    await updateDevice(id, updates);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
