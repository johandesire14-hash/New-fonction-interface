import { requireActiveSupabaseSession, supabase } from "./supabase";
import type {
  BusinessProject,
  CreatorPlatformOffer,
  TelegramChannelItem,
  DiscordChannelItem,
  EbookResourceItem,
  CourseResourceItem,
} from "../types";
import { getCurrencySymbol } from "../utils/currency";
import { fetchCommunityById } from "./supabaseCommunityService";

export interface OfferRow {
  id: string;
  creator_id: string;
  company_id: string;
  name: string;
  title?: string | null;
  description: string | null;
  price_amount: number;
  currency: string;
  pricing_type: "free" | "paid";
  billing_cycle: "monthly" | "yearly" | "one_time";
  status: "draft" | "active" | "paused" | "archived";
  included_apps: string[];
  image_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MemberEntitlementRow {
  offer_id: string;
  status: "free" | "paid" | "trial" | string;
  expires_at?: string | null;
  expiresAt?: string | null;
  valid_until?: string | null;
  ends_at?: string | null;
  trial_ends_at?: string | null;
  company_id?: string | null;
}

export const mapOfferRowToPlatformOffer = (
  row: OfferRow,
  companyName: string = "",
  extras?: {
    telegramChannels?: TelegramChannelItem[];
    discordChannels?: DiscordChannelItem[];
    courses?: CourseResourceItem[];
    ebooks?: EbookResourceItem[];
    digitalFiles?: any[];
  },
  communityCurrency?: string,
): CreatorPlatformOffer => {
  const isFree = row.pricing_type === "free" || row.price_amount === 0;
  const currency = communityCurrency || row.currency || "XOF";
  const currencySymbol = getCurrencySymbol(currency);
  const priceDisplay = isFree
    ? "Gratuit"
    : row.billing_cycle === "monthly"
      ? `${row.price_amount} ${currencySymbol} / mois`
      : row.billing_cycle === "yearly"
        ? `${row.price_amount} ${currencySymbol} / an`
        : `${row.price_amount} ${currencySymbol} paiement unique`;

  return {
    id: row.id,
    title: row.title?.trim() || row.name,
    companyId: row.company_id,
    creatorId: row.creator_id,
    companyName: companyName || "Mansa",
    category: "community",
    categoryLabel: "Communauté & Accès",
    type: "membership",
    priceDisplay,
    priceAmount: isFree ? 0 : row.price_amount,
    currency,
    pricingType: isFree ? "free" : "paid",
    billingCycle: row.billing_cycle || "monthly",
    description: row.description || "",
    imageUrl: row.image_url || undefined,
    includedApps: Array.isArray(row.included_apps) ? row.included_apps : [],
    telegramChannels: extras?.telegramChannels || [],
    discordChannels: extras?.discordChannels || [],
    courses: extras?.courses || [],
    ebooks: extras?.ebooks || [],
  };
};

export const mapOfferRowToBusinessProject = (
  row: OfferRow,
  companyName: string = "",
  digitalFiles: any[] = [],
  courseModules: any[] = [],
  communityCurrency?: string,
): BusinessProject => {
  const isFree = row.pricing_type === "free" || row.price_amount === 0;
  return {
    id: row.id,
    creatorId: row.creator_id,
    name: row.name,
    tagline: row.description || "Offre exclusive",
    category: "community",
    pricingAmount: isFree ? 0 : row.price_amount,
    pricingModel: row.billing_cycle === "one_time" ? "one_time" : "subscription",
    currency: communityCurrency || row.currency || "XOF",
    targetAudience: "Membres et Acheteurs",
    status: row.status === "paused" ? "paused" : "active",
    features: [
      `Applications : ${Array.isArray(row.included_apps) ? row.included_apps.join(", ") : "Accès"}`,
      "Paiement sécurisé Mobile Money & Carte",
      "Délivrance instantanée 24/7",
    ],
    techStack: ["Mansa Engine Supabase", "Storage Sécurisé"],
    estimatedMonthlyRevenue: 0,
    affiliateCommissionRate: 25,
    membersCount: 0,
    conversionRate: "0%",
    apps: Array.isArray(row.included_apps) ? row.included_apps : [],
    storeUrl: `mansa.af/p/${row.id}`,
    coverImage: row.image_url || undefined,
    companyId: row.company_id,
    companyName,
    digitalFiles,
    courseModules,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
};

/**
 * Lit les offres d'une communauté filtrées par statut ('active' par défaut pour la page communauté)
 */
export async function fetchCompanyOffersFromSupabase(
  companyId: string,
  onlyActive: boolean = true,
): Promise<CreatorPlatformOffer[]> {
  if (!companyId) return [];

  let query = supabase.from("offers").select("*").eq("company_id", companyId);
  if (onlyActive) {
    query = query.eq("status", "active");
  }

  const { data: offersData, error: offersError } = await query.order("created_at", {
    ascending: false,
  });

  if (offersError) {
    console.error("Erreur lecture offres Supabase:", offersError);
    throw new Error(`Impossible de charger les offres Supabase : ${offersError.message}`);
  }
  if (!offersData) throw new Error("Supabase n’a renvoyé aucune donnée pour les offres.");

  const community = await fetchCommunityById(companyId);
  const communityCurrency = community?.primaryCurrency;

  // Enrichir chaque offre avec ses ressources liées (fichiers, canaux, cours)
  const offersWithResources = await Promise.all(
    offersData.map(async (row) => {
      const offerId = row.id;

      // 1. Canaux Telegram
      const { data: tgData } = await supabase
        .from("offer_telegram_channels")
        .select("*")
        .eq("offer_id", offerId);

      // 2. Canaux Discord
      const { data: dcData } = await supabase
        .from("offer_discord_channels")
        .select("*")
        .eq("offer_id", offerId);

      // 3. Fichiers
      const { data: filesData } = await supabase
        .from("offer_files")
        .select("*")
        .eq("offer_id", offerId)
        .order("sort_order", { ascending: true });

      // 4. Cours et modules
      const { data: coursesData } = await supabase
        .from("offer_courses")
        .select("*, course_modules(*)")
        .eq("offer_id", offerId)
        .order("sort_order", { ascending: true });

      const telegramChannels: TelegramChannelItem[] = (tgData || []).map((t) => ({
        id: t.id || t.channel_id || `tg-${offerId}`,
        name: t.name || "Canal Telegram VIP",
        inviteLink: t.invite_link || "",
        quote: t.description || "",
      }));

      const discordChannels: DiscordChannelItem[] = (dcData || []).map((d) => ({
        id: d.id || d.server_id || `dc-${offerId}`,
        name: d.name || "Serveur Discord VIP",
        inviteLink: d.invite_link || "",
      }));

      const ebooks: EbookResourceItem[] = (filesData || []).map((f) => ({
        id: f.id,
        name: f.name || f.title || "Fichier sans nom",
        title: f.name || f.title || "Fichier sans nom",
        mime_type: f.mime_type || "application/octet-stream",
        file_size: typeof f.file_size === "number" ? f.file_size : undefined,
        fileSize: f.file_size ? `${Math.round(f.file_size / 1024)} KB` : undefined,
        storageKey: f.storage_path || undefined,
        downloadUrl: f.download_url || "",
        description: f.description || "",
        coverImage: "",
        badge: f.is_free_preview ? "Aperçu Gratuit" : undefined,
      }));

      const courses: CourseResourceItem[] = (coursesData || []).map((c) => {
        const chapters = Array.isArray(c.course_modules)
          ? c.course_modules.map((m: any) => ({
              id: m.id,
              title: m.title || "Module",
              content: m.content || "",
              videoUrl: m.video_url || "",
              ...(m.video_url && /^https?:\/\//i.test(m.video_url)
                ? { youtubeUrl: m.video_url }
                : m.video_url
                  ? { videoStorageKey: m.video_url }
                  : {}),
            }))
          : [];
        return {
          id: c.id,
          title: c.title || "Formation",
          description: c.description || "",
          modulesCount: chapters.length,
          chapters,
          modules: chapters,
          courseModules: chapters,
        };
      });

      return mapOfferRowToPlatformOffer(row, "", {
        telegramChannels,
        discordChannels,
        ebooks,
        courses,
      }, communityCurrency);
    }),
  );

  companyOffersMemoryCache.set(companyId.trim().toLowerCase(), offersWithResources);
  return offersWithResources;
}

const companyOffersMemoryCache = new Map<string, CreatorPlatformOffer[]>();

export function getCachedCompanyOffers(companyId: string): CreatorPlatformOffer[] {
  if (!companyId) return [];
  return companyOffersMemoryCache.get(companyId.trim().toLowerCase()) || [];
}

/**
 * Récupère les offres du créateur connecté
 */
export async function fetchCreatorOffersFromSupabase(
  creatorId: string,
): Promise<BusinessProject[]> {
  if (!creatorId) return [];

  const { data: offersData, error } = await supabase
    .from("offers")
    .select("*")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });

