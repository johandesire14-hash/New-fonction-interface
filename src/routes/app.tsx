import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppLoadingScreen } from "@/mansa/components/common/AppLoadingScreen";
import { useAuth } from "@/mansa/context/AuthContext";
import App from "@/mansa/App";

export const Route = createFileRoute("/app")({ component: AppRoute });

function AppRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const locationState = useRouterState({
    select: (state) => state.location.state as { openStudio?: boolean },
  });

  useEffect(() => {
    if (!loading && !user)
      void navigate({ to: "/login", search: { mode: "login" }, replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) return <AppLoadingScreen />;
  return <App openStudioOnMount={Boolean(locationState?.openStudio)} />;
}
