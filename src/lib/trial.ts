export const TRIAL_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export function createTrialEndsAt(start = new Date()): Date {
  return new Date(start.getTime() + (TRIAL_DAYS * DAY_MS));
}

export function hasTrialExpired(trialEndsAt: Date | string | null | undefined, now = new Date()): boolean {
  if (!trialEndsAt) return false;
  const end = trialEndsAt instanceof Date ? trialEndsAt : new Date(trialEndsAt);
  return end.getTime() <= now.getTime();
}

export function getTrialDaysRemaining(trialEndsAt: Date | string | null | undefined, now = new Date()): number {
  if (!trialEndsAt) return 0;
  const end = trialEndsAt instanceof Date ? trialEndsAt : new Date(trialEndsAt);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY_MS));
}
