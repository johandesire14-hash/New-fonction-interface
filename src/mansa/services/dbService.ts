// @ts-nocheck
import {
  db,
  storage,
  auth,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  deleteField,
  ref,
  uploadBytes,
  getDownloadURL,
} from "./firebase";
import { BusinessProject, CreatorPlatformOffer, LiveEvent, MarketplaceItem } from "../types";
import { safeStorage } from "../utils/storage";
import { getSavedCompanies } from "../utils/companyStorage";
import { filterPersonalTransactions } from "../utils/companyScope";
import { PRODUCTS_UPDATED_EVENT, dispatchProductUpdates } from "../utils/productUpdateEvents";
import { convertProjectToPlatformOffer, getOffersForCompany } from "../utils/rightsAccessEngine";
import {
  fetchCreatorOffersFromSupabase,
  fetchCompanyOffersFromSupabase,
  upsertOfferToSupabase,
  deleteOfferFromSupabase,
  claimFreeOfferRpc,
} from "./supabaseOfferService";
import { joinCommunityRpc } from "./supabaseCommunityService";
import { fetchUserProfile, updateUserProfileInSupabase } from "./supabaseProfileService";

export interface AccountPaymentMethodConfig {
  dialCode?: string;
  phone?: string;
  accountName?: string;
  bankName?: string;
  bankIbanRib?: string;
  bankAccountHolder?: string;
  identityAuthorized?: boolean;
}

export interface AccountPaymentSettings {
  includeDefaultPaymentMethods: boolean;
  paymentVerificationStatuses: Record<string, "not_configured" | "pending" | "configured">;
  methods: Record<string, AccountPaymentMethodConfig>;
}

export interface FirestoreUserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatarInitials: string;
  photoURL?: string;
  country?: string;
  currency?: string;
  handle?: string;
  bio?: string;
  birthDate?: string;
  showTotalEarned?: boolean;
  showLocation?: boolean;
  showOwnedBusinesses?: boolean;
  showOwnedWhops?: boolean;
  showJoinedWhops?: boolean;
  // Enterprise / Store settings
  storeName?: string;
  storeTagline?: string;
  supportEmail?: string;
  storeCurrency?: string;
  companyBanner?: string;
  companyLogo?: string;
  storeBanner?: string;
  storeLogo?: string;
  payoutMethod?: "wave" | "orange_momo" | "bank_uemoa" | "bank_cemac" | "crypto";
  momoNumber?: string;
  momoName?: string;
  bankName?: string;
  bankIbanRib?: string;
  bankAccountHolder?: string;
  accountPaymentSettings?: AccountPaymentSettings;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirestoreWorkforceMember {
  id: string;
  creatorId: string;
  companyId: string;
  name: string;
  role: string;
  rate: string;
  avatar: string;
  status: "active" | "standby";
  tasksCompleted: number;
  rating: number;
  createdAt: string;
}

export interface FirestorePartnerDeal {
  id: string;
  creatorId: string;
  companyId: string;
  partnerName: string;
  partnerLogo: string;
  partnerHandle: string;
  type: "co_branding" | "cross_promo" | "sponsor" | "tech_integration";
  typeLabel: string;
  description: string;
  contactEmail?: string;
  status: "active" | "pending" | "proposed";
  value: string;
  reach: string;
  startDate: string;
  createdAt: string;
}

export interface FirestoreProduct {
  id: string;
  creatorId: string;
  creatorEmail: string;
  creatorName: string;
  name: string;
  tagline?: string;
  description?: string;
  category: string;
  productType?: string;
  pricingAmount: number;
  pricingModel: "subscription" | "one_time" | "annual" | "free_upsell";
  currency: string;
  targetAudience?: string;
  status: "active" | "draft" | "paused";
  features: string[];
  techStack: string[];
  estimatedMonthlyRevenue?: number;
  affiliateCommissionRate: number;
  membersCount: number;
  conversionRate?: string;
  apps: string[];
  storeUrl: string;
  ctaText?: string;
  coverImage?: string;
  bannerUrl?: string;
  companyId?: string;
  companyName?: string;
  createdAt: string;
  updatedAt: string;
}

function mapFirestoreProduct(
  id: string,
  data: FirestoreProduct,
  privateContent: { digitalFiles?: unknown[]; courseModules?: unknown[] } = {},
): BusinessProject {
  return {
    id,
    creatorId: data.creatorId,
    name: data.name,
    tagline: data.tagline || data.description || "",
    category: data.category || "community",
    pricingAmount: data.pricingAmount || 0,
    pricingModel: data.pricingModel || "subscription",
    currency: data.currency || "XOF",
    targetAudience: data.targetAudience || "Membres & Clients",
    status: data.status || "active",
    features: data.features || [],
    techStack: data.techStack || ["Mansa Mobile Money", "Paiement Instantané"],
    estimatedMonthlyRevenue:
      data.estimatedMonthlyRevenue || (data.pricingAmount || 0) * (data.membersCount || 0),
    affiliateCommissionRate: data.affiliateCommissionRate ?? 30,
    membersCount: data.membersCount || 0,
    conversionRate: data.conversionRate || "0%",
    createdAt: data.createdAt || new Date().toISOString().split("T")[0],
    updatedAt: data.updatedAt || new Date().toISOString().split("T")[0],
    apps: data.apps || [],
    storeUrl: data.storeUrl || `mansa.af/p/${id}`,
    ctaText: data.ctaText,
    coverImage: data.coverImage,
    bannerUrl: data.bannerUrl,
    companyId: data.companyId,
    companyName: data.companyName,
    productType: data.productType,
    digitalFiles: privateContent.digitalFiles || [],
    courseModules: privateContent.courseModules || [],
  } as BusinessProject;
}

