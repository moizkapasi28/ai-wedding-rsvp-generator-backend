import { Event } from "../../generated/prisma/client";

export interface EventStats {
  totalGuests: number;
  attendingGuests: number;
  declinedGuests: number;
  maybeGuests: number;
  pendingGuests: number;
  completion: number;
  progressBar: {
    confirmed: number;
    maybe: number;
    declined: number;
    pending: number;
  };
}

export interface GuestStatQueryGroup {
  event_id: string;
  status: string;
  _count: {
    status: number;
  };
}

export type EventWithStats = Event & {
  stats?: EventStats;
};