  if (error || !offersData) {
    console.warn("Notice: fetchCreatorOffersFromSupabase:", error?.message);
    return [];
  }

  const communityIds = [...new Set(offersData.map((row) => row.company_id).filter(Boolean))];
  const communityCurrencies = new Map<string, string>();
  await Promise.all(
    communityIds.map(async (communityId) => {
      const community = await fetchCommunityById(communityId);
      if (community?.primaryCurrency) {
        communityCurrencies.set(communityId, community.primaryCurrency);
      }
    }),
  );

  const projects = await Promise.all(
    offersData.map(async (row) => {
      const offerId = row.id;

      // Fichiers et modules associés
      const { data: filesData } = await supabase
        .from("offer_files")
        .select("*")
        .eq("offer_id", offerId);

      const { data: coursesData } = await supabase
        .from("offer_courses")
        .select("*, course_modules(*)")
        .eq("offer_id", offerId);

      const digitalFiles = (filesData || []).map((f) => ({
        id: f.id,
        name: f.name || f.title,
        title: f.title || f.name,
        description: f.description || "",
        size: f.file_size ? `${Math.round(f.file_size / 1024)} KB` : undefined,
        type: f.mime_type || "application/octet-stream",
        storagePath: f.storage_path,
        storageKey: f.storage_path,
        downloadUrl: f.download_url,
        isFreePreview: f.is_free_preview,
      }));

      const courseModules = (coursesData || []).flatMap((c) =>
        (c.course_modules || []).map((m: any) => ({
          id: m.id,
          title: m.title,
          content: m.content,
          videoUrl: m.video_url,
          courseId: c.id,
        })),
      );

      return mapOfferRowToBusinessProject(
        row,
        "",
        digitalFiles,
        courseModules,
        communityCurrencies.get(row.company_id),
      );
    }),
  );

