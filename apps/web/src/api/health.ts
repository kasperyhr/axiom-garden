import { safeParseHealthResponse, type HealthResponse } from "@axiom-garden/protocol";

function getApiUrl(path: string): string {
  const origin =
    (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(/\/+$/u, "") ?? "";
  return `${origin}${path}`;
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const requestInit: RequestInit = {
    headers: {
      Accept: "application/json",
    },
  };

  if (signal) {
    requestInit.signal = signal;
  }

  const response = await fetch(getApiUrl("/api/health"), requestInit);

  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`);
  }

  const result = safeParseHealthResponse(await response.json());
  if (!result.success) {
    throw new Error("Health response did not match the shared protocol");
  }

  return result.data;
}
