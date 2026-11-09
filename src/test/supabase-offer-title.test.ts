import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock, fromMock, upsertMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  fromMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock("@/mansa/services/supabase", () => ({
  supabase: {
    auth: { getUser: getUserMock },
    from: fromMock,
  },
}));

import {
  mapOfferRowToPlatformOffer,
  upsertOfferToSupabase,
  type OfferRow,
} from "@/mansa/services/supabaseOfferService";

describe("Supabase offer title consistency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: "creator-1" } } });
    fromMock.mockReturnValue({ upsert: upsertMock });
    upsertMock.mockResolvedValue({ error: null });
  });

  it("writes name and title from the same product name", async () => {
    await upsertOfferToSupabase({
      id: "offer-1",
      companyId: "community-1",
      name: "  Bot  ",
      priceAmount: 0,
      pricingType: "free",
      includedApps: [],
    });

    const [payload] = upsertMock.mock.calls[0];
    expect(payload).toMatchObject({ name: "Bot", title: "Bot" });
  });

  it("falls back to name when an older row has a NULL title", () => {
    const offer = mapOfferRowToPlatformOffer({
      id: "offer-legacy",
      creator_id: "creator-1",
      company_id: "community-1",
      name: "Bot",
      title: null,
      description: null,
      price_amount: 0,
      currency: "XOF",
      pricing_type: "free",
      billing_cycle: "one_time",
      status: "active",
      included_apps: [],
      image_url: null,
    } satisfies OfferRow);

    expect(offer.title).toBe("Bot");
  });
});
