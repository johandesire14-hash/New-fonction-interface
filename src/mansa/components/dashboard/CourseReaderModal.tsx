import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { getDigitalAssetObjectUrl } from "../../utils/digitalAssetStorage";
import { getUserFacingErrorMessage } from "../../utils/userFacingError";

interface CourseChapter {
  id?: string;
  title?: string;
  content?: string;
  description?: string;
}

interface CourseModule {
  id?: string;
  title?: string;
  content?: string;
  description?: string;
}

interface NormalizedCourseChapter {
  id: string;
  title: string;
  content: string;
}

interface ReaderCourse {
  id: string;
  title?: string;
  description?: string;
  chapters?: Array<string | CourseChapter>;
  chapterContents?: string[];
  courseModules?: CourseModule[];
  youtubeUrl?: string;
  videoStorageKey?: string;
  attachmentStorageKey?: string;
  attachmentFileName?: string;
  accessUrl?: string;
}

interface CourseReaderModalProps {
  course: ReaderCourse;
  onClose: () => void;
  onDownloadAttachment: (course: ReaderCourse) => void;
}

function getYoutubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    let videoId = "";
    if (parsed.hostname === "youtu.be") videoId = parsed.pathname.slice(1);
    else if (parsed.hostname.endsWith("youtube.com")) {
      videoId =
        parsed.pathname === "/watch"
          ? parsed.searchParams.get("v") || ""
          : parsed.pathname.split("/").filter(Boolean).at(-1) || "";
    }
    if (!/^[a-zA-Z0-9_-]{6,}$/.test(videoId)) return null;
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

export const CourseReaderModal: React.FC<CourseReaderModalProps> = ({
  course,
  onClose,
  onDownloadAttachment,
}) => {
  const chapters = useMemo<NormalizedCourseChapter[]>(() => {
    const namedChapters = course.chapters || [];
    if (namedChapters.length) {
      return namedChapters.map((chapter, index) => ({
        id:
          typeof chapter === "string"
            ? `${course.id}-chapter-${index}`
            : chapter.id || `${course.id}-chapter-${index}`,
        title: typeof chapter === "string" ? chapter : chapter.title || `Chapitre ${index + 1}`,
        content:
          course.chapterContents?.[index] ||
          (typeof chapter === "object" ? chapter.content || "" : ""),
      }));
    }
    const courseModules = course.courseModules || [];
    if (courseModules.length) {
      return courseModules.map((module, index) => ({
        id: module.id || `${course.id}-module-${index}`,
        title: module.title || `Module ${index + 1}`,
        content: module.content || module.description || "",
      }));
    }
    return [];
  }, [course]);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const youtubeEmbedUrl = getYoutubeEmbedUrl(course?.youtubeUrl);
  const activeChapter = chapters[activeChapterIndex];

  useEffect(() => {
    setActiveChapterIndex(0);
  }, [course?.id]);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setVideoUrl(null);
    setVideoError(null);
    if (!course?.videoStorageKey) return;
    getDigitalAssetObjectUrl(course.videoStorageKey)
      .then((url) => {
        objectUrl = url;
        if (active) setVideoUrl(url);
        else URL.revokeObjectURL(url);
      })
      .catch((error) => {
        console.error("Course video could not be opened:", error);
        if (active)
          setVideoError(getUserFacingErrorMessage(error, "La vidéo ne peut pas être ouverte. Réessayez."));
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [course?.id, course?.videoStorageKey]);

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-[#090a0e] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`Lecteur du cours ${course?.title || ""}`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0b0d12]/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
            <BookOpen className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold sm:text-base">{course?.title || "Cours"}</h1>
            <p className="truncate text-[11px] text-zinc-400">
              {course?.description || "Votre formation"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le lecteur"
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-5">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
            {videoUrl ? (
              <video
                key={videoUrl}
                className="aspect-video w-full bg-black"
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
              />
            ) : youtubeEmbedUrl ? (
              <iframe
                className="aspect-video w-full"
                src={youtubeEmbedUrl}
                title={course?.title || "Vidéo du cours"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : videoError ? (
              <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-amber-200">
                {videoError}
              </div>
            ) : course?.videoStorageKey ? (
              <div className="flex aspect-video items-center justify-center text-sm text-zinc-400">
                Chargement de la vidéo…
              </div>
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-2 px-6 text-center text-zinc-400">
                <BookOpen className="size-8 text-indigo-300" />
                <p className="text-sm font-semibold text-zinc-200">
                  Aucune vidéo associée à ce cours
                </p>
                <p className="max-w-md text-xs">
                  Les chapitres et leur contenu restent disponibles ci-dessous.
                </p>
              </div>
            )}
          </div>

          {activeChapter && (
            <article className="rounded-2xl border border-white/10 bg-[#11141b] p-5 sm:p-7">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
                Chapitre {activeChapterIndex + 1} sur {chapters.length}
              </div>
              <h2 className="mt-2 text-xl font-bold">{activeChapter.title}</h2>
              <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-zinc-300">
                {activeChapter.content || (
                  <span className="text-zinc-500">Aucun texte n’a été ajouté à ce chapitre.</span>
                )}
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <button
                  type="button"
                  disabled={activeChapterIndex === 0}
                  onClick={() => setActiveChapterIndex((index) => Math.max(0, index - 1))}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" /> Précédent
                </button>
                <button
                  type="button"
                  disabled={activeChapterIndex >= chapters.length - 1}
                  onClick={() =>
                    setActiveChapterIndex((index) => Math.min(chapters.length - 1, index + 1))
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold hover:bg-indigo-500 disabled:opacity-40"
                >
                  Suivant <ChevronRight className="size-4" />
                </button>
              </div>
            </article>
          )}

          {!activeChapter && !videoUrl && !youtubeEmbedUrl && !course?.videoStorageKey && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm text-amber-100">
              Le cours ne contient pas encore de chapitre, de texte ou de vidéo publiés. Le créateur
              doit ajouter le contenu depuis son espace de gestion.
            </div>
          )}

          {course?.attachmentStorageKey && (
            <button
              type="button"
              onClick={() => onDownloadAttachment(course)}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-200 hover:bg-blue-500/15"
            >
              <Download className="size-4" /> Télécharger{" "}
              {course.attachmentFileName || "la pièce jointe du cours"}
            </button>
          )}
          {course?.accessUrl && /^https?:\/\//i.test(course.accessUrl) && !youtubeEmbedUrl && (
            <a
              href={course.accessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/5"
            >
              Ouvrir la ressource externe
            </a>
          )}
        </main>

        <aside className="h-fit rounded-2xl border border-white/10 bg-[#11141b] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Contenu du cours</h2>
            <span className="text-[10px] text-zinc-500">{chapters.length} chapitre(s)</span>
          </div>
          {chapters.length ? (
            <nav className="space-y-1" aria-label="Chapitres du cours">
              {chapters.map((chapter, index) => (
                <button
                  type="button"
                  key={chapter.id}
                  onClick={() => setActiveChapterIndex(index)}
                  className={`w-full rounded-xl p-3 text-left transition-colors ${index === activeChapterIndex ? "bg-indigo-500/15 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Chapitre {index + 1}
                  </span>
                  <span className="mt-1 block text-xs font-semibold">{chapter.title}</span>
                </button>
              ))}
            </nav>
          ) : (
            <p className="rounded-xl bg-black/20 p-3 text-xs text-zinc-500">
              Le créateur n’a pas encore publié de chapitres.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
};
