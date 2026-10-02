import pino from "pino";
import pretty from "pino-pretty";

const consoleStream = pretty({ colorize: true });

const logFilePath = "./logs/app.log";
// mkdir: logs/ isn't in git, so a fresh clone (or CI) would otherwise crash on the first import
const fileStream = pino.destination({ dest: logFilePath, mkdir: true });

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
