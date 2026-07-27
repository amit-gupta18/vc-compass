import "dotenv/config";

import { defaultPorts, readServiceEnv } from "@vc-brain/config";
import { createLogger } from "@vc-brain/logger";
import { jobProgressEventSchema } from "@vc-brain/shared-types";

const env = readServiceEnv({ PORT: defaultPorts.workers });
const logger = createLogger("workers");

const queues = [
  "sourcing.scan",
  "sourcing.identify",
  "screening.score",
  "diligence.verify",
  "memo.generate",
  "graph.sync",
  "outreach.activate",
];

const bootstrapEvent = jobProgressEventSchema.parse({
  flowId: "bootstrap-flow",
  queue: queues[0],
  status: "queued",
  timestamp: new Date().toISOString(),
});

logger.info({ queues, nodeEnv: env.NODE_ENV, bootstrapEvent }, "Worker bootstrap complete");

const heartbeat = setInterval(() => {
  logger.debug({ queues: queues.length, port: env.PORT }, "Workers heartbeat");
}, 30_000);

process.on("SIGINT", () => {
  clearInterval(heartbeat);
  logger.info("Workers shutting down");
  process.exit(0);
});
