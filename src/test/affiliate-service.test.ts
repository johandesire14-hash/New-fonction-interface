import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDocsMock, getDocMock, runTransactionMock, writtenDocs } = vi.hoisted(() => ({
  getDocsMock: vi.fn(),
  getDocMock: vi.fn(),
  runTransactionMock: vi.fn(),
  writtenDocs: [] as Array<{
    ref: { collectionName: string; id: string };
    data: Record<string, unknown>;
  }>,
}));

vi.mock("../mansa/services/firebase", () => ({
  db: { testFirestore: true },
  collection: (_db: unknown, collectionName: string) => ({ collectionName }),
  doc: (_db: unknown, collectionName: string, id: string) => ({ collectionName, id }),
  getDoc: getDocMock,
  getDocs: getDocsMock,
  query: (source: { collectionName: string }) => source,
  where: (...args: unknown[]) => args,
  runTransaction: runTransactionMock,
  serverTimestamp: () => "SERVER_TIMESTAMP",
}));

import {
  createOrGetAffiliateLink,
  getAffiliateEligibleProducts,
  resolvePublicAffiliateCode,
} from "../mansa/services/affiliateService";

const productData = {
  creatorId: "creator-uid",
  name: "Produit test",
  status: "active",
  affiliateCommissionRate: 8.5,
  pricingAmount: 25,
  currency: "EUR",
};
const productDoc = (id: string, data: Record<string, unknown>) => ({ id, data: () => data });
const snapshot = (id: string, data: Record<string, unknown> | null) => ({
  id,
  exists: () => data !== null,
  data: () => data,
});

function createMemoryTransaction(initialDocs: Map<string, Record<string, unknown>>) {
  const docs = new Map(initialDocs);
  const transaction = {
    get: vi.fn(async (ref: { collectionName: string; id: string }) =>
      snapshot(ref.id, docs.get(`${ref.collectionName}/${ref.id}`) ?? null),
    ),
    set: vi.fn((ref: { collectionName: string; id: string }, data: Record<string, unknown>) => {
      docs.set(`${ref.collectionName}/${ref.id}`, data);
      writtenDocs.push({ ref, data });
    }),
    update: vi.fn((ref: { collectionName: string; id: string }, data: Record<string, unknown>) => {
      const key = `${ref.collectionName}/${ref.id}`;
      const current = docs.get(key);
      if (!current) throw new Error("Cannot update missing test document");
      const updated = { ...current, ...data };
      docs.set(key, updated);
      writtenDocs.push({ ref, data });
    }),
  };
  return { docs, transaction };
}

beforeEach(() => {
  getDocsMock.mockReset();
  getDocMock.mockReset();
  runTransactionMock.mockReset();
  writtenDocs.length = 0;
});

