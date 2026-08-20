export type AppMode = "development" | "demo" | "staging" | "production";

const VALID_APP_MODES: AppMode[] = ["development", "demo", "staging", "production"];
const configuredMode = process.env.NEXT_PUBLIC_APP_MODE;

export const APP_MODE: AppMode = VALID_APP_MODES.includes(configuredMode as AppMode)
  ? (configuredMode as AppMode)
  : process.env.NODE_ENV === "development"
    ? "development"
    : "production";

export const isDemoMode = APP_MODE === "demo";