import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // There is no /admin/login — admin signs in at /login
  if (pathname === "/admin/login" || pathname === "/admin/login/") {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  // Team login lives at /team/login, not under /admin
  if (pathname === "/admin/team/login" || pathname === "/admin/team/login/") {
    return NextResponse.redirect(new URL("/team/login", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
