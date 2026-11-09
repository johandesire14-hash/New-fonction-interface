import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GraduationCap,
  Lock,
  Play,
  Search,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import type { CourseResourceItem, CreatorPlatformOffer } from "../../types";

type CourseRecord = CourseResourceItem & {
  chapters?: Array<string | { id?: string; title?: string; content?: string }>;
  chapterContents?: string[];
  courseModules?: Array<{ id?: string; title?: string; duration?: string; content?: string }>;
  coverImage?: string;
  imageUrl?: string;
};

interface ClientCoursesViewProps {
  companyName: string;
  loading?: boolean;
  courses: CourseRecord[];
  lockedCourses: Array<{ course: CourseRecord; requiredOffer: CreatorPlatformOffer }>;
  onBack: () => void;
  onOpenCourse: (course: CourseRecord) => void;
  onUnlockCourse: (offer: CreatorPlatformOffer) => void;
}

type CourseFilter = "all" | "in_progress" | "completed" | "not_started";

const getCourseLessons = (course: CourseRecord) => {
  if (course.chapters?.length) return course.chapters.length;
  if (course.courseModules?.length) return course.courseModules.length;
  return Math.max(1, course.modulesCount || 1);
};

const getCourseProgress = (course: CourseRecord) => {
  if (typeof window === "undefined") return 0;
  const value = Number(localStorage.getItem(`mansa_course_progress_${course.id}`) || 0);
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
};

