import { supabase } from "./supabase";
import { fetchCommunityByIdStrict } from "./supabaseCommunityService";
import { fetchCompanyOffersFromSupabase } from "./supabaseOfferService";
import type { CreatorPlatformOffer } from "../types";

export interface CreatorMemberOfferAccess {
  id: string;
  title: string;
  status: string;
  pricingType: "free" | "paid";
  priceDisplay: string;
  expiresAt?: string | null;
}

export interface CreatorCommunityMember {
  memberId: string;
  communityId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  country?: string;
  joinedAt: string;
  status: "active" | "trial" | "cancelled" | "past_due";
  offers: CreatorMemberOfferAccess[];
}

interface CommunityMemberRow {
  member_id: string;
  community_id: string;
  joined_at?: string | null;
  created_at?: string | null;
}

interface EntitlementRow {
  member_id: string;
  offer_id: string;
  status: string;
  expires_at?: string | null;
  expiresAt?: string | null;
  valid_until?: string | null;
  ends_at?: string | null;
  trial_ends_at?: string | null;
}

interface ProfileRow {
  id: string;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  country?: string | null;
}

const activeStatuses = new Set(["free", "paid", "trial"]);

const getExpiry = (row: EntitlementRow): string | null =>
  row.expires_at || row.expiresAt || row.valid_until || row.ends_at || row.trial_ends_at || null;

const isActiveEntitlement = (row: EntitlementRow): boolean => {
  if (!activeStatuses.has(String(row.status))) return false;
  const expiry = getExpiry(row);
  return !expiry || new Date(expiry).getTime() > Date.now();
};

const throwReadError = (resource: string, error: { message?: string } | null): never => {
  const detail = error?.message || "erreur inconnue";
  throw new Error(`Impossible de lire ${resource} dans Supabase : ${detail}`);
};

const mapOfferAccess = (
  entitlement: EntitlementRow,
  offer: CreatorPlatformOffer,
): CreatorMemberOfferAccess => ({
  id: offer.id,
  title: offer.title,
  status: entitlement.status,
  pricingType: offer.pricingType,
  priceDisplay: offer.priceDisplay,
  ...(getExpiry(entitlement) ? { expiresAt: getExpiry(entitlement) } : {}),
});

export async function fetchCreatorCommunityMembers(
  creatorId: string,
  communityId: string,
): Promise<CreatorCommunityMember[]> {
  if (!creatorId || !communityId) return [];

  const community = await fetchCommunityByIdStrict(communityId);
  if (community.ownerUid !== creatorId) {
    throw new Error("Accès refusé : cette communauté n’appartient pas au créateur connecté.");
  }

  const { data: memberRows, error: memberError } = await supabase
    .from("community_members")
    .select("member_id, community_id, joined_at")
    .eq("community_id", communityId);
  if (memberError) throwReadError("les membres de la communauté", memberError);

  const rows = (memberRows || []).filter(
    (row) => row.member_id !== creatorId,
  ) as CommunityMemberRow[];
  if (rows.length === 0) return [];

  const memberIds = [...new Set(rows.map((row) => row.member_id).filter(Boolean))];
  const offers = await fetchCompanyOffersFromSupabase(communityId, false);
  const offerById = new Map(offers.map((offer) => [offer.id, offer]));

  const { data: entitlementRows, error: entitlementError } = await supabase
    .from("member_entitlements")
    .select("*")
    .in("member_id", memberIds);
  if (entitlementError) throwReadError("les droits des membres", entitlementError);

  const activeEntitlements = ((entitlementRows || []) as EntitlementRow[]).filter(
    (row) => offerById.has(row.offer_id) && isActiveEntitlement(row),
  );
  const entitlementsByMember = new Map<string, EntitlementRow[]>();
  for (const entitlement of activeEntitlements) {
    const current = entitlementsByMember.get(entitlement.member_id) || [];
    entitlementsByMember.set(entitlement.member_id, [...current, entitlement]);
  }

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url, country")
    .in("id", memberIds);
  if (profileError) throwReadError("les profils des membres", profileError);

  const profileById = new Map(
    ((profileRows || []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  );

  return rows.map((row) => {
    const profile = profileById.get(row.member_id);
    const entitlements = entitlementsByMember.get(row.member_id) || [];
    const hasPaid = entitlements.some((entitlement) => entitlement.status === "paid");
    const hasTrial = entitlements.some((entitlement) => entitlement.status === "trial");
    const joinedAt = row.joined_at || row.created_at || new Date().toISOString();
    const name = profile?.display_name || profile?.email?.split("@")[0] || row.member_id;

    return {
      memberId: row.member_id,
      communityId: row.community_id,
      name,
      email: profile?.email || row.member_id,
      ...(profile?.avatar_url ? { avatarUrl: profile.avatar_url } : {}),
      ...(profile?.country ? { country: profile.country } : {}),
      joinedAt,
      status: hasTrial ? "trial" : hasPaid ? "active" : "active",
      offers: entitlements
        .map((entitlement) => {
          const offer = offerById.get(entitlement.offer_id);
          return offer ? mapOfferAccess(entitlement, offer) : null;
        })
        .filter((offer): offer is CreatorMemberOfferAccess => Boolean(offer)),
    };
  });
}

export async function fetchCreatorOfferActiveUserCounts(
  creatorId: string,
): Promise<Record<string, number>> {
  if (!creatorId) return {};

  const { data: offers, error: offerError } = await supabase
    .from("offers")
    .select("id, company_id")
    .eq("creator_id", creatorId);
  if (offerError) throwReadError("les offres du créateur", offerError);

  const offerRows = (offers || []) as Array<{ id: string; company_id: string }>;
  const offerIds = offerRows.map((offer) => offer.id).filter(Boolean);
  if (offerIds.length === 0) return {};

  const { data: entitlements, error: entitlementError } = await supabase
    .from("member_entitlements")
    .select("member_id, offer_id, status, expires_at")
    .in("offer_id", offerIds);
  if (entitlementError) throwReadError("les droits des offres", entitlementError);

  const membersByOffer = new Map<string, Set<string>>();
  for (const entitlement of (entitlements || []) as EntitlementRow[]) {
    if (!isActiveEntitlement(entitlement) || entitlement.member_id === creatorId) continue;
    if (!membersByOffer.has(entitlement.offer_id)) {
      membersByOffer.set(entitlement.offer_id, new Set<string>());
    }
    membersByOffer.get(entitlement.offer_id)?.add(entitlement.member_id);
  }

  return Object.fromEntries(
    offerIds.map((offerId) => [offerId, membersByOffer.get(offerId)?.size || 0]),
  );
}
