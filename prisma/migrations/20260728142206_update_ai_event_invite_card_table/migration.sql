-- CreateEnum
CREATE TYPE "GenerationMode" AS ENUM ('MANUAL', 'EXAMPLE');

-- CreateTable
CREATE TABLE "AIEventInviteCard" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "generation_mode" "GenerationMode" NOT NULL DEFAULT 'EXAMPLE',
    "design_preset" TEXT,
    "texture_emulation" TEXT,
    "typography_pairing" TEXT,
    "metallic_accents" TEXT,
    "negative_space" TEXT,
    "monogram_style" TEXT,
    "text_alignment" TEXT,
    "edge_styling" TEXT,
    "additional_details" TEXT,
    "custom_message" TEXT,
    "reference_image" TEXT,
    "generated_image" TEXT,
    "bride_image" TEXT,
    "groom_image" TEXT,
    "bride_attire_style" TEXT,
    "groom_attire_style" TEXT,
    "generated_invite_image_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIEventInviteCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIEventInviteCard_event_id_idx" ON "AIEventInviteCard"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "AIEventInviteCard_event_id_key" ON "AIEventInviteCard"("event_id");

-- AddForeignKey
ALTER TABLE "AIEventInviteCard" ADD CONSTRAINT "AIEventInviteCard_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
