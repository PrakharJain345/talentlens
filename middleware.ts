import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let public static files and api routes proceed
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const { supabaseResponse, user, role } = await updateSession(request);

  const isAuthRoute = pathname.startsWith("/login");
  const isRecruiterRoute = pathname.startsWith("/requisitions");
  const isClientRoute = pathname.startsWith("/portal");
  const isRootRoute = pathname === "/";

  // 1. Unauthenticated users cannot access protected routes
  if (!user && (isRecruiterRoute || isClientRoute)) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Authenticated users visiting /login or / get redirected to their dashboard
  if (user && (isAuthRoute || isRootRoute)) {
    if (role === "client") {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
    return NextResponse.redirect(new URL("/requisitions", request.url));
  }

  // 3. Role-based route boundaries
  if (user && role === "client" && isRecruiterRoute) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  if (user && role === "recruiter" && isClientRoute) {
    return NextResponse.redirect(new URL("/requisitions", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

