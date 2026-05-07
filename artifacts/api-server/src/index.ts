import app from "./app";
import { logger } from "./lib/logger";

// ── Process-level safety net — keep the server alive on unexpected errors ──────

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — server will continue running");
  // Do NOT call process.exit() — keep the server alive
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection — server will continue running");
  // Do NOT call process.exit() — keep the server alive
});

// ── Start server ──────────────────────────────────────────────────────────────

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
