import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Link2 } from "lucide-react";
import {
  resolvePublicAffiliateCode,
  type PublicAffiliateProduct,
} from "@/mansa/services/affiliateService";
import { CurrencyCode, formatCurrency } from "@/mansa/utils/currency";

export const Route = createFileRoute("/affiliate/$code")({ component: PublicAffiliateLandingPage });

function PublicAffiliateLandingPage() {
  const { code } = Route.useParams();
  const [result, setResult] = useState<PublicAffiliateProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setResult(null);
    setLoading(true);
    setError("");
    resolvePublicAffiliateCode(code)
      .then((resolved) => {
        if (active) setResult(resolved);
      })
      .catch((reason: unknown) => {
        console.error("Affiliate link could not be resolved:", reason);
        if (active) setError("Ce lien ne peut pas être ouvert. Vérifiez l’adresse ou réessayez plus tard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [code]);

  return <AffiliateLandingContent result={result} loading={loading} error={error} />;
}

export function AffiliateLandingContent({
  result,
  loading,
  error,
}: {
  result: PublicAffiliateProduct | null;
  loading: boolean;
  error: string;
}) {
  let price = "";
  if (result) {
    try {
      price = formatCurrency(result.product.pricingAmount, result.product.currency as CurrencyCode);
    } catch {
      price = `${result.product.pricingAmount} ${result.product.currency}`;
    }
  }

  return (
    <main className="min-h-screen bg-[#101116] px-4 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3 text-emerald-300">
          <Link2 className="size-5" />
          <span className="text-sm font-semibold">Lien affilié Mansa</span>
        </div>
        {loading ? (
          <p
            role="status"
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-zinc-300"
          >
            Chargement des informations du produit…
          </p>
        ) : error ? (
          <div
            role="alert"
            className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-6 text-sm leading-relaxed text-amber-100"
          >
            {error}
            <p className="mt-3 text-xs text-amber-200/80">
              Le lien ou le produit n’est peut-être plus disponible. Vérifiez-le auprès de la personne qui vous l’a envoyé.
            </p>
          </div>
        ) : !result ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h1 className="text-xl font-bold">Lien indisponible</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              Ce lien est inconnu, révoqué ou ne pointe plus vers un produit actif avec un programme
              d’affiliation. Il ne peut donc pas être utilisé pour associer un achat à l’affilié.
            </p>
          </div>
        ) : (
          <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#171920]">
            {result.product.coverImage && (
              <img
                src={result.product.coverImage}
                alt=""
                className="max-h-80 w-full object-cover"
              />
            )}
            <div className="p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Produit présenté
              </p>
              <h1 className="mt-2 text-2xl font-bold">{result.product.name}</h1>
              <p className="mt-2 text-sm text-zinc-400">
                {result.product.category}
                {price ? ` · ${price}` : ""}
              </p>
              {result.product.description && (
                <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                  {result.product.description}
                </p>
              )}
              <section
                className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] p-4"
                aria-label="Conditions d’affiliation"
              >
                <h2 className="text-sm font-semibold text-zinc-200">
                  Commission fixée par le créateur
                </h2>
                <p
                  className="mt-1 text-3xl font-bold text-emerald-300"
                  data-testid="public-commission-rate"
                >
                  {result.commissionRate} %
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  Taux enregistré pour ce lien lors de son acceptation. Il ne représente pas une
                  commission gagnée ni garantie.
                </p>
              </section>
              <section
                className="mt-6 space-y-3 text-sm leading-relaxed text-zinc-300"
                aria-label="Consignes de promotion"
              >
                <h2 className="font-semibold text-white">Consignes de promotion</h2>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    Présentez honnêtement le produit, son prix et ses conditions ; n’employez ni
                    spam, ni pratique trompeuse, ni promesse non autorisée.
                  </li>
                  <li>
                    Signalez clairement votre lien affilié à votre audience lorsque la loi ou les
                    règles de la plateforme l’exigent.
                  </li>
                  <li>
                    Le taux indiqué est celui fixé par le créateur et accepté pour ce lien. Toute
                    commission éventuelle dépend des conditions de l’offre et de la confirmation d’un
                    achat.
                  </li>
                </ul>
              </section>
              <div className="mt-6 flex gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-amber-100">
                <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                <div>
                  <h2 className="font-semibold">Renseignements sur l’achat</h2>
                  <p className="mt-1 text-xs leading-relaxed">
                    Pour connaître les modalités d’achat et vérifier la disponibilité du produit,
                    contactez le créateur qui vous a partagé ce lien.
                  </p>
                </div>
              </div>
            </div>
          </article>
        )}
        <p className="mt-6 text-center text-xs text-zinc-600">
          Ce lien identifie l’affilié, mais ne confirme pas un achat.
        </p>
      </div>
    </main>
  );
}
