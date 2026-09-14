-- Per-event RSVP deadline (copied onto each invite's invite_deadline) and tracking for the two WhatsApp reminders

-- AlterTable
ALTER TABLE "GuestEventInviteFormat" ADD COLUMN "rsvp_deadline" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "GuestEventInvite" ADD COLUMN "first_reminder_sent_at" TIMESTAMPTZ(6),
ADD COLUMN "final_reminder_sent_at" TIMESTAMPTZ(6);
