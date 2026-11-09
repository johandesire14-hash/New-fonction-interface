import { describe, expect, it } from "vitest";
import { getVisibleIncludedAppNames } from "@/mansa/utils/memberAppAccess";

describe("getVisibleIncludedAppNames", () => {
  it("shows only apps included in offers owned by the member", () => {
    const visibleApps = getVisibleIncludedAppNames({
      isCompanyOwner: false,
      subscriptionIncludedApps: ["dashboard", "support", "Telegram", "Discord", "Cours & formations"],
      companyOffers: [
        { includedApps: ["Telegram", "Fichiers"] },
        { includedApps: ["Discord", "Cours & formations"] },
      ],
      memberOwnedOffers: [{ includedApps: ["Telegram", "Fichiers"] }],
    });

    expect(visibleApps).toEqual(["telegram", "fichiers"]);
    expect(visibleApps).not.toContain("discord");
    expect(visibleApps).not.toContain("cours & formations");
  });

  it("hides paid apps when no owned offer can be matched, even if stale subscription apps remain", () => {
    expect(
      getVisibleIncludedAppNames({
        isCompanyOwner: false,
        subscriptionIncludedApps: ["dashboard", "support", "Telegram", "Discord", "Fichiers"],
        companyOffers: [
          { includedApps: ["Telegram", "Fichiers"] },
          { includedApps: ["Discord"] },
        ],
        memberOwnedOffers: [],
      }),
    ).toEqual([]);
  });

  it("combines apps from multiple offers owned by the same member without duplicates", () => {
    expect(
      getVisibleIncludedAppNames({
        isCompanyOwner: false,
        memberOwnedOffers: [
          { includedApps: ["Telegram", "Fichiers"] },
          { includedApps: ["fichiers", "Cours & formations"] },
        ],
      }),
    ).toEqual(["telegram", "fichiers", "cours & formations"]);
  });

  it("keeps company app configuration visible to the company owner", () => {
    expect(
      getVisibleIncludedAppNames({
        isCompanyOwner: true,
        subscriptionIncludedApps: ["dashboard", "support"],
        companyOffers: [
          { includedApps: ["Telegram", "Fichiers"] },
          { includedApps: ["Discord"] },
        ],
        memberOwnedOffers: [{ includedApps: ["Telegram"] }],
      }),
    ).toEqual(["dashboard", "support", "telegram", "fichiers", "discord"]);
  });
});
