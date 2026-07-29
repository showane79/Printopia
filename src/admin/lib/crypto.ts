// Client-side secret generation for the one-time Setup Wizard.
// These helpers produce values that EXACTLY match the server verification in
// functions/_lib/server.ts so the owner never has to understand hashes.
//
// Security rules followed here:
// - The password is hashed in the browser with the Web Crypto API and is never
//   stored, logged, or transmitted.
// - Generated secrets live only in React state while shown, then are cleared.
// - Nothing is written to localStorage/sessionStorage/cookies.

const enc = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * PBKDF2 password hash. MUST match functions/_lib/server.ts pbkdf2Hash():
 * 16-byte random salt (base64), SHA-256, 150000 iterations, 256-bit output.
 * Output format: "<base64-salt>:<hex-dk>"
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 150_000, hash: "SHA-256" },
    key,
    256
  );
  return `${toBase64(salt)}:${toHex(new Uint8Array(bits))}`;
}

/** 32 cryptographically-random bytes as 64 hex chars. Used as SESSION_SECRET. */
export function generateSessionSecret(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

const STRENGTH_LABELS = ["بسیار ضعیف", "ضعیف", "متوسط", "خوب", "قوی"];

/** Simple, non-revealing password strength estimate. */
export function passwordStrength(pw: string): { score: StrengthScore; label: string } {
  if (!pw) return { score: 0, label: "خالی" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const s = Math.min(4, score) as StrengthScore;
  return { score: s, label: STRENGTH_LABELS[s] };
}
