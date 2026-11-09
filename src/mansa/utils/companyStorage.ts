// @ts-nocheck
import type { Company } from "../types";
import {
  fetchCreatorCommunities,
  fetchDiscoverableCommunities,
  saveCommunityToSupabase,
  deleteCommunityFromSupabase,
  fetchCommunityMemberCount,
} from "../services/supabaseCommunityService";

// In-memory runtime cache for seamless synchronous React component rendering
const runtimeCompaniesCache = new Map<string, Company[]>();
const discoverableCache = new Map<string, Company>();

// Cleanup any legacy localStorage company keys
const cleanupLegacyLocalStorage = (userKey?: string) => {
  if (typeof window === "undefined") return;
  try {
    if (userKey) {
      localStorage.removeItem(`mansa_companies_${userKey}`);
    }
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("mansa_companies_") || key.startsWith("afhub_companies_")) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage cleanup failures
  }
};

export function getSavedCompanies(userKey: string = "default"): Company[] {
  cleanupLegacyLocalStorage(userKey);
  return runtimeCompaniesCache.get(userKey) || [];
}

export function subscribeToDiscoverableCompany(
  companyId: string,
  callback: (company: Partial<Company> | null) => void,
): () => void {
  if (!companyId) return () => {};

  // Provide cached or fetch from Supabase
  const cached = discoverableCache.get(companyId);
  if (cached) callback(cached);

  const handleUpdate = () => {
    const updated = discoverableCache.get(companyId);
    if (updated) callback(updated);
  };

  if (typeof window !== "undefined") {
    window.addEventListener("mansa_discoverable_companies_updated", handleUpdate);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("mansa_discoverable_companies_updated", handleUpdate);
    }
  };
}

export async function loadCreatorCompanies(userUid: string): Promise<Company[]> {
  cleanupLegacyLocalStorage(userUid);
  if (!userUid) return getSavedCompanies(userUid);

  try {
    const remote = await fetchCreatorCommunities(userUid);
    // Enrich with member counts
    const enriched = await Promise.all(
      remote.map(async (comp) => {
        const count = await fetchCommunityMemberCount(comp.id);
        return { ...comp, membersCount: count };
      }),
    );

    runtimeCompaniesCache.set(userUid, enriched);
    for (const comp of enriched) {
      discoverableCache.set(comp.id, comp);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mansa_companies_updated", { detail: enriched }));
    }
    return enriched;
  } catch (error) {
    console.warn("Could not load creator communities from Supabase:", error);
    return getSavedCompanies(userUid);
  }
}

export async function loadDiscoverableCompanies(): Promise<Company[]> {
  cleanupLegacyLocalStorage();
  try {
    const remote = await fetchDiscoverableCommunities();
    const enriched = await Promise.all(
      remote.map(async (comp) => {
        const count = await fetchCommunityMemberCount(comp.id);
        const item = { ...comp, membersCount: count };
        discoverableCache.set(comp.id, item);
        return item;
      }),
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("mansa_discoverable_companies_updated"));
    }
    return enriched;
  } catch (error) {
    console.warn("Could not load discoverable communities from Supabase:", error);
    return Array.from(discoverableCache.values());
  }
}