export const ClientCoursesView: React.FC<ClientCoursesViewProps> = ({
  companyName,
  loading = false,
  courses,
  lockedCourses,
  onBack,
  onOpenCourse,
  onUnlockCourse,
}) => {
  const [filter, setFilter] = useState<CourseFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [showLocked, setShowLocked] = useState(false);

  const progressMap = useMemo(
    () => new Map(courses.map((course) => [course.id, getCourseProgress(course)])),
    [courses],
  );
  const courseInProgress = courses.find((course) => {
    const progress = progressMap.get(course.id) || 0;
    return progress > 0 && progress < 100;
  });
  const filteredCourses = courses.filter((course) => {
    const progress = progressMap.get(course.id) || 0;
    const matchesFilter =
      filter === "all" ||
      (filter === "in_progress" && progress > 0 && progress < 100) ||
      (filter === "completed" && progress >= 100) ||
      (filter === "not_started" && progress === 0);
    return (
      matchesFilter &&
      `${course.title} ${course.description}`.toLowerCase().includes(query.toLowerCase())
    );
  });
  const activeCourse = selectedCourseId
    ? courses.find((course) => course.id === selectedCourseId)
    : null;

  const openCourse = (course: CourseRecord) => {
    setSelectedCourseId(course.id);
    onOpenCourse(course);
  };

  return (
    <div className="fixed inset-0 z-[75] flex h-[100dvh] w-full flex-col overflow-hidden bg-[#080a0f] text-white animate-in fade-in">
      <header className="flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#0c0f16]/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl p-2 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Retour à l’entreprise"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Retour</span>
          </button>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
            <GraduationCap className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-black sm:text-base">Cours & Formations</h1>
            <p className="truncate text-[11px] text-zinc-400">
              {companyName} · Votre espace d’apprentissage
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
          aria-label="Fermer"
        >
          <X className="size-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-200">
                <Sparkles className="size-3" /> Mon apprentissage
              </div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                Continuez à progresser
              </h2>
              <p className="mt-1 max-w-xl text-sm text-zinc-400">
                Retrouvez vos formations, reprenez une leçon et avancez à votre rythme.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un cours"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/50"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-zinc-400">
              <span className="size-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />{" "}
              Chargement de vos cours…
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] px-6 py-16 text-center">
              <BookOpen className="mx-auto size-10 text-indigo-300" />
              <h3 className="mt-4 text-lg font-bold">Aucun cours disponible pour le moment</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
                Les formations auxquelles vous avez accès apparaîtront ici.
              </p>
            </div>
          ) : (
            <>
              {courseInProgress && (
                <section className="relative mb-8 overflow-hidden rounded-3xl border border-indigo-400/25 bg-gradient-to-br from-indigo-500/20 via-[#111729] to-[#0d1018] p-5 shadow-2xl shadow-indigo-950/20 sm:p-7">
                  <div className="absolute -right-10 -top-16 size-56 rounded-full bg-indigo-400/10 blur-3xl" />
                  <div className="relative grid gap-6 lg:grid-cols-[1fr_280px] lg:items-end">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200">
                        Reprendre votre cours
                      </span>
                      <h3 className="mt-2 max-w-2xl text-2xl font-black sm:text-3xl">
                        {courseInProgress.title}
                      </h3>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-300">
                        {courseInProgress.description || "Continuez là où vous vous êtes arrêté."}
                      </p>
                      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-zinc-300">
                        <span className="inline-flex items-center gap-1.5">
                          <BookOpen className="size-3.5 text-indigo-300" />{" "}
                          {getCourseLessons(courseInProgress)} leçons
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="size-3.5 text-indigo-300" />{" "}
                          {courseInProgress.duration || "À votre rythme"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openCourse(courseInProgress)}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-950/40 hover:bg-indigo-400"
                      >
                        <Play className="size-3.5 fill-current" /> Reprendre le cours
                      </button>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>Progression</span>
                        <span className="text-indigo-200">
                          {progressMap.get(courseInProgress.id) || 0}%
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-indigo-400 transition-all"
                          style={{ width: `${progressMap.get(courseInProgress.id) || 0}%` }}
                        />
                      </div>
                      <p className="mt-3 text-[11px] text-zinc-400">
                        Votre prochaine leçon vous attend.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-4">
                {(
                  [
                    ["all", "Tous"],
                    ["in_progress", "En cours"],
                    ["completed", "Terminés"],
                    ["not_started", "Non commencés"],
                  ] as Array<[CourseFilter, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition ${filter === value ? "bg-indigo-500 text-white" : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"}`}
                  >
                    {label}
                  </button>
                ))}
                <span className="ml-auto text-xs text-zinc-500">
                  {filteredCourses.length} cours
                </span>
              </div>

              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-black">Mes cours</h3>
                  <span className="text-xs text-zinc-500">Accès inclus dans votre offre</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredCourses.map((course) => {
                    const progress = progressMap.get(course.id) || 0;
                    const completed = progress >= 100;
                    return (
                      <article
                        key={course.id}
                        className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10131b] transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:shadow-xl hover:shadow-indigo-950/20"
                      >
                        <div className="relative flex h-32 items-end overflow-hidden bg-gradient-to-br from-indigo-500/35 via-blue-500/10 to-[#111522] p-4">
                          {(course.coverImage || course.imageUrl) && (
                            <img
                              src={course.coverImage || course.imageUrl}
                              alt=""
                              className="absolute inset-0 size-full object-cover opacity-55"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#10131b] to-transparent" />
                          <div className="relative flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-100">
                            <BookOpen className="size-3.5" /> Formation
                          </div>
                          {completed && (
                            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-bold text-emerald-300">
                              <Check className="size-3" /> Terminé
                            </span>
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="line-clamp-2 min-h-10 text-sm font-black text-white">
                            {course.title}
                          </h4>
                          <p className="mt-2 line-clamp-2 min-h-8 text-xs leading-5 text-zinc-400">
                            {course.description ||
                              "Formation complète avec leçons et ressources pratiques."}
                          </p>
                          <div className="mt-4 flex items-center gap-3 text-[11px] text-zinc-500">
                            <span>{getCourseLessons(course)} leçons</span>
                            <span>·</span>
                            <span>{course.duration || "À votre rythme"}</span>
                          </div>
                          <div className="mt-4">
                            <div className="mb-1.5 flex justify-between text-[10px] font-bold">
                              <span className="text-zinc-500">Progression</span>
                              <span className={completed ? "text-emerald-300" : "text-indigo-300"}>
                                {progress}%
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div
                                className={
                                  completed
                                    ? "h-full rounded-full bg-emerald-400"
                                    : "h-full rounded-full bg-indigo-400"
                                }
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => openCourse(course)}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-xs font-black text-white transition hover:border-indigo-400/40 hover:bg-indigo-500/10"
                          >
                            {completed
                              ? "Revoir le cours"
                              : progress > 0
                                ? "Continuer"
                                : "Commencer"}{" "}
                            <ChevronRight className="size-3.5" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
                {filteredCourses.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">
                    Aucun cours ne correspond à ce filtre.
                  </div>
                )}
              </section>

              {lockedCourses.length > 0 && (
                <section className="mt-10">
                  <button
                    type="button"
                    onClick={() => setShowLocked((value) => !value)}
                    className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-300 hover:text-white"
                  >
                    <Lock className="size-4 text-amber-300" /> Autres formations disponibles{" "}
                    <ChevronRight
                      className={`size-4 transition ${showLocked ? "rotate-90" : ""}`}
                    />
                  </button>
                  {showLocked && (
                    <div className="grid gap-3 md:grid-cols-2">
                      {lockedCourses.map(({ course, requiredOffer }) => (
                        <div
                          key={course.id}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-4"
                        >
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-bold text-zinc-200">
                              {course.title}
                            </h4>
                            <p className="mt-1 text-xs text-zinc-500">
                              Cette formation nécessite une autre offre.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onUnlockCourse(requiredOffer)}
                            className="shrink-0 rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-[11px] font-black text-amber-200 hover:bg-amber-400/20"
                          >
                            Débloquer
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {courses.every((course) => (progressMap.get(course.id) || 0) >= 100) && (
                <div className="mt-10 flex items-center gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
                  <Trophy className="size-8 text-emerald-300" />
                  <div>
                    <h3 className="font-black text-emerald-100">Félicitations !</h3>
                    <p className="mt-1 text-xs text-emerald-200/70">
                      Vous avez terminé toutes vos formations disponibles.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {activeCourse ? null : null}
    </div>
  );
};
