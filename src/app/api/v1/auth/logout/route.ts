import { NextResponse } from "next/server";
import { clearSessionCookieHeader } from "@/lib/server/auth";

export async function POST() {
  const response = NextResponse.json({ loggedOut: true });
  response.headers.set("set-cookie", clearSessionCookieHeader());
  return response;
}
