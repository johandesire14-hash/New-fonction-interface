import React, { createContext, useContext, useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";
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

  useEffect(() => {
    cleanupLegacyLocalStorage();
    let isMounted = true;

    // Get current session from Supabase
    supabase.auth
      .getSession()
      .then(({ data: { session }, error: sessionError }) => {
        if (!isMounted) return;
        if (sessionError) {
          console.error("Supabase getSession error:", sessionError);
        }
        if (session?.user) {
          const appUser = mapSupabaseUserToAppUser(session.user);
          setUser(appUser);
          setProfile(buildUserProfile(appUser));
        } else {
          setUser(null);
          setProfile(null);
        }
      })
      .catch((err) => {
        console.error("Erreur lors de la récupération de la session Supabase:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Listen to auth changes
    let authListener: { subscription?: { unsubscribe: () => void } } | null = null;
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          const appUser = mapSupabaseUserToAppUser(session.user);
          setUser(appUser);
          setProfile(buildUserProfile(appUser));
        } else {
          setUser(null);
          setProfile(null);
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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.user) {
        const appUser = mapSupabaseUserToAppUser(data.user);
        setUser(appUser);
        setProfile(buildUserProfile(appUser));
      }
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

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            full_name: displayName,
            display_name: displayName,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.user) {
        const appUser = mapSupabaseUserToAppUser(data.user);
        setUser(appUser);
        setProfile(buildUserProfile(appUser));
      }
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
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Erreur de déconnexion Supabase:", err);
    } finally {
      setUser(null);
      setProfile(null);
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
