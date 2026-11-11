// @ts-nocheck
import {
  CreatorPlatformOffer,
  TelegramChannelItem,
  DiscordChannelItem,
  EbookResourceItem,
  CourseResourceItem,
  PrivateResourceItem,
  EnterpriseSubscription,
} from "../types";
import { TEMPORARY_FREE_ACCESS_ENABLED } from "./temporaryFreeAccess";
import { getCachedCompanyOffers } from "../services/supabaseOfferService";

export type { EbookResourceItem, CourseResourceItem, PrivateResourceItem };

interface DigitalFileReference {
  id: string;
  name?: string;
  title?: string;
  size?: string;
  file_size?: number;
  type?: string;
  mime_type?: string;
  description?: string;
  downloadUrl?: string;
  storageKey?: string;
}

type DownloadableEbookResource = EbookResourceItem & {
  storageKey?: string;
  fileId?: string;
  fileSize?: string;
};

type OfferWithDigitalFiles = CreatorPlatformOffer & {
  digitalFiles?: DigitalFileReference[];
};

/**
 * CATALOGUE CENTRAL DES OFFRES ET DES RESSOURCES/AVANTAGES RATTACHÉS
 * Chaque créateur/entreprise peut avoir plusieurs offres distinctes.
 * Chaque offre possède ses PROPRES canaux Telegram, salons Discord, E-books, formations, etc.
 * Un membre qui achète une offre n'obtient JAMAIS automatiquement accès aux autres ressources de l'entreprise.
 */
