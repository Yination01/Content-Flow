import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  evaluatePasswordStrength,
  hashPassword,
  signMagicLinkToken,
  verifyMagicLinkToken,
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
    const action =
      typeof body?.action === "string" ? body.action : "request_code";
    const store = getApiStore();

    if (action === "request_code") {
      const email = (
        typeof body?.email === "string" && body.email.trim()
          ? body.email.trim()
          : actor.userRecord.email
      ).toLowerCase();

      const securityCode = String(
        100000 + (crypto.randomBytes(3).readUIntBE(0, 3) % 900000)
      );
      const resetToken = signMagicLinkToken({
        email,
        otpCode: securityCode,
        exp: Date.now() + 15 * 60 * 1000,
      });

      const url = new URL(request.url);
      const magicResetUrl = `${url.origin}/settings?section=Security&resetToken=${encodeURIComponent(resetToken)}&code=${securityCode}`;

      return NextResponse.json({
        sent: true,
        email,
        expiresInMinutes: 15,
        securityCode,
        resetToken,
        magicResetUrl,
      });
    }

    if (action === "confirm_reset") {
      const resetToken =
        typeof body?.resetToken === "string" ? body.resetToken : "";
      const securityCode =
        typeof body?.securityCode === "string"
          ? body.securityCode.trim()
          : "";
      const newPassword =
        typeof body?.newPassword === "string" ? body.newPassword : "";

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters long." },
          { status: 400 }
        );
      }

      const verified = verifyMagicLinkToken(resetToken);
      if (
        !verified ||
        (verified.otpCode && verified.otpCode !== securityCode)
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid or expired security verification code. Request a fresh code.",
          },
          { status: 401 }
        );
      }

      const targetUser =
        Array.from(store.users.values()).find(
          (u) => u.email.toLowerCase() === verified.email.toLowerCase()
        ) || actor.userRecord;

      targetUser.passwordHash = hashPassword(newPassword);
      store.auditLogs.unshift({
        id: `audit-${Date.now()}`,
        actorId: targetUser.id,
        actionType: "auth.password_rotated",
        targetUserId: targetUser.id,
        reason: "Password rotated via signed Magic Link / 6-digit security code",
        createdAt: new Date().toISOString(),
      });
      persistApiStore();

      return NextResponse.json({
        rotated: true,
        email: targetUser.email,
        passwordStrength: evaluatePasswordStrength(newPassword),
      });
    }

    return NextResponse.json(
      { error: "Unsupported password reset action." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid password reset request." },
      { status: 400 }
    );
  }
}
