import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EnterpriseMemberView } from "@/mansa/components/dashboard/EnterpriseMemberView";

const companyId = "company-member-apps-test";
const freeProductId = "offer-free-apps-test";

beforeEach(() => {
  localStorage.clear();
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
        subscription={{
          id: `sub-${companyId}-member-test`,
          companyId,
          companyName: "Communauté test",
          productName: "Produit gratuit test",
          productId: freeProductId,
          status: "active",
          hasJoined: true,
          includedApps: ["dashboard", "support", "Telegram", "Discord", "Fichiers", "Cours & formations"],
          unlockedProductIds: [freeProductId],
          purchasedOfferIds: [freeProductId],
          hasPaidOffer: false,
          telegramChannels: [],
        } as any}
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
        subscription={{
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
        } as any}
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

    const savedSubscriptions = JSON.parse(
      localStorage.getItem("mansa_enterprise_subscriptions_member-test") || "[]",
    );
    expect(savedSubscriptions[0].unlockedProductIds).toContain(freeProductId);
    expect(savedSubscriptions[0].purchasedOfferIds).toContain(freeProductId);
    expect(await screen.findByRole("button", { name: "Fichiers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Courses" })).toBeInTheDocument();
  });
});
