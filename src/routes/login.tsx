import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoginPage } from "@/mansa/components/LoginPage";
import { useAuth } from "@/mansa/context/AuthContext";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search["mode"] === "signup" ? ("signup" as const) : ("login" as const),
  }),
  component: LoginRoute,
});

function AuthLoader() {
  return (
    <div className="min-h-screen w-full bg-[#0d0f10] flex flex-col items-center justify-center space-y-4">
      <div className="size-12 rounded-2xl bg-[#15181b] border border-white/10 flex items-center justify-center">
        <div className="size-5 rounded-full border-2 border-[#3ddc84] border-t-transparent animate-spin" />
      </div>
      <p className="text-xs font-mono text-[#9ba3aa]">Mansa · Initialisation sécurisée...</p>
    </div>
  );
}

function LoginRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { mode } = Route.useSearch();

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/app", replace: true });
  }, [loading, user, navigate]);

  if (loading || user) return <AuthLoader />;
  return (
    <LoginPage
      key={mode}
      initialMode={mode}
      lang="fr"
      onLoginSuccess={() => void navigate({ to: "/app", replace: true })}
      onBackToLanding={() => void navigate({ to: "/" })}
    />
  );
}
