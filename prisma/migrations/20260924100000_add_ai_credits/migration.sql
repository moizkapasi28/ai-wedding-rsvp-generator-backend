-- AI credits: every user (existing ones too, via the default) starts with 100.
-- credits_charged remembers what a card generation cost so a failure refunds it once.
ALTER TABLE "User" ADD COLUMN "ai_credits" INTEGER NOT NULL DEFAULT 100;

ALTER TABLE "EventInviteCard" ADD COLUMN "credits_charged" INTEGER NOT NULL DEFAULT 0;
