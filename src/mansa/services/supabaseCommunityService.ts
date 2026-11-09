import { supabase } from "./supabase";
import type { Company } from "../types";

export interface CommunityRow {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  currency: string | null;
  initials: string | null;
  color: string | null;
  logo_url: string | null;
  banner_url: string | null;
  is_discoverable: boolean | null;
  settings: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export const mapCommunityRowToCompany = (row: CommunityRow): Company => {
  const settings = (row.settings || {}) as Record<string, any>;
  return {
    id: row.id,
    ownerUid: row.owner_id,
    name: row.name || "",
    description: row.description || "",
    primaryCurrency: row.currency || "XOF",
    logoInitials: row.initials || "EN",
    colorGradient: row.color || "from-emerald-600 via-teal-700 to-black",
    companyLogo: row.logo_url || "",
    companyBanner: row.banner_url || "",
    discoverable: row.is_discoverable ?? true,
    acceptedPayments: Array.isArray(settings.acceptedPayments)
      ? settings.acceptedPayments
      : ["wave", "orange_money", "mtn_momo", "card"],
    supportEmail: settings.supportEmail || "",
    supportAutoReplyEnabled: settings.supportAutoReplyEnabled ?? true,
    supportAutoReplyMessage: settings.supportAutoReplyMessage || "",
    socialLinks: settings.socialLinks || {},
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  };
};

export const mapCompanyToCommunityPayload = (
  company: Company,
  currentUid?: string,
): Partial<CommunityRow> => {
  const ownerId = company.ownerUid || currentUid || "";
  // Exclude any KYC or banking data from settings as strictly specified
  const safeSettings = {
    acceptedPayments: company.acceptedPayments || ["wave", "orange_money", "mtn_momo", "card"],
    supportEmail: company.supportEmail || "",
    supportAutoReplyEnabled: company.supportAutoReplyEnabled ?? true,
    supportAutoReplyMessage: company.supportAutoReplyMessage || "",
    socialLinks: company.socialLinks || {},
  };

  return {
    id: company.id,
    owner_id: ownerId,
    name: company.name.trim(),
    description: company.description?.trim() || "",
    currency: company.primaryCurrency || "XOF",
    initials: company.logoInitials || "EN",
    color: company.colorGradient || "from-emerald-600 via-teal-700 to-black",
    logo_url: company.companyLogo || null,
    banner_url: company.companyBanner || null,
    is_discoverable: company.discoverable ?? true,
    settings: safeSettings,
  };
};

export async function fetchCreatorCommunities(ownerId: string): Promise<Company[]> {
  if (!ownerId) return [];
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Notice: fetchCreatorCommunities Supabase query:", error.message);
    return [];
  }
  return (data || []).map(mapCommunityRowToCompany);
}

export async function fetchDiscoverableCommunities(): Promise<Company[]> {
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("is_discoverable", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Notice: fetchDiscoverableCommunities Supabase query:", error.message);
    return [];
  }
  return (data || []).map(mapCommunityRowToCompany);
}

export async function fetchCommunityById(communityId: string): Promise<Company | null> {
  if (!communityId) return null;
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("id", communityId)
    .maybeSingle();

  if (error || !data) return null;
  return mapCommunityRowToCompany(data);
}

export async function saveCommunityToSupabase(company: Company): Promise<Company> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ownerId = company.ownerUid || user?.id;
  if (!ownerId) {
    throw new Error("Connectez-vous pour enregistrer votre communauté.");
  }

  const payload = mapCompanyToCommunityPayload(company, ownerId);
  const { data, error } = await supabase
    .from("communities")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("Erreur enregistrement communauté Supabase:", error);
    throw new Error("Impossible d'enregistrer la communauté : " + error.message);
  }

  return mapCommunityRowToCompany(data);
}

export async function deleteCommunityFromSupabase(communityId: string): Promise<void> {
  if (!communityId) return;
  const { error } = await supabase.from("communities").delete().eq("id", communityId);
  if (error) {
    console.error("Erreur suppression communauté Supabase:", error);
    throw new Error("Impossible de supprimer la communauté : " + error.message);
  }
}

/**
 * Rejoint une communauté via la fonction RPC public.join_community(p_community_id)
 * N'insère JAMAIS directement dans community_members côté membre
 */
export async function joinCommunityRpc(communityId: string): Promise<void> {
  if (!communityId) throw new Error("ID de communauté manquant.");
  const { error } = await supabase.rpc("join_community", {
    p_community_id: communityId,
  });
  if (error) {
    console.error("Erreur RPC join_community:", error);
    throw new Error("Impossible de rejoindre la communauté : " + error.message);
  }
}

export async function fetchMemberCommunities(memberId: string): Promise<string[]> {
  if (!memberId) return [];
  const { data, error } = await supabase
    .from("community_members")
    .select("community_id")
    .eq("member_id", memberId);

  if (error || !data) return [];
  return data.map((item) => item.community_id);
}

export async function fetchCommunityMemberCount(communityId: string): Promise<number> {
  if (!communityId) return 0;
  const { count, error } = await supabase
    .from("community_members")
    .select("*", { count: "exact", head: true })
    .eq("community_id", communityId);

  if (error || typeof count !== "number") return 0;
  return count;
}
