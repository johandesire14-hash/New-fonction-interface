// @ts-nocheck
import type { EnterpriseSubscription } from "../types";
import {
  getMemberAuthorizedTelegramChannels,
  getMemberAuthorizedDiscordChannels,
  getMemberAuthorizedEbooks,
  getMemberAuthorizedCourses,
  getMemberAuthorizedOffers,
} from "./rightsAccessEngine";

// In-memory cache for fast synchronous React rendering without localStorage
const runtimeSubscriptionsCache = new Map<string, EnterpriseSubscription[]>();
const activityArchiveCache = new Map<string, EnterpriseSubscription[]>();

// Cleanup legacy localStorage keys
const cleanupLegacySubscriptionsStorage = (userKey: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`mansa_enterprise_subscriptions_${userKey}`);
    localStorage.removeItem(`mansa_left_enterprises_${userKey}`);
    localStorage.removeItem(`mansa_activity_archive_${userKey}`);
    localStorage.removeItem(`mansa_subscriptions_seeded_${userKey}`);
  } catch {
    // Ignore cleanup error
  }
};

export function deduplicateSubscriptions(subs: EnterpriseSubscription[]): EnterpriseSubscription[] {
  if (!Array.isArray(subs)) return [];
  const seen = new Set<string>();
  const result: EnterpriseSubscription[] = [];
  for (const sub of subs) {
    if (!sub) continue;
    const key = sub.id || sub.companyId;
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(sub);
    }
  }
  return result;
}

export function getSavedSubscriptions(userKey: string): EnterpriseSubscription[] {
  cleanupLegacySubscriptionsStorage(userKey);
  return runtimeSubscriptionsCache.get(userKey) || [];
}

export function saveSubscriptions(userKey: string, subs: EnterpriseSubscription[]): void {
  cleanupLegacySubscriptionsStorage(userKey);
  runtimeSubscriptionsCache.set(userKey, deduplicateSubscriptions(subs));
}

export function saveSubscription(
  userKey: string,
  newSub: EnterpriseSubscription,
): EnterpriseSubscription[] {
  cleanupLegacySubscriptionsStorage(userKey);
  const current = getSavedSubscriptions(userKey);
  const existsIndex = current.findIndex(
    (s) => s.id === newSub.id || s.companyId === newSub.companyId,
  );
  let updated: EnterpriseSubscription[];

  const compId = newSub.companyId || (existsIndex >= 0 ? current[existsIndex].companyId : "");

  if (existsIndex >= 0) {
    const prev = current[existsIndex];
    const mergedUnlockedProducts = Array.from(
      new Set([
        ...(prev.unlockedProductIds || []),
        ...(newSub.unlockedProductIds || []),
        ...(newSub.purchasedOfferIds || []),
      ]),
    );

    const authorizedTelegram = getMemberAuthorizedTelegramChannels(compId, mergedUnlockedProducts);
    const authorizedDiscord = getMemberAuthorizedDiscordChannels(compId, mergedUnlockedProducts);
    const authorizedEbooks = getMemberAuthorizedEbooks(compId, mergedUnlockedProducts);
    const authorizedCourses = getMemberAuthorizedCourses(compId, mergedUnlockedProducts);

    const authorizedOffers = getMemberAuthorizedOffers(compId, mergedUnlockedProducts);
    const derivedAppsSet = new Set<string>(["dashboard", "support"]);
    authorizedOffers.forEach((o) => {
      if (Array.isArray(o.includedApps)) {
        o.includedApps.forEach((a) => derivedAppsSet.add(a));
      }
    });

    const isPaid = Boolean(prev.hasPaidOffer || newSub.hasPaidOffer);

    const merged: EnterpriseSubscription = {
      ...prev,
      ...newSub,
      id: prev.id,
      companyId: compId,
      productName: newSub.hasPaidOffer
        ? prev.hasPaidOffer && prev.productName !== newSub.productName
          ? `${prev.productName} + ${newSub.productName}`
          : newSub.productName
        : prev.productName,
      priceDisplay: newSub.hasPaidOffer ? newSub.priceDisplay : prev.priceDisplay,
      hasPaidOffer: isPaid,
      includedApps: Array.from(derivedAppsSet),
      unlockedProductIds: mergedUnlockedProducts,
      purchasedOfferIds: mergedUnlockedProducts,
      telegramChannels: authorizedTelegram,
      discordChannels: authorizedDiscord,
      ebooks: authorizedEbooks,
      courses: authorizedCourses,
      discordInvite: authorizedDiscord[0]?.inviteLink || newSub.discordInvite || prev.discordInvite,
    };

    updated = [...current];
    updated[existsIndex] = merged;
  } else {
    const initialUnlocked = Array.from(
      new Set([...(newSub.unlockedProductIds || []), ...(newSub.purchasedOfferIds || [])]),
    );
    const authorizedTelegram = getMemberAuthorizedTelegramChannels(compId, initialUnlocked);
    const authorizedDiscord = getMemberAuthorizedDiscordChannels(compId, initialUnlocked);
    const authorizedEbooks = getMemberAuthorizedEbooks(compId, initialUnlocked);
    const authorizedCourses = getMemberAuthorizedCourses(compId, initialUnlocked);

    const authorizedOffers = getMemberAuthorizedOffers(compId, initialUnlocked);
    const derivedAppsSet = new Set<string>(["dashboard", "support"]);
    authorizedOffers.forEach((o) => {
      if (Array.isArray(o.includedApps)) {
        o.includedApps.forEach((a) => derivedAppsSet.add(a));
      }
    });

    const populatedSub: EnterpriseSubscription = {
      ...newSub,
      companyId: compId,
      unlockedProductIds: initialUnlocked,
      purchasedOfferIds: initialUnlocked,
      includedApps: Array.from(derivedAppsSet),
      telegramChannels: authorizedTelegram,
      discordChannels: authorizedDiscord,
      ebooks: authorizedEbooks,
      courses: authorizedCourses,
      hasPaidOffer: Boolean(newSub.hasPaidOffer),
    };

    updated = [populatedSub, ...current];
  }

  runtimeSubscriptionsCache.set(userKey, updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mansa_subscription_updated", { detail: newSub }));
  }

  return updated;
}