export interface FirestoreTransaction {
  id: string;
  creatorId: string;
  buyerName: string;
  buyerEmail: string;
  buyerLocation: string;
  productName: string;
  productId: string;
  amount: string;
  amountNumber: number;
  currency: string;
  paymentMethod: string;
  status: "completed" | "pending" | "failed";
  createdAt: string;
  timestamp?: any;
  customerName?: string;
  customerEmail?: string;
  companyId?: string;
  companyName?: string;
  storeName?: string;
  type?: "sale" | "affiliate" | "other" | "transfer" | "ad_spend";
}

export interface FirestoreCustomer {
  id: string;
  creatorId: string;
  name: string;
  email: string;
  companyId?: string;
  companyName?: string;
  country?: string;
  countryName?: string;
  countryFlag?: string;
  phone?: string;
  productName: string;
  productId?: string;
  amountSpent?: string;
  totalSpent?: number;
  totalSpentFormatted?: string;
  currency?: string;
  status: "active" | "cancelled" | "past_due" | "trial";
  joinedAt?: string;
  joinedDate?: string;
  discordUsername?: string;
}

export interface FirestoreCommunityMessage {
  id: string;
  creatorId: string;
  buyerName: string;
  buyerEmail: string;
  productName: string;
  text: string;
  sender: "buyer" | "creator" | "system";
  createdAt: string;
  time: string;
}

// Helper for local caching
const LOCAL_PRODUCTS_KEY = "mansa_saved_products_cache";
const creatorProductsCacheKey = (creatorId: string) => `${LOCAL_PRODUCTS_KEY}_${creatorId}`;

function getCreatorLocalProducts(creatorId: string): BusinessProject[] {
  if (!creatorId) return [];
  const scoped = getLocalItems<BusinessProject>(creatorProductsCacheKey(creatorId));
  // Import only legacy entries that explicitly identify this creator; never expose
  // anonymous products from the old shared cache to a different account.
  const legacy = getLocalItems<BusinessProject>(LOCAL_PRODUCTS_KEY).filter(
    (product) => product.creatorId === creatorId,
  );
  const merged = [...scoped];
  for (const product of legacy) {
    if (!merged.some((saved) => saved.id === product.id)) merged.push(product);
  }
  return merged;
}

function saveCreatorLocalProducts(creatorId: string, products: BusinessProject[]): void {
  saveLocalItems(creatorProductsCacheKey(creatorId), products);
}
const LOCAL_TRANSACTIONS_KEY = "mansa_saved_transactions_cache";
const LOCAL_CUSTOMERS_KEY = "mansa_saved_customers_cache";
const LOCAL_WORKFORCE_KEY = "mansa_saved_workforce_cache";
const LOCAL_PARTNERS_KEY = "mansa_saved_partners_cache";
const LOCAL_FAVORITES_KEY = "mansa_saved_favorites_cache";
const LOCAL_USER_PROFILE_KEY = "mansa_saved_user_profile_cache_";

function getLocalItems<T>(key: string): T[] {
  try {
    let raw = safeStorage.getItem(key);
    // Backward compatibility fallback for legacy afhub keys
    if (!raw && key.startsWith("mansa_")) {
      const legacyKey = key.replace("mansa_", "afhub_");
      raw = safeStorage.getItem(legacyKey);
      if (raw) {
        safeStorage.setItem(key, raw);
      }
    }
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalItems<T>(key: string, items: T[]) {
  try {
    safeStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.error("Local storage save error:", e);
  }
}

export async function uploadProjectAsset(file: File, scope: string): Promise<string> {
  if (storage) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const assetRef = ref(storage, `project-assets/${scope}/${Date.now()}-${safeName}`);
    const snapshot = await uploadBytes(assetRef, file, { contentType: file.type || undefined });
    return getDownloadURL(snapshot.ref);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Format de fichier non pris en charge."));
    reader.readAsDataURL(file);
  });
}

