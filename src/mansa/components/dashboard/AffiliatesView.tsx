import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  CheckCircle2,
  Clock3,
  ExternalLink,
  History,
  Link2,
  RefreshCw,
  Share2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  AffiliateLink,
  AffiliateProduct,
  createOrGetAffiliateLink,
  getAffiliateEligibleProducts,
  getAffiliateLinksForUser,
} from "../../services/affiliateService";
import {
  AffiliateInvitation,
  getAffiliateInvitationHistory,
} from "../../services/affiliateHistoryService";
import { CurrencyCode, formatCurrency } from "../../utils/currency";
import { siteUrl } from "@/lib/site";
import { getUserFacingErrorMessage } from "../../utils/userFacingError";

interface AffiliatesViewProps {
  lang?: "fr" | "en";
  /** Retained for caller compatibility only. Display names are never used in affiliate links. */
  userRefName?: string;
  userId?: string;
  isPersonalWorkspace?: boolean;
  currency?: CurrencyCode | string;
}

const percentLabel = (rate: number) => `${String(rate)} %`;
const publicAffiliateUrl = (code: string) => siteUrl(`/affiliate/${encodeURIComponent(code)}`);

const maskEmail = (email: string) => {
  if (!email || !email.includes("@")) return email || "E-mail non communiqué";
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}${local.length > 2 ? "•••" : ""}@${domain}`;
};

const invitationDate = (value: unknown) => {
  if (!value) return "Date non disponible";
  const date =
    typeof value === "object" && value !== null && "toDate" in value
      ? (value as { toDate: () => Date }).toDate()
      : new Date(String(value));
  return Number.isNaN(date.getTime())
    ? "Date non disponible"
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
};

const formatProductPrice = (amount: number, currency: string) => {
  try {
    return formatCurrency(amount, currency as CurrencyCode);
  } catch {
    return `${amount} ${currency}`;
  }
};

export const AffiliatesView: React.FC<AffiliatesViewProps> = ({ currency = "XOF" }) => {
  const { user } = useAuth();
  const affiliateUid = user?.uid || "";
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<AffiliateProduct | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdLink, setCreatedLink] = useState<AffiliateLink | null>(null);
  const [copiedUrl, setCopiedUrl] = useState("");
  const [copyError, setCopyError] = useState("");
  const [invitations, setInvitations] = useState<AffiliateInvitation[]>([]);
  const [showInvitationHistory, setShowInvitationHistory] = useState(false);
  const activeCurrency = (currency as CurrencyCode) || "XOF";

  const refresh = useCallback(
    async (showRefresh = false) => {
      if (!affiliateUid) {
        setProducts([]);
        setLinks([]);
        setInvitations([]);
        setLoading(false);
        return;
      }
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setLoadError("");
      try {
        const [eligibleProducts, ownLinks, invitationHistory] = await Promise.all([
          getAffiliateEligibleProducts(affiliateUid),
          getAffiliateLinksForUser(affiliateUid),
          getAffiliateInvitationHistory(affiliateUid).catch(() => []),
        ]);
        setProducts(eligibleProducts);
        setLinks(ownLinks);
        setInvitations(invitationHistory);
      } catch (error) {
        console.error("Affiliate programs load failed:", error);
        setLoadError(getUserFacingErrorMessage(error, "Impossible de charger les programmes affiliés. Réessayez."));
        setProducts([]);
        setLinks([]);
        setInvitations([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [affiliateUid],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const productLinks = useMemo(() => new Map(links.map((link) => [link.productId, link])), [links]);

  const beginPromotion = (product: AffiliateProduct) => {
    setSelectedProduct(product);
    setAccepted(false);
    setCreateError("");
    setCreatedLink(null);
  };

  const cancelConditions = () => {
    setSelectedProduct(null);
    setAccepted(false);
    setCreateError("");
  };

  const acceptAndCreateLink = async () => {
    if (!affiliateUid || !selectedProduct || !accepted || creating) return;
    setCreating(true);
    setCreateError("");
    try {
      const link = await createOrGetAffiliateLink(affiliateUid, selectedProduct);
      setCreatedLink(link);
      setLinks((existing) => [link, ...existing.filter((item) => item.id !== link.id)]);
    } catch (error) {
      console.error("Affiliate link creation failed:", error);
      setCreateError(getUserFacingErrorMessage(error, "Le lien n’a pas pu être créé. Réessayez."));
    } finally {
      setCreating(false);
    }
  };

  const copyUrl = async (url: string) => {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      window.setTimeout(() => setCopiedUrl(""), 1800);
    } catch (error) {
      setCopiedUrl("");
      console.error("Affiliate link copy failed:", error);
      setCopyError("Copie impossible. Copiez le lien manuellement.");
    }
  };

  const shareUrl = async (link: AffiliateLink) => {
    const url = publicAffiliateUrl(link.code);
    if (navigator.share) {
      try {
        await navigator.share({ title: link.productName, text: `Découvre ${link.productName}`, url });
        return;
      } catch {
        // L’utilisateur peut avoir annulé le partage : on ne montre pas d’erreur.
        return;
      }
    }
    await copyUrl(url);
  };

  if (selectedProduct) {
    return (
      <main
        className="min-h-screen pb-16 text-white"
        aria-label="Conditions du programme d’affiliation"
      >
        <button
          type="button"
          onClick={cancelConditions}
          className="mb-5 inline-flex items-center gap-2 rounded-lg px-1 py-2 text-sm text-zinc-300 hover:text-white"
        >
          <ArrowLeft className="size-4" /> Retour aux produits
        </button>
        <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#15171d] p-5 sm:p-8">
          <div className="mb-5 flex items-start gap-3">
            {selectedProduct.coverImage ? (
              <img
                src={selectedProduct.coverImage}
                alt=""
                className="size-16 rounded-xl object-cover"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                <Link2 className="size-7" />
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Conditions avant création du lien
              </p>
              <h1 className="mt-1 text-xl font-bold">{selectedProduct.name}</h1>
              <p className="mt-1 text-sm text-zinc-400">{selectedProduct.category}</p>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] p-4">
            <p className="text-sm text-zinc-300">Taux exact fixé par le créateur pour ce produit</p>
            <p className="mt-1 text-3xl font-bold text-emerald-300" data-testid="accepted-rate">
              {percentLabel(selectedProduct.affiliateCommissionRate)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              Ce taux est celui proposé par le créateur. Il ne représente pas une commission gagnée
              ou garantie.
            </p>
          </div>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-zinc-300">
            <h2 className="font-semibold text-white">Règles d’utilisation et d’attribution</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Utilisez le lien généré pour présenter ce produit et ne modifiez pas son code
                d’attribution.
              </li>
              <li>
                Présentez honnêtement le produit, son prix et ses conditions ; n’employez pas de
                pratiques trompeuses, de spam ou de promesses non autorisées.
              </li>
              <li>
                Indiquez clairement à votre audience que vous partagez un lien affilié lorsque la
                loi ou les règles de la plateforme l’exigent.
              </li>
              <li>
                Le lien associe les recommandations à votre compte et à ce produit. Le taux ci-dessus
                est celui fixé par le créateur.
              </li>
            </ul>
            <div className="flex gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-amber-100">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" />
              <p className="text-xs leading-relaxed">
                Le lien identifie l’affilié, mais ne confirme pas une vente. Les ventes et commissions
                associées ne sont pas suivies pour le moment.
              </p>
            </div>
          </div>
          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-0.5 size-4 accent-emerald-500"
            />
            <span>
              J’ai lu et j’accepte les conditions d’utilisation et d’attribution ci-dessus pour
              promouvoir « {selectedProduct.name} » au taux exact de{" "}
              {percentLabel(selectedProduct.affiliateCommissionRate)}.
            </span>
          </label>
          {createError && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200"
            >
              {createError}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void acceptAndCreateLink()}
              disabled={!accepted || creating}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {creating ? "Création du lien…" : "J’accepte les conditions et génère mon lien"}
            </button>
            <button
              type="button"
              onClick={cancelConditions}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm text-zinc-300 hover:bg-white/5"
            >
              Annuler
            </button>
          </div>
          {createdLink && (
            <div
              className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4"
              role="status"
            >
              <div className="flex items-center gap-2 font-semibold text-emerald-200">
                <ShieldCheck className="size-5" /> Lien affilié créé
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                Votre lien est associé à votre compte et au produit sélectionné. Vous pouvez le
                copier et le partager avec votre audience.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  readOnly
                  value={publicAffiliateUrl(createdLink.code)}
                  aria-label="Votre lien affilié"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-zinc-200"
                />
                <button
                  type="button"
                  onClick={() => void copyUrl(publicAffiliateUrl(createdLink.code))}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  {copiedUrl === publicAffiliateUrl(createdLink.code) ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copiedUrl === publicAffiliateUrl(createdLink.code) ? "Copié" : "Copier"}
                </button>
                <a
                  href={publicAffiliateUrl(createdLink.code)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-200"
                >
                  <ExternalLink className="size-4" /> Voir la page publique
                </a>
              </div>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-16 text-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Affiliés</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Découvrez les produits actifs dont le créateur a activé un taux d’affiliation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowInvitationHistory(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/10"
          >
            <History className="size-3.5" /> Historique des invitations
          </button>
          <button
            type="button"
            onClick={() => void refresh(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} /> Actualiser
          </button>
        </div>
      </div>
      {!affiliateUid && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100"
        >
          Connectez-vous à votre compte pour consulter et créer des liens affiliés.
        </p>
      )}
      {loadError && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100"
        >
          {loadError}
        </p>
      )}
      <section className="mt-6" aria-labelledby="affiliate-products-heading">
        <h2 id="affiliate-products-heading" className="mb-3 text-base font-bold">
          Produits disponibles
        </h2>
        {loading ? (
          <p
            role="status"
            className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400"
          >
            Chargement des produits…
          </p>
        ) : !loadError && products.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-relaxed text-zinc-400">
            Aucun produit actif avec un programme d’affiliation n’est disponible. Les produits dont
            le taux est nul, absent ou négatif, ainsi que vos propres produits, ne sont pas proposés.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {products.map((product) => {
              const existingLink = productLinks.get(product.id);
              return (
                <article
                  key={product.id}
                  className="flex gap-4 rounded-xl border border-white/10 bg-[#15171d] p-4"
                >
                  {product.coverImage ? (
                    <img
                      src={product.coverImage}
                      alt=""
                      className="size-16 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-500">
                      <Link2 className="size-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-white">{product.name}</h3>
                        <p className="text-xs text-zinc-500">{product.category}</p>
                      </div>
                      <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
                        {percentLabel(product.affiliateCommissionRate)}
                      </span>
                    </div>
                    {product.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                        {product.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-zinc-400">
                        {formatProductPrice(
                          product.pricingAmount,
                          activeCurrency === "XOF" ? product.currency : activeCurrency,
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => beginPromotion(product)}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                      >
                        {existingLink ? "Conditions et lien existant" : "Promouvoir ce produit"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <section className="mt-9" aria-labelledby="affiliate-links-heading">
        <h2 id="affiliate-links-heading" className="mb-1 text-base font-bold">
          Mes liens affiliés
        </h2>
        <p className="mb-3 text-xs leading-relaxed text-zinc-400">
          Vos liens sont associés à votre compte. Les vues, ventes et commissions ne sont pas suivies
          pour le moment.
        </p>
        {copyError && (
          <p
            role="alert"
            className="mb-3 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200"
          >
            {copyError}
          </p>
        )}
        {links.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-500">
            Aucun lien créé.
          </p>
        ) : (
          <div className="space-y-2">
            {links.map((link) => {
              const url = publicAffiliateUrl(link.code);
              return (
                <div
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#15171d] p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{link.productName}</p>
                    <p className="mt-1 font-mono text-xs text-zinc-400">{url}</p>
                    <p className="mt-1 text-xs text-emerald-300">
                      Taux accepté : {percentLabel(link.commissionRate)} · aucune commission
                      enregistrée pour le moment
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copyUrl(url)}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-200 hover:bg-white/5"
                    >
                      {copiedUrl === url ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      {copiedUrl === url ? "Copié" : "Copier le lien"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void shareUrl(link)}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      <Share2 className="size-3.5" /> Partager
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      {showInvitationHistory && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="affiliate-invitation-history-title"
        >
          <section className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#15171d] shadow-2xl sm:rounded-2xl">
            <header className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <History className="size-5" />
                </div>
                <div>
                  <h2 id="affiliate-invitation-history-title" className="font-bold text-white">
                    Historique des invitations
                  </h2>
                  <p className="text-xs text-zinc-500">Inscriptions et achats associés à vos liens</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInvitationHistory(false)}
                aria-label="Fermer l’historique"
                className="flex size-9 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {invitations.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center text-center">
                  <div className="flex size-14 items-center justify-center rounded-full bg-white/[0.04] text-zinc-500">
                    <Users className="size-7" />
                  </div>
                  <h3 className="mt-4 font-semibold text-zinc-200">Aucun historique d’invitation</h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
                    Le suivi des inscriptions et des achats associés à vos liens n’est pas encore
                    disponible.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invitations.map((invitation) => {
                    const statusLabel =
                      invitation.status === "converted"
                        ? "Achat confirmé"
                        : invitation.status === "pending"
                          ? "En attente"
                          : invitation.status === "cancelled"
                            ? "Annulée"
                            : "Inscription";
                    const StatusIcon = invitation.status === "converted" ? CheckCircle2 : Clock3;
                    return (
                      <article
                        key={invitation.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full mansa-profile-avatar text-xs font-bold">
                            {invitation.inviteeName.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{invitation.inviteeName}</p>
                            <p className="truncate text-xs text-zinc-500">{maskEmail(invitation.inviteeEmail)}</p>
                            <p className="mt-1 text-xs text-zinc-400">{invitation.productName}</p>
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 font-semibold text-emerald-200">
                            <StatusIcon className="size-3" /> {statusLabel}
                          </span>
                          <p className="mt-1 text-zinc-500">{invitationDate(invitation.createdAt)}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
};
