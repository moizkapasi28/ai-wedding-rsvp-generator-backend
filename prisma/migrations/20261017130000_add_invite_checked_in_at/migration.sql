-- QR check-in: the host scans the guest's invite token at the venue, recording their arrival.
ALTER TABLE "GuestEventInvite" ADD COLUMN "checked_in_at" TIMESTAMPTZ(6);
