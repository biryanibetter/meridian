export type VerificationStatus =
  | "not-checked"
  | "needs-information"
  | "user-reviewed"
  | "prepared"
  | "official-confirmation-required"
  | "officially-verified";

/** Never round incomplete or empty work up to 100%. */
export function progressPercent(completed: number, total: number): number {
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0)
    return 0;
  if (completed >= total) return 100;
  return Math.max(0, Math.min(99, Math.floor((completed / total) * 100)));
}
