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
import type { DeviceWithEntities, HaArea, HaEntity } from "./types";

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

  const enriched: DeviceWithEntities[] = devices
    .map((device) => {
      const deviceEntities = (entitiesByDevice.get(device.id) ?? []).sort((a, b) =>
        a.entity_id.localeCompare(b.entity_id),
      );
      const entityStates = deviceEntities.map((e) => getEntityStateInfo(e, stateMap));
      const powerEntityIds = new Set(
        deviceEntities.filter(countsForDevicePower).map((e) => e.entity_id),
      );
      const powerStatus = getDevicePowerStatus(entityStates, {
        onlyEntityIds: powerEntityIds,
      });
      const powerStates = entityStates.filter((e) => powerEntityIds.has(e.entity_id));
      const onCount = powerStates.filter((e) => e.isOn === true).length;
      const offCount = powerStates.filter((e) => e.isOn === false).length;
      const areaName = device.area_id ? areaMap[device.area_id] ?? null : null;
      return {
        device,
        displayName: deviceDisplayName(device),
        areaName,
        entities: deviceEntities,
        entityCount: deviceEntities.length,
        powerStatus,
        entityStates,
        onCount,
        offCount,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return { devices: enriched, areas, areaMap };
}

export function findDevice(
  devices: DeviceWithEntities[],
  deviceId: string,
): DeviceWithEntities | undefined {
  return devices.find((d) => d.device.id === deviceId);
}
