import { env } from "./env";
import pino from "pino";
import pretty from "pino-pretty";

// pino types stream levels without "silent", which pino still accepts
const level = env.LOG_LEVEL as pino.Level;

// Coloured lines for a person at a terminal; JSON lines everywhere else, which is what a log
// collector reads
const isLocal = ["local", "development"].includes(env.NODE_ENV);

// Opt-in: a container's stdout is already collected, and this file is never rotated
const logFile = env.LOG_FILE;

// Each stream filters on its own level too, so it has to match or LOG_LEVEL=debug is cut at info
const streams: pino.StreamEntry[] = [
  { level, stream: isLocal ? pretty({ colorize: true }) : process.stdout },
];
if (logFile) {
  streams.push({
    level,
    // mkdir: logs/ isn't in git, so a fresh clone would otherwise crash on the first import
    stream: pino.destination({ dest: logFile, mkdir: true }),
  });
}

const logger = pino({ level }, pino.multistream(streams));

export default logger;
