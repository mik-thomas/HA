"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconChevronRight, IconRefresh, IconSearch } from "@/components/icons";
import { useIsDeviceHighlighted } from "@/components/DeviceHighlightContext";
import { useDeviceModal } from "@/components/DeviceModalContext";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader, StatPill } from "@/components/ui/PageHeader";
import { TableSkeleton } from "@/components/ui/Spinner";
import { PowerBadge } from "@/components/PowerBadge";
import { deviceGradient, deviceInitials } from "@/lib/deviceAvatar";
import type { DevicePowerStatus, DeviceWithEntities, HaArea } from "@/lib/ha/types";

interface InventoryResponse {
  devices: DeviceWithEntities[];
  areas: HaArea[];
  areaMap: Record<string, string>;
  error?: string;
}

export function DeviceList() {
  const { openDevice } = useDeviceModal();
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [powerFilter, setPowerFilter] = useState<"" | DevicePowerStatus>("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/devices");
      const text = await res.text();
      let json: InventoryResponse;
      try {
        json = JSON.parse(text) as InventoryResponse;
      } catch {
        throw new Error(
          res.ok ? "Invalid response from server" : text.slice(0, 120) || res.statusText,
        );
      }
      if (!res.ok) {
        const msg = json.error ?? res.statusText;
        if (msg === "Internal Server Error" || text.includes("Internal Server Error")) {
          throw new Error(
            "App server error — run: cd ha-device-manager && npm run serve",
          );
        }
        throw new Error(msg);
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load devices");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.devices.filter((row) => {
      if (areaFilter && row.device.area_id !== areaFilter) return false;
      if (powerFilter && row.powerStatus !== powerFilter) return false;
      if (!q) return true;
      const hay = [
        row.displayName,
        row.areaName ?? "",
        row.device.manufacturer ?? "",
        row.device.model ?? "",
        ...row.entities.map((e) => e.entity_id),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data, query, areaFilter, powerFilter]);

  const onDevices = useMemo(
    () => (data?.devices ?? []).filter((d) => d.powerStatus === "on").length,
    [data],
  );

  const unassigned = useMemo(
    () => filtered.filter((d) => !d.device.area_id).length,
    [filtered],
  );

  if (loading) {
    return (
      <>
        <PageHeader
          eyebrow="Inventory"
          title="Devices"
          description="Fetching your Home Assistant device registry…"
        />
        <TableSkeleton />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader eyebrow="Inventory" title="Devices" />
        <Alert variant="error" title="Could not reach Home Assistant" onRetry={() => void load()}>
          {error}
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Devices"
        description="Browse, rename, and organize every device connected to your Home Assistant instance."
        stats={
          <div className="flex gap-2">
            <StatPill label="Total" value={data?.devices?.length ?? 0} />
            <StatPill label="On now" value={onDevices} />
            <StatPill label="Showing" value={filtered.length} />
          </div>
        }
      />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end animate-in">
        <div className="flex-1">
          <Input
            icon={<IconSearch className="h-4 w-4" />}
            placeholder="Search name, model, entity ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            label="Area"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
          >
            <option value="">All areas</option>
            {(data?.areas ?? []).map((area) => (
              <option key={area.area_id} value={area.area_id}>
                {area.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-40">
          <Select
            label="Power"
            value={powerFilter}
            onChange={(e) => setPowerFilter(e.target.value as "" | DevicePowerStatus)}
          >
            <option value="">All states</option>
            <option value="on">On</option>
            <option value="off">Off</option>
            <option value="mixed">Mixed</option>
            <option value="unavailable">Unavailable</option>
          </Select>
        </div>
        <Button
          variant="secondary"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="shrink-0"
        >
          <IconRefresh className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {(query || areaFilter) && (
        <div className="mb-4 flex flex-wrap gap-2 animate-in">
          {areaFilter && (
            <Badge tone="accent">
              {data?.areaMap[areaFilter] ?? "Filtered area"}
            </Badge>
          )}
          {unassigned > 0 && !areaFilter && (
            <Badge tone="warning">{unassigned} without area</Badge>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="glass-panel animate-in rounded-2xl px-6 py-16 text-center">
          <p className="text-lg font-medium text-foreground">No devices match</p>
          <p className="mt-2 text-sm text-muted">Try clearing your search or area filter.</p>
          <Button
            variant="ghost"
            className="mt-4"
            onClick={() => {
              setQuery("");
              setAreaFilter("");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="glass-panel animate-in overflow-hidden rounded-2xl">
          <div className="hidden border-b border-border bg-white/[0.02] px-4 py-3 text-xs font-medium tracking-wide text-muted uppercase sm:grid sm:grid-cols-[minmax(0,2fr)_88px_1fr_1fr_72px_40px] sm:gap-4">
            <span>Device</span>
            <span>Status</span>
            <span>Area</span>
            <span>Model</span>
            <span className="text-right">Entities</span>
            <span />
          </div>
          <ul className="divide-y divide-border/80">
            {filtered.map((row) => (
              <DeviceRow key={row.device.id} row={row} onOpen={() => openDevice(row)} />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function DeviceRow({
  row,
  onOpen,
}: {
  row: DeviceWithEntities;
  onOpen: () => void;
}) {
  const highlighted = useIsDeviceHighlighted(row.device.id);

  return (
    <li id={`device-row-${row.device.id}`}>
      <button
        type="button"
        onClick={onOpen}
        className={`group flex w-full flex-col gap-3 px-4 py-4 text-left transition hover:bg-white/[0.03] sm:grid sm:grid-cols-[minmax(0,2fr)_88px_1fr_1fr_72px_40px] sm:items-center sm:gap-4 ${
          highlighted ? "device-highlight-pulse" : ""
        }`}
      >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-lg"
                      style={{ background: deviceGradient(row.displayName) }}
                    >
                      {deviceInitials(row.displayName)}
                      {(row.powerStatus === "on" || row.powerStatus === "off") && (
                        <span
                          className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background-elevated ${
                            row.powerStatus === "on" ? "power-dot-on" : "power-dot-off"
                          }`}
                          title={row.powerStatus === "on" ? "On" : "Off"}
                        />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-foreground group-hover:text-accent transition-colors">
                          {row.displayName}
                        </p>
                        <span className="sm:hidden">
                          <PowerBadge status={row.powerStatus} />
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground sm:hidden">
                        {[row.device.manufacturer, row.device.model].filter(Boolean).join(" · ") ||
                          "Unknown model"}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:block">
                    <PowerBadge status={row.powerStatus} />
                  </div>
                  <div className="hidden sm:block">
                    {row.areaName ? (
                      <Badge>{row.areaName}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                  <p className="hidden truncate text-sm text-muted sm:block">
                    {[row.device.manufacturer, row.device.model].filter(Boolean).join(" ") || "—"}
                  </p>
                  <p className="hidden text-right text-sm tabular-nums text-muted sm:block">
                    {row.entityCount}
                  </p>
                  <span className="ml-auto flex items-center text-muted group-hover:text-accent sm:ml-0 sm:justify-end">
                    <IconChevronRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
                  </span>
      </button>
    </li>
  );
}
