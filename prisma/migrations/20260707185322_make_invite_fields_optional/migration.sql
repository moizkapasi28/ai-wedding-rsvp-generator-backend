-- AlterTable
ALTER TABLE "GuestEventInvite" ALTER COLUMN "dietary" DROP NOT NULL,
ALTER COLUMN "invite_deadline" DROP NOT NULL,
ALTER COLUMN "responded_at" DROP NOT NULL;
