// The public RSVP link's token is the only credential for that invitation, so it must not
// land in logs. /api/rsvp/invite/:inviteId is the host's own route and is left as it is.
// Kept free of other imports so it can be unit tested in isolation.
export const redactUrlForLog = (url: string) =>
  url.replace(/^(\/api\/rsvp\/)(?!invite\/)[^/?#]+/, "$1[token]");
