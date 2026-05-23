"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { enrichDevicesWithStates } from "@/lib/ha/inventory";
import type { DeviceWithEntities, HaArea, HaState } from "@/lib/ha/types";

type InventoryResponse = {
  devices: DeviceWithEntities[];
  areas: HaArea[];
  areaMap: Record<string, string>;
  error?: string;
};

type DeviceInventoryContextValue = {
  loading: boolean;
  error: string | null;
  liveConnected: boolean;
  areas: HaArea[];
  areaMap: Record<string, string>;
  devices: DeviceWithEntities[];
  stateMap: Map<string, HaState>;
  refreshing: boolean;
  refresh: (silent?: boolean) => Promise<void>;
  getDevice: (deviceId: string) => DeviceWithEntities | undefined;
};

const DeviceInventoryContext = createContext<DeviceInventoryContextValue | null>(null);

function applyStatePatch(map: Map<string, HaState>, state: HaState): Map<string, HaState> {
  const next = new Map(map);
  const prev = next.get(state.entity_id);
  next.set(state.entity_id, {
    ...prev,
    ...state,
    entity_id: state.entity_id,
    state: state.state,
  });
  return next;
}

export function DeviceInventoryProvider({ children }: { children: ReactNode }) {
  const [base, setBase] = useState<InventoryResponse | null>(null);
  const [stateMap, setStateMap] = useState<Map<string, HaState>>(() => new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);

  const loadInventory = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/devices", { cache: "no-store" });
      const text = await res.text();
      let json: InventoryResponse;
      try {
        json = JSON.parse(text) as InventoryResponse;
      } catch {
        throw new Error(
          res.ok ? "Invalid response from server" : text.slice(0, 120) || res.statusText,
        );
      }
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setBase(json);

      const map = new Map<string, HaState>();
      for (const device of json.devices) {
        for (const es of device.entityStates) {
          map.set(es.entity_id, {
            entity_id: es.entity_id,
            state: es.state,
            attributes: {},
          });
        }
      }
      setStateMap((prev) => (prev.size === 0 ? map : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load devices");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let disposed = false;

    const startPoll = () => {
      if (pollTimer) return;
      pollTimer = setInterval(() => {
        void fetch("/api/states", { cache: "no-store" })
          .then((r) => r.json())
          .then((json: { states?: HaState[] }) => {
            if (disposed || !json.states) return;
            setStateMap(new Map(json.states.map((s) => [s.entity_id, s])));
            setLiveConnected(true);
          })
          .catch(() => setLiveConnected(false));
      }, 3000);
    };

    const connect = () => {
      es = new EventSource("/api/states/stream");

      es.addEventListener("snapshot", (ev) => {
        const states = JSON.parse((ev as MessageEvent).data) as HaState[];
        setStateMap(new Map(states.map((s) => [s.entity_id, s])));
        setLiveConnected(true);
      });

      es.addEventListener("state", (ev) => {
        const state = JSON.parse((ev as MessageEvent).data) as HaState;
        setStateMap((prev) => applyStatePatch(prev, state));
        setLiveConnected(true);
      });

      es.addEventListener("error", () => {
        setLiveConnected(false);
        es?.close();
        es = null;
        startPoll();
        window.setTimeout(() => {
          if (!disposed) connect();
        }, 5000);
      });
    };

    connect();

    return () => {
      disposed = true;
      es?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  const devices = useMemo(() => {
    if (!base) return [];
    return enrichDevicesWithStates(base.devices, stateMap);
  }, [base, stateMap]);

  const getDevice = useCallback(
    (deviceId: string) => devices.find((d) => d.device.id === deviceId),
    [devices],
  );

  const value = useMemo(
    () => ({
      loading: loading && !base,
      error,
      liveConnected,
      areas: base?.areas ?? [],
      areaMap: base?.areaMap ?? {},
      devices,
      stateMap,
      refreshing,
      refresh: loadInventory,
      getDevice,
    }),
    [
      loading,
      base,
      error,
      liveConnected,
      devices,
      stateMap,
      refreshing,
      loadInventory,
      getDevice,
    ],
  );

  return (
    <DeviceInventoryContext.Provider value={value}>
      {children}
    </DeviceInventoryContext.Provider>
  );
}

export function useDeviceInventory() {
  const ctx = useContext(DeviceInventoryContext);
  if (!ctx) {
    throw new Error("useDeviceInventory must be used within DeviceInventoryProvider");
  }
  return ctx;
}
