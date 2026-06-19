export type ADTODataMode = "production" | "mock";

export function getDataMode(): ADTODataMode {
  return process.env.ADTO_DATA_MODE === "mock" && process.env.NODE_ENV !== "production" ? "mock" : "production";
}

export function isMockDataMode() {
  return getDataMode() === "mock";
}

export function assertWritableDataMode() {
  if (isMockDataMode()) {
    throw new Error("Mock data mode is read-only. Switch ADTO_DATA_MODE to production to save changes.");
  }
}
