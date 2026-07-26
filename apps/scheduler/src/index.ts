import pino from "pino";

const logger = pino({ name: "scheduler" });

const repeatables = ["github.scan", "producthunt.scan", "arxiv.scan"];

logger.info({ repeatables }, "Scheduler bootstrap complete");

const heartbeat = setInterval(() => {
  logger.debug({ repeatables: repeatables.length }, "Scheduler heartbeat");
}, 30_000);

process.on("SIGINT", () => {
  clearInterval(heartbeat);
  logger.info("Scheduler shutting down");
  process.exit(0);
});
