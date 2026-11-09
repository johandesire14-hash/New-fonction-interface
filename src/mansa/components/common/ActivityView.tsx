import React, { useMemo } from "react";
import { Building2, ExternalLink, Package } from "lucide-react";
import { getSavedCompanies, loadDiscoverableCompanies } from "../../utils/companyStorage";
import { EnterpriseSubscription } from "../../types";
import { getArchivedSubscriptions } from "../../utils/subscriptionsStorage";

interface ActivityViewProps {
  userKey: string;
  onOpenCompany?: (company: unknown) => void;
}

export const ActivityView: React.FC<ActivityViewProps> = ({ userKey, onOpenCompany }) => {
  const active = useMemo(() => {
    if (typeof window === "undefined") return [] as EnterpriseSubscription[];
    try {
      const parsed = JSON.parse(
        localStorage.getItem(`mansa_enterprise_subscriptions_${userKey}`) || "[]",
      );
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [userKey]);
  const archived = getArchivedSubscriptions(userKey);
  const ownedCompanyIds = new Set(getSavedCompanies(userKey).map((company) => company.id));
  const companies = [...active, ...archived].filter(
    (item, index, list) =>
      !ownedCompanyIds.has(item.companyId || item.id) &&
      list.findIndex(
        (candidate) => candidate.id === item.id || candidate.companyId === item.companyId,
      ) === index,
  );
  const [publicCompanies, setPublicCompanies] = React.useState<any[]>([]);
  React.useEffect(() => {
    let mounted = true;
    void loadDiscoverableCompanies().then((items) => {
      if (mounted) setPublicCompanies(items);
    });
    return () => {
      mounted = false;
    };
  }, []);
  const publicById = new Map(publicCompanies.map((company) => [company.id, company]));
  const products = companies.flatMap((item) => {
    const purchased = item.purchasedOfferIds || item.unlockedProductIds || [];
    return purchased.map((productId) => ({
      productId,
      companyName: item.companyName,
      productName: item.productName,
    }));
  });

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
          <Building2 className="size-4 text-emerald-400" /> Entreprises rejointes
        </h3>
        {companies.length === 0 ? (
          <p className="text-xs text-zinc-500">Aucune entreprise dans votre activité.</p>
        ) : (
          <div className="space-y-2">
            {companies.map((company) => {
              const publicCompany = publicById.get(company.companyId || company.id);
              return (
                <div
                  key={company.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs"
                >
                  <span className="font-semibold text-zinc-200">{company.companyName}</span>
                  {publicCompany ? (
                    <button
                      type="button"
                      onClick={() => onOpenCompany?.(publicCompany)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 px-2.5 py-1.5 font-semibold text-emerald-300 hover:bg-emerald-400/10"
                    >
                      Ouvrir la page publique <ExternalLink className="size-3" />
                    </button>
                  ) : (
                    <span className="text-right text-zinc-500">
                      Vous n’avez plus accès à cette entreprise.
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
          <Package className="size-4 text-emerald-400" /> Produits achetés
        </h3>
        {products.length === 0 ? (
          <p className="text-xs text-zinc-500">Aucun produit acheté dans votre activité.</p>
        ) : (
          <div className="space-y-2">
            {products.map((product, index) => (
              <div
                key={`${product.productId}-${index}`}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <p className="text-xs font-semibold text-zinc-200">
                  {product.productName || product.productId}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">{product.companyName}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
