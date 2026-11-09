export interface IncludedAppOffer {
  includedApps?: string[];
}

/**
 * Derive the apps visible in a company workspace.
 * Members receive apps only from offers they own; stale or aggregated
 * subscription-level app lists are deliberately ignored for non-owners.
 */
export function getVisibleIncludedAppNames(params: {
  isCompanyOwner: boolean;
  subscriptionIncludedApps?: string[];
  companyOffers?: IncludedAppOffer[];
  memberOwnedOffers?: IncludedAppOffer[];
}): string[] {
  const {
    isCompanyOwner,
    subscriptionIncludedApps = [],
    companyOffers = [],
    memberOwnedOffers = [],
  } = params;

  const includedApps = isCompanyOwner
    ? [...subscriptionIncludedApps, ...companyOffers.flatMap((offer) => offer.includedApps || [])]
    : memberOwnedOffers.flatMap((offer) => offer.includedApps || []);

  return Array.from(
    new Set(includedApps.map((app) => app.trim().toLowerCase()).filter(Boolean)),
  );
}
