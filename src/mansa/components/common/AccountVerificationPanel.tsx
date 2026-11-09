import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, FileCheck2, Loader2 } from "lucide-react";
import { addDoc, collection, db, getDoc, doc, setDoc } from "../../services/firebase";
import { getUserProfile, updateUserProfile } from "../../services/dbService";
import { getUserFacingErrorMessage } from "../../utils/userFacingError";

interface Props { userId: string; }
type Status = "not_required" | "pending" | "verified" | "rejected";

const statusCopy: Record<Status, { label: string; description: string }> = {
  not_required: { label: "À compléter", description: "Aucune demande de vérification n’a encore été envoyée." },
  pending: { label: "En attente", description: "Votre demande est enregistrée et attend l’examen de l’équipe." },
  verified: { label: "Vérifié", description: "Votre identité a été validée." },
  rejected: { label: "À corriger", description: "La demande a été refusée. Vérifiez les informations et renvoyez-la." },
};

export const AccountVerificationPanel: React.FC<Props> = ({ userId }) => {
  const [status, setStatus] = useState<Status>("not_required");
  const [documentType, setDocumentType] = useState("cni");
  const [documentNumber, setDocumentNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const profile = await getUserProfile(userId);
        if (!active || !profile) return;
        setStatus((profile as any).kycStatus || "not_required");
        setDocumentType((profile as any).kycDocumentType || "cni");
        setDocumentNumber((profile as any).kycDocumentNumber || "");
        setNotes((profile as any).kycNotes || "");
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    if (!documentNumber.trim()) return setFeedback("Le numéro du document est obligatoire.");
    setIsSaving(true);
    const now = new Date().toISOString();
    try {
      const payload = { userId, status: "pending", documentType, documentNumber: documentNumber.trim(), notes: notes.trim(), submittedAt: now };
      if (db) {
        await setDoc(doc(db, "kycSubmissions", userId), payload, { merge: true });
        await addDoc(collection(db, "auditLogs"), { actorId: userId, action: "kyc_submitted", targetId: userId, createdAt: now });
      }
      await updateUserProfile(userId, { kycStatus: "pending", kycDocumentType: documentType, kycDocumentNumber: documentNumber.trim(), kycNotes: notes.trim(), kycSubmittedAt: now } as any);
      localStorage.setItem(`mansa_kyc_${userId}`, JSON.stringify({ ...payload }));
      setStatus("pending");
      setFeedback("Votre demande de vérification a été envoyée.");
    } catch (error: any) {
      console.error("Account verification submission failed:", error);
      setFeedback(getUserFacingErrorMessage(error, "Impossible d’enregistrer la demande. Réessayez."));
    } finally {
      setIsSaving(false);
    }
  };

  const current = statusCopy[status];
  if (isLoading) return <div className="flex items-center gap-2 text-xs text-zinc-400"><Loader2 className="size-4 animate-spin" /> Chargement du statut...</div>;

  return <div className="space-y-3 text-xs">
    <div className="rounded-xl border border-white/[0.08] bg-[#14161b] p-4">
      <div className="flex items-start gap-3">
        {status === "verified" ? <CheckCircle2 className="mt-0.5 size-5 text-emerald-400" /> : status === "pending" ? <Clock3 className="mt-0.5 size-5 text-amber-400" /> : status === "rejected" ? <AlertCircle className="mt-0.5 size-5 text-rose-400" /> : <FileCheck2 className="mt-0.5 size-5 text-sky-400" />}
        <div><span className="font-semibold text-white block">Statut du compte : {current.label}</span><span className="text-[11px] text-zinc-400">{current.description}</span></div>
      </div>
    </div>
    {status !== "verified" && <form onSubmit={submit} className="rounded-xl border border-white/[0.08] bg-[#14161b] p-4 space-y-3">
      <h4 className="font-semibold text-white">Demander la vérification</h4>
      <p className="text-[11px] text-zinc-500">Cette demande enregistre les informations de votre pièce pour qu’une personne autorisée puisse les examiner. Ne transmettez pas de document par un canal non sécurisé.</p>
      <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 text-white"><option value="cni">Carte nationale d’identité</option><option value="passport">Passeport</option><option value="business_reg">Registre de commerce</option></select>
      <input required value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="Numéro du document" className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 font-mono text-white outline-none focus:border-emerald-400" />
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informations complémentaires (facultatif)" rows={3} className="w-full resize-none rounded-lg border border-white/10 bg-[#101114] p-2.5 text-white outline-none focus:border-emerald-400" />
      {feedback && <p className="text-[11px] text-emerald-300">{feedback}</p>}
      <button disabled={isSaving} className="rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-black disabled:opacity-50">{isSaving ? "Envoi..." : "Envoyer la demande"}</button>
    </form>}
    {status === "verified" && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-[11px] text-emerald-300">Votre statut est confirmé par les données du compte. Les documents complets ne doivent être accessibles qu’aux personnes autorisées.</div>}
  </div>;
};
