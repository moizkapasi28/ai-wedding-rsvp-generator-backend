-- Hand-written: renames in place so the 6+ existing cards survive. The table
-- holds uploaded cards too now, so "AI" no longer describes it.

-- Keys and indexes first, to the names Prisma derives from the new model name;
-- left with the old prefix, Prisma would report them as drift.
ALTER TABLE "AIEventInviteCard" RENAME CONSTRAINT "AIEventInviteCard_pkey" TO "EventInviteCard_pkey";
ALTER TABLE "AIEventInviteCard" RENAME CONSTRAINT "AIEventInviteCard_event_id_fkey" TO "EventInviteCard_event_id_fkey";
ALTER INDEX "AIEventInviteCard_event_id_idx" RENAME TO "EventInviteCard_event_id_idx";
ALTER INDEX "AIEventInviteCard_event_id_key" RENAME TO "EventInviteCard_event_id_key";

-- The table
ALTER TABLE "AIEventInviteCard" RENAME TO "EventInviteCard";
