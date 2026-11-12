import { supabase } from "./supabase";
import type { FirestoreUserProfile } from "./dbService";

export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  handle: string | null;
  bio: string | null;
  avatar_url: string | null;
  country: string | null;
  currency: string | null;
  settings: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export const mapProfileRowToUserProfile = (row: ProfileRow): FirestoreUserProfile => {
  const name = row.display_name || row.email?.split("@")[0] || "Créateur";
  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "MA";

  const settings = (row.settings || {}) as Record<string, any>;

  return {
    uid: row.id,
    email: row.email || "",
    displayName: name,
    avatarInitials: initials,
    photoURL: row.avatar_url || undefined,
    handle: row.handle || undefined,
    bio: row.bio || "",
    country: row.country || "Côte d’Ivoire",
    currency: row.currency || "XOF",
    storeName: settings.storeName,
    storeTagline: settings.storeTagline,
    supportEmail: settings.supportEmail,
    storeCurrency: settings.storeCurrency || row.currency || "XOF",
    showTotalEarned: settings.showTotalEarned !== false,
    showLocation: settings.showLocation !== false,
    showOwnedBusinesses: settings.showOwnedBusinesses !== false,
    showOwnedWhops: settings.showOwnedWhops !== false,
    showJoinedWhops: settings.showJoinedWhops !== false,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
};

export async function fetchUserProfile(userId: string): Promise<FirestoreUserProfile | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return mapProfileRowToUserProfile(data);
}

export async function updateUserProfileInSupabase(
  userId: string,
  profile: Partial<FirestoreUserProfile>,
): Promise<FirestoreUserProfile | null> {
  if (!userId) throw new Error("ID utilisateur manquant.");

  const payload: Partial<ProfileRow> = {};
  if (profile.displayName !== undefined) payload.display_name = profile.displayName;
  if (profile.email !== undefined) payload.email = profile.email;
  if (profile.handle !== undefined) payload.handle = profile.handle;
  if (profile.bio !== undefined) payload.bio = profile.bio;
  if (profile.country !== undefined) payload.country = profile.country;
  if (profile.currency !== undefined) payload.currency = profile.currency;
  if (profile.photoURL !== undefined) payload.avatar_url = profile.photoURL;

  const currentProfile = await fetchUserProfile(userId);
  const currentSettings = currentProfile
    ? {
        storeName: currentProfile.storeName,
        storeTagline: currentProfile.storeTagline,
        supportEmail: currentProfile.supportEmail,
        storeCurrency: currentProfile.storeCurrency,
        showTotalEarned: currentProfile.showTotalEarned,
        showLocation: currentProfile.showLocation,
        showOwnedBusinesses: currentProfile.showOwnedBusinesses,
        showOwnedWhops: currentProfile.showOwnedWhops,
        showJoinedWhops: currentProfile.showJoinedWhops,
      }
    : {};

  payload.settings = {
    ...currentSettings,
    ...(profile.storeName !== undefined ? { storeName: profile.storeName } : {}),
    ...(profile.storeTagline !== undefined ? { storeTagline: profile.storeTagline } : {}),
    ...(profile.supportEmail !== undefined ? { supportEmail: profile.supportEmail } : {}),
    ...(profile.storeCurrency !== undefined ? { storeCurrency: profile.storeCurrency } : {}),
    ...(profile.showTotalEarned !== undefined ? { showTotalEarned: profile.showTotalEarned } : {}),
    ...(profile.showLocation !== undefined ? { showLocation: profile.showLocation } : {}),
    ...(profile.showOwnedBusinesses !== undefined
      ? { showOwnedBusinesses: profile.showOwnedBusinesses }
      : {}),
    ...(profile.showOwnedWhops !== undefined ? { showOwnedWhops: profile.showOwnedWhops } : {}),
    ...(profile.showJoinedWhops !== undefined ? { showJoinedWhops: profile.showJoinedWhops } : {}),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...payload }, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("Erreur mise à jour profil Supabase:", error);
    throw new Error("Impossible d’enregistrer ces modifications. Réessayez.");
  }

  return mapProfileRowToUserProfile(data);
}
