import type { DoctorCategory, ProviderType, UserRole } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      providerId: string | null;
      clinicId: string | null;
      providerType: ProviderType | null;
      category: DoctorCategory | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    providerId: string | null;
    clinicId: string | null;
    providerType: ProviderType | null;
    category: DoctorCategory | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    providerId: string | null;
    clinicId: string | null;
    providerType: ProviderType | null;
    category: DoctorCategory | null;
  }
}
