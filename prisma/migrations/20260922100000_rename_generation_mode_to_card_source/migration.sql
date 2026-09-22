-- Hand-written: renames in place so existing values survive. Prisma's generated
-- SQL for this change would drop the column and add a new one, losing them.

-- The enum: an uploaded card isn't "generated", so the type is named for what
-- it records — where the card came from.
ALTER TYPE "GenerationMode" RENAME TO "CardSource";
ALTER TYPE "CardSource" RENAME VALUE 'MANUAL' TO 'PRESETS';
ALTER TYPE "CardSource" ADD VALUE 'UPLOAD';

-- The column
ALTER TABLE "AIEventInviteCard" RENAME COLUMN "generation_mode" TO "card_source";
