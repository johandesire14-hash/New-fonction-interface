export const COURSE_PROGRESS_UPDATED_EVENT = "mansa_course_progress_updated";

type CourseProgressLesson = { id?: string };

export interface CourseProgressSource {
  id: string;
  chapters?: Array<string | CourseProgressLesson>;
  courseModules?: CourseProgressLesson[];
  modules?: CourseProgressLesson[];
  videoStorageKey?: string;
  youtubeUrl?: string;
}

const getCompletedLessonsKey = (courseId: string, progressScopeId?: string) =>
  `mansa_course_completed_lessons_${progressScopeId ? `${encodeURIComponent(progressScopeId)}_` : ""}${courseId}`;

export function getCourseLessonIds(course: CourseProgressSource): string[] {
  if (course.chapters?.length) {
    return course.chapters.map((chapter, index) =>
      typeof chapter === "string"
        ? `${course.id}-chapter-${index}`
        : chapter.id || `${course.id}-chapter-${index}`,
    );
  }

  if (course.courseModules?.length) {
    return course.courseModules.map((module, index) => module.id || `${course.id}-module-${index}`);
  }

  if (course.modules?.length) {
    return course.modules.map((module, index) => module.id || `${course.id}-module-${index}`);
  }

  if (course.videoStorageKey || course.youtubeUrl) return [`${course.id}-video`];
  return [];
}

export function getCompletedCourseLessonIds(courseId: string, progressScopeId?: string): string[] {
  if (typeof window === "undefined") return [];

  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(getCompletedLessonsKey(courseId, progressScopeId)) || "[]",
    );
    return Array.isArray(value)
      ? value.filter((lessonId): lessonId is string => typeof lessonId === "string")
      : [];
  } catch {
    return [];
  }
}

export function getCourseProgress(course: CourseProgressSource, progressScopeId?: string): number {
  const lessonIds = getCourseLessonIds(course);
  if (lessonIds.length === 0) return 0;

  const completedLessons = new Set(getCompletedCourseLessonIds(course.id, progressScopeId));
  const completedCount = lessonIds.filter((lessonId) => completedLessons.has(lessonId)).length;
  return Math.round((completedCount / lessonIds.length) * 100);
}

export function markCourseLessonCompleted(
  courseId: string,
  lessonId: string,
  progressScopeId?: string,
): string[] {
  if (typeof window === "undefined") return [];

  const completedLessons = new Set(getCompletedCourseLessonIds(courseId, progressScopeId));
  completedLessons.add(lessonId);
  const result = [...completedLessons];

  try {
    window.localStorage.setItem(
      getCompletedLessonsKey(courseId, progressScopeId),
      JSON.stringify(result),
    );
    window.dispatchEvent(new Event(COURSE_PROGRESS_UPDATED_EVENT));
  } catch {
    // Keep the current reader usable if browser storage is unavailable.
  }

  return result;
}
