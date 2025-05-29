// middleware.ts
import { NextRequest, NextResponse } from "next/server";

// Define protected routes
const protectedRoutes = ["/voter", "/results", "/candidates", "/change-password", "/signinusers", "/admin_page"];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = protectedRoutes.includes(path);
  // Check if the user is logged in by looking for a cookie
  if (path === "/admin_page") {
    const isadminLoggedIn = request.cookies.get("adminToken")?.value;
  
    if (isProtected && !isadminLoggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }


  }
  else {
    const isvoterLoggedIn = request.cookies.get("voterToken")?.value;
    // If trying to access a protected page without being logged in
    if (isProtected && !isvoterLoggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = "/signin";
      return NextResponse.redirect(url);
    }
  }




  return NextResponse.next();
}

// Apply middleware only to these routes
export const config = {
  matcher: ["/voter", "/results", "/candidates", "/change-password", "/signinusers", "/admin_page"],
};
