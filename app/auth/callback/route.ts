import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';
import { safeNextPath } from '@/lib/safe-redirect';

export const dynamic = 'force-dynamic';

function renderCallbackHtml(title: string, message: string, success: boolean, next: string, error?: string) {
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #fafaf9;
        color: #1c1917;
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
      }
      .card {
        background: #ffffff;
        border: 1px solid #e7e5e4;
        border-radius: 8px;
        padding: 32px 24px;
        max-width: 420px;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      .icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
        font-size: 22px;
      }
      .icon-success { background: #ecfdf5; color: #047857; }
      .icon-error { background: #fef2f2; color: #b91c1c; }
      h1 { font-size: 19px; font-weight: 700; margin: 0 0 8px; }
      p { font-size: 14px; color: #57534e; margin: 0 0 16px; line-height: 1.5; }
      a { color: #78350f; font-weight: 600; text-decoration: underline; font-size: 13px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon ${success ? 'icon-success' : 'icon-error'}">${success ? '✓' : '✕'}</div>
      <h1>${title}</h1>
      <p>${message}</p>
      <a href="${next}">Click here if this window does not close automatically</a>
    </div>
    <script>
      try {
        if (window.opener) {
          window.opener.postMessage({
            type: '${success ? 'OAUTH_AUTH_SUCCESS' : 'OAUTH_AUTH_ERROR'}',
            next: ${JSON.stringify(next)},
            error: ${JSON.stringify(error || null)}
          }, '*');
          setTimeout(function() {
            window.close();
          }, 600);
        } else {
          setTimeout(function() {
            window.location.href = ${JSON.stringify(next)};
          }, 1000);
        }
      } catch (err) {
        window.location.href = ${JSON.stringify(next)};
      }
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    status: success ? 200 : 400,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

/**
 * Landing point for Supabase sign-in redirect: Google, GitHub, and email links.
 * Works both as a direct redirect and as an iframe/popup handler via postMessage.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get('next'), '/');

  const providerError = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (providerError) {
    return renderCallbackHtml('Sign-In Error', providerError, false, `/login?next=${encodeURIComponent(next)}`, providerError);
  }

  if (!isSupabaseConfigured) {
    // In local demo mode, confirm OAuth success and return to next
    return renderCallbackHtml('OAuth Verified', 'Authentication successful. Synchronizing your local session...', true, next);
  }

  const code = url.searchParams.get('code');
  if (!code) {
    return renderCallbackHtml(
      'Missing Code',
      'The sign-in response was missing its authorization code. Please try signing in again.',
      false,
      `/login?next=${encodeURIComponent(next)}`,
      'Missing authorization code'
    );
  }

  try {
    const cookiesToSetLater: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            cookiesToSetLater.push({ name, value, options });
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('OAuth code exchange failed:', error);
      return renderCallbackHtml(
        'Exchange Failed',
        error.message || 'That sign-in link has expired or was already used.',
        false,
        `/login?next=${encodeURIComponent(next)}`,
        error.message
      );
    }

    const response = renderCallbackHtml('Authentication Successful', 'Identity verified. Returning to ResearchWithMe...', true, next);

    // Ensure cookies are configured for iframe compatibility (SameSite=none, Secure=true)
    cookiesToSetLater.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, {
        ...options,
        sameSite: 'none',
        secure: true,
      });
    });

    return response;
  } catch (error) {
    console.error('OAuth code exchange exception:', error);
    return renderCallbackHtml(
      'Connection Error',
      'The sign-in service could not be reached. Try again in a moment.',
      false,
      `/login?next=${encodeURIComponent(next)}`
    );
  }
}
