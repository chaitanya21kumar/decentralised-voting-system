// middleware.ts
import { NextRequest, NextResponse } from "next/server";

// Define protected routes
const voterProtectedRoutes = [
  "/voter",
  "/change-password",
  "/signinusers",
];

const adminProtectedRoutes = [
  "/admin_page",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response: NextResponse | undefined = undefined;
  
  // 1. Admin route protection
  if (adminProtectedRoutes.some(route => pathname.startsWith(route))) {
    const isAdminLoggedIn = request.cookies.get("adminToken")?.value;
    if (!isAdminLoggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      response = NextResponse.redirect(url);
    }
  }
  // 2. Voter route protection  
  else if (voterProtectedRoutes.includes(pathname)) {
    const isVoterLoggedIn = request.cookies.get("voterToken")?.value;
    if (!isVoterLoggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = "/signin";
      response = NextResponse.redirect(url);
    }
  }
  // 3. Block admin/dashboard route - redirect to proper admin_page route
  else if (pathname === "/admin/dashboard") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin_page/dashboard";
    response = NextResponse.redirect(url);
  }

  // 2. Default to a normal response if no redirect
  if (!response) {
    response = NextResponse.next();
  }

  // 3. Add Content Security Policy header:
  //    - In production: include report-uri (to /api/csp-report)
  //    - In development: disable CSP for easier testing
  if (process.env.NODE_ENV === "production") {
    const csp = "default-src 'self'; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-eval'; report-uri /api/csp-report";
    response.headers.set("Content-Security-Policy", csp);
  }

  return response;
}

// Apply middleware to admin and voter routes
export const config = {
  matcher: [
    "/admin/:path*",
    "/voter",
    "/change-password",
    "/signinusers",
    "/admin_page/:path*",
  ],
};
