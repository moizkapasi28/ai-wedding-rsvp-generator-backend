-- Reliable AI invite card generation: remember which stage 1 input produced the saved
-- artwork, keep a typed error code for the UI, count job attempts, and measure staleness
-- from the worker's last heartbeat instead of the start time.
-- AlterTable
ALTER TABLE "AIEventInviteCard" ADD COLUMN     "design_fingerprint" TEXT,
ADD COLUMN     "generation_attempt" INTEGER,
ADD COLUMN     "generation_error_code" TEXT,
ADD COLUMN     "generation_heartbeat_at" TIMESTAMPTZ(6);