export async function saveProductPrivateContent(
  productId: string,
  creatorId: string,
  companyId: string,
  digitalFiles: unknown[],
  courseModules: unknown[],
): Promise<void> {
  const payload = {
    creatorId,
    companyId,
    digitalFiles,
    courseModules,
    updatedAt: new Date().toISOString(),
  };
  if (db) {
    const contentRef = doc(db, "productPrivateContent", productId);
    const current = await getDoc(contentRef);
    if (current.exists() && current.data().creatorId !== creatorId) {
      throw new Error("Vous ne pouvez pas modifier le contenu de cette offre.");
    }
    await setDoc(contentRef, payload, { merge: true });
  }
  const localProducts = getCreatorLocalProducts(creatorId);
  const index = localProducts.findIndex((product) => product.id === productId);
  if (index >= 0) {
    localProducts[index] = { ...localProducts[index], digitalFiles, courseModules };
    saveCreatorLocalProducts(creatorId, localProducts);
  }
  dispatchProductUpdates();
}

export async function loadDiscoverableProducts(): Promise<BusinessProject[]> {
  try {
    const { data: offersData, error } = await supabase
      .from("offers")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error || !offersData) return [];
    return offersData.map((row) => mapOfferRowToBusinessProject(row as any));
  } catch (error) {
    console.warn("Could not load discoverable products from Supabase:", error);
    return [];
  }
}

export async function joinAffiliateProgram(input: {
  affiliateUserId: string;
  affiliateCode: string;
  productId: string;
  ownerId: string;
  commissionRate: number;
}): Promise<void> {
  const membershipId = `${input.productId}_${input.affiliateUserId}`.replace(
    /[^a-zA-Z0-9_-]/g,
    "_",
  );
  const payload = { ...input, membershipId, joinedAt: new Date().toISOString() };
  if (db) await setDoc(doc(db, "affiliateMemberships", membershipId), payload, { merge: true });
  if (typeof window !== "undefined") {
    const key = "mansa_affiliate_memberships";
    const current = JSON.parse(window.localStorage.getItem(key) || "[]");
    window.localStorage.setItem(
      key,
      JSON.stringify([
        ...current.filter((item: any) => item.membershipId !== membershipId),
        payload,
      ]),
    );
  }
}

