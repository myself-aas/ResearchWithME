import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'rwm_session';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!raw) {
      return NextResponse.json({ authenticated: false, user: null });
    }
    const user = JSON.parse(raw);
    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user = body.user;
    if (!user || typeof user !== 'object') {
      return NextResponse.json({ error: 'Valid user object required.' }, { status: 400 });
    }

    const cookieStore = await cookies();
    // SameSite=none and Secure=true are required for cross-origin iframe context in AI Studio
    cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(user), {
      path: '/',
      sameSite: 'none',
      secure: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ ok: true, user });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Could not set session';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
