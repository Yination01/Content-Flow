import crypto from "node:crypto";
import { NextResponse } from "next/server";
import type { SubscriptionTier } from "@/lib/policy";
import {
  formatCreatorDisplayName,
  hashPassword,
  isSuperuserEmail,
} from "@/lib/server/auth";
import { checkRateLimit, extractRateLimitKey } from "@/lib/server/rate-limit";
import {
  extractActorFromRequest,
  getApiStore,
  persistApiStore,
  type PromoCodeRecord,
  type UserAccountRecord,
} from "@/lib/server/store";
import { syncUserToSupabaseRest } from "@/lib/server/supabase-sync";

const SELF_ACTIONS = new Set([
  "me",
  "delete_me",
  "directory_sync",
  "checkout_create",
  "paystack_init",
  "waitlist_me",
  "notice_list",
  "redeem",
  "app_config",
  "crash_report",
]);

function isActorAdmin(
  actor: ReturnType<typeof extractActorFromRequest>
): boolean {
  const emailLower = (actor.userRecord.email || "").trim().toLowerCase();
  return isSuperuserEmail(emailLower) || actor.roles.includes("superuser");
}

function serializeAccount(u: UserAccountRecord) {
  const nowMs = Date.now();
  const isSuspended = Boolean(
    u.status === "Suspended" ||
      (u.suspendedUntil && new Date(u.suspendedUntil).getTime() > nowMs)
  );
  const daysLeft = u.tierExpiresAt
    ? Math.max(
        0,
        Math.ceil((new Date(u.tierExpiresAt).getTime() - nowMs) / 86_400_000)
      )
    : null;
  const trialActive = Boolean(
    u.trialEndsAt && new Date(u.trialEndsAt).getTime() > nowMs
  );

  return {
    uid: u.id,
    id: u.id,
    name: u.name,
    displayName: u.name,
    email: u.email,
    username:
      u.username ||
      (u.email
        ? u.email.split("@")[0].replace(/[^a-zA-Z0-9._]/g, "")
        : u.id),
    tier: u.tier,
    status: isSuspended ? "Suspended" : u.status || "Active",
    roles: u.roles,
    tierExpiresAt: u.tierExpiresAt || null,
    grantExpiresAt: u.tierExpiresAt || null,
    trialEndsAt: u.trialEndsAt || null,
    expiresAt: u.tierExpiresAt || u.trialEndsAt || null,
    trialActive,
    daysLeft,
    isTester: Boolean(u.isTester),
    testerGrantedBy: u.testerGrantedBy || null,
    testerGrantedAt: u.testerGrantedAt || null,
    isBeta: Boolean(u.isBeta),
    betaRemovedAt: u.betaRemovedAt || null,
    betaRemovedBy: u.betaRemovedBy || null,
    paidCount: u.paidCount || 0,
    joinedAt: u.joinedAt,
    lastSeenAt: u.lastSeenAt || u.joinedAt,
    suspended: isSuspended,
    suspendedUntil: u.suspendedUntil || null,
    suspendReason: u.suspendReason || null,
    suspendedReason: u.suspendReason || null,
    testTierOverride: u.testTierOverride?.tier || null,
    hiddenFromUserList: Boolean(u.hiddenFromUserList),
  };
}

function computePromoLiveStatus(
  promo: PromoCodeRecord
): "active" | "permanent" | "revoked" | "expired" {
  if (promo.status === "revoked") return "revoked";
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() <= Date.now()) {
    return "expired";
  }
  if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
    return "expired";
  }
  if (promo.permanent) return "permanent";
  return "active";
}

function serializePromo(promo: PromoCodeRecord) {
  const liveStatus = computePromoLiveStatus(promo);
  const daysLeft = promo.expiresAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(promo.expiresAt).getTime() - Date.now()) / 86_400_000
        )
      )
    : null;
  const rewardLabel = promo.permanent
    ? `${promo.tier} (Permanent)`
    : `${promo.tier} for ${promo.rewardDays}d`;
  return {
    ...promo,
    maxUses: promo.maxUses ?? 999999,
    usedCount: promo.currentUses,
    revoked: promo.status === "revoked" || liveStatus === "revoked",
    note: promo.note || "",
    liveStatus,
    daysLeft,
    rewardLabel,
  };
}

