export interface VerificationChallenge {
  code: string;
  expiresAt: number;
}

export const VERIFICATION_LIFETIME_MS = 5 * 60 * 1000;

export function maskSensitiveIdentifier(value: string): string {
  const normalized = value.trim();
  return normalized.length >= 4 ? `••••${normalized.slice(normalized.length > 4 ? -4 : -2)}` : "";
}

/** Generates a local-only code; this does not deliver or verify an identity. */
export function createVerificationChallenge(
  now = Date.now(),
  previousCode?: string,
): VerificationChallenge {
  const bytes = new Uint32Array(1);
  globalThis.crypto.getRandomValues(bytes);
  let code = String(bytes[0] % 1_000_000).padStart(6, "0");
  if (code === previousCode) code = String((Number(code) + 1) % 1_000_000).padStart(6, "0");
  return {
    code,
    expiresAt: now + VERIFICATION_LIFETIME_MS,
  };
}

export function verifyChallenge(
  challenge: VerificationChallenge | null,
  code: string,
  now = Date.now(),
): boolean {
  return Boolean(
    challenge &&
      now < challenge.expiresAt &&
      /^\d{6}$/.test(code) &&
      code === challenge.code,
  );
}
