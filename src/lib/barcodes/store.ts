import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type BarcodeStore = Record<string, string>;

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "device-barcodes.json");

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateScanCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export async function readBarcodeStore(): Promise<BarcodeStore> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as BarcodeStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function writeBarcodeStore(store: BarcodeStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export function codeToDeviceId(store: BarcodeStore, code: string): string | null {
  const normalized = code.trim().toUpperCase();
  for (const [deviceId, stored] of Object.entries(store)) {
    if (stored.toUpperCase() === normalized) return deviceId;
  }
  return null;
}

export async function assignBarcode(
  deviceId: string,
  code?: string,
): Promise<{ code: string; store: BarcodeStore }> {
  const store = await readBarcodeStore();

  if (code) {
    const normalized = code.trim().toUpperCase();
    const existing = codeToDeviceId(store, normalized);
    if (existing && existing !== deviceId) {
      throw new Error(`Code ${normalized} is already used by another device`);
    }
    store[deviceId] = normalized;
    await writeBarcodeStore(store);
    return { code: normalized, store };
  }

  const existing = store[deviceId];
  if (existing) {
    return { code: existing, store };
  }

  let newCode = generateScanCode();
  let attempts = 0;
  while (Object.values(store).some((c) => c.toUpperCase() === newCode) && attempts < 50) {
    newCode = generateScanCode();
    attempts++;
  }

  store[deviceId] = newCode;
  await writeBarcodeStore(store);
  return { code: newCode, store };
}

export async function removeBarcode(deviceId: string): Promise<BarcodeStore> {
  const store = await readBarcodeStore();
  delete store[deviceId];
  await writeBarcodeStore(store);
  return store;
}

export function scanPayloadUrl(code: string, origin?: string): string {
  const base = origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const path = `/scan?c=${encodeURIComponent(code)}`;
  return base ? `${base.replace(/\/$/, "")}${path}` : path;
}
