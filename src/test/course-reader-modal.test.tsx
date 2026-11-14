import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  window.localStorage.clear();
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

  it("affiche deux chapitres, dont un vide et un chapitre YouTube", () => {
    render(
      <CourseReaderModal
        {...baseProps}
        course={{
          id: "course-two-chapters",
          title: "Cours à deux chapitres",
          chapters: [
            {
              id: "chapter-text",
              title: "Chapitre texte",
              content: "Texte du premier chapitre",
            },
            {
              id: "chapter-youtube",
              title: "Chapitre vidéo",
              content: "",
              videoUrl: "https://youtu.be/abc123456",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("2 chapitre(s)")).toBeInTheDocument();
    expect(screen.getAllByText("Chapitre texte")).toHaveLength(2);
    expect(screen.getByText("Chapitre vidéo")).toBeInTheDocument();
    expect(screen.getByText("Texte du premier chapitre")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Chapitre 2 Chapitre vidéo/ }));
    expect(screen.getByText("Aucun texte n’a été ajouté à ce chapitre.")).toBeInTheDocument();
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

  it("enregistre chaque leçon et termine la formation après la dernière", () => {
    const onClose = vi.fn();
    render(
      <CourseReaderModal
        {...baseProps}
        onClose={onClose}
        progressScopeId="member-progress"
        course={{
          id: "course-completion",
          title: "Formation complète",
          chapters: [
            { id: "chapter-one", title: "Première leçon" },
            { id: "chapter-two", title: "Deuxième leçon" },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
    expect(
      JSON.parse(
        window.localStorage.getItem(
          "mansa_course_completed_lessons_member-progress_course-completion",
        ) || "[]",
      ),
    ).toEqual(["chapter-one"]);

    fireEvent.click(screen.getByRole("button", { name: "Terminer le cours" }));
    expect(
      JSON.parse(
        window.localStorage.getItem(
          "mansa_course_completed_lessons_member-progress_course-completion",
        ) || "[]",
      ),
    ).toEqual(["chapter-one", "chapter-two"]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("permet de marquer comme terminé un cours vidéo sans chapitres", () => {
    render(
      <CourseReaderModal
        {...baseProps}
        course={{
          id: "course-video-only",
          title: "Cours vidéo",
          youtubeUrl: "https://youtu.be/abc123456",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Marquer comme terminé" }));
    expect(
      JSON.parse(
        window.localStorage.getItem("mansa_course_completed_lessons_course-video-only") || "[]",
      ),
    ).toEqual(["course-video-only-video"]);
    expect(screen.getByRole("button", { name: "Cours terminé" })).toBeInTheDocument();
  });
});
