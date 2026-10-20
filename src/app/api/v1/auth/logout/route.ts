import { NextResponse } from "next/server";
import { clearSessionCookieHeader } from "@/lib/server/auth";
import { revokeSessionFromRequest } from "@/lib/server/store";

export async function POST(request: Request) {
  revokeSessionFromRequest(request);
  const response = NextResponse.json({ loggedOut: true });
  response.headers.set("set-cookie", clearSessionCookieHeader());
  return response;
}
