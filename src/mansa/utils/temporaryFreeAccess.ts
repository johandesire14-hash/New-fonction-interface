/**
 * TEMPORARY GLOBAL FREE ACCESS
 * Keep true only while the platform is intentionally open to signed-in customers.
 * See docs/temporary-free-access-removal.md before disabling or removing this mode.
 */
import type { CreatorPlatformOffer } from "../types";

export const TEMPORARY_FREE_ACCESS_ENABLED = false;

export function prepareTemporaryFreeCheckoutOffer(
  offer: CreatorPlatformOffer,
  canManageCompany: boolean,
  temporaryFreeAccessEnabled = TEMPORARY_FREE_ACCESS_ENABLED,
): CreatorPlatformOffer {
  if (!temporaryFreeAccessEnabled || canManageCompany || offer.pricingType === "free") {
    return offer;
  }

  return {
    ...offer,
    pricingType: "free",
    priceAmount: 0,
    priceDisplay: "Gratuit",
    pricingOptions: [
      {
        id: "temporary-free-access",
        name: "Accès gratuit",
        price: 0,
        billing: "gratuit",
      },
    ],
  };
}
