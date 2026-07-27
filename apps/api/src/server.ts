import "dotenv/config";

import { defaultPorts, readServiceEnv } from "@vc-brain/config";
import { connectMongo } from "@vc-brain/db-mongo";
import { createLogger } from "@vc-brain/logger";
import { applicationSubmissionSchema, jobProgressEventSchema } from "@vc-brain/shared-types";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

const env = readServiceEnv({ PORT: defaultPorts.api });
const logger = createLogger("api");
const app = express();
const port = env.PORT;

async function connectMongoIfConfigured() {
  if (!process.env.MONGODB_URL) {
    logger.info("Mongo bootstrap skipped because MONGODB_URL is not set");
    return;
  }

  try {
    const connection = await connectMongo(process.env.MONGODB_URL);
    logger.info({ host: connection.host, name: connection.name }, "Mongo connection established");
  } catch (error) {
    logger.warn({ err: error }, "Mongo unavailable, continuing in scaffold mode");
  }
}

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use((request, _response, next) => {
  logger.info({ method: request.method, path: request.path }, "Incoming request");
  next();
});

app.get("/health", (_request, response) => {
  response.json({
    service: "api",
    status: "ok",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.post("/applications", (request, response) => {
  const parsed = applicationSubmissionSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: "Invalid application payload",
      issues: parsed.error.flatten(),
    });
    return;
  }

  const applicationId = crypto.randomUUID();
  logger.info({ applicationId, companyName: parsed.data.companyName }, "Application accepted");

  response.status(202).json({
    applicationId,
    status: "queued",
    payload: parsed.data,
  });
});

app.get("/events/jobs", (request, response) => {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.flushHeaders();

  const connectedEvent = jobProgressEventSchema.parse({
    flowId: "bootstrap-flow",
    queue: "screening.score",
    status: "queued",
    timestamp: new Date().toISOString(),
  });

  response.write(`data: ${JSON.stringify(connectedEvent)}\n\n`);

  const interval = setInterval(() => {
    const heartbeatEvent = jobProgressEventSchema.parse({
      flowId: "bootstrap-flow",
      queue: "screening.score",
      status: "active",
      timestamp: new Date().toISOString(),
    });

    response.write(`data: ${JSON.stringify(heartbeatEvent)}\n\n`);
  }, 10_000);

  request.on("close", () => {
    clearInterval(interval);
  });
});

async function bootstrap() {
  app.listen(port, () => {
    logger.info({ port, nodeEnv: env.NODE_ENV }, "API gateway listening");
  });

  void connectMongoIfConfigured();
}

bootstrap().catch((error) => {
  logger.error({ err: error }, "API bootstrap failed");
  process.exit(1);
});
