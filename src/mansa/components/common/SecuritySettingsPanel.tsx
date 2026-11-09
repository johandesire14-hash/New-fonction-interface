import React, { useState } from "react";
import { AlertCircle, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { supabase } from "../../services/supabase";

interface SecuritySettingsPanelProps {
  email?: string | null;
}

export const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({ email }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (newPassword.length < 6) {
      return setMessage({
        type: "error",
        text: "Le nouveau mot de passe doit contenir au moins 6 caractères.",
      });
    }
    if (newPassword !== confirmPassword) {
      return setMessage({
        type: "error",
        text: "Les deux nouveaux mots de passe ne correspondent pas.",
      });
    }

    setIsPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Votre mot de passe a été modifié avec succès." });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Une erreur est survenue lors du changement de mot de passe.",
      });
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!email) {
      return setMessage({ type: "error", text: "Aucun compte ou email connecté." });
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
      });
      if (error) throw error;
      setMessage({ type: "success", text: "Le lien de réinitialisation a été envoyé par email." });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Impossible d'envoyer l'email de réinitialisation.",
      });
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {message && (
        <div
          className={`flex items-start gap-2 rounded-xl border p-3 ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Modifier mot de passe */}
      <form
        onSubmit={changePassword}
        className="rounded-xl border border-white/[0.08] bg-[#14161b] p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <LockKeyhole className="size-4 text-emerald-400" />
          <h4 className="font-semibold text-white">Modifier le mot de passe</h4>
        </div>
        <p className="text-[11px] text-zinc-500">
          Choisissez un mot de passe sécurisé d'au moins 6 caractères.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            required
            minLength={6}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nouveau mot de passe"
            className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 text-white outline-none focus:border-emerald-400"
          />
          <input
            required
            minLength={6}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmer le mot de passe"
            className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 text-white outline-none focus:border-emerald-400"
          />
        </div>
        <button
          disabled={isPasswordSaving}
          className="rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-black disabled:opacity-50 cursor-pointer"
        >
          {isPasswordSaving ? "Modification..." : "Enregistrer le nouveau mot de passe"}
        </button>
      </form>

      {/* MFA Info */}
      <div className="rounded-xl border border-white/[0.08] bg-[#14161b] p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-400" />
            <h4 className="font-semibold text-white">Authentification à deux facteurs</h4>
          </div>
          <span className="text-zinc-500 text-[11px]">Bientôt disponible</span>
        </div>
        <p className="text-[11px] text-zinc-500">
          La double authentification (2FA / MFA) sera disponible dans une prochaine mise à jour de la sécurité.
        </p>
      </div>

      {/* Accès sans mot de passe / réinitialisation */}
      <div className="rounded-xl border border-white/[0.08] bg-[#14161b] p-4">
        <h4 className="font-semibold text-white">Réinitialisation par email</h4>
        <p className="mt-1 text-[11px] text-zinc-500">
          Envoyez un lien de réinitialisation sécurisé à {email || "votre adresse email"}.
        </p>
        <button
          type="button"
          onClick={handleSendResetEmail}
          className="mt-3 rounded-lg border border-white/10 px-3 py-2 font-semibold text-zinc-200 hover:bg-white/5 cursor-pointer"
        >
          Envoyer un lien de réinitialisation
        </button>
      </div>
    </div>
  );
};
