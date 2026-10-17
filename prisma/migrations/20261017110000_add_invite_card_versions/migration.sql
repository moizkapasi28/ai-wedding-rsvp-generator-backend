-- Invite card version history: each generation used to overwrite the card's image, so a couple
-- could not go back to one they liked. Every card's current image becomes its first version.
CREATE TABLE "EventInviteCardVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "card_id" UUID NOT NULL,
    "image_key" TEXT NOT NULL,
    "design_fingerprint" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventInviteCardVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventInviteCardVersion_card_id_created_at_idx" ON "EventInviteCardVersion"("card_id", "created_at");

ALTER TABLE "EventInviteCardVersion" ADD CONSTRAINT "EventInviteCardVersion_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "EventInviteCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "EventInviteCardVersion" ("card_id", "image_key", "design_fingerprint", "created_at")
SELECT "id", "generated_invite_image_url", "design_fingerprint", COALESCE("generation_completed_at", "updated_at")
FROM "EventInviteCard"
WHERE "generated_invite_image_url" IS NOT NULL;
