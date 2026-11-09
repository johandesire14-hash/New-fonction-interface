import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserProfileMock, updateUserProfileMock } = vi.hoisted(() => ({
  getUserProfileMock: vi.fn(),
  updateUserProfileMock: vi.fn(),
}));

vi.mock("@/mansa/services/dbService", () => ({
  getUserProfile: getUserProfileMock,
  updateUserProfile: updateUserProfileMock,
}));

vi.mock("@/mansa/components/dashboard/CustomerPurchasesView", () => ({
  CustomerPurchasesView: () => null,
}));
vi.mock("@/mansa/components/common/AccountPortfolioTab", () => ({
  AccountPortfolioTab: () => null,
}));
vi.mock("@/mansa/components/common/SecuritySettingsPanel", () => ({
  SecuritySettingsPanel: () => null,
}));
vi.mock("@/mansa/components/common/AccountVerificationPanel", () => ({
  AccountVerificationPanel: () => null,
}));
vi.mock("@/mansa/components/common/ResolutionCenterPanel", () => ({
  ResolutionCenterPanel: () => null,
}));

import { AccountSettingsModal } from "@/mansa/components/common/AccountSettingsModal";

describe("AccountSettingsModal account actions", () => {
  beforeEach(() => {
    getUserProfileMock.mockReset().mockResolvedValue(null);
    updateUserProfileMock.mockReset().mockResolvedValue(undefined);
  });

  it("shows logout and delete actions on the same row immediately after Resolution Center", async () => {
    const onLogout = vi.fn();
    const onDeleteAccount = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <AccountSettingsModal
        isModal={false}
        user={{ uid: "user-42", name: "Aïssata Diop", email: "aissata@example.com" }}
        onLogout={onLogout}
        onDeleteAccount={onDeleteAccount}
      />,
    );

    const desktopSidebar = container.querySelector("aside");
    expect(desktopSidebar).not.toBeNull();
    const sidebar = within(desktopSidebar as HTMLElement);
    const resolutionCenter = sidebar.getByRole("button", { name: "Centre de résolution" });
    const logout = sidebar.getByRole("button", { name: "Déconnexion" });
    const deleteAccount = sidebar.getByRole("button", { name: "Supprimer mon compte" });

    expect(resolutionCenter.parentElement).toBe(logout.parentElement);
    expect(resolutionCenter.compareDocumentPosition(logout) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(logout.parentElement).toBe(deleteAccount.parentElement);
    expect(logout).toBeEnabled();
    expect(deleteAccount).toBeEnabled();

    fireEvent.click(logout);
    expect(onLogout).toHaveBeenCalledOnce();

    fireEvent.click(deleteAccount);
    expect(
      await screen.findByRole("heading", { name: "Supprimer définitivement votre compte ?" }),
    ).toBeInTheDocument();
  });
});
