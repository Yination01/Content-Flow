import { NextResponse } from "next/server";
import {
  computeTotpCode,
  generateBackupCodes,
  generateTotpSecret,
  verifyTotpCode,
} from "@/lib/server/auth";
import {
  extractActorFromRequest,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const body = await request.json();
    const action = typeof body?.action === "string" ? body.action : "setup";
    const store = getApiStore();

    if (action === "setup") {
      const secret =
        actor.userRecord.twoFactorSecret || generateTotpSecret(20);
      const backupCodes =
        actor.userRecord.twoFactorBackupCodes?.length
          ? actor.userRecord.twoFactorBackupCodes
          : generateBackupCodes(8);

      actor.userRecord.twoFactorSecret = secret;
      actor.userRecord.twoFactorBackupCodes = backupCodes;
      persistApiStore();

      const issuer = encodeURIComponent("ContentFlow");
      const account = encodeURIComponent(actor.userRecord.email);
      const otpauthUrl = `otpauth://totp/ContentFlow:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
      const currentCode = computeTotpCode(secret);

      return NextResponse.json({
        secret,
        otpauthUrl,
        currentCode,
        backupCodes,
        twoFactorEnabled: Boolean(actor.userRecord.twoFactorEnabled),
      });
    }

    if (action === "verify") {
      const code =
        typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
      const secret = actor.userRecord.twoFactorSecret;
      if (!secret) {
        return NextResponse.json(
          { error: "Run 2FA setup first to generate a TOTP secret." },
          { status: 400 }
        );
      }

      const validTotp = verifyTotpCode(secret, code);
      const validBackup =
        actor.userRecord.twoFactorBackupCodes?.includes(code) ?? false;

      if (!validTotp && !validBackup) {
        return NextResponse.json(
          { error: "Invalid 6-digit authenticator code or backup code." },
          { status: 400 }
        );
      }

      if (validBackup && actor.userRecord.twoFactorBackupCodes) {
        actor.userRecord.twoFactorBackupCodes =
          actor.userRecord.twoFactorBackupCodes.filter((c) => c !== code);
      }

      actor.userRecord.twoFactorEnabled = true;
      store.auditLogs.unshift({
        id: `audit-${Date.now()}`,
        actorId: actor.userId,
        actionType: "auth.2fa_enabled",
        targetUserId: actor.userId,
        reason: "Enabled RFC 6238 TOTP Two-Factor Authentication",
        createdAt: new Date().toISOString(),
      });
      persistApiStore();

      return NextResponse.json({
        verified: true,
        twoFactorEnabled: true,
        backupCodesRemaining:
          actor.userRecord.twoFactorBackupCodes?.length ?? 0,
      });
    }

    if (action === "disable") {
      actor.userRecord.twoFactorEnabled = false;
      store.auditLogs.unshift({
        id: `audit-${Date.now()}`,
        actorId: actor.userId,
        actionType: "auth.2fa_disabled",
        targetUserId: actor.userId,
        reason: "Disabled Two-Factor Authentication",
        createdAt: new Date().toISOString(),
      });
      persistApiStore();

      return NextResponse.json({
        twoFactorEnabled: false,
      });
    }

    return NextResponse.json(
      { error: "Unsupported 2FA action." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid 2FA request payload." },
      { status: 400 }
    );
  }
}
