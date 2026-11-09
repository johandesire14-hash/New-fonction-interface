import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import {
  isActiveSupabaseSession,
  SESSION_EXPIRED_MESSAGE,
  supabase,
} from "../services/supabase";
import type { FirestoreUserProfile } from "../services/dbService";
import { safeStorage } from "../utils/storage";

export interface AppUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  profile: FirestoreUserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_REQUEST_TIMEOUT_MS = 15_000;
const AUTH_TIMEOUT_MESSAGE =
  "L'authentification Supabase prend trop de temps. Vérifiez votre connexion, puis réessayez.";

const applySessionUser = (
  session: Session | null,
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>,
  setProfile: React.Dispatch<React.SetStateAction<FirestoreUserProfile | null>>,
): boolean => {
  if (!isActiveSupabaseSession(session)) {
    setUser(null);
    setProfile(null);
    return false;
  }

  const appUser = mapSupabaseUserToAppUser(session.user);
  setUser(appUser);
  setProfile(buildUserProfile(appUser));
  return true;
};

const withAuthTimeout = <T,>(request: Promise<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(AUTH_TIMEOUT_MESSAGE)), AUTH_REQUEST_TIMEOUT_MS);
    request.then(
      (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });

// Clean up old insecure local auth keys
const cleanupLegacyLocalStorage = () => {
  try {
    safeStorage.removeItem("mansa_local_auth_accounts");
    safeStorage.removeItem("mansa_local_auth_session");
  } catch {
    // Ignore cleanup error
  }
};

const mapSupabaseUserToAppUser = (sbUser: SupabaseUser): AppUser => {
  const metadata = sbUser.user_metadata || {};
  const displayName =
    metadata.full_name ||
    metadata.display_name ||
    metadata.name ||
    sbUser.email?.split("@")[0] ||
    "Créateur";

  return {
    id: sbUser.id,
    uid: sbUser.id,
    email: sbUser.email || null,
    displayName,
    photoURL: metadata.avatar_url || null,
  };
};

const buildUserProfile = (user: AppUser): FirestoreUserProfile => {
  const initials =
    (user.displayName
      ? user.displayName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : user.email?.slice(0, 2).toUpperCase()) || "MA";

  return {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "Créateur",
    avatarInitials: initials,
    photoURL: user.photoURL || undefined,
    country: "Côte d’Ivoire",
    currency: "XOF",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<FirestoreUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const syncUserFromSession = (session: Session | null): boolean =>
    applySessionUser(session, setUser, setProfile);

  useEffect(() => {
    cleanupLegacyLocalStorage();
    let isMounted = true;

    // Get current session from Supabase
    withAuthTimeout(supabase.auth.getSession())
      .then(({ data: { session }, error: sessionError }) => {
        if (!isMounted) return;
        if (sessionError) {
          console.error("Supabase getSession error:", sessionError);
          syncUserFromSession(null);
          setError("Impossible de vérifier votre session Supabase. Vérifiez votre connexion et réessayez.");
        } else if (session && !isActiveSupabaseSession(session)) {
          syncUserFromSession(null);
          setError(SESSION_EXPIRED_MESSAGE);
          void supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        } else {
          syncUserFromSession(session);
          setError(null);
        }
      })
      .catch((err) => {
        console.error("Erreur lors de la récupération de la session Supabase:", err);
        if (isMounted) {
          setError(
            err?.message === AUTH_TIMEOUT_MESSAGE
              ? AUTH_TIMEOUT_MESSAGE
              : "Impossible de vérifier votre session Supabase. Vérifiez votre connexion et réessayez.",
          );
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Listen to auth changes
    let authListener: { subscription?: { unsubscribe: () => void } } | null = null;
    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;
        if (session) {
          const sessionIsActive = syncUserFromSession(session);
          setError(sessionIsActive ? null : SESSION_EXPIRED_MESSAGE);
        } else {
          syncUserFromSession(null);
          if (event === "SIGNED_OUT") setError(null);
        }
        setLoading(false);
      });
      authListener = data;
    } catch (err) {
      console.warn("Notice: Supabase onAuthStateChange error:", err);
    }

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    const msg = "La connexion Google est retirée pour le moment et sera réintégrée ultérieurement.";
    setError(msg);
    throw new Error(msg);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      setError(null);
      setLoading(true);
      const { error: signInError } = await withAuthTimeout(
        supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pass,
        }),
      );

      if (signInError) {
        throw signInError;
      }

      const { data: { session }, error: sessionError } = await withAuthTimeout(
        supabase.auth.getSession(),
      );
      if (sessionError) throw sessionError;
      if (!isActiveSupabaseSession(session)) {
        syncUserFromSession(null);
        throw new Error(
          session ? SESSION_EXPIRED_MESSAGE : "Supabase n'a établi aucune session active. Vérifiez votre compte et reconnectez-vous.",
        );
      }
      syncUserFromSession(session);
      setError(null);
    } catch (err: any) {
      console.error("Erreur de connexion Supabase:", err);
      let msg = err.message || "Identifiants invalides. Vérifiez votre email et mot de passe.";
      if (msg.includes("Invalid login credentials")) {
        msg = "Adresse email ou mot de passe incorrect.";
      } else if (msg.includes("Email not confirmed")) {
        msg = "Veuillez confirmer votre adresse email avant de vous connecter.";
      }
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    try {
      setError(null);
      setLoading(true);
      const displayName = name?.trim() || email.split("@")[0] || "Créateur";

      const { data, error: signUpError } = await withAuthTimeout(
        supabase.auth.signUp({
          email: email.trim(),
          password: pass,
          options: {
            data: {
              full_name: displayName,
              display_name: displayName,
            },
          },
        }),
      );

      if (signUpError) {
        throw signUpError;
      }

      const { data: { session }, error: sessionError } = await withAuthTimeout(
        supabase.auth.getSession(),
      );
      if (sessionError) throw sessionError;
      if (!isActiveSupabaseSession(session)) {
        syncUserFromSession(null);
        throw new Error(
          data.user
            ? "Compte créé. Confirmez votre adresse email, puis connectez-vous."
            : "Aucune session Supabase active n'a été créée. Reconnectez-vous.",
        );
      }
      syncUserFromSession(session);
      setError(null);
    } catch (err: any) {
      console.error("Erreur d'inscription Supabase:", err);
      let msg = err.message || "Erreur lors de la création du compte.";
      if (msg.includes("User already registered")) {
        msg = "Cette adresse email est déjà associée à un compte.";
      } else if (msg.includes("Password should be at least")) {
        msg = "Le mot de passe doit contenir au moins 6 caractères.";
      }
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
      });
      if (resetError) {
        throw resetError;
      }
    } catch (err: any) {
      console.error("Erreur de réinitialisation Supabase:", err);
      const msg = err.message || "Impossible d'envoyer l'email de réinitialisation.";
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
      const { data: { session }, error: sessionError } = await withAuthTimeout(
        supabase.auth.getSession(),
      );
      if (sessionError) throw sessionError;
      syncUserFromSession(session);
    } catch (err) {
      console.error("Erreur de déconnexion Supabase:", err);
    }
  };

  const deleteAccount = async () => {
    const msg = "La suppression de compte est temporairement désactivée.";
    setError(msg);
    throw new Error(msg);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        logout,
        deleteAccount,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
