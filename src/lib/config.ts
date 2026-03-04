// Environment config — single source of truth for all env vars

export const config = {
  dataSource: (process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock") as
    | "mock"
    | "openrouter"
    | "litellm",
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  litellmBaseUrl: process.env.LITELLM_BASE_URL ?? "http://localhost:4000",
  litellmMasterKey: process.env.LITELLM_MASTER_KEY ?? "",
} as const;
