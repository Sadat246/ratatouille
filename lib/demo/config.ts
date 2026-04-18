import { getOptionalEnv } from "@/lib/env";

export const DEMO_CONTROL_TOKEN_HEADER = "x-demo-token";
export const DEMO_HERO_TITLE_PREFIX = "[Demo Hero]";
export const DEMO_AMBIENT_TITLE_PREFIX = "[Demo Ambient]";
export const DEMO_USER_EMAIL_DOMAIN = "ratatouille.local";

export function isDemoModeEnabled() {
  return getOptionalEnv("DEMO_MODE_ENABLED") === "1";
}

export function getDemoControlToken() {
  return getOptionalEnv("DEMO_CONTROL_TOKEN");
}
