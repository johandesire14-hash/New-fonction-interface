import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CourseReaderModal } from "@/mansa/components/dashboard/CourseReaderModal";
import { getOfferFileUrl } from "@/mansa/services/supabaseStorageService";

vi.mock("@/mansa/services/supabaseStorageService", () => ({
  getOfferFileUrl: vi.fn(),
}));

const getOfferFileUrlMock = vi.mocked(getOfferFileUrl);

const baseProps = {
  onClose: vi.fn(),
  onDownloadAttachment: vi.fn(),
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("CourseReaderModal", () => {
  it("rend un cours avec un chapitre vide sans erreur", () => {
    render(
      <CourseReaderModal
        {...baseProps}
        course={{
          id: "course-empty",
          title: "Cours vide",
          chapters: [{ id: "chapter-empty", title: "Chapitre vide", content: "" }],
        }}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Lecteur du cours Cours vide" })).toBeInTheDocument();
    expect(screen.getByText("Aucun texte n’a été ajouté à ce chapitre.")).toBeInTheDocument();
  });

  it("rend le lecteur YouTube d’un chapitre sans erreur", () => {
    render(
      <CourseReaderModal
        {...baseProps}
        course={{
          id: "course-youtube",
          title: "Cours YouTube",
          chapters: [
            {
              id: "chapter-youtube",
              title: "Chapitre YouTube",
              content: "Texte de test",
              videoUrl: "https://youtu.be/abc123456",
            },
          ],
        }}
      />,
    );

    expect(screen.getByTitle("Cours YouTube")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/abc123456",
    );
  });

  it("génère l’URL signée d’une vidéo stockée sans erreur", async () => {
    getOfferFileUrlMock.mockResolvedValue("https://signed.example/video.mp4");

    const { container } = render(
      <CourseReaderModal
        {...baseProps}
        course={{
          id: "course-storage",
          title: "Cours Storage",
          chapters: [
            {
              id: "chapter-storage",
              title: "Chapitre Storage",
              content: "Texte de test",
              videoStorageKey: "creator-1/offer-1/video.mp4",
            },
          ],
        }}
      />,
    );

    await waitFor(() =>
      expect(getOfferFileUrlMock).toHaveBeenCalledWith("creator-1/offer-1/video.mp4"),
    );
    await waitFor(() =>
      expect(container.querySelector("video")).toHaveAttribute(
        "src",
        "https://signed.example/video.mp4",
      ),
    );
  });
});
