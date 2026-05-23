"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useIsDeviceHighlighted } from "@/components/DeviceHighlightContext";
import { useDeviceInventory } from "@/components/DeviceInventoryContext";
import { EntityPowerBadge, PowerBadge } from "@/components/PowerBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { deviceGradient, deviceInitials } from "@/lib/deviceAvatar";
import type { DeviceWithEntities, HaState } from "@/lib/ha/types";

function formatAttributes(attrs: Record<string, unknown>): string | null {
  const keys = [
    "unit_of_measurement",
    "device_class",
    "friendly_name",
    "battery_level",
    "brightness",
    "color_temp",
  ];
  const parts: string[] = [];
  for (const key of keys) {
    if (attrs[key] !== undefined && attrs[key] !== null) {
      parts.push(`${key}: ${String(attrs[key])}`);
    }
  }
  if (parts.length > 0) return parts.join(" · ");
  const rest = Object.entries(attrs)
    .filter(([k]) => !["friendly_name", "icon", "entity_picture"].includes(k))
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
  return rest.length > 0 ? rest.join(" · ") : null;
}

export function DeviceDetailModal({
  device,
  onClose,
}: {
  device: DeviceWithEntities | null;
  onClose: () => void;
}) {
  const { stateMap } = useDeviceInventory();
  const [barcode, setBarcode] = useState<string | null>(null);
  const [barcodeBusy, setBarcodeBusy] = useState(false);
  const highlighted = useIsDeviceHighlighted(device?.device.id ?? "");

  const loadBarcode = useCallback(async (deviceId: string) => {
    const res = await fetch("/api/barcodes");
    const json = (await res.json()) as { barcodes: Record<string, string> };
    if (res.ok) setBarcode(json.barcodes[deviceId] ?? null);
  }, []);

  useEffect(() => {
    if (!device) {
      setBarcode(null);
      return;
    }
    void loadBarcode(device.device.id);
  }, [device, loadBarcode]);

  useEffect(() => {
    if (!device) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [device, onClose]);

  const rows = useMemo(() => {
    if (!device) return [];
    return device.entities.map((ent) => {
      const info = device.entityStates.find((s) => s.entity_id === ent.entity_id);
      const live = stateMap.get(ent.entity_id);
      const attrs = (live?.attributes ?? {}) as Record<string, unknown>;
      return {
        ent,
        info,
        state: live?.state ?? info?.state ?? "—",
        unit: attrs.unit_of_measurement as string | undefined,
        detail: live ? formatAttributes(attrs) : null,
        domain: ent.entity_id.split(".")[0],
      };
    });
  }, [device, stateMap]);

  if (!device) return null;

  const modelLine = [device.device.manufacturer, device.device.model]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        id={device ? `device-row-${device.device.id}` : undefined}
        className={`glass-panel relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl animate-in ${
          highlighted ? "device-highlight-pulse" : ""
        }`}
      >
        <header className="flex shrink-0 items-start gap-4 border-b border-border p-5">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
            style={{ background: deviceGradient(device.displayName) }}
          >
            {deviceInitials(device.displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="device-modal-title" className="text-xl font-semibold">
              {device.displayName}
            </h2>
            {modelLine && <p className="mt-1 text-sm text-muted">{modelLine}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <PowerBadge status={device.powerStatus} />
              {device.areaName ? (
                <Badge tone="accent">{device.areaName}</Badge>
              ) : (
                <Badge tone="warning">Unassigned</Badge>
              )}
              <Badge>{device.entityCount} entities</Badge>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-2xl leading-none text-muted hover:bg-white/10 hover:text-foreground"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Entity</th>
                  <th className="px-3 py-2.5 font-medium">Name</th>
                  <th className="px-3 py-2.5 font-medium">State</th>
                  <th className="hidden px-3 py-2.5 font-medium sm:table-cell">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {rows.map(({ ent, info, state, unit, detail, domain }) => (
                  <tr key={ent.entity_id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-3 align-top">
                      <Badge tone="accent">{domain}</Badge>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground break-all">
                        {ent.entity_id}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top text-muted">
                      {ent.name || ent.original_name || "—"}
                      {ent.disabled_by && (
                        <span className="mt-1 block">
                          <Badge tone="danger">Disabled</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold tabular-nums text-foreground">
                          {state}
                          {unit ? (
                            <span className="ml-1 text-sm font-normal text-muted">
                              {unit}
                            </span>
                          ) : null}
                        </span>
                        {info && <EntityPowerBadge info={info} />}
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 align-top text-xs text-muted-foreground sm:table-cell">
                      {detail ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="shrink-0 border-t border-border px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Physical label</p>
          {barcode ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-lg font-bold tracking-widest text-accent">
                {barcode}
              </span>
              <Link href={`/scan?c=${barcode}`} className="text-sm text-muted hover:text-accent">
                Test scan
              </Link>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">No label code assigned yet.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={barcodeBusy}
              onClick={() => {
                if (!device) return;
                setBarcodeBusy(true);
                const req = barcode
                  ? fetch(`/api/barcodes/${device.device.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ regenerate: true }),
                    })
                  : fetch("/api/barcodes", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ device_id: device.device.id }),
                    });
                void req
                  .then((r) => r.json())
                  .then((j: { code?: string }) => {
                    if (j.code) setBarcode(j.code);
                  })
                  .finally(() => setBarcodeBusy(false));
              }}
            >
              {barcode ? "Regenerate code" : "Generate label code"}
            </Button>
            <Link href="/labels">
              <Button variant="ghost" size="sm">
                Print labels
              </Button>
            </Link>
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap gap-2 border-t border-border p-4">
          <Link href={`/devices/${device.device.id}`} onClick={onClose}>
            <Button variant="primary">Edit device</Button>
          </Link>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </footer>
      </div>
    </div>
  );
}