export async function getAffiliateMembership(
  productId: string,
  affiliateUserId: string,
): Promise<Record<string, unknown> | null> {
  const membershipId = `${productId}_${affiliateUserId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  if (db) {
    const snapshot = await getDoc(doc(db, "affiliateMemberships", membershipId));
    if (snapshot.exists()) return snapshot.data() as Record<string, unknown>;
  }
  if (typeof window !== "undefined") {
    const current = JSON.parse(window.localStorage.getItem("mansa_affiliate_memberships") || "[]");
    return current.find((item: any) => item.membershipId === membershipId) || null;
  }
  return null;
}

export async function revokeVerifiedMemberEntitlement(input: {
  memberUid: string;
  productId: string;
  reason?: string;
}): Promise<void> {
  if (!input.memberUid || !input.productId) return;
  const ref = doc(db, "memberEntitlements", `${input.memberUid}_${input.productId}`);
  await setDoc(
    ref,
    {
      status: "revoked",
      revokedAt: new Date().toISOString(),
      revokeReason: input.reason || "refund",
    },
    { merge: true },
  );
}

/** À appeler depuis le handler de remboursement confirmé. */
export async function revokeCustomerAccessAfterRefund(input: {
  memberUid: string;
  productId: string;
  reason?: string;
}): Promise<void> {
  await revokeVerifiedMemberEntitlement(input);
  if (typeof window !== "undefined") {
    try {
      const current = JSON.parse(window.localStorage.getItem("mansa_customer_purchases") || "[]");
      if (Array.isArray(current)) {
        window.localStorage.setItem(
          "mansa_customer_purchases",
          JSON.stringify(current.filter((item: any) => item.id !== input.productId)),
        );
        window.dispatchEvent(new Event("mansa_purchases_updated"));
      }
    } catch {
      // Le cache local ne doit jamais bloquer la révocation serveur.
    }
  }
}

export async function persistVerifiedMemberEntitlement(input: {
  memberUid: string;
  productId: string;
  companyId: string;
  invoiceId: string;
  verifiedAt?: string;
}): Promise<void> {
  if (!db || !input.memberUid || !input.productId) return;
  await setDoc(
    doc(db, "memberEntitlements", `${input.memberUid}_${input.productId}`),
    {
      ...input,
      status: "paid",
      verifiedAt: input.verifiedAt || new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function persistFreeMemberEntitlement(input: {
  memberUid: string;
  productId: string;
  companyId: string;
  verifiedAt?: string;
}): Promise<void> {
  if (!input.memberUid) throw new Error("Connectez-vous à votre compte Mansa avant de continuer.");
  if (!input.companyId) throw new Error("La communauté de cette offre est introuvable.");
  if (!input.productId) throw new Error("L’identifiant de l’offre gratuite est manquant.");

  await joinCommunityRpc(input.companyId);
  await claimFreeOfferRpc(input.productId);
}

export async function loadVerifiedMemberContent(
  memberUid: string,
  productId: string,
): Promise<{
  digitalFiles?: unknown[];
  courseModules?: unknown[];
} | null> {
  if (!db || !memberUid || !productId) return null;
  const entitlement = await getDoc(doc(db, "memberEntitlements", `${memberUid}_${productId}`));
  if (!entitlement.exists() || entitlement.data().status !== "paid") return null;
  const content = await getDoc(doc(db, "productPrivateContent", productId));
  return content.exists()
    ? (content.data() as { digitalFiles?: unknown[]; courseModules?: unknown[] })
    : null;
}

// ----------------- USER PROFILE & ENTERPRISE SETTINGS -----------------
export function isCreatorPayoutConfigured(profile?: Partial<FirestoreUserProfile> | null): boolean {
  if (!profile) return false;
  if (!profile.payoutMethod) return false;
  if (profile.payoutMethod === "wave" || profile.payoutMethod === "orange_momo") {
    return Boolean(profile.momoNumber && profile.momoNumber.trim().length >= 6);
  }
  if (profile.payoutMethod === "bank_uemoa" || profile.payoutMethod === "bank_cemac") {
    return Boolean(profile.bankIbanRib && profile.bankIbanRib.trim().length >= 6);
  }
  if (profile.payoutMethod === "crypto") {
    return true;
  }
  return false;
}

export async function getUserProfile(uid: string): Promise<FirestoreUserProfile | null> {
  if (!uid) return null;
  try {
    return await fetchUserProfile(uid);
  } catch (err) {
    console.warn("Supabase getUserProfile error:", err);
    return null;
  }
}

export async function updateUserProfile(
  uid: string,
  data: Partial<FirestoreUserProfile>,
): Promise<FirestoreUserProfile> {
  if (!uid) throw new Error("User ID is required for profile update");
  const updated = await updateUserProfileInSupabase(uid, data);
  if (!updated) throw new Error("Impossible de mettre à jour le profil.");
  return updated;
}

export async function deleteUserProfile(uid: string): Promise<FirestoreUserProfile | null> {
  // Account deletion is disabled per specifications
  return null;
}

export async function restoreUserProfile(
  uid: string,
  profile: FirestoreUserProfile,
): Promise<void> {
  if (!uid || !profile) return;
  await updateUserProfileInSupabase(uid, profile);
}

export async function syncUserProfile(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}): Promise<FirestoreUserProfile> {
  try {
    const existing = await fetchUserProfile(user.uid);
    if (existing) return existing;

    const initials =
      (user.displayName
        ? user.displayName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        : user.email?.slice(0, 2).toUpperCase()) || "MA";

    const newProfile: Partial<FirestoreUserProfile> = {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || user.email?.split("@")[0] || "Créateur Mansa",
      avatarInitials: initials,
      photoURL: user.photoURL || undefined,
      country: "Côte d'Ivoire",
      currency: "XOF",
    };

    const saved = await updateUserProfileInSupabase(user.uid, newProfile);
    return (
      saved ||
      ({
        ...newProfile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as FirestoreUserProfile)
    );
  } catch (err) {
    console.warn("Supabase syncUserProfile fallback:", err);
    return {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || user.email?.split("@")[0] || "Créateur Mansa",
      avatarInitials: "CR",
      country: "Côte d'Ivoire",
      currency: "XOF",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

// ----------------- PRODUCTS (SUPABASE OFFERS) -----------------

export async function getCreatorProducts(
  creatorId: string,
  companyId?: string,
): Promise<BusinessProject[]> {
  if (companyId === "personal") return [];
  const inScope = (product: BusinessProject) => !companyId || product.companyId === companyId;
  try {
    const products = await fetchCreatorOffersFromSupabase(creatorId);
    return products.filter(inScope);
  } catch (error) {
    console.warn("Notice: Error fetching products from Supabase:", error);
    return [];
  }
}

export async function getMemberProductsByIds(productIds: string[]): Promise<BusinessProject[]> {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  try {
    const { data: offersData } = await supabase
      .from("offers")
      .select("*")
      .in("id", uniqueIds)
      .eq("status", "active");

    if (!offersData) return [];
    return offersData.map((row) => mapOfferRowToBusinessProject(row as any));
  } catch (err) {
    console.warn("Notice: Error fetching member products by IDs:", err);
    return [];
  }
}

/** Subscribe to active company offers from Supabase */
export function subscribeToCompanyOffers(
  companyId: string,
  callback: (offers: CreatorPlatformOffer[]) => void,
) {
  if (!companyId) {
    callback([]);
    return () => {};
  }

  let active = true;
  void fetchCompanyOffersFromSupabase(companyId, true).then((offers) => {
    if (active) callback(offers);
  });

  const handleUpdate = () => {
    void fetchCompanyOffersFromSupabase(companyId, true).then((offers) => {
      if (active) callback(offers);
    });
  };

  if (typeof window !== "undefined") {
    window.addEventListener(PRODUCTS_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
  }

  return () => {
    active = false;
    if (typeof window !== "undefined") {
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    }
  };
}

export function subscribeToCreatorProducts(
  creatorId: string,
  callback: (products: BusinessProject[]) => void,
  companyId?: string,
) {
  if (companyId === "personal" || !creatorId) {
    callback([]);
    return () => {};
  }
  const inScope = (product: BusinessProject) => !companyId || product.companyId === companyId;
  let active = true;

  const emit = () => {
    void fetchCreatorOffersFromSupabase(creatorId).then((products) => {
      if (active) callback(products.filter(inScope));
    });
  };

  emit();

  const refreshInterval = setInterval(emit, 15000);

  if (typeof window !== "undefined") {
    window.addEventListener(PRODUCTS_UPDATED_EVENT, emit);
    window.addEventListener("mansa_discoverable_products_updated", emit);
  }

  return () => {
    active = false;
    clearInterval(refreshInterval);
    if (typeof window !== "undefined") {
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, emit);
      window.removeEventListener("mansa_discoverable_products_updated", emit);
    }
  };
}

export async function saveProductToFirestore(
  creatorId: string,
  creatorEmail: string,
  creatorName: string,
  productData: {
    id?: string;
    name: string;
    description?: string;
    category?: string;
    priceAmount: number;
    pricingType?: "free" | "paid";
    billingCycle?: string;
    currency: string;
    includedApps: string[];
    affiliateRate?: number;
    productUrl?: string;
    ctaText?: string;
    coverImage?: string;
    bannerUrl?: string;
    companyId: string;
    companyName?: string;
    productType?: string;
    digitalFiles?: unknown[];
    courseModules?: unknown[];
    visibility?: "Visible" | "Caché";
  },
): Promise<string> {
  if (!creatorId) throw new Error("Connectez-vous pour créer un produit.");
  if (!productData.companyId?.trim())
    throw new Error("Sélectionnez une communauté pour ce produit.");

  const isFree = productData.pricingType === "free" || productData.priceAmount === 0;
  const status = productData.visibility === "Caché" ? "paused" : "active";

  const productId = await upsertOfferToSupabase({
    id: productData.id,
    creatorId,
    companyId: productData.companyId,
    name: productData.name,
    description: productData.description,
    priceAmount: isFree ? 0 : productData.priceAmount,
    currency: productData.currency,
    pricingType: isFree ? "free" : "paid",
    billingCycle: (productData.billingCycle as any) || "monthly",
    status,
    includedApps: productData.includedApps || [],
    imageUrl: productData.coverImage || productData.bannerUrl,
    digitalFiles: productData.digitalFiles,
    courseModules: productData.courseModules,
  });

  dispatchProductUpdates();
  return productId;
}

export async function deleteProductFromFirestore(
  productId: string,
  creatorId?: string,
): Promise<void> {
  await deleteOfferFromSupabase(productId);
  dispatchProductUpdates();
}

// ----------------- TRANSACTIONS (REAL FIRESTORE & CACHE) -----------------
export async function getCreatorTransactions(creatorId: string): Promise<FirestoreTransaction[]> {
  const localList = getLocalItems<FirestoreTransaction>(LOCAL_TRANSACTIONS_KEY).filter(
    (transaction) => transaction.creatorId === creatorId,
  );
  try {
    const q = query(
      collection(db, "transactions"),
      where("creatorId", "==", creatorId),
      orderBy("createdAt", "desc"),
      limit(50),
    );
    const snap = await getDocs(q);
    const list: FirestoreTransaction[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));

    const combined = [...list];
    for (const t of localList) {
      if (!combined.some((c) => c.id === t.id)) {
        combined.unshift(t);
      }
    }
    return combined;
  } catch (error) {
    return localList;
  }
}

export function subscribeToCreatorTransactions(
  creatorId: string,
  callback: (transactions: FirestoreTransaction[]) => void,
  companyId?: string | "personal",
) {
  const inScope = (transaction: FirestoreTransaction) =>
    transaction.creatorId === creatorId &&
    (companyId === "personal"
      ? filterPersonalTransactions([transaction]).length > 0
      : !companyId || transaction.companyId === companyId);
  const localList = getLocalItems<FirestoreTransaction>(LOCAL_TRANSACTIONS_KEY).filter(inScope);
  callback(localList);

  try {
    const q =
      companyId === "personal"
        ? query(
            collection(db, "transactions"),
            where("creatorId", "==", creatorId),
            where("type", "in", ["affiliate", "other"]),
            where("companyId", "==", null),
            limit(50),
          )
        : companyId
          ? query(
              collection(db, "transactions"),
              where("creatorId", "==", creatorId),
              where("companyId", "==", companyId),
              limit(50),
            )
          : query(collection(db, "transactions"), where("creatorId", "==", creatorId), limit(50));
    return onSnapshot(
      q,
      (snap) => {
        const list: FirestoreTransaction[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        const currentLocal =
          getLocalItems<FirestoreTransaction>(LOCAL_TRANSACTIONS_KEY).filter(inScope);
        const combined = [...list];
        for (const t of currentLocal) {
          if (!combined.some((c) => c.id === t.id)) {
            combined.unshift(t);
          }
        }
        callback(combined);
      },
      (err) => {
        console.warn("Transactions listener warning, using local cache:", err);
        callback(getLocalItems<FirestoreTransaction>(LOCAL_TRANSACTIONS_KEY).filter(inScope));
      },
    );
  } catch (e) {
    return () => {};
  }
}

export async function createRealTransaction(
  creatorId: string,
  data: {
    buyerName: string;
    buyerEmail: string;
    buyerLocation: string;
    productName: string;
    productId: string;
    amount: string;
    amountNumber: number;
    currency: string;
    paymentMethod: string;
    companyId?: string;
    companyName?: string;
  },
): Promise<string> {
  const txId = "tx-" + Math.random().toString(36).substring(2, 9);
  const txObj: FirestoreTransaction = {
    id: txId,
    creatorId,
    ...data,
    companyId: data.companyId ?? null,
    companyName: data.companyName ?? null,
    status: "completed",
    createdAt: new Date().toISOString(),
  };

  // 1. Update local cache
  const localList = getLocalItems<FirestoreTransaction>(LOCAL_TRANSACTIONS_KEY);
  localList.unshift(txObj);
  saveLocalItems(LOCAL_TRANSACTIONS_KEY, localList);

  // 2. Also register customer locally
  const custId = "cust-" + Math.random().toString(36).substring(2, 9);
  const custObj: FirestoreCustomer = {
    id: custId,
    creatorId,
    name: data.buyerName,
    email: data.buyerEmail,
    companyId: data.companyId,
    companyName: data.companyName,
    country: data.buyerLocation,
    countryName: data.buyerLocation,
    countryFlag: data.buyerLocation?.includes("Sénégal") ? "🇸🇳" : "🇨🇮",
    productName: data.productName,
    productId: data.productId,
    amountSpent: data.amount,
    totalSpent: data.amountNumber,
    totalSpentFormatted: data.amount,
    currency: data.currency,
    status: "active",
    joinedAt: new Date().toISOString().split("T")[0],
    joinedDate: new Date().toLocaleDateString("fr-FR"),
  };
  const custs = getLocalItems<FirestoreCustomer>(LOCAL_CUSTOMERS_KEY);
  custs.unshift(custObj);
  saveLocalItems(LOCAL_CUSTOMERS_KEY, custs);

  // 3. Persist to Firestore
  try {
    await addDoc(collection(db, "transactions"), txObj);
    await addDoc(collection(db, "customers"), custObj);
  } catch (err) {
    console.warn("Firestore transaction save warning (persisted locally):", err);
  }

  return txId;
}

// ----------------- CUSTOMERS (REAL FIRESTORE & CACHE) -----------------
export async function getCreatorCustomers(
  creatorId: string,
  companyId?: string,
): Promise<FirestoreCustomer[]> {
  const inScope = (customer: FirestoreCustomer) =>
    customer.creatorId === creatorId && (!companyId || customer.companyId === companyId);
  const localList = getLocalItems<FirestoreCustomer>(LOCAL_CUSTOMERS_KEY).filter(inScope);
  try {
    const q = companyId
      ? query(
          collection(db, "customers"),
          where("creatorId", "==", creatorId),
          where("companyId", "==", companyId),
          limit(100),
        )
      : query(collection(db, "customers"), where("creatorId", "==", creatorId), limit(100));
    const snap = await getDocs(q);
    const list: FirestoreCustomer[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
    const combined = [...list];
    for (const c of localList) {
      if (!combined.some((item) => item.id === c.id)) {
        combined.unshift(c);
      }
    }
    return combined;
  } catch (error) {
    return localList;
  }
}

export function subscribeToCreatorCustomers(
  creatorId: string,
  callback: (customers: FirestoreCustomer[]) => void,
  companyId?: string,
) {
  const inScope = (customer: FirestoreCustomer) =>
    customer.creatorId === creatorId && (!companyId || customer.companyId === companyId);
  const localList = getLocalItems<FirestoreCustomer>(LOCAL_CUSTOMERS_KEY).filter(inScope);
  callback(localList);

  try {
    const q = companyId
      ? query(
          collection(db, "customers"),
          where("creatorId", "==", creatorId),
          where("companyId", "==", companyId),
          limit(100),
        )
      : query(collection(db, "customers"), where("creatorId", "==", creatorId), limit(100));
    return onSnapshot(
      q,
      (snap) => {
        const list: FirestoreCustomer[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        const currentLocal = getLocalItems<FirestoreCustomer>(LOCAL_CUSTOMERS_KEY).filter(inScope);
        const combined = [...list];
        for (const c of currentLocal) {
          if (!combined.some((item) => item.id === c.id)) {
            combined.unshift(c);
          }
        }
        callback(combined);
      },
      (err) => {
        console.warn("Customers listener warning, using local cache:", err);
        callback(getLocalItems<FirestoreCustomer>(LOCAL_CUSTOMERS_KEY).filter(inScope));
      },
    );
  } catch (e) {
    return () => {};
  }
}

export async function createRealCustomer(
  creatorId: string,
  data: {
    name: string;
    email: string;
    productName: string;
    companyId: string;
    companyName?: string;
    productId?: string;
    totalSpent?: number;
    totalSpentFormatted?: string;
    countryFlag?: string;
    countryName?: string;
    status?: "active" | "cancelled" | "trial" | "past_due";
  },
): Promise<string> {
  const custId = "cust-" + Math.random().toString(36).substring(2, 9);
  const custObj: FirestoreCustomer = {
    id: custId,
    creatorId,
    name: data.name,
    email: data.email,
    companyId: data.companyId,
    companyName: data.companyName,
    productName: data.productName,
    productId: data.productId || "",
    totalSpent: data.totalSpent || 0,
    totalSpentFormatted: data.totalSpentFormatted || "0 FCFA",
    countryFlag: data.countryFlag || "🇨🇮",
    countryName: data.countryName || "Côte d'Ivoire",
    country: data.countryName || "Côte d'Ivoire",
    status: data.status || "active",
    joinedAt: new Date().toISOString().split("T")[0],
    joinedDate: new Date().toLocaleDateString("fr-FR"),
  };

  const localList = getLocalItems<FirestoreCustomer>(LOCAL_CUSTOMERS_KEY);
  localList.unshift(custObj);
  saveLocalItems(LOCAL_CUSTOMERS_KEY, localList);

  try {
    await addDoc(collection(db, "customers"), custObj);
  } catch (err) {
    console.warn("Firestore customer save warning (persisted locally):", err);
  }

  return custId;
}

export async function deleteCustomerFromFirestore(customerId: string): Promise<void> {
  const localList = getLocalItems<FirestoreCustomer>(LOCAL_CUSTOMERS_KEY).filter(
    (c) => c.id !== customerId,
  );
  saveLocalItems(LOCAL_CUSTOMERS_KEY, localList);
  try {
    await deleteDoc(doc(db, "customers", customerId));
  } catch (err) {
    console.warn("Firestore delete warning (removed locally):", err);
  }
}

// ----------------- PUBLIC PRODUCTS / MARKETPLACE (SUPABASE) -----------------
export async function getPublicProducts(): Promise<BusinessProject[]> {
  try {
    const { data: offersData, error } = await supabase
      .from("offers")
      .select("*")
      .eq("status", "active")
      .limit(30);

    if (error || !offersData) return [];
    return offersData.map((row) => mapOfferRowToBusinessProject(row as any));
  } catch (error) {
    console.warn("Could not load public products from Supabase:", error);
    return [];
  }
}

// ----------------- WORKFORCE & TEAM (REAL FIRESTORE & CACHE) -----------------
export async function getCreatorWorkforce(
  creatorId: string,
  companyId: string,
): Promise<FirestoreWorkforceMember[]> {
  if (!creatorId || !companyId) return [];
  const localList = getLocalItems<FirestoreWorkforceMember>(LOCAL_WORKFORCE_KEY).filter(
    (w) => w.creatorId === creatorId && w.companyId === companyId,
  );

  try {
    const q = query(
      collection(db, "workforce"),
      where("creatorId", "==", creatorId),
      where("companyId", "==", companyId),
    );
    const querySnapshot = await getDocs(q);
    const members: FirestoreWorkforceMember[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as FirestoreWorkforceMember;
      members.push({
        ...data,
        id: docSnap.id,
      });
    });

    if (members.length > 0) {
      const otherCompanies = getLocalItems<FirestoreWorkforceMember>(LOCAL_WORKFORCE_KEY).filter(
        (member) => member.creatorId !== creatorId || member.companyId !== companyId,
      );
      saveLocalItems(LOCAL_WORKFORCE_KEY, [...members, ...otherCompanies]);
      return members;
    }
    return localList;
  } catch (err) {
    console.warn("Firestore getCreatorWorkforce fallback to cache:", err);
    return localList;
  }
}

export async function saveWorkforceMemberToFirestore(
  creatorId: string,
  companyId: string,
  memberData: Omit<FirestoreWorkforceMember, "id" | "creatorId" | "companyId" | "createdAt"> & {
    id?: string;
  },
): Promise<string> {
  if (!creatorId || !companyId)
    throw new Error("Sélectionnez une entreprise avant d’ajouter un membre.");
  const memberId =
    memberData.id || `worker-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const memberObj: FirestoreWorkforceMember = {
    id: memberId,
    creatorId,
    companyId,
    name: memberData.name,
    role: memberData.role,
    rate: memberData.rate,
    avatar: memberData.avatar || memberData.name.slice(0, 2).toUpperCase(),
    status: memberData.status || "active",
    tasksCompleted: memberData.tasksCompleted || 0,
    rating: memberData.rating || 5.0,
    createdAt: now,
  };

  // Update local cache
  const localList = getLocalItems<FirestoreWorkforceMember>(LOCAL_WORKFORCE_KEY);
  const existingIdx = localList.findIndex(
    (w) => w.id === memberId && w.creatorId === creatorId && w.companyId === companyId,
  );
  if (existingIdx >= 0) {
    localList[existingIdx] = memberObj;
  } else {
    localList.unshift(memberObj);
  }
  saveLocalItems(LOCAL_WORKFORCE_KEY, localList);

  // Real Firestore write
  try {
    const docRef = doc(db, "workforce", memberId);
    await setDoc(docRef, memberObj);
  } catch (err) {
    console.warn("Firestore saveWorkforceMember warning (persisted locally):", err);
  }

  return memberId;
}

