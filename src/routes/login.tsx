import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LoginPage } from "@/mansa/components/LoginPage";
import { useAuth } from "@/mansa/context/AuthContext";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search["mode"] === "signup" ? ("signup" as const) : ("login" as const),
    reason: search["reason"] === "session" ? ("session" as const) : undefined,
  }),
  component: LoginRoute,
});

const LOGIN_REDIRECT_TIMEOUT_MS = 12_000;
const LOGIN_REDIRECT_TIMEOUT_MESSAGE =
  "Votre connexion est établie, mais l'ouverture de Mansa prend trop de temps. Réessayez ou rechargez la page.";

function AuthLoader({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  return (
    <div className="min-h-screen w-full bg-[#0d0f10] flex flex-col items-center justify-center space-y-4">
      {error ? (
        <div
          role="alert"
          className="max-w-sm space-y-4 rounded-2xl border border-white/10 bg-[#15181b] p-6 text-center"
        >
          <p className="text-sm text-[#f2f4f5]">{error}</p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg bg-[#3ddc84] px-4 py-2 text-xs font-bold text-black"
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-white"
            >
              Recharger
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="size-12 rounded-2xl bg-[#15181b] border border-white/10 flex items-center justify-center">
            <div className="size-5 rounded-full border-2 border-[#3ddc84] border-t-transparent animate-spin" />
          </div>
          <p className="text-xs font-mono text-[#9ba3aa]">Mansa · Initialisation sécurisée...</p>
        </>
      )}
    </div>
  );
}

function LoginRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { mode, reason } = Route.useSearch();
  const [redirectError, setRedirectError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) {
      setRedirectError(null);
      return;
    }

    let isActive = true;
    const timeout = setTimeout(() => {
      if (isActive) setRedirectError(LOGIN_REDIRECT_TIMEOUT_MESSAGE);
    }, LOGIN_REDIRECT_TIMEOUT_MS);

    void navigate({ to: "/app", replace: true }).catch((error) => {
      console.error("Impossible d'ouvrir l'application après la connexion:", error);
      if (isActive) setRedirectError(LOGIN_REDIRECT_TIMEOUT_MESSAGE);
    });

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [loading, user, navigate]);

  const retryNavigation = () => {
    setRedirectError(null);
    void navigate({ to: "/app", replace: true }).catch((error) => {
      console.error("Impossible d'ouvrir l'application après la connexion:", error);
      setRedirectError(LOGIN_REDIRECT_TIMEOUT_MESSAGE);
    });
  };

  if (loading) return <AuthLoader />;
  if (user)
    return (
      <AuthLoader {...(redirectError ? { error: redirectError } : {})} onRetry={retryNavigation} />
    );
  return (
    <LoginPage
      key={`${mode}:${reason || ""}`}
      initialMode={mode}
      {...(reason === "session"
        ? { initialError: "Votre session a expiré. Reconnectez-vous pour continuer." }
        : {})}
      lang="fr"
      onLoginSuccess={retryNavigation}
      onBackToLanding={() => void navigate({ to: "/" })}
    />
  );
}
