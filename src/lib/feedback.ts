// Simple haptic feedback. Works on Android Chrome.
import { settingsStore } from "./settings";

export function haptic(ms = 25) {
  if (!settingsStore.get().vibration) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(ms);
  }
}

export function feedback(kind: "ok" | "err" | "warn" = "ok") {
  haptic(kind === "ok" ? 25 : kind === "warn" ? 50 : 80);
}
