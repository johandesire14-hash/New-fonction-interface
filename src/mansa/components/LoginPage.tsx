// @ts-nocheck
import React, { useEffect, useState } from "react";
import { ArrowLeft, Mail, Lock, User, AlertCircle, ArrowRight } from "lucide-react";
import { AfhubLogo } from "./AfhubLogo";
import { useAuth } from "../context/AuthContext";
import { getUserFacingErrorMessage } from "../utils/userFacingError";

interface LoginPageProps {
  onLoginSuccess: (userData?: { name: string; email: string; avatarInitials: string }) => void;
  onBackToLanding?: () => void;
  lang: "fr" | "en";
  initialMode?: "login" | "signup";
  initialError?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onBackToLanding,
  lang,
  initialMode = "signup",
  initialError,
}) => {
  const { signInWithEmail, signUpWithEmail, resetPassword, error, clearError } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(initialError || null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialError) setLocalError(initialError);
  }, [initialError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalError("Veuillez remplir tous les champs.");
      return;
    }

    try {
      setLocalError(null);
      setSuccessMessage(null);
      clearError();
      setIsSubmitting(true);

      if (mode === "signup") {
        await signUpWithEmail(email, password, name.trim() || undefined);
      } else {
        await signInWithEmail(email, password);
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error("Auth error:", err);
      const authMessage = typeof err?.message === "string" ? err.message.trim() : "";
      setLocalError(
        authMessage ||
          getUserFacingErrorMessage(err, "Connexion impossible. Vérifiez vos informations et réessayez."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setLocalError("Saisissez votre adresse email pour recevoir un lien de réinitialisation.");
      return;
    }
    try {
      setLocalError(null);
      clearError();
      await resetPassword(email.trim());
      setSuccessMessage("Un lien de réinitialisation a été envoyé à votre adresse email.");
    } catch (err: any) {
      setLocalError(
        getUserFacingErrorMessage(err, "Impossible d’envoyer le lien de réinitialisation. Réessayez."),
      );
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0d0f10] text-[#f2f4f5] flex flex-col items-center justify-center px-4 py-12 selection:bg-[#3ddc84]/30 selection:text-[#3ddc84]">
      {/* Back button */}
      <button
        onClick={onBackToLanding}
        className="absolute top-6 left-6 sm:top-8 sm:left-10 flex items-center gap-2 text-xs font-semibold text-[#9ba3aa] hover:text-[#f2f4f5] transition-colors cursor-pointer"
      >
        <ArrowLeft className="size-4" />
        <span>Retour à l'accueil</span>
      </button>

      <div className="relative z-10 w-full max-w-[420px] space-y-6">
        {/* Mansa Logo & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-3">
            <AfhubLogo size="xl" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#f2f4f5] font-heading">
            {mode === "login" ? "Connexion à Mansa" : "Créer votre compte Mansa"}
          </h1>
          <p className="mt-1 text-xs text-[#9ba3aa]">
            {mode === "login"
              ? "Gérez vos produits digitaux et vos revenus Mobile Money en direct"
              : "Rejoignez la communauté de créateurs et monétisez en quelques clics"}
          </p>
        </div>

        {/* Tab switch between Login & Signup */}
        <div className="flex rounded-xl bg-[#1b1f23] p-1 border border-white/10">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setLocalError(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "login"
                ? "bg-[#3ddc84] text-black font-bold shadow-sm"
                : "text-[#9ba3aa] hover:text-[#f2f4f5]"
            }`}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setLocalError(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "signup"
                ? "bg-[#3ddc84] text-black font-bold shadow-sm"
                : "text-[#9ba3aa] hover:text-[#f2f4f5]"
            }`}
          >
            Créer un compte
          </button>
        </div>

        {/* Login Box */}
        <div className="rounded-2xl border border-white/10 bg-[#15181b] p-6 sm:p-7 shadow-2xl space-y-4">
          {/* Error notice */}
          {(localError || error) && (
            <div role="alert" className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-relaxed">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{localError || error}</span>
            </div>
          )}

          {/* Success notice */}
          {successMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs leading-relaxed">
              <span>{successMessage}</span>
            </div>
          )}

          {/* Email & Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === "signup" && (
              <div>
                <label className="block text-[11px] font-semibold text-[#9ba3aa] uppercase tracking-wider mb-1">
                  Votre nom ou pseudo
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 size-4 text-[#9ba3aa]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Johan Desire"
                    className="w-full rounded-xl border border-white/10 bg-[#1b1f23] pl-10 pr-4 py-2.5 text-xs text-[#f2f4f5] placeholder-[#9ba3aa] focus:border-[#3ddc84] outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-[#9ba3aa] uppercase tracking-wider mb-1">
                Adresse email
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 size-4 text-[#9ba3aa]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full rounded-xl border border-white/10 bg-[#1b1f23] pl-10 pr-4 py-2.5 text-xs text-[#f2f4f5] placeholder-[#9ba3aa] focus:border-[#3ddc84] outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-[#9ba3aa] uppercase tracking-wider">
                  Mot de passe
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-[10px] text-[#9ba3aa] hover:text-[#3ddc84] cursor-pointer"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 size-4 text-[#9ba3aa]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-[#1b1f23] pl-10 pr-4 py-2.5 text-xs text-[#f2f4f5] placeholder-[#9ba3aa] focus:border-[#3ddc84] outline-none transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="ui-btn-primary w-full py-3 text-xs font-bold cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="size-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  <span>Chargement...</span>
                </span>
              ) : (
                <>
                  <span>{mode === "login" ? "Se connecter" : "Créer mon compte Mansa"}</span>
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-[#9ba3aa] leading-relaxed">
          En vous connectant à Mansa, vous acceptez nos{" "}
          <a href="#" className="underline hover:text-[#f2f4f5]">
            Conditions Générales
          </a>{" "}
          et notre{" "}
          <a href="#" className="underline hover:text-[#f2f4f5]">
            Politique de Confidentialité
          </a>
          .
        </div>
      </div>
    </div>
  );
};
