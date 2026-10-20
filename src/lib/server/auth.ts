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

  let points = 1;
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

export function formatCreatorDisplayName(
  rawName?: string,
  email?: string
): string {
  const candidate = (rawName || "").trim();
  if (
    candidate.toLowerCase() === "johnpaulonovo" ||
    (!candidate && (email || "").toLowerCase().startsWith("johnpaulonovo@"))
  ) {
    return "Johnpaul Onovo";
  }
  if (candidate) {
    return candidate;
  }
  if (email && email.includes("@")) {
    return email
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Creator";
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

// RFC 4648 Base32 alphabet for TOTP secrets
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(length: number = 20): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += BASE32_ALPHABET[bytes[i] % 32];
  }
  return out;
}

function decodeBase32(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (let i = 0; i < cleaned.length; i += 1) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function computeTotpCode(
  secret: string,
  timestampMs: number = Date.now(),
  stepSeconds: number = 30
): string {
  const counter = Math.floor(timestampMs / 1000 / stepSeconds);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const key = decodeBase32(secret);
  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const otp = binary % 1_000_000;
  return String(otp).padStart(6, "0");
}

export function verifyTotpCode(
  secret: string,
  code: string,
  timestampMs: number = Date.now()
): boolean {
  const normalized = (code || "").trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  for (const offsetSteps of [-1, 0, 1]) {
    const candidate = computeTotpCode(
      secret,
      timestampMs + offsetSteps * 30_000
    );
    if (candidate === normalized) return true;
  }
  return false;
}

export function generateBackupCodes(count: number = 8): string[] {
  return Array.from({ length: count }, () => {
    const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    return `${part1}-${part2}`;
  });
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
  otpCode?: string;
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
  maxAgeSeconds: number = 30 * 24 * 60 * 60
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

export const PLATFORMS_COOKIE_NAME = "cf_platforms";

export type SocialPlatformKey =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "x"
  | "linkedin"
  | "facebook";

export interface PlatformChannelAnalytics {
  followersCount: number;
  totalViews: number;
  videosCount: number;
  engagementRate: string;
  avgViewsPerPost: number;
  lastSyncedAt: string;
}

export interface ConnectedPlatformCookieEntry {
  connected: boolean;
  handle: string;
  channelTitle?: string;
  profileUrl?: string;
  scopes?: string[];
  verifiedAt?: string;
  expiresAt: string;
  analytics?: PlatformChannelAnalytics;
}

export type ConnectedPlatformsCookieMap = Record<
  string,
  ConnectedPlatformCookieEntry
>;

export function signPlatformsCookieValue(
  platforms: ConnectedPlatformsCookieMap
): string {
  const encoded = Buffer.from(JSON.stringify(platforms), "utf8").toString(
    "base64url"
  );
  const sig = crypto
    .createHmac("sha256", `${getSessionSecret()}:platforms`)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

export function parsePlatformsCookieFromRequest(
  request: Request
): ConnectedPlatformsCookieMap {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${PLATFORMS_COOKIE_NAME}=`));
  if (!match) return {};
  const raw = match.slice(PLATFORMS_COOKIE_NAME.length + 1);
  if (!raw || !raw.includes(".")) return {};
  const [encoded, sig] = raw.split(".");
  if (!encoded || !sig) return {};
  const expectedSig = crypto
    .createHmac("sha256", `${getSessionSecret()}:platforms`)
    .update(encoded)
    .digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    return {};
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as ConnectedPlatformsCookieMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function createPlatformsCookieHeader(
  platforms: ConnectedPlatformsCookieMap,
  maxAgeSeconds: number = 28 * 24 * 60 * 60
): string {
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const val = signPlatformsCookieValue(platforms);
  return `${PLATFORMS_COOKIE_NAME}=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureFlag}`;
}

export interface SignedOAuthStatePayload {
  nonce: string;
  userId: string;
  platform: SocialPlatformKey;
  exp: number;
}

export function signOAuthStateToken(payload: SignedOAuthStatePayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = crypto
    .createHmac("sha256", `${getSessionSecret()}:oauth-state`)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyOAuthStateToken(
  token: string
): SignedOAuthStatePayload | null {
  if (!token || !token.includes(".")) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const expectedSig = crypto
    .createHmac("sha256", `${getSessionSecret()}:oauth-state`)
    .update(encoded)
    .digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as SignedOAuthStatePayload;
    if (!parsed.exp || parsed.exp <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

