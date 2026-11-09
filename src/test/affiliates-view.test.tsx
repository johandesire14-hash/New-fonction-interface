import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAffiliateEligibleProductsMock,
  getAffiliateLinksForUserMock,
  createOrGetAffiliateLinkMock,
} = vi.hoisted(() => ({
  getAffiliateEligibleProductsMock: vi.fn(),
  getAffiliateLinksForUserMock: vi.fn(),
  createOrGetAffiliateLinkMock: vi.fn(),
}));

vi.mock("../mansa/context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "affiliate-account-uid", displayName: "Nom à ne pas utiliser" } }),
}));
vi.mock("../mansa/services/affiliateService", () => ({
  getAffiliateEligibleProducts: getAffiliateEligibleProductsMock,
  getAffiliateLinksForUser: getAffiliateLinksForUserMock,
  createOrGetAffiliateLink: createOrGetAffiliateLinkMock,
}));

import { AffiliatesView } from "../mansa/components/dashboard/AffiliatesView";

const eligibleProduct = {
  id: "product-unique-17",
  creatorId: "product-creator-uid",
  name: "Cours de commerce",
  description: "Un cours utile.",
  category: "Formation",
  status: "active" as const,
  affiliateCommissionRate: 12.75,
  pricingAmount: 30,
  currency: "EUR",
};

beforeEach(() => {
  getAffiliateEligibleProductsMock.mockReset().mockResolvedValue([eligibleProduct]);
  getAffiliateLinksForUserMock.mockReset().mockResolvedValue([]);
  createOrGetAffiliateLinkMock.mockReset().mockResolvedValue({
    id: "affiliate-link-doc",
    affiliateUid: "affiliate-account-uid",
    productId: "product-unique-17",
    productName: "Cours de commerce",
    commissionRate: 12.75,
    code: "QmFzZTY0VXJsU2VjdXJlVG9rZW4xMjM0",
  });
});

describe("AffiliatesView", () => {
  it("shows exact terms before any code creation and requires acceptance", async () => {
    render(<AffiliatesView currency="EUR" userRefName="Nom à ne pas utiliser" />);

    fireEvent.click(await screen.findByRole("button", { name: "Promouvoir ce produit" }));
    expect(screen.getByRole("heading", { name: "Cours de commerce" })).toBeInTheDocument();
    expect(screen.getByTestId("accepted-rate")).toHaveTextContent("12.75 %");
    expect(screen.getByText(/n’employez pas de pratiques trompeuses/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Les ventes et commissions associées ne sont pas suivies pour le moment/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Firebase|Firestore|backend|webhook|dépôt|UID/i)).not.toBeInTheDocument();
    const acceptButton = screen.getByRole("button", {
      name: /j’accepte les conditions et génère mon lien/i,
    });
    expect(acceptButton).toBeDisabled();
    expect(createOrGetAffiliateLinkMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(acceptButton).toBeEnabled();
    fireEvent.click(acceptButton);

    await waitFor(() =>
      expect(createOrGetAffiliateLinkMock).toHaveBeenCalledWith(
        "affiliate-account-uid",
        eligibleProduct,
      ),
    );
    expect(await screen.findByText(/Lien affilié créé/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Votre lien affilié" })).toHaveValue(
      "/affiliate/QmFzZTY0VXJsU2VjdXJlVG9rZW4xMjM0",
    );
    expect(screen.getByText(/Vous pouvez le copier et le partager avec votre audience/i)).toBeInTheDocument();
  });

  it("loads product and existing links using the authenticated Firebase UID, never the display name", async () => {
    render(<AffiliatesView userRefName="Nom à ne pas utiliser" />);
    await screen.findByRole("button", { name: "Promouvoir ce produit" });
    expect(getAffiliateEligibleProductsMock).toHaveBeenCalledWith("affiliate-account-uid");
    expect(getAffiliateLinksForUserMock).toHaveBeenCalledWith("affiliate-account-uid");
    expect(getAffiliateEligibleProductsMock).not.toHaveBeenCalledWith("Nom à ne pas utiliser");
  });

  it("shows the clipboard failure instead of claiming the link was copied", async () => {
    getAffiliateLinksForUserMock.mockResolvedValue([
      {
        id: "affiliate-link-doc",
        affiliateUid: "affiliate-account-uid",
        productId: "product-unique-17",
        productName: "Cours de commerce",
        commissionRate: 12.75,
        code: "QmFzZTY0VXJsU2VjdXJlVG9rZW4xMjM0",
      },
    ]);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("permission denied")) },
    });

    render(<AffiliatesView />);
    fireEvent.click(await screen.findByRole("button", { name: "Copier le lien" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Copie impossible. Copiez le lien manuellement.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("permission denied");
    expect(screen.queryByRole("button", { name: "Copié" })).not.toBeInTheDocument();
  });
});
