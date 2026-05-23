import type { HaArea, HaDevice, HaEntity, HaState, HaWsResult } from "./types";

function getConfig() {
  const baseUrl = process.env.HA_URL?.replace(/\/$/, "");
  const token = process.env.HA_TOKEN;
  if (!baseUrl || !token) {
    throw new Error(
      "Missing HA_URL or HA_TOKEN. Set them in .env.local (local) or Railway variables (deploy).",
    );
  }
  return { baseUrl, token };
}

function wsUrl(baseUrl: string): string {
  const u = new URL(baseUrl);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = "/api/websocket";
  return u.toString();
}

export async function haWsCall<T>(
  messages: Array<Record<string, unknown>>,
): Promise<HaWsResult<T>[]> {
  const { baseUrl, token } = getConfig();
  const expectedIds = new Set(messages.map((_, i) => i + 1));

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl(baseUrl));
    const results = new Map<number, HaWsResult<T>>();
    let authOk = false;

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Home Assistant WebSocket timeout"));
    }, 120_000);

    const finish = () => {
      clearTimeout(timeout);
      ws.close();
      const ordered: HaWsResult<T>[] = [];
      for (let i = 1; i <= messages.length; i++) {
        const row = results.get(i);
        if (!row) {
          reject(new Error(`Missing response for request ${i}`));
          return;
        }
        if (row.success === false && row.error) {
          reject(new Error(row.error.message));
          return;
        }
        ordered.push(row);
      }
      resolve(ordered);
    };

    ws.addEventListener("message", (event) => {
      const data = JSON.parse(String(event.data)) as {
        type: string;
        id?: number;
        success?: boolean;
        result?: T;
        error?: { message: string };
      };

      if (data.type === "auth_required") {
        ws.send(JSON.stringify({ type: "auth", access_token: token }));
        return;
      }
      if (data.type === "auth_invalid") {
        clearTimeout(timeout);
        ws.close();
        reject(new Error("Home Assistant rejected the access token"));
        return;
      }
      if (data.type === "auth_ok") {
        authOk = true;
        messages.forEach((msg, i) => {
          ws.send(JSON.stringify({ id: i + 1, ...msg }));
        });
        return;
      }
      if (
        authOk &&
        data.type === "result" &&
        data.id !== undefined &&
        expectedIds.has(data.id)
      ) {
        results.set(data.id, data as HaWsResult<T>);
        if (results.size === messages.length) {
          finish();
        }
      }
    });

    ws.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("WebSocket connection failed"));
    });
  });
}

export async function fetchRegistry() {
  const [devicesRes, entitiesRes, areasRes] = await haWsCall<
    HaDevice[] | HaEntity[] | HaArea[]
  >([
    { type: "config/device_registry/list" },
    { type: "config/entity_registry/list" },
    { type: "config/area_registry/list" },
  ]);

  return {
    devices: (devicesRes.result ?? []) as HaDevice[],
    entities: (entitiesRes.result ?? []) as HaEntity[],
    areas: (areasRes.result ?? []) as HaArea[],
  };
}

export async function fetchStates(): Promise<HaState[]> {
  const { baseUrl, token } = getConfig();
  const res = await fetch(`${baseUrl}/api/states`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Home Assistant states failed: ${res.status}`);
  }
  return res.json() as Promise<HaState[]>;
}

export async function updateDevice(
  deviceId: string,
  updates: { name_by_user?: string | null; area_id?: string | null },
) {
  await haWsCall([{ type: "config/device_registry/update", device_id: deviceId, ...updates }]);
}

export async function updateEntity(
  entityId: string,
  updates: { name?: string | null; area_id?: string | null; disabled_by?: string | null },
) {
  await haWsCall([
    { type: "config/entity_registry/update", entity_id: entityId, ...updates },
  ]);
}

export async function createArea(name: string) {
  const [res] = await haWsCall<HaArea>([
    { type: "config/area_registry/create", name },
  ]);
  return res.result as HaArea;
}

export async function updateArea(areaId: string, name: string) {
  await haWsCall([{ type: "config/area_registry/update", area_id: areaId, name }]);
}

export async function deleteArea(areaId: string) {
  await haWsCall([{ type: "config/area_registry/delete", area_id: areaId }]);
}

export function deviceDisplayName(device: HaDevice): string {
  return device.name_by_user || device.name || device.id;
}
