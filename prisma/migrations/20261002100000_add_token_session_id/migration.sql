-- Per-session auth tokens: the access and refresh token of one sign-in share a session_id,
-- so refreshing or signing out on one device no longer ends the user's other sessions.
-- Nullable: existing rows and email-verification/password-reset tokens have no session.
ALTER TABLE "Token" ADD COLUMN "session_id" UUID;

CREATE INDEX "Token_session_id_idx" ON "Token"("session_id");
