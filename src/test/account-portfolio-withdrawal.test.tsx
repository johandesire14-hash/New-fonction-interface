import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  subscribeMock,
  calculateBalanceMock,
  getPayoutMethodsMock,
  getWithdrawalHistoryMock,
  createWithdrawalRequestMock,
} = vi.hoisted(() => ({
  subscribeMock: vi.fn(),
  calculateBalanceMock: vi.fn(),
  getPayoutMethodsMock: vi.fn(),
  getWithdrawalHistoryMock: vi.fn(),
  createWithdrawalRequestMock: vi.fn(),
}));

vi.mock("@/mansa/services/dbService", () => ({
  subscribeToCreatorTransactions: subscribeMock,
}));

vi.mock("@/mansa/utils/creatorFinancialEngine", () => ({
  calculateCreatorFinancialBalance: calculateBalanceMock,
  createWithdrawalRequest: createWithdrawalRequestMock,
  FINANCIAL_EVENTS: {
    PAYOUT_METHOD_CHANGED: "payout-method-changed",
    WITHDRAWAL_CREATED: "withdrawal-created",
    BALANCE_CHANGED: "balance-changed",
  },
  getSavedPayoutMethods: getPayoutMethodsMock,
  getWithdrawalHistory: getWithdrawalHistoryMock,
  MIN_WITHDRAWAL_AMOUNT_EUR: 10,
  MIN_WITHDRAWAL_AMOUNT_XOF: 5000,
  savePayoutMethod: vi.fn(),
}));

import { AccountPortfolioTab } from "@/mansa/components/common/AccountPortfolioTab";

const withdrawalRequest = {
  id: "withdrawal-1",
  creatorId: "account-user-1",
  amount: 50000,
  currency: "XOF",
  fee: 0,
  netAmount: 50000,
  payoutMethodId: "mobile-money-direct-wave",
  payoutMethodType: "wave" as const,
  payoutMethodLabel: "Wave Côte d'Ivoire (+225 0700000000)",
  destinationDetails: "Wave · Compte test · +225 0700000000",
  accountHolder: "Compte test",
  status: "processing" as const,
  requestedAt: new Date().toISOString(),
  referenceNumber: "WDR-2026-TEST01",
};

describe("AccountPortfolioTab withdrawal request", () => {
  beforeEach(() => {
    subscribeMock.mockReset().mockImplementation((_creatorId, callback) => {
      callback([]);
      return vi.fn();
    });
    calculateBalanceMock.mockReset().mockReturnValue({
      totalGrossVolume: 50000,
      totalPlatformFees: 0,
      totalNetRevenue: 50000,
      pendingBalance: 0,
      availableBalance: 50000,
      reserveBalance: 0,
      totalWithdrawn: 0,
      currency: "XOF",
    });
    getPayoutMethodsMock.mockReset().mockReturnValue([]);
    getWithdrawalHistoryMock.mockReset().mockReturnValue([]);
    createWithdrawalRequestMock.mockReset().mockReturnValue({
      success: true,
      request: withdrawalRequest,
    });
  });

  it("sends a Wave withdrawal from the account wallet and confirms its reference", async () => {
    render(
      <AccountPortfolioTab creatorId="account-user-1" accountHolder="Compte test" currency="XOF" />,
    );

    expect(screen.getByText((text) => text.includes("FCFA"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Demander un retrait/i }));
    expect(screen.getByRole("heading", { name: "Méthodes de retrait" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Wave/ }));
    fireEvent.change(screen.getByLabelText("Montant du retrait"), { target: { value: "50000" } });
    fireEvent.change(screen.getByPlaceholderText("Numéro sans indicatif"), {
      target: { value: "0700000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    await waitFor(
      () => {
        expect(createWithdrawalRequestMock).toHaveBeenCalledWith(
          expect.objectContaining({
            creatorId: "account-user-1",
            amount: 50000,
            currency: "XOF",
            payoutMethod: expect.objectContaining({
              type: "wave",
              accountIdentifier: "+225 0700000000",
            }),
          }),
        );
        expect(screen.getByText("Demande de retrait transmise !")).toBeInTheDocument();
        expect(screen.getByText(/WDR-2026-TEST01/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
