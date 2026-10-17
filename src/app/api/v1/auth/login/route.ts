import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      demo: !process.env.NEXT_PUBLIC_SUPABASE_URL,
      message: "Authenticated in Demo mode.",
      session: {
        userId: "user-1",
        email,
        expiresInSeconds: 3600,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid login payload." }, { status: 400 });
  }
}
