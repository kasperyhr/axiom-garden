import { HealthResponseSchema, type HealthResponse } from "@axiom-garden/protocol";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";

const SERVICE_VERSION = "0.1.0";

export const app = new Hono();

app.use("*", secureHeaders());

app.get("/api/health", (context) => {
  const response: HealthResponse = {
    status: "ok",
    service: "axiom-garden-worker",
    version: SERVICE_VERSION,
    timestamp: new Date().toISOString(),
  };

  return context.json(HealthResponseSchema.parse(response));
});

app.notFound((context) => {
  return context.json({ error: "Not found" }, 404);
});
