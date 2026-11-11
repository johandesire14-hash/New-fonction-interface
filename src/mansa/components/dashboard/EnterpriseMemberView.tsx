// @ts-nocheck
import React, { useState } from "react";
import {
  Home,
  MessageSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Check,
  QrCode,
  Sparkles,
  HelpCircle,
  Clock,
  Zap,
  Lock,
  Unlock,
  Download,
  Users,
  Send,
  AlertCircle,
  Radio,
  Share2,
  Link2,
  MapPin,
  User,
  MoreHorizontal,
  Pin,
  Heart,
  MessageCircle,
  Star,
  Calendar,
  ThumbsUp,
  FileText,
  SlidersHorizontal,
  Menu,
  X,
  Bookmark,
  Search,
  RefreshCw,
  Compass,
  Plus,
  ShoppingBag,
  Package,
  Camera,
  Building2,
  MoreVertical,
  Flag,
  BookOpen,
  GraduationCap,
  Eye,
  EyeOff,
  TrendingUp,
  Layers,
  PenLine,
  BarChart3,
  DollarSign,
  Video,
  LayoutDashboard,
  Trash2,
} from "lucide-react";
import { CompanySocialIcons } from "./CompanySocialIcons";
import { EnterpriseSubscription, TelegramChannelItem, DiscordChannelItem } from "../../types";
import { ConnectedAppsView, TelegramIcon, DiscordIcon } from "./ConnectedAppsView";
import { SupportInboxView } from "./SupportInboxView";
import { OfferCheckoutModal, CreatorPlatformOffer } from "./OfferCheckoutModal";
import {
  saveSubscription,
  updateSubscriptionBranding,
  removeSubscription,
  cancelActiveSubscription,
} from "../../utils/subscriptionsStorage";
import {
  convertProjectToPlatformOffer,
  getMemberAuthorizedTelegramChannels,
  getMemberAuthorizedDiscordChannels,
  getMemberAuthorizedEbooks,
  getMemberAuthorizedCourses,
  getMemberAuthorizedOffers,
  isGenericFreeMembershipProductId,
  normalizeUnlockedOfferIds,
  verifyMemberResourceAccess,
  EbookResourceItem,
  CourseResourceItem,
} from "../../utils/rightsAccessEngine";
import {
  prepareTemporaryFreeCheckoutOffer,
  TEMPORARY_FREE_ACCESS_ENABLED,
} from "../../utils/temporaryFreeAccess";
import { downloadDigitalAsset, saveDigitalAsset } from "../../utils/digitalAssetStorage";
import { getCurrencySymbol } from "../../utils/currency";
import {
  getPostsForCompany,
  createCompanyPost,
  deleteCompanyPost,
  getAllStoredPosts,
  saveAllPosts,
  recordCompanyPollVote,
  CompanyPost,
} from "../../utils/companyPostsStorage";
import { getMemberProductsByIds, subscribeToCompanyOffers } from "../../services/dbService";
import {
  deleteCreatorCourseFromOffer,
  fetchCompanyOffersFromSupabase,
  saveCreatorCourseToOffer,
} from "../../services/supabaseOfferService";
import { dispatchProductUpdates } from "../../utils/productUpdateEvents";
import {
  updateCompanyBranding,
  getSavedCompanies,
  subscribeToDiscoverableCompany,
} from "../../utils/companyStorage";
import {
  fetchMemberCommunities,
  joinCommunityRpc,
} from "../../services/supabaseCommunityService";
import {
  appendLocalSupportMessage,
  getLocalSupportConversation,
  LOCAL_SUPPORT_CONVERSATIONS_EVENT,
  LOCAL_SUPPORT_CONVERSATIONS_PREFIX,
  getLocalCompanyMemberCount,
} from "../../utils/localCommunityStore";
import { EnterpriseBrandingModal } from "./EnterpriseBrandingModal";
import { CourseReaderModal } from "./CourseReaderModal";
import { ClientCoursesView } from "./ClientCoursesView";
import { ClientFilesView } from "./ClientFilesView";
import { ManageMembershipModal } from "./ManageMembershipModal";
import { ReportEnterpriseModal } from "./ReportEnterpriseModal";
import { CompanyPostComposer, type CompanyPostDraft } from "./CompanyPostComposer";
import { getCreatorAppProductIds } from "../../utils/creatorAppRouting";
import { getVisibleIncludedAppNames } from "../../utils/memberAppAccess";
import { createOrGetAffiliateLink } from "../../services/affiliateService";
import { siteUrl } from "@/lib/site";
import { getUserFacingErrorMessage } from "../../utils/userFacingError";
import logoImg from "../../assets/images/afhub_logo_africa_1787956612844.webp";

interface EnterpriseMemberViewProps {
  subscription: EnterpriseSubscription;
  lang: "fr" | "en";
  onBackToPersonal?: () => void;
  allSubscriptions?: EnterpriseSubscription[];
  onSelectSubscription?: (subId: string) => void;
  creatorCompanies?: any[];
  onSelectCreatorCompany?: (comp: any) => void;
  user?: { uid?: string; name: string; email: string; avatarInitials?: string };
  onOpenMarketplace?: () => void;
  onOpenCreatorDashboard?: () => void;
  onOpenCreatorAssistance?: () => void;
  onCreateProduct?: () => void;
  onOpenCreatorApplications?: () => void;
  onOpenCreatorAppWorkspace?: (app: "courses" | "files", productIds: string[]) => void;
  onCheckoutOpenChange?: (open: boolean) => void;
}

