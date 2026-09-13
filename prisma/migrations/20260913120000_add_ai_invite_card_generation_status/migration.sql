-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('IDLE', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "AIEventInviteCard" ADD COLUMN     "generation_completed_at" TIMESTAMPTZ(6),
ADD COLUMN     "generation_error" TEXT,
ADD COLUMN     "generation_job_id" TEXT,
ADD COLUMN     "generation_stage" TEXT,
ADD COLUMN     "generation_started_at" TIMESTAMPTZ(6),
ADD COLUMN     "generation_status" "GenerationStatus" NOT NULL DEFAULT 'IDLE';
