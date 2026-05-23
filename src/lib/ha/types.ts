export interface HaDevice {
  id: string;
  name: string | null;
  name_by_user: string | null;
  area_id: string | null;
  manufacturer: string | null;
  model: string | null;
  identifiers: [string, string][];
  disabled_by: string | null;
  config_entries: string[];
}

export interface HaEntity {
  entity_id: string;
  id: string;
  device_id: string | null;
  area_id: string | null;
  name: string | null;
  original_name: string | null;
  platform: string;
  disabled_by: string | null;
  hidden_by: string | null;
  entity_category?: "config" | "diagnostic" | null;
}

export interface HaArea {
  area_id: string;
  name: string;
  picture: string | null;
  labels: string[];
}

export interface HaState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

export type DevicePowerStatus = "on" | "off" | "mixed" | "unavailable" | "none";

export interface EntityStateInfo {
  entity_id: string;
  state: string;
  domain: string;
  isOn: boolean | null;
}

export interface DeviceWithEntities {
  device: HaDevice;
  displayName: string;
  areaName: string | null;
  entities: HaEntity[];
  entityCount: number;
  powerStatus: DevicePowerStatus;
  entityStates: EntityStateInfo[];
  onCount: number;
  offCount: number;
}

export interface HaWsResult<T> {
  id: number;
  type: string;
  success: boolean;
  result?: T;
  error?: { code: string; message: string };
}
