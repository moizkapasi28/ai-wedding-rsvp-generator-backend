// Whatever these return is printed verbatim on the invitation, so they must produce
// invitation-grade copy — never a machine format like "Sun Sep 13 2026".

// Event dates are stored as DATE columns, which Prisma hands back as UTC midnight.
// Formatting in local time would shift the day backwards west of UTC.
const DATE_PART_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export const formatEventDate = (date: Date | string): string => {
  const parsed = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(parsed.getTime())) return String(date);

  const parts = DATE_PART_FORMATTER.formatToParts(parsed);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const weekday = part("weekday");
  const day = part("day");
  const month = part("month");
  const year = part("year");

  if (!day || !month || !year) return String(date);

  return `${weekday}, ${day} ${month} ${year}`;
};

// Times are free text (e.g. "18:30", "6:30 PM", "18:30:00"). Normalise 24-hour input
// to the 12-hour form invitations use, and leave anything else as the user wrote it.
export const formatEventTime = (time: string): string => {
  const trimmed = (time || "").trim();

  if (!trimmed) return trimmed;

  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$/.exec(trimmed);

  if (!match) return trimmed;

  const [, rawHours, minutes, meridiem] = match;
  const hours = Number(rawHours);

  if (meridiem) return `${hours}:${minutes} ${meridiem.toUpperCase()}`;

  if (hours > 23 || Number(minutes) > 59) return trimmed;

  const suffix = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${hours12}:${minutes} ${suffix}`;
};

// Used for the initials that belong inside an empty monogram crest
export const buildCoupleInitials = (
  brideName: string,
  groomName: string,
): string => {
  const initial = (name: string) => (name || "").trim().charAt(0).toUpperCase();
  const bride = initial(brideName);
  const groom = initial(groomName);

  if (!bride || !groom) return "";

  return `${bride} & ${groom}`;
};
