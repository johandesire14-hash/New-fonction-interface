import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EnterpriseSubscription } from "../mansa/types";
import {
  appendLocalSupportMessage,
  getLocalCompanyMemberCount,
  getLocalSupportConversation,
} from "../mansa/utils/localCommunityStore";
import { removeSubscription, saveSubscription } from "../mansa/utils/subscriptionsStorage";
import { loadDiscoverableCompanies } from "../mansa/utils/companyStorage";

const createFreeSubscription = (memberId: string): EnterpriseSubscription => ({
  id: `sub-company-demo-${memberId}`,
  companyId: "company-demo",
  companyName: "Entreprise de démonstration",
  productName: "Accès gratuit",
  priceDisplay: "Gratuit",
  status: "active",
  subscribedAt: new Date().toISOString(),
  includedApps: ["dashboard", "support"],
  telegramChannels: [],
  hasPaidOffer: false,
});

describe("local development community sync", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("counts separate free members once and removes them when they leave", () => {
    saveSubscription("alice@example.test", createFreeSubscription("alice"));
    saveSubscription("alice@example.test", createFreeSubscription("alice-again"));
    saveSubscription("bob@example.test", createFreeSubscription("bob"));

    expect(getLocalCompanyMemberCount("company-demo")).toBe(2);

    removeSubscription("alice@example.test", "company-demo");
    expect(getLocalCompanyMemberCount("company-demo")).toBe(1);
  });

  it("does not count a visitor preview as a joined member", () => {
    const preview = {
      ...createFreeSubscription("preview"),
      id: "preview-company-demo",
      isCommunityPreview: true,
      hasJoined: false,
    };
    saveSubscription("preview@example.test", preview);

    expect(getLocalCompanyMemberCount("company-demo")).toBe(0);
  });

  it("rebuilds the local member count from existing account subscription storage", () => {
    window.localStorage.setItem(
      "mansa_enterprise_subscriptions_legacy@example.test",
      JSON.stringify([createFreeSubscription("legacy")]),
    );

    expect(getLocalCompanyMemberCount("company-demo")).toBe(1);
  });

  it("shows the member count on the locally discoverable creator company", async () => {
    window.localStorage.setItem(
      "mansa_companies_creator@example.test",
      JSON.stringify([
        {
          id: "company-demo",
          ownerUid: "creator@example.test",
          name: "Entreprise de démonstration",
          description: "Communauté de test",
          acceptedPayments: [],
          primaryCurrency: "XOF",
          createdAt: new Date().toISOString(),
          discoverable: true,
        },
      ]),
    );
    saveSubscription("alice@example.test", createFreeSubscription("alice"));

    const companies = await loadDiscoverableCompanies();
    expect(companies.find((company) => company.id === "company-demo")?.membersCount).toBe(1);
  });

  it("persists member messages and creator replies in the same conversation", () => {
    const updateListener = vi.fn();
    window.addEventListener("mansa_support_conversations_updated", updateListener);
    appendLocalSupportMessage({
      companyId: "company-demo",
      memberEmail: "alice@example.test",
      memberName: "Alice",
      sender: "member",
      text: "Bonjour, j’ai besoin d’aide.",
    });
    appendLocalSupportMessage({
      companyId: "company-demo",
      memberEmail: "alice@example.test",
      memberName: "Alice",
      sender: "creator",
      text: "Bonjour Alice, je regarde cela.",
    });

    const conversation = getLocalSupportConversation("company-demo", "ALICE@example.test");
    expect(conversation?.messages.map((message) => message.sender)).toEqual(["member", "creator"]);
    expect(conversation?.messages).toHaveLength(2);
    expect(updateListener).toHaveBeenCalledTimes(2);
    window.removeEventListener("mansa_support_conversations_updated", updateListener);
  });
});