export async function deleteWorkforceMemberFromFirestore(
  memberId: string,
  companyId: string,
): Promise<void> {
  const localList = getLocalItems<FirestoreWorkforceMember>(LOCAL_WORKFORCE_KEY).filter(
    (w) => w.id !== memberId || w.companyId !== companyId,
  );
  saveLocalItems(LOCAL_WORKFORCE_KEY, localList);

  try {
    await deleteDoc(doc(db, "workforce", memberId));
  } catch (err) {
    console.warn("Firestore deleteWorkforceMember warning:", err);
  }
}

// ----------------- PARTNERS & B2B DEALS (REAL FIRESTORE & CACHE) -----------------
export async function getCreatorPartners(
  creatorId: string,
  companyId: string,
): Promise<FirestorePartnerDeal[]> {
  if (!creatorId || !companyId) return [];
  const localList = getLocalItems<FirestorePartnerDeal>(LOCAL_PARTNERS_KEY).filter(
    (d) => d.creatorId === creatorId && d.companyId === companyId,
  );

  try {
    const q = query(
      collection(db, "partners"),
      where("creatorId", "==", creatorId),
      where("companyId", "==", companyId),
    );
    const querySnapshot = await getDocs(q);
    const deals: FirestorePartnerDeal[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as FirestorePartnerDeal;
      deals.push({
        ...data,
        id: docSnap.id,
      });
    });

    if (deals.length > 0) {
      const otherCompanies = getLocalItems<FirestorePartnerDeal>(LOCAL_PARTNERS_KEY).filter(
        (deal) => deal.creatorId !== creatorId || deal.companyId !== companyId,
      );
      saveLocalItems(LOCAL_PARTNERS_KEY, [...deals, ...otherCompanies]);
      return deals;
    }
    return localList;
  } catch (err) {
    console.warn("Firestore getCreatorPartners fallback to cache:", err);
    return localList;
  }
}

