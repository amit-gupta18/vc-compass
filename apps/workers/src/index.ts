import pino from "pino";

const logger = pino({ name: "workers" });

const queues = [
  "sourcing.scan",
  "sourcing.identify",
  "screening.score",
  "diligence.verify",
  "memo.generate",
  "graph.sync",
  "outreach.activate",
];

logger.info({ queues }, "Worker bootstrap complete");

const heartbeat = setInterval(() => {
  logger.debug({ queues: queues.length }, "Workers heartbeat");
}, 30_000);

process.on("SIGINT", () => {
  clearInterval(heartbeat);
  logger.info("Workers shutting down");
  process.exit(0);
});
