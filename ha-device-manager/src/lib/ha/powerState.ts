import type { DevicePowerStatus, EntityStateInfo, HaEntity, HaState } from "./types";

/** Domains where we can show a meaningful on/off style state */
const CONTROLLABLE_DOMAINS = new Set([
  "switch",
  "light",
  "fan",
  "input_boolean",
  "siren",
  "valve",
  "humidifier",
  "lock",
  "cover",
  "media_player",
  "vacuum",
  "climate",
]);

export function entityDomain(entityId: string): string {
  return entityId.split(".")[0] ?? "";
}

export function isControllableDomain(domain: string): boolean {
  return CONTROLLABLE_DOMAINS.has(domain);
}

export function isEntityOn(state: string, domain: string): boolean | null {
  if (!isControllableDomain(domain)) return null;

  const s = state.toLowerCase();
  if (s === "unavailable" || s === "unknown") return null;

  switch (domain) {
    case "cover":
      return s === "open" || s === "opening";
    case "lock":
      return s === "unlocked";
    case "media_player":
      return s === "playing" || s === "on" || s === "paused";
    case "vacuum":
      return s === "cleaning" || s === "on";
    case "climate":
      return s !== "off" && s !== "idle";
    default:
      return s === "on";
  }
}

/** Secondary switches (e.g. child lock) are not the device's main on/off state */
const SECONDARY_POWER_ENTITY_PATTERNS = [
  /_child_lock$/i,
  /_child_lock_/i,
];

export function countsForDevicePower(entity: HaEntity): boolean {
  if (
    entity.entity_category === "diagnostic" ||
    entity.entity_category === "config"
  ) {
    return false;
  }

  if (SECONDARY_POWER_ENTITY_PATTERNS.some((p) => p.test(entity.entity_id))) {
    return false;
  }

  const name = (entity.original_name ?? entity.name ?? "").toLowerCase();
  if (name.includes("child lock")) return false;

  return true;
}

export function getEntityStateInfo(
  entity: HaEntity,
  states: Map<string, HaState>,
): EntityStateInfo {
  const domain = entityDomain(entity.entity_id);
  const st = states.get(entity.entity_id);
  const state = st?.state ?? "unknown";
  return {
    entity_id: entity.entity_id,
    state,
    domain,
    isOn: isEntityOn(state, domain),
  };
}

export function getDevicePowerStatus(
  entityStates: EntityStateInfo[],
  options?: { onlyEntityIds?: Set<string> },
): DevicePowerStatus {
  const relevant = options?.onlyEntityIds
    ? entityStates.filter((e) => options.onlyEntityIds!.has(e.entity_id))
    : entityStates;
  const controllable = relevant.filter((e) => e.isOn !== null);
  if (controllable.length === 0) return "none";

  const onCount = controllable.filter((e) => e.isOn === true).length;
  const unknownCount = controllable.filter(
    (e) => e.state === "unavailable" || e.state === "unknown",
  ).length;

  if (unknownCount === controllable.length) return "unavailable";
  if (onCount === 0) return "off";
  if (onCount === controllable.length) return "on";
  return "mixed";
}