export async function savePartnerDealToFirestore(
  creatorId: string,
  companyId: string,
  dealData: Omit<FirestorePartnerDeal, "id" | "creatorId" | "companyId" | "createdAt"> & {
    id?: string;
  },
): Promise<string> {
  if (!creatorId || !companyId)
    throw new Error("Sélectionnez une entreprise avant d’ajouter un partenaire.");
  const dealId = dealData.id || `deal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const dealObj: FirestorePartnerDeal = {
    id: dealId,
    creatorId,
    companyId,
    partnerName: dealData.partnerName,
    partnerLogo: dealData.partnerLogo || "",
    partnerHandle:
      dealData.partnerHandle || `@${dealData.partnerName.toLowerCase().replace(/\s+/g, "_")}`,
    type: dealData.type,
    typeLabel: dealData.typeLabel,
    description: dealData.description,
    contactEmail: dealData.contactEmail,
    status: dealData.status || "proposed",
    value: dealData.value || "En négociation",
    reach: dealData.reach || "Portée estimée 10k+",
    startDate: dealData.startDate || "Aujourd'hui",
    createdAt: now,
  };

  // Update local cache
  const localList = getLocalItems<FirestorePartnerDeal>(LOCAL_PARTNERS_KEY);
  const existingIdx = localList.findIndex(
    (d) => d.id === dealId && d.creatorId === creatorId && d.companyId === companyId,
  );
  if (existingIdx >= 0) {
    localList[existingIdx] = dealObj;
  } else {
    localList.unshift(dealObj);
  }
  saveLocalItems(LOCAL_PARTNERS_KEY, localList);

  // Real Firestore write
  try {
    const docRef = doc(db, "partners", dealId);
    await setDoc(docRef, dealObj);
  } catch (err) {
    console.warn("Firestore savePartnerDeal warning (persisted locally):", err);
  }

  return dealId;
}

export async function deletePartnerDealFromFirestore(
  dealId: string,
  companyId: string,
): Promise<void> {
  const localList = getLocalItems<FirestorePartnerDeal>(LOCAL_PARTNERS_KEY).filter(
    (d) => d.id !== dealId || d.companyId !== companyId,
  );
  saveLocalItems(LOCAL_PARTNERS_KEY, localList);

  try {
    await deleteDoc(doc(db, "partners", dealId));
  } catch (err) {
    console.warn("Firestore deletePartnerDeal warning:", err);
  }
}
