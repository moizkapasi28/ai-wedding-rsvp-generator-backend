// Calendar days in a wedding's own timezone (IANA name, e.g. "Asia/Kolkata"), with no
// dependency on the server's timezone. Import-free so it can be unit tested without an env.

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export const isValidTimezone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
};

// YYYY-MM-DD of `date` as seen in `timeZone`
export const dayKeyIn = (date: Date, timeZone: string) =>
  date.toLocaleDateString("en-CA", { timeZone });

// The instant `timeZone`'s clock reads midnight on `dayKey`
const midnightIn = (dayKey: string, timeZone: string) => {
  const asUtc = Date.parse(`${dayKey}T00:00:00Z`);
  // How far the zone's wall clock is from UTC at that moment
  const wall = new Date(asUtc).toLocaleString("sv-SE", { timeZone });
  const offset = Date.parse(`${wall.replace(" ", "T")}Z`) - asUtc;
  return new Date(asUtc - offset);
};

// The last `days` calendar days in `timeZone`, oldest first, ending today, and the instant
// the first one began (for "since" queries)
export const lastDaysIn = (timeZone: string, days: number, now = new Date()) => {
  const today = Date.parse(`${dayKeyIn(now, timeZone)}T00:00:00Z`);
  const keys = Array.from({ length: days }, (_, i) =>
    new Date(today - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );
  return { keys, since: midnightIn(keys[0], timeZone) };
};
