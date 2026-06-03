import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const type = searchParams.get("type");

  // If there's an error in the URL, redirect to login with message
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: (name, value, options) => {
            cookieStore.set({ name, value, ...options });
          },
          remove: (name, options) => {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      },
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // If this was an email confirmation from password signup, redirect to login
      // Otherwise (magic link), redirect to client-files
      if (type === "email_confirmation") {
        return NextResponse.redirect(`${origin}/login?message=email_confirmed`);
      }
      return NextResponse.redirect(`${origin}/client-files`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link_expired`);
}
