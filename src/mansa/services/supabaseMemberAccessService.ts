import type { Company, CreatorPlatformOffer, EnterpriseSubscription } from "../types";
import { fetchCommunityByIdStrict, fetchMemberCommunities } from "./supabaseCommunityService";
import {
  fetchCompanyOffersFromSupabase,
  fetchMemberEntitlements,
  type MemberEntitlementRow,
} from "./supabaseOfferService";

export interface MemberAccessSnapshot {
  communities: Company[];
  subscriptions: EnterpriseSubscription[];
  unlockedOfferIds: string[];
}

const unique = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

const isActiveEntitlement = (entitlement: MemberEntitlementRow): boolean => {
  if (!["free", "paid", "trial"].includes(String(entitlement.status))) return false;

  const expiry =
    entitlement.expires_at ||
    entitlement.expiresAt ||
    entitlement.valid_until ||
    entitlement.ends_at ||
    entitlement.trial_ends_at;
  return !expiry || new Date(expiry).getTime() > Date.now();
};

const buildSubscription = (
  community: Company,
  offers: CreatorPlatformOffer[],
  entitlements: MemberEntitlementRow[],
): EnterpriseSubscription => {
  const activeEntitlements = entitlements.filter(isActiveEntitlement);
  const unlockedOfferIds = unique(activeEntitlements.map((item) => item.offer_id));
  const authorizedOffers = offers.filter((offer) => unlockedOfferIds.includes(offer.id));
  const firstOffer = authorizedOffers[0];
  const includedApps = unique([
    "dashboard",
    "support",
    ...authorizedOffers.flatMap((offer) => offer.includedApps || []),
  ]);

  return {
    id: community.id,
    companyId: community.id,
    companyName: community.name,
    companyInitials: community.logoInitials || community.name.slice(0, 2).toUpperCase(),
    ...(community.companyLogo ? { companyLogo: community.companyLogo } : {}),
    ...(community.companyBanner ? { companyBanner: community.companyBanner } : {}),
    ...(community.colorGradient ? { companyGradient: community.colorGradient } : {}),
    productName: firstOffer?.title || "Adhésion à la communauté",
    ...(firstOffer?.id ? { productId: firstOffer.id } : {}),
    priceDisplay: firstOffer?.priceDisplay || "Gratuit",
    status: "active",
    subscribedAt: "Membre depuis Supabase",
    includedApps,
    unlockedProductIds: unlockedOfferIds,
    purchasedOfferIds: unlockedOfferIds,
    hasPaidOffer: activeEntitlements.some((item) => item.status === "paid"),
    telegramChannels: authorizedOffers.flatMap((offer) => offer.telegramChannels || []),
    discordChannels: authorizedOffers.flatMap((offer) => offer.discordChannels || []),
    ebooks: authorizedOffers.flatMap((offer) => offer.ebooks || []),
    courses: authorizedOffers.flatMap((offer) => offer.courses || []),
    customResources: authorizedOffers.flatMap((offer) => offer.customResources || []),
    digitalFiles: authorizedOffers.flatMap((offer) => offer.digitalFiles || []),
    courseModules: authorizedOffers.flatMap((offer) => offer.courseModules || []),
    hasJoined: true,
    creatorName: community.name,
    description: community.description,
  };
};

export function buildMemberAccessSnapshot(input: {
  communities: Company[];
  offersByCommunity: Record<string, CreatorPlatformOffer[]>;
  entitlements: MemberEntitlementRow[];
}): MemberAccessSnapshot {
  const activeEntitlements = input.entitlements.filter(isActiveEntitlement);
  const unlockedOfferIds = unique(activeEntitlements.map((item) => item.offer_id));
  const entitlementsByCommunity = new Map<string, MemberEntitlementRow[]>();

  for (const entitlement of activeEntitlements) {
    const offer = Object.values(input.offersByCommunity)
      .flat()
      .find((candidate) => candidate.id === entitlement.offer_id);
    if (!offer) continue;
    const current = entitlementsByCommunity.get(offer.companyId) || [];
    entitlementsByCommunity.set(offer.companyId, [...current, entitlement]);
  }

  const subscriptions = input.communities.map((community) =>
    buildSubscription(
      community,
      input.offersByCommunity[community.id] || [],
      entitlementsByCommunity.get(community.id) || [],
    ),
  );

  return { communities: input.communities, subscriptions, unlockedOfferIds };
}

export async function fetchMemberAccessFromSupabase(
  memberId: string,
): Promise<MemberAccessSnapshot> {
  if (!memberId) return { communities: [], subscriptions: [], unlockedOfferIds: [] };

  const [communityIds, entitlements] = await Promise.all([
    fetchMemberCommunities(memberId),
    fetchMemberEntitlements(memberId),
  ]);

  const communities = await Promise.all(communityIds.map((id) => fetchCommunityByIdStrict(id)));
  const offersEntries = await Promise.all(
    communities.map(
      async (community) =>
        [community.id, await fetchCompanyOffersFromSupabase(community.id, true)] as const,
    ),
  );

  return buildMemberAccessSnapshot({
    communities,
    offersByCommunity: Object.fromEntries(offersEntries),
    entitlements,
  });
}
