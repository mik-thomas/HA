import {
  deviceDisplayName,
  fetchRegistry,
  fetchStates,
} from "./client";
import {
  countsForDevicePower,
  getDevicePowerStatus,
  getEntityStateInfo,
} from "./powerState";
import type { DeviceWithEntities, HaArea, HaDevice, HaEntity, HaState } from "./types";

export async function buildInventory(): Promise<{
  devices: DeviceWithEntities[];
  areas: HaArea[];
  areaMap: Record<string, string>;
}> {
  const [{ devices, entities, areas }, states] = await Promise.all([
    fetchRegistry(),
    fetchStates(),
  ]);
  const stateMap = new Map(states.map((s) => [s.entity_id, s]));
  const areaMap = Object.fromEntries(areas.map((a) => [a.area_id, a.name]));

  const entitiesByDevice = new Map<string, HaEntity[]>();
  for (const ent of entities) {
    if (!ent.device_id) continue;
    const list = entitiesByDevice.get(ent.device_id) ?? [];
    list.push(ent);
    entitiesByDevice.set(ent.device_id, list);
  }

  const enriched = buildDevicesFromRegistry(
    devices,
    entitiesByDevice,
    stateMap,
    areaMap,
  );

  return { devices: enriched, areas, areaMap };
}

function buildDevicesFromRegistry(
  devices: HaDevice[],
  entitiesByDevice: Map<string, HaEntity[]>,
  stateMap: Map<string, HaState>,
  areaMap: Record<string, string>,
): DeviceWithEntities[] {
  return devices
    .map((device) => {
      const deviceEntities = (entitiesByDevice.get(device.id) ?? []).sort((a, b) =>
        a.entity_id.localeCompare(b.entity_id),
      );
      const areaName = device.area_id ? areaMap[device.area_id] ?? null : null;
      return enrichDeviceWithStates(
        {
          device,
          displayName: deviceDisplayName(device),
          areaName,
          entities: deviceEntities,
          entityCount: deviceEntities.length,
          powerStatus: "none",
          entityStates: [],
          onCount: 0,
          offCount: 0,
        },
        stateMap,
      );
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/** Recompute power/entity states from a live HA state map (WebSocket or poll). */
export function enrichDeviceWithStates(
  device: DeviceWithEntities,
  stateMap: Map<string, HaState>,
): DeviceWithEntities {
  const entityStates = device.entities.map((e) => getEntityStateInfo(e, stateMap));
  const powerEntityIds = new Set(
    device.entities.filter(countsForDevicePower).map((e) => e.entity_id),
  );
  const powerStatus = getDevicePowerStatus(entityStates, {
    onlyEntityIds: powerEntityIds,
  });
  const powerStates = entityStates.filter((e) => powerEntityIds.has(e.entity_id));
  return {
    ...device,
    entityStates,
    powerStatus,
    onCount: powerStates.filter((e) => e.isOn === true).length,
    offCount: powerStates.filter((e) => e.isOn === false).length,
  };
}

export function enrichDevicesWithStates(
  devices: DeviceWithEntities[],
  stateMap: Map<string, HaState>,
): DeviceWithEntities[] {
  return devices.map((d) => enrichDeviceWithStates(d, stateMap));
}

export function findDevice(
  devices: DeviceWithEntities[],
  deviceId: string,
): DeviceWithEntities | undefined {
  return devices.find((d) => d.device.id === deviceId);
}
