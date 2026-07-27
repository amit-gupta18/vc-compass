import "dotenv/config";

import { defaultPorts, readServiceEnv } from "@vc-brain/config";
import { createLogger } from "@vc-brain/logger";

const env = readServiceEnv({ PORT: defaultPorts.scheduler });
const logger = createLogger("scheduler");

const repeatables = ["github.scan", "producthunt.scan", "arxiv.scan"];

logger.info({ repeatables, nodeEnv: env.NODE_ENV }, "Scheduler bootstrap complete");

const heartbeat = setInterval(() => {
  logger.debug({ repeatables: repeatables.length, port: env.PORT }, "Scheduler heartbeat");
}, 30_000);

process.on("SIGINT", () => {
  clearInterval(heartbeat);
  logger.info("Scheduler shutting down");
  process.exit(0);
});
