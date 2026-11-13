import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EnterpriseMemberView } from "@/mansa/components/dashboard/EnterpriseMemberView";
import { getSavedSubscriptions } from "@/mansa/utils/subscriptionsStorage";

const {
  fetchMemberCommunitiesMock,
  persistFreeMemberEntitlementMock,
  subscribeToCompanyOffersMock,
  getMemberProductsByIdsMock,
  fetchPublicCreatorProfileIdentityMock,
} = vi.hoisted(() => ({
  fetchMemberCommunitiesMock: vi.fn().mockResolvedValue(["company-member-apps-test"]),
  persistFreeMemberEntitlementMock: vi.fn().mockResolvedValue(undefined),
  subscribeToCompanyOffersMock: vi.fn(),
  getMemberProductsByIdsMock: vi.fn().mockResolvedValue([]),
  fetchPublicCreatorProfileIdentityMock: vi.fn(),
}));

vi.mock("@/mansa/services/supabaseCommunityService", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchMemberCommunities: fetchMemberCommunitiesMock,
}));

vi.mock("@/mansa/services/dbService", async (importOriginal) => ({
  ...(await importOriginal()),
  persistFreeMemberEntitlement: persistFreeMemberEntitlementMock,
  subscribeToCompanyOffers: subscribeToCompanyOffersMock,
  getMemberProductsByIds: getMemberProductsByIdsMock,
}));

vi.mock("@/mansa/services/supabaseProfileService", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchPublicCreatorProfileIdentity: fetchPublicCreatorProfileIdentityMock,
}));

const companyId = "company-member-apps-test";
const freeProductId = "offer-free-apps-test";

beforeEach(() => {
  localStorage.clear();
  fetchPublicCreatorProfileIdentityMock.mockResolvedValue({
    uid: "creator-public-test",
    displayName: "Awa Bah",
    handle: "awa-bah",
  });
  subscribeToCompanyOffersMock.mockImplementation((_companyId, callback) => {
    callback([
      {
        id: "offer-free-apps-test",
        title: "Produit gratuit test",
        companyId: "company-member-apps-test",
        companyName: "Communauté test",
        category: "community",
        priceDisplay: "Gratuit",
        priceAmount: 0,
        currency: "XOF",
        pricingType: "free",
        billingCycle: "one_time",
        includedApps: ["Telegram", "Discord", "Fichiers", "Cours & formations"],
      },
    ]);
    return () => {};
  });
});

