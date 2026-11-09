import { beforeEach, describe, expect, it, vi } from "vitest";

const { joinCommunityRpc, claimFreeOfferRpc } = vi.hoisted(() => ({
  joinCommunityRpc: vi.fn(),
  claimFreeOfferRpc: vi.fn(),
}));

vi.mock("@/mansa/services/supabaseCommunityService", () => ({
  joinCommunityRpc,
}));

vi.mock("@/mansa/services/supabaseOfferService", () => ({
  claimFreeOfferRpc,
  fetchCreatorOffersFromSupabase: vi.fn(),
  fetchCompanyOffersFromSupabase: vi.fn(),
  upsertOfferToSupabase: vi.fn(),
  deleteOfferFromSupabase: vi.fn(),
}));

import { persistFreeMemberEntitlement } from "@/mansa/services/dbService";

describe("free offer membership persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    joinCommunityRpc.mockResolvedValue(undefined);
    claimFreeOfferRpc.mockResolvedValue(undefined);
  });

  it("joins the community before claiming the free offer", async () => {
    await persistFreeMemberEntitlement({
      memberUid: "member-1",
      companyId: "community-1",
      productId: "offer-1",
    });

    expect(joinCommunityRpc).toHaveBeenCalledWith("community-1");
    expect(claimFreeOfferRpc).toHaveBeenCalledWith("offer-1");
    expect(joinCommunityRpc.mock.invocationCallOrder[0]).toBeLessThan(
      claimFreeOfferRpc.mock.invocationCallOrder[0],
    );
  });

  it("does not claim the offer if joining the community fails", async () => {
    joinCommunityRpc.mockRejectedValueOnce(new Error("join failed"));

    await expect(
      persistFreeMemberEntitlement({
        memberUid: "member-1",
        companyId: "community-1",
        productId: "offer-1",
      }),
    ).rejects.toThrow("join failed");

    expect(claimFreeOfferRpc).not.toHaveBeenCalled();
  });
});