export const EnterpriseMemberView: React.FC<EnterpriseMemberViewProps> = ({
  subscription,
  lang,
  onBackToPersonal,
  allSubscriptions = [],
  onSelectSubscription,
  creatorCompanies = [],
  onSelectCreatorCompany,
  user = { name: "Johan Désiré", email: "johan@afhub.app", avatarInitials: "JD" },
  onOpenMarketplace,
  onOpenCreatorDashboard,
  onOpenCreatorAssistance,
  onCreateProduct,
  onOpenCreatorApplications,
  onOpenCreatorAppWorkspace,
  onCheckoutOpenChange,
}) => {
  // Navigation inside the enterprise hub - defaults to "accueil" for company home view
  const [activeTab, setActiveTab] = useState<
    "accueil" | "support" | "applications" | "telegram" | "discord"
  >("accueil");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileCompanyNavOpen, setIsMobileCompanyNavOpen] = useState(false);

  // Dynamic access state based on user's active apps & subscriptions
  const [currentIncludedApps, setCurrentIncludedApps] = useState<string[]>(
    subscription.includedApps || ["dashboard", "support"],
  );

  const isInitiallyPaid =
    subscription.hasPaidOffer !== undefined
      ? Boolean(subscription.hasPaidOffer)
      : (subscription.includedApps || []).some((a) =>
          ["telegram", "discord", "cours", "vip"].some((kw) => a.toLowerCase().includes(kw)),
        );

  const [hasPaidOffer, setHasPaidOffer] = useState<boolean>(isInitiallyPaid);
  const [unlockedProductIds, setUnlockedProductIds] = useState<string[]>(
    subscription.unlockedProductIds || [],
  );

  React.useEffect(() => {
    setCurrentIncludedApps(subscription.includedApps || ["dashboard", "support"]);
    const isPaid =
      subscription.hasPaidOffer !== undefined
        ? Boolean(subscription.hasPaidOffer)
        : (subscription.includedApps || []).some((a) =>
            ["telegram", "discord", "cours", "vip"].some((kw) => a.toLowerCase().includes(kw)),
          );
    setHasPaidOffer(isPaid);
    setUnlockedProductIds(subscription.unlockedProductIds || []);
  }, [
    subscription.id,
    subscription.includedApps,
    subscription.hasPaidOffer,
    subscription.unlockedProductIds,
  ]);

  const [checkoutModalOffer, setCheckoutModalOffer] = useState<CreatorPlatformOffer | null>(null);
  React.useEffect(() => {
    onCheckoutOpenChange?.(Boolean(checkoutModalOffer));
  }, [checkoutModalOffer, onCheckoutOpenChange]);
  const [selectedProductDetailOffer, setSelectedProductDetailOffer] =
    useState<CreatorPlatformOffer | null>(null);
  const [selectedProductPlanId, setSelectedProductPlanId] = useState<string | null>(null);
  const [expandedProductFaqIndex, setExpandedProductFaqIndex] = useState<number | null>(null);
  const [affiliateLinkError, setAffiliateLinkError] = useState<string>("");
  const [isCreatingAffiliateLink, setIsCreatingAffiliateLink] = useState(false);
  const [isAffiliateLinkCopied, setIsAffiliateLinkCopied] = useState(false);
  const affiliateLinkButtonLabel = isCreatingAffiliateLink
    ? "Création du lien d’affiliation"
    : affiliateLinkError
      ? affiliateLinkError
      : isAffiliateLinkCopied
        ? "Lien d’affiliation copié"
        : "Copier le lien d’affiliation";

  const handleCopyAffiliateLink = async (offer: CreatorPlatformOffer) => {
    setAffiliateLinkError("");
    setIsAffiliateLinkCopied(false);
    if (!user?.uid) {
      setAffiliateLinkError("Connectez-vous pour créer votre lien personnel.");
      return;
    }
    const rate = Number(offer.affiliateCommissionRate || 0);
    if (rate <= 0) {
      setAffiliateLinkError("Le créateur n’a pas activé l’affiliation pour ce produit.");
      return;
    }
    setIsCreatingAffiliateLink(true);
    try {
      const link = await createOrGetAffiliateLink(user.uid, {
        id: offer.id,
        affiliateCommissionRate: rate,
      });
      const url = siteUrl(`/affiliate/${encodeURIComponent(link.code)}`);
      await navigator.clipboard.writeText(url);
      setIsAffiliateLinkCopied(true);
      window.setTimeout(() => setIsAffiliateLinkCopied(false), 2500);
    } catch (error) {
      console.error("Affiliate link creation failed:", error);
      setAffiliateLinkError(
        getUserFacingErrorMessage(error, "Impossible de créer le lien affilié. Réessayez."),
      );
    } finally {
      setIsCreatingAffiliateLink(false);
    }
  };

  // Enterprise branding state (Banner & Profile Photo customization)
  const [currentSub, setCurrentSub] = useState<EnterpriseSubscription>(subscription);
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [isPostComposerOpen, setIsPostComposerOpen] = useState(false);
  const [selectedMemberProductId, setSelectedMemberProductId] = useState<string | null>(
    subscription.productId || null,
  );

  React.useEffect(() => {
    setCurrentSub(subscription);
  }, [subscription]);

  const companyId = currentSub.companyId || currentSub.id;

  React.useEffect(() => {
    return subscribeToDiscoverableCompany(companyId, (company) => {
      if (!company) return;
      setCurrentSub((previous) => ({
        ...previous,
        companyName: company.name || previous.companyName,
        description: company.description || previous.description,
        companyBanner: company.companyBanner || previous.companyBanner,
        companyLogo: company.companyLogo || previous.companyLogo,
      }));
    });
  }, [companyId]);

  const [, setMemberCountRefreshTrigger] = useState(0);
  const companyRecord = (creatorCompanies || []).find(
    (company) => company && (company.id === companyId || company.companyId === companyId),
  );
  const savedMemberCount = Number(
    companyRecord?.membersCount ??
      (currentSub as EnterpriseSubscription & { membersCount?: number }).membersCount ??
      0,
  );
  const companyMemberCount = Math.max(
    Number.isFinite(savedMemberCount) ? savedMemberCount : 0,
    getLocalCompanyMemberCount(companyId, currentSub.companyName),
  );

  React.useEffect(() => {
    const refreshMemberCount = (event?: Event) => {
      const eventCompanyId = (event as CustomEvent | undefined)?.detail?.companyId;
      if (!eventCompanyId || eventCompanyId === companyId) {
        setMemberCountRefreshTrigger((previous) => previous + 1);
      }
    };
    window.addEventListener("mansa_local_company_members_updated", refreshMemberCount);
    window.addEventListener("mansa_community_joined", refreshMemberCount);
    window.addEventListener("mansa_community_left", refreshMemberCount);
    window.addEventListener("mansa_subscription_updated", refreshMemberCount);
    window.addEventListener("storage", refreshMemberCount);
    return () => {
      window.removeEventListener("mansa_local_company_members_updated", refreshMemberCount);
      window.removeEventListener("mansa_community_joined", refreshMemberCount);
      window.removeEventListener("mansa_community_left", refreshMemberCount);
      window.removeEventListener("mansa_subscription_updated", refreshMemberCount);
      window.removeEventListener("storage", refreshMemberCount);
    };
  }, [companyId]);

  const handleReturnToCommunity = () => {
    if (currentSub.isCommunityPreview && onOpenMarketplace) {
      onOpenMarketplace();
      return;
    }
    setActiveTab("accueil");
    setCompanyTab("accueil");
    setIsMobileCompanyNavOpen(true);
    setIsMobileSidebarOpen(false);
  };

  // Chaque entreprise possède son propre état de navigation et de vérification.
  // Un changement d'entreprise ne doit jamais conserver Telegram, Discord ou un QR/code de l'entreprise précédente.
  React.useEffect(() => {
    setActiveTab("accueil");
    setCompanyTab("accueil");
    setTelegramFlowStep("channels_list");
    setDiscordFlowStep("channels_list");
    setCheckoutModalOffer(null);
    setSelectedProductDetailOffer(null);
    setPreviewMode("admin");
    setIsPreviewMenuOpen(false);
    setIsMobileCompanyNavOpen(false);
    setIsPostComposerOpen(false);
    setSelectedMemberProductId(subscription.productId || null);
  }, [companyId, subscription.productId]);

  // Identifiants réels des offres débloquées par ce membre
  const memberUnlockedOfferIds = React.useMemo(() => {
    return normalizeUnlockedOfferIds(currentSub);
  }, [currentSub]);

  const scopedMemberUnlockedOfferIds = React.useMemo(() => {
    if (!selectedMemberProductId) return memberUnlockedOfferIds;
    return memberUnlockedOfferIds.filter(
      (offerId) => offerId.toLowerCase() === selectedMemberProductId.toLowerCase(),
    );
  }, [memberUnlockedOfferIds, selectedMemberProductId]);

  const purchasedProductIds = React.useMemo(
    () =>
      Array.from(
        new Set(
          memberUnlockedOfferIds.filter(
            (offerId) => offerId.trim() && !isGenericFreeMembershipProductId(offerId, companyId),
          ),
        ),
      ),
    [companyId, memberUnlockedOfferIds],
  );
  const [memberPurchasedOffers, setMemberPurchasedOffers] = React.useState<CreatorPlatformOffer[]>(
    [],
  );
  const [memberPurchasedOffersLoading, setMemberPurchasedOffersLoading] = React.useState(
    purchasedProductIds.length > 0,
  );

  React.useEffect(() => {
    let cancelled = false;
    setMemberPurchasedOffers([]);

    if (!user?.uid || purchasedProductIds.length === 0) {
      setMemberPurchasedOffersLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setMemberPurchasedOffersLoading(true);
    getMemberProductsByIds(purchasedProductIds)
      .then((products) => {
        if (cancelled) return;
        const requestedIds = new Set(purchasedProductIds);
        const offers = products
          .filter((product) => product.companyId === companyId && requestedIds.has(product.id))
          .map((product) =>
            convertProjectToPlatformOffer(product, companyId, currentSub.companyName),
          );
        setMemberPurchasedOffers(offers);
      })
      .catch((error) => {
        console.warn("Could not load purchased offer content from Firestore:", error);
        if (!cancelled) setMemberPurchasedOffers([]);
      })
      .finally(() => {
        if (!cancelled) setMemberPurchasedOffersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, currentSub.companyName, purchasedProductIds, user?.uid]);

  // Ressources strictement autorisées pour ce membre et cette entreprise
  const authorizedTelegramChannels = React.useMemo(() => {
    return getMemberAuthorizedTelegramChannels(
      companyId,
      scopedMemberUnlockedOfferIds,
      memberPurchasedOffers,
    );
  }, [companyId, scopedMemberUnlockedOfferIds, memberPurchasedOffers]);

  const authorizedDiscordChannels = React.useMemo(() => {
    return getMemberAuthorizedDiscordChannels(
      companyId,
      scopedMemberUnlockedOfferIds,
      memberPurchasedOffers,
    );
  }, [companyId, scopedMemberUnlockedOfferIds, memberPurchasedOffers]);

  const authorizedEbooks = React.useMemo(() => {
    return getMemberAuthorizedEbooks(
      companyId,
      scopedMemberUnlockedOfferIds,
      memberPurchasedOffers,
    );
  }, [companyId, scopedMemberUnlockedOfferIds, memberPurchasedOffers]);

  const authorizedCourses = React.useMemo(() => {
    return getMemberAuthorizedCourses(
      companyId,
      scopedMemberUnlockedOfferIds,
      memberPurchasedOffers,
    );
  }, [companyId, scopedMemberUnlockedOfferIds, memberPurchasedOffers]);

  // Vérification d'accès stricte : débloqué uniquement si l'offre achetée accorde la ressource précise
  const hasTelegramAccess = authorizedTelegramChannels.length > 0;
  const hasDiscordAccess = authorizedDiscordChannels.length > 0;
  const isTelegramUnlocked = authorizedTelegramChannels.length > 0;
  const isDiscordUnlocked = authorizedDiscordChannels.length > 0;
  const isEbookUnlocked = authorizedEbooks.length > 0;
  const isCourseUnlocked = authorizedCourses.length > 0;

  // Company internal tabs: "Accueil" (default & active with blue underline indicator), "Produits", "Avis"
  const [companyTab, setCompanyTab] = useState<"accueil" | "produits" | "avis">("accueil");

  // Security Check: ONLY the true creator owner of this company can modify its branding, post news, and manage apps
  const isCompanyOwner = React.useMemo(() => {
    // 1. Direct owner check if ownerId or creatorEmail is attached to subscription
    const subOwnerId = (currentSub as any).ownerId;
    const subCreatorEmail = (currentSub as any).creatorEmail;
    if (user) {
      if (subOwnerId && (subOwnerId === (user as any).uid || subOwnerId === user.email)) {
        return true;
      }
      if (subCreatorEmail && subCreatorEmail === user.email) {
        return true;
      }
    }
    // 2. Check if current companyId exists in the user's creator companies list
    if (creatorCompanies && creatorCompanies.length > 0) {
      return creatorCompanies.some(
        (c: any) =>
          c &&
          (c.id === currentSub.companyId ||
            c.id === currentSub.id ||
            (c.name &&
              currentSub.companyName &&
              c.name.trim().toLowerCase() === currentSub.companyName.trim().toLowerCase())),
      );
    }
    return false;
  }, [
    creatorCompanies,
    currentSub.companyId,
    currentSub.id,
    currentSub.companyName,
    (currentSub as any).ownerId,
    (currentSub as any).creatorEmail,
    user,
  ]);

  // Publications / Actualités propres à cette entreprise (isolées strictement par entreprise)
  const [postsRefreshTrigger, setPostsRefreshTrigger] = useState(0);
  const companyPosts = React.useMemo<CompanyPost[]>(() => {
    const compId = currentSub.companyId || currentSub.id;
    return getPostsForCompany(compId, currentSub.companyName);
  }, [currentSub.companyId, currentSub.id, currentSub.companyName, postsRefreshTrigger]);

  React.useEffect(() => {
    const handlePostsUpdated = () => {
      setPostsRefreshTrigger((prev) => prev + 1);
    };
    window.addEventListener("mansa_company_posts_updated", handlePostsUpdated);
    window.addEventListener("storage", handlePostsUpdated);
    return () => {
      window.removeEventListener("mansa_company_posts_updated", handlePostsUpdated);
      window.removeEventListener("storage", handlePostsUpdated);
    };
  }, []);

  // Formulaire d'annonce pour le créateur
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostPinned, setNewPostPinned] = useState(false);

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    const compId = currentSub.companyId || currentSub.id;
    createCompanyPost(compId, currentSub.companyName, {
      title: newPostTitle.trim(),
      content: newPostContent.trim(),
      authorName: currentSub.companyName,
      pinned: newPostPinned,
      category: "Actualité",
    });
    setNewPostTitle("");
    setNewPostContent("");
    setNewPostPinned(false);
    setIsPostComposerOpen(false);
  };

  const handlePublishPost = (draft: CompanyPostDraft) => {
    const compId = currentSub.companyId || currentSub.id;
    createCompanyPost(compId, currentSub.companyName, {
      title: "Actualité officielle",
      content: draft.content,
      authorName: currentSub.companyName,
      pinned: false,
      category: "Actualité",
      media: draft.media,
      poll: draft.poll,
    });
  };

  const handleDeletePost = (postId: string) => {
    const compId = currentSub.companyId || currentSub.id;
    deleteCompanyPost(postId, compId);
  };

  // Likes des posts par utilisateur
  const [likedPostsMap, setLikedPostsMap] = useState<Record<string, boolean>>(() => {
    try {
      const userKey = user?.uid || user?.email || "default";
      const raw = localStorage.getItem(`mansa_liked_posts_${userKey}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const handleToggleLike = (post: CompanyPost) => {
    const userKey = user?.uid || user?.email || "default";
    const currentlyLiked = !likedPostsMap[post.id];
    const nextMap = { ...likedPostsMap, [post.id]: currentlyLiked };
    setLikedPostsMap(nextMap);
    try {
      localStorage.setItem(`mansa_liked_posts_${userKey}`, JSON.stringify(nextMap));
    } catch {}

    const all = getAllStoredPosts();
    const target = all.find((p) => p.id === post.id);
    if (target) {
      target.likesCount = Math.max(0, (target.likesCount || 0) + (currentlyLiked ? 1 : -1));
      saveAllPosts(all);
    }
  };

  const [votedPollsMap, setVotedPollsMap] = useState<Record<string, number>>(() => {
    try {
      const userKey = user?.uid || user?.email || "default";
      const raw = localStorage.getItem(`mansa_company_poll_votes_${userKey}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const handleVoteOnPoll = (post: CompanyPost, optionIndex: number) => {
    if (Object.prototype.hasOwnProperty.call(votedPollsMap, post.id)) return;
    const compId = currentSub.companyId || currentSub.id;
    if (!recordCompanyPollVote(post.id, compId, optionIndex)) return;
    const userKey = user?.uid || user?.email || "default";
    const nextVotes = { ...votedPollsMap, [post.id]: optionIndex };
    setVotedPollsMap(nextVotes);
    try {
      localStorage.setItem(`mansa_company_poll_votes_${userKey}`, JSON.stringify(nextVotes));
    } catch {
      // The vote is still recorded for this session if local persistence is unavailable.
    }
  };

  // Commentaires des posts par utilisateur
  const [expandedCommentsMap, setExpandedCommentsMap] = useState<Record<string, boolean>>({});
  const [commentInputMap, setCommentInputMap] = useState<Record<string, string>>({});
  const [postCommentsMap, setPostCommentsMap] = useState<
    Record<string, Array<{ author: string; text: string; time: string }>>
  >(() => {
    try {
      const raw = localStorage.getItem("mansa_post_comments_storage");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const handleAddComment = (postId: string) => {
    const text = (commentInputMap[postId] || "").trim();
    if (!text) return;
    const authorName = user?.name || "Membre";
    const newComment = { author: authorName, text, time: "À l'instant" };
    const currentList = postCommentsMap[postId] || [];
    const nextList = [...currentList, newComment];
    const nextMap = { ...postCommentsMap, [postId]: nextList };
    setPostCommentsMap(nextMap);
    setCommentInputMap((prev) => ({ ...prev, [postId]: "" }));
    try {
      localStorage.setItem("mansa_post_comments_storage", JSON.stringify(nextMap));
    } catch {}

    const all = getAllStoredPosts();
    const target = all.find((p) => p.id === postId);
    if (target) {
      target.commentsCount = (target.commentsCount || 0) + 1;
      saveAllPosts(all);
    }
  };

  // Listen to external branding updates
  React.useEffect(() => {
    const handleBrandingChange = (e: any) => {
      const detail = e.detail;
      const branding = detail?.branding || detail;
      const companyId = detail?.companyId || detail?.id || branding?.companyId;
      if (branding && (companyId === currentSub.companyId || companyId === currentSub.id)) {
        setCurrentSub((prev) => ({
          ...prev,
          companyName: branding.companyName ?? branding.name ?? prev.companyName,
          companyBanner: branding.companyBanner ?? prev.companyBanner,
          companyLogo: branding.companyLogo ?? prev.companyLogo,
          socialLinks: branding.socialLinks ?? prev.socialLinks,
        }));
      }
    };
    window.addEventListener("mansa_subscription_updated", handleBrandingChange);
    window.addEventListener("mansa_company_branding_changed", handleBrandingChange);
    return () => {
      window.removeEventListener("mansa_subscription_updated", handleBrandingChange);
      window.removeEventListener("mansa_company_branding_changed", handleBrandingChange);
    };
  }, [currentSub.companyId]);

  // Synchronize creator live replies from AssistanceView to member chat
  React.useEffect(() => {
    const handleCreatorReply = (e: any) => {
      const detail = e.detail;
      if (
        detail &&
        (detail.companyId === currentSub.companyId || detail.companyId === currentSub.id) &&
        (detail.text || detail.message)
      ) {
        setSupportChatList((prev) => [
          ...prev,
          {
            id: `msg-creator-reply-${Date.now()}`,
            sender: "creator",
            text: detail.text || detail.message,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    };
    window.addEventListener("mansa_creator_assistance_replied", handleCreatorReply);
    return () => {
      window.removeEventListener("mansa_creator_assistance_replied", handleCreatorReply);
    };
  }, [currentSub.companyId, currentSub.id]);

  const handleSaveBranding = async (branding: {
    name: string;
    description: string;
    companyBanner: string;
    companyLogo: string;
    socialLinks: Record<string, string>;
  }) => {
    // Strict ownership verification: block non-creators
    if (!isCompanyOwner) {
      console.warn(
        "Opération interdite : Seul le créateur propriétaire peut modifier son entreprise.",
      );
      return;
    }

    const userKey = user?.uid || user?.email || "default";
    const result = updateCompanyBranding(userKey, currentSub.companyId, {
      name: branding.name,
      description: branding.description,
      companyBanner: branding.companyBanner,
      companyLogo: branding.companyLogo,
      socialLinks: branding.socialLinks,
    });
    if (!result.updatedCompany) {
      throw new Error(
        "Entreprise introuvable dans votre espace. Rechargez la page puis réessayez.",
      );
    }
    await result.persisted;
    updateSubscriptionBranding(userKey, currentSub.companyId, {
      companyName: branding.name,
      companyBanner: branding.companyBanner,
      companyLogo: branding.companyLogo,
      socialLinks: branding.socialLinks,
    });
    setCurrentSub((prev) => ({
      ...prev,
      companyName: branding.name,
      companyBanner: branding.companyBanner,
      companyLogo: branding.companyLogo,
      socialLinks: branding.socialLinks,
    }));
  };

  const [isBookmarked, setIsBookmarked] = useState(false);

  // Post likes and interaction states for newsfeed
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({
    "post-pinned": false,
    "post-2": false,
    "post-3": false,
  });
  const [likesCounts, setLikesCounts] = useState<Record<string, number>>({
    "post-pinned": 64,
    "post-2": 42,
    "post-3": 38,
  });
  const [copiedProfileShare, setCopiedProfileShare] = useState(false);
  const [isJoinedLocally, setIsJoinedLocally] = useState<boolean | null>(null);
  const [optionsDropdownOpen, setOptionsDropdownOpen] = useState(false);
  const [isManageMembershipModalOpen, setIsManageMembershipModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [copiedLinkToast, setCopiedLinkToast] = useState(false);
  const [expandedCommentPosts, setExpandedCommentPosts] = useState<Record<string, boolean>>({});
  const [isEbookModalOpen, setIsEbookModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseResourceItem | null>(null);
  const resourceReturnViewRef = React.useRef({
    activeTab,
    companyTab,
    isMobileSidebarOpen,
    isMobileCompanyNavOpen,
  });
  const openResourceModal = (resource: "files" | "courses") => {
    resourceReturnViewRef.current = {
      activeTab,
      companyTab,
      isMobileSidebarOpen,
      isMobileCompanyNavOpen,
    };
    if (resource === "courses") setIsCourseModalOpen(true);
    else setIsEbookModalOpen(true);
  };
  const handleResourceBack = () => {
    const previousView = resourceReturnViewRef.current;
    setIsEbookModalOpen(false);
    setIsCourseModalOpen(false);
    setSelectedCourse(null);
    setActiveTab(previousView.activeTab);
    setCompanyTab(previousView.companyTab);
    setIsMobileSidebarOpen(previousView.isMobileSidebarOpen);
    setIsMobileCompanyNavOpen(previousView.isMobileCompanyNavOpen);
  };
  const handleConnectedAppBack = () => {
    setActiveTab("accueil");
    setCompanyTab("accueil");
    setIsMobileCompanyNavOpen(true);
    setIsMobileSidebarOpen(false);
  };
  const optionsMenuRef = React.useRef<HTMLDivElement>(null);

  const commentReplies: Record<string, Array<{ author: string; text: string; time: string }>> = {
    "post-pinned": [
      {
        author: "Membre Premium",
        text: "Merci pour la mise à jour, c'est très clair.",
        time: "Il y a 20 min",
      },
      {
        author: currentSub.companyName,
        text: "Merci pour votre retour. Nous restons disponibles.",
        time: "Il y a 12 min",
      },
    ],
    "post-2": [
      {
        author: "Aïcha",
        text: "La synchronisation est-elle déjà active pour tous les membres ?",
        time: "Il y a 1 h",
      },
      {
        author: currentSub.companyName,
        text: "Oui, le déploiement est terminé.",
        time: "Il y a 45 min",
      },
    ],
    "post-3": [
      {
        author: "Membre Premium",
        text: "Le fichier est bien téléchargé, merci.",
        time: "Il y a 2 h",
      },
      { author: currentSub.companyName, text: "Parfait, bonne lecture !", time: "Il y a 1 h" },
    ],
  };

  const renderCommentReplies = (postId: string) => {
    if (!expandedCommentPosts[postId]) return null;
    const hasOwnedProductOffer = memberUnlockedOfferIds.some(
      (offerId) => !isGenericFreeMembershipProductId(offerId, companyId),
    );
    if (!hasPaidOffer && !hasOwnedProductOffer && !isCompanyOwner) {
      return (
        <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-300">
          Les réponses sont disponibles après l'achat d'un produit.
        </div>
      );
    }
    return (
      <div className="mt-2 space-y-2 rounded-xl border border-white/5 bg-black/10 p-3">
        {commentReplies[postId].map((reply, index) => (
          <div
            key={`${postId}-reply-${index}`}
            className="border-b border-white/5 pb-2 last:border-0 last:pb-0"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-white">{reply.author}</span>
              <span className="text-[10px] text-zinc-500">{reply.time}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-300">{reply.text}</p>
          </div>
        ))}
      </div>
    );
  };

  // Click outside listener for menu ⋮
  React.useEffect(() => {
    if (!optionsDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setOptionsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [optionsDropdownOpen]);

  // Handler: Cancel active subscription while remaining a member of the enterprise
  const handleCancelActiveSubscription = () => {
    const userKey = user?.email || "default";
    cancelActiveSubscription(userKey, currentSub.id);
    setHasPaidOffer(false);
    setCurrentIncludedApps(["dashboard", "support"]);
    setUnlockedProductIds([]);
    setCurrentSub((prev) => ({
      ...prev,
      hasPaidOffer: false,
      status: "canceled",
      productName: "Adhésion Simple (Gratuit)",
      priceDisplay: "0 FCFA",
      includedApps: ["dashboard", "support"],
      unlockedProductIds: [],
    }));
  };

  // L’adhésion est relue depuis Supabase : le cache local n’est pas une source d’autorité.
  React.useEffect(() => {
    let isActive = true;
    const memberId = user?.uid;
    const communityId = (currentSub.companyId || currentSub.id).replace(/^preview-/, "");

    if (!memberId || !communityId || currentSub.isCommunityPreview) {
      setIsJoinedLocally(false);
      return () => {
        isActive = false;
      };
    }

    setIsJoinedLocally(null);
    void fetchMemberCommunities(memberId)
      .then((communityIds) => {
        if (isActive) setIsJoinedLocally(communityIds.includes(communityId));
      })
      .catch((error) => {
        console.error("Impossible de vérifier l’adhésion à la communauté:", error);
        if (isActive) setIsJoinedLocally(false);
      });

    return () => {
      isActive = false;
    };
  }, [user?.uid, currentSub.companyId, currentSub.id, currentSub.isCommunityPreview]);

  // Check whether the user has joined this enterprise
  const isEnterpriseJoined = React.useMemo(() => {
    if (currentSub.isCommunityPreview) return false;
    return isJoinedLocally === true;
  }, [currentSub.isCommunityPreview, isJoinedLocally]);

  // Handler: Join enterprise
  const handleJoinEnterprise = async () => {
    const userKey = user?.uid || user?.email || "default";
    const compId = currentSub.companyId || currentSub.id;

    if (!user?.uid || !compId) return;

    try {
      await joinCommunityRpc(compId);
      const communityIds = await fetchMemberCommunities(user.uid);
      if (!communityIds.includes(compId)) {
        setIsJoinedLocally(false);
        return;
      }
    } catch (error) {
      console.error("Impossible de rejoindre la communauté:", error);
      setIsJoinedLocally(false);
      return;
    }

    try {
      const leftKey = `mansa_left_enterprises_${userKey}`;
      const leftList: string[] = JSON.parse(localStorage.getItem(leftKey) || "[]");
      const filtered = leftList.filter((id) => id !== currentSub.id && id !== compId);
      localStorage.setItem(leftKey, JSON.stringify(filtered));
    } catch {}

    const joinedSub: EnterpriseSubscription = {
      ...currentSub,
      id: currentSub.id.replace(/^preview-/, ""),
      companyId: compId,
      hasJoined: true,
      isCommunityPreview: false,
      status: "active",
      subscribedAt: "Aujourd'hui",
    };

    saveSubscription(userKey, joinedSub);
    saveSubscription("default", joinedSub);

    setIsJoinedLocally(true);
    setCurrentSub(joinedSub);

    window.dispatchEvent(
      new CustomEvent("mansa_community_joined", {
        detail: { subId: joinedSub.id, companyId: compId },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("mansa_subscription_updated", {
        detail: joinedSub,
      }),
    );
  };

  // Handler: Leave the enterprise completely
  const handleLeaveEnterprise = () => {
    const userKey = user?.uid || user?.email || "default";
    const compId = currentSub.companyId || currentSub.id;

    removeSubscription(userKey, currentSub.id);
    if (currentSub.companyId) {
      removeSubscription(userKey, currentSub.companyId);
    }
    removeSubscription("default", currentSub.id);
    if (currentSub.companyId) {
      removeSubscription("default", currentSub.companyId);
    }

    setIsJoinedLocally(null);
    if (user?.uid) {
      void fetchMemberCommunities(user.uid)
        .then((communityIds) => setIsJoinedLocally(communityIds.includes(compId)))
        .catch((error) => {
          console.error("Impossible de vérifier l’adhésion après le retrait:", error);
          setIsJoinedLocally(false);
        });
    }
    setCurrentSub((prev) => ({ ...prev, hasJoined: false }));

    window.dispatchEvent(
      new CustomEvent("mansa_community_left", {
        detail: { subId: currentSub.id, companyId: compId },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("mansa_subscription_updated", {
        detail: { removedId: currentSub.id, companyId: compId },
      }),
    );

    if (onBackToPersonal) {
      onBackToPersonal();
    }
  };

  // Firestore is the source of truth for the offers shown to company members.
  const companyOffersId = currentSub.companyId || currentSub.id;
  const [enterpriseOffers, setEnterpriseOffers] = React.useState<CreatorPlatformOffer[]>([]);
  const [enterpriseOffersLoading, setEnterpriseOffersLoading] = React.useState(true);

  React.useEffect(() => {
    setEnterpriseOffers([]);
    setEnterpriseOffersLoading(true);

    if (!companyOffersId) {
      setEnterpriseOffersLoading(false);
      return;
    }

    return subscribeToCompanyOffers(companyOffersId, (offers) => {
      setEnterpriseOffers(offers);
      setEnterpriseOffersLoading(false);
    });
  }, [companyOffersId]);

  // Ne montrer au membre que les applications des offres qu'il possède réellement.
  // Le mode d'accès temporairement gratuit ne doit pas exposer les applications payantes.
  const purchasedAppOfferIds = React.useMemo(() => {
    const ids = [
      ...(Array.isArray(currentSub.unlockedProductIds) ? currentSub.unlockedProductIds : []),
      ...(Array.isArray(currentSub.purchasedOfferIds) ? currentSub.purchasedOfferIds : []),
      ...(typeof currentSub.productId === "string" ? [currentSub.productId] : []),
    ];
    return Array.from(
      new Set(
        ids.filter(
          (id) =>
            typeof id === "string" &&
            id.trim() &&
            !isGenericFreeMembershipProductId(id, currentSub.companyId),
        ),
      ),
    );
  }, [currentSub]);

  const memberOwnedOffers = React.useMemo(
    () =>
      getMemberAuthorizedOffers(currentSub.companyId || currentSub.id, purchasedAppOfferIds, [
        ...enterpriseOffers,
        ...memberPurchasedOffers,
      ]),
    [
      currentSub.companyId,
      currentSub.id,
      purchasedAppOfferIds,
      enterpriseOffers,
      memberPurchasedOffers,
    ],
  );

  const visibleIncludedAppNames = React.useMemo(() => {
    const storedSubscriptionApps = [...currentIncludedApps, ...(currentSub.includedApps || [])];
    return getVisibleIncludedAppNames({
      isCompanyOwner,
      subscriptionIncludedApps: storedSubscriptionApps,
      companyOffers: enterpriseOffers,
      memberOwnedOffers,
    });
  }, [
    currentIncludedApps,
    currentSub.includedApps,
    enterpriseOffers,
    isCompanyOwner,
    memberOwnedOffers,
  ]);

  const hasTelegramApp = React.useMemo(
    () => visibleIncludedAppNames.some((app) => app.includes("telegram")),
    [visibleIncludedAppNames],
  );

  const hasDiscordApp = React.useMemo(
    () => visibleIncludedAppNames.some((app) => app.includes("discord")),
    [visibleIncludedAppNames],
  );

  const configuredCompanyApps = React.useMemo(() => {
    const appNames = visibleIncludedAppNames;
    const hasAny = (keywords: string[]) =>
      appNames.some((value) => keywords.some((keyword) => value.includes(keyword)));
    const apps: Array<"telegram" | "discord" | "files" | "courses" | "chat" | "content"> = [];
    if (hasAny(["telegram"])) apps.push("telegram");
    if (hasAny(["discord"])) apps.push("discord");
    if (hasAny(["fichier", "file", "ebook", "template"])) apps.push("files");
    if (hasAny(["cours", "course", "formation", "masterclass"])) apps.push("courses");
    if (hasAny(["chat", "messagerie", "message"])) apps.push("chat");
    if (hasAny(["content", "contenu"])) apps.push("content");
    return apps;
  }, [visibleIncludedAppNames]);

  const openMobileConfiguredApp = (
    app: "telegram" | "discord" | "files" | "courses" | "chat" | "content",
  ) => {
    setIsMobileCompanyNavOpen(false);
    if (app === "telegram") {
      setActiveTab("telegram");
      setTelegramFlowStep("channels_list");
      return;
    }
    if (app === "discord") {
      setActiveTab("discord");
      setDiscordFlowStep("channels_list");
      return;
    }
    if (app === "chat") {
      setActiveTab("support");
      return;
    }
    if (app === "content") {
      setActiveTab("accueil");
      setCompanyTab("accueil");
      return;
    }
    if ((app === "courses" || app === "files") && canManageCompany && onOpenCreatorAppWorkspace) {
      const productIds = getCreatorAppProductIds(app, enterpriseOffers, selectedPreviewOfferId);
      onOpenCreatorAppWorkspace(app, productIds);
      return;
    }
    const keywords =
      app === "courses"
        ? ["cours", "course", "formation", "masterclass"]
        : ["fichier", "file", "ebook", "template"];
    const offer =
      enterpriseOffers.find(
        (candidate) =>
          candidate.includedApps?.some((includedApp) =>
            keywords.some((keyword) => includedApp.toLowerCase().includes(keyword)),
          ) || keywords.some((keyword) => candidate.title.toLowerCase().includes(keyword)),
      ) || enterpriseOffers[0];
    if (!offer) return;
    openResourceModal(app === "courses" ? "courses" : "files");
  };

  // Redirection automatique si onglet non autorisé
  React.useEffect(() => {
    if (activeTab === "telegram" && !hasTelegramApp) {
      setActiveTab("accueil");
    }
    if (activeTab === "discord" && !hasDiscordApp) {
      setActiveTab("accueil");
    }
    if (activeTab === "applications" && !isCompanyOwner) {
      setActiveTab("accueil");
    }
  }, [activeTab, hasTelegramApp, hasDiscordApp, isCompanyOwner]);

  type PreviewMode = "admin" | "public" | "hidden" | `product:${string}`;
  const [previewMode, setPreviewMode] = useState<PreviewMode>("admin");
  const [isPreviewMenuOpen, setIsPreviewMenuOpen] = useState(false);
  const isPublicClientPreview = isCompanyOwner && previewMode !== "admin";
  const canManageCompany = isCompanyOwner && !isPublicClientPreview;
  React.useEffect(() => {
    if (!canManageCompany && activeTab === "applications") {
      setActiveTab("accueil");
    }
  }, [canManageCompany, activeTab]);
  const selectedPreviewOfferId = previewMode.startsWith("product:")
    ? previewMode.slice("product:".length)
    : null;
  const selectedPreviewOffer = selectedPreviewOfferId
    ? enterpriseOffers.find((offer) => offer.id === selectedPreviewOfferId)
    : undefined;

  type CreatorAppId = "telegram" | "discord" | "courses" | "files";
  const [creatorAppStep, setCreatorAppStep] = useState<"closed" | "choose" | "link" | "content">(
    "closed",
  );
  const [selectedCreatorApp, setSelectedCreatorApp] = useState<CreatorAppId | null>(null);
  const [linkedCreatorProductIds, setLinkedCreatorProductIds] = useState<string[]>([]);
  const [creatorWorkflowNotice, setCreatorWorkflowNotice] = useState<string | null>(null);
  const [creatorCourseName, setCreatorCourseName] = useState("");
  const [creatorCourseDescription, setCreatorCourseDescription] = useState("");
  const [creatorCourseCoverFileName, setCreatorCourseCoverFileName] = useState("");
  const [creatorYoutubeUrl, setCreatorYoutubeUrl] = useState("");
  const [creatorVideoFileName, setCreatorVideoFileName] = useState("");
  const [creatorAttachmentFileName, setCreatorAttachmentFileName] = useState("");
  const [creatorVideoFile, setCreatorVideoFile] = useState<File | null>(null);
  const [creatorAttachmentFile, setCreatorAttachmentFile] = useState<File | null>(null);
  const [creatorVideoStorageKey, setCreatorVideoStorageKey] = useState("");
  const [creatorAttachmentStorageKey, setCreatorAttachmentStorageKey] = useState("");
  const [creatorChapterNames, setCreatorChapterNames] = useState<string[]>(["Introduction"]);
  const [creatorChapterContents, setCreatorChapterContents] = useState<string[]>([""]);
  const [creatorNewChapterName, setCreatorNewChapterName] = useState("");
  const [creatorFileName, setCreatorFileName] = useState("");
  type CreatorFilesScreen = "library" | "add";
  const [creatorFilesScreen, setCreatorFilesScreen] = useState<CreatorFilesScreen>("library");
  const [creatorFiles, setCreatorFiles] = useState<
    Array<{
      id: string;
      name: string;
      size: string;
      type: string;
      productIds: string[];
      storageKey?: string;
      updatedAt: string;
    }>
  >([]);
  const [creatorSelectedFile, setCreatorSelectedFile] = useState<File | null>(null);
  const [creatorSaveError, setCreatorSaveError] = useState<string | null>(null);
  const [isSavingCreatorContent, setIsSavingCreatorContent] = useState(false);
  const [creatorCourses, setCreatorCourses] = useState<
    Array<{
      id: string;
      productIds: string[];
      title: string;
      description: string;
      coverFileName?: string;
      youtubeUrl?: string;
      videoFileName?: string;
      videoStorageKey?: string;
      attachmentFileName?: string;
      attachmentStorageKey?: string;
      courseModules?: any[];
      chapters: string[];
      chapterContents?: string[];
      supabaseCourseIds?: Record<string, string>;
      updatedAt: string;
    }>
  >([]);
  const [editingCreatorCourseId, setEditingCreatorCourseId] = useState<string | null>(null);
  const [courseCreationStep, setCourseCreationStep] = useState<"library" | "details" | "content">(
    "library",
  );

  const creatorAppMeta: Record<CreatorAppId, { title: string; description: string; icon: string }> =
    {
      telegram: {
        title: "Telegram",
        description: "Canal ou groupe Telegram lié à un ou plusieurs produits.",
        icon: "✈️",
      },
      discord: {
        title: "Discord",
        description: "Serveur Discord et accès membres par produit.",
        icon: "🎮",
      },
      courses: {
        title: "Cours & vidéos",
        description: "Cours, coaching et formations avec chapitres.",
        icon: "🎓",
      },
      files: {
        title: "Fichier",
        description: "Fichiers, téléchargements instantanés et e-books.",
        icon: "📁",
      },
    };

  const openCreatorAppWorkflow = () => {
    setSelectedCreatorApp(null);
    setLinkedCreatorProductIds(selectedPreviewOfferId ? [selectedPreviewOfferId] : []);
    setCreatorAppStep("choose");
  };

  const chooseCreatorApp = (appId: CreatorAppId) => {
    setSelectedCreatorApp(appId);
    setCreatorAppStep("link");
  };

  const continueCreatorAppContent = () => {
    if (!selectedCreatorApp || linkedCreatorProductIds.length === 0) return;
    if (selectedCreatorApp === "telegram" || selectedCreatorApp === "discord") {
      const linksKey = `mansa_creator_app_links_${companyId}`;
      const savedLinks = JSON.parse(localStorage.getItem(linksKey) || "[]");
      const nextLink = {
        appId: selectedCreatorApp,
        productIds: linkedCreatorProductIds,
        updatedAt: new Date().toISOString(),
      };
      const withoutCurrent = Array.isArray(savedLinks)
        ? savedLinks.filter((item: { appId?: string }) => item.appId !== selectedCreatorApp)
        : [];
      localStorage.setItem(linksKey, JSON.stringify([...withoutCurrent, nextLink]));
      setCreatorAppStep("closed");
      if (selectedCreatorApp === "telegram") {
        setActiveTab("telegram");
        setTelegramFlowStep("channels_list");
      } else {
        setActiveTab("discord");
        setDiscordFlowStep("channels_list");
      }
      return;
    }
    if (selectedCreatorApp === "courses") {
      const saved = JSON.parse(localStorage.getItem(`mansa_creator_courses_${companyId}`) || "[]");
      setCreatorCourses(Array.isArray(saved) ? saved : []);
      setEditingCreatorCourseId(null);
      setCourseCreationStep("library");
    }
    if (selectedCreatorApp === "files") {
      const linkedFiles = enterpriseOffers
        .filter((offer) => linkedCreatorProductIds.includes(offer.id))
        .flatMap((offer) =>
          ((offer as any).digitalFiles || []).map((file: any) => ({
            id: file.id,
            name: file.name || file.title || "Fichier sans nom",
            size: file.size || "Taille inconnue",
            type: file.type || "application/octet-stream",
            productIds: linkedCreatorProductIds,
            storageKey: file.storageKey,
            updatedAt: file.updatedAt || new Date().toISOString(),
          })),
        );
      setCreatorFiles(linkedFiles);
      setCreatorFilesScreen("library");
      setCreatorSelectedFile(null);
    }
    setCreatorAppStep("content");
  };

  const startNewCreatorCourse = () => {
    setEditingCreatorCourseId("new");
    setCourseCreationStep("details");
    setCreatorCourseName("");
    setCreatorCourseDescription("");
    setCreatorCourseCoverFileName("");
    setCreatorYoutubeUrl("");
    setCreatorVideoFileName("");
    setCreatorAttachmentFileName("");
    setCreatorVideoFile(null);
    setCreatorAttachmentFile(null);
    setCreatorVideoStorageKey("");
    setCreatorAttachmentStorageKey("");
    setCreatorChapterNames(["Introduction"]);
    setCreatorChapterContents([""]);
    setCreatorNewChapterName("");
  };

  const editCreatorCourse = (course: (typeof creatorCourses)[number]) => {
    setEditingCreatorCourseId(course.id);
    setLinkedCreatorProductIds(course.productIds);
    setCreatorCourseName(course.title);
    setCreatorCourseDescription(course.description);
    setCreatorCourseCoverFileName(course.coverFileName || "");
    setCreatorYoutubeUrl(course.youtubeUrl || "");
    setCreatorVideoFileName(course.videoFileName || "");
    setCreatorAttachmentFileName(course.attachmentFileName || "");
    setCreatorVideoFile(null);
    setCreatorAttachmentFile(null);
    setCreatorVideoStorageKey(course.videoStorageKey || "");
    setCreatorAttachmentStorageKey(course.attachmentStorageKey || "");
    setCreatorChapterNames(course.chapters.length > 0 ? course.chapters : ["Introduction"]);
    setCreatorChapterContents(
      course.chapterContents?.length === course.chapters.length
        ? course.chapterContents
        : course.chapters.map(() => ""),
    );
    setCourseCreationStep("details");
  };

  const continueCourseDetails = () => {
    if (!creatorCourseName.trim() || !creatorCourseDescription.trim()) {
      setCreatorSaveError("Renseignez le titre et la description du cours avant de continuer.");
      return;
    }
    setCreatorSaveError(null);
    setCourseCreationStep("content");
  };

  const finishCreatorAppWorkflow = async () => {
    if (!selectedCreatorApp || isSavingCreatorContent) return;
    setCreatorSaveError(null);
    if (
      (selectedCreatorApp === "courses" || selectedCreatorApp === "files") &&
      linkedCreatorProductIds.length === 0
    ) {
      setCreatorSaveError("Associez ce contenu à au moins une offre avant de l’enregistrer.");
      return;
    }
    if (
      selectedCreatorApp === "courses" &&
      (!creatorCourseName.trim() || !creatorCourseDescription.trim())
    ) {
      setCreatorSaveError("Renseignez le titre et la description du cours avant de l’enregistrer.");
      return;
    }
    setIsSavingCreatorContent(true);
    try {
      if (selectedCreatorApp === "courses") {
        const courseId =
          editingCreatorCourseId && editingCreatorCourseId !== "new"
            ? editingCreatorCourseId
            : `course-${Date.now()}`;
        let videoStorageKey = creatorVideoStorageKey;
        let attachmentStorageKey = creatorAttachmentStorageKey;
        if (creatorVideoFile) {
          videoStorageKey = (
            await saveDigitalAsset(companyId, `${courseId}-video`, creatorVideoFile)
          ).storageKey;
        }
        if (creatorAttachmentFile) {
          attachmentStorageKey = (
            await saveDigitalAsset(companyId, `${courseId}-attachment`, creatorAttachmentFile)
          ).storageKey;
        }
        const previousCourse = creatorCourses.find((item) => item.id === courseId);
        const course = {
          id: courseId,
          productIds: linkedCreatorProductIds,
          title: creatorCourseName.trim(),
          description: creatorCourseDescription.trim(),
          coverFileName: creatorCourseCoverFileName,
          youtubeUrl: creatorYoutubeUrl.trim(),
          videoFileName: creatorVideoFile?.name || creatorVideoFileName,
          videoStorageKey,
          videoType: creatorVideoFile?.type || "video/mp4",
          attachmentFileName: creatorAttachmentFile?.name || creatorAttachmentFileName,
          attachmentStorageKey,
          chapters: creatorChapterNames.filter(Boolean),
          chapterContents: creatorChapterNames.map(
            (_, index) => creatorChapterContents[index] || "",
          ),
          courseModules: creatorChapterNames.filter(Boolean).map((title, index) => ({
            id: `${courseId}-chapter-${index + 1}`,
            title,
            duration: "",
            content: creatorChapterContents[index] || "",
          })),
          updatedAt: new Date().toISOString(),
        };
        const supabaseCourseIds = { ...(previousCourse?.supabaseCourseIds || {}) };
        for (const [offerId, remoteCourseId] of Object.entries(supabaseCourseIds)) {
          if (!linkedCreatorProductIds.includes(offerId)) {
            await deleteCreatorCourseFromOffer({ offerId, courseRowId: remoteCourseId });
            delete supabaseCourseIds[offerId];
          }
        }
        for (const offerId of linkedCreatorProductIds) {
          const existingRemoteCourse = enterpriseOffers
            .find((offer) => offer.id === offerId)
            ?.courses?.find((item: any) => item.title === previousCourse?.title);
          supabaseCourseIds[offerId] = await saveCreatorCourseToOffer({
            offerId,
            title: course.title,
            description: course.description,
            courseRowId: supabaseCourseIds[offerId] || existingRemoteCourse?.id,
            modules: course.courseModules.map((module: any, index: number) => ({
              title: module.title,
              content: module.content,
              videoUrl: index === 0 ? course.youtubeUrl : "",
            })),
          });
        }
        const savedCourse = { ...course, supabaseCourseIds };
        const nextCourses = [
          ...creatorCourses.filter((item) => item.id !== course.id),
          savedCourse,
        ];
        localStorage.setItem(`mansa_creator_courses_${companyId}`, JSON.stringify(nextCourses));
        setCreatorCourses(nextCourses);
        const refreshedOffers = await fetchCompanyOffersFromSupabase(companyOffersId, true);
        setEnterpriseOffers(refreshedOffers);
        dispatchProductUpdates();
        setEditingCreatorCourseId(null);
        setCourseCreationStep("library");
        setCreatorAppStep("closed");
        setSelectedCreatorApp(null);
        return;
      }

      if (selectedCreatorApp === "files") {
        if (!creatorSelectedFile) {
          setCreatorSaveError(
            "Sélectionnez un fichier avant de l’ajouter : aucun fichier vide ne sera publié.",
          );
          return;
        }
        const id = `file-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
        const stored = await saveDigitalAsset(companyId, id, creatorSelectedFile);
        const newFile = {
          id,
          name: creatorFileName.trim() || creatorSelectedFile.name,
          size: `${(creatorSelectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
          type: creatorSelectedFile.type || "application/octet-stream",
          storageKey: stored.storageKey,
          isFreePreview: false,
          updatedAt: stored.updatedAt,
        };
        const updatedOffers = enterpriseOffers.map((off) => {
          if (!linkedCreatorProductIds.includes(off.id)) return off;
          const existingFiles = (off as any).digitalFiles || [];
          const existingEbooks = off.ebooks || [];
          return {
            ...off,
            digitalFiles: [...existingFiles.filter((file: any) => file.id !== id), newFile],
            ebooks: [
              ...existingEbooks.filter((ebook: any) => ebook.id !== id),
              {
                id,
                title: newFile.name,
                size: newFile.size,
                fileSize: newFile.size,
                storageKey: newFile.storageKey,
                fileId: id,
              },
            ],
            includedApps: Array.from(new Set([...(off.includedApps || []), "Fichiers"])),
          };
        });
        try {
          localStorage.removeItem(`mansa_creator_offers_${companyId}`);
        } catch {}
        const storageKey = `mansa_creator_apps_${companyId}`;
        const currentApps = JSON.parse(localStorage.getItem(storageKey) || "[]");
        const appEntries = Array.isArray(currentApps) ? currentApps : [];
        const existingFileApps = appEntries.filter(
          (app: { appId?: string }) => app.appId === "files",
        );
        const otherApps = appEntries.filter((app: { appId?: string }) => app.appId !== "files");
        const savedFiles = existingFileApps.flatMap((app: { files?: any[] }) => app.files || []);
        const mergedFiles = [...savedFiles, newFile].filter(
          (file, index, files) =>
            files.findIndex((candidate) => candidate.id === file.id) === index,
        );
        const mergedProductIds = Array.from(
          new Set([
            ...existingFileApps.flatMap((app: { productIds?: string[] }) => app.productIds || []),
            ...linkedCreatorProductIds,
          ]),
        );
        localStorage.setItem(
          storageKey,
          JSON.stringify([
            ...otherApps,
            {
              appId: "files",
              productIds: mergedProductIds,
              files: mergedFiles,
              updatedAt: new Date().toISOString(),
            },
          ]),
        );
        setCreatorFiles((files) => [...files, { ...newFile, productIds: linkedCreatorProductIds }]);
        setCreatorFilesScreen("library");
        setCreatorSelectedFile(null);
        setCreatorFileName("");
        return;
      }

      const storageKey = `mansa_creator_apps_${companyId}`;
      const currentApps = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const nextApp = {
        appId: selectedCreatorApp,
        productIds: linkedCreatorProductIds,
        title: creatorFileName,
        description: creatorCourseDescription,
        chapters: creatorChapterNames,
        updatedAt: new Date().toISOString(),
      };
      const withoutCurrent = Array.isArray(currentApps)
        ? currentApps.filter((app: { appId?: string }) => app.appId !== selectedCreatorApp)
        : [];
      localStorage.setItem(storageKey, JSON.stringify([...withoutCurrent, nextApp]));
      setCreatorAppStep("closed");
      setSelectedCreatorApp(null);
    } catch (error) {
      console.error("Creator content save failed:", error);
      setCreatorSaveError(
        getUserFacingErrorMessage(error, "Le contenu n’a pas pu être enregistré. Réessayez."),
      );
    } finally {
      setIsSavingCreatorContent(false);
    }
  };

  // Le mode compact est automatique sur les écrans étroits et complet sur desktop.
  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1023px)").matches : false,
  );

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const handleViewportChange = (event: MediaQueryListEvent) => setIsCompact(event.matches);

    setIsCompact(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleViewportChange);
    return () => mediaQuery.removeEventListener("change", handleViewportChange);
  }, []);

  // Helper pour récupérer l'offre réelle correspondante
  const getOfferForFeature = (featureKey: string): CreatorPlatformOffer => {
    const matched = enterpriseOffers.find(
      (o) =>
        o.includedApps?.some((a) => a.toLowerCase().includes(featureKey)) ||
        o.type === featureKey ||
        o.title.toLowerCase().includes(featureKey),
    );
    if (matched) return matched;
    return (
      enterpriseOffers[0] || {
        id: `offer-${featureKey}-${currentSub.companyId || currentSub.id}`,
        title: `Offre ${currentSub.companyName}`,
        companyId: currentSub.companyId || currentSub.id,
        companyName: currentSub.companyName,
        companyInitials: currentSub.companyInitials,
        category: "membership",
        type: "membership",
        priceDisplay: currentSub.priceDisplay || "19 000 FCFA / mois",
        priceAmount: 19000,
        currency: "XOF",
        pricingType: "paid",
        billingCycle: "monthly",
        description: `Accédez aux services officiels proposés par ${currentSub.companyName}.`,
        imageUrl:
          currentSub.companyBanner ||
          "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
        includedApps: ["dashboard", "support", featureKey],
      }
    );
  };

  // Telegram multi-step access architecture
  // Step 1: Channels list with Top Header & Central Content Card
  // Step 2: Claim access & QR Code
  // Step 3: Verified Gateway & Join channel
  const [telegramFlowStep, setTelegramFlowStep] = useState<
    "channels_list" | "claim_qr" | "telegram_gateway"
  >("channels_list");

  // Discord multi-step access architecture
  const [discordFlowStep, setDiscordFlowStep] = useState<
    "channels_list" | "claim_qr" | "discord_gateway"
  >("channels_list");

  // Canaux Telegram STRICTEMENT autorisés pour ce membre selon son offre achetée
  const channelsList: TelegramChannelItem[] = authorizedTelegramChannels;

  // Serveurs / Salons Discord STRICTEMENT autorisés pour ce membre selon son offre achetée
  const discordChannelsList: DiscordChannelItem[] = authorizedDiscordChannels;

  // Canaux Telegram d'autres offres de la même entreprise (non débloqués par ce membre)
  const otherCompanyTelegramChannels = React.useMemo(() => {
    const allChannels: Array<{
      channel: TelegramChannelItem;
      requiredOffer: CreatorPlatformOffer;
    }> = [];
    enterpriseOffers.forEach((offer) => {
      if (!memberUnlockedOfferIds.includes(offer.id)) {
        (offer.telegramChannels || []).forEach((ch) => {
          if (!channelsList.some((c) => c.id === ch.id)) {
            allChannels.push({ channel: ch, requiredOffer: offer });
          }
        });
      }
    });
    return allChannels;
  }, [enterpriseOffers, memberUnlockedOfferIds, channelsList]);

  // Serveurs / Salons Discord d'autres offres de la même entreprise (non débloqués par ce membre)
  const otherCompanyDiscordChannels = React.useMemo(() => {
    const allChannels: Array<{ channel: DiscordChannelItem; requiredOffer: CreatorPlatformOffer }> =
      [];
    enterpriseOffers.forEach((offer) => {
      if (!memberUnlockedOfferIds.includes(offer.id)) {
        (offer.discordChannels || []).forEach((ch) => {
          if (!discordChannelsList.some((c) => c.id === ch.id)) {
            allChannels.push({ channel: ch, requiredOffer: offer });
          }
        });
      }
    });
    return allChannels;
  }, [enterpriseOffers, memberUnlockedOfferIds, discordChannelsList]);

  // E-books d'autres offres de la même entreprise (non débloqués par ce membre)
  const otherCompanyEbooks = React.useMemo(() => {
    const list: Array<{ ebook: EbookResourceItem; requiredOffer: CreatorPlatformOffer }> = [];
    enterpriseOffers.forEach((offer) => {
      if (!memberUnlockedOfferIds.includes(offer.id)) {
        (offer.ebooks || []).forEach((eb) => {
          if (!authorizedEbooks.some((e) => e.id === eb.id)) {
            list.push({ ebook: eb, requiredOffer: offer });
          }
        });
      }
    });
    return list;
  }, [enterpriseOffers, memberUnlockedOfferIds, authorizedEbooks]);

  // Formations d'autres offres de la même entreprise (non débloquées par ce membre)
  const otherCompanyCourses = React.useMemo(() => {
    const list: Array<{ course: CourseResourceItem; requiredOffer: CreatorPlatformOffer }> = [];
    enterpriseOffers.forEach((offer) => {
      if (!memberUnlockedOfferIds.includes(offer.id)) {
        (offer.courses || []).forEach((co) => {
          if (!authorizedCourses.some((c) => c.id === co.id)) {
            list.push({ course: co, requiredOffer: offer });
          }
        });
      }
    });
    return list;
  }, [enterpriseOffers, memberUnlockedOfferIds, authorizedCourses]);

  const [ebookDownloadToast, setEbookDownloadToast] = useState<string | null>(null);

  const handleDownloadEbook = async (ebook: EbookResourceItem) => {
    try {
      const access = verifyMemberResourceAccess({
        companyId,
        unlockedOfferIds: scopedMemberUnlockedOfferIds,
        resourceType: "ebook",
        resourceId: ebook.id,
      });
      if (!access.isAuthorized) throw new Error(access.error || "Accès refusé à ce fichier.");
      const file = access.resource || ebook;
      if (file.storageKey) {
        await downloadDigitalAsset(file.storageKey, file.name || file.title || ebook.title);
      } else if (file.downloadUrl) {
        const anchor = document.createElement("a");
        anchor.href = file.downloadUrl;
        anchor.download = file.name || file.title || ebook.title;
        anchor.rel = "noopener noreferrer";
        if (/^https?:\/\//i.test(file.downloadUrl)) anchor.target = "_blank";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } else {
        throw new Error("Le créateur n’a pas téléversé le fichier associé à cette ressource.");
      }
      setEbookDownloadToast(`Téléchargement lancé : ${ebook.title}`);
      setTimeout(() => setEbookDownloadToast(null), 3500);
    } catch (error) {
      console.error("Member file download failed:", error);
      setAccessDeniedToast(
        getUserFacingErrorMessage(error, "Le téléchargement a échoué. Réessayez."),
      );
      setTimeout(() => setAccessDeniedToast(null), 4500);
    }
  };

  const handleAccessCourse = (course: CourseResourceItem) => {
    const access = verifyMemberResourceAccess({
      companyId,
      unlockedOfferIds: scopedMemberUnlockedOfferIds,
      resourceType: "course",
      resourceId: course.id,
    });
    if (!access.isAuthorized) {
      setAccessDeniedToast("Cette ressource n’est pas incluse dans votre offre.");
      setTimeout(() => setAccessDeniedToast(null), 4500);
      return;
    }
    setSelectedCourse(access.resource || course);
  };

  const handleDownloadCourseAttachment = async (course: CourseResourceItem) => {
    const access = verifyMemberResourceAccess({
      companyId,
      unlockedOfferIds: scopedMemberUnlockedOfferIds,
      resourceType: "course",
      resourceId: course.id,
    });
    if (!access.isAuthorized) {
      setAccessDeniedToast("Cette pièce jointe n’est pas incluse dans votre offre.");
      setTimeout(() => setAccessDeniedToast(null), 4500);
      return;
    }
    try {
      const authorizedCourse: any = access.resource || course;
      if (!authorizedCourse.attachmentStorageKey)
        throw new Error("La pièce jointe du cours n’est pas disponible.");
      await downloadDigitalAsset(
        authorizedCourse.attachmentStorageKey,
        authorizedCourse.attachmentFileName || `${authorizedCourse.title}.pdf`,
      );
    } catch (error) {
      console.error("Course attachment download failed:", error);
      setAccessDeniedToast(
        getUserFacingErrorMessage(
          error,
          "Le téléchargement de la pièce jointe a échoué. Réessayez.",
        ),
      );
      setTimeout(() => setAccessDeniedToast(null), 4500);
    }
  };

  const [selectedChannel, setSelectedChannel] = useState<TelegramChannelItem | null>(() => {
    return authorizedTelegramChannels[0] || null;
  });
  const [selectedDiscordChannel, setSelectedDiscordChannel] = useState<DiscordChannelItem | null>(
    () => {
      return authorizedDiscordChannels[0] || null;
    },
  );

  React.useEffect(() => {
    if (!selectedChannel && authorizedTelegramChannels.length > 0) {
      setSelectedChannel(authorizedTelegramChannels[0]);
    } else if (
      selectedChannel &&
      !authorizedTelegramChannels.some((c) => c.id === selectedChannel.id)
    ) {
      setSelectedChannel(authorizedTelegramChannels[0] || null);
    }
  }, [authorizedTelegramChannels]);

  React.useEffect(() => {
    if (!selectedDiscordChannel && authorizedDiscordChannels.length > 0) {
      setSelectedDiscordChannel(authorizedDiscordChannels[0]);
    } else if (
      selectedDiscordChannel &&
      !authorizedDiscordChannels.some((c) => c.id === selectedDiscordChannel.id)
    ) {
      setSelectedDiscordChannel(authorizedDiscordChannels[0] || null);
    }
  }, [authorizedDiscordChannels]);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedShareToast, setCopiedShareToast] = useState(false);
  const [activeMembersTooltip, setActiveMembersTooltip] = useState(false);
  const [activeNotifTooltip, setActiveNotifTooltip] = useState(false);

  const [copiedDiscordLink, setCopiedDiscordLink] = useState(false);
  const [copiedDiscordShareToast, setCopiedDiscordShareToast] = useState(false);
  const [activeDiscordMembersTooltip, setActiveDiscordMembersTooltip] = useState(false);
  const [activeDiscordNotifTooltip, setActiveDiscordNotifTooltip] = useState(false);

  const [claimToast, setClaimToast] = useState(false);
  const [discordClaimToast, setDiscordClaimToast] = useState(false);
  const [accessDeniedToast, setAccessDeniedToast] = useState<string | null>(null);

  const [isSupportConversationOpen, setIsSupportConversationOpen] = useState(false);
  const [supportChatList, setSupportChatList] = useState<
    Array<{
      id: string;
      sender: "user" | "creator";
      text: string;
      time: string;
    }>
  >([
    {
      id: "msg-1",
      sender: "creator",
      text: `Bienvenue dans l'espace membre officiel de ${subscription.companyName} ! Votre abonnement est actif. Si vous avez besoin d'aide pour vos accès Telegram, Discord ou vos services inclus, écrivez-nous ici.`,
      time: "10:15",
    },
  ]);

  React.useEffect(() => {
    const companyId = subscription.companyId || subscription.id;
    const memberEmail = user?.email || "membre@mansa.app";
    const welcomeMessage = {
      id: "msg-1",
      sender: "creator" as const,
      text: `Bienvenue dans l'espace membre officiel de ${subscription.companyName} ! Votre abonnement est actif. Si vous avez besoin d'aide pour vos accès Telegram, Discord ou vos services inclus, écrivez-nous ici.`,
      time: "10:15",
    };
    const refreshConversation = () => {
      const conversation = getLocalSupportConversation(companyId, memberEmail);
      setSupportChatList([
        welcomeMessage,
        ...(conversation?.messages.map((message) => ({
          ...message,
          sender: message.sender === "member" ? ("user" as const) : ("creator" as const),
        })) || []),
      ]);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === `${LOCAL_SUPPORT_CONVERSATIONS_PREFIX}${companyId}`) {
        refreshConversation();
      }
    };
    refreshConversation();
    window.addEventListener(LOCAL_SUPPORT_CONVERSATIONS_EVENT, refreshConversation);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(LOCAL_SUPPORT_CONVERSATIONS_EVENT, refreshConversation);
      window.removeEventListener("storage", handleStorage);
    };
  }, [subscription.companyId, subscription.id, subscription.companyName, user?.email]);

  const handleSelectChannelToClaim = (channel: TelegramChannelItem) => {
    setSelectedChannel(channel);
    setTelegramFlowStep("claim_qr");
  };

  const handleProceedToGateway = () => {
    setTelegramFlowStep("telegram_gateway");
  };

  const handleCopyLink = () => {
    if (selectedChannel?.inviteLink) {
      navigator.clipboard.writeText(selectedChannel.inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShareToast(true);
    setTimeout(() => setCopiedShareToast(false), 2500);
  };

  const handleOpenTelegram = async () => {
    if (selectedChannel) {
      await handleClaimTelegramInvite(selectedChannel);
    }
  };

  const handleClaimTelegramInvite = async (channel?: TelegramChannelItem) => {
    const target = channel || selectedChannel;
    if (!target) return;

    // Validation stricte côté serveur et locale
    try {
      const resp = await fetch("/api/telegram/request-channel-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          channelId: target.id,
          unlockedOfferIds: scopedMemberUnlockedOfferIds,
          userEmail: user?.email,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.authorized) {
        setAccessDeniedToast(
          data.error || "Accès non autorisé : ce canal Telegram requiert l'offre correspondante.",
        );
        setTimeout(() => setAccessDeniedToast(null), 5000);
        return;
      }
      const verifiedUrl = data.inviteLink || target.inviteLink;
      if (verifiedUrl) {
        window.open(verifiedUrl, "_blank", "noopener,noreferrer");
        setClaimToast(true);
        setTimeout(() => setClaimToast(false), 3500);
      }
    } catch {
      // Fallback local avec le moteur de droits d'accès
      const localCheck = verifyMemberResourceAccess({
        companyId,
        unlockedOfferIds: scopedMemberUnlockedOfferIds,
        resourceType: "telegram",
        resourceId: target.id,
      });
      if (localCheck.isAuthorized && target.inviteLink) {
        window.open(target.inviteLink, "_blank", "noopener,noreferrer");
        setClaimToast(true);
        setTimeout(() => setClaimToast(false), 3500);
      } else {
        setAccessDeniedToast("Accès refusé pour ce canal Telegram.");
        setTimeout(() => setAccessDeniedToast(null), 5000);
      }
    }
  };

  // Discord Handlers
  const handleSelectDiscordToClaim = (channel: DiscordChannelItem) => {
    setSelectedDiscordChannel(channel);
    setDiscordFlowStep("claim_qr");
  };

  const handleProceedToDiscordGateway = () => {
    setDiscordFlowStep("discord_gateway");
  };

  const handleCopyDiscordLink = () => {
    if (selectedDiscordChannel?.inviteLink) {
      navigator.clipboard.writeText(selectedDiscordChannel.inviteLink);
      setCopiedDiscordLink(true);
      setTimeout(() => setCopiedDiscordLink(false), 2500);
    }
  };

  const handleCopyDiscordShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedDiscordShareToast(true);
    setTimeout(() => setCopiedDiscordShareToast(false), 2500);
  };

  const handleOpenDiscord = async () => {
    if (selectedDiscordChannel) {
      await handleClaimDiscordInvite(selectedDiscordChannel);
    }
  };

  const handleClaimDiscordInvite = async (channel?: DiscordChannelItem) => {
    const target = channel || selectedDiscordChannel;
    if (!target) return;

    try {
      const resp = await fetch("/api/discord/request-server-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          channelId: target.id,
          unlockedOfferIds: scopedMemberUnlockedOfferIds,
          userEmail: user?.email,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.authorized) {
        setAccessDeniedToast(
          data.error || "Accès non autorisé : ce serveur Discord requiert l'offre correspondante.",
        );
        setTimeout(() => setAccessDeniedToast(null), 5000);
        return;
      }
      const verifiedUrl = data.inviteLink || target.inviteLink;
      if (verifiedUrl) {
        window.open(verifiedUrl, "_blank", "noopener,noreferrer");
        setDiscordClaimToast(true);
        setTimeout(() => setDiscordClaimToast(false), 3500);
      }
    } catch {
      const localCheck = verifyMemberResourceAccess({
        companyId,
        unlockedOfferIds: scopedMemberUnlockedOfferIds,
        resourceType: "discord",
        resourceId: target.id,
      });
      if (localCheck.isAuthorized && target.inviteLink) {
        window.open(target.inviteLink, "_blank", "noopener,noreferrer");
        setDiscordClaimToast(true);
        setTimeout(() => setDiscordClaimToast(false), 3500);
      } else {
        setAccessDeniedToast("Accès refusé pour ce serveur Discord.");
        setTimeout(() => setAccessDeniedToast(null), 5000);
      }
    }
  };

  const handleSendSupport = (message: string) => {
    const textToSend = message.trim();
    if (!textToSend) return;
    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: "user" as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const companyId = subscription.companyId || subscription.id;
    const persistedConversation = appendLocalSupportMessage({
      companyId,
      memberEmail: user?.email || "membre@mansa.app",
      memberName: user?.name || "Membre",
      sender: "member",
      text: textToSend,
    });
    if (!persistedConversation) setSupportChatList((prev) => [...prev, newMsg]);

    const memberMessageCount =
      persistedConversation?.messages.filter((item) => item.sender === "member").length ?? 1;
    if (memberMessageCount !== 1) return;

    // Auto-reply acknowledgment from support if configured by creator
    setTimeout(() => {
      const compId =
        currentSub.companyId || currentSub.id || subscription.companyId || subscription.id;
      const userKey = user?.email || "default";
      const allCompanies = getSavedCompanies(userKey);
      const comp =
        allCompanies.find(
          (c) =>
            c.id === compId ||
            (c.name &&
              currentSub.companyName &&
              c.name.toLowerCase() === currentSub.companyName.toLowerCase()),
        ) || allCompanies.find((c) => c.id === "comp-cadre-financier");

      const autoReplyEnabled = comp?.supportAutoReplyEnabled ?? true;
      if (!autoReplyEnabled) return;

      const rawMsg =
        comp?.supportAutoReplyMessage ||
        `Message bien reçu. L'équipe d'assistance de ${currentSub.companyName} est notifiée et vous répondra dans les plus brefs délais.`;

      const personalizedMsg = rawMsg
        .replace(/\{nom\}/gi, user?.name || "Membre")
        .replace(/\{entreprise\}/gi, currentSub.companyName);

      const persistedAutoReply = appendLocalSupportMessage({
        companyId: compId,
        memberEmail: user?.email || "membre@mansa.app",
        memberName: user?.name || "Membre",
        sender: "creator",
        text: personalizedMsg,
      });
      if (!persistedAutoReply) {
        setSupportChatList((prev) => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            sender: "creator",
            text: personalizedMsg,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    }, 1000);
  };

  const totalChannels = channelsList.length;

  const renderSidebarContent = (isMobile: boolean = false) => (
    <div className="flex flex-col h-full w-full">
      <div className="p-3.5 space-y-4 flex-1 overflow-y-auto">
        {/* Top Mini Card of Enterprise matching screenshot */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#14161b] border border-white/5 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative size-9 rounded-xl mansa-profile-avatar border border-white/15 flex items-center justify-center text-xs font-black shrink-0 overflow-hidden shadow-inner">
              {subscription.companyLogo ? (
                <img
                  src={subscription.companyLogo}
                  alt={subscription.companyName}
                  className="size-full object-cover mansa-avatar-image"
                />
              ) : (
                <span>
                  {subscription.companyInitials ||
                    subscription.companyName.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-white truncate tracking-tight">
                {subscription.companyName}
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <span>en ligne</span>
              </div>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
              title="Fermer le menu"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {isCompanyOwner && !canManageCompany && (
          <button
            type="button"
            onClick={() => {
              setPreviewMode("admin");
              setIsPreviewMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3.5 py-2.5 text-xs font-semibold text-blue-200 hover:bg-blue-500/20 transition-colors"
          >
            <Eye className="size-3.5" />
            Revenir en mode Administrateur
          </button>
        )}
        {canManageCompany && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPreviewMenuOpen((open) => !open)}
              className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-[#14161b] px-3.5 py-2.5 text-left hover:border-white/20 transition-colors"
              aria-expanded={isPreviewMenuOpen}
              aria-haspopup="menu"
            >
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Aperçu en tant que
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-white truncate">
                  {previewMode === "admin" && <Eye className="size-3.5 text-blue-400 shrink-0" />}
                  {previewMode === "public" && (
                    <Users className="size-3.5 text-emerald-400 shrink-0" />
                  )}
                  {previewMode === "hidden" && (
                    <EyeOff className="size-3.5 text-zinc-400 shrink-0" />
                  )}
                  {previewMode.startsWith("product:") && (
                    <Package className="size-3.5 text-amber-400 shrink-0" />
                  )}
                  <span className="truncate">
                    {previewMode === "admin"
                      ? "Administrateur"
                      : previewMode === "public"
                        ? "Public"
                        : previewMode === "hidden"
                          ? "Masqué"
                          : selectedPreviewOffer?.title || "Produit"}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`size-4 text-zinc-400 transition-transform ${isPreviewMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isPreviewMenuOpen && (
              <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#17191e] p-1.5 shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewMode("admin");
                    setIsPreviewMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left transition-colors ${previewMode === "admin" ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5"}`}
                >
                  <Eye className="size-3.5 text-blue-400" /> Administrateur
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewMode("public");
                    setIsPreviewMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left transition-colors ${previewMode === "public" ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5"}`}
                >
                  <Users className="size-3.5 text-emerald-400" /> Public
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewMode("hidden");
                    setIsPreviewMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left transition-colors ${previewMode === "hidden" ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5"}`}
                >
                  <EyeOff className="size-3.5 text-zinc-400" /> Masqué
                </button>

                <div className="my-1.5 border-t border-white/10 pt-1.5">
                  <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Produits
                  </div>
                  {enterpriseOffers.length === 0 ? (
                    <div className="px-2.5 py-2 text-[11px] text-zinc-500">Aucun produit créé</div>
                  ) : (
                    enterpriseOffers.map((offer) => (
                      <button
                        type="button"
                        key={offer.id}
                        onClick={() => {
                          setPreviewMode(`product:${offer.id}`);
                          setIsPreviewMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs text-left transition-colors ${selectedPreviewOfferId === offer.id ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5"}`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Package className="size-3.5 shrink-0 text-amber-400" />
                          <span className="truncate">{offer.title}</span>
                        </span>
                        <span className="shrink-0 text-[10px] text-zinc-500">
                          {offer.subscribersCount || "0"}
                        </span>
                      </button>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsPreviewMenuOpen(false);
                      onCreateProduct?.();
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-white/10 px-2.5 pt-2 text-xs text-zinc-300 hover:text-white"
                  >
                    <Plus className="size-3.5" /> Nouveau produit
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!canManageCompany && (
          <div className="rounded-xl border border-white/10 bg-[#14161b] p-1.5">
            <button
              type="button"
              onClick={() => setIsPreviewMenuOpen((open) => !open)}
              className="w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-white hover:bg-white/5 transition-colors"
              aria-expanded={isPreviewMenuOpen}
              aria-haspopup="menu"
            >
              <span className="flex items-center gap-2">
                <Package className="size-3.5 text-amber-400" />
                Produits
              </span>
              <ChevronDown
                className={`size-3.5 text-zinc-400 transition-transform ${isPreviewMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isPreviewMenuOpen && (
              <div className="mt-1 border-t border-white/10 pt-1">
                {enterpriseOffersLoading ? null : enterpriseOffers.length === 0 ? (
                  <div className="px-2.5 py-2 text-[11px] text-zinc-500">
                    Aucun produit disponible
                  </div>
                ) : (
                  enterpriseOffers.map((offer) => (
                    <button
                      type="button"
                      key={offer.id}
                      onClick={() => {
                        const hasProductAccess = memberUnlockedOfferIds.some(
                          (offerId) => offerId.toLowerCase() === offer.id.toLowerCase(),
                        );
                        if (hasProductAccess) {
                          setSelectedMemberProductId(offer.id);
                          setCompanyTab("accueil");
                          setActiveTab("accueil");
                        } else {
                          setCompanyTab("produits");
                          setActiveTab("accueil");
                          setSelectedProductDetailOffer(offer);
                          setSelectedProductPlanId(offer.pricingOptions?.[0]?.id || null);
                          setExpandedProductFaqIndex(null);
                        }
                        setIsPreviewMenuOpen(false);
                        if (isMobile || isCompact) setIsMobileCompanyNavOpen(false);
                        if (isMobile) setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${selectedMemberProductId === offer.id ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5 hover:text-white"}`}
                    >
                      <span className="truncate">{offer.title}</span>
                      <span className="shrink-0 text-[10px] text-zinc-500">
                        {offer.subscribersCount || "0"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation Items (En haut) : Accueil, Assistance, etc. */}
        <nav className="space-y-1 text-xs font-medium">
          {/* Tableau de bord : visible uniquement pour le créateur propriétaire */}
          {canManageCompany && (
            <button
              onClick={() => {
                if (onOpenCreatorDashboard) {
                  onOpenCreatorDashboard();
                } else {
                  setActiveTab("accueil");
                  setCompanyTab("accueil");
                }
                if (isMobile) setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              <LayoutDashboard className="size-4 text-blue-400" />
              <span>Tableau de bord</span>
            </button>
          )}

          {/* Accueil */}
          <button
            onClick={() => {
              setActiveTab("accueil");
              setCompanyTab("accueil");
            }}
            onDoubleClick={() => {
              if (isCompact) {
                setIsMobileCompanyNavOpen(false);
                setIsMobileSidebarOpen(false);
              }
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] ${
              activeTab === "accueil" && companyTab === "accueil"
                ? "bg-[#181a20] text-white font-semibold border border-white/10 shadow-sm"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            }`}
          >
            <Home className="size-4 text-zinc-300" />
            <span>Accueil</span>
          </button>

          {/* Assistance : Ouvre l'assistance créateur si créateur, sinon l'espace support membre */}
          <button
            onClick={() => {
              if (canManageCompany && onOpenCreatorAssistance) {
                onOpenCreatorAssistance();
              } else {
                setActiveTab("support");
              }
              if (isMobile || isCompact) setIsMobileCompanyNavOpen(false);
              if (isMobile || isCompact) setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] ${
              activeTab === "support"
                ? "bg-[#181a20] text-white font-semibold border border-white/10 shadow-sm"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            }`}
          >
            <MessageSquare className="size-4 text-zinc-300" />
            <span>Assistance</span>
          </button>

          {/* Ajouter une application : UNIQUEMENT pour le créateur */}
          {canManageCompany && (
            <button
              onClick={() => {
                if (onOpenCreatorApplications) {
                  onOpenCreatorApplications();
                } else {
                  setActiveTab("applications");
                }
                if (isMobile || isCompact) setIsMobileCompanyNavOpen(false);
                if (isMobile || isCompact) setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] ${
                activeTab === "applications"
                  ? "bg-[#181a20] text-white font-semibold border border-white/10 shadow-sm"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <Plus className="size-4 text-blue-400" />
              <span
                className={activeTab === "applications" ? "text-white font-bold" : "text-zinc-300"}
              >
                Ajouter une application
              </span>
            </button>
          )}

          {/* Applications réellement configurées : aucune entrée par défaut, aucun doublon. */}
          {configuredCompanyApps.map((app) => {
            const appLabel =
              app === "telegram"
                ? "Telegram"
                : app === "discord"
                  ? "Discord"
                  : app === "files"
                    ? "Fichiers"
                    : app === "courses"
                      ? "Courses"
                      : app === "chat"
                        ? "Chat"
                        : "Content";
            const appIcon =
              app === "telegram" ? (
                <TelegramIcon className="size-4" />
              ) : app === "discord" ? (
                <DiscordIcon className="size-4" />
              ) : app === "courses" ? (
                <GraduationCap className="size-4 text-indigo-400" />
              ) : app === "files" ? (
                <FileText className="size-4 text-blue-400" />
              ) : (
                <MessageSquare className="size-4 text-orange-400" />
              );
            const isActive =
              (app === "telegram" && activeTab === "telegram") ||
              (app === "discord" && activeTab === "discord") ||
              (app === "chat" && activeTab === "support");
            return (
              <button
                key={`configured-app-${app}`}
                onClick={() => openMobileConfiguredApp(app)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] ${isActive ? "bg-[#181a20] text-white font-semibold border border-white/10" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"}`}
              >
                {appIcon}
                <span>{appLabel}</span>
              </button>
            );
          })}
        </nav>

        {isMobile && onBackToPersonal && (
          <div className="pt-2 border-t border-white/5">
            <button
              onClick={() => {
                setIsMobileSidebarOpen(false);
                onBackToPersonal();
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer min-h-[44px]"
            >
              <ChevronLeft className="size-4 text-zinc-400" />
              <span>Mon Espace Personnel</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // One unified list for the left rail, deduplicated by company ID.
  const railCompanies = React.useMemo(() => {
    const rawList = (allSubscriptions || []).filter((s) => s.hasJoined !== false);
    const userKey = user?.uid || user?.email || "default";
    let leftIds: string[] = [];
    try {
      const leftRaw = localStorage.getItem(`mansa_left_enterprises_${userKey}`);
      if (leftRaw) leftIds = JSON.parse(leftRaw);
    } catch {}

    const seen = new Set<string>();
    const unique: any[] = [];
    const addCompany = (item: any, isCreator: boolean) => {
      if (!item) return;
      const companyId = item.companyId || item.id;
      if (
        !companyId ||
        seen.has(companyId) ||
        leftIds.includes(companyId) ||
        leftIds.includes(item.id)
      )
        return;

      seen.add(companyId);
      unique.push({
        ...item,
        id: companyId,
        companyId,
        companyName: item.companyName || item.name,
        isCreator,
        sourceId: item.id,
      });
    };

    // Creator companies come first; a matching subscription is then ignored
    // because the company ID has already been seen.
    for (const company of creatorCompanies || []) addCompany(company, true);
    for (const subscription of rawList) {
      addCompany(subscription, false);
    }

    return unique;
  }, [allSubscriptions, creatorCompanies, user]);

  const handleRailCompanySelect = (company: any) => {
    if (company.isCreator) {
      onSelectCreatorCompany?.(company);
    } else {
      onSelectSubscription?.(company.sourceId || company.id);
    }
  };

  /* Keep the list stable even if a legacy item has no company name. */
  const railItems = React.useMemo(() => {
    return railCompanies.filter((company) => company.companyName || company.name);
  }, [railCompanies]);

  return (
    <div className="mansa-viewport mansa-safe-bottom flex h-full w-full flex-1 overflow-hidden relative select-none bg-[#08090b] text-[#eeeeee] font-sans antialiased">
      {/* 1. LEFTMOST RAIL: Enterprise Squares ("les cases entreprise sur le cote comme sur l'image") */}
      <div
        className={`${isMobileCompanyNavOpen ? "flex" : "hidden"} lg:flex w-[72px] shrink-0 bg-[#08090a] border-r border-white/5 flex-col items-center py-3 gap-2 overflow-y-auto no-scrollbar select-none z-10`}
      >
        {/* 1. User / Personal Workspace */}
        {onBackToPersonal && (
          <div className="relative group flex items-center justify-center w-full px-2">
            <button
              onClick={onBackToPersonal}
              aria-label="Passer à l’espace personnel"
              className="size-11 rounded-2xl bg-[#16171b] hover:bg-white/10 hover:text-white text-zinc-400 border border-white/10 flex items-center justify-center transition-all cursor-pointer overflow-hidden"
              title="Espace Personnel"
            >
              <div className="size-full bg-gradient-to-br from-zinc-700 to-zinc-950 flex items-center justify-center text-[11px] font-black text-white font-mono">
                <User className="size-5" />
              </div>
            </button>
            <div className="absolute left-[72px] z-50 px-2.5 py-1 rounded-lg bg-[#181a22] text-xs font-semibold text-white border border-white/10 shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150">
              {user.name || "Espace Personnel"}
            </div>
          </div>
        )}

        {/* Unified company list: created and joined companies, one entry per company ID. */}
        <div className="w-full flex flex-col items-center gap-1.5 pt-1 flex-1">
          {railItems.map((item: any) => {
            const isActive =
              item.companyId === subscription.companyId || item.id === subscription.id;
            return (
              <div
                key={`rail-${item.companyId}`}
                className="relative group flex items-center justify-center w-full px-2"
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-blue-500 rounded-r-full shadow-sm shadow-blue-500/50" />
                )}

                <button
                  onClick={() => handleRailCompanySelect(item)}
                  className={`size-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative overflow-hidden select-none ${
                    isActive
                      ? "ring-2 ring-blue-500 scale-105 shadow-lg shadow-blue-500/20"
                      : "border border-white/10 hover:border-blue-400/50 hover:scale-105 opacity-85 hover:opacity-100"
                  }`}
                  title={item.companyName || item.name}
                >
                  {item.companyLogo || item.logo ? (
                    <img
                      src={item.companyLogo || item.logo}
                      alt={item.companyName || item.name}
                      className="size-full object-cover mansa-avatar-image"
                    />
                  ) : item.type === "whop_yellow" ? (
                    <div className="size-full bg-[#D8FF3F] text-black font-black text-lg flex items-center justify-center">
                      W
                    </div>
                  ) : item.type === "green_stripes" ? (
                    <div className="size-full bg-[#0b1712] border border-emerald-500/30 text-emerald-400 flex flex-col items-center justify-center gap-0.5">
                      <span className="w-5 h-1 bg-emerald-400 rounded-full" />
                      <span className="w-3.5 h-1 bg-emerald-400/70 rounded-full" />
                    </div>
                  ) : item.type === "purple_shield" ? (
                    <div className="size-full bg-[#13111f] border border-purple-500/30 text-purple-400 flex items-center justify-center">
                      <ShieldCheck className="size-5" />
                    </div>
                  ) : (
                    <div
                      className={`size-full bg-gradient-to-br ${
                        item.companyGradient || "from-blue-950 via-indigo-950 to-black"
                      } flex items-center justify-center text-[10px] font-black text-white font-mono`}
                    >
                      <span>
                        {item.companyInitials ||
                          item.initials ||
                          (item.companyName || item.name || "EM").substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                </button>

                <div className="absolute left-[72px] z-50 px-2.5 py-1 rounded-lg bg-[#181a22] text-xs font-semibold text-white border border-white/10 shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150">
                  {item.companyName || item.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Plus button to discover more */}
        <div className="relative group flex items-center justify-center w-full px-2 pt-2 shrink-0">
          <button
            onClick={onOpenMarketplace}
            className="size-11 rounded-2xl bg-white/5 hover:bg-white/10 hover:text-emerald-400 text-zinc-400 border border-dashed border-white/20 hover:border-emerald-400 flex items-center justify-center transition-all cursor-pointer"
            title="Découvrir d'autres entreprises"
          >
            <Plus className="size-5" />
          </button>
          <div className="absolute left-[72px] z-50 px-2.5 py-1 rounded-lg bg-[#181a22] text-xs font-semibold text-white border border-white/10 shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150">
            Découvrir de nouvelles offres
          </div>
        </div>
      </div>

      {/* SECONDARY ENTERPRISE SIDEBAR (Desktop Fixed) */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-white/[0.08] bg-[#0e1014] flex-col justify-between select-none">
        {renderSidebarContent(false)}
      </aside>

      {/* MOBILE / TABLET SLIDING DRAWER */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="relative w-72 max-w-[85vw] bg-[#0c0d10] border-r border-white/10 shadow-2xl flex flex-col justify-between select-none z-10 animate-in slide-in-from-left duration-200 overflow-y-auto"
          >
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Écran mobile de la communauté : la barre des entreprises reste à gauche et
            la zone principale reprend directement la navigation réelle de l'entreprise. */}
      {isCompact &&
        isMobileCompanyNavOpen &&
        activeTab === "accueil" &&
        companyTab === "accueil" && (
          <div className="flex-1 min-w-0 lg:hidden overflow-y-auto bg-[#08090b] select-text">
            {renderSidebarContent(false)}
          </div>
        )}

      {/* MAIN WORKSPACE CONTENT */}
      <div
        className={`${isCompact && isMobileCompanyNavOpen && activeTab === "accueil" && companyTab === "accueil" ? "hidden lg:flex" : "flex"} flex-1 min-w-0 flex-col overflow-y-auto bg-[#08090b] select-text`}
      >
        {/* ============================================================ */}
        {/* VIEW 1: VUE D'ACCUEIL DE L'ENTREPRISE (DARK MODE HAUT DE GAMME) */}
        {/* ============================================================ */}
        {activeTab === "accueil" && (
          <div className="w-full flex-1 flex flex-col pb-16 animate-in fade-in duration-150">
            {/* En-tête de la page d’entreprise avec bannière */}
            {
              <>
                <div className="flex lg:hidden items-center gap-3 border-b border-white/[0.08] bg-[#0a0b0d] px-4 py-3">
                  <button
                    type="button"
                    onClick={handleReturnToCommunity}
                    className="flex size-9 items-center justify-center rounded-xl text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label={
                      currentSub.isCommunityPreview
                        ? "Retour à Découvrir"
                        : "Retour à la communauté"
                    }
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <h1 className="text-base font-semibold text-white">Accueil</h1>
                </div>
                <div className="relative w-full h-44 sm:h-64 md:h-72 lg:h-80 overflow-hidden bg-[#111216] select-none group">
                  <img
                    src={
                      currentSub.companyBanner ||
                      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80"
                    }
                    alt={`Bannière ${currentSub.companyName}`}
                    className="w-full h-full object-cover object-center"
                  />
                  {/* Subtle gradient vignette to seamlessly transition to the dark canvas */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0d] via-[#0a0b0d]/30 to-transparent pointer-events-none" />
                  {canManageCompany && (
                    <button
                      type="button"
                      onClick={() => setIsBrandingModalOpen(true)}
                      className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400"
                      aria-label="Modifier la bannière de l’entreprise"
                    />
                  )}

                  {/* Bouton de configuration de la bannière */}
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                    {canManageCompany && (
                      <button
                        onClick={() => setIsBrandingModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-lg transition-all cursor-pointer active:scale-95"
                        title="Modifier la bannière et la photo de profil de l'entreprise"
                      >
                        <Camera className="size-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">Configurer la bannière & logo</span>
                        <span className="sm:hidden">Bannière</span>
                      </button>
                    )}
                  </div>

                  {/* Toast for profile link sharing */}
                  {copiedProfileShare && (
                    <div className="absolute top-14 right-3 z-20 px-3.5 py-2 rounded-xl bg-[#14151a] border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 shadow-xl animate-in fade-in slide-in-from-top-2">
                      <Check className="size-3.5 text-emerald-400" />
                      <span>Lien copié !</span>
                    </div>
                  )}
                </div>

                {/* 2. BLOC D'INFORMATIONS */}
                <div className="px-4 sm:px-8 lg:px-10 relative">
                  {/* Photo de profil carrée aux coins arrondis superposée sur le coin inférieur gauche de la bannière */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 -mt-12 sm:-mt-18 md:-mt-22 mb-4">
                    <div className="flex items-end gap-3 sm:gap-5">
                      <div
                        onClick={() => canManageCompany && setIsBrandingModalOpen(true)}
                        className={`relative size-24 sm:size-36 md:size-40 rounded-2xl sm:rounded-3xl border-4 border-[#0a0b0d] bg-[#14161f] shadow-2xl overflow-hidden shrink-0 ${
                          canManageCompany ? "group cursor-pointer" : "cursor-default select-none"
                        }`}
                        title={
                          canManageCompany
                            ? "Cliquer pour configurer la photo de profil / logo et la bannière"
                            : currentSub.companyName
                        }
                      >
                        {currentSub.companyLogo ? (
                          <img
                            src={currentSub.companyLogo}
                            alt={currentSub.companyName}
                            className={`size-full object-cover mansa-avatar-image ${canManageCompany ? "group-hover:scale-105" : ""} transition-transform duration-300`}
                          />
                        ) : (
                          <div className="size-full mansa-profile-avatar flex items-center justify-center text-3xl sm:text-4xl font-black">
                            {currentSub.companyInitials ||
                              currentSub.companyName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        {/* Hover overlay with Camera to edit - Uniquement pour le créateur propriétaire */}
                        {canManageCompany && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 select-none">
                            <Camera className="size-6 text-emerald-400" />
                            <span className="text-[11px] font-bold text-center px-1">
                              Modifier logo
                            </span>
                          </div>
                        )}
                        {/* Online status indicator */}
                        <span
                          className="absolute bottom-2 sm:bottom-2.5 right-2 sm:right-2.5 size-3 sm:size-4 rounded-full bg-emerald-400 ring-4 ring-[#0a0b0d]"
                          title="Espace d'entreprise actif"
                        />
                      </div>
                    </div>

                    {/* Des icônes d'action et de gestion alignées à l'extrême droite */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 self-end pt-1 sm:pt-0">
                      {/* Bouton Rejoindre (vert cohérent avec le site, disparaît une fois rejoint) */}
                      {!isEnterpriseJoined && (
                        <button
                          onClick={handleJoinEnterprise}
                          className="px-4 py-2.5 rounded-xl bg-[#00D26A] hover:bg-[#00B85C] active:scale-[0.98] text-black text-xs font-bold tracking-wide transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                        >
                          Rejoindre
                        </button>
                      )}

                      {/* Menu « ⋮ » de la page d'accueil de l'entreprise */}
                      <div className="relative" ref={optionsMenuRef}>
                        <button
                          onClick={() => setOptionsDropdownOpen(!optionsDropdownOpen)}
                          className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
                          title="Options de l'entreprise"
                        >
                          <MoreVertical className="size-4" />
                        </button>

                        {optionsDropdownOpen && (
                          <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-[#14161f] border border-white/10 shadow-2xl p-1.5 z-30 space-y-0.5 animate-in fade-in duration-150">
                            {/* Action 1 : COPIER LE LIEN */}
                            <button
                              onClick={() => {
                                const publicUrl = window.location.href;
                                navigator.clipboard.writeText(publicUrl);
                                setCopiedLinkToast(true);
                                setOptionsDropdownOpen(false);
                                setTimeout(() => setCopiedLinkToast(false), 3000);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-colors text-left cursor-pointer"
                            >
                              <Share2 className="size-3.5 text-zinc-400" />
                              <span>COPIER LE LIEN</span>
                            </button>

                            {/* Action 2 : SIGNALER */}
                            <button
                              onClick={() => {
                                setIsReportModalOpen(true);
                                setOptionsDropdownOpen(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-left cursor-pointer"
                            >
                              <Flag className="size-3.5 text-rose-400" />
                              <span>SIGNALER</span>
                            </button>

                            {/* Action 3 : GÉRER L'ADHÉSION */}
                            <button
                              onClick={() => {
                                setIsManageMembershipModalOpen(true);
                                setOptionsDropdownOpen(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-colors text-left cursor-pointer"
                            >
                              <ShieldCheck className="size-3.5 text-indigo-400" />
                              <span>GÉRER L’ADHÉSION</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Informations textuelles & Métadonnées */}
                  <div className="space-y-3 pt-1">
                    {/* Le nom de l'entreprise affiché en gros caractères */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                        {currentSub.companyName}
                      </h1>
                    </div>

                    {currentSub.description && (
                      <p className="max-w-2xl text-sm leading-relaxed text-zinc-300">
                        {currentSub.description}
                      </p>
                    )}

                    {/* Métadonnées uniquement lorsqu’elles existent réellement. */}
                    {(currentSub.creatorName || currentSub.subscribedAt) && (
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs sm:text-sm text-zinc-400">
                        {currentSub.creatorName && (
                          <div className="flex items-center gap-1.5">
                            <User className="size-3.5 text-zinc-500 shrink-0" />
                            <span>
                              Créé par{" "}
                              <strong className="font-semibold text-zinc-200">
                                {currentSub.creatorName}
                              </strong>
                            </span>
                          </div>
                        )}
                        {currentSub.subscribedAt && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="size-3.5 text-zinc-500 shrink-0" />
                            <span>Membre depuis {currentSub.subscribedAt}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs sm:text-sm text-zinc-300">
                      <Users className="size-4 text-zinc-400" />
                      <span>
                        {companyMemberCount.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}{" "}
                        {lang === "fr" ? "membre" : "member"}
                        {companyMemberCount === 1 ? "" : "s"}
                      </span>
                      <CompanySocialIcons socialLinks={currentSub.socialLinks} />
                    </div>
                  </div>
                </div>
              </>
            }

            {/* 3. NAVIGATION INTERNE : BARRE D'ONGLETS HORIZONTALE */}
            {/* Comprenant "Accueil" (actif avec indicateur souligné en bleu), "Produits" et "Avis" */}
            <div className="mt-6 sm:mt-8 border-b border-white/[0.08] px-4 sm:px-8 lg:px-10 bg-[#0a0b0d] overflow-x-auto no-scrollbar">
              <nav className="flex items-center gap-6 sm:gap-8 -mb-px min-w-max">
                {/* Onglet Accueil (actif par défaut avec indicateur souligné en bleu) */}
                <button
                  onClick={() => setCompanyTab("accueil")}
                  className={`py-3.5 text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 relative ${
                    companyTab === "accueil"
                      ? "text-white border-b-2 border-blue-500 font-bold"
                      : "text-zinc-400 hover:text-zinc-200 border-b-2 border-transparent"
                  }`}
                >
                  <Home className="size-4" />
                  <span>Accueil</span>
                </button>

                {/* Onglet Produits */}
                <button
                  onClick={() => setCompanyTab("produits")}
                  className={`py-3.5 text-sm transition-all cursor-pointer flex items-center gap-2 relative ${
                    companyTab === "produits"
                      ? "text-white border-b-2 border-blue-500 font-bold"
                      : "text-zinc-400 hover:text-zinc-200 border-b-2 border-transparent"
                  }`}
                >
                  <FileText className="size-4" />
                  <span>Produits</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-white/[0.06] text-[11px] text-zinc-400 font-mono">
                    {enterpriseOffers.length}
                  </span>
                </button>

                {/* Onglet Avis */}
                <button
                  onClick={() => setCompanyTab("avis")}
                  className={`py-3.5 text-sm transition-all cursor-pointer flex items-center gap-2 relative ${
                    companyTab === "avis"
                      ? "text-white border-b-2 border-blue-500 font-bold"
                      : "text-zinc-400 hover:text-zinc-200 border-b-2 border-transparent"
                  }`}
                >
                  <Star className="size-4 text-amber-400 fill-amber-400/20" />
                  <span>Avis</span>
                  {currentSub.reviewsCount ? (
                    <span className="text-[11px] text-zinc-400 font-medium">
                      ({currentSub.reviewsCount})
                    </span>
                  ) : null}
                </button>
              </nav>
            </div>

            {/* 4. ZONE DE CONTENU */}
            <div className="px-4 sm:px-8 lg:px-10 py-5 sm:py-8">
              {/* VUE CONTENU : ONGLET ACCUEIL (Flux de publications ou d'actualités propre à l'entreprise) */}
              {companyTab === "accueil" && (
                <div className="max-w-4xl space-y-6 animate-in fade-in duration-150">
                  {/* Section Fil d'actualité & Publications */}
                  <div id="company-newsfeed" className="pt-2">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Actualités & Publications officielles
                      </h4>
                      <span className="text-xs text-zinc-500">
                        {companyPosts.length} publication{companyPosts.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Flux des actualités propres à l'entreprise */}
                  {companyPosts.length === 0 ? (
                    <div className="rounded-2xl border border-white/[0.08] bg-[#111318] p-8 text-center space-y-2">
                      <p className="text-sm font-semibold text-white">
                        Aucune actualité publiée pour le moment
                      </p>
                      <p className="text-xs text-zinc-400">
                        Les actualités et annonces officielles publiées par{" "}
                        {subscription.companyName} s'afficheront ici.
                      </p>
                    </div>
                  ) : (
                    companyPosts.map((post) => {
                      const isLiked = !!likedPostsMap[post.id];
                      const commentsList = postCommentsMap[post.id] || [];
                      const isCommentsOpen = !!expandedCommentsMap[post.id];

                      return (
                        <div
                          key={post.id}
                          className="rounded-2xl border border-white/[0.09] bg-[#111318] p-5 sm:p-6 space-y-4 hover:border-white/15 transition-all shadow-lg shadow-black/40"
                        >
                          {/* En-tête de la publication */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="size-10 rounded-xl bg-[#181a22] border border-white/10 overflow-hidden shrink-0">
                                {subscription.companyLogo ? (
                                  <img
                                    src={subscription.companyLogo}
                                    alt={subscription.companyName}
                                    className="size-full object-cover mansa-avatar-image"
                                  />
                                ) : (
                                  <div className="size-full mansa-profile-avatar flex items-center justify-center text-xs font-black">
                                    {subscription.companyInitials || "VIP"}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-white truncate">
                                    {post.authorName || subscription.companyName}
                                  </span>
                                  <span className="size-1 rounded-full bg-zinc-600 shrink-0" />
                                  <span className="text-[11px] text-zinc-400 font-medium shrink-0">
                                    {post.createdAt}
                                  </span>
                                </div>
                                {post.pinned && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-blue-400 font-semibold pt-0.5">
                                    <Pin className="size-3" />
                                    <span>Publication Épinglée</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Bouton de suppression réservé au créateur */}
                            {canManageCompany && (
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                                title="Supprimer cette publication"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Contenu textuel */}
                          <div className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                              {post.title}
                            </h3>
                            {post.content && (
                              <p className="whitespace-pre-line text-zinc-300">{post.content}</p>
                            )}
                          </div>

                          {post.media?.url && (
                            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                              {post.media.type.startsWith("video/") ? (
                                <video
                                  src={post.media.url}
                                  controls
                                  preload="metadata"
                                  aria-label={post.media.name || "Vidéo de la publication"}
                                  className="max-h-[520px] w-full bg-black object-contain"
                                />
                              ) : (
                                <img
                                  src={post.media.url}
                                  alt={post.media.name || "Média de la publication"}
                                  className="max-h-[520px] w-full object-contain"
                                />
                              )}
                            </div>
                          )}

                          {post.poll && post.poll.options.length > 0 && (
                            <section
                              aria-label={`Sondage : ${post.poll.question}`}
                              className="space-y-3 rounded-xl border border-white/10 bg-[#161820] p-4"
                            >
                              <div className="flex items-start gap-2 text-sm font-semibold text-white">
                                <BarChart3 className="mt-0.5 size-4 shrink-0 text-blue-300" />
                                <span>{post.poll.question}</span>
                              </div>
                              {post.poll.options.map((option, optionIndex) => {
                                const totalVotes = (post.poll?.votes || []).reduce(
                                  (total, count) => total + Number(count || 0),
                                  0,
                                );
                                const optionVotes = Number(post.poll?.votes?.[optionIndex] || 0);
                                const hasVoted = Object.prototype.hasOwnProperty.call(
                                  votedPollsMap,
                                  post.id,
                                );
                                const percentage =
                                  totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                                return (
                                  <button
                                    key={`${post.id}-poll-${optionIndex}`}
                                    type="button"
                                    disabled={hasVoted}
                                    onClick={() => handleVoteOnPoll(post, optionIndex)}
                                    aria-pressed={votedPollsMap[post.id] === optionIndex}
                                    className="relative flex w-full items-center justify-between overflow-hidden rounded-lg border border-white/10 px-3 py-2.5 text-left text-xs text-zinc-200 transition-colors hover:border-blue-400/50 hover:bg-blue-400/5 disabled:cursor-default"
                                  >
                                    <span
                                      aria-hidden="true"
                                      className="absolute inset-y-0 left-0 bg-blue-500/15"
                                      style={{ width: `${percentage}%` }}
                                    />
                                    <span className="relative min-w-0 flex-1 break-words pr-3">
                                      {option}
                                    </span>
                                    <span className="relative z-10 shrink-0 whitespace-nowrap rounded-md bg-zinc-950 px-2 py-1 text-xs font-semibold tabular-nums text-white shadow-sm">
                                      {percentage}% · {optionVotes} vote
                                      {optionVotes === 1 ? "" : "s"}
                                    </span>
                                  </button>
                                );
                              })}
                              <p className="text-[11px] text-zinc-500">
                                {Object.prototype.hasOwnProperty.call(votedPollsMap, post.id)
                                  ? "Merci pour votre vote."
                                  : "Choisissez une réponse pour voter."}
                              </p>
                            </section>
                          )}

                          {/* Métriques éventuelles */}
                          {post.metrics && post.metrics.length > 0 && (
                            <div className="p-4 rounded-xl bg-[#161820] border border-white/5 grid grid-cols-3 gap-3 text-center">
                              {post.metrics.map((m, mIdx) => (
                                <div key={mIdx} className="space-y-0.5">
                                  <div className="text-[11px] text-zinc-400">{m.label}</div>
                                  <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
                                    {m.value}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Fichier joint éventuel */}
                          {post.attachment && (
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#161822] border border-white/5 text-xs">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-red-500/10 text-red-400 font-mono font-bold text-[10px]">
                                  {post.attachment.name.endsWith(".pdf") ? "PDF" : "DOC"}
                                </div>
                                <div>
                                  <div className="font-semibold text-white">
                                    {post.attachment.name}
                                  </div>
                                  <div className="text-[10px] text-zinc-500">
                                    {post.attachment.size} · Téléchargement
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  alert(`Téléchargement de ${post.attachment?.name}...`)
                                }
                                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Download className="size-3" />
                                <span>Télécharger</span>
                              </button>
                            </div>
                          )}

                          {/* Barre d'interaction */}
                          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-zinc-400">
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => handleToggleLike(post)}
                                className={`flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2 rounded-lg ${
                                  isLiked
                                    ? "text-rose-400 bg-rose-500/10 font-bold"
                                    : "hover:text-white hover:bg-white/5"
                                }`}
                              >
                                <Heart className={`size-3.5 ${isLiked ? "fill-rose-400" : ""}`} />
                                <span>{post.likesCount || 0}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedCommentsMap((prev) => ({
                                    ...prev,
                                    [post.id]: !prev[post.id],
                                  }))
                                }
                                className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                              >
                                <MessageCircle className="size-3.5" />
                                <span>
                                  {commentsList.length} commentaire
                                  {commentsList.length > 1 ? "s" : ""}
                                </span>
                              </button>
                            </div>

                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                setCopiedProfileShare(true);
                                setTimeout(() => setCopiedProfileShare(false), 2500);
                              }}
                              className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-white/5"
                            >
                              <Share2 className="size-3.5" />
                              <span>Partager</span>
                            </button>
                          </div>

                          {/* Section commentaires */}
                          {isCommentsOpen && (
                            <div className="mt-2 space-y-3 rounded-xl border border-white/5 bg-black/10 p-3 pt-3">
                              {commentsList.length > 0 && (
                                <div className="space-y-2">
                                  {commentsList.map((reply, index) => (
                                    <div
                                      key={`${post.id}-reply-${index}`}
                                      className="border-b border-white/5 pb-2 last:border-0 last:pb-0"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-semibold text-white">
                                          {reply.author}
                                        </span>
                                        <span className="text-[10px] text-zinc-500">
                                          {reply.time}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-300">
                                        {reply.text}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Formulaire ajout commentaire */}
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleAddComment(post.id);
                                }}
                                className="flex gap-2 pt-1"
                              >
                                <input
                                  type="text"
                                  value={commentInputMap[post.id] || ""}
                                  onChange={(e) =>
                                    setCommentInputMap((prev) => ({
                                      ...prev,
                                      [post.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Écrire un commentaire..."
                                  className="flex-1 rounded-lg border border-white/10 bg-[#16171b] px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
                                />
                                <button
                                  type="submit"
                                  disabled={!(commentInputMap[post.id] || "").trim()}
                                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium text-xs transition-colors cursor-pointer"
                                >
                                  Envoyer
                                </button>
                              </form>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* VUE CONTENU : ONGLET PRODUITS */}
              {companyTab === "produits" && (
                <div className="space-y-6 animate-in fade-in duration-150 max-w-5xl">
                  <div className="grid grid-cols-2 gap-4 sm:gap-5">
                    {enterpriseOffersLoading ? null : enterpriseOffers.length === 0 ? (
                      <div className="col-span-1 md:col-span-2 py-12 px-6 rounded-2xl border border-white/10 bg-[#111318] text-center space-y-3">
                        <ShoppingBag className="size-10 text-zinc-500 mx-auto" />
                        <h4 className="text-base font-bold text-white">
                          Aucune autre offre disponible
                        </h4>
                        <p className="text-xs text-zinc-400 max-w-md mx-auto">
                          {subscription.companyName} n'a pas d'autres produits ou abonnements
                          configurés pour le moment.
                        </p>
                      </div>
                    ) : (
                      enterpriseOffers.map((offer) => {
                        const visual = offer.imageUrl || offer.bannerUrl;
                        const priceOrStatus =
                          offer.pricingType === "free"
                            ? "Gratuit"
                            : offer.priceDisplay || "Gratuit";

                        return (
                          <button
                            key={offer.id}
                            type="button"
                            onClick={() => setSelectedProductDetailOffer(offer)}
                            className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111318] text-left transition-colors duration-150 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                          >
                            <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-900">
                              {visual && (
                                <img
                                  src={visual}
                                  alt=""
                                  width={640}
                                  height={480}
                                  loading="lazy"
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              )}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-3 pb-3 pt-10">
                                <h4 className="line-clamp-2 text-sm font-bold leading-tight text-white sm:text-base">
                                  {offer.title}
                                </h4>
                              </div>
                            </div>
                            <div className="border-t border-white/[0.06] bg-[#18191d] px-3 py-3">
                              <span className="font-mono text-sm font-bold text-emerald-400 sm:text-base">
                                {priceOrStatus}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* VUE CONTENU : ONGLET AVIS */}
              {companyTab === "avis" && (
                <div className="max-w-4xl space-y-6 animate-in fade-in duration-150">
                  {currentSub.rating !== undefined && (currentSub.reviewsCount || 0) > 0 ? (
                    <div className="rounded-2xl border border-white/[0.08] bg-[#111318] p-6 flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
                      <div className="space-y-1 text-center sm:text-left">
                        <div className="flex items-center justify-center gap-2 text-4xl font-extrabold tracking-tight text-white sm:justify-start">
                          <span>{currentSub.rating.toFixed(1)}</span>
                          <Star className="size-6 fill-amber-400 text-amber-400" />
                        </div>
                        <p className="text-xs text-zinc-400">
                          Basé sur {currentSub.reviewsCount} avis vérifiés
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/[0.08] bg-[#111318] p-8 text-center">
                      <Star className="mx-auto size-8 text-zinc-600" />
                      <p className="mt-3 text-sm font-semibold text-white">
                        Aucun avis pour le moment
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Les avis réels des membres apparaîtront ici.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: SUPPORT CHAT */}
        {activeTab === "support" && (
          <SupportInboxView
            mode="member"
            companyName={subscription.companyName}
            conversations={[
              {
                id: `${subscription.companyId || subscription.id}:${user?.email || "membre@mansa.app"}`,
                companyId: subscription.companyId || subscription.id,
                memberName: user?.name || "Membre",
                memberEmail: user?.email || "membre@mansa.app",
                messages: supportChatList.map((message) => ({
                  ...message,
                  sender: message.sender === "user" ? ("member" as const) : ("creator" as const),
                })),
              },
            ]}
            selectedConversationId={`${subscription.companyId || subscription.id}:${user?.email || "membre@mansa.app"}`}
            mobileConversationOpen={isSupportConversationOpen}
            onSelectConversation={(conversationId) =>
              setIsSupportConversationOpen(Boolean(conversationId))
            }
            onSendMessage={(_, text) => handleSendSupport(text)}
            onBack={() => {
              setIsSupportConversationOpen(false);
              handleConnectedAppBack();
            }}
            safeArea
          />
        )}

        {/* VIEW 3: TELEGRAM CONNECTED APP & CHANNELS                     */}
        {/* ============================================================ */}
        {activeTab === "telegram" && (
          <div className="flex-1 flex flex-col h-full bg-[#0a0b0e] overflow-y-auto">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              {canManageCompany ? (
                <ConnectedAppsView
                  lang={lang}
                  initialSubView="telegram"
                  companyName={subscription.companyName}
                  companyId={companyId}
                  availableProducts={enterpriseOffers.map((offer) => ({
                    id: offer.id,
                    title: offer.title,
                    priceDisplay: offer.priceDisplay,
                    subscribersCount: offer.subscribersCount || 0,
                  }))}
                  onBackToDashboard={handleConnectedAppBack}
                />
              ) : (
                <div className="max-w-3xl mx-auto w-full space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("accueil");
                      setCompanyTab("accueil");
                      setIsMobileCompanyNavOpen(true);
                      setIsMobileSidebarOpen(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg p-2 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                    aria-label="Retour à l’accueil"
                  >
                    <ChevronLeft className="size-4" />
                    Retour
                  </button>
                  <div className="rounded-2xl border border-[#229ED9]/30 bg-[#11151b] p-5">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <TelegramIcon className="size-5" /> Vos accès Telegram
                    </h2>
                    <p className="mt-1 text-xs text-zinc-400">
                      Seuls les canaux inclus dans vos offres sont visibles ici.
                    </p>
                  </div>
                  {authorizedTelegramChannels.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-[#111318] p-6 text-center text-xs text-zinc-400">
                      Aucun canal Telegram n’est débloqué avec votre offre actuelle.
                    </div>
                  ) : (
                    authorizedTelegramChannels.map((channel) => (
                      <div
                        key={channel.id}
                        className="rounded-2xl border border-white/10 bg-[#111318] p-4 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-bold text-white">{channel.name}</div>
                          <div className="text-[11px] text-zinc-400">
                            {channel.description || "Canal Telegram privé"}
                          </div>
                        </div>
                        {channel.inviteLink ? (
                          <a
                            href={channel.inviteLink}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg bg-[#229ED9] px-3 py-2 text-xs font-bold text-white"
                          >
                            Ouvrir
                          </a>
                        ) : (
                          <span className="text-[11px] text-zinc-500">Lien indisponible</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW: APPLICATIONS & INTEGRATIONS CATALOG                    */}
        {/* ============================================================ */}
        {activeTab === "applications" && (
          <div className="flex-1 flex flex-col h-full bg-[#0a0b0e] overflow-y-auto">
            {/* Top header on mobile for opening sidebar if on small screen */}
            <div className="lg:hidden w-full h-12 px-3 border-b border-white/[0.08] bg-[#0c0d11] flex items-center justify-between shrink-0 select-none">
              <button
                onClick={() => {
                  setActiveTab("accueil");
                  setCompanyTab("accueil");
                  setIsMobileCompanyNavOpen(true);
                  setIsMobileSidebarOpen(false);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                title="Retour à la navigation de l’entreprise"
                aria-label="Retour à la navigation de l’entreprise"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="flex items-center gap-2">
                <Plus className="size-4 text-blue-400" />
                <span className="text-xs font-bold text-white">Applications</span>
              </div>
              <div className="w-8" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <ConnectedAppsView
                lang={lang}
                initialSubView="catalog"
                companyName={subscription.companyName}
                companyId={companyId}
                availableProducts={enterpriseOffers.map((offer) => ({
                  id: offer.id,
                  title: offer.title,
                  priceDisplay: offer.priceDisplay,
                  subscribersCount: offer.subscribersCount || 0,
                }))}
                onOpenCoursesWorkflow={(productIds) => {
                  onOpenCreatorAppWorkspace?.(
                    "courses",
                    productIds.length > 0 ? productIds : selectedPreviewOfferId ? [selectedPreviewOfferId] : [],
                  );
                }}
                onOpenFilesWorkflow={(productIds) => {
                  onOpenCreatorAppWorkspace?.(
                    "files",
                    productIds.length > 0 ? productIds : selectedPreviewOfferId ? [selectedPreviewOfferId] : [],
                  );
                }}
                onBackToDashboard={() => setActiveTab("accueil")}
              />
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 4: DISCORD CONNECTED APP & SERVERS                       */}
        {/* ============================================================ */}
        {activeTab === "discord" && (
          <div className="flex-1 flex flex-col h-full bg-[#0a0b0e] overflow-y-auto">
            {/* Top header on mobile for opening sidebar if on small screen */}
            <div className="lg:hidden w-full h-12 px-3 border-b border-white/[0.08] bg-[#0c0d11] flex items-center justify-between shrink-0 select-none">
              <button
                onClick={() => {
                  setActiveTab("accueil");
                  setCompanyTab("accueil");
                  setIsMobileCompanyNavOpen(true);
                  setIsMobileSidebarOpen(false);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                title="Retour à la navigation de l’entreprise"
                aria-label="Retour à la navigation de l’entreprise"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="flex items-center gap-2">
                <DiscordIcon className="size-4" />
                <span className="text-xs font-bold text-white">Discord</span>
              </div>
              <div className="w-8" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              {canManageCompany ? (
                <ConnectedAppsView
                  lang={lang}
                  initialSubView="discord"
                  companyName={subscription.companyName}
                  companyId={companyId}
                  availableProducts={enterpriseOffers.map((offer) => ({
                    id: offer.id,
                    title: offer.title,
                    priceDisplay: offer.priceDisplay,
                    subscribersCount: offer.subscribersCount || 0,
                  }))}
                  onBackToDashboard={handleConnectedAppBack}
                />
              ) : (
                <div className="max-w-3xl mx-auto w-full space-y-4">
                  <div className="rounded-2xl border border-[#5865F2]/30 bg-[#11151b] p-5">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <DiscordIcon className="size-5" /> Vos accès Discord
                    </h2>
                    <p className="mt-1 text-xs text-zinc-400">
                      Seuls les serveurs inclus dans vos offres sont visibles ici.
                    </p>
                  </div>
                  {authorizedDiscordChannels.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-[#111318] p-6 text-center text-xs text-zinc-400">
                      Aucun serveur Discord n’est débloqué avec votre offre actuelle.
                    </div>
                  ) : (
                    authorizedDiscordChannels.map((channel) => (
                      <div
                        key={channel.id}
                        className="rounded-2xl border border-white/10 bg-[#111318] p-4 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-bold text-white">{channel.name}</div>
                          <div className="text-[11px] text-zinc-400">
                            {channel.description || "Serveur Discord privé"}
                          </div>
                        </div>
                        {channel.inviteLink ? (
                          <a
                            href={channel.inviteLink}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg bg-[#5865F2] px-3 py-2 text-xs font-bold text-white"
                          >
                            Ouvrir
                          </a>
                        ) : (
                          <span className="text-[11px] text-zinc-500">Lien indisponible</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Creator-only publication composer */}
      {canManageCompany && companyTab === "accueil" && (
        <>
          <button
            type="button"
            onClick={() => setIsPostComposerOpen(true)}
            aria-label="Créer une publication"
            title="Créer une publication"
            className="absolute bottom-6 right-6 z-30 flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-950/50 transition-all hover:scale-105 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-[#08090b] cursor-pointer"
          >
            <PenLine className="size-6" />
          </button>

          {isPostComposerOpen && (
            <CompanyPostComposer
              companyId={companyId}
              companyName={currentSub.companyName}
              avatarInitials={user.avatarInitials || currentSub.companyInitials || "JO"}
              onClose={() => setIsPostComposerOpen(false)}
              onPublish={handlePublishPost}
            />
          )}
        </>
      )}

      {selectedProductDetailOffer &&
        (() => {
          const offer = selectedProductDetailOffer;
          const plans =
            offer.pricingOptions && offer.pricingOptions.length > 0
              ? offer.pricingOptions
              : [
                  {
                    id: "default",
                    name: offer.priceDisplay,
                    price: offer.priceAmount,
                    billing: offer.billingCycle,
                  },
                ];
          const selectedPlan = plans.find((plan) => plan.id === selectedProductPlanId) || plans[0];
          const faqs =
            offer.faqs && offer.faqs.length > 0
              ? offer.faqs
              : [
                  {
                    q: "Comment puis-je accéder à mon contenu après l'achat ?",
                    a: "Dès la confirmation du paiement, votre accès est activé immédiatement.",
                  },
                  {
                    q: "Quand mon accès est-il disponible ?",
                    a: "La livraison et l'accès sont automatiques après validation du paiement.",
                  },
                ];
          return (
            <div className="fixed inset-0 z-40 overflow-y-auto bg-black/85 p-2 backdrop-blur-md sm:p-4">
              <div className="mx-auto my-2 w-full max-w-5xl rounded-3xl border border-white/15 bg-[#0e1015] text-white shadow-2xl sm:my-6">
                <div className="flex items-center justify-between border-b border-white/10 bg-[#14161d] px-4 py-3.5 sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="size-9 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                      {offer.companyLogo ? (
                        <img
                          src={offer.companyLogo}
                          alt=""
                          className="size-full object-cover mansa-avatar-image"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-xs font-bold">
                          {(offer.companyName || "MP").slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-zinc-300">
                        {offer.companyName}
                      </p>
                      <h2 className="truncate text-sm font-bold text-white">{offer.title}</h2>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!isCompanyOwner && (
                      <button
                        type="button"
                        onClick={() => void handleCopyAffiliateLink(offer)}
                        disabled={isCreatingAffiliateLink}
                        aria-label={affiliateLinkButtonLabel}
                        title={affiliateLinkButtonLabel}
                        className={`flex size-8 items-center justify-center rounded-full border transition-colors ${
                          isAffiliateLinkCopied
                            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                            : affiliateLinkError
                              ? "border-rose-400/40 bg-rose-500/10 text-rose-300"
                              : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                        } disabled:cursor-wait disabled:opacity-60`}
                      >
                        <Share2 className="size-4" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedProductDetailOffer(null)}
                      aria-label="Fermer la fiche produit"
                      className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                    >
                      <X className="size-4" />
                    </button>
                    <span
                      className="sr-only"
                      role={affiliateLinkError ? "alert" : "status"}
                      aria-live={affiliateLinkError ? "assertive" : "polite"}
                    >
                      {affiliateLinkError ||
                        (isCreatingAffiliateLink
                          ? "Création du lien d’affiliation en cours."
                          : isAffiliateLinkCopied
                            ? "Lien d’affiliation copié dans le presse-papiers."
                            : "")}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 p-4 sm:p-8 lg:grid-cols-12 lg:gap-8">
                  <div className="order-2 space-y-6 lg:order-none lg:col-span-7">
                    <div className="relative hidden overflow-hidden rounded-2xl border border-white/10 bg-[#151720] sm:block">
                      <div className="relative h-56 w-full sm:h-72">
                        {offer.imageUrl ? (
                          <img
                            src={offer.imageUrl}
                            alt={offer.title}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-sm text-zinc-500">
                            Ajouter une image
                          </div>
                        )}
                        <div className="absolute left-3 top-3 rounded-lg border border-white/10 bg-black/70 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                          Accès instantané 24/7
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                        À propos de cette offre
                      </h3>
                      <div className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-[#14161f] p-5 text-xs leading-relaxed text-zinc-300">
                        {offer.description || "Description détaillée de l'offre."}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                        Questions fréquemment posées
                      </h3>
                      <div className="space-y-2">
                        {faqs.map((faq, index) => {
                          const expanded = expandedProductFaqIndex === index;
                          return (
                            <div
                              key={index}
                              className="space-y-2 rounded-2xl border border-white/10 bg-[#14161f] p-4"
                            >
                              <button
                                type="button"
                                onClick={() => setExpandedProductFaqIndex(expanded ? null : index)}
                                className="flex w-full items-center justify-between text-left text-xs font-bold text-white"
                              >
                                <span>{faq.q}</span>
                                <span className="text-emerald-400">{expanded ? "−" : "+"}</span>
                              </button>
                              {expanded && (
                                <p className="border-t border-white/5 pt-2 text-xs leading-relaxed text-zinc-400">
                                  {faq.a}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="order-1 space-y-5 lg:order-none lg:col-span-5">
                    <div className="space-y-5 rounded-3xl border border-white/15 bg-[#14161f] p-4 shadow-2xl sm:p-6">
                      <div className="relative aspect-[16/7] overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e12]">
                        {offer.bannerUrl || offer.imageUrl ? (
                          <img
                            src={offer.bannerUrl || offer.imageUrl}
                            alt={offer.title}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-xs text-zinc-500">
                            Ajouter une image de rappel produit
                          </div>
                        )}
                      </div>
                      <h2 className="text-base font-bold leading-snug text-white">{offer.title}</h2>
                      <div className="space-y-1 border-b border-white/10 pb-3">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                          {offer.pricingType === "free" ? "Accès Libre" : "Tarif Officiel"}
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-3xl font-black text-white">
                            {offer.pricingType === "free"
                              ? "Gratuit"
                              : `${selectedPlan.price} ${getCurrencySymbol(offer.currency)}`}
                          </span>
                          {offer.pricingType === "paid" && (
                            <span className="font-mono text-xs text-zinc-400">
                              /{" "}
                              {selectedPlan.billing === "yearly"
                                ? "an"
                                : selectedPlan.billing === "one_time"
                                  ? "paiement unique"
                                  : "mois"}
                            </span>
                          )}
                        </div>
                      </div>
                      {offer.pricingType === "paid" &&
                        !(TEMPORARY_FREE_ACCESS_ENABLED && !canManageCompany) && (
                          <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-zinc-300">
                              Choisissez votre formule :
                            </label>
                            {plans.map((plan) => (
                              <button
                                type="button"
                                key={plan.id}
                                onClick={() => setSelectedProductPlanId(plan.id)}
                                className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left text-xs font-semibold ${selectedProductPlanId === plan.id ? "border-emerald-400 bg-emerald-500/10 text-white" : "border-white/10 bg-[#1b1e2a] text-zinc-300"}`}
                              >
                                <span>{plan.name}</span>
                                <span className="font-mono font-bold text-white">
                                  {plan.price} {getCurrencySymbol(offer.currency)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      {TEMPORARY_FREE_ACCESS_ENABLED && !canManageCompany && (
                        <div
                          role="status"
                          className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100"
                        >
                          Accès gratuit temporaire activé — aucun paiement requis.
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutModalOffer(
                            prepareTemporaryFreeCheckoutOffer(offer, canManageCompany),
                          );
                          setSelectedProductDetailOffer(null);
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0066FF] py-4 text-base font-black text-white shadow-xl hover:bg-[#0055EE]"
                      >
                        <span>
                          {TEMPORARY_FREE_ACCESS_ENABLED && !canManageCompany
                            ? "Accéder gratuitement"
                            : offer.ctaText || "Rejoindre maintenant"}
                        </span>
                        <ArrowRight className="size-4" />
                      </button>
                      {!(TEMPORARY_FREE_ACCESS_ENABLED && !canManageCompany) && (
                        <div className="space-y-2 border-t border-white/5 pt-2 text-xs text-zinc-300">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="size-4 shrink-0 text-emerald-400" />
                            <span>Paiement sécurisé par carte & Mobile Money</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Zap className="size-4 shrink-0 text-emerald-400" />
                            <span>Livraison automatique et accès immédiat</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Lock className="size-4 shrink-0 text-emerald-400" />
                            <span>Annulation en 1-clic sans engagement</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Checkout Modal after the product CTA */}
      {checkoutModalOffer && (
        <OfferCheckoutModal
          isOpen={!!checkoutModalOffer}
          offer={checkoutModalOffer}
          onClose={() => setCheckoutModalOffer(null)}
          isCompanyOwner={isCompanyOwner}
          isAlreadyPurchased={
            !isCompanyOwner &&
            (unlockedProductIds.includes(checkoutModalOffer.id) ||
              (currentSub?.purchasedOfferIds || []).includes(checkoutModalOffer.id) ||
              (currentSub?.unlockedProductIds || []).includes(checkoutModalOffer.id) ||
              currentSub?.productId === checkoutModalOffer.id)
          }
          onAccessContent={(off) => {
            const isOfferTg =
              off.includedApps?.includes("Telegram") ||
              (off.telegramChannels && off.telegramChannels.length > 0);
            const isOfferDc =
              off.includedApps?.includes("Discord") ||
              (off.discordChannels && off.discordChannels.length > 0);
            const isOfferEb =
              off.type === "ebook" ||
              (off.ebooks && off.ebooks.length > 0) ||
              Boolean((off as any).digitalFiles?.length);
            const isOfferCo =
              off.type === "course" ||
              (off.courses && off.courses.length > 0) ||
              Boolean((off as any).courseModules?.length);

            if (isOfferTg) {
              setActiveTab("telegram");
              setTelegramFlowStep("channels_list");
            } else if (isOfferDc) {
              setActiveTab("discord");
              setDiscordFlowStep("channels_list");
            } else if (isOfferEb) {
              openResourceModal("files");
            } else if (isOfferCo) {
              openResourceModal("courses");
            } else {
              setActiveTab("accueil");
            }
          }}
          onPaymentSuccess={(newSub) => {
            // Update includedApps and unlockedProductIds for current enterprise
            const updatedApps = Array.from(
              new Set([...currentIncludedApps, ...(newSub.includedApps || [])]),
            );
            const newOfferIds = [
              ...(newSub.unlockedProductIds || []),
              ...(newSub.purchasedOfferIds || []),
              ...(newSub.productId &&
              !isGenericFreeMembershipProductId(newSub.productId, newSub.companyId)
                ? [newSub.productId]
                : []),
            ];
            const updatedUnlockedIds = Array.from(new Set([...unlockedProductIds, ...newOfferIds]));
            setCurrentIncludedApps(updatedApps);
            setUnlockedProductIds(updatedUnlockedIds);
            setSelectedMemberProductId(checkoutModalOffer.id);
            const hasPaidMembership = Boolean(currentSub.hasPaidOffer || newSub.hasPaidOffer);
            setHasPaidOffer(hasPaidMembership);
            const userKey = user?.uid || user?.email || "default";
            const updatedSubscription: EnterpriseSubscription = {
              ...currentSub,
              hasPaidOffer: hasPaidMembership,
              hasJoined: true,
              isCommunityPreview: false,
              includedApps: updatedApps,
              unlockedProductIds: updatedUnlockedIds,
              purchasedOfferIds: updatedUnlockedIds,
              productName:
                currentSub.hasPaidOffer && currentSub.productName !== newSub.productName
                  ? `${currentSub.productName} + ${newSub.productName}`
                  : newSub.productName,
              priceDisplay: newSub.priceDisplay || currentSub.priceDisplay,
              telegramChannels:
                newSub.telegramChannels && newSub.telegramChannels.length > 0
                  ? newSub.telegramChannels
                  : currentSub.telegramChannels,
              discordChannels:
                newSub.discordChannels && newSub.discordChannels.length > 0
                  ? newSub.discordChannels
                  : currentSub.discordChannels,
              discordInvite: newSub.discordInvite || currentSub.discordInvite,
            };
            saveSubscription(userKey, updatedSubscription);
            setCurrentSub(updatedSubscription);
            setCheckoutModalOffer(null);
          }}
          user={user}
        />
      )}

      {/* Enterprise Branding Configuration Modal - Restreint exclusivement au créateur propriétaire */}
      {canManageCompany && (
        <EnterpriseBrandingModal
          isOpen={isBrandingModalOpen}
          onClose={() => setIsBrandingModalOpen(false)}
          company={{
            id: currentSub.companyId,
            name: currentSub.companyName,
            description: currentSub.productName,
            companyBanner: currentSub.companyBanner,
            companyLogo: currentSub.companyLogo,
            socialLinks: currentSub.socialLinks,
          }}
          ownerUid={user.uid}
          onSave={handleSaveBranding}
          lang={lang}
        />
      )}

      {/* Mini-page / Modal Dédiée : Gérer l'Adhésion */}
      <ManageMembershipModal
        isOpen={isManageMembershipModalOpen}
        onClose={() => setIsManageMembershipModalOpen(false)}
        subscription={currentSub}
        onCancelSubscription={handleCancelActiveSubscription}
        onLeaveCompany={handleLeaveEnterprise}
        onViewOffers={() => {
          setIsManageMembershipModalOpen(false);
          setCompanyTab("produits");
        }}
        lang={lang}
      />

      {/* Interface de signalement d'une entreprise */}
      <ReportEnterpriseModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        companyName={currentSub.companyName || subscription.companyName}
      />

      {/* Toast de confirmation pour les liens copiés */}
      {(copiedLinkToast || isAffiliateLinkCopied) && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none"
        >
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-zinc-900 border border-emerald-500/30 text-white shadow-2xl shadow-black/80">
            <span className="text-base">✅</span>
            <span className="text-sm font-semibold">
              {isAffiliateLinkCopied
                ? "Lien d’affiliation copié dans le presse-papiers"
                : "Lien copié"}
            </span>
          </div>
        </div>
      )}

      {/* Notification Toasts pour Téléchargement E-book & Accès Formation */}
      {ebookDownloadToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-zinc-900 border border-emerald-500/40 text-emerald-300 shadow-2xl shadow-black/80">
            <BookOpen className="size-4 text-emerald-400" />
            <span className="text-sm font-semibold">{ebookDownloadToast}</span>
          </div>
        </div>
      )}

      {isEbookModalOpen && (
        <ClientFilesView
          companyName={currentSub.companyName}
          loading={memberPurchasedOffersLoading}
          files={authorizedEbooks as any}
          lockedFiles={otherCompanyEbooks as any}
          onBack={handleResourceBack}
          onDownload={handleDownloadEbook}
          onUnlockFile={(requiredOffer) => {
            setActiveTab("accueil");
            setCompanyTab("produits");
            setCheckoutModalOffer(requiredOffer);
          }}
        />
      )}
      {isCourseModalOpen && (
        <ClientCoursesView
          companyName={currentSub.companyName}
          loading={memberPurchasedOffersLoading}
          courses={authorizedCourses as any}
          lockedCourses={otherCompanyCourses as any}
          onBack={handleResourceBack}
          onOpenCourse={handleAccessCourse}
          onUnlockCourse={(requiredOffer) => {
            setActiveTab("accueil");
            setCompanyTab("produits");
            setCheckoutModalOffer(requiredOffer);
          }}
        />
      )}
      {selectedCourse && (
        <CourseReaderModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onDownloadAttachment={handleDownloadCourseAttachment}
        />
      )}
    </div>
  );
};
