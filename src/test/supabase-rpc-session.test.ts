import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../mansa/services/supabase";
import { joinCommunityRpc } from "../mansa/services/supabaseCommunityService";
import { claimFreeOfferRpc } from "../mansa/services/supabaseOfferService";

describe("Supabase RPC session guards", () => {
  let getSessionSpy: ReturnType<typeof vi.spyOn>;
  let signOutSpy: ReturnType<typeof vi.spyOn>;
  let rpcSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getSessionSpy = vi.spyOn(supabase.auth, "getSession");
    signOutSpy = vi.spyOn(supabase.auth, "signOut").mockResolvedValue({ error: null } as any);
    rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({ data: null, error: null } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks both membership RPCs when getSession has no session", async () => {
    getSessionSpy.mockResolvedValue({ data: { session: null }, error: null } as any);

    await expect(joinCommunityRpc("community-1")).rejects.toThrow(
      "Votre session Supabase est absente",
    );
    await expect(claimFreeOfferRpc("offer-1")).rejects.toThrow(
      "Votre session Supabase est absente",
    );

    expect(rpcSpy).not.toHaveBeenCalled();
    expect(signOutSpy).toHaveBeenCalledWith({ scope: "local" });
  });

  it("blocks both membership RPCs when getSession returns an expired session", async () => {
    getSessionSpy.mockResolvedValue({
      data: {
        session: {
          user: { id: "member-1", email: "member@example.test" },
          access_token: "expired-token",
          expires_at: 1,
        },
      },
      error: null,
    } as any);

    await expect(joinCommunityRpc("community-1")).rejects.toThrow(
      "Votre session Supabase a expiré",
    );
    await expect(claimFreeOfferRpc("offer-1")).rejects.toThrow(
      "Votre session Supabase a expiré",
    );

    expect(rpcSpy).not.toHaveBeenCalled();
    expect(signOutSpy).toHaveBeenCalledTimes(2);
  });

  it("runs the RPCs with a current session", async () => {
    getSessionSpy.mockResolvedValue({
      data: {
        session: {
          user: { id: "member-1", email: "member@example.test" },
          access_token: "valid-token",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    } as any);

    await joinCommunityRpc("community-1");
    await claimFreeOfferRpc("offer-1");

    expect(rpcSpy).toHaveBeenNthCalledWith(1, "join_community", {
      p_community_id: "community-1",
    });
    expect(rpcSpy).toHaveBeenNthCalledWith(2, "claim_free_offer", {
      p_offer_id: "offer-1",
    });
  });
});
