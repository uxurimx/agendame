export const TRIAL_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export function createTrialEndsAt(start = new Date()): Date {
  return new Date(start.getTime() + (TRIAL_DAYS * DAY_MS));
}

export function getEffectiveTrialEndsAt(
  createdAt?: Date | string | null,
  trialEndsAt?: Date | string | null,
): Date | null {
  if (createdAt) {
    const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
    return createTrialEndsAt(created);
  }
  if (!trialEndsAt) return null;
  return trialEndsAt instanceof Date ? trialEndsAt : new Date(trialEndsAt);
}

export function hasTrialExpired(
  trialEndsAt: Date | string | null | undefined,
  createdAt?: Date | string | null,
  now = new Date(),
): boolean {
  const end = getEffectiveTrialEndsAt(createdAt, trialEndsAt);
  if (!end) return false;
  return end.getTime() <= now.getTime();
}

export function getTrialDaysRemaining(
  trialEndsAt: Date | string | null | undefined,
  createdAt?: Date | string | null,
  now = new Date(),
): number {
  const end = getEffectiveTrialEndsAt(createdAt, trialEndsAt);
  if (!end) return 0;
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY_MS));
}

export function isBusinessBlocked(
  planStatus: string,
  trialEndsAt?: Date | string | null,
  createdAt?: Date | string | null,
): boolean {
  if (planStatus === "active") return false;
  if (planStatus === "cancelled" || planStatus === "suspended") return true;
  return planStatus === "trial" && hasTrialExpired(trialEndsAt, createdAt);
}
