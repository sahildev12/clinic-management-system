import { Suspense } from "react";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthPageShell
      roleTag="Admin"
      title="Welcome back!"
      subtitle="Admin login — manage the clinic."
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <LoginForm
          allowedRole="ADMIN"
          wrongRoleMessage="Team members sign in at /team/login."
        />
      </Suspense>
    </AuthPageShell>
  );
}
