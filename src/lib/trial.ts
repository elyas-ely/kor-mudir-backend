// Every new user gets a free trial starting the moment their account is
// created. The length lives here so the Drizzle column default (db/schema/auth.ts)
// and better-auth's own additionalFields default (lib/auth.ts) can never drift
// apart.
export const TRIAL_DURATION_MONTHS = 5;

/** `from` (default: now) advanced by TRIAL_DURATION_MONTHS calendar months.
 * Calendar math, not a fixed 30-day block, so a trial started on Jan 31 ends
 * at the end of June rather than a few days short. */
export function trialEndsAtFrom(from: Date = new Date()): Date {
  const end = new Date(from);
  end.setMonth(end.getMonth() + TRIAL_DURATION_MONTHS);
  return end;
}
