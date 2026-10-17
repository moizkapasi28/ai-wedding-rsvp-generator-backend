-- Whether the names, date and venue read back off the last generated card matched what was asked
-- (PASSED / MISMATCH), or null when the optional check did not run.
ALTER TABLE "EventInviteCard" ADD COLUMN "text_check" TEXT;
