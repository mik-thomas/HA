import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const haUrl = process.env.HA_URL?.replace(/\/$/, "");
  const hasToken = Boolean(process.env.HA_TOKEN?.trim());

  if (!haUrl || !hasToken) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing HA_URL or HA_TOKEN in environment",
      },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(`${haUrl}/api/`, {
      headers: { Authorization: `Bearer ${process.env.HA_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Home Assistant returned ${res.status}`,
          haUrl,
        },
        { status: 502 },
      );
    }
    const body = (await res.json()) as { message: string };
    return NextResponse.json({
      ok: true,
      haUrl,
      homeassistant: body.message,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Connection failed";
    return NextResponse.json(
      { ok: false, error: message, haUrl },
      { status: 502 },
    );
  }
}