export const PLATFORM_OFFERS_CATALOG: CreatorPlatformOffer[] = [
  // ==========================================
  // 1. MONEY LIFE (comp-money-life)
  // Deux offres bien distinctes avec des Telegram distincts :
  // - Offre Paris Sportifs -> Telegram inclus = Telegram Paris Sportifs
  // - Offre Trading -> Telegram inclus = Telegram Trading
  // ==========================================
  {
    id: "offer-money-life-paris-sportifs",
    title: "Money Life · Paris Sportifs",
    companyId: "comp-money-life",
    companyName: "Money Life",
    companyInitials: "ML",
    companyGradient: "from-blue-600 via-indigo-900 to-black",
    category: "betting",
    categoryLabel: "Paris Sportifs & Pronostics",
    type: "membership",
    priceDisplay: "19 € / mois",
    priceAmount: 19,
    currency: "EUR",
    pricingType: "paid",
    billingCycle: "monthly",
    description: "Accès exclusif au canal privé Telegram de pronostics sportifs, combinés analysés et gestion de capital Money Life.",
    imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
    creatorName: "Ousmane Diallo",
    includedApps: ["telegram", "dashboard", "support"],
    subscribersCount: "3 840 membres",
    rating: 4.96,
    reviewsCount: 312,
    telegramChannels: [
      {
        id: "tg-ml-paris-sportifs",
        name: "Telegram Paris Sportifs · Money Life",
        inviteLink: "https://t.me/+MoneyLifeParisSportifsVIP",
        tag: "Paris Sportifs",
        quote: "Pronostics sportifs haute espérance de gain, value bets et bilans certifiés.",
        description: "Canal privé Telegram officiel des pronostics et analyses sportives Money Life.",
        subscribersCount: 3840,
      },
    ],
    discordChannels: [],
  },
  {
    id: "offer-money-life-trading",
    title: "Money Life · Trading Pro",
    companyId: "comp-money-life",
    companyName: "Money Life",
    companyInitials: "ML",
    companyGradient: "from-amber-600 via-yellow-700 to-black",
    category: "trading",
    categoryLabel: "Trading & Scalping",
    type: "membership",
    priceDisplay: "29 € / mois",
    priceAmount: 29,
    currency: "EUR",
    pricingType: "paid",
    billingCycle: "monthly",
    description: "Accès exclusif aux signaux en temps réel sur les devises et l'or (XAUUSD), sessions scalping et salon Discord Élite.",
    imageUrl: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1200&q=80",
    creatorName: "Ousmane Diallo",
    includedApps: ["telegram", "discord", "dashboard", "support"],
    subscribersCount: "2 950 membres",
    rating: 4.94,
    reviewsCount: 260,
    telegramChannels: [
      {
        id: "tg-ml-trading",
        name: "Telegram Trading · Money Life",
        inviteLink: "https://t.me/+MoneyLifeTradingVIP",
        tag: "Trading & Scalping",
        quote: "Signaux scalping en temps réel, analyses XAUUSD et plans de trading quotidiens.",
        description: "Canal privé Telegram officiel réservé aux signaux et analyses Trading Money Life.",
        subscribersCount: 2950,
      },
    ],
    discordChannels: [
      {
        id: "dc-ml-trading",
        name: "Money Life Discord Trading HQ",
        inviteLink: "https://discord.gg/money-life-trading",
        tag: "Discord Trading",
        description: "Salons vocaux pendant les sessions de Londres et New York, entraide traders.",
        subscribersCount: 2400,
        role: "Trader Pro VIP",
      },
    ],
  },

  // ==========================================
  // 2. CADRE FINANCIER (comp-cadre-financier)
  // - Offre Signaux VIP & Salons (Telegram + Discord)
  // - Offre Masterclass & Formation Vidéo (Formations + E-book)
  // ==========================================
  {
    id: "offer-cadre-financier",
    title: "Financial Framework Pro & VIP Discord",
    companyId: "comp-cadre-financier",
    companyName: "Cadre financier",
    companyInitials: "CF",
    companyGradient: "from-[#0d2818] via-[#051f10] to-[#010a04]",
    category: "trading",
    categoryLabel: "Finance Institutionnelle",
    type: "membership",
    priceDisplay: "19 000 FCFA / mois",
    priceAmount: 19000,
    currency: "XOF",
    pricingType: "paid",
    billingCycle: "monthly",
    description: "Méthodologie institutionnelle, analyses graphiques de pointe et accès direct aux salons Telegram et Discord.",
    imageUrl: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80",
    creatorName: "Marc-Antoine R.",
    includedApps: ["telegram", "discord", "dashboard", "support"],
    subscribersCount: "3 480 membres",
    rating: 4.98,
    reviewsCount: 384,
    telegramChannels: [
      {
        id: "tg-ff-vip",
        name: "Cadre financier · Signaux & Setups",
        inviteLink: "https://t.me/+FinancialFrameworkVIP",
        tag: "Signaux",
        quote: "Analyses de marchés, graphiques institutionnels et alertes scalping.",
        description: "Alertes quotidiennes et setups haute probabilité.",
        subscribersCount: 1840,
      },
      {
        id: "tg-ff-chat",
        name: "Cadre financier · Salon Membres",
        inviteLink: "https://t.me/+FinancialFrameworkLounge",
        tag: "Chat",
        quote: "Échanges en direct entre traders de la communauté.",
        description: "Discussions et partages d'analyses.",
        subscribersCount: 920,
      },
    ],
    discordChannels: [
      {
        id: "dc-ff-main",
        name: "Serveur Discord Cadre Financier",
        inviteLink: "https://discord.gg/financial-framework",
        tag: "Serveur Discord",
        description: "Rejoignez la communauté exclusive Financial Framework sur Discord avec salons vocaux.",
        subscribersCount: 3400,
        role: "Cadre Financier VIP",
      },
    ],
  },
  {
    id: "offer-cadre-financier-formation",
    title: "Cadre financier · Masterclass Finance & E-book",
    companyId: "comp-cadre-financier",
    companyName: "Cadre financier",
    companyInitials: "CF",
    companyGradient: "from-emerald-900 via-teal-950 to-black",
    category: "course",
    categoryLabel: "Formation & Stratégie",
    type: "course",
    priceDisplay: "35 000 FCFA",
    priceAmount: 35000,
    currency: "XOF",
    pricingType: "paid",
    billingCycle: "one_time",
    description: "Cursus vidéo complet et manuel de référence pour maîtriser le positionnement des banques et fonds institutionnels.",
    imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
    creatorName: "Marc-Antoine R.",
    includedApps: ["cours", "formation", "ebook", "dashboard", "support"],
    subscribersCount: "740 étudiants",
    rating: 4.99,
    reviewsCount: 195,
    courses: [
      {
        id: "co-cf-mastery",
        title: "Masterclass Trading & Liquidité Institutionnelle",
        description: "16 modules vidéo haute définition sur les order blocks, sessions d'Asie, Londres et New York.",
        modulesCount: 16,
        duration: "22 heures",
        accessUrl: "/courses/cadre-financier-masterclass",
        associatedOfferId: "offer-cadre-financier-formation",
        associatedOfferTitle: "Cadre financier · Masterclass Finance & E-book",
      },
    ],
    ebooks: [
      {
        id: "eb-cf-guide",
        title: "Le Guide Méthodologique Cadre Financier (PDF)",
        description: "Fiches récapitulatives prêtes à imprimer pour valider vos setups avant chaque entrée.",
        pagesCount: 148,
        downloadUrl: "/downloads/cadre-financier-guide.pdf",
        associatedOfferId: "offer-cadre-financier-formation",
        associatedOfferTitle: "Cadre financier · Masterclass Finance & E-book",
      },
    ],
  },

  // ==========================================
  // 3. VICTORY ODDS (comp-victory / comp-victory-odds)
  // ==========================================
  {
    id: "offer-victory-odds-vip",
    title: "Victory Odds · Club Privé Pronostics VIP",
    companyId: "comp-victory-odds",
    companyName: "Victory Odds",
    companyInitials: "VO",
    companyGradient: "from-emerald-600 via-teal-900 to-black",
    category: "betting",
    categoryLabel: "Sport & Pronostics",
    type: "membership",
    priceDisplay: "15 000 FCFA / mois",
    priceAmount: 15000,
    currency: "XOF",
    pricingType: "paid",
    billingCycle: "monthly",
    description: "Analyses de cotes européennes et africaines, alertes buteurs et combinés sécurisés.",
    imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
    creatorName: "Moussa Sissoko",
    includedApps: ["telegram", "discord", "dashboard", "support"],
    subscribersCount: "3 890 membres",
    rating: 4.88,
    reviewsCount: 310,
    telegramChannels: [
      {
        id: "tg-vo-vip",
        name: "Victory Odds · Pronostics Foot & Tennis VIP",
        inviteLink: "https://t.me/+VictoryOddsVIP",
        tag: "Picks VIP",
        quote: "Pronostics rigoureusement audités pour une rentabilité long terme.",
        description: "Canal privé Telegram officiel de Victory Odds.",
        subscribersCount: 3890,
      },
    ],
    discordChannels: [
      {
        id: "dc-vo-main",
        name: "Victory Odds Discord Match Hub",
        inviteLink: "https://discord.gg/victory-odds",
        tag: "Match Hub",
        description: "Salons d'échange pendant les matchs en direct.",
        subscribersCount: 3100,
        role: "VIP Bettor",
      },
    ],
  },

  // ==========================================
  // 4. FOREX ELITE AFRICA (comp-fce-africa)
  // ==========================================
  {
    id: "offer-fce-africa-signals",
    title: "Forex Elite · Signaux VIP Gold & FX",
    companyId: "comp-fce-africa",
    companyName: "Forex Elite Africa",
    companyInitials: "FE",
    companyGradient: "from-amber-600 via-yellow-700 to-black",
    category: "trading",
    categoryLabel: "Forex & Scalping",
    type: "membership",
    priceDisplay: "25 000 FCFA / mois",
    priceAmount: 25000,
    currency: "XOF",
    pricingType: "paid",
    billingCycle: "monthly",
    description: "Signaux haute précision avec points d'entrée, stop-loss et multi-take profits.",
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
    creatorName: "Kofi Mensah",
    includedApps: ["telegram", "discord", "dashboard", "support"],
    subscribersCount: "3 200 membres",
    rating: 4.90,
    reviewsCount: 215,
    telegramChannels: [
      {
        id: "tg-fce-vip",
        name: "Forex Elite · Signaux VIP Gold & FX",
        inviteLink: "https://t.me/+MansaForexEliteVIP",
        tag: "Signaux VIP",
        quote: "Signaux haute précision avec points d'entrée, stop-loss et multi-take profits.",
        description: "Alertes instantanées sur XAUUSD, EURUSD et indices boursiers.",
        subscribersCount: 3200,
      },
    ],
    discordChannels: [
      {
        id: "dc-fce-main",
        name: "Forex Elite Trading HQ",
        inviteLink: "https://discord.gg/forex-elite-africa",
        tag: "Live Trading HQ",
        description: "Serveur officiel avec vocaux en direct durant les sessions de Londres et New York.",
        subscribersCount: 2800,
        role: "Trader VIP",
      },
    ],
  },

  // ==========================================
  // 5. DEVKREATIV LAB SAAS (comp-devkreativ)
  // ==========================================
  {
    id: "offer-devkreativ-bots",
    title: "DevKreativ · Mansa Bot Automation & Webhooks",
    companyId: "comp-devkreativ",
    companyName: "DevKreativ Lab SaaS",
    companyInitials: "DK",
    companyGradient: "from-blue-600 via-indigo-900 to-black",
    category: "software",
    categoryLabel: "SaaS & Code",
    type: "membership",
    priceDisplay: "19 000 FCFA / mois",
    priceAmount: 19000,
    currency: "XOF",
    pricingType: "paid",
    billingCycle: "monthly",
    description: "Accès aux scripts de synchronisation Wave / MTN, documentation SDK et salon technique.",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    creatorName: "Sarah Benali",
    includedApps: ["telegram", "discord", "dashboard", "support"],
    subscribersCount: "4 200 membres",
    rating: 4.88,
    reviewsCount: 196,
    telegramChannels: [
      {
        id: "tg-dk-releases",
        name: "DevKreativ · Bot Updates & Patches",
        inviteLink: "https://t.me/+DevKreativUpdates",
        tag: "Mises à Jour",
        quote: "Changelogs, nouvelles fonctionnalités API et scripts NoCode.",
        description: "Canal privé Telegram officiel des mises à jour développeurs.",
        subscribersCount: 950,
      },
    ],
    discordChannels: [
      {
        id: "dc-dk-main",
        name: "DevKreativ SaaS Hub",
        inviteLink: "https://discord.gg/devkreativ-lab",
        tag: "Dev Community",
        description: "Entraide développeurs, snippets de code et intégrations Wave / MTN.",
        subscribersCount: 880,
        role: "Licensed Developer",
      },
    ],
  },

  // ==========================================
  // 6. E-COMMERCE MASTERY (comp-ecommerce-mastery)
  // ==========================================
  {
    id: "offer-ecommerce-mastery",
    title: "Académie Dropshipping & Import Chine",
    companyId: "comp-ecommerce-mastery",
    companyName: "E-Commerce Mastery UEMOA",
    companyInitials: "EM",
    companyGradient: "from-purple-600 via-pink-900 to-black",
    category: "ecommerce",
    categoryLabel: "E-Commerce & Import",
    type: "membership",
    priceDisplay: "45 000 FCFA (À vie)",
    priceAmount: 45000,
    currency: "XOF",
    pricingType: "paid",
    billingCycle: "one_time",
    description: "Accès à la base de contacts fournisseurs vérifiés en Chine et salons d'entraide e-commerce.",
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80",
    creatorName: "Mamadou Sow",
    includedApps: ["telegram", "discord", "ebook", "dashboard", "support"],
    subscribersCount: "8 900 membres",
    rating: 4.98,
    reviewsCount: 428,
    telegramChannels: [
      {
        id: "tg-em-contacts",
        name: "E-Commerce · Contacts Fournisseurs Vérifiés",
        inviteLink: "https://t.me/+EcommerceMasteryContacts",
        tag: "Sourcing",
        quote: "Adresses, agents d'expédition maritime/aérien et usines testées.",
        description: "Canal privé Telegram de mise en relation directe avec les usines chinoises.",
        subscribersCount: 1620,
      },
    ],
    discordChannels: [
      {
        id: "dc-em-main",
        name: "E-Commerce Afrique HQ",
        inviteLink: "https://discord.gg/ecommerce-afrique-hq",
        tag: "Entrepreneurs",
        description: "Audits de boutiques, retours d'expérience et partenariats logistiques.",
        subscribersCount: 1450,
        role: "Mastery Elite",
      },
    ],
    ebooks: [
      {
        id: "eb-em-contacts",
        title: "Annuaire des 80+ Usines et Transitaires Agréés Chine-Afrique (PDF)",
        description: "Contacts directs WhatsApp et WeChat des agents certifiés sans intermédiaire.",
        pagesCount: 142,
        downloadUrl: "/downloads/ecommerce-contacts.pdf",
        associatedOfferId: "offer-ecommerce-mastery",
        associatedOfferTitle: "Académie Dropshipping & Import Chine",
      },
    ],
  },

  // ==========================================
  // 7. BS SYNDICATE (comp-bs-syndicate)
  // ==========================================
  {
    id: "offer-bs-syndicate-pass",
    title: "BS Syndicate · Pass VIP Crypto & DeFi",
    companyId: "comp-bs-syndicate",
    companyName: "BS Syndicate Crypto",
    companyInitials: "BS",
    companyGradient: "from-stone-800 via-neutral-900 to-black",
    category: "crypto",
    categoryLabel: "Crypto & Web3",
    type: "membership",
    priceDisplay: "22 000 FCFA / mois",
    priceAmount: 22000,
    currency: "XOF",
    pricingType: "paid",
    billingCycle: "monthly",
    description: "Veille exclusive DeFi, nœuds validateurs et salons vocaux privés.",
    imageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
    creatorName: "Alexandre K.",
    includedApps: ["discord", "telegram", "dashboard", "support"],
    subscribersCount: "1 400 membres",
    rating: 4.92,
    reviewsCount: 168,
    telegramChannels: [
      {
        id: "tg-bs-alpha",
        name: "BS Syndicate · Alertes Airdrops & Alpha",
        inviteLink: "https://t.me/+BSSyndicateAlpha",
        tag: "Alpha DeFi",
        quote: "Détection précoce des airdrops et opportunités de yield farming.",
        description: "Canal privé Telegram d'alertes alpha DeFi.",
        subscribersCount: 1100,
      },
    ],
    discordChannels: [
      {
        id: "dc-bs-main",
        name: "BS Syndicate Discord HQ",
        inviteLink: "https://discord.gg/bs-syndicate",
        tag: "BS HQ",
        description: "Veille DeFi, nodes et airdrops.",
        subscribersCount: 1400,
        role: "Syndicate Member",
      },
    ],
  },
];

