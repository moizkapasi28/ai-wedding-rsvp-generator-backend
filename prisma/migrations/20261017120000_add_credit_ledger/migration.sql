-- A ledger of AI credit changes, so support can say where credits went and top a user up.
-- Users whose balance already moved get one OPENING row for the difference from the starting 100,
-- so 100 + the sum of a user's rows equals their balance from here on.
CREATE TYPE "CreditReason" AS ENUM ('INVITE_CARD', 'HEADER_IMAGE', 'REFUND', 'GRANT', 'OPENING');

CREATE TABLE "CreditTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "CreditReason" NOT NULL,
    "ref_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreditTransaction_user_id_created_at_idx" ON "CreditTransaction"("user_id", "created_at");

ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CreditTransaction" ("user_id", "delta", "reason", "note")
SELECT "id", "ai_credits" - 100, 'OPENING', 'Balance changes made before the ledger existed'
FROM "User"
WHERE "ai_credits" <> 100;
