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
  };
});

function TestConsumer() {
  const { user, loading, signInWithEmail, logout } = useAuth();
  if (loading) return <div>Chargement...</div>;
  return (
    <div>
      <div data-testid="user-status">{user ? `Connecté: ${user.email}` : "Déconnecté"}</div>
      <button onClick={() => signInWithEmail("test@example.com", "password123")}>Connexion</button>
      <button onClick={() => logout()}>Déconnexion</button>
    </div>
  );
}

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

  it("handles successful login with email/password", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: {
        user: {
          id: "12345678-1234-1234-1234-123456789abc",
          email: "test@example.com",
          user_metadata: { full_name: "Test User" },
        } as any,
        session: {} as any,
      },
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
    expect(await screen.findByTestId("user-status")).toHaveTextContent("Connecté: test@example.com");
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

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
