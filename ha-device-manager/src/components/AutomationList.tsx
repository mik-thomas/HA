"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconRefresh, IconSearch } from "@/components/icons";
import {
  AutomationModeBadge,
  AutomationStatusBadge,
} from "@/components/AutomationStatusBadge";
import { useDeviceInventory } from "@/components/DeviceInventoryContext";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader, StatPill } from "@/components/ui/PageHeader";
import { TableSkeleton } from "@/components/ui/Spinner";
import { parseAutomation } from "@/lib/ha/automations";
import type { HaAutomation } from "@/lib/ha/types";

type StatusFilter = "" | "enabled" | "disabled" | "running";

function formatLastTriggered(iso: string | null): string {
  if (!iso) return "Never";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function AutomationList() {
  const { stateMap, liveConnected } = useDeviceInventory();
  const [base, setBase] = useState<HaAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/automations", { cache: "no-store" });
      const json = (await res.json()) as { automations?: HaAutomation[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setBase(Array.isArray(json.automations) ? json.automations : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load automations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const automations = useMemo(() => {
    return base
      .map((a) => {
        const live = stateMap.get(a.entity_id);
        return live ? parseAutomation(live) : a;
      })
      .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));
  }, [base, stateMap]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return automations.filter((a) => {
      if (statusFilter === "enabled" && !a.enabled) return false;
      if (statusFilter === "disabled" && a.enabled) return false;
      if (statusFilter === "running" && !a.running) return false;
      if (!q) return true;
      const hay = [a.friendly_name, a.entity_id, a.config_id ?? ""].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [automations, query, statusFilter]);

  const enabledCount = useMemo(
    () => automations.filter((a) => a.enabled).length,
    [automations],
  );
  const runningCount = useMemo(
    () => automations.filter((a) => a.running).length,
    [automations],
  );

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="Home Assistant" title="Automations" />
        <TableSkeleton />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader eyebrow="Home Assistant" title="Automations" />
        <Alert variant="error" title="Could not load automations" onRetry={() => void load()}>
          {error}
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Home Assistant"
        title="Automations"
        description="Enabled automations can run when triggered. “Running” means an automation is executing its actions right now."
        stats={
          <div className="flex flex-wrap gap-2">
            <StatPill label="Total" value={automations.length} />
            <StatPill label="Enabled" value={enabledCount} />
            <StatPill label="Running now" value={runningCount} />
            <StatPill label="Showing" value={filtered.length} />
          </div>
        }
      />

      {!liveConnected && (
        <p className="mb-4 text-xs text-muted">
          Live updates paused — refreshing periodically. Use Refresh if states look stale.
        </p>
      )}

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end animate-in">
        <div className="flex-1">
          <Input
            icon={<IconSearch className="h-4 w-4" />}
            placeholder="Search name, entity ID, config id…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="">All</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
            <option value="running">Running now</option>
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

      {filtered.length === 0 ? (
        <div className="glass-panel animate-in rounded-2xl px-6 py-16 text-center">
          <p className="text-lg font-medium text-foreground">No automations match</p>
          <p className="mt-2 text-sm text-muted">Try clearing filters or create automations in Home Assistant.</p>
        </div>
      ) : (
        <div className="glass-panel animate-in overflow-hidden rounded-2xl">
          <div className="hidden border-b border-border bg-white/[0.02] px-4 py-3 text-xs font-medium tracking-wide text-muted uppercase sm:grid sm:grid-cols-[minmax(0,2fr)_120px_100px_1fr] sm:gap-4">
            <span>Automation</span>
            <span>Status</span>
            <span>Mode</span>
            <span>Last triggered</span>
          </div>
          <ul className="divide-y divide-border/80">
            {filtered.map((row) => (
              <li
                key={row.entity_id}
                className={`px-4 py-4 sm:grid sm:grid-cols-[minmax(0,2fr)_120px_100px_1fr] sm:items-center sm:gap-4 ${
                  row.running ? "bg-warning/[0.04]" : row.enabled ? "" : "opacity-80"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{row.friendly_name}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground break-all">
                    {row.entity_id}
                  </p>
                  {row.config_id && (
                    <p className="mt-0.5 font-mono text-[10px] text-muted">
                      id: {row.config_id}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 sm:hidden">
                    <AutomationStatusBadge automation={row} />
                    <AutomationModeBadge mode={row.mode} />
                  </div>
                  <p className="mt-2 text-xs text-muted sm:hidden">
                    Last: {formatLastTriggered(row.last_triggered)}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <AutomationStatusBadge automation={row} />
                </div>
                <div className="hidden sm:block">
                  <AutomationModeBadge mode={row.mode} />
                </div>
                <p className="hidden text-sm text-muted sm:block">
                  {formatLastTriggered(row.last_triggered)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

    </>
  );
}
