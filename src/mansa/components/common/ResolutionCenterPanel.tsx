import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  LifeBuoy,
  Loader2,
  Send,
} from "lucide-react";
import { addDoc, collection, db, getDocs, query, where } from "../../services/firebase";

interface Props {
  userId: string;
  customerName?: string;
  customerEmail?: string;
}

interface Request {
  id: string;
  reference: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  type: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "waiting" | "resolved";
  createdAt: string;
  companyName?: string;
  offerName?: string;
  transactionId?: string;
  providerReference?: string;
  receiptId?: string;
  amount?: string;
  currency?: string;
  country?: string;
  paymentProvider?: string;
  reportedPaymentStatus?: string;
  paymentDate?: string;
  localOnly?: boolean;
}

const REQUEST_TYPES = [
  { value: "payment_issue", label: "Problème de paiement" },
  { value: "access_issue", label: "Accès à une offre non reçu" },
  { value: "refund_request", label: "Demande de remboursement" },
  { value: "creator_issue", label: "Problème avec une entreprise" },
  { value: "other", label: "Autre" },
];

const PAYMENT_STATUSES = [
  { value: "unknown", label: "Je ne sais pas" },
  { value: "paid", label: "Le paiement semble confirmé" },
  { value: "pending", label: "En attente" },
  { value: "failed", label: "Refusé ou échoué" },
  { value: "refunded", label: "Remboursé" },
];

const STATUS_LABELS: Record<Request["status"], string> = {
  open: "Nouveau",
  in_progress: "En cours",
  waiting: "En attente",
  resolved: "Résolu",
};

