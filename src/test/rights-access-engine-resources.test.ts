import { afterEach, describe, expect, it } from "vitest";
import {
  getMemberAuthorizedCourses,
  getMemberAuthorizedEbooks,
  getOffersForCompany,
  normalizeUnlockedOfferIds,
  verifyMemberResourceAccess,
} from "@/mansa/utils/rightsAccessEngine";

const companyId = "company-resource-rights-test";
const offerA = "offer-resource-test-a";
const offerB = "offer-resource-test-b";

function saveOffers(offers: unknown[]) {
  localStorage.setItem(`mansa_creator_offers_${companyId}`, JSON.stringify(offers));
}

afterEach(() => localStorage.clear());

describe("source unifiée des offres et droits aux ressources", () => {
  it("retrouve le cours créé sous mansa_creator_offers et ne l’ouvre qu’avec l’offre achetée", () => {
    const course = {
      id: "course-resource-test",
      title: "Cours privé",
      chapters: ["Introduction"],
      chapterContents: ["Contenu réel du chapitre"],
    };
    saveOffers([
      {
        id: offerA,
        companyId,
        companyName: "Entreprise test",
        title: "Offre A",
        includedApps: ["Cours & formations"],
        courses: [course],
      },
    ]);

    expect(getOffersForCompany(companyId).map((offer) => offer.id)).toContain(offerA);
    expect(getMemberAuthorizedCourses(companyId, [])).toEqual([]);
    expect(getMemberAuthorizedCourses(companyId, [offerA])).toEqual([course]);
    expect(
      verifyMemberResourceAccess({
        companyId,
        unlockedOfferIds: [],
        resourceType: "course",
        resourceId: course.id,
      }).isAuthorized,
    ).toBe(false);
    expect(
      verifyMemberResourceAccess({
        companyId,
        unlockedOfferIds: [offerA],
        resourceType: "course",
        resourceId: course.id,
      }).isAuthorized,
    ).toBe(true);
  });

  it("ne débloque pas les offres sans achat lorsque le mode temporaire est désactivé", () => {
    saveOffers([
      { id: offerA, companyId, companyName: "Entreprise test", title: "Offre A" },
      { id: offerB, companyId, companyName: "Entreprise test", title: "Offre B" },
    ]);

    const unlockedIds = normalizeUnlockedOfferIds({ companyId, purchasedOfferIds: [] });

    expect(unlockedIds).toEqual([]);
  });

  it("fusionne le cache produit et la source créateur en gardant le contenu du cours", () => {
    const course = {
      id: "course-from-creator",
      title: "Formation publiée",
      chapters: ["Leçon"],
      chapterContents: ["Texte réel"],
    };
    localStorage.setItem(
      "mansa_saved_products_cache_creator-test",
      JSON.stringify([
        {
          id: offerA,
          creatorId: "creator-test",
          companyId,
          companyName: "Entreprise test",
          name: "Offre A",
          description: "Détails produit",
          status: "active",
          apps: ["courses"],
        },
      ]),
    );
    saveOffers([
      {
        id: offerA,
        companyId,
        companyName: "Entreprise test",
        title: "Offre A",
        includedApps: ["Cours & formations"],
        courses: [course],
      },
    ]);

    const [mergedOffer] = getOffersForCompany(companyId);
    expect(mergedOffer?.description).toBe("Détails produit");
    expect(getMemberAuthorizedCourses(companyId, [offerA])).toEqual([course]);
  });

  it("retourne les e-books et fichiers uniquement depuis une offre détenue et conserve leur clé de stockage", () => {
    const ebook = {
      id: "file-resource-test",
      title: "Guide privé",
      storageKey: `${companyId}:file-resource-test`,
    };
    saveOffers([
      {
        id: offerA,
        companyId,
        companyName: "Entreprise test",
        title: "Offre A",
        includedApps: ["Fichiers"],
        ebooks: [ebook],
      },
    ]);

    expect(getMemberAuthorizedEbooks(companyId, [])).toEqual([]);
    expect(getMemberAuthorizedEbooks(companyId, [offerA])).toEqual([ebook]);
    const denied = verifyMemberResourceAccess({
      companyId,
      unlockedOfferIds: [offerB],
      resourceType: "ebook",
      resourceId: ebook.id,
    });
    expect(denied.isAuthorized).toBe(false);
    const allowed = verifyMemberResourceAccess({
      companyId,
      unlockedOfferIds: [offerA],
      resourceType: "ebook",
      resourceId: ebook.id,
    });
    expect(allowed.isAuthorized).toBe(true);
    expect(allowed.resource.storageKey).toBe(ebook.storageKey);
  });

  it("accepte une ressource identique liée à une autre offre acquise, sans ouvrir les offres voisines", () => {
    const course = { id: "course-shared-test", title: "Cours partagé", chapters: ["Leçon"] };
    saveOffers([
      {
        id: offerA,
        companyId,
        companyName: "Entreprise test",
        title: "Offre A",
        courses: [course],
      },
      {
        id: offerB,
        companyId,
        companyName: "Entreprise test",
        title: "Offre B",
        courses: [course],
      },
    ]);

    expect(
      verifyMemberResourceAccess({
        companyId,
        unlockedOfferIds: [offerB],
        resourceType: "course",
        resourceId: course.id,
      }).isAuthorized,
    ).toBe(true);
    expect(getMemberAuthorizedCourses(companyId, [offerB])).toEqual([course]);
    expect(getMemberAuthorizedCourses(companyId, [])).toEqual([]);
  });
});