describe("affiliateService", () => {
  it("lists only active products with numeric positive rates up to 100 owned by another UID", async () => {
    getDocsMock.mockResolvedValue({
      docs: [
        productDoc("eligible", { ...productData, affiliateCommissionRate: 12.75 }),
        productDoc("own", {
          ...productData,
          creatorId: "affiliate-uid",
          affiliateCommissionRate: 30,
        }),
        productDoc("zero", { ...productData, affiliateCommissionRate: 0 }),
        productDoc("negative", { ...productData, affiliateCommissionRate: -1 }),
        productDoc("over-100", { ...productData, affiliateCommissionRate: 110 }),
        productDoc("text-rate", { ...productData, affiliateCommissionRate: "12" }),
        productDoc("draft", { ...productData, status: "draft", affiliateCommissionRate: 20 }),
      ],
    });

    const products = await getAffiliateEligibleProducts("affiliate-uid");
    expect(
      products.map(({ id, affiliateCommissionRate }) => [id, affiliateCommissionRate]),
    ).toEqual([["eligible", 12.75]]);
    expect(getDocsMock).toHaveBeenCalledOnce();
  });

  it("creates one persistent code keyed by affiliate and product using the current product rate", async () => {
    const { docs, transaction } = createMemoryTransaction(
      new Map([["products/product-42", productData]]),
    );
    runTransactionMock.mockImplementation(
      async (_db: unknown, callback: (tx: unknown) => unknown) => callback(transaction),
    );

    const first = await createOrGetAffiliateLink("firebase-uid-abc", {
      id: "product-42",
      affiliateCommissionRate: 8.5,
    });
    const writesAfterFirst = writtenDocs.length;
    const second = await createOrGetAffiliateLink("firebase-uid-abc", {
      id: "product-42",
      affiliateCommissionRate: 8.5,
    });

    expect(first).toMatchObject({
      affiliateUid: "firebase-uid-abc",
      productId: "product-42",
      commissionRate: 8.5,
    });
    expect(first.code).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(second).toMatchObject({ id: first.id, code: first.code, commissionRate: 8.5 });
    expect(writtenDocs).toHaveLength(writesAfterFirst);
    expect(writtenDocs.map(({ ref }) => ref.collectionName).sort()).toEqual([
      "affiliateCodes",
      "affiliateLinkRefs",
      "affiliateLinks",
    ]);
    expect(first.id).toMatch(/^[a-f0-9]{64}$/);
    const savedLink = docs.get(`affiliateLinks/${first.id}`)!;
    expect(savedLink).toMatchObject({
      affiliateUid: "firebase-uid-abc",
      productId: "product-42",
      code: first.code,
      commissionRate: 8.5,
    });
    expect(savedLink).not.toHaveProperty("handle");
    expect(savedLink).not.toHaveProperty("displayName");
    const publicCode = docs.get(`affiliateCodes/${first.code}`)!;
    expect(publicCode).toMatchObject({
      publicRef: savedLink["publicRef"],
      productId: "product-42",
      commissionRate: 8.5,
    });
    expect(publicCode).not.toHaveProperty("linkId");
    expect(docs.get(`affiliateLinkRefs/${String(savedLink["publicRef"])}`)).toMatchObject({
      linkId: first.id,
      affiliateUid: "firebase-uid-abc",
      productId: "product-42",
    });
  });

  it("refuses a stale displayed rate and never creates a creator's own affiliate link", async () => {
    const { transaction } = createMemoryTransaction(
      new Map([["products/product-42", { ...productData, affiliateCommissionRate: 10 }]]),
    );
    runTransactionMock.mockImplementation(
      async (_db: unknown, callback: (tx: unknown) => unknown) => callback(transaction),
    );
    await expect(
      createOrGetAffiliateLink("affiliate-uid", {
        id: "product-42",
        affiliateCommissionRate: 8,
      }),
    ).rejects.toThrow(/modifié le taux/i);
    expect(writtenDocs).toHaveLength(0);

    const ownProduct = createMemoryTransaction(
      new Map([["products/product-42", { ...productData, creatorId: "affiliate-uid" }]]),
    );
    runTransactionMock.mockImplementation(
      async (_db: unknown, callback: (tx: unknown) => unknown) => callback(ownProduct.transaction),
    );
    await expect(
      createOrGetAffiliateLink("affiliate-uid", {
        id: "product-42",
        affiliateCommissionRate: 8.5,
      }),
    ).rejects.toThrow(/n’est plus éligible/i);
    expect(writtenDocs).toHaveLength(0);
  });

  it("keeps the same link/code but updates its accepted rate only after the current rate is accepted", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(["affiliate-uid", "product-42"]));
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    const linkId = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const code = "A".repeat(32);
    const { docs, transaction } = createMemoryTransaction(
      new Map([
        ["products/product-42", { ...productData, affiliateCommissionRate: 12 }],
        [
          `affiliateLinks/${linkId}`,
          {
            affiliateUid: "affiliate-uid",
            productId: "product-42",
            creatorUid: "creator-uid",
            productName: "Produit test",
            commissionRate: 8.5,
            code,
            createdAt: "OLD",
            acceptedAt: "OLD",
          },
        ],
        [
          `affiliateCodes/${code}`,
          { linkId, productId: "product-42", commissionRate: 8.5, createdAt: "OLD" },
        ],
      ]),
    );
    runTransactionMock.mockImplementation(
      async (_db: unknown, callback: (tx: unknown) => unknown) => callback(transaction),
    );

    const result = await createOrGetAffiliateLink("affiliate-uid", {
      id: "product-42",
      affiliateCommissionRate: 12,
    });
    expect(result).toMatchObject({ id: linkId, code, commissionRate: 12 });
    expect(docs.get(`affiliateLinks/${linkId}`)?.["commissionRate"]).toBe(12);
    expect(docs.get(`affiliateCodes/${code}`)?.["commissionRate"]).toBe(12);
    expect(writtenDocs.map(({ ref }) => ref.collectionName).sort()).toEqual([
      "affiliateCodes",
      "affiliateLinkRefs",
      "affiliateLinks",
    ]);
  });

  it("resolves a public code from only the public code record and current active product", async () => {
    getDocMock
      .mockResolvedValueOnce(
        snapshot("B".repeat(32), {
          publicRef: "C".repeat(32),
          productId: "product-42",
          commissionRate: 8.5,
        }),
      )
      .mockResolvedValueOnce(snapshot("product-42", productData));

    const resolved = await resolvePublicAffiliateCode("B".repeat(32));
    expect(resolved).toMatchObject({
      product: { id: "product-42", name: "Produit test" },
      commissionRate: 8.5,
    });
    expect(getDocMock.mock.calls.map(([ref]) => ref.collectionName)).toEqual([
      "affiliateCodes",
      "products",
    ]);
    await expect(resolvePublicAffiliateCode("bad code")).resolves.toBeNull();
    expect(getDocMock).toHaveBeenCalledTimes(2);
  });
});
