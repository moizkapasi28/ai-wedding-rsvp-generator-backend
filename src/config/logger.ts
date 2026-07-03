import pino from "pino";
import pretty from "pino-pretty";

const consoleStream = pretty({ colorize: true });

const logFilePath = "./logs/app.log";
const fileStream = pino.destination(logFilePath);

const logger = pino(
  {
    level: "info", // Default log level
  },
  pino.multistream([
    { stream: consoleStream }, // Console (non-blocking)
    { stream: fileStream }, // File (non-blocking with async writing)
  ]),
);

export default logger;
