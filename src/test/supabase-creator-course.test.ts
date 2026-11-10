import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock, requireActiveSupabaseSessionMock, fetchCommunityByIdMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  requireActiveSupabaseSessionMock: vi.fn(),
  fetchCommunityByIdMock: vi.fn(),
}));

vi.mock("@/mansa/services/supabase", () => ({
  supabase: { from: fromMock },
  requireActiveSupabaseSession: requireActiveSupabaseSessionMock,
}));

vi.mock("@/mansa/services/supabaseCommunityService", () => ({
  fetchCommunityById: fetchCommunityByIdMock,
}));

import { saveCreatorCourseToOffer } from "@/mansa/services/supabaseOfferService";

const makeQuery = (table: string, callIndex: number, recorded: Record<string, any[]>) => {
  const response =
    table === "offers"
      ? { data: { id: "offer-1", creator_id: "creator-1", included_apps: ["dashboard"] }, error: null }
      : { data: null, error: null };
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(() =>
      Promise.resolve(
        table === "offers"
          ? response
          : callIndex === 0
            ? { data: null, error: null }
            : { data: { id: "course-row-1" }, error: null },
      ),
    ),
    single: vi.fn(() => Promise.resolve({ data: { id: "course-row-1" }, error: null })),
    update: vi.fn((payload) => {
      const key = `${table}:update`;
      recorded[key] ||= [];
      recorded[key]!.push(payload);
      return query;
    }),
    insert: vi.fn((payload) => {
      const key = `${table}:insert`;
      recorded[key] ||= [];
      recorded[key]!.push(payload);
      return query;
    }),
    delete: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve({ error: null }).then(resolve, reject),
  };
  return query;
};

describe("creator course persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireActiveSupabaseSessionMock.mockResolvedValue({ user: { id: "creator-1" } });
    const tableCounts: Record<string, number> = {};
    const recorded: Record<string, any[]> = {};
    (fromMock as any).recorded = recorded;
    fromMock.mockImplementation((table: string) => {
      const callIndex = tableCounts[table] || 0;
      tableCounts[table] = callIndex + 1;
      return makeQuery(table, callIndex, recorded);
    });
  });

  it("publishes the Courses app and persists the course and chapters for its offer", async () => {
    const id = await saveCreatorCourseToOffer({
      offerId: "offer-1",
      title: "Premiers pas",
      description: "Introduction à la formation",
      modules: [{ title: "Chapitre 1", content: "Leçon enregistrée", videoUrl: "https://youtu.be/example" }],
    });

    const recorded = (fromMock as any).recorded as Record<string, any[]>;
    expect(id).toBe("course-row-1");
    expect(recorded["offers:update"]).toEqual([
      { included_apps: ["dashboard", "Cours & formations"] },
    ]);
    expect(recorded["offer_courses:insert"]).toEqual([
      { offer_id: "offer-1", title: "Premiers pas", description: "Introduction à la formation" },
    ]);
    expect(recorded["course_modules:insert"]).toEqual([
      [
        {
          course_id: "course-row-1",
          title: "Chapitre 1",
          content: "Leçon enregistrée",
          video_url: "https://youtu.be/example",
          sort_order: 0,
        },
      ],
    ]);
  });

  it("persists a Storage path when a module has an uploaded video", async () => {
    await saveCreatorCourseToOffer({
      offerId: "offer-1",
      title: "Cours vidéo",
      description: "",
      modules: [{ title: "Chapitre vidéo", videoStorageKey: "creator-1/offer-1/lesson.mp4" }],
    });

    const recorded = (fromMock as any).recorded as Record<string, any[]>;
    expect(recorded["course_modules:insert"]?.at(-1)).toEqual([
      {
        course_id: "course-row-1",
        title: "Chapitre vidéo",
        content: "",
        video_url: "creator-1/offer-1/lesson.mp4",
        sort_order: 0,
      },
    ]);
  });
});
