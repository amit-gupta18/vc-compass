import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import pino from "pino";

const logger = pino({ name: "api" });
const app = express();
const port = Number(process.env.PORT ?? 4000);

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
    timestamp: new Date().toISOString(),
  });
});

app.get("/events/jobs", (request, response) => {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.flushHeaders();

  response.write(
    `data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`,
  );

  const interval = setInterval(() => {
    response.write(
      `data: ${JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() })}\n\n`,
    );
  }, 10_000);

  request.on("close", () => {
    clearInterval(interval);
  });
});

app.listen(port, () => {
  logger.info({ port }, "API gateway listening");
});
