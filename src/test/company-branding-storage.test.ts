import { beforeEach, describe, expect, it, vi } from "vitest";

const firebaseMocks = vi.hoisted(() => {
  const batch = {
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };
  return {
    db: { name: "mock-firestore" },
    batch,
    writeBatch: vi.fn(() => batch),
    doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    collection: vi.fn((_db: unknown, name: string) => ({ name })),
    getDocs: vi.fn(),
    onSnapshot: vi.fn(),
    query: vi.fn((...args: unknown[]) => args),
    where: vi.fn((...args: unknown[]) => args),
  };
});

vi.mock("../mansa/services/firebase", () => firebaseMocks);

import {
  subscribeToDiscoverableCompany,
  updateCompanyBranding,
} from "../mansa/utils/companyStorage";

const savedCompany = {
  id: "company-123",
  ownerUid: "creator-1",
  name: "Studio test",
  description: "Communauté test",
  acceptedPayments: [],
  primaryCurrency: "XOF",
  companyBanner: "https://old.test/banner.jpg",
  companyLogo: "https://old.test/logo.jpg",
  createdAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  firebaseMocks.batch.commit.mockResolvedValue(undefined);
  firebaseMocks.batch.set.mockReturnValue(firebaseMocks.batch);
});

describe("company branding persistence", () => {
  it("publishes private and discoverable branding together in one Firestore batch", async () => {
    localStorage.setItem("mansa_companies_creator-1", JSON.stringify([savedCompany]));
    const banner = "https://storage.test/new-banner";
    const logo = "https://storage.test/new-logo";

    const result = updateCompanyBranding("creator-1", "company-123", {
      name: "Studio mis à jour",
      companyBanner: banner,
      companyLogo: logo,
    });
    await result.persisted;

    expect(firebaseMocks.writeBatch).toHaveBeenCalledWith(firebaseMocks.db);
    expect(firebaseMocks.batch.set).toHaveBeenCalledTimes(2);
    expect(firebaseMocks.batch.set).toHaveBeenCalledWith(
      { collection: "companies", id: "company-123" },
      expect.objectContaining({
        companyBanner: banner,
        companyLogo: logo,
        name: "Studio mis à jour",
      }),
    );
    expect(firebaseMocks.batch.set).toHaveBeenCalledWith(
      { collection: "discoverableCompanies", id: "company-123" },
      expect.objectContaining({
        companyBanner: banner,
        companyLogo: logo,
        name: "Studio mis à jour",
        discoverable: true,
      }),
    );
    expect(firebaseMocks.batch.commit).toHaveBeenCalledOnce();
    expect(firebaseMocks.setDoc).not.toHaveBeenCalled();
  });

  it("propagates a Firestore batch rejection instead of masking a failed save", async () => {
    localStorage.setItem("mansa_companies_creator-1", JSON.stringify([savedCompany]));
    firebaseMocks.batch.commit.mockRejectedValueOnce(new Error("permission-denied"));

    const result = updateCompanyBranding("creator-1", "company-123", {
      companyBanner: "https://storage.test/new-banner",
    });

    await expect(result.persisted).rejects.toThrow("permission-denied");
    expect(JSON.parse(localStorage.getItem("mansa_companies_creator-1") || "[]")).toEqual([
      savedCompany,
    ]);
  });

  it("projects the saved banner and logo from the public document to member listeners", () => {
    const callback = vi.fn();
    firebaseMocks.onSnapshot.mockImplementationOnce((_reference, next) => {
      next({
        id: "company-123",
        exists: () => true,
        data: () => ({
          discoverable: true,
          name: "Studio test",
          companyBanner: "https://storage.test/member-banner",
          companyLogo: "https://storage.test/member-logo",
        }),
      });
      return vi.fn();
    });

    subscribeToDiscoverableCompany("company-123", callback);

    expect(firebaseMocks.doc).toHaveBeenCalledWith(
      firebaseMocks.db,
      "discoverableCompanies",
      "company-123",
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        companyBanner: "https://storage.test/member-banner",
        companyLogo: "https://storage.test/member-logo",
      }),
    );
  });
});
