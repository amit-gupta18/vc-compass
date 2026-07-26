import { z } from "zod";

export const defaultPorts = {
  web: 3000,
  api: 4000,
  workers: 4100,
  scheduler: 4200,
} as const;

export const serviceEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(defaultPorts.api),
  LOG_LEVEL: z.string().default("info"),
});

export type ServiceEnv = z.infer<typeof serviceEnvSchema>;

export function readServiceEnv(overrides?: Partial<Record<keyof ServiceEnv, unknown>>) {
  return serviceEnvSchema.parse({
    ...process.env,
    ...overrides,
  });
}
