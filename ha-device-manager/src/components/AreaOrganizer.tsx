"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconLayers, IconRefresh, IconSearch } from "@/components/icons";
import { useIsDeviceHighlighted } from "@/components/DeviceHighlightContext";
import { useDeviceInventory } from "@/components/DeviceInventoryContext";
import { useDeviceModal } from "@/components/DeviceModalContext";
import { PowerBadge } from "@/components/PowerBadge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingPanel } from "@/components/ui/Spinner";
import { deviceGradient, deviceInitials } from "@/lib/deviceAvatar";
import type { DeviceWithEntities } from "@/lib/ha/types";

const DRAG_TYPE = "application/x-ha-device-id";
const UNASSIGNED_ID = "__unassigned__";

function DeviceChip({
  device,
  dragging,
  saving,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  device: DeviceWithEntities;
  dragging: boolean;
  saving: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onOpen: () => void;
}) {
  const didDrag = useRef(false);
  const highlighted = useIsDeviceHighlighted(device.device.id);

  return (
    <div
      id={`device-row-${device.device.id}`}
      draggable={!saving}
      onDragStart={(e) => {
        didDrag.current = true;
        onDragStart(e);
      }}
      onDragEnd={() => {
        onDragEnd();
        setTimeout(() => {
          didDrag.current = false;
        }, 0);
      }}
      onClick={() => {
        if (!didDrag.current) onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      className={`flex cursor-grab items-center gap-2 rounded-xl border border-border bg-background-elevated/90 px-2.5 py-2 transition active:cursor-grabbing ${
        dragging ? "opacity-40" : "hover:border-accent/35 hover:bg-white/[0.04]"
      } ${saving ? "pointer-events-none opacity-60" : ""} ${
        highlighted ? "device-highlight-pulse" : ""
      }`}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
        style={{ background: deviceGradient(device.displayName) }}
      >
        {deviceInitials(device.displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{device.displayName}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {device.entityCount} entities
        </p>
      </div>
      {(device.powerStatus === "on" || device.powerStatus === "off") && (
        <PowerBadge status={device.powerStatus} />
      )}
    </div>
  );
}

function DropColumn({
  areaId,
  title,
  subtitle,
  devices,
  draggingId,
  savingId,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  onDeviceDragStart,
  onDeviceDragEnd,
  onDeviceOpen,
}: {
  areaId: string;
  title: string;
  subtitle?: string;
  devices: DeviceWithEntities[];
  draggingId: string | null;
  savingId: string | null;
  isDropTarget: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDeviceDragStart: (deviceId: string) => (e: React.DragEvent) => void;
  onDeviceDragEnd: () => void;
  onDeviceOpen: (device: DeviceWithEntities) => void;
}) {
  return (
    <section
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex min-h-[200px] flex-col rounded-2xl border transition-all ${
        isDropTarget
          ? "border-accent/60 bg-accent-dim ring-2 ring-accent/25"
          : "border-border bg-card-solid/40"
      }`}
    >
      <header className="border-b border-border/80 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-dim text-accent">
              <IconLayers className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
            </div>
          </div>
          <span className="rounded-full bg-white/6 px-2.5 py-0.5 text-xs tabular-nums text-muted">
            {devices.length}
          </span>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {devices.length === 0 ? (
          <p
            className={`flex flex-1 items-center justify-center rounded-xl border border-dashed px-3 py-8 text-center text-sm ${
              isDropTarget ? "border-accent/40 text-accent" : "border-border/60 text-muted"
            }`}
          >
            {isDropTarget ? "Release to assign here" : "Drop devices here"}
          </p>
        ) : (
          devices.map((d) => (
            <DeviceChip
              key={d.device.id}
              device={d}
              dragging={draggingId === d.device.id}
              saving={savingId === d.device.id}
              onDragStart={onDeviceDragStart(d.device.id)}
              onDragEnd={onDeviceDragEnd}
              onOpen={() => onDeviceOpen(d)}
            />
          ))
        )}
      </div>
    </section>
  );
}

export function AreaOrganizer() {
  const { openDevice } = useDeviceModal();
  const {
    devices: liveDevices,
    areas,
    loading,
    error: inventoryError,
    refresh,
  } = useDeviceInventory();
  const [deviceOverride, setDeviceOverride] = useState<DeviceWithEntities[] | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const data = useMemo(
    () => ({
      devices: deviceOverride ?? liveDevices,
      areas,
    }),
    [deviceOverride, liveDevices, areas],
  );

  const error = moveError ?? inventoryError;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const devicesByArea = useMemo(() => {
    if (!data) return new Map<string, DeviceWithEntities[]>();
    const map = new Map<string, DeviceWithEntities[]>();
    map.set(UNASSIGNED_ID, []);
    for (const area of data.areas ?? []) {
      map.set(area.area_id, []);
    }
    for (const d of data.devices) {
      const key = d.device.area_id ?? UNASSIGNED_ID;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
    return map;
  }, [data]);

  const sidebarDevices = useMemo(() => {
    if (!data) return [];
    const q = sidebarQuery.trim().toLowerCase();
    return data.devices
      .filter((d) => {
        if (!q) return true;
        return (
          d.displayName.toLowerCase().includes(q) ||
          (d.areaName ?? "unassigned").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [data, sidebarQuery]);

  const moveDevice = useCallback(
    async (deviceId: string, targetAreaId: string) => {
      const device = data.devices.find((d) => d.device.id === deviceId);
      if (!device) return;

      const newAreaId = targetAreaId === UNASSIGNED_ID ? null : targetAreaId;
      if (device.device.area_id === newAreaId) return;

      const areaName =
        newAreaId === null
          ? null
          : areas.find((a) => a.area_id === newAreaId)?.name ?? null;

      setSavingId(deviceId);
      setMoveError(null);
      setDeviceOverride(
        data.devices.map((d) =>
          d.device.id === deviceId
            ? {
                ...d,
                device: { ...d.device, area_id: newAreaId },
                areaName,
              }
            : d,
        ),
      );

      try {
        const res = await fetch(`/api/devices/${deviceId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ area_id: newAreaId }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(json.error ?? res.statusText);
        const label = areaName ?? "Unassigned";
        setToast(`Moved “${device.displayName}” to ${label}`);
        setDeviceOverride(null);
        await refresh(true);
      } catch (e) {
        setDeviceOverride(null);
        setMoveError(e instanceof Error ? e.message : "Move failed");
      } finally {
        setSavingId(null);
      }
    },
    [data.devices, areas, refresh],
  );

  const handleDragStart = (deviceId: string) => (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_TYPE, deviceId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(deviceId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  const handleDragOver = (areaId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(areaId);
  };

  const handleDrop = (areaId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const deviceId = e.dataTransfer.getData(DRAG_TYPE);
    setDropTarget(null);
    setDraggingId(null);
    if (deviceId) void moveDevice(deviceId, areaId);
  };

  if (loading) {
    return <LoadingPanel message="Loading areas and devices…" />;
  }

  if (error && !data.devices.length && !loading) {
    return (
      <Alert variant="error" title="Could not load organizer" onRetry={() => void refresh()}>
        {error}
      </Alert>
    );
  }

  const sortedAreas = [...(data.areas ?? [])].sort((a, b) =>
    (a.name ?? "").localeCompare(b.name ?? ""),
  );

  return (
    <div className="animate-in">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-success/30 bg-card-solid px-4 py-2 text-sm shadow-xl">
          {toast}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            Organize
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Areas & devices
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Drag devices between areas or from the sidebar. Changes save to Home Assistant
            immediately.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void refresh(true)}>
          <IconRefresh className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Update failed">
            {error}
          </Alert>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Main: areas */}
        <div className="min-w-0 flex-1 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DropColumn
              areaId={UNASSIGNED_ID}
              title="Unassigned"
              subtitle="No area in Home Assistant"
              devices={devicesByArea.get(UNASSIGNED_ID) ?? []}
              draggingId={draggingId}
              savingId={savingId}
              isDropTarget={dropTarget === UNASSIGNED_ID}
              onDragOver={handleDragOver(UNASSIGNED_ID)}
              onDragLeave={() => setDropTarget(null)}
              onDrop={handleDrop(UNASSIGNED_ID)}
              onDeviceDragStart={handleDragStart}
              onDeviceDragEnd={handleDragEnd}
              onDeviceOpen={openDevice}
            />
            {sortedAreas.map((area) => (
              <DropColumn
                key={area.area_id}
                areaId={area.area_id}
                title={area.name}
                devices={devicesByArea.get(area.area_id) ?? []}
                draggingId={draggingId}
                savingId={savingId}
                isDropTarget={dropTarget === area.area_id}
                onDragOver={handleDragOver(area.area_id)}
                onDragLeave={() => setDropTarget(null)}
                onDrop={handleDrop(area.area_id)}
                onDeviceDragStart={handleDragStart}
                onDeviceDragEnd={handleDragEnd}
                onDeviceOpen={openDevice}
              />
            ))}
          </div>
        </div>

        {/* Right sidebar: all devices */}
        <aside className="glass-panel w-full shrink-0 rounded-2xl lg:sticky lg:top-20 lg:w-80 xl:w-96">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">All devices</h2>
            <p className="mt-1 text-xs text-muted">
              Drag into an area on the left
            </p>
            <div className="mt-3">
              <Input
                icon={<IconSearch className="h-4 w-4" />}
                placeholder="Filter devices…"
                value={sidebarQuery}
                onChange={(e) => setSidebarQuery(e.target.value)}
              />
            </div>
          </div>
          <ul className="max-h-[calc(100vh-14rem)] space-y-2 overflow-y-auto p-3">
            {sidebarDevices.map((d) => (
              <li key={d.device.id}>
                <DeviceChip
                  device={d}
                  dragging={draggingId === d.device.id}
                  saving={savingId === d.device.id}
                  onDragStart={handleDragStart(d.device.id)}
                  onDragEnd={handleDragEnd}
                  onOpen={() => openDevice(d)}
                />
                {d.areaName && (
                  <p className="mt-1 truncate pl-1 text-[10px] text-muted-foreground">
                    Currently: {d.areaName}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
