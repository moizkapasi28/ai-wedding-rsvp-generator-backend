import { EventEmitter } from "node:events";
import logger from "../config/logger";

export type LiveRsvp = {
  inviteId: string;
  guestName: string;
  eventTitle: string;
  status: "ATTENDING" | "MAYBE" | "DECLINED";
  plusOnes: number | null;
  respondedAt: string;
};

// ponytail: in-process only, so dashboard streams and RSVP submits must share one API process.
// Swap for Redis pub/sub (Redis already runs in the container) before running more than one API instance.
const bus = new EventEmitter();
bus.setMaxListeners(0);

export const emitRsvp = (weddingId: string, rsvp: LiveRsvp) => {
  // Call listeners one by one so a broken dashboard stream can't fail a guest's RSVP
  for (const listener of bus.listeners(weddingId)) {
    try {
      (listener as (rsvp: LiveRsvp) => void)(rsvp);
    } catch (error) {
      logger.error(error, "Live RSVP listener failed");
    }
  }
};

export const onRsvp = (
  weddingId: string,
  listener: (rsvp: LiveRsvp) => void,
) => {
  bus.on(weddingId, listener);
  return () => {
    bus.off(weddingId, listener);
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
