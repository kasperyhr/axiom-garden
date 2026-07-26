import { z } from "zod";

export const HealthStatusSchema = z.literal("ok");

export const HealthResponseSchema = z.object({
  status: HealthStatusSchema,
  service: z.literal("axiom-garden-worker"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/u, "version must use semantic x.y.z format"),
  timestamp: z.iso.datetime({ offset: true }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export function safeParseHealthResponse(input: unknown) {
  return HealthResponseSchema.safeParse(input);
}

export function parseHealthResponse(input: unknown): HealthResponse {
  return HealthResponseSchema.parse(input);
}