/**
 * Normalise les IDs d'offres débloquées/achetées depuis un objet EnterpriseSubscription
 */
export function normalizeUnlockedOfferIds(sub?: Partial<EnterpriseSubscription> | null): string[] {
  if (!sub) return [];
  const set = new Set<string>();

  if (Array.isArray(sub.unlockedProductIds)) {
    sub.unlockedProductIds.forEach((id) => {
      if (id && typeof id === "string") set.add(id);
    });
  }

  if (Array.isArray(sub.purchasedOfferIds)) {
    sub.purchasedOfferIds.forEach((id) => {
      if (id && typeof id === "string") set.add(id);
    });
  }

  if (
    sub.productId &&
    typeof sub.productId === "string" &&
    !isGenericFreeMembershipProductId(sub.productId, sub.companyId)
  ) {
    set.add(sub.productId);
  }

  if (TEMPORARY_FREE_ACCESS_ENABLED && sub.companyId) {
    getOffersForCompany(sub.companyId).forEach((offer) => set.add(offer.id));
  }

  return Array.from(set);
}

export function isGenericFreeMembershipProductId(
  productId?: string | null,
  companyId?: string | null,
): boolean {
  if (!productId?.trim() || !companyId?.trim()) return false;
  return productId.trim().toLowerCase() === `free-member-${companyId.trim().toLowerCase()}`;
}

