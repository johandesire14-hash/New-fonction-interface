import { describe, expect, it } from "vitest";
import type { Company, CreatorPlatformOffer } from "@/mansa/types";
import { buildMemberAccessSnapshot } from "@/mansa/services/supabaseMemberAccessService";

const community: Company = {
  id: "community-1",
  ownerUid: "creator-1",
  name: "Communauté World Kultur",
  description: "Espace membre",
  primaryCurrency: "XOF",
  acceptedPayments: [],
  logoInitials: "WK",
  colorGradient: "from-emerald-600 to-black",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const freeOffer: CreatorPlatformOffer = {
  id: "offer-free-1",
  title: "Formation gratuite",
  companyId: community.id,
  companyName: community.name,
  category: "community",
  type: "course",
  priceDisplay: "Gratuit",
  priceAmount: 0,
  currency: "XOF",
  pricingType: "free",
  billingCycle: "one_time",
  includedApps: ["Cours & formations", "Fichiers"],
  courses: [
    {
      id: "course-1",
      title: "Cours retrouvé après reload",
      chapters: [{ id: "chapter-1", title: "Chapitre 1", content: "Contenu" }],
    },
  ],
  ebooks: [
    {
      id: "file-1",
      title: "Fichier retrouvé après reload",
      name: "fichier.pdf",
      downloadUrl: "https://example.test/fichier.pdf",
    },
  ],
};

describe("member access rehydration", () => {
  it("reconstruit communauté, offre, cours et fichiers depuis les lignes Supabase avec mémoire vide", () => {
    const snapshot = buildMemberAccessSnapshot({
      communities: [community],
      offersByCommunity: { [community.id]: [freeOffer] },
      entitlements: [
        {
          offer_id: freeOffer.id,
          status: "free",
          expires_at: null,
        },
      ],
    });

    expect(snapshot.communities).toHaveLength(1);
    expect(snapshot.subscriptions).toHaveLength(1);
    const subscription = snapshot.subscriptions[0];
    if (!subscription) throw new Error("La souscription membre n’a pas été reconstruite.");
    expect(snapshot.unlockedOfferIds).toEqual([freeOffer.id]);
    expect(subscription.companyId).toBe(community.id);
    expect(subscription.unlockedProductIds).toEqual([freeOffer.id]);
    expect(subscription.courses?.[0]?.title).toBe("Cours retrouvé après reload");
    expect(subscription.ebooks?.[0]?.title).toBe("Fichier retrouvé après reload");
    expect(subscription.includedApps).toEqual([
      "dashboard",
      "support",
      "Cours & formations",
      "Fichiers",
    ]);
  });
});
