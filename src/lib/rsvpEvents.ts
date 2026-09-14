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

type LiveRsvpMessage = { weddingId: string; rsvp: LiveRsvp };

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
    let message: LiveRsvpMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }

    // Call listeners one by one so a broken dashboard stream can't affect the others
    for (const listener of localBus.listeners(message.weddingId)) {
      try {
        (listener as (rsvp: LiveRsvp) => void)(message.rsvp);
      } catch (error) {
        logger.error(error, "Live RSVP listener failed");
      }
    }
  });
  subscriber.subscribe(CHANNEL).catch((error) => {
    logger.error(error, "Live RSVP subscribe failed");
  });
};

export const emitRsvp = (weddingId: string, rsvp: LiveRsvp) => {
  const message: LiveRsvpMessage = { weddingId, rsvp };

  // Fire-and-forget: the reply is already saved, so a Redis problem must never fail the RSVP
  connection.publish(CHANNEL, JSON.stringify(message)).catch((error) => {
    logger.error(error, "Live RSVP publish failed");
  });
};

export const onRsvp = (
  weddingId: string,
  listener: (rsvp: LiveRsvp) => void,
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