/**
 * Convertit un projet ou produit créé dynamiquement en CreatorPlatformOffer
 */
export function convertProjectToPlatformOffer(
  project: any,
  fallbackCompanyId?: string,
  fallbackCompanyName?: string
): CreatorPlatformOffer {
  const rawApps = Array.isArray(project.apps)
    ? project.apps
    : Array.isArray(project.includedApps)
    ? project.includedApps
    : [];
  const apps = rawApps.length > 0 ? rawApps : ["dashboard", "support"];

  const currencyCode = project.currency || "XOF";
  const currencySymbol =
    currencyCode === "EUR" ? "€" : currencyCode === "USD" ? "$" : currencyCode;
  const isOneTime =
    project.pricingModel === "one_time" || project.billingCycle === "one_time";
  const billingText = isOneTime ? " (À vie)" : " / mois";
  const priceNum = Number(project.pricingAmount ?? project.priceAmount ?? 0);
  const priceDisplay = `${priceNum} ${currencySymbol}${billingText}`;

  const cId = project.companyId || fallbackCompanyId || "comp-cadre-financier";
  const cName = project.companyName || fallbackCompanyName || "Cadre financier";
  const prodTitle = project.name || project.title || "Offre Mansa";

  return {
    id: project.id,
    title: prodTitle,
    companyId: cId,
    companyName: cName,
    category: project.category || "membership",
    categoryLabel:
      project.categoryLabel ||
      (apps.includes("telegram")
        ? "Canaux Privés Telegram"
        : apps.includes("courses")
        ? "Formation Vidéo"
        : apps.includes("ebook")
        ? "E-book & Guides"
        : "Produit Digital"),
    type:
      project.productType ||
      (apps.includes("courses")
        ? "course"
        : apps.includes("ebook")
        ? "ebook"
        : "membership"),
    priceDisplay,
    priceAmount: priceNum,
    currency: currencyCode,
    pricingType: priceNum === 0 ? "free" : "paid",
    billingCycle: isOneTime ? "one_time" : "monthly",
    description:
      project.tagline ||
      project.description ||
      `Accédez à l'ensemble des modules et ressources incluses avec ${prodTitle}.`,
    imageUrl:
      project.coverImage ||
      project.imageUrl ||
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
    bannerUrl: project.bannerUrl || undefined,
    creatorName: project.creatorName || cName,
    ctaText: project.ctaText || undefined,
    affiliateCommissionRate: Number.isFinite(
      Number(project.affiliateCommissionRate ?? project.affiliateRate),
    )
      ? Number(project.affiliateCommissionRate ?? project.affiliateRate)
      : 0,
    includedApps: apps,
    subscribersCount: `${project.membersCount || project.activeUsers || 142} membres`,
    rating: 4.98,
    reviewsCount: 142,
    telegramChannels:
      project.telegramChannels ||
      (apps.some((a: string) => a.toLowerCase().includes("telegram"))
        ? [
            {
              id: `tg-${project.id}`,
              name: `Telegram VIP · ${prodTitle}`,
              inviteLink: `https://t.me/+${prodTitle.replace(/[^a-zA-Z0-9]/g, "")}VIP`,
              tag: "Telegram VIP",
              description: `Canal privé Telegram officiel avec alertes et signaux exclusifs pour ${prodTitle}.`,
              subscribersCount: project.membersCount || 142,
            },
          ]
        : []),
    discordChannels:
      project.discordChannels ||
      (apps.some((a: string) => a.toLowerCase().includes("discord"))
        ? [
            {
              id: `dc-${project.id}`,
              name: `Discord VIP · ${prodTitle}`,
              inviteLink: `https://discord.gg/${prodTitle.toLowerCase().replace(/[^a-zA-Z0-9]/g, "-")}`,
              tag: "Discord VIP",
              description: `Salons privés Discord officiels avec accès instantané pour ${prodTitle}.`,
              subscribersCount: project.membersCount || 98,
              role: "Membre VIP",
            },
          ]
        : []),
    ebooks:
      project.ebooks ||
      (project.digitalFiles || []).map((file: any) => ({
        id: file.id,
        title: file.title || file.name || "Fichier sans nom",
        description: file.description || file.type || "Fichier téléchargeable",
        downloadUrl: file.downloadUrl,
        storageKey: file.storageKey,
        fileId: file.id,
        fileSize: file.size,
        associatedOfferId: project.id,
        associatedOfferTitle: prodTitle,
      })),
    courseModules: project.courseModules || [],
    digitalFiles: project.digitalFiles || [],
    courses:
      project.courses ||
      (project.courseModules?.length
        ? [
            {
              id: `co-${project.id}`,
              title: prodTitle,
              description: project.description || "Modules de formation inclus dans cette offre.",
              modulesCount: project.courseModules.length,
              courseModules: project.courseModules,
              accessUrl: undefined,
              associatedOfferId: project.id,
              associatedOfferTitle: prodTitle,
            },
          ]
        : []),
    faqs: project.faqs || [
      {
        q: `Comment débloquer les accès de l'offre ${prodTitle} ?`,
        a: "Vos privilèges sont activés automatiquement dès la validation de votre paiement par carte ou Mobile Money (Wave, MTN, Orange Money).",
      },
      {
        q: "L'accès aux canaux et ressources est-il garanti ?",
        a: "Oui, tous les liens d'invitation et espaces privés sont disponibles directement dans votre espace membre.",
      },
    ],
    pricingOptions: project.pricingOptions || [
      {
        id: "default-plan",
        name: isOneTime ? "Paiement Unique & À vie" : "Abonnement Mensuel",
        price: priceNum,
        billing: isOneTime ? "paiement unique" : "mois",
      },
    ],
  };
}

