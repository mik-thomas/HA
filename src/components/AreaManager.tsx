"use client";

import { useCallback, useEffect, useState } from "react";
import { IconLayers, IconPlus } from "@/components/icons";
import { Alert, Toast } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader, StatPill } from "@/components/ui/PageHeader";
import { LoadingPanel } from "@/components/ui/Spinner";
import type { HaArea } from "@/lib/ha/types";

export function AreaManager() {
  const [areas, setAreas] = useState<HaArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/areas");
      const text = await res.text();
      let json: { areas?: HaArea[]; error?: string };
      try {
        json = JSON.parse(text) as { areas?: HaArea[]; error?: string };
      } catch {
        throw new Error(
          res.ok ? "Invalid response from server" : text.slice(0, 120) || res.statusText,
        );
      }
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      const list = Array.isArray(json.areas) ? json.areas : [];
      setAreas(
        [...list].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load areas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  async function createArea() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setNewName("");
      setToast({ message: `Created area "${name}"`, variant: "success" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function renameArea(areaId: string, current: string) {
    const name = window.prompt("Area name", current);
    if (!name?.trim()) return;
    try {
      const res = await fetch(`/api/areas/${areaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setToast({ message: "Area renamed", variant: "success" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rename failed");
    }
  }

  async function removeArea(areaId: string, name: string) {
    if (!window.confirm(`Delete area "${name}"? Devices in this area will be unassigned.`)) return;
    try {
      const res = await fetch(`/api/areas/${areaId}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setToast({ message: "Area deleted", variant: "success" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="Organization" title="Areas" />
        <LoadingPanel message="Loading areas…" />
      </>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} variant={toast.variant} />}

      <PageHeader
        eyebrow="Organization"
        title="Areas"
        description="Areas group devices by room or zone. Assign devices from the device editor after creating an area here."
        stats={<StatPill label="Areas" value={areas.length} />}
      />

      <Card className="mb-6">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void createArea();
          }}
        >
          <div className="flex-1">
            <Input
              label="New area"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Study, Kitchen, Garden"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={creating || !newName.trim()}
            className="sm:mb-0 sm:self-end"
          >
            <IconPlus className="h-4 w-4" />
            {creating ? "Adding…" : "Add area"}
          </Button>
        </form>
      </Card>

      {error && (
        <div className="mb-6">
          <Alert variant="error" title="Something went wrong">
            {error}
          </Alert>
        </div>
      )}

      {areas.length === 0 ? (
        <div className="glass-panel rounded-2xl px-6 py-16 text-center animate-in">
          <IconLayers className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-4 text-lg font-medium">No areas yet</p>
          <p className="mt-2 text-sm text-muted">Create your first area to start organizing devices.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-in">
          {areas.map((area) => (
            <div
              key={area.area_id}
              className="glass-panel group rounded-2xl p-5 transition hover:border-accent/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-dim text-accent">
                  <IconLayers className="h-5 w-5" />
                </div>
                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                  <Button size="sm" variant="ghost" onClick={() => void renameArea(area.area_id, area.name)}>
                    Rename
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => void removeArea(area.area_id, area.name)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{area.name}</h3>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{area.area_id}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