export function saveCompany(
  userKey: string = "default",
  newCompany: Omit<Company, "id" | "createdAt"> & { id?: string },
): { companies: Company[]; created: Company; persisted: Promise<void> } {
  cleanupLegacyLocalStorage(userKey);
  const current = getSavedCompanies(userKey);
  const initials =
    newCompany.logoInitials ||
    (newCompany.name
      ? newCompany.name
          .trim()
          .split(/\s+/)
          .map((w) => w[0]?.toUpperCase() || "")
          .slice(0, 2)
          .join("") || "EN"
      : "EN");

  const gradients = [
    "from-emerald-600 via-teal-700 to-black",
    "from-blue-600 via-indigo-800 to-black",
    "from-purple-600 via-pink-800 to-black",
    "from-amber-600 via-orange-800 to-black",
    "from-rose-600 via-red-800 to-black",
    "from-cyan-600 via-blue-800 to-black",
  ];
  const chosenGradient = newCompany.colorGradient || gradients[current.length % gradients.length];

  const fullCompany: Company = {
    id: newCompany.id || `comp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    ownerUid: userKey,
    name: newCompany.name.trim(),
    description: newCompany.description.trim(),
    acceptedPayments:
      newCompany.acceptedPayments && newCompany.acceptedPayments.length > 0
        ? newCompany.acceptedPayments
        : ["wave", "orange_money", "mtn_momo", "card"],
    primaryCurrency: newCompany.primaryCurrency || "XOF",
    logoInitials: initials,
    colorGradient: chosenGradient,
    supportEmail: newCompany.supportEmail || "",
    supportAutoReplyEnabled: newCompany.supportAutoReplyEnabled ?? true,
    supportAutoReplyMessage:
      newCompany.supportAutoReplyMessage ||
      "Bonjour ! Merci d'avoir contacté notre équipe. Nous avons bien reçu votre message et nous vous répondrons dans les plus brefs délais.",
    companyBanner:
      newCompany.companyBanner ||
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1800&q=85",
    companyLogo: newCompany.companyLogo || "",
    socialLinks: newCompany.socialLinks || {},
    discoverable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = [fullCompany, ...current.filter((c) => c.id !== fullCompany.id)];
  runtimeCompaniesCache.set(userKey, updated);
  discoverableCache.set(fullCompany.id, fullCompany);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mansa_companies_updated", { detail: updated }));
    window.dispatchEvent(new Event("mansa_discoverable_companies_updated"));
  }

  const persisted = saveCommunityToSupabase(fullCompany).then(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("mansa_discoverable_companies_updated"));
    }
  });

  return { companies: updated, created: fullCompany, persisted };
}

export function updateCompany(userKey: string = "default", updatedCompany: Company): Company[] {
  cleanupLegacyLocalStorage(userKey);
  const current = getSavedCompanies(userKey);
  const fullUpdated: Company = {
    ...updatedCompany,
    ownerUid: updatedCompany.ownerUid || userKey,
    updatedAt: new Date().toISOString(),
  };

  const updated = current.map((c) => (c.id === fullUpdated.id ? fullUpdated : c));
  runtimeCompaniesCache.set(userKey, updated);
  discoverableCache.set(fullUpdated.id, fullUpdated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mansa_companies_updated", { detail: updated }));
  }

  void saveCommunityToSupabase(fullUpdated).catch((err) =>
    console.warn("Company Supabase update failed:", err),
  );

  return updated;
}

export function updateCompanyAutoReply(
  userKey: string = "default",
  companyId: string,
  config: {
    enabled: boolean;
    message: string;
  },
): { companies: Company[]; updatedCompany: Company | null } {
  cleanupLegacyLocalStorage(userKey);
  const current = getSavedCompanies(userKey);
  let updatedCompany: Company | null = null;
  const updated = current.map((c) => {
    if (c.id === companyId) {
      updatedCompany = {
        ...c,
        supportAutoReplyEnabled: config.enabled,
        supportAutoReplyMessage: config.message,
        updatedAt: new Date().toISOString(),
      };
      return updatedCompany;
    }
    return c;
  });

  if (updatedCompany) {
    runtimeCompaniesCache.set(userKey, updated);
    discoverableCache.set(companyId, updatedCompany);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mansa_companies_updated", { detail: updated }));
      window.dispatchEvent(
        new CustomEvent("mansa_autoreply_updated", {
          detail: { companyId, enabled: config.enabled, message: config.message },
        }),
      );
    }

    void saveCommunityToSupabase(updatedCompany).catch((err) =>
      console.warn("Notice: Supabase company auto-reply update:", err),
    );
  }

  return { companies: updated, updatedCompany };
}

export function updateCompanyBranding(
  userKey: string = "default",
  companyId: string,
  branding: {
    companyBanner?: string;
    companyLogo?: string;
    name?: string;
    description?: string;
    socialLinks?: Record<string, string>;
  },
): { companies: Company[]; updatedCompany: Company | null; persisted: Promise<void> } {
  cleanupLegacyLocalStorage(userKey);
  const current = getSavedCompanies(userKey);
  let updatedItem: Company | null = null;
  const updated = current.map((c) => {
    if (c.id === companyId) {
      updatedItem = {
        ...c,
        ...branding,
        updatedAt: new Date().toISOString(),
      };
      return updatedItem;
    }
    return c;
  });

  if (updatedItem) {
    runtimeCompaniesCache.set(userKey, updated);
    discoverableCache.set(companyId, updatedItem);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mansa_companies_updated", { detail: updated }));
      window.dispatchEvent(
        new CustomEvent("mansa_company_branding_changed", { detail: { companyId, branding } }),
      );
    }

    const persisted = saveCommunityToSupabase(updatedItem).catch((error) => {
      console.error("Unable to persist company branding update to Supabase:", error);
      throw error;
    });

    return { companies: updated, updatedCompany: updatedItem, persisted };
  }

  return { companies: updated, updatedCompany: null, persisted: Promise.resolve() };
}

export function deleteCompany(userKey: string = "default", companyId: string): Company[] {
  cleanupLegacyLocalStorage(userKey);
  const current = getSavedCompanies(userKey);
  const updated = current.filter((c) => c.id !== companyId);
  runtimeCompaniesCache.set(userKey, updated);
  discoverableCache.delete(companyId);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mansa_companies_updated", { detail: updated }));
    window.dispatchEvent(new Event("mansa_discoverable_companies_updated"));
  }

  void deleteCommunityFromSupabase(companyId).catch((err) =>
    console.warn("Company Supabase delete failed:", err),
  );

  return updated;
}