function readStoredArray(key: string): any[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function storedCreatorOffers(): CreatorPlatformOffer[] {
  if (typeof window === "undefined") return [];
  try {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith("mansa_creator_offers_"));
    return keys.flatMap((key) => {
      const fallbackCompanyId = key.slice("mansa_creator_offers_".length);
      return readStoredArray(key)
        .filter((offer) => offer?.id)
        .map((offer) => {
          const converted = convertProjectToPlatformOffer(
            { ...offer, name: offer.name || offer.title, includedApps: offer.includedApps || offer.apps },
            offer.companyId || fallbackCompanyId,
            offer.companyName,
          );
          return {
            ...offer,
            id: offer.id,
            title: offer.title || offer.name || converted.title,
            companyId: offer.companyId || fallbackCompanyId,
            companyName: offer.companyName || converted.companyName,
            category: offer.category || converted.category,
            type: offer.type || converted.type,
            priceDisplay: offer.priceDisplay || converted.priceDisplay,
            priceAmount: offer.priceAmount ?? converted.priceAmount,
            currency: offer.currency || converted.currency,
            pricingType: offer.pricingType || converted.pricingType,
            billingCycle: offer.billingCycle || converted.billingCycle,
            includedApps: offer.includedApps || offer.apps || converted.includedApps,
          } as CreatorPlatformOffer;
        });
    });
  } catch (error) {
    console.warn("Notice: unable to read creator offers from browser storage:", error);
    return [];
  }
}

