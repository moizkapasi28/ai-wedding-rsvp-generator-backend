import { EventEmitter } from "node:events";
import Redis from "ioredis";
import logger from "../config/logger";
import { connection, redisOptions } from "./redis";

export type LiveRsvp = {
  inviteId: string;
  guestName: string;
  eventTitle: string;
  status: "ATTENDING" | "MAYBE" | "DECLINED";
  plusOnes: number | null;
  respondedAt: string;
};

export type LiveCheckIn = {
  inviteId: string;
  guestName: string;
  eventTitle: string;
  checkedInAt: string;
};

// The SSE event name and its data
export type LiveEvent =
  | { type: "rsvp"; data: LiveRsvp }
  | { type: "check-in"; data: LiveCheckIn };

type LiveMessage = { weddingId: string; event: LiveEvent };

const CHANNEL = "live-rsvp";

// RSVPs are published on a Redis channel so any API instance (or the worker) reaches every
// dashboard stream; each process then fans messages out to its own SSE listeners.
const localBus = new EventEmitter();
localBus.setMaxListeners(0);

let subscriber: Redis | null = null;

// A subscribed connection can't run other commands, so it opens lazily and only in
// processes that actually stream dashboards
const ensureSubscribed = () => {
  if (subscriber) return;

  subscriber = new Redis(redisOptions);
  subscriber.on("error", (error) => {
    logger.error(error, "Live RSVP subscriber error");
  });
  subscriber.on("message", (_channel, raw) => {
    let message: LiveMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }

    // Call listeners one by one so a broken dashboard stream can't affect the others
    for (const listener of localBus.listeners(message.weddingId)) {
      try {
        (listener as (event: LiveEvent) => void)(message.event);
      } catch (error) {
        logger.error(error, "Live RSVP listener failed");
      }
    }
  });
  subscriber.subscribe(CHANNEL).catch((error) => {
    logger.error(error, "Live RSVP subscribe failed");
  });
};

const publish = (weddingId: string, event: LiveEvent) => {
  const message: LiveMessage = { weddingId, event };

  // Fire-and-forget: the change is already saved, so a Redis problem must never fail it
  connection.publish(CHANNEL, JSON.stringify(message)).catch((error) => {
    logger.error(error, "Live RSVP publish failed");
  });
};

export const emitRsvp = (weddingId: string, rsvp: LiveRsvp) =>
  publish(weddingId, { type: "rsvp", data: rsvp });

export const emitCheckIn = (weddingId: string, checkIn: LiveCheckIn) =>
  publish(weddingId, { type: "check-in", data: checkIn });

export const onLiveEvent = (
  weddingId: string,
  listener: (event: LiveEvent) => void,
) => {
  ensureSubscribed();
  localBus.on(weddingId, listener);
  return () => {
    localBus.off(weddingId, listener);
  };
};

export const toLiveRsvp = (invite: {
  id: string;
  status: string;
  plus_ones: number | null;
  responded_at: Date | null;
  guest: { name: string };
  event: { title: string };
}): LiveRsvp => ({
  inviteId: invite.id,
  guestName: invite.guest.name,
  eventTitle: invite.event.title,
  status: invite.status as LiveRsvp["status"],
  plusOnes: invite.plus_ones,
  respondedAt: invite.responded_at?.toISOString() ?? "",
});