  return projects;
}

/**
 * Création, modification, publication d'une offre dans public.offers
 * avec ses tables filles (cours, modules, fichiers, Telegram, Discord).
 */
export async function upsertOfferToSupabase(input: {
  id?: string;
  creatorId?: string;
  companyId: string;
  name: string;
  description?: string;
  priceAmount: number;
  currency?: string;
  pricingType?: "free" | "paid";
  billingCycle?: "monthly" | "yearly" | "one_time";
  status?: "draft" | "active" | "paused" | "archived";
  includedApps: string[];
  imageUrl?: string;
  digitalFiles?: any[];
  courseModules?: any[];
  telegramChannels?: TelegramChannelItem[];
  discordChannels?: DiscordChannelItem[];
}): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const creatorUid = user?.id || input.creatorId;

  if (!creatorUid) {
    throw new Error("Connectez-vous pour enregistrer un produit.");
  }
  if (!input.companyId?.trim()) {
    throw new Error("Sélectionnez une communauté pour ce produit.");
  }

  const community = await fetchCommunityById(input.companyId);
  const offerCurrency = community?.primaryCurrency || input.currency || "XOF";

  const offerId = input.id && !input.id.startsWith("proj-temp-")
    ? input.id
    : "offer-" + Math.random().toString(36).substring(2, 9);

  const isFree = input.pricingType === "free" || input.priceAmount === 0;

  // 1. Offre principale
  const offerPayload = {
    id: offerId,
    creator_id: creatorUid,
    company_id: input.companyId,
    name: input.name.trim(),
    title: input.name.trim(),
    description: input.description?.trim() || "",
    price_amount: isFree ? 0 : input.priceAmount,
    currency: offerCurrency,
    pricing_type: isFree ? "free" : "paid",
    billing_cycle: input.billingCycle || "monthly",
    status: input.status || "active",
    included_apps: input.includedApps || [], // JSONB
    image_url: input.imageUrl || null,
  };

  const { error: offerError } = await supabase
    .from("offers")
    .upsert(offerPayload, { onConflict: "id" });

  if (offerError) {
    console.error("Erreur enregistrement offer Supabase:", offerError);
    throw new Error("Impossible d'enregistrer le produit : " + offerError.message);
  }

  // 2. Canaux Telegram
  if (Array.isArray(input.telegramChannels)) {
    // Supprimer les anciens canaux
    await supabase.from("offer_telegram_channels").delete().eq("offer_id", offerId);
    if (input.telegramChannels.length > 0) {
      const tgPayload = input.telegramChannels
        .filter((t) => t.inviteLink?.trim())
        .map((t) => ({
          offer_id: offerId,
          name: t.name || input.name,
          invite_link: t.inviteLink,
          description: t.quote || "",
        }));
      if (tgPayload.length > 0) {
        await supabase.from("offer_telegram_channels").insert(tgPayload);
      }
    }
  }

  // 3. Canaux Discord
  if (Array.isArray(input.discordChannels)) {
    await supabase.from("offer_discord_channels").delete().eq("offer_id", offerId);
    if (input.discordChannels.length > 0) {
      const dcPayload = input.discordChannels
        .filter((d) => d.inviteLink?.trim())
        .map((d) => ({
          offer_id: offerId,
          name: d.name || input.name,
          invite_link: d.inviteLink,
        }));
      if (dcPayload.length > 0) {
        await supabase.from("offer_discord_channels").insert(dcPayload);
      }
    }
  }

  // 4. Fichiers (offer_files)
  if (Array.isArray(input.digitalFiles) && input.digitalFiles.length > 0) {
    for (const [idx, file] of input.digitalFiles.entries()) {
      const storagePath =
        file.storagePath ||
        file.storageKey ||
        `${creatorUid}/${offerId}/${file.name?.replace(/[^a-zA-Z0-9._-]/g, "_") || `file_${idx}`}`;

      const fileName = String(file.name || file.title || `Fichier ${idx + 1}`).trim() || `Fichier ${idx + 1}`;
      const fileSize = typeof file.size === "number" && Number.isFinite(file.size) ? file.size : 0;
      const filePayload = {
        offer_id: offerId,
        name: fileName,
        title: String(file.title || fileName).trim() || fileName,
        description: file.description || "",
        mime_type: file.type || "application/octet-stream",
        file_size: fileSize,
        storage_bucket: "offer-files",
        storage_path: storagePath,
        download_url: file.downloadUrl || null,
        is_free_preview: Boolean(file.isFreePreview),
        sort_order: idx,
      };

      if (typeof file.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(file.id)) {
        const { error } = await supabase.from("offer_files").upsert({ id: file.id, ...filePayload });
        if (error) throw new Error(`offer_files (${error.code || "erreur"}): ${error.message}${error.details ? ` — ${error.details}` : ""}`);
      } else {
        const { error } = await supabase.from("offer_files").insert(filePayload);
        if (error) throw new Error(`offer_files (${error.code || "erreur"}): ${error.message}${error.details ? ` — ${error.details}` : ""}`);
      }
    }
  }

  // 5. Cours et modules (offer_courses, course_modules)
  if (Array.isArray(input.courseModules) && input.courseModules.length > 0) {
    // Créer ou récupérer le cours associé à cette offre
    const { data: existingCourse } = await supabase
      .from("offer_courses")
      .select("id")
      .eq("offer_id", offerId)
      .maybeSingle();

    let courseId = existingCourse?.id;
    if (!courseId) {
      const { data: newCourse } = await supabase
        .from("offer_courses")
        .insert({
          offer_id: offerId,
          title: `Formation ${input.name}`,
          description: input.description || "",
          sort_order: 0,
        })
        .select("id")
        .single();
      courseId = newCourse?.id;
    }

    if (courseId) {
      for (const [idx, mod] of input.courseModules.entries()) {
        const modPayload = {
          course_id: courseId,
          title: mod.title || `Module ${idx + 1}`,
          content: mod.content || "",
          video_url: mod.videoUrl || null,
          sort_order: idx,
        };
        if (mod.id && mod.id.length === 36 && mod.id.includes("-")) {
          await supabase.from("course_modules").upsert({ id: mod.id, ...modPayload });
        } else {
          await supabase.from("course_modules").insert(modPayload);
        }
      }
    }
  }

  return offerId;
}

