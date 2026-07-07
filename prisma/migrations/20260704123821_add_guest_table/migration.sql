-- CreateEnum
CREATE TYPE "Side" AS ENUM ('BRIDE', 'GROOM');

-- CreateTable
CREATE TABLE "Guest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(256) NOT NULL,
    "email" VARCHAR(256),
    "mobile_number" VARCHAR(256),
    "side" "Side" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);
