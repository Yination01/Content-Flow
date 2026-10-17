import crypto from "node:crypto";
import type { ServerRole, SubscriptionTier } from "@/lib/policy";

const SESSION_COOKIE_NAME = "cf_session";

function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "contentflow-production-hmac-session-secret-key-2026"
  );
}

const COMMON_WEAK_PASSWORDS = [
  "password",
  "12345678",
  "qwertyui",
  "letmein",
  "welcome1",
  "admin123",
  "iloveyou",
];

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Weak" | "Fair" | "Good" | "Strong";
  percent: number;
  checks: {
    minLength: boolean;
    hasMixedCase: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
    notCommon: boolean;
  };
}

export function evaluatePasswordStrength(
  password: string
): PasswordStrengthResult {
  const minLength = password.length >= 8;
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const lower = password.toLowerCase();
  const notCommon =
    password.length > 0 &&
    !COMMON_WEAK_PASSWORDS.some((weak) => lower.includes(weak));

  if (!password || !minLength || !notCommon) {
    return {
      score: password.length >= 4 && notCommon ? 1 : 0,
      label: "Weak",
      percent: password.length > 0 ? 25 : 0,
      checks: { minLength, hasMixedCase, hasNumber, hasSymbol, notCommon },
    };
  }

  let points = 1; // minLength + notCommon
  if (hasMixedCase) points += 1;
  if (hasNumber) points += 1;
  if (hasSymbol || password.length >= 12) points += 1;

  const score = Math.min(4, Math.max(1, points)) as 0 | 1 | 2 | 3 | 4;
  const labelMap: Record<number, "Weak" | "Fair" | "Good" | "Strong"> = {
    0: "Weak",
    1: "Weak",
    2: "Fair",
    3: "Good",
    4: "Strong",
  };

  return {
    score,
    label: labelMap[score],
    percent: score * 25,
    checks: { minLength, hasMixedCase, hasNumber, hasSymbol, notCommon },
  };
}

export function isSuperuserEmail(email: string): boolean {
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return false;
  const superuserEmails = new Set([
    "johnpaulonovo@gmail.com",
    "maya@contentflow.app",
    ...(process.env.SUPERUSER_EMAIL
      ? [process.env.SUPERUSER_EMAIL.trim().toLowerCase()]
      : []),
  ]);
  return superuserEmails.has(normalized);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$16384$8$1$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }
  const salt = parts[4];
  const expectedHex = parts[5];
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  if (derived.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(derived, expected);
}

export interface SessionTokenPayload {
  userId: string;
  email: string;
  name?: string;
  tier?: SubscriptionTier;
  roles: ServerRole[];
  exp: number;
}

export function signSessionToken(payload: SessionTokenPayload): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
  if (!token || !token.includes(".")) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as SessionTokenPayload;
    if (!parsed.exp || parsed.exp <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export interface MagicLinkPayload {
  email: string;
  name?: string;
  exp: number;
}

export function signMagicLinkToken(payload: MagicLinkPayload): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const signature = crypto
    .createHmac("sha256", `${getSessionSecret()}:magic-link`)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyMagicLinkToken(token: string): MagicLinkPayload | null {
  if (!token || !token.includes(".")) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSig = crypto
    .createHmac("sha256", `${getSessionSecret()}:magic-link`)
    .update(encodedPayload)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as MagicLinkPayload;
    if (!parsed.exp || parsed.exp <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function createSessionCookieHeader(
  token: string,
  maxAgeSeconds: number = 7 * 24 * 60 * 60
): string {
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureFlag}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function parseSessionCookieFromRequest(
  request: Request
): SessionTokenPayload | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!match) return null;
  const token = match.slice(SESSION_COOKIE_NAME.length + 1);
  return verifySessionToken(token);
}