function mergeOfferResources(
  existing: CreatorPlatformOffer,
  incoming: CreatorPlatformOffer,
): CreatorPlatformOffer {
  return {
    ...existing,
    ...incoming,
    description: incoming.description ?? existing.description,
    imageUrl: incoming.imageUrl ?? existing.imageUrl,
    bannerUrl: incoming.bannerUrl ?? existing.bannerUrl,
    creatorName: incoming.creatorName ?? existing.creatorName,
    telegramChannels: incoming.telegramChannels ?? existing.telegramChannels,
    discordChannels: incoming.discordChannels ?? existing.discordChannels,
    ebooks: incoming.ebooks ?? existing.ebooks,
    courses: incoming.courses ?? existing.courses,
    courseModules: incoming.courseModules ?? existing.courseModules,
    digitalFiles: incoming.digitalFiles ?? existing.digitalFiles,
    customResources: incoming.customResources ?? existing.customResources,
  };
}

/**
 * Récupère toutes les offres configurées pour une entreprise donnée
 * (Offres statiques de catalogue + Produits créés dynamiquement)
 */
export function getOffersForCompany(companyId: string): CreatorPlatformOffer[] {
  if (!companyId) return [];
  const normalized = companyId.trim().toLowerCase();
  
  // 1. Offres du catalogue de base
  const staticOffers = PLATFORM_OFFERS_CATALOG.filter(
    (o) =>
      o.companyId.toLowerCase() === normalized ||
      (normalized.startsWith("comp-") && o.companyId.toLowerCase() === normalized) ||
      o.companyName.toLowerCase() === normalized
  );

  // 1b. Offres Supabase synchronisées
  for (const supOffer of getCachedCompanyOffers(companyId)) {
    const index = staticOffers.findIndex((o) => o.id === supOffer.id);
    if (index < 0) staticOffers.push(supOffer);
    else staticOffers[index] = mergeOfferResources(staticOffers[index], supOffer);
  }

  // 2. Produits créés dynamiquement depuis le cache local du créateur
  try {
    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith("mansa_saved_products_cache_"));
      const products = keys.flatMap((key) => {
        return readStoredArray(key);
      });
      const dynamicOffers: CreatorPlatformOffer[] = products
        .filter((product) => product?.id && product.status === "active"
          && (product.companyId || "").trim().toLowerCase() === normalized)
        .map((product) => convertProjectToPlatformOffer(product, companyId));
      for (const offer of dynamicOffers) {
        const index = staticOffers.findIndex((saved) => saved.id === offer.id);
        if (index < 0) staticOffers.push(offer);
        else staticOffers[index] = mergeOfferResources(staticOffers[index], offer);
      }
    }
  } catch (err) {
    console.warn("Notice: getOffersForCompany reading dynamic products:", err);
  }

  // 3. L’éditeur d’offres écrit les ressources sous cette clé. Elle est la source
  // canonique du workflow créateur et doit être fusionnée au cache de produits.
  for (const savedOffer of storedCreatorOffers()) {
    if ((savedOffer.companyId || "").trim().toLowerCase() !== normalized) continue;
    const index = staticOffers.findIndex((offer) => offer.id === savedOffer.id);
    if (index < 0) staticOffers.push(savedOffer);
    else staticOffers[index] = mergeOfferResources(staticOffers[index], savedOffer);
  }

  return staticOffers;
}

/**
 * Récupère une offre par son ID
 */
export function getOfferById(offerId: string): CreatorPlatformOffer | undefined {
  if (!offerId) return undefined;
  const staticFound = PLATFORM_OFFERS_CATALOG.find((o) => o.id === offerId);
  if (staticFound) return staticFound;

  const creatorOffer = storedCreatorOffers().find((offer) => offer.id === offerId);
  if (creatorOffer) return creatorOffer;

  // Chercher dans les produits créés dynamiquement
  try {
    if (typeof window !== "undefined") {
      const productCacheKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith("mansa_saved_products_cache_"),
      );
      for (const key of productCacheKeys) {
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        if (!Array.isArray(parsed)) continue;
        const dynamicProd = parsed.find((product) =>
          product && product.id === offerId && product.status === "active" && product.companyId,
        );
        if (dynamicProd) return convertProjectToPlatformOffer(dynamicProd);
      }
    }
  } catch (err) {
    console.warn("Notice: getOfferById reading dynamic product:", err);
  }

  return undefined;
}

/**
 * Récupère STRICTEMENT les offres que le membre possède pour cette entreprise
 */
export function getMemberAuthorizedOffers(
  companyId: string,
  unlockedOfferIds: string[],
  additionalOffers: CreatorPlatformOffer[] = [],
): CreatorPlatformOffer[] {
  const companyOffers = getOffersForCompany(companyId);
  const merged = new Map(companyOffers.map((offer) => [offer.id, offer]));
  for (const offer of additionalOffers) {
    if (offer.companyId === companyId) merged.set(offer.id, { ...merged.get(offer.id), ...offer });
  }
  const normalizedUnlocked = new Set(unlockedOfferIds.map((id) => id.trim().toLowerCase()));

  return [...merged.values()].filter((offer) => normalizedUnlocked.has(offer.id.toLowerCase()));
}

