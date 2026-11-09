import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mediaMocks = vi.hoisted(() => ({
  uploadCompanyPostMedia: vi.fn(),
  validateCompanyPostMedia: vi.fn(() => null),
}));

vi.mock("../mansa/services/companyAssetStorage", () => mediaMocks);

import { CompanyPostComposer } from "../mansa/components/dashboard/CompanyPostComposer";

beforeEach(() => {
  mediaMocks.uploadCompanyPostMedia.mockReset().mockResolvedValue("https://media.example/post.png");
  mediaMocks.validateCompanyPostMedia.mockReset().mockReturnValue(null);
});

describe("CompanyPostComposer", () => {
  it("creates a poll, inserts emoji, marks paid publication and uploads media without a live action", async () => {
    const onClose = vi.fn();
    const onPublish = vi.fn();
    render(
      <CompanyPostComposer
        companyId="company-1"
        companyName="Entreprise A"
        onClose={onClose}
        onPublish={onPublish}
      />,
    );

    expect(screen.queryByRole("button", { name: /Passer en direct/i })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Texte de la publication" }), {
      target: { value: "Annonce" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter un emoji" }));
    fireEvent.click(screen.getByRole("button", { name: "Insérer 🔥" }));

    fireEvent.click(screen.getByRole("button", { name: "Créer un sondage" }));
    fireEvent.change(screen.getByLabelText("Question du sondage"), {
      target: { value: "Quel format préférez-vous ?" },
    });
    fireEvent.change(screen.getByLabelText("Option du sondage 1"), {
      target: { value: "Vidéo" },
    });
    fireEvent.change(screen.getByLabelText("Option du sondage 2"), {
      target: { value: "Guide" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Marquer comme publication rémunérée" }));

    const media = new File(["image"], "annonce.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Importer un média"), {
      target: { files: [media] },
    });
    expect(screen.getByText("annonce.png")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Publier" }));

    await waitFor(() =>
      expect(onPublish).toHaveBeenCalledWith({
        content: "Annonce🔥",
        media: {
          url: "https://media.example/post.png",
          name: "annonce.png",
          type: "image/png",
        },
        poll: {
          question: "Quel format préférez-vous ?",
          options: ["Vidéo", "Guide"],
          votes: [0, 0],
        },
        paidPublication: true,
      }),
    );
    expect(mediaMocks.uploadCompanyPostMedia).toHaveBeenCalledWith(
      "company-1",
      expect.stringMatching(/^post-/),
      media,
    );
    expect(onClose).toHaveBeenCalledOnce();
  });
});
