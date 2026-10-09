import { Suspense } from "react";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Team login" };

export default function TeamLoginPage() {
  return (
    <AuthPageShell
      roleTag="Team"
      title="Welcome back!"
      subtitle="Team login — access your assigned modules."
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <LoginForm
          allowedRole="STAFF"
          requiredProviderType="STAFF"
          wrongRoleMessage="Admins sign in at /login."
          wrongProviderTypeMessage="Doctors sign in at /doctor/login."
        />
      </Suspense>
    </AuthPageShell>
  );
}
