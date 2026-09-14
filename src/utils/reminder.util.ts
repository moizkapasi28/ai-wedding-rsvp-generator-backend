export type ReminderKind = "FIRST" | "FINAL";

const DAY_MS = 86_400_000;
export const FIRST_REMINDER_AFTER_DAYS = 7;
export const FINAL_REMINDER_BEFORE_DAYS = 3;

// Kept free of DB/logger imports so it can be checked in isolation
export const getDueReminder = (
  invite: {
    status: string;
    invite_sent_at: Date | null;
    invite_deadline: Date | null;
    first_reminder_sent_at: Date | null;
    final_reminder_sent_at: Date | null;
  },
  format: { first_reminder: boolean; final_reminder: boolean },
  now: Date,
): ReminderKind | null => {
  // Only guests who were invited, haven't replied, and can still reply
  if (invite.status !== "PENDING" || !invite.invite_sent_at) return null;
  if (invite.invite_deadline && invite.invite_deadline <= now) return null;

  if (
    format.final_reminder &&
    invite.invite_deadline &&
    !invite.final_reminder_sent_at &&
    invite.invite_deadline.getTime() - now.getTime() <=
      FINAL_REMINDER_BEFORE_DAYS * DAY_MS
  ) {
    return "FINAL";
  }

  // Once the final reminder has gone out, the first one is no longer useful
  if (
    format.first_reminder &&
    !invite.first_reminder_sent_at &&
    !invite.final_reminder_sent_at &&
    now.getTime() - invite.invite_sent_at.getTime() >=
      FIRST_REMINDER_AFTER_DAYS * DAY_MS
  ) {
    return "FIRST";
  }

  return null;
};
