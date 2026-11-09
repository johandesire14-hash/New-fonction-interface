import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const uploadMock = vi.hoisted(() => vi.fn());
vi.mock("../mansa/services/companyAssetStorage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../mansa/services/companyAssetStorage")>();
  return { ...actual, uploadCompanyBrandingAsset: uploadMock };
});

import { EnterpriseBrandingModal } from "../mansa/components/dashboard/EnterpriseBrandingModal";

const company = {
  id: "company-123",
  name: "Studio test",
  description: "Communauté test",
  companyBanner: "https://old.test/banner.jpg",
  companyLogo: "https://old.test/logo.jpg",
};

function renderModal(onSave = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn();
  const view = render(
    <EnterpriseBrandingModal
      isOpen
      onClose={onClose}
      company={company}
      ownerUid="creator-1"
      onSave={onSave}
    />,
  );
  return { ...view, onSave, onClose };
}

beforeEach(() => {
  vi.clearAllMocks();
  uploadMock.mockImplementation(
    async (_companyId: string, kind: string, file: File) =>
      `https://storage.test/${kind}/${file.name}`,
  );
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn((file: File) => `blob:test/${file.name}`),
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
});

describe("EnterpriseBrandingModal file replacement", () => {
  it("previews selected files, uploads both assets and passes Firebase URLs to onSave", async () => {
    const { onSave } = renderModal();
    const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
    const bannerFile = new File(["banner"], "new-banner.png", { type: "image/png" });
    const logoFile = new File(["logo"], "new-logo.png", { type: "image/png" });

    const bannerInput = fileInputs[0]!;
    const logoInput = fileInputs[1]!;
    fireEvent.change(bannerInput, { target: { files: [bannerFile] } });
    fireEvent.change(logoInput, { target: { files: [logoFile] } });
    expect(fileInputs[0]).toHaveValue("");
    expect(fileInputs[1]).toHaveValue("");
    expect(screen.getByAltText("Bannière")).toHaveAttribute("src", "blob:test/new-banner.png");
    expect(screen.getByAltText("Logo")).toHaveAttribute("src", "blob:test/new-logo.png");

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          companyBanner: "https://storage.test/banner/new-banner.png",
          companyLogo: "https://storage.test/logo/new-logo.png",
        }),
      ),
    );
    expect(uploadMock).toHaveBeenNthCalledWith(1, "company-123", "banner", bannerFile);
    expect(uploadMock).toHaveBeenNthCalledWith(2, "company-123", "logo", logoFile);
  });

  it("refuse un fichier non-image sans déclencher d'upload", () => {
    renderModal();
    const bannerInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(bannerInput, {
      target: { files: [new File(["text"], "not-an-image.txt", { type: "text/plain" })] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Choisissez un fichier image.");
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("montre l'erreur d'upload et ne signale pas une sauvegarde réussie", async () => {
    const onSave = vi.fn();
    uploadMock.mockRejectedValueOnce(new Error("storage/unauthorized"));
    renderModal(onSave);
    const bannerInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(bannerInput, {
      target: { files: [new File(["banner"], "banner.png", { type: "image/png" })] },
    });

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La sauvegarde de votre identité visuelle a échoué. Réessayez.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("storage/unauthorized");
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByText("Enregistré !")).not.toBeInTheDocument();
  });

  it("montre l'erreur de persistance au lieu d'afficher un succès", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("permission-denied"));
    renderModal(onSave);

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La sauvegarde de votre identité visuelle a échoué. Réessayez.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("permission-denied");
    expect(screen.queryByText("Enregistré !")).not.toBeInTheDocument();
  });
});
