import { Suspense } from "react";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Doctor login" };

export default function DoctorLoginPage() {
  return (
    <AuthPageShell
      roleTag="Doctor"
      title="Welcome back, Doctor"
      subtitle="Sign in to manage your clinic — patients, appointments, and prescriptions."
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <LoginForm
          allowedRole="STAFF"
          requiredProviderType="DOCTOR"
          wrongRoleMessage="Platform admins sign in at /login."
          wrongProviderTypeMessage="Staff members sign in at /team/login."
        />
      </Suspense>
    </AuthPageShell>
  );
}
