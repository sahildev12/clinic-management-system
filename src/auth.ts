import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { hasErrors, validateLoginForm } from "@/lib/auth-validation";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "");
        const password = String(credentials?.password ?? "");
        const errors = validateLoginForm({ email, password });
        if (hasErrors(errors)) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.trim().toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            banned: true,
            passwordHash: true,
            provider: {
              select: {
                id: true,
                clinicId: true,
                providerType: true,
                category: true,
              },
            },
          },
        });
        if (!user || user.banned) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          providerId: user.provider?.id ?? null,
          clinicId: user.provider?.clinicId ?? null,
          providerType: user.provider?.providerType ?? null,
          category: user.provider?.category ?? null,
        };
      },
    }),
  ],
  callbacks: authConfig.callbacks,
});