export function removeSubscription(userKey: string, targetId: string): EnterpriseSubscription[] {
  cleanupLegacySubscriptionsStorage(userKey);
  const current = getSavedSubscriptions(userKey);
  const removed = current.find((sub) => sub.id === targetId || sub.companyId === targetId);

  if (removed) {
    const archived = activityArchiveCache.get(userKey) || [];
    if (!archived.some((sub) => sub.id === removed.id || sub.companyId === removed.companyId)) {
      activityArchiveCache.set(userKey, [removed, ...archived]);
    }
  }

  const updated = current.filter((sub) => sub.id !== targetId && sub.companyId !== targetId);
  runtimeSubscriptionsCache.set(userKey, updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("mansa_subscription_updated", { detail: { removedId: targetId } }),
    );
  }
  return updated;
}

export function getArchivedSubscriptions(userKey: string): EnterpriseSubscription[] {
  cleanupLegacySubscriptionsStorage(userKey);
  return activityArchiveCache.get(userKey) || [];
}

export function cancelActiveSubscription(
  userKey: string,
  targetId: string,
): EnterpriseSubscription[] {
  cleanupLegacySubscriptionsStorage(userKey);
  const current = getSavedSubscriptions(userKey);
  const updated = current.map((sub) => {
    if (sub.id === targetId || sub.companyId === targetId) {
      return {
        ...sub,
        hasPaidOffer: false,
        status: "canceled" as const,
        productName: "Adhésion Simple (Gratuit)",
        priceDisplay: "0 FCFA",
        includedApps: ["dashboard", "support"],
        unlockedProductIds: [],
        purchasedOfferIds: [],
        telegramChannels: [],
        discordChannels: [],
        ebooks: [],
        courses: [],
        customResources: [],
      };
    }
    return sub;
  });

  runtimeSubscriptionsCache.set(userKey, updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("mansa_subscription_updated", { detail: { cancelledId: targetId } }),
    );
  }
  return updated;
}

export function updateSubscriptionBranding(
  userKey: string,
  targetId: string,
  branding: {
    companyBanner?: string;
    companyLogo?: string;
    companyName?: string;
    socialLinks?: Record<string, string>;
  },
): EnterpriseSubscription[] {
  cleanupLegacySubscriptionsStorage(userKey);
  const current = getSavedSubscriptions(userKey);
  const updated = current.map((sub) => {
    if (sub.id === targetId || sub.companyId === targetId) {
      return {
        ...sub,
        companyName: branding.companyName !== undefined ? branding.companyName : sub.companyName,
        companyLogo: branding.companyLogo !== undefined ? branding.companyLogo : sub.companyLogo,
        companyBanner:
          branding.companyBanner !== undefined ? branding.companyBanner : sub.companyBanner,
        socialLinks: branding.socialLinks || sub.socialLinks,
      };
    }
    return sub;
  });

  runtimeSubscriptionsCache.set(userKey, updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("mansa_subscription_updated", {
        detail: { companyId: targetId, ...branding },
      }),
    );
  }
  return updated;
}
