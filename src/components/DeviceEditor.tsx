"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDeviceInventory } from "@/components/DeviceInventoryContext";
import { IconChevronLeft } from "@/components/icons";
import { Alert, Toast } from "@/components/ui/Alert";
import { EntityPowerBadge, PowerBadge } from "@/components/PowerBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { LoadingPanel } from "@/components/ui/Spinner";
import { deviceGradient, deviceInitials } from "@/lib/deviceAvatar";
import type { DeviceWithEntities } from "@/lib/ha/types";

export function DeviceEditor({ deviceId }: { deviceId: string }) {
  const { getDevice, areas, loading, error: inventoryError, refresh } =
    useDeviceInventory();
  const row = getDevice(deviceId);
  const [name, setName] = useState("");
  const [areaId, setAreaId] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!row) return;
    setName(row.displayName);
    setAreaId(row.device.area_id ?? "");
  }, [row]);

  const loadError = useMemo(() => {
    if (loading) return null;
    if (inventoryError) return inventoryError;
    if (!row) return "Device not found";
    return null;
  }, [loading, inventoryError, row]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  async function saveDevice() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, area_id: areaId || null }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setToast({ message: "Device saved successfully", variant: "success" });
      await refresh(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setError(msg);
      setToast({ message: msg, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function saveEntity(
    entityId: string,
    patch: { name?: string; enabled?: boolean },
  ) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/entities/${encodeURIComponent(entityId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setToast({ message: "Entity updated", variant: "success" });
      await refresh(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Entity update failed";
      setError(msg);
      setToast({ message: msg, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingPanel message="Loading device details…" />;
  }

  if (loadError && !row) {
    return (
      <Alert variant="error" title="Device unavailable">
        {loadError}
        <Link href="/" className="mt-4 inline-flex text-sm text-accent hover:underline">
          ← Back to devices
        </Link>
      </Alert>
    );
  }

  if (!row) return null;

  const modelLine = [row.device.manufacturer, row.device.model].filter(Boolean).join(" · ");

  return (
    <div className="animate-in space-y-6">
      {toast && <Toast message={toast.message} variant={toast.variant} />}

      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-accent"
      >
        <IconChevronLeft className="h-4 w-4" />
        All devices
      </Link>

      <div className="flex flex-wrap items-start gap-5">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-semibold text-white shadow-xl"
          style={{ background: deviceGradient(row.displayName) }}
        >
          {deviceInitials(row.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{row.displayName}</h1>
          {modelLine && <p className="mt-1 text-sm text-muted">{modelLine}</p>}
          <p className="mt-2 font-mono text-xs text-muted-foreground">{row.device.id}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <PowerBadge status={row.powerStatus} />
            {row.areaName ? <Badge tone="accent">{row.areaName}</Badge> : <Badge tone="warning">No area</Badge>}
            <Badge>{row.entityCount} entities</Badge>
            {row.onCount > 0 && <Badge tone="success">{row.onCount} on</Badge>}
            {row.offCount > 0 && <Badge>{row.offCount} off</Badge>}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Device settings"
          description="Changes sync directly to Home Assistant's device registry."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Friendly name in Home Assistant"
          />
          <Select
            label="Area"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
          >
            <option value="">No area assigned</option>
            {areas.map((a) => (
              <option key={a.area_id} value={a.area_id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="primary" disabled={saving} onClick={() => void saveDevice()}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button variant="ghost" onClick={() => { setName(row.displayName); setAreaId(row.device.area_id ?? ""); }}>
            Reset
          </Button>
        </div>
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      </Card>

      <Card padding={false}>
        <div className="border-b border-border px-6 py-5">
          <h3 className="text-base font-semibold">Entities ({row.entities.length})</h3>
          <p className="mt-1 text-sm text-muted">
            Rename or enable/disable individual entities for this device.
          </p>
        </div>
        <ul className="divide-y divide-border/80">
          {row.entities.map((ent) => {
            const domain = ent.entity_id.split(".")[0];
            const disabled = Boolean(ent.disabled_by);
            const stateInfo = row.entityStates.find((s) => s.entity_id === ent.entity_id);
            return (
              <li
                key={ent.entity_id}
                className="flex flex-col gap-3 px-6 py-4 transition hover:bg-white/[0.02] sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="accent">{domain}</Badge>
                    {stateInfo && <EntityPowerBadge info={stateInfo} />}
                    {stateInfo && stateInfo.isOn === null && (
                      <Badge>{stateInfo.state}</Badge>
                    )}
                    {disabled && <Badge tone="danger">Disabled</Badge>}
                  </div>
                  <p className="mt-2 font-mono text-xs text-accent/90">{ent.entity_id}</p>
                  <p className="mt-1 text-sm text-muted">
                    {ent.name || ent.original_name || "No friendly name"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => {
                      const next = window.prompt(
                        "Entity friendly name",
                        ent.name ?? ent.original_name ?? "",
                      );
                      if (next !== null) void saveEntity(ent.entity_id, { name: next });
                    }}
                  >
                    Rename
                  </Button>
                  <Button
                    size="sm"
                    variant={disabled ? "primary" : "ghost"}
                    disabled={saving}
                    onClick={() =>
                      void saveEntity(ent.entity_id, { enabled: disabled })
                    }
                  >
                    {disabled ? "Enable" : "Disable"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