const readLocalRequests = (userId: string): Request[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(`mansa_resolution_${userId}`) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const saveLocalRequests = (userId: string, requests: Request[]) => {
  try {
    localStorage.setItem(`mansa_resolution_${userId}`, JSON.stringify(requests));
  } catch (error) {
    console.warn("Local resolution request cache could not be saved", error);
  }
};

export const ResolutionCenterPanel: React.FC<Props> = ({
  userId,
  customerName = "",
  customerEmail = "",
}) => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [type, setType] = useState("payment_issue");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("XOF");
  const [paymentProvider, setPaymentProvider] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    const localRequests = readLocalRequests(userId);
    setRequests(localRequests);
    setIsLoading(true);
    setLoadError(false);

    (async () => {
      try {
        if (db) {
          const snap = await getDocs(
            query(collection(db, "resolutionRequests"), where("userId", "==", userId)),
          );
          const remote: Request[] = [];
          snap.forEach((item) => {
            const data = item.data() as Omit<Request, "id">;
            remote.push({ ...data, id: item.id, localOnly: false });
          });
          const knownReferences = new Set(remote.map((request) => request.reference || request.id));
          const localOnlyRequests = localRequests.filter(
            (request) => request.localOnly && !knownReferences.has(request.reference || request.id),
          );
          const combined = [...remote, ...localOnlyRequests].sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
          );
          if (active) setRequests(combined);
        }
      } catch (error) {
        console.warn("Resolution requests could not be loaded", error);
        if (active) setLoadError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    setSubmitError(null);
    if (!subject.trim() || !description.trim()) {
      setSubmitError("Le sujet et la description sont obligatoires.");
      return;
    }

    setIsSubmitting(true);
    const createdAt = new Date().toISOString();
    const reference = `DOS-${createdAt.slice(0, 10).replaceAll("-", "")}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
    const payload = {
      reference,
      userId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      type,
      subject: subject.trim(),
      description: description.trim(),
      status: "open" as const,
      createdAt,
      companyName: "",
      offerName: "",
      transactionId: transactionId.trim(),
      providerReference: "",
      receiptId: "",
      amount: amount.trim(),
      currency: currency.trim().toUpperCase(),
      country: "",
      paymentProvider: paymentProvider.trim(),
      reportedPaymentStatus: "unknown",
      paymentDate: "",
      paymentInformationSource: "user_reported" as const,
    };

    try {
      let savedRequest: Request;
      let successMessage: string;

      if (db) {
        const ref = await addDoc(collection(db, "resolutionRequests"), payload);
        savedRequest = { ...payload, id: ref.id, localOnly: false };
        try {
          await addDoc(collection(db, "auditLogs"), {
            actorId: userId,
            action: "resolution_created",
            targetId: ref.id,
            createdAt,
          });
        } catch (auditError) {
          console.warn("Resolution request saved but audit log could not be written", auditError);
        }
        successMessage = `Dossier ${reference} transmis à l’équipe de support.`;
      } else {
        savedRequest = { ...payload, id: reference, localOnly: true };
        successMessage = `Dossier ${reference} conservé sur cet appareil uniquement. Il n’a pas été transmis à l’équipe.`;
      }

      const nextRequests = [savedRequest, ...requests];
      setRequests(nextRequests);
      saveLocalRequests(userId, nextRequests);
      setSubject("");
      setDescription("");
      setTransactionId("");
      setAmount("");
      setPaymentProvider("");
      setCurrency("XOF");
      setFeedback(successMessage);
    } catch (error) {
      console.error("Resolution request could not be submitted", error);
      setSubmitError(
        "La demande n’a pas pu être transmise. Vérifiez votre connexion puis réessayez.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPaymentStatus = (status?: string) =>
    PAYMENT_STATUSES.find((option) => option.value === status)?.label || "Non précisé";

  return (
    <div className="space-y-4 text-xs">
      <section className="rounded-xl border border-white/[0.08] bg-[#14161b] p-5">
        <div className="flex items-start gap-3">
          <LifeBuoy className="mt-0.5 size-6 shrink-0 text-sky-400" />
          <div>
            <h4 className="font-bold text-white">Centre de résolution</h4>
            <p className="mt-1 text-[11px] text-zinc-400">
              Signalez un problème de paiement, d’accès, de livraison ou demandez l’examen d’un
              remboursement. Les informations de paiement que vous saisissez seront à vérifier par
              l’équipe.
            </p>
          </div>
        </div>
      </section>

      <form
        onSubmit={submit}
        className="space-y-3 rounded-xl border border-white/[0.08] bg-[#14161b] p-4"
      >
        <h4 className="font-semibold text-white">Ouvrir un dossier</h4>
        <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-[11px] text-zinc-400">
          <span className="font-semibold text-zinc-300">Compte concerné :</span>{" "}
          {customerName || "Nom non renseigné"} · {customerEmail || "Adresse e-mail non renseignée"}
        </div>

        <label className="sr-only" htmlFor="resolution-type">
          Type de problème
        </label>
        <select
          id="resolution-type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 text-white"
        >
          {REQUEST_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="resolution-subject">
          Sujet du dossier
        </label>
        <input
          id="resolution-subject"
          required
          maxLength={120}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Sujet de la demande"
          className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 text-white outline-none focus:border-sky-400"
        />
        <label className="sr-only" htmlFor="resolution-description">
          Description du problème
        </label>
        <textarea
          id="resolution-description"
          required
          maxLength={3000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Expliquez le problème et les étapes déjà essayées. Ne saisissez pas de numéro complet de carte ni de code de sécurité."
          rows={4}
          className="w-full resize-y rounded-lg border border-white/10 bg-[#101114] p-2.5 text-white outline-none focus:border-sky-400"
        />

        <details>
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-white/10 bg-black/10 p-3 font-semibold text-zinc-200">
            <FileText className="size-4 text-sky-400" />
            Ajouter les références utiles (facultatif)
          </summary>
          <div className="mt-3 space-y-3 rounded-lg border border-white/[0.06] p-3">
            <p className="text-[11px] leading-relaxed text-amber-200/80">
              Ces éléments sont déclarés par vous et ne confirment pas à eux seuls qu’un paiement a
              été validé. Ils aideront l’équipe à retrouver et vérifier la transaction.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Référence (transaction, reçu ou commande)"
                icon={<CreditCard className="size-3.5" />}
                value={transactionId}
                onChange={setTransactionId}
                placeholder="Identifiant figurant sur le reçu ou la commande"
              />
              <Field
                label="Prestataire de paiement"
                icon={<CreditCard className="size-3.5" />}
                value={paymentProvider}
                onChange={setPaymentProvider}
                placeholder="Wave, Orange Money, carte…"
              />
              <Field
                label="Montant indiqué"
                icon={<Banknote className="size-3.5" />}
                value={amount}
                onChange={setAmount}
                placeholder="Ex. 25 000"
              />
              <Field
                label="Devise"
                icon={<Banknote className="size-3.5" />}
                value={currency}
                onChange={setCurrency}
                placeholder="XOF"
              />
            </div>
          </div>
        </details>

        {loadError && (
          <p role="status" className="text-[11px] text-amber-300">
            Impossible de charger vos dossiers enregistrés. Vous pouvez réessayer plus tard.
          </p>
        )}
        {feedback && (
          <p
            role="status"
            className={`text-[11px] ${feedback.includes("uniquement") ? "text-amber-300" : "text-emerald-300"}`}
          >
            {feedback}
          </p>
        )}
        {submitError && (
          <p role="alert" className="text-[11px] text-rose-300">
            {submitError}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 font-semibold text-black disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {isSubmitting ? "Envoi…" : "Envoyer le dossier"}
        </button>
      </form>

      <section className="rounded-xl border border-white/[0.08] bg-[#14161b] p-4">
        <h4 className="font-semibold text-white">Mes dossiers</h4>
        {isLoading ? (
          <div className="mt-3 flex items-center gap-2 text-zinc-400">
            <Loader2 className="size-4 animate-spin" /> Chargement…
          </div>
        ) : requests.length === 0 ? (
          <p className="mt-3 text-[11px] text-zinc-500">Aucun dossier pour le moment.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {requests.map((request) => (
              <article
                key={request.id}
                className="rounded-lg border border-white/10 bg-black/10 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{request.subject}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-500">
                      {request.reference || request.id}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-300">
                    {request.status === "resolved" ? (
                      <CheckCircle2 className="size-3" />
                    ) : (
                      <Clock3 className="size-3" />
                    )}
                    {STATUS_LABELS[request.status] || "Nouveau"}
                  </span>
                </div>
                {request.localOnly && (
                  <p className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-300">
                    <AlertCircle className="mt-0.5 size-3 shrink-0" /> Enregistré sur cet appareil,
                    non transmis à l’équipe.
                  </p>
                )}
                <p className="mt-2 whitespace-pre-wrap text-[11px] text-zinc-400">
                  {request.description}
                </p>
                {(request.transactionId ||
                  request.providerReference ||
                  request.receiptId ||
                  request.companyName ||
                  request.offerName) && (
                  <dl className="mt-3 grid gap-1 border-t border-white/[0.06] pt-2 text-[10px] sm:grid-cols-2">
                    {request.companyName && <Info label="Entreprise" value={request.companyName} />}
                    {request.offerName && <Info label="Offre" value={request.offerName} />}
                    {request.transactionId && (
                      <Info label="Référence communiquée" value={request.transactionId} />
                    )}
                    {request.providerReference && (
                      <Info
                        label="Référence prestataire (déclarée)"
                        value={request.providerReference}
                      />
                    )}
                    {request.receiptId && (
                      <Info label="Reçu / commande" value={request.receiptId} />
                    )}
                    {request.paymentProvider && (
                      <Info label="Prestataire" value={request.paymentProvider} />
                    )}
                    {request.amount && (
                      <Info
                        label="Montant déclaré"
                        value={`${request.amount} ${request.currency || ""}`.trim()}
                      />
                    )}
                    {request.country && <Info label="Pays déclaré" value={request.country} />}
                    {request.reportedPaymentStatus && (
                      <Info
                        label="Statut annoncé par vous"
                        value={formatPaymentStatus(request.reportedPaymentStatus)}
                      />
                    )}
                    {request.paymentDate && (
                      <Info label="Date indiquée" value={request.paymentDate.replace("T", " ")} />
                    )}
                  </dl>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

interface FieldProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const Field: React.FC<FieldProps> = ({ label, icon, value, onChange, placeholder }) => {
  const id = `resolution-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="space-y-1">
      <label
        className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300"
        htmlFor={id}
      >
        {icon}
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={160}
        className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 text-white outline-none focus:border-sky-400"
      />
    </div>
  );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-zinc-500">{label}</dt>
    <dd className="break-words text-zinc-300">{value}</dd>
  </div>
);
