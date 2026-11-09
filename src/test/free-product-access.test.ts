import { afterEach, describe, expect, it } from "vitest";
import type { EnterpriseSubscription } from "@/mansa/types";
import { getVisibleIncludedAppNames } from "@/mansa/utils/memberAppAccess";
import {
  getMemberAuthorizedOffers,
  normalizeUnlockedOfferIds,
} from "@/mansa/utils/rightsAccessEngine";
import {
  getSavedSubscriptions,
  saveSubscription,
} from "@/mansa/utils/subscriptionsStorage";

const companyId = "company-free-product-test";
const productId = "offer-free-scalping";
const memberEmail = "free-member@example.test";

afterEach(() => localStorage.clear());

describe("free product access", () => {
  it("keeps a real free product ID and excludes only the generic free membership ID", () => {
    expect(normalizeUnlockedOfferIds({ companyId, productId })).toContain(productId);

    const genericMembershipId = `free-member-${companyId}`;
    expect(normalizeUnlockedOfferIds({ companyId, productId: genericMembershipId })).not.toContain(
      genericMembershipId,
    );
  });

  it("persists access to a free product and its apps without marking it paid", () => {
    const includedApps = ["Telegram", "Discord"];
    const companyName = "Communauté test";
    localStorage.setItem(
      `mansa_creator_offers_${companyId}`,
      JSON.stringify([
        {
          id: productId,
          companyId,
          companyName,
          title: "Accès gratuit au produit",
          pricingType: "free",
          priceAmount: 0,
          priceDisplay: "Gratuit",
          currency: "XOF",
          billingCycle: "one_time",
          includedApps,
        },
      ]),
    );

    const freeProductSubscription: EnterpriseSubscription = {
      id: `sub-${companyId}-${memberEmail}`,
      companyId,
      companyName,
      productName: "Accès gratuit au produit",
      productId,
      priceDisplay: "Gratuit",
      status: "active",
      subscribedAt: new Date().toISOString(),
      includedApps: ["dashboard", "support", ...includedApps],
      unlockedProductIds: [productId],
      purchasedOfferIds: [productId],
      hasPaidOffer: false,
      telegramChannels: [],
      hasJoined: true,
    };

    saveSubscription(memberEmail, freeProductSubscription);

    const savedSubscription = getSavedSubscriptions(memberEmail)[0];
    if (!savedSubscription) throw new Error("The free product subscription was not saved.");
    expect(savedSubscription.unlockedProductIds).toContain(productId);
    expect(savedSubscription.purchasedOfferIds).toContain(productId);
    expect(savedSubscription.hasPaidOffer).toBe(false);

    const memberOwnedOffers = getMemberAuthorizedOffers(
      companyId,
      savedSubscription.unlockedProductIds || [],
    );
    expect(
      getVisibleIncludedAppNames({ isCompanyOwner: false, memberOwnedOffers }),
    ).toEqual(["telegram", "discord"]);
  });
});