export interface CreatorCourseModuleInput {
  title: string;
  content?: string;
  /** URL HTTPS (YouTube) ou chemin Storage <auth.uid>/<offerId>/<fichier>. */
  videoUrl?: string;
  videoStorageKey?: string;
}

/** Enregistre un cours et ses modules dans les tables déjà lues par l’espace membre. */
export async function saveCreatorCourseToOffer(input: {
  offerId: string;
  title: string;
  description: string;
  modules: CreatorCourseModuleInput[];
  courseRowId?: string;
}): Promise<string> {
  const session = await requireActiveSupabaseSession();
  const { data: offer, error: offerReadError } = await supabase
    .from("offers")
    .select("id, creator_id, included_apps")
    .eq("id", input.offerId)
    .maybeSingle();

  if (offerReadError) throw new Error(`Impossible de vérifier l’offre : ${offerReadError.message}`);
  if (!offer) throw new Error("L’offre associée au cours est introuvable.");
  if (offer.creator_id !== session.user.id) {
    throw new Error("Vous n’êtes pas autorisé à modifier cette offre.");
  }

  const includedApps = Array.isArray(offer.included_apps) ? offer.included_apps : [];
  if (!includedApps.some((app: string) => app.toLowerCase().includes("cours"))) {
    const { error } = await supabase
      .from("offers")
      .update({ included_apps: [...includedApps, "Cours & formations"] })
      .eq("id", input.offerId)
      .eq("creator_id", session.user.id);
    if (error) throw new Error(`Impossible de publier l’application Cours : ${error.message}`);
  }

  let courseRowId = input.courseRowId;
  if (courseRowId) {
    const { data: existingCourse, error } = await supabase
      .from("offer_courses")
      .select("id")
      .eq("id", courseRowId)
      .eq("offer_id", input.offerId)
      .maybeSingle();
    if (error) throw new Error(`Impossible de vérifier le cours : ${error.message}`);
    if (!existingCourse) courseRowId = undefined;
  }

  if (!courseRowId) {
    const { data: matchingCourse, error } = await supabase
      .from("offer_courses")
      .select("id")
      .eq("offer_id", input.offerId)
      .eq("title", input.title)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Impossible de rechercher le cours : ${error.message}`);
    courseRowId = matchingCourse?.id;
  }

  if (courseRowId) {
    const { error } = await supabase
      .from("offer_courses")
      .update({ title: input.title, description: input.description })
      .eq("id", courseRowId)
      .eq("offer_id", input.offerId);
    if (error) throw new Error(`Impossible de mettre à jour le cours : ${error.message}`);
  } else {
    const { data: createdCourse, error } = await supabase
      .from("offer_courses")
      .insert({ offer_id: input.offerId, title: input.title, description: input.description })
      .select("id")
      .single();
    if (error) throw new Error(`Impossible d’enregistrer le cours : ${error.message}`);
    courseRowId = createdCourse?.id;
  }

  if (!courseRowId) throw new Error("Supabase n’a pas renvoyé l’identifiant du cours enregistré.");

  const { error: deleteModulesError } = await supabase
    .from("course_modules")
    .delete()
    .eq("course_id", courseRowId);
  if (deleteModulesError) {
    throw new Error(`Impossible de mettre à jour les chapitres : ${deleteModulesError.message}`);
  }

  const modulePayload = input.modules.map((module, index) => ({
    course_id: courseRowId,
    title: module.title || `Module ${index + 1}`,
    content: module.content || "",
    video_url: module.videoUrl || module.videoStorageKey || null,
    sort_order: index,
  }));
  if (modulePayload.length > 0) {
    const { error } = await supabase.from("course_modules").insert(modulePayload);
    if (error) throw new Error(`Impossible d’enregistrer les chapitres : ${error.message}`);
  }

  return courseRowId;
}

/** Retire le cours d’une offre lorsque le créateur la délie explicitement. */
export async function deleteCreatorCourseFromOffer(input: {
  offerId: string;
  courseRowId: string;
}): Promise<void> {
  const session = await requireActiveSupabaseSession();
  const { data: offer, error: offerReadError } = await supabase
    .from("offers")
    .select("id, creator_id")
    .eq("id", input.offerId)
    .maybeSingle();
  if (offerReadError) throw new Error(`Impossible de vérifier l’offre : ${offerReadError.message}`);
  if (!offer || offer.creator_id !== session.user.id) {
    throw new Error("Vous n’êtes pas autorisé à modifier cette offre.");
  }

  const { error: moduleError } = await supabase
    .from("course_modules")
    .delete()
    .eq("course_id", input.courseRowId);
  if (moduleError) throw new Error(`Impossible de retirer les chapitres : ${moduleError.message}`);

  const { error } = await supabase
    .from("offer_courses")
    .delete()
    .eq("id", input.courseRowId)
    .eq("offer_id", input.offerId);
  if (error) throw new Error(`Impossible de retirer le cours de l’offre : ${error.message}`);
}

/**
 * Suppression d'un produit dans Supabase (offers + tables liées)
 */
export async function deleteOfferFromSupabase(offerId: string): Promise<void> {
  if (!offerId) return;

  // Supprimer les dépendances puis l'offre
  await supabase.from("offer_files").delete().eq("offer_id", offerId);
  await supabase.from("offer_telegram_channels").delete().eq("offer_id", offerId);
  await supabase.from("offer_discord_channels").delete().eq("offer_id", offerId);

  const { data: courses } = await supabase
    .from("offer_courses")
    .select("id")
    .eq("offer_id", offerId);

  if (courses && courses.length > 0) {
    for (const c of courses) {
      await supabase.from("course_modules").delete().eq("course_id", c.id);
    }
    await supabase.from("offer_courses").delete().eq("offer_id", offerId);
  }

  const { error } = await supabase.from("offers").delete().eq("id", offerId);
  if (error) {
    console.error("Erreur suppression offer Supabase:", error);
    throw new Error("Impossible de supprimer le produit : " + error.message);
  }
}

/**
 * Obtention d'une offre gratuite via RPC public.claim_free_offer(p_offer_id)
 * N'insère JAMAIS directement dans member_entitlements côté membre
 */
export async function claimFreeOfferRpc(offerId: string): Promise<void> {
  if (!offerId) throw new Error("ID d'offre manquant.");
  await requireActiveSupabaseSession();
  const { error } = await supabase.rpc("claim_free_offer", {
    p_offer_id: offerId,
  });
  if (error) {
    console.error("Erreur RPC claim_free_offer:", error);
    throw new Error("Impossible d'obtenir cette offre gratuite : " + error.message);
  }
}

/**
 * Récupère les offres débloquées par un membre depuis member_entitlements
 */
export async function fetchMemberUnlockedOfferIds(memberId: string): Promise<string[]> {
  if (!memberId) return [];
  const entitlements = await fetchMemberEntitlements(memberId);
  return entitlements.map((item) => item.offer_id);
}

export async function fetchMemberEntitlements(memberId: string): Promise<MemberEntitlementRow[]> {
  if (!memberId) return [];
  const { data, error } = await supabase
    .from("member_entitlements")
    .select("*")
    .eq("member_id", memberId)
    .in("status", ["free", "paid", "trial"]);

  if (error) {
    console.error("Erreur lecture entitlements membre Supabase:", error);
    throw new Error(`Impossible de charger vos accès Supabase : ${error.message}`);
  }
  if (!data) throw new Error("Supabase n’a renvoyé aucune donnée pour vos accès.");

  return (data as MemberEntitlementRow[]).filter((item) => {
    const expiry =
      item.expires_at ||
      item.expiresAt ||
      item.valid_until ||
      item.ends_at ||
      item.trial_ends_at;
    return !expiry || new Date(expiry).getTime() > Date.now();
  });
}
