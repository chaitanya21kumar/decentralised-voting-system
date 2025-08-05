// middleware.ts
import { NextRequest, NextResponse } from "next/server";

// Define voter-only routes
const voterOnlyRoutes = [
  "/voter",
  "/change-password",
  "/signinusers",
];

// Define admin-accessible routes (in addition to admin_page)
const adminAccessibleRoutes = [
  "/results",
  "/candidates",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response: NextResponse | undefined = undefined;
  
  // 1. Authentication checks & possible redirects
  if (pathname.startsWith("/admin_page")) {
    const adminToken = request.cookies.get("adminToken")?.value;
    
    if (!adminToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      response = NextResponse.redirect(url);
    }
  } else if (adminAccessibleRoutes.includes(pathname)) {
    // Routes that both admin and voters can access
    const adminToken = request.cookies.get("adminToken")?.value;
    const voterToken = request.cookies.get("voterToken")?.value;
    
    if (!adminToken && !voterToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/signin";
      response = NextResponse.redirect(url);
    }
  } else if (voterOnlyRoutes.includes(pathname)) {
    // Voter-only routes
    const voterToken = request.cookies.get("voterToken")?.value;
    
    if (!voterToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/signin";
      response = NextResponse.redirect(url);
    }
  }

  // 2. Default to a normal response if no redirect
  if (!response) {
    response = NextResponse.next();
  }

  // 3. Add Content Security Policy header:
  //    - In production: include report-uri (to /api/csp-report)
  //    - In development: simple CSP without reporting
  const csp = process.env.NODE_ENV === "production"
    ? "default-src 'self'; report-uri /api/csp-report"
    : "default-src 'self'";
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

// Apply middleware only to these routes
export const config = {
  matcher: [
    "/voter",
    "/results",
    "/candidates", 
    "/change-password",
    "/signinusers",
    "/admin_page/:path*",
  ],
};
