import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientCoursesView } from "@/mansa/components/dashboard/ClientCoursesView";

const baseProps = {
  companyName: "Mansa",
  courses: [
    {
      id: "course-progress",
      title: "Boom",
      description: "Bonjour à tous",
      duration: "À votre rythme",
      chapters: [
        { id: "chapter-1", title: "Leçon 1" },
        { id: "chapter-2", title: "Leçon 2" },
      ],
    },
  ],
  lockedCourses: [],
  onBack: vi.fn(),
  onOpenCourse: vi.fn(),
  onUnlockCourse: vi.fn(),
};

afterEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe("ClientCoursesView", () => {
  it("allège la carte et ne montre pas le nombre de leçons ni le rythme", () => {
    render(<ClientCoursesView {...baseProps} />);

    const card = screen.getByText("Boom").closest("article");
    expect(card).not.toBeNull();
    const cardContent = within(card as HTMLElement);

    expect(cardContent.queryByText("Formation")).not.toBeInTheDocument();
    expect(cardContent.queryByText(/leçons?/i)).not.toBeInTheDocument();
    expect(cardContent.queryByText("À votre rythme")).not.toBeInTheDocument();
    expect(cardContent.getByRole("button", { name: "Commencer" })).toBeInTheDocument();
  });

  it("calcule une vraie progression à partir des leçons terminées et propose Revoir à 100 %", () => {
    window.localStorage.setItem(
      "mansa_course_completed_lessons_member-progress_course-progress",
      JSON.stringify(["chapter-1"]),
    );
    render(<ClientCoursesView {...baseProps} progressScopeId="member-progress" />);

    const card = screen.getByRole("button", { name: "Continuer" }).closest("article");
    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).getByText("50%")).toBeInTheDocument();
    expect(
      within(card as HTMLElement).getByRole("button", { name: "Continuer" }),
    ).toBeInTheDocument();

    act(() => {
      window.localStorage.setItem(
        "mansa_course_completed_lessons_member-progress_course-progress",
        JSON.stringify(["chapter-1", "chapter-2"]),
      );
      window.dispatchEvent(new Event("mansa_course_progress_updated"));
    });

    expect(within(card as HTMLElement).getByText(/100\s*%/)).toBeInTheDocument();
    expect(within(card as HTMLElement).getByRole("button", { name: "Revoir" })).toBeInTheDocument();
  });

  it("ouvre le cours depuis le bouton Commencer", () => {
    const onOpenCourse = vi.fn();
    render(<ClientCoursesView {...baseProps} onOpenCourse={onOpenCourse} />);

    fireEvent.click(screen.getByRole("button", { name: "Commencer" }));
    expect(onOpenCourse).toHaveBeenCalledWith(baseProps.courses[0]);
  });
});
