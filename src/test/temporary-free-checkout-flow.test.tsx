import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OfferCheckoutModal } from "@/mansa/components/dashboard/OfferCheckoutModal";
import { prepareTemporaryFreeCheckoutOffer } from "@/mansa/utils/temporaryFreeAccess";
import type { CreatorPlatformOffer } from "@/mansa/types";

const paidOffer: CreatorPlatformOffer = {
  id: "offer-scalping",
  title: "Accès Club VIP Scalping",
  companyId: "good-money",
  companyName: "Good money",
  category: "community",
  priceDisplay: "15 000 XOF",
  priceAmount: 15000,
  currency: "XOF",
  pricingType: "paid",
  billingCycle: "monthly",
  includedApps: ["Telegram", "Discord"],
  pricingOptions: [{ id: "monthly", name: "Mensuel", price: 15000, billing: "par mois" }],
};
const freeOffer: CreatorPlatformOffer = {
  ...paidOffer,
  pricingType: "free",
  priceAmount: 0,
  priceDisplay: "0 XOF Gratuit",
};

describe("temporary free checkout", () => {
  it("converts an offer to zero cost for a non-manager, without mutating its source", () => {
    const checkoutOffer = prepareTemporaryFreeCheckoutOffer(paidOffer, false, true);

    expect(checkoutOffer).toMatchObject({
      pricingType: "free",
      priceAmount: 0,
      priceDisplay: "Gratuit",
      pricingOptions: [
        { id: "temporary-free-access", name: "Accès gratuit", price: 0, billing: "gratuit" },
      ],
    });
    expect(paidOffer.pricingType).toBe("paid");
    expect(paidOffer.priceAmount).toBe(15000);
  });

  it("completes the free checkout and grants the offer without a payment step", async () => {
    const onPaymentSuccess = vi.fn();
    const checkoutOffer = prepareTemporaryFreeCheckoutOffer(paidOffer, false, true);

    render(
      <OfferCheckoutModal
        isOpen
        onClose={() => {}}
        offer={checkoutOffer}
        user={{ uid: "test-customer", name: "Client test", email: "client@example.test" }}
        onPaymentSuccess={onPaymentSuccess}
      />,
    );

    expect(screen.getByText("Gratuit")).toBeInTheDocument();
    const joinButton = screen.getByRole("button", { name: "Rejoindre gratuitement" });
    expect(joinButton).toBeEnabled();
    fireEvent.click(joinButton);

    expect(await screen.findByRole("heading", { name: "Bienvenue !" }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText("Votre accès à Accès Club VIP Scalping est maintenant disponible.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Accéder à l'entreprise" }));
    expect(onPaymentSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "offer-scalping",
        hasPaidOffer: false,
        unlockedProductIds: ["offer-scalping"],
        purchasedOfferIds: ["offer-scalping"],
        includedApps: expect.arrayContaining(["Telegram", "Discord"]),
      }),
    );
  });

  it("joins a genuinely free product and grants its associated applications", async () => {
    const onPaymentSuccess = vi.fn();

    render(
      <OfferCheckoutModal
        isOpen
        onClose={() => {}}
        offer={freeOffer}
        user={{ uid: "test-customer", name: "Client test", email: "client@example.test" }}
        onPaymentSuccess={onPaymentSuccess}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Rejoindre gratuitement" }));
    expect(await screen.findByRole("heading", { name: "Bienvenue !" }, { timeout: 3000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Accéder à l'entreprise" }));

    expect(onPaymentSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: freeOffer.id,
        hasPaidOffer: false,
        unlockedProductIds: [freeOffer.id],
        purchasedOfferIds: [freeOffer.id],
        includedApps: expect.arrayContaining(["Telegram", "Discord"]),
      }),
    );
  });

  it("keeps the paid price for managers or when temporary access is disabled", () => {
    expect(prepareTemporaryFreeCheckoutOffer(paidOffer, true, true)).toBe(paidOffer);
    expect(prepareTemporaryFreeCheckoutOffer(paidOffer, false, false)).toBe(paidOffer);
  });
});
