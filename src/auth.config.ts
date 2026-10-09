import type { NextAuthConfig } from "next-auth";

import type { DoctorCategory, ProviderType, UserRole } from "@/generated/prisma/client";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.providerId = user.providerId ?? null;
        token.clinicId = user.clinicId ?? null;
        token.providerType = user.providerType ?? null;
        token.category = user.category ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id && token.role) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.providerId = (token.providerId as string | null) ?? null;
        session.user.clinicId = (token.clinicId as string | null) ?? null;
        session.user.providerType = (token.providerType as ProviderType | null) ?? null;
        session.user.category = (token.category as DoctorCategory | null) ?? null;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = Boolean(auth?.user);

      if (
        pathname.startsWith("/login") ||
        pathname.startsWith("/team/login") ||
        pathname.startsWith("/doctor/login")
      ) {
        return true;
      }

      // Public redirects handled in proxy — allow through so they aren't treated as protected app routes
      if (pathname === "/admin/login" || pathname === "/admin/team/login") {
        return true;
      }

      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false;
        const role = auth?.user?.role;
        return role === "ADMIN" || role === "STAFF";
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