describe("métadonnées publiques de l’entreprise", () => {
  const subscription = {
    id: "sub-company-public-test",
    companyId: "company-public-test",
    creatorId: "creator-public-test",
    companyName: "Entreprise test",
    productName: "Adhésion test",
    priceDisplay: "Gratuit",
    status: "active" as const,
    subscribedAt: "2026-05-14T10:00:00.000Z",
    hasJoined: true,
    includedApps: ["dashboard", "support"],
    telegramChannels: [],
  };

  it("montre au membre le handle actuel du créateur et la date réelle d’adhésion", async () => {
    render(
      <EnterpriseMemberView
        lang="fr"
        user={{ uid: "member-public-test", name: "Membre test", email: "member@example.test" }}
        subscription={subscription}
      />,
    );

    expect(await screen.findByText("@awa-bah")).toBeInTheDocument();
    const joinedAt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
      new Date(subscription.subscribedAt),
    );
    expect(screen.getByText(`Membre depuis ${joinedAt}`)).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent("mansa_profile_updated", {
          detail: {
            uid: "creator-public-test",
            displayName: "Awa Bah",
            handle: "@awa-bah-mis-a-jour",
          },
        }),
      );
    });
    expect(await screen.findByText("@awa-bah-mis-a-jour")).toBeInTheDocument();
  });

  it("masque la date d’adhésion au créateur lui-même", async () => {
    render(
      <EnterpriseMemberView
        lang="fr"
        user={{ uid: "creator-public-test", name: "Awa Bah", email: "creator@example.test" }}
        subscription={subscription}
      />,
    );

    expect(await screen.findByText("@awa-bah")).toBeInTheDocument();
    expect(screen.queryByText(/^Membre depuis/)).not.toBeInTheDocument();
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("applications d’une offre gratuite dans l’espace membre", () => {
  it("affiche les apps de l’offre détenue et masque celles d’une autre offre", async () => {
    localStorage.setItem(
      `mansa_creator_offers_${companyId}`,
      JSON.stringify([
        {
          id: freeProductId,
          companyId,
          companyName: "Communauté test",
          title: "Produit gratuit test",
          status: "active",
          pricingType: "free",
          priceAmount: 0,
          includedApps: ["Telegram", "Discord", "Fichiers", "Cours & formations"],
        },
        {
          id: "offer-not-owned",
          companyId,
          companyName: "Communauté test",
          title: "Autre produit",
          status: "active",
          pricingType: "paid",
          priceAmount: 26,
          includedApps: ["Content"],
        },
      ]),
    );

    render(
      <EnterpriseMemberView
        lang="fr"
        user={{ uid: "member-test", name: "Membre test", email: "member@example.test" }}
        subscription={
          {
            id: `sub-${companyId}-member-test`,
            companyId,
            companyName: "Communauté test",
            productName: "Produit gratuit test",
            productId: freeProductId,
            status: "active",
            hasJoined: true,
            includedApps: [
              "dashboard",
              "support",
              "Telegram",
              "Discord",
              "Fichiers",
              "Cours & formations",
            ],
            unlockedProductIds: [freeProductId],
            purchasedOfferIds: [freeProductId],
            hasPaidOffer: false,
            telegramChannels: [],
          } as any
        }
      />,
    );

    expect(await screen.findByRole("button", { name: "Telegram" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discord" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fichiers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Courses" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Content" })).not.toBeInTheDocument();
  });

  it("enregistre les droits sous l’UID après avoir rejoint le produit gratuit", async () => {
    localStorage.setItem(
      `mansa_creator_offers_${companyId}`,
      JSON.stringify([
        {
          id: freeProductId,
          companyId,
          companyName: "Communauté test",
          title: "Produit gratuit test",
          status: "active",
          pricingType: "free",
          priceAmount: 0,
          includedApps: ["Telegram", "Discord", "Fichiers", "Cours & formations"],
        },
      ]),
    );

    render(
      <EnterpriseMemberView
        lang="fr"
        user={{ uid: "member-test", name: "Membre test", email: "member@example.test" }}
        subscription={
          {
            id: `sub-${companyId}-member-test`,
            companyId,
            companyName: "Communauté test",
            productName: "Adhésion membre",
            status: "active",
            hasJoined: true,
            includedApps: ["dashboard", "support"],
            unlockedProductIds: [],
            purchasedOfferIds: [],
            hasPaidOffer: false,
            telegramChannels: [],
          } as any
        }
      />,
    );

    const productTabs = screen.getAllByRole("button", { name: /Produits/ });
    fireEvent.click(productTabs[productTabs.length - 1]);
    fireEvent.click(await screen.findByRole("button", { name: /Produit gratuit test/ }));
    fireEvent.click(screen.getByRole("button", { name: "Rejoindre maintenant" }));
    fireEvent.click(await screen.findByRole("button", { name: "Rejoindre gratuitement" }));
    expect(
      await screen.findByRole("heading", { name: "Bienvenue !" }, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Accéder à l'entreprise" }));

    const savedSubscriptions = getSavedSubscriptions("member-test");
    expect(savedSubscriptions[0].unlockedProductIds).toContain(freeProductId);
    expect(savedSubscriptions[0].purchasedOfferIds).toContain(freeProductId);
    expect(await screen.findByRole("button", { name: "Fichiers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Courses" })).toBeInTheDocument();
  });
});
