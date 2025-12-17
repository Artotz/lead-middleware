import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name, options) {
        response.cookies.set({
          name,
          value: "",
          ...options,
          maxAge: 0,
        });
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname.startsWith("/login");
  const isProtectedRoute = pathname === "/" || pathname.startsWith("/metrics");

  if (!session && isProtectedRoute) {
    const mockUserId = process.env.MOCK_USER_ID?.trim();
    if (mockUserId && isUuid(mockUserId)) {
      return response;
    }
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("message", "Faça login para acessar o painel.");
    return NextResponse.redirect(redirectUrl, {
      headers: response.headers,
    });
  }

  if (session && isLoginRoute) {
    const redirectUrl = new URL("/", request.url);
    return NextResponse.redirect(redirectUrl, {
      headers: response.headers,
    });
  }

  return response;
}

export const config = {
  matcher: ["/", "/metrics/:path*", "/login"],
};
