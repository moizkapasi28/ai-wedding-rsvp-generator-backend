-- Each wedding's IANA timezone, for deadlines in WhatsApp messages and the dashboard's day buckets,
-- which used UTC and the server's timezone. Existing weddings get Asia/Kolkata, the zone the app
-- has served so far (WHATSAPP_DEFAULT_COUNTRY_CODE=91).
ALTER TABLE "Wedding" ADD COLUMN "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata';