/**
 * Récupère STRICTEMENT les canaux Telegram auxquels le membre a droit selon les offres qu'il a achetées.
 * S'il possède Offre Money Life (Paris Sportifs), il n'aura QUE Telegram Paris Sportifs.
 * S'il possède Offre Trading, il n'aura QUE Telegram Trading.
 */
export function getMemberAuthorizedTelegramChannels(
  companyId: string,
  unlockedOfferIds: string[],
  additionalOffers: CreatorPlatformOffer[] = [],
): TelegramChannelItem[] {
  const authorizedOffers = getMemberAuthorizedOffers(companyId, unlockedOfferIds, additionalOffers);
  const channels: TelegramChannelItem[] = [];
  const seen = new Set<string>();

  for (const offer of authorizedOffers) {
    if (offer.telegramChannels && Array.isArray(offer.telegramChannels)) {
      for (const ch of offer.telegramChannels) {
        if (!seen.has(ch.id)) {
          seen.add(ch.id);
          channels.push({
            ...ch,
            tag: ch.tag || offer.title,
          });
        }
      }
    }
  }

  return channels;
}

/**
 * Récupère STRICTEMENT les serveurs/salons Discord auxquels le membre a droit selon les offres achetées
 */
export function getMemberAuthorizedDiscordChannels(
  companyId: string,
  unlockedOfferIds: string[],
  additionalOffers: CreatorPlatformOffer[] = [],
): DiscordChannelItem[] {
  const authorizedOffers = getMemberAuthorizedOffers(companyId, unlockedOfferIds, additionalOffers);
  const channels: DiscordChannelItem[] = [];
  const seen = new Set<string>();

  for (const offer of authorizedOffers) {
    if (offer.discordChannels && Array.isArray(offer.discordChannels)) {
      for (const ch of offer.discordChannels) {
        if (!seen.has(ch.id)) {
          seen.add(ch.id);
          channels.push(ch);
        }
      }
    }
  }

  return channels;
}

/**
 * Récupère STRICTEMENT les E-books auxquels le membre a droit selon les offres achetées
 */
export function getMemberAuthorizedEbooks(
  companyId: string,
  unlockedOfferIds: string[],
  additionalOffers: CreatorPlatformOffer[] = [],
): EbookResourceItem[] {
  const authorizedOffers = getMemberAuthorizedOffers(companyId, unlockedOfferIds, additionalOffers);
  const ebooks: EbookResourceItem[] = [];
  const seen = new Set<string>();
  const seenStorageKeys = new Set<string>();

  for (const offer of authorizedOffers) {
    if (offer.ebooks && Array.isArray(offer.ebooks)) {
      for (const eb of offer.ebooks as DownloadableEbookResource[]) {
        if (!eb.storageKey && !eb.downloadUrl) continue;
        if (!seen.has(eb.id) && (!eb.storageKey || !seenStorageKeys.has(eb.storageKey))) {
          seen.add(eb.id);
          if (eb.storageKey) seenStorageKeys.add(eb.storageKey);
          ebooks.push(eb);
        }
      }
    }
    const digitalFiles = (offer as OfferWithDigitalFiles).digitalFiles || [];
    if (Array.isArray(digitalFiles)) {
      for (const file of digitalFiles) {
        if (!file?.id || (!file.storageKey && !file.downloadUrl)) continue;
        const ebook = {
          id: file.id,
          title: file.name || file.title || "Fichier sans nom",
          name: file.name || file.title || "Fichier sans nom",
          description: file.description || file.type || file.mime_type || "Fichier téléchargeable",
          mime_type: file.mime_type || file.type || "application/octet-stream",
          downloadUrl: file.downloadUrl,
          storageKey: file.storageKey,
          fileId: file.id,
          file_size: file.file_size,
          fileSize: file.size || (typeof file.file_size === "number" ? `${Math.round(file.file_size / 1024)} KB` : undefined),
          associatedOfferId: offer.id,
          associatedOfferTitle: offer.title,
        };
        const existingIndex = ebooks.findIndex(
          (item) => item.id === ebook.id || (!!item.storageKey && item.storageKey === ebook.storageKey),
        );
        if (existingIndex < 0) {
          seen.add(ebook.id);
          if (ebook.storageKey) seenStorageKeys.add(ebook.storageKey);
          ebooks.push(ebook);
        } else {
          ebooks[existingIndex] = { ...ebooks[existingIndex], ...ebook };
        }
      }
    }
  }

  return ebooks;
}

/**
 * Récupère STRICTEMENT les Formations / Cours auxquels le membre a droit selon les offres achetées
 */
export function getMemberAuthorizedCourses(
  companyId: string,
  unlockedOfferIds: string[],
  additionalOffers: CreatorPlatformOffer[] = [],
): CourseResourceItem[] {
  const authorizedOffers = getMemberAuthorizedOffers(companyId, unlockedOfferIds, additionalOffers);
  const courses: CourseResourceItem[] = [];
  const seen = new Set<string>();

  for (const offer of authorizedOffers) {
    if (offer.courses && Array.isArray(offer.courses)) {
      for (const co of offer.courses) {
        if (!seen.has(co.id)) {
          seen.add(co.id);
          if (Array.isArray(co.chapters)) {
            courses.push(co);
            continue;
          }
          const chapters = co.chapters || co.courseModules || co.modules || [];
          courses.push({
            ...co,
            chapters,
            modules: co.modules || chapters,
            courseModules: co.courseModules || chapters,
            modulesCount: co.modulesCount ?? chapters.length,
          });
        }
      }
    }
  }

  return courses;
}