function findUserByUidOrEmail(
  store: ReturnType<typeof getApiStore>,
  body: Record<string, unknown>
): UserAccountRecord | undefined {
  const uid = typeof body.uid === "string" ? body.uid.trim() : "";
  if (uid && store.users.has(uid)) {
    return store.users.get(uid);
  }
  const emailOrQuery = (
    (typeof body.email === "string" && body.email) ||
    (typeof body.query === "string" && body.query) ||
    uid
  )
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  if (!emailOrQuery) return undefined;
  return Array.from(store.users.values()).find((u) => {
    const uname = (
      u.username ||
      (u.email ? u.email.split("@")[0] : "")
    ).toLowerCase();
    return (
      u.id.toLowerCase() === emailOrQuery ||
      u.email.toLowerCase() === emailOrQuery ||
      uname === emailOrQuery ||
      u.name.toLowerCase() === emailOrQuery
    );
  });
}

export async function POST(request: Request) {
  const rl = checkRateLimit(extractRateLimitKey(request, "admin"), 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        ok: false,
        reason: "rate_limited",
        error: "Too many attempts, try again in a few minutes.",
      },
      { status: 429 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_json", error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (!action) {
    return NextResponse.json(
      { ok: false, reason: "missing_action", error: "Action is required." },
      { status: 400 }
    );
  }

  const store = getApiStore();
  const actor = extractActorFromRequest(request);
  const admin = isActorAdmin(actor);

  if (!SELF_ACTIONS.has(action) && !admin) {
    return NextResponse.json(
      { ok: false, reason: "forbidden", error: "Not an Admin, access denied." },
      { status: 403 }
    );
  }

  // 1. Self & Shared Actions
  if (action === "app_config") {
    return NextResponse.json({
      ok: true,
      config: store.appConfig,
      beta: {
        enabled: Boolean(store.betaConfig?.enrolmentOpen),
        enrolmentOpen: Boolean(store.betaConfig?.enrolmentOpen),
        maxSlots: 250,
        enrolledCount: Array.from(store.users.values()).filter((u) => u.isBeta)
          .length,
        betaUsersCount: Array.from(store.users.values()).filter((u) => u.isBeta)
          .length,
      },
    });
  }

  if (action === "notice_list") {
    return NextResponse.json({
      ok: true,
      notices: store.notices,
      items: store.notices,
    });
  }

  if (action === "crash_report") {
    const message =
      typeof body.message === "string"
        ? body.message.slice(0, 240)
        : "Client runtime exception";
    const version = typeof body.version === "string" ? body.version : "1.0.0";
    const build = Number(body.build) || store.appConfig.latestBuild;
    const platform = typeof body.platform === "string" ? body.platform : "web";
    store.crashReports.unshift({
      id: `crash-${Date.now()}`,
      message,
      version,
      build,
      platform,
      createdAt: new Date().toISOString(),
    });
    store.crashReports = store.crashReports.slice(0, 12);
    persistApiStore();
    return NextResponse.json({ ok: true });
  }

  if (action === "redeem") {
    const rawCode =
      typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!rawCode) {
      return NextResponse.json(
        {
          ok: false,
          reason: "invalid_code",
          error: "Enter a promo code to redeem.",
        },
        { status: 400 }
      );
    }

    const promo = store.promoCodes.get(rawCode);
    if (!promo) {
      return NextResponse.json(
        {
          ok: false,
          reason: "not_found",
          error: "Promo code not found. Check the spelling and try again.",
        },
        { status: 404 }
      );
    }

    const liveStatus = computePromoLiveStatus(promo);
    if (liveStatus === "revoked" || liveStatus === "expired") {
      return NextResponse.json(
        {
          ok: false,
          reason: liveStatus,
          error: `This promo code is ${liveStatus} and can no longer be redeemed.`,
        },
        { status: 400 }
      );
    }

    if (promo.redeemedBy.includes(actor.userId)) {
      return NextResponse.json(
        {
          ok: false,
          reason: "already_redeemed",
          error: "You have already redeemed this promo code.",
        },
        { status: 409 }
      );
    }

    promo.currentUses += 1;
    promo.redeemedBy.push(actor.userId);

    const nowMs = Date.now();
    const baseMs =
      actor.userRecord.tierExpiresAt &&
      new Date(actor.userRecord.tierExpiresAt).getTime() > nowMs
        ? new Date(actor.userRecord.tierExpiresAt).getTime()
        : nowMs;
    const nextExpiry = promo.permanent
      ? undefined
      : new Date(baseMs + promo.rewardDays * 86_400_000).toISOString();

    actor.userRecord.tier = promo.tier;
    actor.userRecord.tierExpiresAt = nextExpiry;

    store.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      actorId: actor.userId,
      actionType: "promo.redeemed",
      targetUserId: actor.userId,
      reason: `Redeemed promo ${promo.code} for ${promo.tier} (${
        promo.permanent ? "Permanent" : `${promo.rewardDays}d`
      })`,
      createdAt: new Date().toISOString(),
    });
    persistApiStore();

    void syncUserToSupabaseRest({
      id: actor.userRecord.id,
      email: actor.userRecord.email,
      name: actor.userRecord.name,
      niche: actor.userRecord.niche,
      tier: actor.userRecord.tier,
      roles: actor.userRecord.roles,
      status: actor.userRecord.status,
      joinedAt: actor.userRecord.joinedAt,
    });

    return NextResponse.json({
      ok: true,
      code: promo.code,
      tier: actor.userRecord.tier,
      rewardDays: promo.rewardDays,
      permanent: promo.permanent,
      expiresAt: nextExpiry || null,
    });
  }

  if (action === "delete_me") {
    store.users.delete(actor.userId);
    persistApiStore();
    return NextResponse.json({ ok: true });
  }

  // 2. Admin-Only Actions Below
  if (action === "lookup") {
    const query = (
      (typeof body.query === "string" && body.query) ||
      (typeof body.email === "string" && body.email) ||
      ""
    )
      .trim()
      .toLowerCase();
    if (!query) {
      return NextResponse.json(
        {
          ok: false,
          reason: "empty_query",
          error: "Enter a username, email, or user ID.",
        },
        { status: 400 }
      );
    }
    const found = findUserByUidOrEmail(store, { query });
    if (!found) {
      return NextResponse.json(
        {
          ok: false,
          reason: "no_such_user",
          error: "No account matches that username, email, or ID.",
        },
        { status: 404 }
      );
    }
    return NextResponse.json({
      ok: true,
      account: serializeAccount(found),
    });
  }

  if (action === "grant" || action === "revoke") {
    const target = findUserByUidOrEmail(store, body);
    if (!target) {
      return NextResponse.json(
        {
          ok: false,
          reason: "no_such_user",
          error: "Select and verify an account first.",
        },
        { status: 404 }
      );
    }
    if (action === "revoke") {
      target.tier = "FREE";
      target.tierExpiresAt = undefined;
      target.trialEndsAt = undefined;
      store.auditLogs.unshift({
        id: `audit-${Date.now()}`,
        actorId: actor.userId,
        actionType: "admin.revoke_plan",
        targetUserId: target.id,
        reason: `Revoked paid plan for ${target.email}`,
        createdAt: new Date().toISOString(),
      });
      persistApiStore();
      return NextResponse.json({ ok: true, account: serializeAccount(target) });
    }

    const rawTier =
      typeof body.tier === "string" ? body.tier.toUpperCase() : "PRO";
    const grantTier: SubscriptionTier = ["CREATOR", "PRO", "AGENCY"].includes(
      rawTier
    )
      ? (rawTier as SubscriptionTier)
      : "PRO";
    const days = Math.max(1, Number(body.days) || 30);
    const permanent = Boolean(body.permanent);
    const nowMs = Date.now();
    const baseMs =
      target.tierExpiresAt &&
      new Date(target.tierExpiresAt).getTime() > nowMs
        ? new Date(target.tierExpiresAt).getTime()
        : nowMs;
    target.tier = grantTier;
    target.tierExpiresAt = permanent
      ? undefined
      : new Date(baseMs + days * 86_400_000).toISOString();
    target.paidCount = (target.paidCount || 0) + 1;

    store.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      actorId: actor.userId,
      actionType: "admin.grant_plan",
      targetUserId: target.id,
      reason: `Granted ${grantTier} (${
        permanent ? "Permanent" : `${days}d`
      }) to ${target.email}`,
      createdAt: new Date().toISOString(),
    });
    persistApiStore();
    return NextResponse.json({ ok: true, account: serializeAccount(target) });
  }

  if (action === "test_tier" || action === "test_mode") {
    if (body.tier === null || body.tier === "") {
      actor.userRecord.testTierOverride = undefined;
      persistApiStore();
      return NextResponse.json({
        ok: true,
        testTierOverride: null,
      });
    }
    const rawTier =
      typeof body.tier === "string" ? body.tier.toUpperCase() : "FREE";
    const simTier: SubscriptionTier = [
      "FREE",
      "CREATOR",
      "PRO",
      "AGENCY",
    ].includes(rawTier)
      ? (rawTier as SubscriptionTier)
      : "FREE";
    const expiresAt = new Date(Date.now() + 8 * 3600_000).toISOString();
    actor.userRecord.testTierOverride = { tier: simTier, expiresAt };
    persistApiStore();
    return NextResponse.json({
      ok: true,
      testTierOverride: actor.userRecord.testTierOverride,
    });
  }

  if (action === "reset_me") {
    actor.userRecord.testTierOverride = undefined;
    persistApiStore();
    return NextResponse.json({
      ok: true,
      testTierOverride: null,
    });
  }

  if (action === "suspend" || action === "unsuspend") {
    const target = findUserByUidOrEmail(store, body);
    if (!target) {
      return NextResponse.json(
        {
          ok: false,
          reason: "no_such_user",
          error: "Select an account first.",
        },
        { status: 404 }
      );
    }
    if (action === "unsuspend") {
      target.status = "Active";
      target.suspendedUntil = null;
      target.suspendReason = undefined;
    } else {
      const days = Number(body.days);
      target.status = "Suspended";
      target.suspendReason =
        typeof body.reason === "string" && body.reason.trim()
          ? body.reason.trim()
          : "Suspended by Admin";
      target.suspendedUntil =
        Number.isFinite(days) && days > 0
          ? new Date(Date.now() + days * 86_400_000).toISOString()
          : null;
    }
    persistApiStore();
    return NextResponse.json({ ok: true, account: serializeAccount(target) });
  }

  if (action === "repair_masked_tiers") {
    const dryRun = body.dryRun !== false;
    const candidates = Array.from(store.users.values()).filter(
      (u) => u.trialUsed && u.tier !== "FREE"
    );
    if (!dryRun) {
      for (const u of candidates) {
        const baseMs = u.tierExpiresAt
          ? new Date(u.tierExpiresAt).getTime()
          : Date.now();
        u.tierExpiresAt = new Date(baseMs + 7 * 86_400_000).toISOString();
      }
      persistApiStore();
    }
    return NextResponse.json({
      ok: true,
      dryRun,
      affectedCount: candidates.length,
      repairedCount: dryRun ? 0 : candidates.length,
      accounts: candidates.map((c) => ({
        email: c.email,
        daysAdded: 7,
      })),
    });
  }

  if (action === "promo_create") {
    const rawCode =
      typeof body.code === "string"
        ? body.code
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
        : "";
    if (!rawCode || rawCode.length < 3) {
      return NextResponse.json(
        {
          ok: false,
          reason: "invalid_code",
          error: "Promo code must be at least 3 letters or numbers.",
        },
        { status: 400 }
      );
    }
    const rawTier =
      typeof body.tier === "string" ? body.tier.toUpperCase() : "PRO";
    const tier: SubscriptionTier = ["CREATOR", "PRO", "AGENCY"].includes(
      rawTier
    )
      ? (rawTier as SubscriptionTier)
      : "PRO";
    const rewardDays = Math.max(1, Number(body.rewardDays) || 30);
    const permanent = Boolean(body.permanent);
    const parsedMax = Number(body.maxUses);
    const maxUses =
      Number.isFinite(parsedMax) && parsedMax > 0
        ? Math.floor(parsedMax)
        : null;
    const expiresInDays = Number(body.expiresInDays);
    const expiresAt =
      !permanent && Number.isFinite(expiresInDays) && expiresInDays > 0
        ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
        : null;
    const note = typeof body.note === "string" ? body.note.trim() : "";

    const record: PromoCodeRecord = {
      code: rawCode,
      tier,
      rewardDays,
      permanent,
      maxUses,
      currentUses: 0,
      status: permanent ? "permanent" : "active",
      expiresAt,
      createdAt: new Date().toISOString(),
      createdBy: actor.userRecord.email || actor.userId,
      redeemedBy: [],
      note,
    };
    store.promoCodes.set(rawCode, record);
    persistApiStore();
    return NextResponse.json({
      ok: true,
      promo: serializePromo(record),
    });
  }

  if (action === "promo_list") {
    const promos = Array.from(store.promoCodes.values()).map(serializePromo);
    return NextResponse.json({ ok: true, promos, items: promos });
  }

  if (
    action === "promo_update" ||
    action === "promo_extend" ||
    action === "promo_permanent" ||
    action === "promo_reactivate"
  ) {
    const code =
      typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const promo = store.promoCodes.get(code);
    if (!promo) {
      return NextResponse.json(
        { ok: false, reason: "not_found", error: "Promo code not found." },
        { status: 404 }
      );
    }
    const addDays = Number(body.addDays ?? body.days);
    if (
      (action === "promo_extend" || Number.isFinite(addDays)) &&
      addDays > 0
    ) {
      promo.rewardDays += addDays;
      const baseMs = promo.expiresAt
        ? new Date(promo.expiresAt).getTime()
        : Date.now();
      promo.expiresAt = new Date(
        baseMs + addDays * 86_400_000
      ).toISOString();
    }
    if (action === "promo_permanent" || body.permanent === true) {
      promo.permanent = true;
      promo.status = "permanent";
      promo.expiresAt = null;
    }
    if (action === "promo_reactivate" || body.reactivate === true) {
      promo.status = promo.permanent ? "permanent" : "active";
      if (
        promo.expiresAt &&
        new Date(promo.expiresAt).getTime() <= Date.now()
      ) {
        promo.expiresAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
      }
    }
    if (
      typeof body.tier === "string" &&
      ["CREATOR", "PRO", "AGENCY"].includes(body.tier.toUpperCase())
    ) {
      promo.tier = body.tier.toUpperCase() as SubscriptionTier;
    }
    if (typeof body.rewardDays === "number" && body.rewardDays > 0) {
      promo.rewardDays = Math.floor(body.rewardDays);
    }
    persistApiStore();
    return NextResponse.json({ ok: true, promo: serializePromo(promo) });
  }

  if (action === "promo_revoke") {
    const code =
      typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const promo = store.promoCodes.get(code);
    if (!promo) {
      return NextResponse.json(
        { ok: false, reason: "not_found", error: "Promo code not found." },
        { status: 404 }
      );
    }
    promo.status = "revoked";
    persistApiStore();
    return NextResponse.json({ ok: true, promo: serializePromo(promo) });
  }

  if (action === "promo_delete") {
    const code =
      typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    store.promoCodes.delete(code);
    persistApiStore();
    return NextResponse.json({ ok: true });
  }

  if (action === "app_config_set") {
    if (typeof body.maintenance === "boolean") {
      store.appConfig.maintenance = body.maintenance;
    }
    if (typeof body.paymentsLive === "boolean") {
      store.appConfig.paymentsLive = body.paymentsLive === true;
    }
    if (body.minBuild !== undefined) {
      store.appConfig.minBuild = Math.max(
        0,
        Math.floor(Number(body.minBuild) || 0)
      );
    }
    if (body.latestBuild !== undefined) {
      store.appConfig.latestBuild = Math.max(
        0,
        Math.floor(Number(body.latestBuild) || 0)
      );
    }
    if (typeof body.downloadUrl === "string") {
      const trimmed = body.downloadUrl.trim();
      if (trimmed && !trimmed.startsWith("https://")) {
        return NextResponse.json(
          {
            ok: false,
            reason: "invalid_download_url",
            error: "Download URL must start with https:// or be empty.",
          },
          { status: 400 }
        );
      }
      store.appConfig.downloadUrl = trimmed;
    }
    persistApiStore();
    return NextResponse.json({ ok: true, config: store.appConfig });
  }

  if (action === "user_list") {
    const accounts = Array.from(store.users.values())
      .slice(0, 300)
      .reverse()
      .map(serializeAccount);
    return NextResponse.json({ ok: true, users: accounts, items: accounts });
  }

  if (action === "user_hide") {
    const uid = typeof body.uid === "string" ? body.uid.trim() : "";
    let target = store.users.get(uid);
    if (!target && uid) {
      const byDisplay = Array.from(store.users.values()).filter(
        (u) => u.name.toLowerCase() === uid.toLowerCase()
      );
      if (byDisplay.length > 1) {
        return NextResponse.json(
          {
            ok: false,
            reason: "ambiguous_name",
            error:
              "Multiple accounts share that display name. Hide by UID instead.",
          },
          { status: 409 }
        );
      }
      target = byDisplay[0];
    }
    if (!target) {
      return NextResponse.json(
        { ok: false, reason: "no_such_user", error: "Account not found." },
        { status: 404 }
      );
    }
    target.hiddenFromUserList =
      typeof body.hidden === "boolean"
        ? body.hidden
        : !target.hiddenFromUserList;
    persistApiStore();
    return NextResponse.json({ ok: true, account: serializeAccount(target) });
  }

  if (action === "beta_toggle" || action === "beta_config") {
    if (typeof body.enrolmentOpen === "boolean") {
      store.betaConfig.enrolmentOpen = body.enrolmentOpen;
      persistApiStore();
    }
    const enrolledCount = Array.from(store.users.values()).filter(
      (u) => u.isBeta
    ).length;
    return NextResponse.json({
      ok: true,
      beta: {
        enabled: store.betaConfig.enrolmentOpen,
        enrolmentOpen: store.betaConfig.enrolmentOpen,
        maxSlots: 250,
        enrolledCount,
        betaUsersCount: enrolledCount,
      },
    });
  }

  if (action === "beta_revoke") {
    const target = findUserByUidOrEmail(store, body);
    if (!target) {
      return NextResponse.json(
        { ok: false, reason: "no_such_user", error: "Account not found." },
        { status: 404 }
      );
    }
    target.isBeta = false;
    target.betaRemovedAt = new Date().toISOString();
    target.betaRemovedBy = actor.userRecord.email || actor.userId;
    persistApiStore();
    return NextResponse.json({ ok: true, account: serializeAccount(target) });
  }

  if (action === "tester_mark") {
    const target = findUserByUidOrEmail(store, body);
    if (!target) {
      return NextResponse.json(
        { ok: false, reason: "no_such_user", error: "Account not found." },
        { status: 404 }
      );
    }
    target.isTester = body.remove === true ? false : true;
    target.testerGrantedBy = actor.userRecord.email || actor.userId;
    target.testerGrantedAt = new Date().toISOString();
    persistApiStore();
    return NextResponse.json({ ok: true, account: serializeAccount(target) });
  }

  if (action === "tester_mark_existing") {
    let count = 0;
    for (const u of Array.from(store.users.values())) {
      if (u.email) {
        u.isTester = true;
        u.testerGrantedBy = actor.userRecord.email || actor.userId;
        u.testerGrantedAt = new Date().toISOString();
        count += 1;
      }
    }
    persistApiStore();
    return NextResponse.json({ ok: true, badgedCount: count });
  }

  if (action === "tester_create" || action === "tester_mint") {
    const rawCandidate =
      typeof body.username === "string" && body.username.trim()
        ? body.username.trim().replace(/^@/, "")
        : typeof body.prefix === "string" && body.prefix.trim()
          ? body.prefix
              .trim()
              .replace(/^@/, "")
              .replace(/[^a-zA-Z0-9._]/g, "_")
          : "";
    if (!/^[a-zA-Z0-9._]{3,20}$/.test(rawCandidate)) {
      return NextResponse.json(
        {
          ok: false,
          reason: "invalid_username",
          error:
            "Username must be 3 to 20 letters, numbers, dots, or underscores.",
        },
        { status: 400 }
      );
    }
    const emailInput =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim().toLowerCase()
        : `${rawCandidate.toLowerCase()}@testers.contentflow.app`;
    const mintedPassword = `CF-${crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()}!9`;
    const testerId = `tester-${Date.now()}`;
    const newTester: UserAccountRecord = {
      id: testerId,
      name: formatCreatorDisplayName(rawCandidate, emailInput),
      username: rawCandidate,
      email: emailInput,
      niche:
        typeof body.note === "string" && body.note.trim()
          ? body.note.trim()
          : "Tester workspace",
      passwordHash: hashPassword(mintedPassword),
      tier: "PRO",
      roles: ["creator"],
      status: "Active",
      joinedAt: new Date().toISOString(),
      isTester: true,
      testerGrantedBy: actor.userRecord.email || actor.userId,
      testerGrantedAt: new Date().toISOString(),
      usage: {
        dailyAiGenerations: 0,
        monthlyPostsCreated: 0,
        monthlyCrossPosts: 0,
        storageUsedMb: 0,
      },
      encryptedByok: {},
      connectedPlatforms: {},
    };
    store.users.set(testerId, newTester);
    persistApiStore();
    return NextResponse.json({
      ok: true,
      tester: serializeAccount(newTester),
      tempPassword: mintedPassword,
      handover: {
        username: rawCandidate,
        email: emailInput,
        password: mintedPassword,
        instructions:
          "Open ContentFlow, choose Log in, and enter this email/username and password. Do not use Sign up.",
      },
    });
  }

  if (action === "tester_reset_password") {
    const target = findUserByUidOrEmail(store, body);
    if (!target) {
      return NextResponse.json(
        {
          ok: false,
          reason: "no_such_user",
          error: "Tester account not found.",
        },
        { status: 404 }
      );
    }
    const mintedPassword = `CF-${crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()}!9`;
    target.passwordHash = hashPassword(mintedPassword);
    persistApiStore();
    return NextResponse.json({
      ok: true,
      tempPassword: mintedPassword,
      handover: {
        username: target.username || target.name,
        email: target.email,
        password: mintedPassword,
      },
    });
  }

  if (action === "tester_message") {
    const subject =
      typeof body.subject === "string" ? body.subject.trim() : "";
    const message =
      typeof body.message === "string" ? body.message.trim() : "";
    if (!subject || !message) {
      return NextResponse.json(
        {
          ok: false,
          reason: "missing_fields",
          error: "Subject and message are required.",
        },
        { status: 400 }
      );
    }
    const realTesters = Array.from(store.users.values()).filter(
      (u) =>
        u.isTester &&
        u.email &&
        !u.email.endsWith("@testers.contentflow.app")
    );
    store.notices.unshift({
      id: `notice-${Date.now()}`,
      audience: "testers",
      title: subject,
      body: message,
      createdAt: new Date().toISOString(),
      createdBy: actor.userRecord.email || actor.userId,
    });
    persistApiStore();
    return NextResponse.json({
      ok: true,
      recipientCount: realTesters.length,
    });
  }

  if (action === "notice_create" || action === "notice_publish") {
    const audience = body.audience;
    if (audience === "admin") {
      return NextResponse.json(
        {
          ok: false,
          reason: "invalid_audience",
          error:
            "Admin-only notes belong in Admin notes, not the user Notices inbox.",
        },
        { status: 400 }
      );
    }
    const validAudience: "all" | "beta" | "testers" =
      audience === "beta" || audience === "testers" ? audience : "all";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const messageBody = typeof body.body === "string" ? body.body.trim() : "";
    if (!title || !messageBody) {
      return NextResponse.json(
        {
          ok: false,
          reason: "missing_fields",
          error: "Title and message are required.",
        },
        { status: 400 }
      );
    }
    const notice = {
      id: `notice-${Date.now()}`,
      audience: validAudience,
      title,
      body: messageBody,
      createdAt: new Date().toISOString(),
      createdBy: actor.userRecord.email || actor.userId,
    };
    store.notices.unshift(notice);
    persistApiStore();
    return NextResponse.json({
      ok: true,
      notice,
      notices: store.notices,
      items: store.notices,
    });
  }

  if (action === "notice_delete") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    store.notices = store.notices.filter((n) => n.id !== id);
    persistApiStore();
    return NextResponse.json({
      ok: true,
      notices: store.notices,
      items: store.notices,
    });
  }

  if (action === "subs_list") {
    const query =
      typeof body.query === "string" ? body.query.trim().toLowerCase() : "";
    const subs = Array.from(store.users.values())
      .filter((u) => u.tier !== "FREE")
      .filter(
        (u) =>
          !query ||
          u.email.toLowerCase().includes(query) ||
          u.id.toLowerCase().includes(query) ||
          u.name.toLowerCase().includes(query)
      )
      .map(serializeAccount);
    return NextResponse.json({ ok: true, subscribers: subs, items: subs });
  }

  if (action === "sweep_run" || action === "sweep_now") {
    const nowMs = Date.now();
    let expiredCount = 0;
    let remindersQueued = 0;
    for (const u of Array.from(store.users.values())) {
      const expStr = u.tierExpiresAt || u.trialEndsAt;
      if (expStr && !isSuperuserEmail(u.email)) {
        const expMs = new Date(expStr).getTime();
        const daysLeft = Math.ceil((expMs - nowMs) / 86_400_000);
        if (expMs <= nowMs) {
          u.tier = "FREE";
          u.tierExpiresAt = undefined;
          u.trialEndsAt = undefined;
          expiredCount += 1;
        } else if (daysLeft === 7 || daysLeft === 3 || daysLeft === 1) {
          remindersQueued += 1;
        }
      }
    }
    persistApiStore();
    return NextResponse.json({
      ok: true,
      expiredCount,
      remindersQueued,
      sweptAt: new Date().toISOString(),
    });
  }

  if (action === "notes_list") {
    const items = store.adminNotes.map((n) => ({
      id: n.id,
      text: `${n.title}: ${n.body}`,
      title: n.title,
      body: n.body,
      createdAt: n.createdAt,
    }));
    return NextResponse.json({ ok: true, items, adminNotes: store.adminNotes });
  }

  if (action === "stats" || action === "system_summary") {
    const activePaidOrTrial = Array.from(store.users.values()).filter(
      (u) => u.tier !== "FREE"
    ).length;
    return NextResponse.json({
      ok: true,
      admins: ["johnpaulonovo@gmail.com"],
      aiEngine: {
        primaryModel: "Cloudflare Workers AI (@cf/meta/llama-3.1-8b-instruct)",
        hasCloudflareKey: Boolean(process.env.CLOUDFLARE_API_TOKEN),
        backupModel: "Hugging Face / Built-in Creator Engine ($0 fallback)",
      },
      stats: {
        usersCount: store.users.size,
        totalUsers: store.users.size,
        activePaidOrTrial,
        activePromos: store.promoCodes.size,
        activeNotices: store.notices.length,
        pendingCheckouts: store.pendingCheckouts.length,
        crashReports: store.crashReports.length,
        totalDrafts: store.contents.size,
        totalJobs: store.jobs.size,
      },
      appConfig: store.appConfig,
      adminNotes: store.adminNotes,
      crashReports: store.crashReports.slice(0, 12),
      pendingCheckouts: store.pendingCheckouts,
      waitlist: store.waitlist,
    });
  }

  if (action === "waitlist_list") {
    return NextResponse.json({
      ok: true,
      items: store.waitlist,
      waitlist: store.waitlist,
    });
  }

  if (action === "crash_list") {
    return NextResponse.json({
      ok: true,
      items: store.crashReports.slice(0, 12),
      crashReports: store.crashReports.slice(0, 12),
    });
  }

  if (action === "checkouts_list") {
    return NextResponse.json({
      ok: true,
      items: store.pendingCheckouts,
      pendingCheckouts: store.pendingCheckouts,
    });
  }

  if (action === "applinks_pin") {
    const sha256 = typeof body.sha256 === "string" ? body.sha256.trim() : "";
    store.appConfig.appLinksSha256 = sha256;
    persistApiStore();
    return NextResponse.json({ ok: true, appLinksSha256: sha256 });
  }

  if (action === "applinks_clear") {
    store.appConfig.appLinksSha256 = "";
    persistApiStore();
    return NextResponse.json({ ok: true, appLinksSha256: "" });
  }

  if (action === "crash_clear") {
    store.crashReports = [];
    persistApiStore();
    return NextResponse.json({ ok: true, crashReports: [] });
  }

  return NextResponse.json(
    {
      ok: false,
      reason: "unknown_action",
      error: `Unknown admin action: ${action}`,
    },
    { status: 400 }
  );
}
