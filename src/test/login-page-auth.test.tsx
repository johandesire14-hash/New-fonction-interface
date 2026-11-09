import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginPage } from "../mansa/components/LoginPage";
import { AuthProvider } from "../mansa/context/AuthContext";
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

describe("LoginPage with Supabase Auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form and submits credentials", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: {
        user: {
          id: "test-user-id",
          email: "user@mansa.app",
          user_metadata: { full_name: "Mansa User" },
        } as any,
        session: {} as any,
      },
      error: null,
    });

    const onLoginSuccess = vi.fn();
    const { container } = render(
      <AuthProvider>
        <LoginPage initialMode="login" lang="fr" onLoginSuccess={onLoginSuccess} />
      </AuthProvider>,
    );

    await waitFor(() => expect(supabase.auth.getSession).toHaveBeenCalledTimes(1));
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: "test-user-id",
            email: "user@mansa.app",
            user_metadata: { full_name: "Mansa User" },
          },
          access_token: "valid-test-token",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        } as any,
      },
      error: null,
    } as any);

    const emailInput = screen.getByPlaceholderText("nom@exemple.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLElement;

    fireEvent.change(emailInput, { target: { value: "user@mansa.app" } });
    fireEvent.change(passwordInput, { target: { value: "secret123" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "user@mansa.app",
        password: "secret123",
      });
      expect(onLoginSuccess).toHaveBeenCalled();
    });
  });

  it("displays the real invalid-credentials reason returned by Supabase", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" } as any,
    });

    const onLoginSuccess = vi.fn();
    const { container } = render(
      <AuthProvider>
        <LoginPage initialMode="login" lang="fr" onLoginSuccess={onLoginSuccess} />
      </AuthProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText("nom@exemple.com"), {
      target: { value: "user@mansa.app" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "bad-password" },
    });
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLElement);

    expect(await screen.findByText("Adresse email ou mot de passe incorrect.")).toBeInTheDocument();
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it("shows the protected-route session message on the login screen", () => {
    render(
      <AuthProvider>
        <LoginPage
          initialMode="login"
          initialError="Votre session Supabase est absente ou a expiré. Reconnectez-vous pour continuer."
          lang="fr"
          onLoginSuccess={vi.fn()}
        />
      </AuthProvider>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Votre session Supabase est absente ou a expiré");
  });
});
