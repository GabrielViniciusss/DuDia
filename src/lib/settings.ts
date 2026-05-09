import { useEffect, useSyncExternalStore } from "react";

const KEY = "feira:settings";

export interface Settings {
  ownerName: string;
  stallName: string;
  vibration: boolean;
  notifications: boolean;
  lowStockThreshold: number;
}

const defaults: Settings = {
  ownerName: "",
  stallName: "",
  vibration: true,
  notifications: true,
  lowStockThreshold: 1,
};

let state: Settings = defaults;
let initialized = false;
const listeners = new Set<() => void>();

function load(): Settings {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  state = load();
  initialized = true;
}

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

export const settingsStore = {
  get(): Settings {
    ensureInit();
    return state;
  },
  update(patch: Partial<Settings>) {
    state = { ...state, ...patch };
    emit();
  },
};

function subscribe(cb: () => void) {
  ensureInit();
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  ensureInit();
  return state;
}
const serverSnap: Settings = defaults;

export function useSettings() {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnap);
}

export function useHydrateSettings() {
  useEffect(() => {
    if (!initialized) {
      state = load();
      initialized = true;
      listeners.forEach((l) => l());
    }
  }, []);
}
