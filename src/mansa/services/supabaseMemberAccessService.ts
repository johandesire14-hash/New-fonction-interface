import type { Company, CreatorPlatformOffer, EnterpriseSubscription } from "../types";
import {
  fetchCommunityByIdStrict,
  fetchMemberCommunityMemberships,
  type MemberCommunityMembership,
} from "./supabaseCommunityService";
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
  membership: MemberCommunityMembership,
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
    creatorId: community.ownerUid,
    companyName: community.name,
    companyInitials: community.logoInitials || community.name.slice(0, 2).toUpperCase(),
    ...(community.companyLogo ? { companyLogo: community.companyLogo } : {}),
    ...(community.companyBanner ? { companyBanner: community.companyBanner } : {}),
    ...(community.colorGradient ? { companyGradient: community.colorGradient } : {}),
    productName: firstOffer?.title || "Adhésion à la communauté",
    ...(firstOffer?.id ? { productId: firstOffer.id } : {}),
    priceDisplay: firstOffer?.priceDisplay || "Gratuit",
    status: "active",
    ...(membership.joinedAt ? { subscribedAt: membership.joinedAt } : {}),
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
  memberships: MemberCommunityMembership[];
}): MemberAccessSnapshot {
  const activeEntitlements = input.entitlements.filter(isActiveEntitlement);
  const unlockedOfferIds = unique(activeEntitlements.map((item) => item.offer_id));
  const entitlementsByCommunity = new Map<string, MemberEntitlementRow[]>();
  const membershipByCommunity = new Map(
    input.memberships.map((membership) => [membership.communityId, membership]),
  );

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
      membershipByCommunity.get(community.id) || { communityId: community.id, joinedAt: null },
    ),
  );

  return { communities: input.communities, subscriptions, unlockedOfferIds };
}

export async function fetchMemberAccessFromSupabase(
  memberId: string,
): Promise<MemberAccessSnapshot> {
  if (!memberId) return { communities: [], subscriptions: [], unlockedOfferIds: [] };

  const [memberships, entitlements] = await Promise.all([
    fetchMemberCommunityMemberships(memberId),
    fetchMemberEntitlements(memberId),
  ]);

  const communities = await Promise.all(
    memberships.map(({ communityId }) => fetchCommunityByIdStrict(communityId)),
  );
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
    memberships,
  });
}
