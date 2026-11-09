import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../mansa/context/AuthContext";
import { supabase } from "../mansa/services/supabase";

vi.mock("../mansa/services/supabase", () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    isActiveSupabaseSession: (session: any) =>
      Boolean(
        session?.user?.id &&
          session.access_token &&
          (!session.expires_at || session.expires_at > Math.floor(Date.now() / 1000)),
      ),
    SESSION_EXPIRED_MESSAGE: "Votre session Supabase a expiré. Reconnectez-vous pour continuer.",
  };
});

function TestConsumer() {
  const { user, loading, error, signInWithEmail, logout } = useAuth();
  if (loading) return <div>Chargement...</div>;
  return (
    <div>
      <div data-testid="user-status">{user ? `Connecté: ${user.email}` : "Déconnecté"}</div>
      {error && <div data-testid="auth-error">{error}</div>}
      <button onClick={() => void signInWithEmail("test@example.com", "password123").catch(() => {})}>
        Connexion
      </button>
      <button onClick={() => logout()}>Déconnexion</button>
    </div>
  );
}

const activeSession = {
  user: {
    id: "12345678-1234-1234-1234-123456789abc",
    email: "test@example.com",
    user_metadata: { full_name: "Test User" },
  },
  access_token: "valid-test-token",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};

describe("AuthContext with Supabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders logged out state initially when no session", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(await screen.findByTestId("user-status")).toHaveTextContent("Déconnecté");
  });

  it("sets the user only from a valid session returned by getSession", async () => {
    vi.mocked(supabase.auth.getSession)
      .mockResolvedValueOnce({ data: { session: null }, error: null } as any)
      .mockResolvedValueOnce({ data: { session: activeSession }, error: null } as any);
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: activeSession.user as any, session: activeSession as any },
      error: null,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    const loginButton = await screen.findByText("Connexion");
    await act(async () => {
      loginButton.click();
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(2);
    expect(await screen.findByTestId("user-status")).toHaveTextContent("Connecté: test@example.com");
  });

  it("does not trust a sign-in response user when getSession has no active session", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: {
        user: { id: "fake-user-id", email: "test@example.com" } as any,
        session: {} as any,
      },
      error: null,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await screen.findByText("Connexion");
    await act(async () => {
      screen.getByText("Connexion").click();
    });

    expect(screen.getByTestId("user-status")).toHaveTextContent("Déconnecté");
    expect(screen.getByTestId("auth-error")).toHaveTextContent("aucune session active");
  });

  it("shows the specific Supabase email-confirmation error", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "Email not confirmed" } as any,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await screen.findByText("Connexion");
    await act(async () => {
      screen.getByText("Connexion").click();
    });

    expect(screen.getByTestId("auth-error")).toHaveTextContent(
      "Veuillez confirmer votre adresse email avant de vous connecter.",
    );
  });

  it("handles logout", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    const logoutButton = await screen.findByText("Déconnexion");
    await act(async () => {
      logoutButton.click();
    });

    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("shows a clear error instead of an endless spinner when session initialization times out", async () => {
    vi.useFakeTimers();
    vi.mocked(supabase.auth.getSession).mockImplementationOnce(() => new Promise(() => {}) as any);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(screen.getByTestId("user-status")).toHaveTextContent("Déconnecté");
    expect(screen.getByTestId("auth-error")).toHaveTextContent("L'authentification Supabase prend trop de temps");
    vi.useRealTimers();
  });

  it("stops waiting when the sign-in request times out", async () => {
    vi.useFakeTimers();
    vi.mocked(supabase.auth.signInWithPassword).mockImplementationOnce(() => new Promise(() => {}) as any);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      screen.getByText("Connexion").click();
    });
    expect(screen.getByText("Chargement...")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(screen.getByTestId("user-status")).toHaveTextContent("Déconnecté");
    expect(screen.getByTestId("auth-error")).toHaveTextContent("L'authentification Supabase prend trop de temps");
    vi.useRealTimers();
  });

  it("rejects an expired session returned by getSession", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: {
          ...activeSession,
          expires_at: 1,
        } as any,
      },
      error: null,
    } as any);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(await screen.findByTestId("user-status")).toHaveTextContent("Déconnecté");
    expect(await screen.findByTestId("auth-error")).toHaveTextContent("session Supabase a expiré");
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
