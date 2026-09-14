-- RSVP links are per event invite, so invite_token is looked up directly and must be unique

-- CreateIndex
CREATE UNIQUE INDEX "GuestEventInvite_invite_token_key" ON "GuestEventInvite"("invite_token");
