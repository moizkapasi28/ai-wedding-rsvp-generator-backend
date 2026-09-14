-- Records when the WhatsApp invite went out; reminders will key off this later

-- AlterTable
ALTER TABLE "GuestEventInvite" ADD COLUMN "invite_sent_at" TIMESTAMPTZ(6);
