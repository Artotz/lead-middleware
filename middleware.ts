import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
  const protectedRoots = ["/", "/metrics"];
  const isProtectedRoute =
    pathname.startsWith("/app") || protectedRoots.includes(pathname);

  if (!session && isProtectedRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("message", "Faça login para acessar o painel.");
    return NextResponse.redirect(redirectUrl, {
      headers: response.headers,
    });
  }

  if (session && isLoginRoute) {
    const redirectUrl = new URL("/app/dashboard", request.url);
    return NextResponse.redirect(redirectUrl, {
      headers: response.headers,
    });
  }

  return response;
}

export const config = {
  matcher: ["/", "/metrics", "/app/:path*", "/login"],
};
