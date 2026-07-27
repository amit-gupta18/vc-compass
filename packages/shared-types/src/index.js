import { z } from "zod";
export const thesisSchema = z.object({
    sectors: z.array(z.string()).default([]),
    stage: z.string().default("pre-seed"),
    geography: z.array(z.string()).default([]),
    checkSizeUsd: z.number().nonnegative().default(100_000),
    riskAppetite: z.enum(["low", "medium", "high"]).default("medium"),
});
export const applicationSubmissionSchema = z.object({
    companyName: z.string().min(1),
    founderName: z.string().min(1).optional(),
    deckUrl: z.string().url().optional(),
    summary: z.string().min(1).optional(),
});
export const jobProgressEventSchema = z.object({
    flowId: z.string().min(1),
    queue: z.string().min(1),
    status: z.enum(["queued", "active", "completed", "failed"]),
    timestamp: z.string().datetime(),
});
