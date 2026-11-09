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
});
