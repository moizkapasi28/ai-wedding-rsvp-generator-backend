-- CreateTable
CREATE TABLE "Event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wedding_id" UUID NOT NULL,
    "title" VARCHAR(256) NOT NULL,
    "description" VARCHAR(256) NOT NULL,
    "date" DATE NOT NULL,
    "time" TIME NOT NULL,
    "venue" TEXT NOT NULL,
    "city" VARCHAR(256) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "Wedding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
