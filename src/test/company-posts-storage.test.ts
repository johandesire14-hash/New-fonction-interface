import { beforeEach, describe, expect, it } from "vitest";
import {
  createCompanyPost,
  getPostsForCompany,
  recordCompanyPollVote,
} from "../mansa/utils/companyPostsStorage";

beforeEach(() => {
  localStorage.clear();
});

describe("company post storage", () => {
  it("persists media, paid disclosure and poll options with vote counts", () => {
    const post = createCompanyPost("company-1", "Entreprise A", {
      title: "Actualité officielle",
      content: "Notre nouvelle offre 🔥",
      authorName: "Entreprise A",
      media: {
        url: "https://media.example/post.png",
        name: "post.png",
        type: "image/png",
      },
      paidPublication: true,
      poll: {
        question: "Quel format préférez-vous ?",
        options: ["Vidéo", "Guide"],
        votes: [0, 0],
      },
    });

    expect(getPostsForCompany("company-1")[0]).toMatchObject({
      id: post.id,
      paidPublication: true,
      media: { url: "https://media.example/post.png", name: "post.png", type: "image/png" },
      poll: {
        question: "Quel format préférez-vous ?",
        options: ["Vidéo", "Guide"],
        votes: [0, 0],
      },
    });
  });

  it("records a poll vote only for a valid option on the matching company's post", () => {
    const post = createCompanyPost("company-1", "Entreprise A", {
      title: "Actualité officielle",
      content: "",
      authorName: "Entreprise A",
      poll: {
        question: "Quel format préférez-vous ?",
        options: ["Vidéo", "Guide"],
        votes: [0, 0],
      },
    });

    expect(recordCompanyPollVote(post.id, "company-1", 1)).toBe(true);
    expect(getPostsForCompany("company-1")[0]?.poll?.votes).toEqual([0, 1]);
    expect(recordCompanyPollVote(post.id, "company-1", 2)).toBe(false);
    expect(recordCompanyPollVote(post.id, "another-company", 0)).toBe(false);
    expect(getPostsForCompany("company-1")[0]?.poll?.votes).toEqual([0, 1]);
  });
});
