import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchCommunityByIdMock, getUserMock, fromMock, upsertMock } = vi.hoisted(() => ({
  fetchCommunityByIdMock: vi.fn(),
  getUserMock: vi.fn(),
  fromMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock("@/mansa/services/supabaseCommunityService", () => ({
  fetchCommunityById: fetchCommunityByIdMock,
}));

vi.mock("@/mansa/services/supabase", () => ({
  supabase: {
    auth: { getUser: getUserMock },
    from: fromMock,
  },
}));

import {
  fetchCompanyOffersFromSupabase,
  upsertOfferToSupabase,
} from "@/mansa/services/supabaseOfferService";

const offerRow = {
  id: "offer-price",
  creator_id: "creator-1",
  company_id: "community-1",
  name: "Produit premium",
  title: "Produit premium",
  description: "Accès au produit",
  price_amount: 1250,
  currency: "EUR",
  pricing_type: "paid",
  billing_cycle: "monthly",
  status: "active",
  included_apps: [],
  image_url: null,
  created_at: "2026-01-01T00:00:00.000Z",
};

const makeQuery = (response: { data: any; error: null }) => {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => Promise.resolve(response)),
    upsert: upsertMock,
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(response).then(resolve, reject),
  };
  return query;
};

describe("community currency for offers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchCommunityByIdMock.mockResolvedValue({ primaryCurrency: "XOF" });
    getUserMock.mockResolvedValue({ data: { user: { id: "creator-1" } } });
    upsertMock.mockResolvedValue({ error: null });
    fromMock.mockImplementation((table: string) =>
      makeQuery({ data: table === "offers" ? [offerRow] : [], error: null }),
    );
  });

  it("formats member offer prices using the community currency, not a stale EUR row", async () => {
    const offers = await fetchCompanyOffersFromSupabase("community-1");

    expect(offers[0].currency).toBe("XOF");
    expect(offers[0].priceDisplay).toBe("1250 FCFA / mois");
  });

  it("writes the community primary currency even if a caller passes EUR", async () => {
    await upsertOfferToSupabase({
      id: "offer-price",
      companyId: "community-1",
      name: "Produit premium",
      priceAmount: 1250,
      currency: "EUR",
      pricingType: "paid",
      billingCycle: "monthly",
      includedApps: [],
    });

    const [payload] = upsertMock.mock.calls[0];
    expect(payload.currency).toBe("XOF");
  });
});
