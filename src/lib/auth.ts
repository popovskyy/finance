// Single-password gate. With APP_PASSWORD unset the app is open (local use).

export const AUTH_COOKIE = "statky_auth";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 365;

/** Cookie value for a password; changing the password invalidates old cookies. */
export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`statky:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Length-independent comparison so response time does not leak the token. */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function isAuthorized(cookie: string | undefined): Promise<boolean> {
  const password = process.env.APP_PASSWORD;
  if (!password) return true;
  return Boolean(cookie) && safeEqual(cookie!, await authToken(password));
}