/**
 * Vérification universelle et stricte des droits d'accès à une ressource précise
 * Répond à la question : « Est-ce que cet utilisateur possède cette offre précise, et est-ce que cette offre lui donne accès à cette ressource précise ? »
 */
export function verifyMemberResourceAccess(params: {
  companyId: string;
  unlockedOfferIds: string[];
  resourceType:
    | "telegram"
    | "discord"
    | "ebook"
    | "course"
    | "service"
    | "document"
    | "resource"
    | "group"
    | "channel"
    | string;
  resourceId: string;
}): {
  isAuthorized: boolean;
  resource?: any;
  grantedByOffer?: CreatorPlatformOffer;
  requiredOffer?: CreatorPlatformOffer;
  error?: string;
} {
  const { companyId, unlockedOfferIds, resourceType, resourceId } = params;
  const companyOffers = getOffersForCompany(companyId);

  // Trouver quelle offre précise de l'entreprise contient cette ressource
  let targetOffer: CreatorPlatformOffer | undefined = undefined;
  let targetResource: any = undefined;

  for (const offer of companyOffers) {
    if (resourceType === "telegram" && offer.telegramChannels) {
      const found = offer.telegramChannels.find((c) => c.id === resourceId || c.inviteLink === resourceId);
      if (found) {
        targetOffer = offer;
        targetResource = found;
        break;
      }
    } else if (resourceType === "discord" && offer.discordChannels) {
      const found = offer.discordChannels.find((c) => c.id === resourceId || c.inviteLink === resourceId);
      if (found) {
        targetOffer = offer;
        targetResource = found;
        break;
      }
    } else if (resourceType === "ebook" && (offer.ebooks || (offer as OfferWithDigitalFiles).digitalFiles)) {
      const found = (offer.ebooks as DownloadableEbookResource[] | undefined || []).find((e) => e.id === resourceId || e.downloadUrl === resourceId)
        || ((offer as OfferWithDigitalFiles).digitalFiles || []).find((file) => file.id === resourceId || file.downloadUrl === resourceId);
      if (found) {
        targetOffer = offer;
        targetResource = found;
        break;
      }
    } else if (resourceType === "course" && offer.courses) {
      const found = offer.courses.find((c) => c.id === resourceId || c.accessUrl === resourceId);
      if (found) {
        targetOffer = offer;
        targetResource = found;
        break;
      }
    } else if (
      (resourceType === "service" ||
        resourceType === "document" ||
        resourceType === "resource" ||
        resourceType === "group" ||
        resourceType === "channel") &&
      offer.customResources
    ) {
      const found = offer.customResources.find(
        (r) => r.id === resourceId || (r.url && r.url === resourceId)
      );
      if (found) {
        targetOffer = offer;
        targetResource = found;
        break;
      }
    }
  }

  // Si la ressource n'appartient à aucune offre connue de l'entreprise
  if (!targetOffer || !targetResource) {
    return {
      isAuthorized: false,
      error: `Ressource non trouvée ou non configurée pour l'entreprise '${companyId}'.`,
    };
  }

  // Vérifier si le membre possède STRICTEMENT l'offre associée à cette ressource
  const memberUnlockedSet = new Set(unlockedOfferIds.map((id) => id.trim().toLowerCase()));
  const hasOffer = memberUnlockedSet.has(targetOffer.id.toLowerCase());

  // Une ressource peut être liée à plusieurs offres. Si la première offre de la
  // liste n’est pas détenue, chercher une autre offre autorisée qui fournit le même ID.
  if (!hasOffer && (resourceType === "course" || resourceType === "ebook")) {
    for (const offer of companyOffers) {
      if (!memberUnlockedSet.has(offer.id.toLowerCase())) continue;
      const resource = resourceType === "course"
        ? (offer.courses || []).find((item) => item.id === resourceId || item.accessUrl === resourceId)
        : (offer.ebooks as DownloadableEbookResource[] | undefined || []).find((item) => item.id === resourceId || item.downloadUrl === resourceId)
          || ((offer as OfferWithDigitalFiles).digitalFiles || []).find((item) => item.id === resourceId || item.downloadUrl === resourceId);
      if (resource) {
        return { isAuthorized: true, resource, grantedByOffer: offer };
      }
    }
  }

  if (hasOffer) {
    return {
      isAuthorized: true,
      resource: targetResource,
      grantedByOffer: targetOffer,
    };
  } else {
    return {
      isAuthorized: false,
      requiredOffer: targetOffer,
      error: `Accès refusé. Cette ressource est exclusivement réservée à l'offre '${targetOffer.title}'. Vous devez souscrire à cette offre pour y accéder.`,
    };
  }
}

/**
 * Récupère STRICTEMENT les ressources personnalisées / services / documents auxquels le membre a droit
 */
export function getMemberAuthorizedCustomResources(
  companyId: string,
  unlockedOfferIds: string[]
): PrivateResourceItem[] {
  const authorizedOffers = getMemberAuthorizedOffers(companyId, unlockedOfferIds);
  const resources: PrivateResourceItem[] = [];
  const seen = new Set<string>();

  for (const offer of authorizedOffers) {
    if (offer.customResources && Array.isArray(offer.customResources)) {
      for (const res of offer.customResources) {
        if (!seen.has(res.id)) {
          seen.add(res.id);
          resources.push(res);
        }
      }
    }
  }

  return resources;
}
