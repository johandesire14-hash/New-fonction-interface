import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserProfileMock, updateUserProfileMock, isCreatorPayoutConfiguredMock } = vi.hoisted(
  () => ({
    getUserProfileMock: vi.fn(),
    updateUserProfileMock: vi.fn(),
    isCreatorPayoutConfiguredMock: vi.fn(),
  }),
);

vi.mock("@/mansa/services/dbService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/mansa/services/dbService")>();
  return {
    ...actual,
    getUserProfile: getUserProfileMock,
    updateUserProfile: updateUserProfileMock,
    isCreatorPayoutConfigured: isCreatorPayoutConfiguredMock,
  };
});

import { AccountSettingsModal } from "@/mansa/components/common/AccountSettingsModal";
import { SettingsView } from "@/mansa/components/dashboard/SettingsView";

const user = {
  uid: "payment-settings-test-user",
  name: "Compte Test",
  email: "payment-settings@example.com",
};

describe("payment settings scope", () => {
  beforeEach(() => {
    localStorage.clear();
    getUserProfileMock.mockReset().mockResolvedValue(null);
    updateUserProfileMock.mockReset().mockResolvedValue({ uid: user.uid });
    isCreatorPayoutConfiguredMock.mockReset().mockReturnValue(false);
  });

  it("does not carry a saved Wave configuration from one company to another", async () => {
    localStorage.setItem(
      "mansa_company_settings_company-a",
      JSON.stringify({
        id: "company-a",
        name: "Entreprise A",
        payoutMethod: "wave",
        momoNumber: "+225 0700000000",
        momoName: "Compte A",
        payoutVerificationStatus: "pending",
      }),
    );

    const { rerender } = render(
      <SettingsView
        user={user}
        initialTab="store"
        activeCompanyId="company-a"
        activeCompanyName="Entreprise A"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Paiement/ }));
    expect(
      await screen.findByRole("button", { name: "Vérification en attente" }),
    ).toBeInTheDocument();

    rerender(
      <SettingsView
        user={user}
        initialTab="store"
        activeCompanyId="company-b"
        activeCompanyName="Entreprise B"
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Paiement/ }));
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Vérification en attente" }),
      ).not.toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "Configurer" })).toHaveLength(5);
    });
  });

  it("uses the shared payment template and saves account settings on the user profile", async () => {
    render(<AccountSettingsModal isModal={false} user={user} initialTab="paiements" />);
    await waitFor(() => expect(getUserProfileMock).toHaveBeenCalledWith(user.uid));
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByRole("heading", { level: 3, name: "Méthodes de paiement" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Wave")).toBeInTheDocument();
    expect(screen.getByText("Orange Money")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(updateUserProfileMock).toHaveBeenCalledWith(
        user.uid,
        expect.objectContaining({
          accountPaymentSettings: expect.objectContaining({
            includeDefaultPaymentMethods: true,
          }),
        }),
      );
    });
  });
});
