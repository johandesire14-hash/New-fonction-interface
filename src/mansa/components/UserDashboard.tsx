import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search,
  Compass,
  Sparkles,
  Bell,
  Home,
  Building2,
  Handshake,
  Share2,
  LayoutGrid,
  Settings,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus,
  User,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  DollarSign,
  Zap,
  LogOut,
  X,
  Check,
  PanelLeftClose,
  Sliders,
  Send,
  Video,
  ExternalLink,
  Copy,
  Package,
  Tag,
  Eye,
  MoreVertical,
  Layers,
  Globe,
  Users as UsersIcon,
  Megaphone,
  Briefcase,
  Code,
  Download,
  Upload,
  GraduationCap,
  FileText,
  HelpCircle,
  Link,
  CheckCircle2,
  Bot,
  BookOpen,
  RefreshCw,
  Trash2,
  ShoppingBag,
  Heart,
  Menu,
  AlertTriangle,
  Headphones,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { safeStorage } from "../utils/storage";
import { getUserFacingErrorMessage } from "../utils/userFacingError";
import { supabase } from "../services/supabase";
import { deleteOfferFile, uploadOfferFile } from "../services/supabaseStorageService";
import {
  deleteCreatorCourseFromOffer,
  saveCreatorCourseToOffer,
} from "../services/supabaseOfferService";
import {
  ProductCreationStudio,
  CreatedProductData,
  ProductTypeCategory,
} from "./ProductCreationStudio";
import { AfhubLogo } from "./AfhubLogo";
import { ConfirmActionModal } from "./common/ConfirmActionModal";
import {
  Skeleton,
  DashboardMetricsSkeleton,
  DashboardProductsSkeleton,
  DashboardPulseSkeleton,
  DashboardChartSkeleton,
} from "./common/Skeleton";
const PaymentsView = React.lazy(() =>
  import("./dashboard/PaymentsView").then((m) => ({ default: m.PaymentsView })),
);
const CustomersView = React.lazy(() =>
  import("./dashboard/CustomersView").then((m) => ({ default: m.CustomersView })),
);
const WebsitesView = React.lazy(() =>
  import("./dashboard/WebsitesView").then((m) => ({ default: m.WebsitesView })),
);
const AffiliatesView = React.lazy(() =>
  import("./dashboard/AffiliatesView").then((m) => ({ default: m.AffiliatesView })),
);
const DiscoverCreatorsView = React.lazy(() =>
  import("./dashboard/DiscoverCreatorsView").then((m) => ({ default: m.DiscoverCreatorsView })),
);
const AssistanceView = React.lazy(() =>
  import("./dashboard/AssistanceView").then((m) => ({ default: m.AssistanceView })),
);
import { ProductTelegramLinkModal } from "./dashboard/ProductTelegramLinkModal";
const SettingsView = React.lazy(() =>
  import("./dashboard/SettingsView").then((m) => ({ default: m.SettingsView })),
);
const WorkforceView = React.lazy(() =>
  import("./dashboard/WorkforceView").then((m) => ({ default: m.WorkforceView })),
);
const PartnersView = React.lazy(() =>
  import("./dashboard/PartnersView").then((m) => ({ default: m.PartnersView })),
);
import { AccountSettingsModal } from "./common/AccountSettingsModal";
import { UserProfileView } from "./common/UserProfileView";
import { AnimatedNumber } from "./common/AnimatedNumber";
import { TelegramIcon, DiscordIcon } from "./dashboard/ConnectedAppsView";
const ConnectedAppsView = React.lazy(() =>
  import("./dashboard/ConnectedAppsView").then((m) => ({ default: m.ConnectedAppsView })),
);
const FilesWorkspace = React.lazy(() =>
  import("./dashboard/FilesWorkspace").then((m) => ({ default: m.FilesWorkspace })),
);
const RevenueAnalyticsChart = React.lazy(() =>
  import("./dashboard/RevenueAnalyticsChart").then((m) => ({ default: m.RevenueAnalyticsChart })),
);
import {
  CurrencyCode,
  SUPPORTED_CURRENCIES,
  formatCurrency,
  convertFromUSD,
  convertBetweenCurrencies,
  getStoredCurrency,
  setStoredCurrency,
} from "../utils/currency";
import { CurrencySelector } from "./dashboard/CurrencySelector";
import { BusinessProject, Company, EnterpriseSubscription } from "../types";
import { CompanyOnboardingModal } from "./CompanyOnboardingModal";
import { getSavedCompanies, loadCreatorCompanies, saveCompany } from "../utils/companyStorage";
import { filterByCompanyId, filterPersonalTransactions } from "../utils/companyScope";
import {
  fetchPrivateConversations,
  markPrivateConversationAsRead,
  sendPrivateMessage,
} from "../services/supabasePrivateMessagingService";
const EnterpriseMemberView = React.lazy(() =>
  import("./dashboard/EnterpriseMemberView").then((m) => ({ default: m.EnterpriseMemberView })),
);
import { ContextualLocationPrompt } from "./common/ContextualLocationPrompt";
import { getSavedSubscriptions, saveSubscriptions } from "../utils/subscriptionsStorage";
import { fetchMemberAccessFromSupabase } from "../services/supabaseMemberAccessService";
import {
  subscribeToCreatorProducts,
  saveProductToFirestore,
  deleteProductFromFirestore,
  saveProductPrivateContent,
  subscribeToCreatorTransactions,
  subscribeToCreatorCustomers,
  createRealTransaction,
  loadVerifiedMemberContent,
  FirestoreTransaction,
  FirestoreCustomer,
} from "../services/dbService";
import { isCreatorPayoutConfigured } from "../utils/payoutConfig";
import { getUserNotifications, UserNotification } from "../utils/userNotifications";
import type { CreatorEnterpriseCard } from "./dashboard/DiscoverCreatorsView";

interface UserDashboardProps {
  user: {
    uid?: string;
    name: string;
    email: string;
    avatarInitials: string;
  };
  onLogout: () => void;
  onOpenProductStudio?: () => void;
  onOpenAiBuilder?: (prompt?: string, category?: string) => void;
  lang: "fr" | "en";
}

interface CreatorAppsErrorBoundaryProps {
  children: React.ReactNode;
  onRetry: () => void;
  onBack: () => void;
}

class CreatorAppsErrorBoundary extends React.Component<
  CreatorAppsErrorBoundaryProps,
  { error: Error | null }
> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    if (this.state.error) {
      return (
        <div
          className="mx-auto max-w-3xl rounded-2xl border border-red-500/20 bg-red-500/5 p-6"
          role="alert"
        >
          <h2 className="text-base font-bold text-white">Cette application n’a pas pu s’ouvrir.</h2>
          <p className="mt-2 text-sm text-zinc-300">
            Réessayez le chargement ou revenez au catalogue Apps Store.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.props.onRetry}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={this.props.onBack}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300"
            >
              Retour aux applications
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface PulseEvent {
  id: string;
  type: "ad_spend" | "sale";
  amount: string;
  categoryName?: string;
  location: string;
  countryFlag: string;
  source: string;
  timeAgo: string;
}

const getCountryFlagFromLocation = (location: string): string => {
  if (location.includes("Côte d'Ivoire") || location.includes("Abidjan") || location.includes("CI"))
    return "🇨🇮";
  if (location.includes("Sénégal") || location.includes("Dakar") || location.includes("SN"))
    return "🇸🇳";
  if (
    location.includes("Nigéria") ||
    location.includes("Lagos") ||
    location.includes("NG") ||
    location.includes("Nigeria")
  )
    return "🇳🇬";
  if (
    location.includes("Cameroun") ||
    location.includes("Douala") ||
    location.includes("Yaoundé") ||
    location.includes("CM")
  )
    return "🇨🇲";
  if (location.includes("Ghana") || location.includes("Accra") || location.includes("GH"))
    return "🇬🇭";
  if (location.includes("Kenya") || location.includes("Nairobi") || location.includes("KE"))
    return "🇰🇪";
  if (location.includes("Bénin") || location.includes("Cotonou") || location.includes("BJ"))
    return "🇧🇯";
  if (location.includes("Togo") || location.includes("Lomé") || location.includes("TG"))
    return "🇹🇬";
  if (location.includes("Mali") || location.includes("Bamako") || location.includes("ML"))
    return "🇲🇱";
  if (location.includes("RDC") || location.includes("Kinshasa") || location.includes("CD"))
    return "🇨🇩";
  if (location.includes("Maroc") || location.includes("Casablanca") || location.includes("MA"))
    return "🇲🇦";
  if (
    location.includes("Afrique du Sud") ||
    location.includes("Johannesburg") ||
    location.includes("ZA")
  )
    return "🇿🇦";
  if (location.includes("France") || location.includes("Paris") || location.includes("FR"))
    return "🇫🇷";
  if (location.includes("Canada") || location.includes("Montréal") || location.includes("CA"))
    return "🇨🇦";
  return "🌍";
};

export const CreatorCoursesWorkspace: React.FC<{
  creatorId: string;
  companyId: string;
  productIds: string[];
  products: CreatedProductData[];
  onBack: () => void;
}> = ({ creatorId, companyId, productIds, products, onBack }) => {
  type CourseChapter = {
    id: string;
    title: string;
    content: string;
    youtubeUrl?: string;
    videoStorageKey?: string;
    videoFileName?: string;
  };
  type CreatorCourse = {
    id: string;
    title: string;
    description: string;
    chapters: CourseChapter[];
  };
  const [courses, setCourses] = useState<CreatorCourse[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const loadCourses = async () => {
      setIsLoadingCourses(true);
      try {
        const { data, error } = await supabase
          .from("offer_courses")
          .select("*, course_modules(*)")
          .in("offer_id", productIds);
        if (error) throw error;
        const byId = new Map<string, CreatorCourse>();
        (data || []).forEach((row: any) => {
          const course = byId.get(row.id) || {
            id: row.id,
            title: row.title || "Cours sans titre",
            description: row.description || "",
            chapters: [],
          };
          course.chapters = (row.course_modules || [])
            .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
            .map((module: any) => ({
              id: module.id,
              title: module.title || "Chapitre",
              content: module.content || "",
              ...(module.video_url?.startsWith("http")
                ? { youtubeUrl: module.video_url }
                : module.video_url
                  ? { videoStorageKey: module.video_url }
                  : {}),
            }));
          byId.set(row.id, course);
        });
        if (!cancelled) setCourses(Array.from(byId.values()));
      } catch (error) {
        if (!cancelled)
          setSaveError(getUserFacingErrorMessage(error, "Impossible de charger les cours."));
      } finally {
        if (!cancelled) setIsLoadingCourses(false);
      }
    };
    void loadCourses();
    return () => {
      cancelled = true;
    };
  }, [productIds]);
  const [editing, setEditing] = useState(false);
  const [courseCreationStep, setCourseCreationStep] = useState<"details" | "chapters">("details");
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [chapters, setChapters] = useState<CourseChapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [selectedVideoFiles, setSelectedVideoFiles] = useState<Record<string, File>>({});
  const [isSaving, setIsSaving] = useState(false);
  const linkedProducts = products.filter((product) => productIds.includes(product.id));
  const activeChapter = chapters.find((chapter) => chapter.id === activeChapterId) || null;
  const activeVideoFile = activeChapter ? selectedVideoFiles[activeChapter.id] : undefined;
  const newChapter = (index: number): CourseChapter => ({
    id: `chapter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: `Chapitre ${index + 1}`,
    content: "",
  });
  const startNewCourse = () => {
    const firstChapter = newChapter(0);
    setEditingCourseId(null);
    setTitle("");
    setDescription("");
    setChapters([firstChapter]);
    setActiveChapterId(firstChapter.id);
    setSelectedVideoFiles({});
    setSaveError(null);
    setCourseCreationStep("details");
    setEditing(true);
  };
  const editCourse = (course: CreatorCourse) => {
    const courseChapters = course.chapters.length ? course.chapters : [newChapter(0)];
    setEditingCourseId(course.id);
    setTitle(course.title || "");
    setDescription(course.description || "");
    setChapters(courseChapters.map((chapter) => ({ ...chapter })));
    setActiveChapterId(courseChapters[0]?.id || null);
    setSelectedVideoFiles({});
    setSaveError(null);
    setCourseCreationStep("details");
    setEditing(true);
  };
  const updateChapter = (chapterId: string, updates: Partial<CourseChapter>) => {
    setChapters((current) =>
      current.map((chapter) => (chapter.id === chapterId ? { ...chapter, ...updates } : chapter)),
    );
  };
  const saveCourse = async () => {
    if (!title.trim() || isSaving) return;
    if (productIds.length === 0) {
      setSaveError("Sélectionnez au moins une offre avant d’enregistrer le cours.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    const courseId = editingCourseId || `course-${Date.now()}`;
    try {
      if (productIds.length === 0)
        throw new Error("Sélectionnez au moins une offre pour publier le cours.");
      const savedByOffer = await Promise.all(
        productIds.map(async (offerId) => {
          const savedChapters = await Promise.all(
            chapters.map(async (chapter) => {
              const file = selectedVideoFiles[chapter.id];
              if (!file) return chapter;
              const stored = await uploadOfferFile(
                creatorId,
                offerId,
                file,
                `${courseId}-${chapter.id}-${file.name}`,
              );
              const uploadedChapter = {
                ...chapter,
                videoStorageKey: stored.storagePath,
                videoFileName: file.name,
              };
              delete uploadedChapter.youtubeUrl;
              return uploadedChapter;
            }),
          );
          const rowId = await saveCreatorCourseToOffer({
            offerId,
            title: title.trim(),
            description: description.trim(),
            courseRowId: editingCourseId || undefined,
            modules: savedChapters.map((chapter) => ({
              title: chapter.title,
              content: chapter.content,
              ...(chapter.youtubeUrl ? { videoUrl: chapter.youtubeUrl } : {}),
              ...(chapter.videoStorageKey ? { videoStorageKey: chapter.videoStorageKey } : {}),
            })),
          });
          return { rowId, savedChapters };
        }),
      );
      const course: CreatorCourse = {
        id: savedByOffer[0]?.rowId || courseId,
        title: title.trim(),
        description: description.trim(),
        chapters: savedByOffer[0]?.savedChapters || chapters,
      };
      setCourses((current) =>
        editingCourseId
          ? current.map((existing) => (existing.id === editingCourseId ? course : existing))
          : [...current, course],
      );
      setEditing(false);
      setEditingCourseId(null);
      setSelectedVideoFiles({});
    } catch (error) {
      console.error("Creator course save failed:", error);
      setSaveError("Impossible d’enregistrer le cours pour le moment. Réessayez.");
    } finally {
      setIsSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="min-h-full space-y-5 rounded-2xl border border-white/10 bg-[#0c0d0e] p-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">
              Cours & Formations
            </div>
            <h1 className="mt-1 text-xl font-bold text-white">
              {editingCourseId ? "Modifier le cours" : "Créer un cours"}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setSelectedVideoFiles({});
            }}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300"
          >
            ← Retour aux cours
          </button>
        </div>
        {courseCreationStep === "details" ? (
          <section className="mx-auto w-full max-w-3xl space-y-5 rounded-xl border border-white/10 bg-[#121316] p-5">
            <div>
              <h2 className="text-sm font-bold text-white">Informations du cours</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Commencez par nommer votre cours et présenter son contenu.
              </p>
            </div>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-zinc-300">Nom du cours</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex. Formation Trading débutant"
                className="w-full rounded-xl border border-white/10 bg-[#161822] px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-zinc-300">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Présentez le contenu et les objectifs du cours"
                className="w-full resize-none rounded-xl border border-white/10 bg-[#161822] px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
              />
            </label>
            <div className="flex justify-end border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setCourseCreationStep("chapters")}
                disabled={!title.trim() || isSaving}
                className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Valider et continuer
              </button>
            </div>
          </section>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <aside className="rounded-xl border border-white/10 bg-[#121316] p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Chapitres ({chapters.length})
              </div>
              <div className="mt-3 space-y-2">
                {chapters.map((chapter, index) => (
                  <div
                    key={chapter.id}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2 ${activeChapterId === chapter.id ? "bg-blue-500/10" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveChapterId(chapter.id)}
                      className="min-w-0 flex-1 px-1 py-1 text-left text-sm font-semibold text-white"
                    >
                      <span className="block text-[10px] text-zinc-500">Chapitre {index + 1}</span>
                      <span className="block truncate">
                        {chapter.title || `Chapitre ${index + 1}`}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Supprimer ${chapter.title || `le chapitre ${index + 1}`}`}
                      title="Supprimer ce chapitre"
                      onClick={() => {
                        const remaining = chapters.filter((item) => item.id !== chapter.id);
                        setChapters(remaining);
                        setSelectedVideoFiles((files) => {
                          const nextFiles = { ...files };
                          delete nextFiles[chapter.id];
                          return nextFiles;
                        });
                        if (activeChapterId === chapter.id) {
                          setActiveChapterId(remaining[0]?.id || null);
                        }
                      }}
                      className="rounded-md p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const chapter = newChapter(chapters.length);
                  setChapters((current) => [...current, chapter]);
                  setActiveChapterId(chapter.id);
                }}
                className="mt-3 w-full rounded-lg border border-dashed border-white/20 px-3 py-3 text-xs text-zinc-400 hover:border-blue-500/50 hover:text-white"
              >
                + Ajouter un nouveau chapitre
              </button>
            </aside>
            <main className="space-y-4">
              <h2 className="text-sm font-bold text-white">Chapitres et contenu</h2>
              {activeChapter ? (
                <section className="space-y-4 rounded-xl border border-white/10 bg-[#121316] p-4">
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold text-zinc-300">Titre du chapitre</span>
                    <input
                      value={activeChapter.title}
                      onChange={(event) =>
                        updateChapter(activeChapter.id, { title: event.target.value })
                      }
                      placeholder="Titre du chapitre"
                      className="w-full rounded-xl border border-white/10 bg-[#161822] px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold text-zinc-300">Texte du chapitre</span>
                    <textarea
                      value={activeChapter.content}
                      onChange={(event) =>
                        updateChapter(activeChapter.id, { content: event.target.value })
                      }
                      rows={7}
                      placeholder="Rédigez le contenu de ce chapitre"
                      className="w-full resize-y rounded-xl border border-white/10 bg-[#161822] px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold text-zinc-300">
                      URL YouTube (facultatif)
                    </span>
                    <input
                      type="url"
                      value={activeChapter.youtubeUrl || ""}
                      onChange={(event) =>
                        updateChapter(activeChapter.id, { youtubeUrl: event.target.value })
                      }
                      placeholder="https://www.youtube.com/watch?v=…"
                      className="w-full rounded-xl border border-white/10 bg-[#161822] px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
                    />
                  </label>
                  <div className="space-y-2">
                    <label
                      className="block text-xs font-semibold text-zinc-300"
                      htmlFor={`video-${activeChapter.id}`}
                    >
                      Ou téléverser une vidéo
                    </label>
                    <input
                      id={`video-${activeChapter.id}`}
                      type="file"
                      accept="video/*"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (file) {
                          setSelectedVideoFiles((current) => ({
                            ...current,
                            [activeChapter.id]: file,
                          }));
                          setSaveError(null);
                        }
                      }}
                      className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                    />
                    {activeVideoFile ? (
                      <p className="text-xs text-blue-200">
                        Fichier sélectionné : {activeVideoFile.name} — enregistré lors de la
                        sauvegarde.
                      </p>
                    ) : activeChapter.videoStorageKey ? (
                      <p className="text-xs text-emerald-300">
                        Vidéo enregistrée sur cet appareil :{" "}
                        {activeChapter.videoFileName || "fichier vidéo"}
                      </p>
                    ) : null}
                  </div>
                </section>
              ) : (
                <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-zinc-400">
                  Aucun chapitre. Ajoutez-en un pour saisir son contenu.
                </p>
              )}
              {saveError && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
                >
                  {saveError}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setCourseCreationStep("details")}
                  disabled={isSaving}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-40"
                >
                  ← Retour aux informations du cours
                </button>
                <button
                  type="button"
                  onClick={saveCourse}
                  disabled={!title.trim() || isSaving}
                  className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40"
                >
                  {isSaving ? "Enregistrement…" : "Enregistrer le cours"}
                </button>
              </div>
            </main>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">
            {linkedProducts.length
              ? `Lié à ${linkedProducts.map((product) => product.title || product.name).join(", ")}`
              : "Application Cours & Formations"}
          </div>
          <h1 className="mt-1 text-2xl font-bold text-white">Cours & Formations</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Créez et organisez les cours liés à vos offres.
          </p>
        </div>
        <button
          onClick={onBack}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300"
        >
          Retour aux applications
        </button>
      </div>
      {isLoadingCourses ? (
        <p className="text-sm text-zinc-400">Chargement des cours…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={startNewCourse}
            className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-[#0c0d0e] text-zinc-400 hover:border-purple-500/60 hover:text-white"
          >
            <span className="mb-3 flex size-12 items-center justify-center rounded-full border border-white/15 text-3xl">
              +
            </span>
            <span className="text-sm font-semibold">Ajouter un cours</span>
          </button>
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => editCourse(course)}
              className="min-h-44 rounded-xl border border-white/10 bg-[#121316] p-4 text-left hover:border-purple-500/50"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/15 text-purple-300">
                <GraduationCap className="size-5" />
              </div>
              <div className="mt-5 text-sm font-bold text-white">{course.title}</div>
              <div className="mt-1 text-xs text-zinc-500">{course.chapters.length} chapitre(s)</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  onLogout,
  onOpenAiBuilder,
  lang,
}) => {
  const [activeNav, setActiveNav] = useState<
    | "accueil"
    | "analytique"
    | "communaute"
    | "produits"
    | "paiements"
    | "clients"
    | "assistance"
    | "applications"
    | "telegram_app"
    | "discord_app"
    | "affilies"
    | "messages"
    | "decouvrir"
    | "parametres"
    | "parametres_compte"
    | "parametres_boutique"
    | "parametres_entreprise"
    | "workforce"
    | "main_doeuvre"
    | "equipe"
    | "partenaires"
    | "partners"
  >("accueil");

  const [selectedCommunitySubId, setSelectedCommunitySubId] = useState<string | null>(null);
  const [previewCommunitySubId, setPreviewCommunitySubId] = useState<string | null>(null);

  const { profile, deleteAccount, loading: authLoading } = useAuth();

  // State for AI Projects / Businesses backed by real Firestore database
  const [projects, setProjects] = useState<BusinessProject[]>([]);
  const [productsList, setProductsList] = useState<CreatedProductData[]>([]);
  const [realTransactions, setRealTransactions] = useState<FirestoreTransaction[]>([]);
  const [balance, setBalance] = useState<number>(0.0);
  const [pulseEvents, setPulseEvents] = useState<PulseEvent[]>([]);
  const [pulseFeedOffset, setPulseFeedOffset] = useState(0);
  const previousPulseIdsRef = useRef<string[]>([]);
  const [isLoadingFirestore, setIsLoadingFirestore] = useState<boolean>(true);
  const [currency, setCurrency] = useState<CurrencyCode>(getStoredCurrency());

  // Listen to external currency change events across the application
  useEffect(() => {
    const handleStorageCurrencyChange = (event: Event) => {
      const detail = (event as CustomEvent<{ currency?: string }>).detail;
      const newCurr = detail?.currency || getStoredCurrency();
      if (newCurr && newCurr in SUPPORTED_CURRENCIES) {
        setCurrency(newCurr as CurrencyCode);
      }
    };
    window.addEventListener("mansa_currency_changed", handleStorageCurrencyChange);
    return () => {
      window.removeEventListener("mansa_currency_changed", handleStorageCurrencyChange);
    };
  }, []);

  // Creator Payout Configuration status: un produit ne peut pas être visible si le créateur n'a pas configuré le mode de paiement
  const [payoutConfigured, setPayoutConfigured] = useState<boolean>(() =>
    isCreatorPayoutConfigured(profile),
  );

  useEffect(() => {
    setPayoutConfigured(isCreatorPayoutConfigured(profile));
    const handlePayoutChange = () => {
      setPayoutConfigured(isCreatorPayoutConfigured(profile));
    };
    window.addEventListener("mansa_payout_config_changed", handlePayoutChange);
    return () => window.removeEventListener("mansa_payout_config_changed", handlePayoutChange);
  }, [profile]);

  // Dynamic Companies State (Saved locally / initialized empty)
  const [companies, setCompanies] = useState<Company[]>(() => {
    const userKey = user?.uid || user?.email || "default";
    return getSavedCompanies(userKey);
  });

  // Une même entreprise ne doit apparaître qu'une seule fois dans la colonne,
  // y compris si une ancienne session a conservé un doublon en local.
  const uniqueCompanies = useMemo(() => {
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    return companies.filter((company) => {
      const id = (company.id || "").trim().toLowerCase();
      const name = (company.name || "").trim().toLowerCase();
      if ((id && seenIds.has(id)) || (name && seenNames.has(name))) return false;
      if (id) seenIds.add(id);
      if (name) seenNames.add(name);
      return true;
    });
  }, [companies]);

  // Keep every workspace view in sync when a company logo/banner is changed.
  useEffect(() => {
    const handleCompaniesUpdated = () => {
      const userKey = user?.uid || user?.email || "default";
      setCompanies(getSavedCompanies(userKey));
    };
    window.addEventListener("mansa_companies_updated", handleCompaniesUpdated);
    return () => window.removeEventListener("mansa_companies_updated", handleCompaniesUpdated);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const ownerUid = user?.uid || user?.email || "";
    if (!ownerUid) return;
    loadCreatorCompanies(ownerUid).then((loaded) => {
      if (!cancelled) setCompanies(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.email]);

  // Subscribed Enterprises State (Member / Fan Experience: e.g. victory_odds, BS, GS)
  const [memberSubscriptions, setMemberSubscriptions] = useState<EnterpriseSubscription[]>(() => {
    const userKey = user?.uid || user?.email || "default";
    return getSavedSubscriptions(userKey);
  });
  const [memberAccessError, setMemberAccessError] = useState<string | null>(null);

  // Le cache mémoire accélère le premier rendu, mais Supabase reste la source de vérité.
  const refreshMemberAccess = useCallback(async () => {
    const memberUid = user?.uid;
    if (authLoading || !memberUid) return;

    try {
      const snapshot = await fetchMemberAccessFromSupabase(memberUid);
      const userKey = user?.uid || user?.email || "default";
      setMemberSubscriptions(snapshot.subscriptions);
      saveSubscriptions(userKey, snapshot.subscriptions);
      setMemberAccessError(null);
    } catch (error) {
      console.error("Impossible de reconstruire l’accès membre depuis Supabase:", error);
      // Une erreur de lecture ne doit pas remplacer l’écran par un état vide.
      setMemberAccessError(
        "Impossible de mettre à jour vos accès pour le moment. Vos informations déjà affichées sont conservées.",
      );
    }
  }, [authLoading, user?.uid, user?.email]);

  useEffect(() => {
    void refreshMemberAccess();
  }, [refreshMemberAccess]);

  useEffect(() => {
    const handleMemberAccessRefresh = () => void refreshMemberAccess();
    window.addEventListener("mansa_member_access_refresh_requested", handleMemberAccessRefresh);
    return () =>
      window.removeEventListener(
        "mansa_member_access_refresh_requested",
        handleMemberAccessRefresh,
      );
  }, [refreshMemberAccess]);

  useEffect(() => {
    const memberUid = user?.uid;
    if (!memberUid || memberSubscriptions.length === 0) return;
    let cancelled = false;
    (async () => {
      const hydrated = await Promise.all(
        memberSubscriptions.map(async (subscription) => {
          const productIds =
            subscription.unlockedProductIds || subscription.purchasedOfferIds || [];
          const contents = await Promise.all(
            productIds.map((productId) => loadVerifiedMemberContent(memberUid, productId)),
          );
          const digitalFiles = contents.flatMap((content) => content?.digitalFiles || []);
          const courseModules = contents.flatMap((content) => content?.courseModules || []);
          if (!digitalFiles.length && !courseModules.length) return subscription;
          const hydratedCourses = courseModules.map((module: any, index) => ({
            id: module.id || `course-module-${subscription.companyId}-${index}`,
            title: module.title || `Formation ${index + 1}`,
            description: module.description || "Module inclus dans votre offre",
            modulesCount: module.lessons?.length || module.modulesCount || 1,
            accessUrl: module.accessUrl || `/courses/${subscription.companyId}`,
            associatedOfferId: module.associatedOfferId || productIds[0],
            associatedOfferTitle: subscription.productName,
          }));
          return {
            ...subscription,
            digitalFiles,
            courseModules,
            ebooks: [
              ...(subscription.ebooks || []),
              ...digitalFiles.map((file: any) => ({
                id: file.id,
                title: file.name,
                description: "Fichier inclus dans votre offre",
                downloadUrl: file.downloadUrl,
                associatedOfferId: file.productId || productIds[0],
                associatedOfferTitle: subscription.productName,
              })),
            ],
            courses: [...(subscription.courses || []), ...hydratedCourses],
          };
        }),
      );
      if (cancelled) return;
      const userKey = user?.uid || user?.email || "default";
      setMemberSubscriptions(hydrated);
      saveSubscriptions(userKey, hydrated);
    })().catch((error) =>
      console.warn("Impossible de charger les droits membres persistants:", error),
    );
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("personnel");
  const [isCompanyOnboardingOpen, setIsCompanyOnboardingOpen] = useState(false);

  const activeCompany = companies.find((c) => c.id === activeWorkspaceId) || null;
  const isCreatorCompanySelected = Boolean(activeCompany);

  // A member workspace is strictly when viewing an external community subscription (as client/fan),
  // NEVER when viewing one's own creator company or personal workspace.
  const activeSubscription =
    !isCreatorCompanySelected && activeWorkspaceId !== "personnel"
      ? memberSubscriptions.find(
          (s) => s.id === activeWorkspaceId || s.companyId === activeWorkspaceId,
        ) || null
      : null;

  const isMemberWorkspace = Boolean(activeSubscription);

  // Sync member subscriptions on new subscription or when leaving an enterprise
  useEffect(() => {
    const handleSubUpdated = () => {
      const userKey = user?.uid || user?.email || "default";
      setMemberSubscriptions(getSavedSubscriptions(userKey));
    };
    const handleCommunityLeft = (event: Event) => {
      const detail = (event as CustomEvent<{ subId?: string; companyId?: string }>).detail;
      const leftSubId = detail?.subId;
      const leftCompanyId = detail?.companyId;
      const userKey = user?.uid || user?.email || "default";
      const updated = getSavedSubscriptions(userKey);
      setMemberSubscriptions(updated);
      if (selectedCommunitySubId === leftSubId || selectedCommunitySubId === leftCompanyId) {
        setSelectedCommunitySubId(updated[0]?.id || null);
      }
      if (activeWorkspaceId === leftSubId || activeWorkspaceId === leftCompanyId) {
        setActiveWorkspaceId("personnel");
        setActiveNav("communaute");
      }
    };
    window.addEventListener("mansa_subscription_updated", handleSubUpdated);
    window.addEventListener("mansa_community_left", handleCommunityLeft);
    return () => {
      window.removeEventListener("mansa_subscription_updated", handleSubUpdated);
      window.removeEventListener("mansa_community_left", handleCommunityLeft);
    };
  }, [user, selectedCommunitySubId, activeWorkspaceId]);

  useEffect(() => {
    const handleCommunityJoined = (event: Event) => {
      const joinedId = (event as CustomEvent<{ subId?: string }>).detail?.subId;
      if (joinedId && previewCommunitySubId === joinedId) {
        setPreviewCommunitySubId(null);
      }
    };
    window.addEventListener("mansa_community_joined", handleCommunityJoined);
    return () => window.removeEventListener("mansa_community_joined", handleCommunityJoined);
  }, [previewCommunitySubId]);

  const handleVisitEnterpriseFromDiscover = (enterprise: CreatorEnterpriseCard | string) => {
    if (typeof enterprise === "string") {
      const existing = memberSubscriptions.find(
        (subscription) => subscription.id === enterprise || subscription.companyId === enterprise,
      );
      if (existing) {
        setSelectedCommunitySubId(existing.id);
        setActiveWorkspaceId("personnel");
        switchTab("communaute");
      }
      return;
    }
    const compId = enterprise.companyId || enterprise.id;
    const compName = enterprise.companyName || "Entreprise";
    const ownedCompany = uniqueCompanies.find((company) => company.id === compId);
    if (ownedCompany) {
      handleOpenCompanyCommunity(ownedCompany);
      return;
    }

    // Clean up any previously unjoined preview sub
    if (previewCommunitySubId) {
      setMemberSubscriptions((prev) => {
        const target = prev.find((s) => s.id === previewCommunitySubId);
        if (target && !target.hasJoined) {
          return prev.filter((s) => s.id !== previewCommunitySubId);
        }
        return prev;
      });
    }

    // Check if user is already a member
    const existing = memberSubscriptions.find((s) => s.id === compId || s.companyId === compId);
    if (existing) {
      setSelectedCommunitySubId(existing.id);
      setActiveWorkspaceId("personnel");
      switchTab("communaute");
      return;
    }

    const previewSub: EnterpriseSubscription = {
      id: `preview-${compId}`,
      companyId: compId,
      ...(enterprise.creatorId ? { creatorId: enterprise.creatorId } : {}),
      companyName: compName,
      companyLogo: enterprise.companyLogo || "",
      companyBanner: enterprise.bannerUrl || "",
      companyInitials: enterprise.companyInitials || compName.slice(0, 2).toUpperCase(),
      companyGradient: enterprise.accentColor || "from-[#12141c] to-black",
      productName: "Accès Visiteur",
      priceDisplay: enterprise.startingPrice || "Gratuit",
      status: "active",
      subscribedAt: "Aujourd'hui",
      hasPaidOffer: false,
      isCommunityPreview: true,
      hasJoined: false,
      creatorName: enterprise.creatorName || "Créateur Mansa",
      description: enterprise.description || "",
      rating: enterprise.rating || 4.9,
      reviewsCount: enterprise.reviewsCount || 120,
      subscribersCount: enterprise.subscribersCount || "1 000 membres",
      includedApps: ["dashboard", "support"],
      telegramChannels: [
        {
          id: `tg-${compId}`,
          name: `${compName} · Annonces Officielles`,
          subscribersCount: enterprise.membersNumber || 1200,
          tag: "Canal Public",
          description: "Informations officielles de la communauté.",
          inviteLink: "https://t.me/joinchat/official",
        },
      ],
    };

    setMemberSubscriptions((prev) => {
      const filtered = prev.filter((s) => s.id !== previewSub.id);
      return [previewSub, ...filtered];
    });
    setPreviewCommunitySubId(previewSub.id);
    setSelectedCommunitySubId(previewSub.id);
    setActiveWorkspaceId("personnel");
    switchTab("communaute");
  };

  const handleOpenCompanyCommunity = (company: Company | null = activeCompany) => {
    if (!company) return;

    const existing = memberSubscriptions.find(
      (subscription) => subscription.id === company.id || subscription.companyId === company.id,
    );
    if (existing) {
      setSelectedCommunitySubId(existing.id);
      setActiveWorkspaceId("personnel");
      switchTab("communaute");
      return;
    }

    const companyProduct = productsList.find((product) => product.companyId === company.id);
    const ownerCommunitySub: EnterpriseSubscription = {
      id: `owner-community-${company.id}`,
      companyId: company.id,
      creatorId: company.ownerUid || user?.uid,
      companyName: company.name,
      companyInitials: company.logoInitials || company.name.slice(0, 2).toUpperCase(),
      ...(company.companyLogo ? { companyLogo: company.companyLogo } : {}),
      ...(company.companyBanner ? { companyBanner: company.companyBanner } : {}),
      companyGradient: company.colorGradient || "from-[#12141c] to-black",
      productName: companyProduct?.name || "Communauté de l'entreprise",
      priceDisplay: companyProduct?.priceDisplay || "Gratuit",
      status: "active",
      subscribedAt: "Aujourd'hui",
      hasPaidOffer: false,
      hasJoined: true,
      creatorName: user?.name || "Créateur Mansa",
      description: company.description || "",
      includedApps: ["dashboard", "support"],
      telegramChannels: [],
      discordChannels: [],
      subscribersCount: "0 membres",
    };

    setMemberSubscriptions((previous) => [
      ownerCommunitySub,
      ...previous.filter((subscription) => subscription.companyId !== company.id),
    ]);
    setSelectedCommunitySubId(ownerCommunitySub.id);
    setActiveWorkspaceId("personnel");
    switchTab("communaute");
  };

  const handleCompanyCreated = async (
    newComp: Omit<Company, "id" | "createdAt" | "ownerUid" | "discoverable">,
  ) => {
    const userKey = user?.uid || user?.email || "";
    if (!userKey) throw new Error("Un compte connecté est requis.");
    const {
      companies: updated,
      created,
      persisted,
    } = saveCompany(userKey, {
      ...newComp,
      ownerUid: userKey,
      discoverable: true,
    });
    await persisted;
    setCompanies(updated);
    setActiveWorkspaceId(created.id);
  };

  // Firestore real-time subscriptions for products & transactions
  useEffect(() => {
    const creatorKey = user?.uid || user?.email || "creator-default";
    const scopeId = activeWorkspaceId === "personnel" ? "personal" : activeWorkspaceId;

    // Subscribe to creator products in Firestore
    const unsubProducts = subscribeToCreatorProducts(
      creatorKey,
      (dbProjects) => {
        setProjects(dbProjects);
        setProductsList(
          dbProjects.map((p) => {
            const billingSuffix =
              p.pricingModel === "subscription"
                ? " / mois"
                : p.pricingModel === "annual"
                  ? " / an"
                  : "";
            const pCurrency = (p.currency as CurrencyCode) || "USD";
            const revenueNumber = (p.pricingAmount || 0) * (p.membersCount || 0);
            const extendedProject = p as BusinessProject &
              Partial<
                Pick<CreatedProductData, "pricingOptions" | "digitalFiles" | "courseModules">
              > & {
                type?: string;
              };
            const storedProductType = p.productType || extendedProject.type;

            return {
              id: p.id,
              productType: (storedProductType &&
              ["course", "ebook", "membership"].includes(storedProductType)
                ? storedProductType
                : "digital") as ProductTypeCategory,
              name: p.name,
              priceDisplay: `${p.pricingAmount} ${pCurrency}${billingSuffix}`,
              priceAmount: p.pricingAmount,
              currency: pCurrency,
              pricingType: p.pricingAmount > 0 ? "paid" : "free",
              billingCycle: p.pricingModel === "one_time" ? "one_time" : "monthly",
              visibility:
                p.status === "paused" ? "Caché" : p.status === "draft" ? "Caché" : "Visible",
              discoverStatus: "Répertorié sur Mansa",
              includedApps: p.apps && p.apps.length > 0 ? p.apps : ["Communauté VIP Mansa"],
              conversionRate: p.conversionRate || "0%",
              totalRevenue: `${revenueNumber} ${pCurrency}`,
              activeUsers: p.membersCount || 0,
              imageUrl:
                p.coverImage ||
                "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
              ...(p.bannerUrl ? { bannerUrl: p.bannerUrl } : {}),
              title: p.name,
              description: p.tagline || "",
              productUrl: p.storeUrl || `mansa.af/p/${p.id}`,
              affiliateRate: p.affiliateCommissionRate ?? 25,
              ctaText: p.ctaText || "Rejoindre maintenant",
              companyId: p.companyId || "",
              companyName: p.companyName || "",
              pricingOptions: extendedProject.pricingOptions || [],
              digitalFiles: extendedProject.digitalFiles || [],
              courseModules: extendedProject.courseModules || [],
            };
          }),
        );
        setIsLoadingFirestore(false);
      },
      scopeId,
    );

    // Subscribe to creator transactions in Firestore
    const unsubTx = subscribeToCreatorTransactions(
      creatorKey,
      (txs) => {
        setRealTransactions(txs);
        const sum = txs.reduce((acc, t) => acc + (t.amountNumber || 0), 0);
        setBalance(sum);

        const events: PulseEvent[] = txs.slice(0, 10).map((t) => ({
          id: t.id,
          type: "sale",
          amount: t.amount,
          categoryName: t.productName,
          location: t.buyerLocation || "Abidjan, Côte d'Ivoire",
          countryFlag: getCountryFlagFromLocation(t.buyerLocation || ""),
          source: t.paymentMethod || "Mobile Money",
          timeAgo: "en direct",
        }));
        setPulseEvents(events);
      },
      scopeId,
    );

    return () => {
      unsubProducts();
      unsubTx();
    };
  }, [user?.uid, user?.email, activeWorkspaceId]);

  // Context-aware transactions & balance:
  // - Lorsque l'utilisateur est dans une entreprise précise : correspond UNIQUEMENT aux revenus générés avec cette entreprise.
  // - Affichage : « Solde total — [Nom de l'entreprise] »
  // - En mode Personnel : revenus explicitement non rattachés à une entreprise.
  // - Affichage : « Solde total — Personnel »
  // - Strictement jamais de mélange entre le solde d'une entreprise et le solde personnel global.
  const isCompanyContext = activeWorkspaceId !== "personnel";
  const contextTransactions = useMemo(() => {
    if (!isCompanyContext) {
      // Mode Personnel : revenus non rattachés à une entreprise uniquement.
      return filterPersonalTransactions(realTransactions);
    }
    // Mode Entreprise : tous les flux rattachés à cet identifiant exact.
    return filterByCompanyId(realTransactions, activeWorkspaceId);
  }, [realTransactions, isCompanyContext, activeWorkspaceId]);

  const activeBalance = useMemo(() => {
    return contextTransactions.reduce((acc, t) => acc + (t.amountNumber || 0), 0);
  }, [contextTransactions]);

  // Filtrage des produits selon le contexte actif
  const contextProducts = useMemo(() => {
    if (!isCompanyContext) {
      return [];
    }
    return filterByCompanyId(productsList, activeWorkspaceId);
  }, [productsList, isCompanyContext, activeWorkspaceId]);

  const previousWorkspaceId = useRef(activeWorkspaceId);
  useEffect(() => {
    if (previousWorkspaceId.current !== activeWorkspaceId) {
      previousWorkspaceId.current = activeWorkspaceId;
      if (creatorAppWorkflow?.companyId !== activeWorkspaceId) {
        setCreatorAppWorkflow(null);
      }
      setIsProductStudioOpen(false);
      setEditingProduct(null);
      setIsTelegramLinkModalOpen(false);
      setTelegramLinkModalProduct(null);
      setActiveActionMenuId(null);
    }
    const companyOnlyTabs = [
      "produits",
      "paiements",
      "clients",
      "assistance",
      "applications",
      "telegram_app",
      "discord_app",
      "workforce",
      "main_doeuvre",
      "equipe",
      "partenaires",
      "partners",
      "parametres_boutique",
      "parametres_entreprise",
      "parametres",
    ];
    if (activeWorkspaceId === "personnel" && companyOnlyTabs.includes(activeNav)) {
      setActiveNav("accueil");
    }
  }, [activeWorkspaceId, activeNav]);

  // Telegram et Discord sont des apps : elles ne doivent être présentes que si au moins un produit existe et leur est associé
  const companyHasTelegram = useMemo(() => {
    if (contextProducts.length === 0) return false;
    return contextProducts.some(
      (p) =>
        (p.includedApps || []).some((a) => a.toLowerCase().includes("telegram")) ||
        (p.name && p.name.toLowerCase().includes("telegram")) ||
        (p.title && p.title.toLowerCase().includes("telegram")),
    );
  }, [contextProducts]);

  const companyHasDiscord = useMemo(() => {
    if (contextProducts.length === 0) return false;
    return contextProducts.some(
      (p) =>
        (p.includedApps || []).some((a) => a.toLowerCase().includes("discord")) ||
        (p.name && p.name.toLowerCase().includes("discord")) ||
        (p.title && p.title.toLowerCase().includes("discord")),
    );
  }, [contextProducts]);

  // Décomposition détaillée pour le Mode Personnel
  const personalBreakdown = useMemo(() => {
    let companiesRevenue = 0;
    let affiliateRevenue = 0;
    let otherRevenue = 0;

    filterPersonalTransactions(realTransactions).forEach((t) => {
      const amount = t.amountNumber || 0;
      if (t.type === "affiliate") {
        affiliateRevenue += amount;
      } else if (t.type === "other") {
        otherRevenue += amount;
      } else {
        companiesRevenue += amount;
      }
    });

    return {
      companies: companiesRevenue,
      affiliates: affiliateRevenue,
      other: otherRevenue,
      total: companiesRevenue + affiliateRevenue + otherRevenue,
    };
  }, [realTransactions]);

  const formattedActiveBalance = useMemo(() => {
    const usdRate = SUPPORTED_CURRENCIES[currency]?.rateToUSD || 1;
    const usdEquivalent = activeBalance / (usdRate > 0 ? usdRate : 1);
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(usdEquivalent);
  }, [activeBalance, currency]);

  const handleAddProject = async (newProj: BusinessProject) => {
    const creatorKey = user?.uid || user?.email || "creator-default";
    await saveProductToFirestore(creatorKey, user?.email || "", user?.name || "Créateur", {
      id: newProj.id,
      name: newProj.name,
      description: newProj.tagline,
      category: newProj.category,
      priceAmount: newProj.pricingAmount,
      pricingType: newProj.pricingAmount > 0 ? "paid" : "free",
      billingCycle: newProj.pricingModel === "one_time" ? "one_time" : "monthly",
      currency: newProj.currency,
      includedApps: newProj.apps,
      affiliateRate: newProj.affiliateCommissionRate,
      productUrl: newProj.storeUrl,
      ...(newProj.ctaText ? { ctaText: newProj.ctaText } : {}),
      ...(newProj.coverImage ? { coverImage: newProj.coverImage } : {}),
      ...(newProj.bannerUrl ? { bannerUrl: newProj.bannerUrl } : {}),
      companyId: newProj.companyId || activeCompany?.id || "",
      companyName: newProj.companyName || activeCompany?.name || "",
      visibility: newProj.status === "active" ? "Visible" : "Caché",
    });
  };

  const handleUpdateProject = async (updated: BusinessProject) => {
    const creatorKey = user?.uid || user?.email || "creator-default";
    await saveProductToFirestore(creatorKey, user?.email || "", user?.name || "Créateur", {
      id: updated.id,
      name: updated.name,
      description: updated.tagline,
      category: updated.category,
      priceAmount: updated.pricingAmount,
      pricingType: updated.pricingAmount > 0 ? "paid" : "free",
      billingCycle: updated.pricingModel === "one_time" ? "one_time" : "monthly",
      currency: updated.currency,
      includedApps: updated.apps,
      affiliateRate: updated.affiliateCommissionRate,
      productUrl: updated.storeUrl,
      ...(updated.ctaText ? { ctaText: updated.ctaText } : {}),
      ...(updated.coverImage ? { coverImage: updated.coverImage } : {}),
      ...(updated.bannerUrl ? { bannerUrl: updated.bannerUrl } : {}),
      companyId: updated.companyId || activeCompany?.id || "",
      companyName: updated.companyName || activeCompany?.name || "",
      visibility: updated.status === "active" ? "Visible" : "Caché",
    });
  };

  const handleDeleteProject = async (projId: string) => {
    await deleteProductFromFirestore(projId, user?.uid || user?.email || "creator-default");
  };

  // State for Product Creation Studio modal
  const [isProductStudioOpen, setIsProductStudioOpen] = useState(false);
  const [isAccountSettingsModalOpen, setIsAccountSettingsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CreatedProductData | null>(null);
  const activeEditingProduct =
    editingProduct?.companyId === activeWorkspaceId ? editingProduct : null;
  const [productToDelete, setProductToDelete] = useState<CreatedProductData | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<BusinessProject | null>(null);
  const [selectedProductFilter, setSelectedProductFilter] = useState<"all" | "visible" | "hidden">(
    "visible",
  );
  const [selectedProductAppFilter, setSelectedProductAppFilter] = useState("all");
  const [isProductFiltersOpen, setIsProductFiltersOpen] = useState(false);
  const productAppFilterOptions = useMemo(
    () =>
      Array.from(
        new Set(
          contextProducts
            .flatMap((product) => product.includedApps || [])
            .map((app) => app.trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, lang === "fr" ? "fr" : "en")),
    [contextProducts, lang],
  );
  const filteredContextProducts = useMemo(
    () =>
      contextProducts.filter((product) => {
        const matchesVisibility =
          selectedProductFilter === "all" ||
          (selectedProductFilter === "visible"
            ? product.visibility === "Visible"
            : product.visibility === "Caché");
        const matchesIncludedApp =
          selectedProductAppFilter === "all" ||
          (product.includedApps || []).some((app) => app.trim() === selectedProductAppFilter);
        return matchesVisibility && matchesIncludedApp;
      }),
    [contextProducts, selectedProductFilter, selectedProductAppFilter],
  );
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [copyFeedbackId, setCopyFeedbackId] = useState<string | null>(null);
  const [telegramLinkModalProduct, setTelegramLinkModalProduct] =
    useState<CreatedProductData | null>(null);
  const [isTelegramLinkModalOpen, setIsTelegramLinkModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [accountSettingsInitialTab, setAccountSettingsInitialTab] = useState<
    "profil" | "securite" | "commandes" | "notifications"
  >("profil");
  const [selectedTimeframe, setSelectedTimeframe] = useState<"24h" | "7j" | "30j" | "1an" | "tout">(
    "30j",
  );
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: number;
      sender: string;
      avatar: string;
      text: string;
      time: string;
      isMe: boolean;
    }>
  >([]);
  const [newChatInput, setNewChatInput] = useState("");
  const [privateConversations, setPrivateConversations] = useState<any[]>([]);
  const [selectedPrivateConversationId, setSelectedPrivateConversationId] = useState<string | null>(
    null,
  );
  const [viewedPrivateProfile, setViewedPrivateProfile] = useState<{
    userId: string;
    name?: string;
    email?: string;
  } | null>(null);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [messageSortOrder, setMessageSortOrder] = useState<"recent" | "oldest">("recent");
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [creatorAppWorkflow, setCreatorAppWorkflow] = useState<{
    app: "courses" | "files";
    companyId: string;
    productIds: string[];
  } | null>(null);
  const [creatorAppsLoadAttempt, setCreatorAppsLoadAttempt] = useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMemberCheckoutOpen, setIsMemberCheckoutOpen] = useState(false);
  const safeUserEmail = (user?.email || "").trim().toLowerCase();
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>(() =>
    getUserNotifications(safeUserEmail),
  );

  useEffect(() => {
    const refreshNotifications = () =>
      setUserNotifications(getUserNotifications((user?.email || "").trim().toLowerCase()));
    window.addEventListener("mansa_user_notifications_updated", refreshNotifications);
    return () =>
      window.removeEventListener("mansa_user_notifications_updated", refreshNotifications);
  }, [user?.email]);

  // Tab change with skeleton loading transition
  const switchTab = (tab: typeof activeNav) => {
    setIsMobileSidebarOpen(false);

    // If leaving community without having joined the preview enterprise:
    // "si on la rejoint pas et qu'on quitte la page de l'entreprise elle disparait de 'communauté'"
    if (previewCommunitySubId && tab !== "communaute") {
      setMemberSubscriptions((prev) => {
        const target = prev.find((s) => s.id === previewCommunitySubId);
        if (target && !target.hasJoined) {
          return prev.filter((s) => s.id !== previewCommunitySubId);
        }
        return prev;
      });
      setPreviewCommunitySubId(null);
    }

    if (tab === activeNav) return;
    setIsTabLoading(true);
    setActiveNav(tab);
    setTimeout(() => {
      setIsTabLoading(false);
    }, 380);
  };

  const handleRefreshData = () => {
    setIsTabLoading(true);
    setTimeout(() => {
      setIsTabLoading(false);
    }, 500);
  };

  // Sync real-time African pulse feed strictly from real Firestore transactions
  useEffect(() => {
    const previousIds = previousPulseIdsRef.current;
    const currentIds = contextTransactions.map((tx) => tx.id);
    const hasNewTransaction =
      previousIds.length > 0 && currentIds.some((id) => !previousIds.includes(id));

    if (hasNewTransaction) {
      setPulseFeedOffset(-76);
      const frame = window.requestAnimationFrame(() => setPulseFeedOffset(0));
      previousPulseIdsRef.current = currentIds;
      return () => window.cancelAnimationFrame(frame);
    }

    previousPulseIdsRef.current = currentIds;
    return undefined;
  }, [contextTransactions]);

  useEffect(() => {
    if (contextTransactions && contextTransactions.length > 0) {
      const mappedPulse: PulseEvent[] = contextTransactions.slice(0, 8).map((tx) => ({
        id: tx.id,
        type: "sale",
        amount: tx.amount,
        categoryName: tx.productName,
        location: tx.buyerLocation || "Afrique",
        countryFlag: getCountryFlagFromLocation(tx.buyerLocation || ""),
        source: tx.paymentMethod || "Mobile Money",
        timeAgo: "Récent",
      }));
      setPulseEvents(mappedPulse);
    } else {
      setPulseEvents([]);
    }
  }, [contextTransactions]);

  useEffect(() => {
    let cancelled = false;
    const refreshPrivateConversations = async () => {
      if (!user?.uid) {
        setPrivateConversations([]);
        setSelectedPrivateConversationId(null);
        return;
      }
      try {
        const loaded = await fetchPrivateConversations();
        const isCreatorInbox = activeWorkspaceId !== "personnel" && Boolean(activeCompany);
        const scoped = isCreatorInbox
          ? loaded.filter((conversation) => conversation.community_id === activeWorkspaceId)
          : loaded;
        const next = scoped.map((conversation) => ({
          ...conversation,
          companyId: conversation.community_id,
          memberName:
            conversation.participantName ||
            conversation.participantUsername ||
            conversation.member_id,
          memberEmail:
            conversation.participantUsername ||
            (isCreatorInbox ? conversation.member_id : conversation.creator_id),
          messages: conversation.messages.map((message) => ({
            id: message.id,
            sender:
              message.sender_id === user.uid
                ? isCreatorInbox
                  ? "creator"
                  : "member"
                : isCreatorInbox
                  ? "member"
                  : "creator",
            text: message.body,
            time: message.created_at,
            createdAt: message.created_at,
            readAt: message.read_at,
          })),
        }));
        if (!cancelled) {
          setPrivateConversations(next);
          setUnreadMessagesCount(next.reduce((total, item) => total + item.unreadCount, 0));
          setSelectedPrivateConversationId((current) =>
            current && next.some((conversation) => conversation.id === current)
              ? current
              : next[0]?.id || null,
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Impossible de charger les messages privés:", error);
        }
      }
    };
    void refreshPrivateConversations();
    const interval = window.setInterval(() => void refreshPrivateConversations(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeCompany, activeWorkspaceId, user?.uid]);

  useEffect(() => {
    if (!selectedPrivateConversationId) return;
    void markPrivateConversationAsRead(selectedPrivateConversationId).catch(() => undefined);
  }, [selectedPrivateConversationId]);

  const visiblePrivateConversations = privateConversations
    .filter((conversation) => {
      const query = messageSearchQuery.trim().toLowerCase();
      return (
        !query ||
        `${conversation.memberName} ${conversation.memberEmail} ${conversation.messages.at(-1)?.text || ""}`
          .toLowerCase()
          .includes(query)
      );
    })
    .sort((a, b) => {
      const aLast = a.messages.at(-1)?.createdAt || "";
      const bLast = b.messages.at(-1)?.createdAt || "";
      return messageSortOrder === "recent"
        ? bLast.localeCompare(aLast)
        : aLast.localeCompare(bLast);
    });
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newChatInput.trim();
    if (!selectedPrivateConversationId || !text) return;
    try {
      await sendPrivateMessage({ conversationId: selectedPrivateConversationId, body: text });
      setNewChatInput("");
      const loaded = await fetchPrivateConversations();
      const isCreatorInbox = activeWorkspaceId !== "personnel" && Boolean(activeCompany);
      setPrivateConversations(
        loaded
          .filter(
            (conversation) => !isCreatorInbox || conversation.community_id === activeWorkspaceId,
          )
          .map((conversation) => ({
            ...conversation,
            companyId: conversation.community_id,
            memberName:
              conversation.participantName ||
              conversation.participantUsername ||
              conversation.member_id,
            memberEmail:
              conversation.participantUsername ||
              (isCreatorInbox ? conversation.member_id : conversation.creator_id),
            messages: conversation.messages.map((message) => ({
              id: message.id,
              sender:
                message.sender_id === user?.uid
                  ? isCreatorInbox
                    ? "creator"
                    : "member"
                  : isCreatorInbox
                    ? "member"
                    : "creator",
              text: message.body,
              time: message.created_at,
              createdAt: message.created_at,
              readAt: message.read_at,
            })),
          })),
      );
    } catch (error) {
      console.error("Envoi du message privé impossible:", error);
    }
  };

  const formattedBalance = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(activeBalance);

  // Selected Enterprise Subscription when inside an enterprise workspace
  const selectedSubscription: EnterpriseSubscription =
    activeSubscription ||
    (activeCompany
      ? {
          id: activeCompany.id,
          companyId: activeCompany.id,
          companyName: activeCompany.name,
          ...(activeCompany.companyBanner ? { companyBanner: activeCompany.companyBanner } : {}),
          ...(activeCompany.companyLogo ? { companyLogo: activeCompany.companyLogo } : {}),
          companyInitials:
            activeCompany.logoInitials || activeCompany.name.substring(0, 2).toUpperCase(),
          productName: activeCompany.description || "Pass Membre Officiel",
          priceDisplay: "Gratuit / Inclus",
          status: "active",
          subscribedAt: "Aujourd'hui",
          includedApps: ["dashboard", "support"],
          telegramChannels: [],
          discordChannels: [],
        }
      : {
          id: activeWorkspaceId,
          companyId: activeWorkspaceId,
          companyName: "Cadre financier",
          companyBanner:
            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1800&q=85",
          companyLogo: "",
          companyInitials: "FF",
          productName: "Financial Framework Pro & VIP Discord",
          priceDisplay: "19 100 € /mois",
          status: "active",
          subscribedAt: "Aujourd'hui",
          includedApps: ["dashboard", "telegram", "discord", "support"],
          telegramChannels: [
            {
              id: "tg-1",
              name: "Cadre Financier VIP Signals",
              subscribersCount: 3400,
              tag: "Signaux",
              quote: "Signaux de trading scalping en direct et analyses quotidiennes",
            },
            {
              id: "tg-2",
              name: "Trading Desk & Scalping Live",
              subscribersCount: 1200,
              tag: "Trading Desk",
              quote: "Salon d'entraide et questions directes aux traders du desk",
            },
          ],
          discordChannels: [
            {
              id: "dc-1",
              name: "Cadre Financier Official Discord",
              subscribersCount: 4800,
            },
          ],
        });

  const currentCommunitySub: EnterpriseSubscription | null =
    activeSubscription ||
    (selectedCommunitySubId
      ? memberSubscriptions.find(
          (s) => s.id === selectedCommunitySubId || s.companyId === selectedCommunitySubId,
        )
      : null) ||
    memberSubscriptions[0] ||
    null;

  return (
    <div className="mansa-dashboard mansa-viewport mansa-safe-bottom flex h-screen w-full flex-col bg-[#0f1012] text-[#eeeeee] font-sans antialiased overflow-hidden selection:bg-[#FA4616]/30 selection:text-[#FA4616]">
      {memberAccessError && (
        <div
          className="absolute left-1/2 top-16 z-50 w-[min(92vw,720px)] -translate-x-1/2 rounded-xl border border-red-400/30 bg-red-950/90 px-4 py-3 text-sm text-red-100 shadow-xl"
          role="alert"
        >
          {memberAccessError}
        </div>
      )}
      {/* 1. TOP HEADER BAR (Fully Responsive) */}
      <header
        className={`${isMemberWorkspace || activeNav === "communaute" ? "hidden lg:flex" : "flex"} h-14 w-full shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#0c0d0e] px-2.5 sm:px-6 gap-2 select-none`}
      >
        {/* Left: Mobile hamburger drawer trigger + afhub Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0 min-h-[38px] min-w-[38px] flex items-center justify-center"
            title="Ouvrir le menu de navigation"
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-4" />
          </button>

          <div
            className="flex items-center cursor-pointer shrink-0"
            onClick={() => switchTab("accueil")}
          >
            <AfhubLogo size="sm" />
          </div>
        </div>

        {/* Spacer for mobile to push right icons to the edge */}
        <div className="sm:hidden flex-1" />

        {/* Right Navigation Icons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Quick Create Product Button - ONLY in creator enterprise workspace */}
          {isCreatorCompanySelected && (
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsProductStudioOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm shadow-emerald-900/30 min-h-[36px]"
              title={
                lang === "fr"
                  ? "Créer un nouveau produit ou service"
                  : "Create new product or service"
              }
            >
              <Plus className="size-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">
                {lang === "fr" ? "Créer un produit" : "Create product"}
              </span>
            </button>
          )}

          {/* Refresh Data with Skeleton simulator */}
          <button
            onClick={handleRefreshData}
            className="hidden sm:flex p-1.5 text-zinc-400 hover:text-[#00D26A] transition-colors cursor-pointer rounded-lg hover:bg-white/5 min-h-[36px] min-w-[36px] items-center justify-center"
            title={lang === "fr" ? "Actualiser les données" : "Refresh data"}
          >
            <RefreshCw className={`size-4 ${isTabLoading ? "animate-spin text-[#00D26A]" : ""}`} />
          </button>

          <button
            onClick={() => switchTab("decouvrir")}
            className="hidden sm:flex p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/5 min-h-[36px] min-w-[36px] items-center justify-center"
            title="Explorer"
          >
            <Compass className="size-4" />
          </button>

          <button
            className="hidden sm:flex p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/5 min-h-[36px] min-w-[36px] items-center justify-center"
            title="Notifications"
          >
            <Bell className="size-4" />
          </button>

          {/* L’avatar ouvre directement les paramètres du compte, sans menu déroulant. */}
          <button
            type="button"
            onClick={() => {
              setAccountSettingsInitialTab("profil");
              setIsAccountSettingsModalOpen(true);
            }}
            aria-label={lang === "fr" ? "Ouvrir les paramètres du compte" : "Open account settings"}
            className="flex size-8 items-center justify-center rounded-full mansa-profile-avatar text-xs font-bold hover:brightness-110 transition-[filter] cursor-pointer border border-white/10"
          >
            {user?.avatarInitials || "JO"}
          </button>
        </div>
      </header>

      {/* 2. BODY CONTENT: ENTERPRISE MEMBER WORKSPACE OR CREATOR DASHBOARD */}
      {(isMemberWorkspace || activeNav === "communaute") && currentCommunitySub ? (
        <div className="flex flex-1 overflow-hidden relative pb-16 lg:pb-0">
          <EnterpriseMemberView
            subscription={currentCommunitySub}
            lang={lang}
            onCheckoutOpenChange={setIsMemberCheckoutOpen}
            onBackToPersonal={() => {
              if (previewCommunitySubId) {
                setMemberSubscriptions((prev) => {
                  const target = prev.find((s) => s.id === previewCommunitySubId);
                  if (target && !target.hasJoined) {
                    return prev.filter((s) => s.id !== previewCommunitySubId);
                  }
                  return prev;
                });
                setPreviewCommunitySubId(null);
              }
              const userKey = user?.uid || user?.email || "default";
              const updated = getSavedSubscriptions(userKey);
              setMemberSubscriptions(updated);
              if (updated.length > 0) {
                setSelectedCommunitySubId(updated[0]?.id ?? null);
              } else {
                setSelectedCommunitySubId(null);
              }
              setActiveWorkspaceId("personnel");
              setActiveNav("accueil");
            }}
            allSubscriptions={memberSubscriptions}
            onSelectSubscription={(subId) => {
              if (previewCommunitySubId && previewCommunitySubId !== subId) {
                setMemberSubscriptions((prev) => {
                  const target = prev.find((s) => s.id === previewCommunitySubId);
                  if (target && !target.hasJoined) {
                    return prev.filter((s) => s.id !== previewCommunitySubId);
                  }
                  return prev;
                });
                setPreviewCommunitySubId(null);
              }
              const found = memberSubscriptions.find(
                (s) => s.id === subId || s.companyId === subId,
              );
              if (found) {
                setSelectedCommunitySubId(found.id);
              }
            }}
            creatorCompanies={companies}
            onSelectCreatorCompany={(comp) => handleOpenCompanyCommunity(comp)}
            user={user}
            onOpenMarketplace={() => {
              setActiveWorkspaceId("personnel");
              setActiveNav("decouvrir");
            }}
            onOpenCreatorDashboard={() => {
              const creatorCompany = companies.find(
                (company) =>
                  company.id === currentCommunitySub.companyId ||
                  company.id === currentCommunitySub.id,
              );
              if (creatorCompany) {
                setActiveWorkspaceId(creatorCompany.id);
              }
              setActiveNav("accueil");
            }}
            onOpenCreatorAssistance={() => {
              const creatorCompany = companies.find(
                (company) =>
                  company.id === currentCommunitySub.companyId ||
                  company.id === currentCommunitySub.id,
              );
              if (creatorCompany) {
                setActiveWorkspaceId(creatorCompany.id);
              }
              setActiveNav("assistance");
            }}
            onCreateProduct={() => {
              const creatorCompany = companies.find(
                (company) =>
                  company.id === currentCommunitySub.companyId ||
                  company.id === currentCommunitySub.id,
              );
              if (!creatorCompany) return;
              setActiveWorkspaceId(creatorCompany.id);
              setActiveNav("produits");
              setEditingProduct(null);
              setIsProductStudioOpen(true);
            }}
            onOpenCreatorApplications={() => {
              const creatorCompany = companies.find(
                (company) =>
                  company.id === currentCommunitySub.companyId ||
                  company.id === currentCommunitySub.id,
              );
              if (creatorCompany) {
                setActiveWorkspaceId(creatorCompany.id);
              }
              setActiveNav("applications");
            }}
            onOpenCreatorAppWorkspace={(app, productIds) => {
              const creatorCompany = companies.find(
                (company) =>
                  company.id === currentCommunitySub.companyId ||
                  company.id === currentCommunitySub.id,
              );
              if (!creatorCompany) return;
              setCreatorAppWorkflow({ app, companyId: creatorCompany.id, productIds });
              setActiveWorkspaceId(creatorCompany.id);
              setActiveNav("applications");
            }}
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden relative pb-16 lg:pb-0">
          {/* LEFT SIDEBAR (Desktop: fixed, Mobile/Tablet: hidden) */}
          <aside className="hidden lg:flex w-56 xl:w-60 shrink-0 border-r border-white/[0.07] bg-[#0c0d0e] flex-col justify-between p-3 select-none">
            <div className="space-y-4">
              {/* Top Workspace Icons Switcher: Bonhomme Gris (Personnel) + Entreprises du créateur UNIQUEMENT */}
              <div className="flex items-center gap-1.5 pb-2 overflow-x-auto no-scrollbar">
                {/* Personal Workspace button: Affiche la photo de profil / identité visuelle de l'entreprise */}
                <button
                  onClick={() => {
                    setActiveWorkspaceId("personnel");
                    if (activeNav === "communaute") {
                      setActiveNav("accueil");
                    }
                  }}
                  className={`relative flex size-9 shrink-0 items-center justify-center rounded-xl overflow-hidden transition-all cursor-pointer ${
                    activeWorkspaceId === "personnel"
                      ? "bg-[#16171b] border-2 border-white text-white shadow-sm ring-1 ring-[#0055ff]"
                      : "bg-[#16171b] border border-white/10 text-zinc-400 hover:text-white"
                  }`}
                  title={lang === "fr" ? "Espace Personnel" : "Personal Workspace"}
                >
                  <div className="size-full bg-[#1b1d22] flex items-center justify-center text-zinc-300">
                    <User className="size-4" />
                  </div>
                </button>

                <div className="h-5 w-px bg-white/10 shrink-0 mx-0.5" />

                {/* Dynamic User-Created Companies (Owner / Creator) UNIQUEMENT */}
                {uniqueCompanies.map((comp, cIdx) => {
                  const isActive = activeWorkspaceId === comp.id;
                  return (
                    <button
                      key={`desk-comp-${comp.id || cIdx}-${cIdx}`}
                      onClick={() => {
                        setActiveWorkspaceId(comp.id);
                        if (activeNav === "decouvrir" || activeNav === "communaute") {
                          setActiveNav("accueil");
                        }
                      }}
                      className={`relative flex size-9 shrink-0 items-center justify-center rounded-xl overflow-hidden transition-all cursor-pointer ${
                        isActive
                          ? "border-2 border-white/90 shadow-sm ring-1 ring-[#00D26A]"
                          : "border border-white/10 hover:border-white/30"
                      }`}
                      title={`Mon Entreprise : ${comp.name}`}
                    >
                      {comp.companyLogo ? (
                        <img
                          src={comp.companyLogo}
                          alt={comp.name}
                          className="size-full object-cover mansa-avatar-image"
                        />
                      ) : (
                        <div className="size-full mansa-profile-avatar flex items-center justify-center text-[10px] font-black font-mono">
                          <span>
                            {comp.logoInitials || comp.name.substring(0, 2).toUpperCase() || "EN"}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Add Company (+) button -> Opens Company Onboarding Modal */}
                <button
                  onClick={() => setIsCompanyOnboardingOpen(true)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/20 bg-transparent text-zinc-400 hover:border-[#00D26A] hover:text-[#00D26A] hover:bg-[#00D26A]/5 transition-all cursor-pointer"
                  title={lang === "fr" ? "Créer une nouvelle entreprise" : "Create new enterprise"}
                >
                  <Plus className="size-4" />
                </button>
              </div>

              {/* Nav Menu */}
              <div>
                <div className="px-3 py-1 text-[11px] font-bold text-zinc-400 truncate flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="truncate text-white font-semibold">
                      {activeSubscription
                        ? `Membre : ${activeSubscription.companyName}`
                        : activeCompany
                          ? activeCompany.name
                          : lang === "fr"
                            ? "Espace Personnel"
                            : "Personal"}
                    </span>
                  </div>
                  {activeSubscription && (
                    <button
                      onClick={() => setActiveWorkspaceId("personnel")}
                      className="text-[10px] text-zinc-500 hover:text-white"
                    >
                      Quitter
                    </button>
                  )}
                </div>

                {activeWorkspaceId === "personnel" ? (
                  /* MENU WORKSPACE PERSONNEL */
                  <nav
                    id="tour-sidebar-navigation"
                    className="mt-1 space-y-0.5 text-xs font-medium"
                  >
                    {/* Accueil */}
                    <button
                      onClick={() => switchTab("accueil")}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                        activeNav === "accueil"
                          ? "bg-[#22252c] text-white font-semibold"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      }`}
                    >
                      <Home className="size-4 text-zinc-300" />
                      <span>{lang === "fr" ? "Accueil" : "Home"}</span>
                    </button>

                    {/* Analytique */}
                    <button
                      onClick={() => switchTab("analytique")}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                        activeNav === "analytique"
                          ? "bg-[#22252c] text-white font-semibold"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      }`}
                    >
                      <TrendingUp className="size-4 text-[#00D26A]" />
                      <span>{lang === "fr" ? "Analytique" : "Analytics"}</span>
                    </button>

                    {/* Communauté */}
                    <button
                      onClick={() =>
                        uniqueCompanies.length > 0
                          ? handleOpenCompanyCommunity(uniqueCompanies[0])
                          : switchTab("communaute")
                      }
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                        activeNav === "communaute"
                          ? "bg-[#22252c] text-white font-semibold"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <UsersIcon className="size-4 text-[#00D26A]" />
                        <span>{lang === "fr" ? "Communauté" : "Community"}</span>
                      </div>
                      {memberSubscriptions.length > 0 && (
                        <span className="text-[10px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-bold">
                          {memberSubscriptions.length}
                        </span>
                      )}
                    </button>

                    {/* Messages privés */}
                    <button
                      onClick={() => switchTab("messages")}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                        activeNav === "messages"
                          ? "bg-[#22252c] text-white font-semibold"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      }`}
                    >
                      <MessageSquare className="size-4 text-emerald-400" />
                      <span>{lang === "fr" ? "Messages" : "Messages"}</span>
                    </button>

                    {/* Découvrir */}
                    <button
                      onClick={() => switchTab("decouvrir")}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                        activeNav === "decouvrir"
                          ? "bg-[#22252c] text-white font-semibold"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      }`}
                    >
                      <Compass className="size-4 text-zinc-300" />
                      <span>{lang === "fr" ? "Découvrir" : "Discover"}</span>
                    </button>

                    {/* Affiliés */}
                    <button
                      onClick={() => switchTab("affilies")}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                        activeNav === "affilies"
                          ? "bg-[#22252c] text-white font-semibold"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Share2 className="size-4 text-[#0055ff]" />
                        <span
                          className={
                            activeNav === "affilies" ? "text-white" : "text-zinc-200 font-semibold"
                          }
                        >
                          {lang === "fr" ? "Affiliés" : "Affiliates"}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0055ff]/20 text-[#6699ff]">
                        Rejoindre
                      </span>
                    </button>
                  </nav>
                ) : (
                  /* MENU ENTREPRISE */
                  <nav className="mt-1 space-y-0.5 text-xs font-medium">
                    {/* Accueil */}
                    <button
                      onClick={() => switchTab("accueil")}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                        activeNav === "accueil"
                          ? "bg-[#22252c] text-white font-semibold"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      }`}
                    >
                      <Home className="size-4 text-zinc-300" />
                      <span>{lang === "fr" ? "Accueil" : "Home"}</span>
                    </button>

                    {/* Analytique */}
                    <button
                      onClick={() => switchTab("analytique")}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                        activeNav === "analytique"
                          ? "bg-[#22252c] text-white font-semibold"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      }`}
                    >
                      <TrendingUp className="size-4 text-[#00D26A]" />
                      <span>{lang === "fr" ? "Analytique" : "Analytics"}</span>
                    </button>

                    {/* Communauté de l'entreprise active : ouvre l'espace personnel sur cette entreprise */}
                    <button
                      onClick={() => handleOpenCompanyCommunity()}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    >
                      <UsersIcon className="size-4 text-[#00D26A]" />
                      <span>{lang === "fr" ? "Communauté" : "Community"}</span>
                    </button>

                    {/* Produits */}
                    <button
                      onClick={() => switchTab("produits")}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                        activeNav === "produits"
                          ? "bg-[#22252c] text-white font-semibold"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Package className="size-4 text-zinc-300" />
                        <span>{lang === "fr" ? "Produits" : "Products"}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-white/5">
                        {contextProducts.length}
                      </span>
                    </button>

                    {/* Paiements */}
                    <button
                      onClick={() => switchTab("paiements")}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                        activeNav === "paiements"
                          ? "bg-[#22252c] text-white font-semibold"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      }`}
                    >
                      <CreditCard className="size-4 text-zinc-300" />
                      <span>{lang === "fr" ? "Paiement" : "Payments"}</span>
                    </button>

                    {/* Clients */}
                    <button
                      onClick={() => switchTab("clients")}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                        activeNav === "clients"
                          ? "bg-[#22252c] text-white font-semibold"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      }`}
                    >
                      <UsersIcon className="size-4 text-zinc-300" />
                      <span>{lang === "fr" ? "Clients" : "Customers"}</span>
                    </button>

                    {/* Assistance (Chat avec les membres) */}
                    <button
                      onClick={() => switchTab("assistance")}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                        activeNav === "assistance"
                          ? "bg-[#22252c] text-white font-semibold"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      }`}
                    >
                      <Headphones className="size-4 text-emerald-400" />
                      <span>{lang === "fr" ? "Assistance" : "Assistance"}</span>
                    </button>

                    {/* SECTION: Applications */}
                    <div className="pt-3 pb-1">
                      <div className="px-3">
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                          Applications
                        </span>
                      </div>
                    </div>

                    {/* Bouton: + Ajouter une application */}
                    <button
                      onClick={() => switchTab("applications")}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all cursor-pointer ${
                        activeNav === "applications"
                          ? "bg-[#0055ff]/20 border border-[#0055ff]/40 text-white font-bold shadow-sm"
                          : "text-zinc-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Plus className="size-4 text-[#0055ff]" />
                        <span className="font-semibold text-white">
                          {lang === "fr" ? "Ajouter application" : "Add Application"}
                        </span>
                      </div>
                    </button>

                    {/* Telegram App (présente uniquement si un produit lié existe) */}
                    {companyHasTelegram && (
                      <button
                        onClick={() => switchTab("telegram_app")}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                          activeNav === "telegram_app"
                            ? "bg-[#22252c] text-white font-semibold"
                            : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                        }`}
                      >
                        <TelegramIcon className="size-4" />
                        <span
                          className={
                            activeNav === "telegram_app" ? "text-white font-bold" : "text-zinc-300"
                          }
                        >
                          Telegram
                        </span>
                      </button>
                    )}

                    {/* Discord App (présente uniquement si un produit lié existe) */}
                    {companyHasDiscord && (
                      <button
                        onClick={() => switchTab("discord_app")}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                          activeNav === "discord_app"
                            ? "bg-[#22252c] text-white font-semibold"
                            : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                        }`}
                      >
                        <DiscordIcon className="size-4" />
                        <span
                          className={
                            activeNav === "discord_app" ? "text-white font-bold" : "text-zinc-300"
                          }
                        >
                          Discord
                        </span>
                      </button>
                    )}

                    {/* SECTION: Développer */}
                    <div className="pt-3 pb-1">
                      <span className="px-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                        Développer
                      </span>
                    </div>

                    {/* Affiliés */}
                    <button
                      onClick={() => switchTab("affilies")}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                        activeNav === "affilies"
                          ? "bg-[#22252c] text-white font-semibold"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      }`}
                    >
                      <Share2 className="size-4 text-zinc-300" />
                      <span>{lang === "fr" ? "Affiliés (Vendeur)" : "Affiliates (Seller)"}</span>
                    </button>
                  </nav>
                )}
              </div>
            </div>

            {/* Bottom Settings Switchers */}
            <div className="border-t border-white/[0.07] pt-2 space-y-1">
              {/* Paramètres Entreprise */}
              <button
                onClick={() => switchTab("parametres_entreprise")}
                className={`${!activeCompany ? "hidden" : ""} w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeNav === "parametres_entreprise" || activeNav === "parametres_boutique"
                    ? "bg-[#22252c] text-[#00D26A] font-bold"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="size-4 text-emerald-400" />
                  <span>{lang === "fr" ? "Paramètres Entreprise" : "Enterprise Settings"}</span>
                </div>
              </button>

              {/* Paramètres Compte */}
              <button
                onClick={() => switchTab("parametres_compte")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeNav === "parametres_compte"
                    ? "bg-[#22252c] text-[#00D26A] font-bold"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <User className="size-4 text-blue-400" />
                  <span>{lang === "fr" ? "Paramètres Compte" : "Account Settings"}</span>
                </div>
              </button>
            </div>
          </aside>

          {/* Mobile / Tablet Left Navigation Sliding Drawer */}
          {isMobileSidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                onClick={() => setIsMobileSidebarOpen(false)}
              />
              <aside
                onClick={(e) => e.stopPropagation()}
                className="relative w-72 max-w-[85vw] bg-[#0c0d0e] border-r border-white/10 shadow-2xl flex flex-col justify-between p-3 select-none z-10 animate-in slide-in-from-left duration-200 overflow-y-auto"
              >
                <div className="space-y-4">
                  {/* Mobile Drawer Header with Close Button */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <AfhubLogo size="sm" />
                      <span className="text-xs font-bold text-zinc-300">Navigation</span>
                    </div>
                    <button
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                      title="Fermer le menu"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Workspace Switcher Dock */}
                  <div className="flex items-center gap-1.5 pb-2 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => {
                        setActiveWorkspaceId("personnel");
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`relative flex size-9 shrink-0 items-center justify-center rounded-xl overflow-hidden transition-all cursor-pointer ${
                        activeWorkspaceId === "personnel"
                          ? "bg-[#16171b] border-2 border-white text-white shadow-sm ring-1 ring-[#0055ff]"
                          : "bg-[#16171b] border border-white/10 text-zinc-400 hover:text-white"
                      }`}
                      title={lang === "fr" ? "Espace Personnel" : "Personal Workspace"}
                    >
                      <div className="size-full bg-[#1b1d22] flex items-center justify-center text-zinc-300">
                        <User className="size-4" />
                      </div>
                    </button>

                    <div className="h-5 w-px bg-white/10 shrink-0 mx-0.5" />

                    {/* Dynamic User-Created Companies (Owner / Creator) UNIQUEMENT */}
                    {uniqueCompanies.map((comp, cIdx) => {
                      const isActive = activeWorkspaceId === comp.id;
                      return (
                        <button
                          key={`mob-comp-${comp.id || cIdx}-${cIdx}`}
                          onClick={() => {
                            setActiveWorkspaceId(comp.id);
                            if (activeNav === "decouvrir" || activeNav === "communaute") {
                              setActiveNav("accueil");
                            }
                            setIsMobileSidebarOpen(false);
                          }}
                          className={`relative flex size-9 shrink-0 items-center justify-center rounded-xl overflow-hidden transition-all cursor-pointer ${
                            isActive
                              ? "border-2 border-white/90 shadow-sm ring-1 ring-[#00D26A]"
                              : "border border-white/10 hover:border-white/30"
                          }`}
                          title={`Mon Entreprise : ${comp.name}`}
                        >
                          {comp.companyLogo ? (
                            <img
                              src={comp.companyLogo}
                              alt={comp.name}
                              className="size-full object-cover mansa-avatar-image"
                            />
                          ) : (
                            <div className="size-full mansa-profile-avatar flex items-center justify-center text-[10px] font-black font-mono">
                              <span>
                                {comp.logoInitials ||
                                  comp.name.substring(0, 2).toUpperCase() ||
                                  "EN"}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => {
                        setIsCompanyOnboardingOpen(true);
                        setIsMobileSidebarOpen(false);
                      }}
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/20 bg-transparent text-zinc-400 hover:border-[#00D26A] hover:text-[#00D26A] transition-all cursor-pointer"
                      title={
                        lang === "fr" ? "Créer une nouvelle entreprise" : "Create new enterprise"
                      }
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>

                  {/* Nav Menu */}
                  <div>
                    <div className="px-3 py-1 text-[11px] font-bold text-zinc-400 truncate flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate text-white font-semibold">
                          {activeSubscription
                            ? `Membre : ${activeSubscription.companyName}`
                            : activeCompany
                              ? activeCompany.name
                              : lang === "fr"
                                ? "Espace Personnel"
                                : "Personal"}
                        </span>
                      </div>
                    </div>

                    {activeWorkspaceId === "personnel" ? (
                      <nav className="mt-1 space-y-1 text-xs font-medium">
                        {/* Accueil */}
                        <button
                          onClick={() => switchTab("accueil")}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] ${
                            activeNav === "accueil"
                              ? "bg-[#22252c] text-white font-semibold"
                              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                          }`}
                        >
                          <Home className="size-4 text-zinc-300" />
                          <span>{lang === "fr" ? "Accueil" : "Home"}</span>
                        </button>

                        {/* Analytique */}
                        <button
                          onClick={() => {
                            switchTab("analytique");
                            setIsMobileSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] ${
                            activeNav === "analytique"
                              ? "bg-[#22252c] text-white font-semibold"
                              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                          }`}
                        >
                          <TrendingUp className="size-4 text-[#00D26A]" />
                          <span>{lang === "fr" ? "Analytique" : "Analytics"}</span>
                        </button>

                        {/* Communauté */}
                        <button
                          onClick={() =>
                            uniqueCompanies.length > 0
                              ? handleOpenCompanyCommunity(uniqueCompanies[0])
                              : switchTab("communaute")
                          }
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] ${
                            activeNav === "communaute"
                              ? "bg-[#22252c] text-white font-semibold"
                              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <UsersIcon className="size-4 text-[#00D26A]" />
                            <span>{lang === "fr" ? "Communauté" : "Community"}</span>
                          </div>
                          {memberSubscriptions.length > 0 && (
                            <span className="text-[10px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-bold">
                              {memberSubscriptions.length}
                            </span>
                          )}
                        </button>

                        {/* Messages privés */}
                        <button
                          onClick={() => switchTab("messages")}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] ${
                            activeNav === "messages"
                              ? "bg-[#22252c] text-white font-semibold"
                              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                          }`}
                        >
                          <MessageSquare className="size-4 text-emerald-400" />
                          <span>{lang === "fr" ? "Messages" : "Messages"}</span>
                        </button>

                        {/* Découvrir */}
                        <button
                          onClick={() => switchTab("decouvrir")}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] ${
                            activeNav === "decouvrir"
                              ? "bg-[#22252c] text-white font-semibold"
                              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                          }`}
                        >
                          <Compass className="size-4 text-zinc-300" />
                          <span>{lang === "fr" ? "Découvrir" : "Discover"}</span>
                        </button>

                        {/* Affiliés */}
                        <button
                          onClick={() => switchTab("affilies")}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] ${
                            activeNav === "affilies"
                              ? "bg-[#22252c] text-white font-semibold"
                              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Share2 className="size-4 text-[#0055ff]" />
                            <span
                              className={
                                activeNav === "affilies"
                                  ? "text-white"
                                  : "text-zinc-200 font-semibold"
                              }
                            >
                              {lang === "fr" ? "Affiliés" : "Affiliates"}
                            </span>
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0055ff]/20 text-[#6699ff]">
                            Rejoindre
                          </span>
                        </button>
                      </nav>
                    ) : (
                      <nav className="mt-1 space-y-1 text-xs font-medium">
                        <button
                          onClick={() => switchTab("accueil")}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] ${
                            activeNav === "accueil"
                              ? "bg-[#22252c] text-white font-semibold"
                              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                          }`}
                        >
                          <Home className="size-4 text-zinc-300" />
                          <span>{lang === "fr" ? "Accueil" : "Home"}</span>
                        </button>

                        {/* Analytique */}
                        <button
                          onClick={() => {
                            switchTab("analytique");
                            setIsMobileSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] ${
                            activeNav === "analytique"
                              ? "bg-[#22252c] text-white font-semibold"
                              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                          }`}
                        >
                          <TrendingUp className="size-4 text-[#00D26A]" />
                          <span>{lang === "fr" ? "Analytique" : "Analytics"}</span>
                        </button>

                        <button
                          onClick={() => handleOpenCompanyCommunity()}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                        >
                          <UsersIcon className="size-4 text-[#00D26A]" />
                          <span>{lang === "fr" ? "Communauté" : "Community"}</span>
                        </button>

                        <button
                          onClick={() => switchTab("produits")}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] ${
                            activeNav === "produits"
                              ? "bg-[#22252c] text-white font-semibold"
                              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Package className="size-4 text-zinc-300" />
                            <span>{lang === "fr" ? "Produits" : "Products"}</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-white/5">
                            {contextProducts.length}
                          </span>
                        </button>

                        <button
                          onClick={() => switchTab("paiements")}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] ${
                            activeNav === "paiements"
                              ? "bg-[#22252c] text-white font-semibold"
                              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                          }`}
                        >
                          <CreditCard className="size-4 text-zinc-300" />
                          <span>{lang === "fr" ? "Paiement" : "Payments"}</span>
                        </button>

                        <button
                          onClick={() => switchTab("clients")}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] ${
                            activeNav === "clients"
                              ? "bg-[#22252c] text-white font-semibold"
                              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                          }`}
                        >
                          <UsersIcon className="size-4 text-zinc-300" />
                          <span>{lang === "fr" ? "Clients" : "Customers"}</span>
                        </button>

                        {/* Assistance */}
                        <button
                          onClick={() => switchTab("assistance")}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] ${
                            activeNav === "assistance"
                              ? "bg-[#22252c] text-white font-semibold"
                              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                          }`}
                        >
                          <Headphones className="size-4 text-emerald-400" />
                          <span>{lang === "fr" ? "Assistance" : "Assistance"}</span>
                        </button>

                        <div className="pt-2 pb-1">
                          <span className="px-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                            Applications
                          </span>
                        </div>

                        <button
                          onClick={() => switchTab("applications")}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all cursor-pointer min-h-[44px] ${
                            activeNav === "applications"
                              ? "bg-[#0055ff]/20 border border-[#0055ff]/40 text-white font-bold shadow-sm"
                              : "text-zinc-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Plus className="size-4 text-[#0055ff]" />
                            <span className="font-semibold text-white">
                              {lang === "fr" ? "Ajouter application" : "Add Application"}
                            </span>
                          </div>
                        </button>

                        {/* Telegram App (présente uniquement si un produit lié existe) */}
                        {companyHasTelegram && (
                          <button
                            onClick={() => switchTab("telegram_app")}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] ${
                              activeNav === "telegram_app"
                                ? "bg-[#22252c] text-white font-semibold"
                                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                            }`}
                          >
                            <TelegramIcon className="size-4" />
                            <span
                              className={
                                activeNav === "telegram_app"
                                  ? "text-white font-bold"
                                  : "text-zinc-300"
                              }
                            >
                              Telegram
                            </span>
                          </button>
                        )}

                        {/* Discord App (présente uniquement si un produit lié existe) */}
                        {companyHasDiscord && (
                          <button
                            onClick={() => switchTab("discord_app")}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] ${
                              activeNav === "discord_app"
                                ? "bg-[#22252c] text-white font-semibold"
                                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                            }`}
                          >
                            <DiscordIcon className="size-4" />
                            <span
                              className={
                                activeNav === "discord_app"
                                  ? "text-white font-bold"
                                  : "text-zinc-300"
                              }
                            >
                              Discord
                            </span>
                          </button>
                        )}

                        <div className="pt-2 pb-1">
                          <span className="px-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                            {lang === "fr" ? "Développer" : "Grow"}
                          </span>
                        </div>
                        <button
                          onClick={() => switchTab("affilies")}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] ${
                            activeNav === "affilies"
                              ? "bg-[#22252c] text-white font-semibold"
                              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                          }`}
                        >
                          <Share2 className="size-4 text-zinc-300" />
                          <span>
                            {lang === "fr" ? "Affiliés (Vendeur)" : "Affiliates (Seller)"}
                          </span>
                        </button>
                      </nav>
                    )}
                  </div>
                </div>

                {/* Mobile Drawer Bottom Settings & Simulation Actions */}
                <div className="border-t border-white/[0.07] pt-3 mt-4 space-y-2 shrink-0">
                  <button
                    onClick={() => switchTab("parametres_entreprise")}
                    className={`${!activeCompany ? "hidden" : ""} w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer min-h-[44px] ${
                      activeNav === "parametres_entreprise" || activeNav === "parametres_boutique"
                        ? "bg-[#22252c] text-[#00D26A] font-bold"
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="size-4 text-emerald-400" />
                      <span>{lang === "fr" ? "Paramètres Entreprise" : "Enterprise Settings"}</span>
                    </div>
                  </button>

                  <button
                    onClick={() => switchTab("parametres_compte")}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer min-h-[44px] ${
                      activeNav === "parametres_compte"
                        ? "bg-[#22252c] text-[#00D26A] font-bold"
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="size-4 text-blue-400" />
                      <span>{lang === "fr" ? "Paramètres Compte" : "Account Settings"}</span>
                    </div>
                  </button>
                </div>
              </aside>
            </div>
          )}

          {/* 3. MAIN CENTER WORKSPACE */}
          <main className="dashboard-canvas flex-1 overflow-y-auto bg-[#0f1012] p-6 lg:p-8">
            {userNotifications[0] && !userNotifications[0].read && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
                <Bell className="mt-0.5 size-4 shrink-0 text-red-300" />
                <div>
                  <p className="font-bold">{userNotifications[0].title}</p>
                  <p className="mt-1 text-xs text-red-100/80">{userNotifications[0].message}</p>
                </div>
              </div>
            )}
            {/* VIEW: COMMUNAUTÉ (EMPTY STATE LORSQUE L'UTILISATEUR A QUITTÉ LES ENTREPRISES) */}
            {activeNav === "communaute" && !currentCommunitySub && (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
                <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                  <UsersIcon className="size-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Aucune entreprise rejointe</h3>
                  <p className="text-xs text-zinc-400">
                    Vous ne faites partie d'aucune communauté d'entreprise pour le moment.
                  </p>
                </div>
                <button
                  onClick={() => switchTab("decouvrir")}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  Explorer les entreprises
                </button>
              </div>
            )}

            {/* VIEW: ACCUEIL (Exact layout of screenshot) */}
            {activeNav === "accueil" &&
              (isTabLoading ? (
                <div className="space-y-6 max-w-[1400px]">
                  <DashboardMetricsSkeleton />
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-8">
                      <DashboardChartSkeleton />
                    </div>
                    <div className="lg:col-span-4">
                      <DashboardPulseSkeleton />
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  id="dashboard-overview"
                  className="dashboard-overview space-y-8 max-w-[1400px]"
                >
                  {/* Demande de localisation contextuelle */}
                  <ContextualLocationPrompt currentCurrency={currency} className="mb-4" />

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Main Balance + Graph Block (lg:col-span-8) */}
                    <div className="lg:col-span-8 space-y-6">
                      <div id="tour-balance-chart" className="space-y-6">
                        {/* Solde Total Header (Contextuel selon l'entreprise ou le profil personnel) */}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-semibold text-zinc-300">
                              <span>
                                {isCompanyContext
                                  ? `Solde total de ${activeCompany?.name}`
                                  : "Solde total personnel"}
                              </span>
                            </div>
                            <div id="tour-currency-selector" className="flex items-center gap-1.5">
                              <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
                                {lang === "fr" ? "Affichage :" : "Display:"}
                              </span>
                              <CurrencySelector
                                currentCurrency={currency}
                                onSelectCurrency={setCurrency}
                                lang={lang}
                                variant="pill"
                              />
                            </div>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <div className="dashboard-data-number text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white break-all sm:break-normal">
                              <AnimatedNumber value={activeBalance} currency={currency} />
                            </div>
                          </div>
                        </div>

                        {/* Minimalist Line Chart with Wavy Curve and Baseline (Matching Screenshot) */}
                        <div className="dashboard-panel relative p-6 pt-10 overflow-hidden">
                          {/* Timeframe pill selector */}
                          <div className="dashboard-segmented-control absolute top-4 right-4 flex items-center gap-1 rounded-lg border p-1 text-[11px]">
                            {(["24h", "7j", "30j", "1an", "tout"] as const).map((tf) => (
                              <button
                                key={tf}
                                onClick={() => setSelectedTimeframe(tf)}
                                className={`rounded px-2 py-0.5 transition-all cursor-pointer ${
                                  selectedTimeframe === tf
                                    ? "bg-[#2a3035] text-white font-semibold"
                                    : "text-zinc-500 hover:text-zinc-300"
                                }`}
                              >
                                {tf}
                              </button>
                            ))}
                          </div>

                          {/* SVG Wavy Graph */}
                          <div className="h-64 sm:h-72 w-full pt-4">
                            <svg
                              className="h-full w-full overflow-visible"
                              viewBox="0 0 600 200"
                              preserveAspectRatio="none"
                            >
                              {/* Low-opacity data area; no decorative gradient. */}
                              <path
                                d="M 0,140 Q 60,115 120,135 T 240,110 T 360,95 T 480,80 T 600,85 L 600,190 L 0,190 Z"
                                fill="#3DDC84"
                                fillOpacity="0.08"
                              />

                              {/* Main wavy stroke line */}
                              <path
                                d="M 0,140 Q 60,115 120,135 T 240,110 T 360,95 T 480,80 T 600,85"
                                fill="none"
                                stroke="#00D26A"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />

                              {/* Dotted horizontal baseline */}
                              <line
                                x1="0"
                                y1="170"
                                x2="600"
                                y2="170"
                                stroke="rgba(255,255,255,0.12)"
                                strokeDasharray="4 4"
                                strokeWidth="1"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Right Column: Soldes & Pouls (lg:col-span-4, Matching Screenshot) */}
                    <div className="lg:col-span-4 space-y-6">
                      {/* 1. Soldes Card */}
                      <div className="dashboard-panel p-5">
                        <h3 className="text-sm font-bold text-white mb-3">
                          {lang === "fr" ? "Soldes" : "Balances"}
                        </h3>

                        <div
                          onClick={() => switchTab("paiements")}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-full mansa-profile-avatar text-xs font-bold border border-white/10">
                              {user?.avatarInitials || "JO"}
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-white block">
                                {activeCompany ? activeCompany.name : "Personnel"}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {user?.email || ""}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 font-mono text-base sm:text-lg font-bold text-zinc-200">
                            <AnimatedNumber value={activeBalance} currency={currency} />
                            <ChevronRight className="size-3.5 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>

                      {/* 2. Pouls Live Stream Card (Exact match to screenshot) */}
                      <div id="tour-pulse-feed" className="dashboard-panel p-5 space-y-3">
                        {/* Pouls header with green dot */}
                        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">
                              {lang === "fr" ? "Pouls" : "Pulse"}
                            </h3>
                            <span className="size-2 rounded-full bg-[#00D26A] animate-pulse" />
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">
                            Réseau en direct
                          </span>
                        </div>

                        {/* Live feed list with African Country Flags */}
                        <div className="h-[460px] overflow-hidden pr-1">
                          {pulseEvents.length === 0 ? (
                            <div className="py-12 px-3 text-center space-y-2.5">
                              <div className="size-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
                                <Zap className="size-4 text-zinc-500" />
                              </div>
                              <p className="text-xs font-semibold text-zinc-300">
                                {lang === "fr" ? "En attente d'activité" : "Waiting for activity"}
                              </p>
                              <p className="text-[11px] text-zinc-500 leading-relaxed max-w-[200px] mx-auto">
                                {lang === "fr"
                                  ? "Vos ventes Wave, Orange Money et virements s'afficheront ici en direct."
                                  : "Your live sales and mobile money payouts will stream here."}
                              </p>
                            </div>
                          ) : (
                            <div
                              className="pulse-feed-track space-y-2.5"
                              style={{ transform: `translateY(${pulseFeedOffset}px)` }}
                            >
                              {pulseEvents.map((evt) => (
                                <div
                                  key={evt.id}
                                  className="dashboard-feed-row flex items-start gap-3 text-xs text-zinc-300 leading-snug p-2.5 border transition-all"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="text-zinc-200 truncate">
                                        {evt.type === "ad_spend" ? (
                                          <>
                                            <span>Campagne Ads : </span>
                                            <strong className="text-[#00D26A] font-mono font-bold">
                                              {evt.amount}
                                            </strong>
                                          </>
                                        ) : (
                                          <>
                                            <span>Vente : </span>
                                            <strong className="text-[#00D26A] font-mono font-bold">
                                              {evt.amount}
                                            </strong>
                                          </>
                                        )}
                                      </div>
                                      <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                                        {evt.timeAgo}
                                      </span>
                                    </div>

                                    <div className="text-[10px] font-mono text-zinc-400 mt-1 flex items-center gap-1.5 flex-wrap">
                                      <span className="text-emerald-400 font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                        {evt.source}
                                      </span>
                                      <span className="text-zinc-500">·</span>
                                      <span className="text-zinc-300 truncate">{evt.location}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {/* VIEW: ANALYTIQUE */}
            {activeNav === "analytique" && (
              <div className="mx-auto max-w-[1400px] space-y-6">
                <div id="tour-revenue-analytics" className="space-y-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">Analyse des revenus numériques</h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      Vue détaillée des 30 derniers jours, convertie dans la devise sélectionnée.
                    </p>
                  </div>
                  <RevenueAnalyticsChart
                    lang={lang}
                    currentBalance={activeBalance}
                    currentCurrency={currency}
                    onSelectCurrency={setCurrency}
                    transactions={contextTransactions}
                  />
                </div>
              </div>
            )}

            {/* VIEW: PRODUITS (Matching exact UI of Image 1) */}
            {activeNav === "produits" && (
              <div className="mx-auto flex min-h-full min-w-0 w-full max-w-7xl flex-col gap-5">
                {/* Header: Title, Visibility Filter Pill, and Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-3">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      Produits
                    </h1>

                    {/* Active product filters */}
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedProductFilter !== "all" && (
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#0055ff]/40 bg-[#0055ff]/15 px-3 py-1 text-xs font-semibold text-[#6699ff]">
                          <span>
                            {lang === "fr" ? "Visibilité : " : "Visibility: "}
                            {selectedProductFilter === "visible"
                              ? lang === "fr"
                                ? "Visible"
                                : "Visible"
                              : lang === "fr"
                                ? "Masqué"
                                : "Hidden"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedProductFilter("all")}
                            className="ml-0.5 cursor-pointer hover:text-white"
                            title={lang === "fr" ? "Effacer le filtre" : "Clear filter"}
                            aria-label={
                              lang === "fr"
                                ? "Effacer le filtre de visibilité"
                                : "Clear visibility filter"
                            }
                          >
                            ×
                          </button>
                        </div>
                      )}
                      {selectedProductAppFilter !== "all" && (
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                          <span>{selectedProductAppFilter}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedProductAppFilter("all")}
                            className="ml-0.5 cursor-pointer hover:text-white"
                            title={lang === "fr" ? "Effacer le filtre" : "Clear filter"}
                            aria-label={
                              lang === "fr" ? "Effacer le filtre d’application" : "Clear app filter"
                            }
                          >
                            ×
                          </button>
                        </div>
                      )}
                      {selectedProductFilter === "all" && selectedProductAppFilter === "all" && (
                        <span className="text-xs text-zinc-500">
                          {lang === "fr" ? "Tous les produits" : "All products"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Top Right Action Buttons: + Créer un produit, Exporter, Settings */}
                  <div className="flex items-center gap-2.5">
                    {isCreatorCompanySelected && (
                      <button
                        onClick={() => {
                          setEditingProduct(null);
                          setIsProductStudioOpen(true);
                        }}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        <Plus className="size-4" />
                        <span>Créer un produit</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        const jsonStr = JSON.stringify(contextProducts, null, 2);
                        const blob = new Blob([jsonStr], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "mansa-produits.json";
                        a.click();
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#16181f] hover:bg-[#1f222b] px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Upload className="size-3.5 rotate-180" />
                      <span>Exporter</span>
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsProductFiltersOpen((open) => !open)}
                        aria-expanded={isProductFiltersOpen}
                        aria-controls="product-filters-menu"
                        className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-[#16181f] text-zinc-400 transition-colors hover:bg-[#1f222b] hover:text-white"
                        title={lang === "fr" ? "Filtres des produits" : "Product filters"}
                      >
                        <Settings className="size-4" />
                      </button>
                      {isProductFiltersOpen && (
                        <div
                          id="product-filters-menu"
                          role="region"
                          aria-label={lang === "fr" ? "Filtres des produits" : "Product filters"}
                          className="absolute right-0 top-full z-30 mt-2 w-72 space-y-4 rounded-xl border border-white/10 bg-[#16181f] p-4 shadow-2xl"
                        >
                          <h2 className="text-sm font-semibold text-white">
                            {lang === "fr" ? "Filtres" : "Filters"}
                          </h2>
                          <label className="flex flex-col gap-1.5 text-xs text-zinc-400">
                            {lang === "fr" ? "Visibilité" : "Visibility"}
                            <select
                              value={selectedProductFilter}
                              onChange={(event) =>
                                setSelectedProductFilter(
                                  event.target.value as "all" | "visible" | "hidden",
                                )
                              }
                              className="rounded-lg border border-white/10 bg-[#0c0d0e] px-3 py-2 text-xs text-white outline-none focus:border-blue-400"
                            >
                              <option value="all">{lang === "fr" ? "Tous" : "All"}</option>
                              <option value="visible">
                                {lang === "fr" ? "Visibles" : "Visible"}
                              </option>
                              <option value="hidden">{lang === "fr" ? "Masqués" : "Hidden"}</option>
                            </select>
                          </label>
                          <label className="flex flex-col gap-1.5 text-xs text-zinc-400">
                            {lang === "fr" ? "Application incluse" : "Included app"}
                            <select
                              value={selectedProductAppFilter}
                              onChange={(event) => setSelectedProductAppFilter(event.target.value)}
                              className="rounded-lg border border-white/10 bg-[#0c0d0e] px-3 py-2 text-xs text-white outline-none focus:border-blue-400"
                            >
                              <option value="all">
                                {lang === "fr" ? "Toutes les applications" : "All apps"}
                              </option>
                              {productAppFilterOptions.map((app) => (
                                <option key={app} value={app}>
                                  {app}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductFilter("all");
                              setSelectedProductAppFilter("all");
                            }}
                            className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                          >
                            {lang === "fr" ? "Réinitialiser les filtres" : "Reset filters"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Products Table matching screenshot */}
                <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col rounded-2xl border border-white/[0.08] bg-[#0c0d0e] overflow-hidden shadow-sm">
                  <div className="min-h-0 min-w-0 w-full flex-1 overflow-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      {/* Header Row */}
                      <thead>
                        <tr className="border-b border-white/[0.08] text-[11px] font-medium text-zinc-400">
                          <th className="py-3.5 px-4 font-normal">Nom</th>
                          <th className="py-3.5 px-4 font-normal">Prix</th>
                          <th className="py-3.5 px-4 font-normal">Visibilité</th>
                          <th className="py-3.5 px-4 font-normal">Statut de la découverte</th>
                          <th className="py-3.5 px-4 font-normal">Applications incluses</th>
                          <th className="py-3.5 px-4 font-normal">Conversion de paiement</th>
                          <th className="py-3.5 px-4 font-normal">Revenu total</th>
                          <th className="py-3.5 px-4 font-normal">
                            <div className="flex items-center gap-1 cursor-pointer hover:text-zinc-200">
                              <span>Utilisateurs actifs</span>
                              <span>↓</span>
                            </div>
                          </th>
                          <th className="py-3.5 px-4 text-right font-normal"></th>
                        </tr>
                      </thead>

                      {/* Table Body */}
                      <tbody className="divide-y divide-white/[0.04]">
                        {contextProducts.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-16 px-4 text-center">
                              <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-4">
                                <div className="size-12 rounded-2xl bg-[#151515] border border-white/10 flex items-center justify-center text-[#3DDC84]">
                                  <Package className="size-6" />
                                </div>
                                <div className="space-y-1">
                                  <h3 className="text-base font-bold text-white font-heading">
                                    {lang === "fr"
                                      ? "Aucun produit pour le moment"
                                      : "No products yet"}
                                  </h3>
                                  <p className="text-xs text-[#B6B5B0] leading-relaxed">
                                    {lang === "fr"
                                      ? "Votre catalogue est actuellement vide. Créez votre première offre ou importez un template pour commencer à vendre."
                                      : "Your catalog is empty. Create your first product to start selling."}
                                  </p>
                                </div>
                                {isCreatorCompanySelected ? (
                                  <button
                                    onClick={() => {
                                      setEditingProduct(null);
                                      setIsProductStudioOpen(true);
                                    }}
                                    className="ui-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer"
                                  >
                                    <Plus className="size-3.5" />
                                    <span>
                                      {lang === "fr" ? "+ Créer un produit" : "+ Create Product"}
                                    </span>
                                  </button>
                                ) : (
                                  <div className="flex flex-col items-center gap-2 pt-1">
                                    <p className="text-[11px] text-amber-400 font-medium">
                                      {lang === "fr"
                                        ? "La création de produit s'effectue au sein de vos entreprises."
                                        : "Product creation is only available within your companies."}
                                    </p>
                                    {companies.length > 0 ? (
                                      <button
                                        onClick={() => {
                                          setActiveWorkspaceId(companies[0]?.id ?? "personnel");
                                          setActiveNav("produits");
                                        }}
                                        className="ui-btn-primary px-4 py-1.5 text-xs font-bold flex items-center gap-2 cursor-pointer"
                                      >
                                        <span>
                                          {lang === "fr"
                                            ? `Accéder à ${companies[0]?.name ?? "votre entreprise"}`
                                            : `Go to ${companies[0]?.name ?? "your company"}`}
                                        </span>
                                        <ArrowRight className="size-3" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => setIsCompanyOnboardingOpen(true)}
                                        className="ui-btn-primary px-4 py-1.5 text-xs font-bold flex items-center gap-2 cursor-pointer"
                                      >
                                        <Plus className="size-3" />
                                        <span>
                                          {lang === "fr"
                                            ? "Créer une entreprise"
                                            : "Create a company"}
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : filteredContextProducts.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-12 text-center">
                              <p className="text-sm font-medium text-zinc-300">
                                {lang === "fr"
                                  ? "Aucun produit ne correspond aux filtres."
                                  : "No products match these filters."}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProductFilter("all");
                                  setSelectedProductAppFilter("all");
                                }}
                                className="mt-2 text-xs font-semibold text-blue-300 hover:text-white"
                              >
                                {lang === "fr" ? "Effacer les filtres" : "Clear filters"}
                              </button>
                            </td>
                          </tr>
                        ) : (
                          filteredContextProducts.map((product) => (
                            <tr
                              key={product.id}
                              onClick={(event) => {
                                if (
                                  (event.target as HTMLElement).closest(
                                    "button, a, input, select, textarea",
                                  )
                                )
                                  return;
                                setActiveNav("produits");
                                setEditingProduct(product);
                                setIsProductStudioOpen(true);
                              }}
                              onKeyDown={(event) => {
                                if (
                                  event.target === event.currentTarget &&
                                  (event.key === "Enter" || event.key === " ")
                                ) {
                                  event.preventDefault();
                                  setActiveNav("produits");
                                  setEditingProduct(product);
                                  setIsProductStudioOpen(true);
                                }
                              }}
                              tabIndex={0}
                              className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                            >
                              {/* Nom */}
                              <td className="py-4 px-4 font-bold text-white whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span>{product.name}</span>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const nextVisibility =
                                          product.status === "active" ? "Caché" : "Visible";
                                        await handleUpdateProject({
                                          ...product,
                                          status:
                                            nextVisibility === "Visible" ? "active" : "paused",
                                        });
                                      }}
                                      className={`ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${product.status === "active" ? "border border-amber-400/30 text-amber-300 hover:bg-amber-400/10" : "border border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/10"}`}
                                      title={
                                        product.status === "active"
                                          ? "Dépublier ce produit"
                                          : "Publier ce produit"
                                      }
                                    >
                                      {product.status === "active" ? "Dépublier" : "Publier"}
                                    </button>
                                  </div>
                                  {product.communityConfig?.telegramChannelName ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTelegramLinkModalProduct(product);
                                        setIsTelegramLinkModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#229ED9]/15 border border-[#229ED9]/30 text-[#229ED9] text-[10px] font-semibold hover:bg-[#229ED9]/25 transition-all w-fit cursor-pointer group/tg"
                                      title="Cliquer pour voir ou changer le canal Telegram lié"
                                    >
                                      <TelegramIcon className="size-3" />
                                      <span>{product.communityConfig.telegramChannelName}</span>
                                      <span className="text-[9px] text-zinc-400 group-hover/tg:text-white underline ml-0.5">
                                        Changer
                                      </span>
                                    </button>
                                  ) : null}
                                </div>
                              </td>

                              {/* Prix (dynamically converted to selected main currency) */}
                              <td className="py-4 px-4 text-zinc-200 font-mono font-medium whitespace-nowrap">
                                {(() => {
                                  if (product.pricingType === "free" || !product.priceAmount) {
                                    return "Gratuit";
                                  }
                                  const origCurr = (product.currency as CurrencyCode) || "USD";
                                  const converted = convertBetweenCurrencies(
                                    product.priceAmount,
                                    origCurr,
                                    currency,
                                  );
                                  const currConf =
                                    SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD;
                                  const formattedVal =
                                    currConf.decimals === 0
                                      ? Math.round(converted).toLocaleString("fr-FR")
                                      : (Math.round(converted * 100) / 100).toLocaleString(
                                          "fr-FR",
                                          {
                                            minimumFractionDigits: currConf.decimals,
                                            maximumFractionDigits: currConf.decimals,
                                          },
                                        );
                                  const billingSuffix =
                                    product.billingCycle === "monthly"
                                      ? " / mois"
                                      : product.billingCycle === "yearly"
                                        ? " / an"
                                        : "";
                                  return `${formattedVal} ${currConf.symbol}${billingSuffix}`;
                                })()}
                              </td>

                              {/* Visibilité: Un créateur vend et publie librement même sans moyen de retrait configuré */}
                              <td className="py-4 px-4 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                  <span>{product.visibility || "Actif & En vente"}</span>
                                </span>
                              </td>

                              {/* Statut de la découverte */}
                              <td className="py-4 px-4 text-zinc-400 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <Globe className="size-3.5 text-zinc-400 shrink-0" />
                                  <span className="text-zinc-300">
                                    {product.discoverStatus || "Public"}
                                  </span>
                                </div>
                              </td>

                              {/* Applications incluses */}
                              <td className="py-4 px-4">
                                {(product.includedApps || []).length > 0 ? (
                                  <div className="flex max-w-[260px] flex-wrap items-center gap-1 pl-1">
                                    {product.includedApps.map((app, appIndex) => {
                                      const normalizedApp = app.toLowerCase();
                                      const appIcon = normalizedApp.includes("telegram") ? (
                                        <TelegramIcon className="size-3.5 shrink-0" />
                                      ) : normalizedApp.includes("discord") ? (
                                        <DiscordIcon className="size-3.5 shrink-0" />
                                      ) : normalizedApp.includes("fichier") ||
                                        normalizedApp.includes("file") ? (
                                        <FileText className="size-3.5 shrink-0" />
                                      ) : normalizedApp.includes("cours") ||
                                        normalizedApp.includes("formation") ||
                                        normalizedApp.includes("course") ? (
                                        <BookOpen className="size-3.5 shrink-0" />
                                      ) : normalizedApp.includes("paiement") ||
                                        normalizedApp.includes("checkout") ? (
                                        <CreditCard className="size-3.5 shrink-0" />
                                      ) : normalizedApp.includes("support") ||
                                        normalizedApp.includes("chat") ||
                                        normalizedApp.includes("communauté") ||
                                        normalizedApp.includes("community") ? (
                                        <MessageSquare className="size-3.5 shrink-0" />
                                      ) : (
                                        <Package className="size-3.5 shrink-0" />
                                      );
                                      return (
                                        <span
                                          key={`${product.id}-app-${appIndex}`}
                                          title={app}
                                          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300"
                                        >
                                          {appIcon}
                                          <span className="sr-only">{app}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-zinc-500">Non renseigné</span>
                                )}
                              </td>

                              {/* Conversion de paiement */}
                              <td className="py-4 px-4 text-zinc-400 font-mono whitespace-nowrap">
                                {product.conversionRate}
                              </td>

                              {/* Revenu total (dynamically converted to selected main currency) */}
                              <td className="py-4 px-4 text-emerald-400 font-mono font-semibold whitespace-nowrap">
                                {(() => {
                                  const origCurr = (product.currency as CurrencyCode) || "USD";
                                  const rawRev =
                                    (product.priceAmount || 0) * (product.activeUsers || 0);
                                  const convertedRev = convertBetweenCurrencies(
                                    rawRev,
                                    origCurr,
                                    currency,
                                  );
                                  const currConf =
                                    SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD;
                                  const formattedVal =
                                    currConf.decimals === 0
                                      ? Math.round(convertedRev).toLocaleString("fr-FR")
                                      : (Math.round(convertedRev * 100) / 100).toLocaleString(
                                          "fr-FR",
                                          {
                                            minimumFractionDigits: currConf.decimals,
                                            maximumFractionDigits: currConf.decimals,
                                          },
                                        );
                                  return `${formattedVal} ${currConf.symbol}`;
                                })()}
                              </td>

                              {/* Utilisateurs actifs */}
                              <td className="py-4 px-4 font-mono font-semibold text-zinc-300 whitespace-nowrap">
                                {product.activeUsers}
                              </td>

                              {/* Actions: Link icon & 3-dots */}
                              <td className="py-4 px-4 text-right whitespace-nowrap relative">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Copy Link Button */}
                                  <button
                                    onClick={() => {
                                      navigator.clipboard?.writeText?.(
                                        `https://${product.productUrl}`,
                                      );
                                      setCopyFeedbackId(product.id);
                                      setTimeout(() => setCopyFeedbackId(null), 2000);
                                    }}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer relative"
                                    title="Copier le lien du produit"
                                  >
                                    {copyFeedbackId === product.id ? (
                                      <Check className="size-4 text-emerald-400" />
                                    ) : (
                                      <Link className="size-4" />
                                    )}
                                  </button>

                                  {/* Three-dots Menu */}
                                  <div className="relative">
                                    <button
                                      onClick={() =>
                                        setActiveActionMenuId(
                                          activeActionMenuId === product.id ? null : product.id,
                                        )
                                      }
                                      className="p-1.5 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <MoreVertical className="size-4" />
                                    </button>

                                    {activeActionMenuId === product.id && (
                                      <div className="absolute right-0 top-8 z-30 w-44 rounded-xl border border-white/10 bg-[#16181f] p-1.5 shadow-2xl text-left text-xs space-y-0.5">
                                        <button
                                          onClick={() => {
                                            setEditingProduct(product);
                                            setIsProductStudioOpen(true);
                                            setActiveActionMenuId(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 hover:text-white cursor-pointer"
                                        >
                                          <Sparkles className="size-3.5 text-[#0055ff]" />
                                          <span>Modifier le produit</span>
                                        </button>

                                        <button
                                          onClick={() => {
                                            const duplicate = {
                                              ...product,
                                              id: "prod-" + Date.now(),
                                              name: product.name + " (Copie)",
                                            };
                                            setProductsList([...contextProducts, duplicate]);
                                            setActiveActionMenuId(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 hover:text-white cursor-pointer"
                                        >
                                          <Layers className="size-3.5 text-zinc-400" />
                                          <span>Dupliquer</span>
                                        </button>

                                        <div className="border-t border-white/5 my-1" />

                                        <button
                                          onClick={() => {
                                            setProductToDelete(product);
                                            setActiveActionMenuId(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer"
                                        >
                                          <Trash2 className="size-3.5" />
                                          <span>Supprimer</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom Pagination matching screenshot 1 */}
                  <div className="flex shrink-0 flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-white/[0.08] text-xs text-zinc-400">
                    <div>
                      <span>
                        1-{contextProducts.length} de {contextProducts.length} résultats
                      </span>
                    </div>

                    {/* Page Controls */}
                    <div className="flex items-center gap-4 text-xs">
                      <button className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                        «
                      </button>
                      <button className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                        ‹
                      </button>
                      <span className="font-semibold text-white">Page 1 sur 1</span>
                      <button className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                        ›
                      </button>
                      <button className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                        »
                      </button>
                    </div>

                    {/* Lignes par page */}
                    <div className="flex items-center gap-2">
                      <span>Lignes par page</span>
                      <div className="flex items-center gap-1 rounded bg-[#16181f] border border-white/10 px-2 py-0.5 text-white font-mono">
                        <span>20</span>
                        <ChevronDown className="size-3 text-zinc-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW: MESSAGES */}
            {activeNav === "messages" &&
              (isTabLoading ? (
                <div className="max-w-3xl mx-auto space-y-5">
                  <DashboardProductsSkeleton />
                </div>
              ) : (
                <div className="mansa-keyboard-scroll mx-auto flex h-[calc(100dvh-140px)] max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121316]">
                  <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#16171b] px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-400">
                        <MessageSquare className="size-5" />
                      </div>
                      <div>
                        <h1 className="text-sm font-bold text-white">Messages privés</h1>
                        <p className="text-[11px] text-zinc-500">
                          Conversations privées de la communauté
                        </p>
                      </div>
                    </div>
                  </header>
                  <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[300px_1fr]">
                    <aside
                      className={`min-h-0 border-b border-white/10 lg:border-b-0 lg:border-r ${selectedPrivateConversationId ? "hidden lg:block" : "block"}`}
                    >
                      <div className="space-y-2 border-b border-white/10 p-3">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                          <input
                            value={messageSearchQuery}
                            onChange={(event) => setMessageSearchQuery(event.target.value)}
                            placeholder="Rechercher…"
                            className="w-full rounded-xl border border-white/10 bg-[#0c0d0e] py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-emerald-400"
                          />
                        </div>
                        <select
                          value={messageSortOrder}
                          onChange={(event) =>
                            setMessageSortOrder(event.target.value as "recent" | "oldest")
                          }
                          className="rounded-lg border border-white/10 bg-[#0c0d0e] px-2.5 py-2 text-[11px] text-zinc-300 outline-none"
                        >
                          <option value="recent">Dernière activité</option>
                          <option value="oldest">Plus ancienne</option>
                        </select>
                      </div>
                      <div className="max-h-56 overflow-y-auto lg:max-h-none">
                        {visiblePrivateConversations.length === 0 ? (
                          <div className="p-5 text-xs leading-relaxed text-zinc-500">
                            Aucune conversation pour le moment.
                          </div>
                        ) : (
                          visiblePrivateConversations.map((conversation) => {
                            const last = conversation.messages.at(-1);
                            return (
                              <button
                                type="button"
                                key={conversation.id}
                                onClick={() => {
                                  setViewedPrivateProfile(null);
                                  setSelectedPrivateConversationId(conversation.id);
                                }}
                                className={`flex w-full items-start gap-3 border-b border-white/[0.06] p-4 text-left ${selectedPrivateConversationId === conversation.id ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}`}
                              >
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#252830] text-xs font-bold text-white">
                                  {conversation.memberName?.[0]?.toUpperCase() || "M"}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-xs font-semibold text-white">
                                    {conversation.memberName}
                                  </div>
                                  <div className="truncate text-[11px] text-zinc-500">
                                    {conversation.memberEmail}
                                  </div>
                                  <div className="mt-1 truncate text-[11px] text-zinc-400">
                                    {last?.text || "Nouvelle conversation"}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </aside>
                    <main
                      className={`min-h-0 flex-1 flex-col ${selectedPrivateConversationId ? "flex" : "hidden lg:flex"}`}
                    >
                      {(() => {
                        const conversation = privateConversations.find(
                          (item) => item.id === selectedPrivateConversationId,
                        );
                        if (!conversation)
                          return (
                            <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-zinc-500">
                              Sélectionnez une conversation pour consulter le chat.
                            </div>
                          );
                        if (viewedPrivateProfile) {
                          return (
                            <UserProfileView
                              userId={viewedPrivateProfile.userId}
                              fallbackName={viewedPrivateProfile.name}
                              fallbackEmail={viewedPrivateProfile.email}
                              onBack={() => setViewedPrivateProfile(null)}
                            />
                          );
                        }
                        return (
                          <>
                            <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
                              <button
                                type="button"
                                onClick={() => setSelectedPrivateConversationId(null)}
                                className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white lg:hidden"
                                aria-label="Retour à la liste"
                              >
                                <ArrowLeft className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setViewedPrivateProfile({
                                    userId:
                                      activeWorkspaceId === "personnel"
                                        ? conversation.creator_id
                                        : conversation.member_id,
                                    name: conversation.memberName,
                                    email: conversation.memberEmail,
                                  })
                                }
                                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#252830] text-xs font-bold text-white hover:ring-2 hover:ring-emerald-400/50"
                                aria-label="Ouvrir le profil"
                              >
                                {conversation.memberName?.[0]?.toUpperCase() || "M"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setViewedPrivateProfile({
                                    userId:
                                      activeWorkspaceId === "personnel"
                                        ? conversation.creator_id
                                        : conversation.member_id,
                                    name: conversation.memberName,
                                    email: conversation.memberEmail,
                                  })
                                }
                                className="min-w-0 text-left"
                              >
                                <div className="text-sm font-semibold text-white">
                                  {conversation.memberName}
                                </div>
                                <div className="text-[11px] text-zinc-500">
                                  {activeWorkspaceId === "personnel"
                                    ? conversation.communityName || conversation.companyId
                                    : conversation.memberEmail}
                                </div>
                              </button>
                            </div>
                            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                              {conversation.messages.map((item: any) => {
                                const mine =
                                  item.sender ===
                                  (activeWorkspaceId === "personnel" ? "member" : "creator");
                                return (
                                  <div
                                    key={item.id}
                                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                                  >
                                    <div
                                      className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${mine ? "bg-[#00D26A] text-black" : "bg-white/[0.06] text-zinc-200"}`}
                                    >
                                      <div>{item.text}</div>
                                      <div
                                        className={`mt-1 text-[10px] ${mine ? "text-emerald-950" : "text-zinc-500"}`}
                                      >
                                        {item.time}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <form
                              onSubmit={handleSendMessage}
                              className="flex shrink-0 gap-2 border-t border-white/10 p-3 sm:p-4"
                            >
                              <textarea
                                value={newChatInput}
                                onChange={(event) => setNewChatInput(event.target.value)}
                                rows={2}
                                placeholder="Écrire un message…"
                                className="min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-[#101114] p-3 text-xs text-white outline-none focus:border-emerald-400"
                              />
                              <button
                                type="submit"
                                disabled={!newChatInput.trim()}
                                className="ui-btn-primary self-end px-4 py-2.5 text-xs disabled:opacity-40"
                              >
                                <Send className="size-3.5" />
                              </button>
                            </form>
                          </>
                        );
                      })()}
                    </main>
                  </div>
                </div>
              ))}

            {/* VIEW: PAIEMENTS */}
            {activeNav === "paiements" &&
              (isTabLoading ? (
                <div className="max-w-7xl mx-auto space-y-5">
                  <DashboardProductsSkeleton />
                </div>
              ) : (
                <PaymentsView
                  key={activeWorkspaceId}
                  lang={lang}
                  currency={currency}
                  activeWorkspaceId={activeWorkspaceId}
                  {...(activeCompany?.name ? { activeCompanyName: activeCompany.name } : {})}
                />
              ))}

            {/* VIEW: CLIENTS */}
            {activeNav === "clients" &&
              (isTabLoading ? (
                <div className="max-w-7xl mx-auto space-y-5">
                  <DashboardProductsSkeleton />
                </div>
              ) : (
                <CustomersView
                  key={activeWorkspaceId}
                  lang={lang}
                  {...(activeCompany
                    ? { activeCompanyId: activeCompany.id, activeCompanyName: activeCompany.name }
                    : {})}
                />
              ))}

            {/* VIEW: ASSISTANCE (Chat & Support Membres) */}
            {activeNav === "assistance" &&
              (isTabLoading ? (
                <div className="max-w-7xl mx-auto space-y-5">
                  <DashboardProductsSkeleton />
                </div>
              ) : (
                <AssistanceView
                  key={activeWorkspaceId}
                  lang={lang}
                  activeCompany={activeCompany}
                  companies={companies}
                  isPersonalWorkspace={activeWorkspaceId === "personnel"}
                  onNavigateToClients={() => switchTab("clients")}
                />
              ))}

            {/* VIEW: AFFILIÉS */}
            {activeNav === "affilies" &&
              (isTabLoading ? (
                <div className="max-w-7xl mx-auto space-y-5">
                  <DashboardProductsSkeleton />
                </div>
              ) : (
                <AffiliatesView
                  lang={lang}
                  userRefName={user?.name || "johan"}
                  userId={user?.uid || user?.email || "local-user"}
                  isPersonalWorkspace={activeWorkspaceId === "personnel"}
                  currency={currency}
                />
              ))}

            {/* VIEW: APPLICATIONS & INTÉGRATIONS CATALOG */}
            {activeNav === "applications" && (
              <CreatorAppsErrorBoundary
                key={`${activeWorkspaceId}-${creatorAppsLoadAttempt}`}
                onRetry={() => setCreatorAppsLoadAttempt((attempt) => attempt + 1)}
                onBack={() => {
                  setCreatorAppWorkflow(null);
                  setCreatorAppsLoadAttempt((attempt) => attempt + 1);
                }}
              >
                <React.Suspense
                  fallback={
                    <div
                      className="rounded-2xl border border-white/10 bg-[#0c0d0e] p-8 text-center text-sm text-zinc-300"
                      role="status"
                    >
                      Chargement de l’application…
                    </div>
                  }
                >
                  {isTabLoading ? (
                    <div className="max-w-7xl mx-auto space-y-5">
                      <DashboardProductsSkeleton />
                    </div>
                  ) : creatorAppWorkflow ? (
                    !activeCompany || activeCompany.id !== creatorAppWorkflow.companyId ? (
                      <div
                        className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6"
                        role="alert"
                      >
                        <h2 className="text-base font-bold text-white">
                          Entreprise active indisponible
                        </h2>
                        <p className="mt-2 text-sm text-zinc-300">
                          Le workspace ne peut pas s’ouvrir dans ce contexte. Revenez au catalogue
                          et sélectionnez une entreprise avec une offre.
                        </p>
                        <button
                          type="button"
                          onClick={() => setCreatorAppWorkflow(null)}
                          className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300"
                        >
                          Retour aux applications
                        </button>
                      </div>
                    ) : creatorAppWorkflow.app === "courses" ? (
                      <CreatorCoursesWorkspace
                        key={`${activeWorkspaceId}-courses`}
                        creatorId={user?.uid || user?.email || "local-user"}
                        companyId={activeCompany.id}
                        productIds={creatorAppWorkflow.productIds}
                        products={contextProducts}
                        onBack={() => setCreatorAppWorkflow(null)}
                      />
                    ) : (
                      <FilesWorkspace
                        key={`${activeWorkspaceId}-files`}
                        creatorId={user?.uid || user?.email || "local-user"}
                        companyId={activeCompany.id}
                        productIds={creatorAppWorkflow.productIds}
                        products={contextProducts}
                        onBack={() => setCreatorAppWorkflow(null)}
                      />
                    )
                  ) : (
                    <ConnectedAppsView
                      lang={lang}
                      initialSubView="catalog"
                      key={`${activeWorkspaceId}-catalog`}
                      {...(activeCompany
                        ? { companyId: activeCompany.id, companyName: activeCompany.name }
                        : {})}
                      availableProducts={contextProducts.map((p) => ({
                        id: p.id,
                        title: p.title || p.name,
                        priceDisplay: p.priceDisplay || formatCurrency(p.priceAmount, currency),
                        subscribersCount: p.activeUsers || 0,
                      }))}
                      onOpenCoursesWorkflow={(productIds) =>
                        setCreatorAppWorkflow({
                          app: "courses",
                          companyId: activeCompany?.id || "",
                          productIds,
                        })
                      }
                      onOpenFilesWorkflow={(productIds) =>
                        setCreatorAppWorkflow({
                          app: "files",
                          companyId: activeCompany?.id || "",
                          productIds,
                        })
                      }
                    />
                  )}
                </React.Suspense>
              </CreatorAppsErrorBoundary>
            )}

            {/* VIEW: TELEGRAM CONNECTED APP & CHANNELS */}
            {activeNav === "telegram_app" &&
              (isTabLoading ? (
                <div className="max-w-7xl mx-auto space-y-5">
                  <DashboardProductsSkeleton />
                </div>
              ) : (
                <ConnectedAppsView
                  lang={lang}
                  initialSubView="telegram"
                  key={`${activeWorkspaceId}-telegram`}
                  availableProducts={contextProducts.map((p) => ({
                    id: p.id,
                    title: p.title || p.name,
                    priceDisplay: p.priceDisplay || formatCurrency(p.priceAmount, currency),
                    subscribersCount: p.activeUsers || 0,
                  }))}
                />
              ))}

            {/* VIEW: DISCORD CONNECTED APP & SERVERS */}
            {activeNav === "discord_app" &&
              (isTabLoading ? (
                <div className="max-w-7xl mx-auto space-y-5">
                  <DashboardProductsSkeleton />
                </div>
              ) : (
                <ConnectedAppsView
                  lang={lang}
                  initialSubView="discord"
                  key={`${activeWorkspaceId}-discord`}
                  availableProducts={contextProducts.map((p) => ({
                    id: p.id,
                    title: p.title || p.name,
                    priceDisplay: p.priceDisplay || formatCurrency(p.priceAmount, currency),
                    subscribersCount: p.activeUsers || 0,
                  }))}
                />
              ))}

            {/* VIEW: DÉCOUVRIR LES AUTRES CRÉATEURS */}
            {activeNav === "decouvrir" &&
              (isTabLoading ? (
                <div className="max-w-7xl mx-auto space-y-5">
                  <DashboardProductsSkeleton />
                </div>
              ) : (
                <DiscoverCreatorsView
                  lang={lang}
                  user={user}
                  onNavigateToEnterprise={handleVisitEnterpriseFromDiscover}
                />
              ))}

            {/* VIEW: PARAMÈTRES DU COMPTE */}
            {activeNav === "parametres_compte" &&
              (isTabLoading ? (
                <div className="max-w-7xl mx-auto space-y-5">
                  <DashboardProductsSkeleton />
                </div>
              ) : (
                <SettingsView
                  lang={lang}
                  user={user}
                  onLogout={onLogout}
                  onDeleteAccount={deleteAccount}
                  initialTab="account"
                  {...(activeCompany
                    ? { activeCompanyId: activeCompany.id, activeCompanyName: activeCompany.name }
                    : {})}
                />
              ))}

            {/* VIEW: PARAMÈTRES DE L'ENTREPRISE */}
            {(activeNav === "parametres_entreprise" ||
              activeNav === "parametres_boutique" ||
              activeNav === "parametres") &&
              activeCompany &&
              (isTabLoading ? (
                <div className="max-w-7xl mx-auto space-y-5">
                  <DashboardProductsSkeleton />
                </div>
              ) : (
                <SettingsView
                  lang={lang}
                  user={user}
                  onLogout={onLogout}
                  onDeleteAccount={deleteAccount}
                  initialTab="store"
                  key={`${activeWorkspaceId}-company-settings`}
                  {...(activeCompany
                    ? { activeCompanyId: activeCompany.id, activeCompanyName: activeCompany.name }
                    : {})}
                />
              ))}

            {/* VIEW: MAIN D'OEUVRE & EQUIPE */}
            {(activeNav === "workforce" ||
              activeNav === "main_doeuvre" ||
              activeNav === "equipe") &&
              (isTabLoading ? (
                <div className="max-w-7xl mx-auto space-y-5">
                  <DashboardProductsSkeleton />
                </div>
              ) : (
                <WorkforceView
                  key={activeWorkspaceId}
                  lang={lang}
                  user={user}
                  {...(activeCompany
                    ? { activeCompanyId: activeCompany.id, activeCompanyName: activeCompany.name }
                    : {})}
                />
              ))}

            {/* VIEW: PARTENAIRES & COLLABORATIONS */}
            {(activeNav === "partenaires" || activeNav === "partners") &&
              (isTabLoading ? (
                <div className="max-w-7xl mx-auto space-y-5">
                  <DashboardProductsSkeleton />
                </div>
              ) : (
                <PartnersView
                  key={activeWorkspaceId}
                  lang={lang}
                  user={user}
                  {...(activeCompany
                    ? { activeCompanyId: activeCompany.id, activeCompanyName: activeCompany.name }
                    : {})}
                />
              ))}
          </main>
        </div>
      )}

      {/* Navigation mobile globale : uniquement les espaces réellement disponibles. */}
      {!isProductStudioOpen && !isMemberCheckoutOpen && (
        <nav
          className="mansa-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0b0c0f]/95 px-1.5 pt-2 backdrop-blur-xl lg:hidden"
          aria-label="Navigation mobile"
        >
          <div className="mx-auto grid max-w-xl grid-cols-4 gap-0.5">
            <button
              type="button"
              onClick={() => {
                setActiveWorkspaceId("personnel");
                switchTab("accueil");
              }}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-colors ${activeNav === "accueil" && activeWorkspaceId === "personnel" ? "bg-white/10 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"}`}
            >
              <LayoutGrid className="size-5" />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              onClick={() =>
                uniqueCompanies.length > 0
                  ? handleOpenCompanyCommunity(uniqueCompanies[0])
                  : switchTab("communaute")
              }
              className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-colors ${activeNav === "communaute" ? "bg-white/10 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"}`}
            >
              <UsersIcon className="size-5" />
              <span>Communauté</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab("decouvrir")}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-colors ${activeNav === "decouvrir" ? "bg-white/10 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"}`}
            >
              <Compass className="size-5" />
              <span>Découvrir</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAccountSettingsInitialTab("profil");
                setIsAccountSettingsModalOpen(true);
              }}
              className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
            >
              <div className="flex size-5 items-center justify-center rounded-full mansa-profile-avatar text-[9px]">
                {user?.avatarInitials || "U"}
              </div>
              <span>Compte</span>
            </button>
          </div>
        </nav>
      )}

      {/* SEARCH MODAL (⌘K) */}
      {isSearchOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSearchOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-md pt-20 p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#121316] shadow-2xl overflow-hidden cursor-default"
          >
            <div className="flex items-center gap-3 p-4 border-b border-white/10">
              <Search className="size-4 text-[#00D26A]" />
              <input
                type="text"
                autoFocus
                placeholder="Rechercher dans votre espace Mansa (Commandes, Clients, Produits)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white flex items-center justify-center min-w-[32px] min-h-[32px] cursor-pointer"
                aria-label="Fermer"
              >
                <X className="size-4 sm:hidden" />
                <span className="hidden sm:inline text-xs font-mono text-zinc-500">ESC</span>
              </button>
            </div>

            <div className="p-3 text-xs text-zinc-400 space-y-1">
              <div
                onClick={() => {
                  switchTab("accueil");
                  setIsSearchOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-white/5 hover:text-white cursor-pointer flex items-center justify-between"
              >
                <span>Tableau de bord & Soldes</span>
                <span className="font-mono text-[10px] text-zinc-500">Vue principale</span>
              </div>
              <div
                onClick={() => {
                  switchTab("accueil");
                  setIsSearchOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-white/5 hover:text-white cursor-pointer flex items-center justify-between"
              >
                <span>📈 Analyse des Revenus (Recharts 30j)</span>
                <span className="font-mono text-[10px] text-[#00D26A]">Analytics</span>
              </div>
              <div
                onClick={() => {
                  switchTab("accueil");
                  setIsSearchOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-white/5 hover:text-white cursor-pointer flex items-center justify-between"
              >
                <span>📥 Exporter les statistiques de revenus en CSV (30j)</span>
                <span className="font-mono text-[10px] text-[#00D26A]">Export CSV</span>
              </div>
              <div
                onClick={() => {
                  switchTab("produits");
                  setIsSearchOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-white/5 hover:text-white cursor-pointer flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="size-3.5 text-[#00D26A]" />
                  <span>Mes Projets & Entreprises IA</span>
                </span>
                <span className="font-mono text-[10px] text-[#00D26A] font-semibold">
                  {projects.length} projets
                </span>
              </div>
              <div
                onClick={() => {
                  switchTab("produits");
                  setIsSearchOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-white/5 hover:text-white cursor-pointer flex items-center justify-between"
              >
                <span>Produits & Offres numériques</span>
                <span className="font-mono text-[10px] text-emerald-400">
                  {contextProducts.length} actifs
                </span>
              </div>
              <div
                onClick={() => {
                  switchTab("paiements");
                  setIsSearchOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-white/5 hover:text-white cursor-pointer flex items-center justify-between"
              >
                <span>Paiements & Trésorerie</span>
                <span className="font-mono text-[10px] text-zinc-500">Transactions</span>
              </div>
              <div
                onClick={() => {
                  switchTab("clients");
                  setIsSearchOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-white/5 hover:text-white cursor-pointer flex items-center justify-between"
              >
                <span>Membres & Abonnements</span>
                <span className="font-mono text-[10px] text-zinc-500">Gestion</span>
              </div>
              <div
                onClick={() => {
                  switchTab("assistance");
                  setIsSearchOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-white/5 hover:text-white cursor-pointer flex items-center justify-between"
              >
                <span>Assistance (Chat avec les membres)</span>
                <span className="font-mono text-[10px] text-emerald-400">Direct</span>
              </div>
              <div
                onClick={() => {
                  switchTab("applications");
                  setIsSearchOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-white/5 hover:text-white cursor-pointer flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Plus className="size-3.5 text-[#0055ff]" />
                  <span>+ Ajouter une application (Telegram, Discord, Cours, Fichiers...)</span>
                </span>
                <span className="font-mono text-[10px] text-[#0055ff]">App Store</span>
              </div>
              <div
                onClick={() => {
                  switchTab("telegram_app");
                  setIsSearchOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-white/5 hover:text-white cursor-pointer flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <TelegramIcon className="size-3.5" />
                  <span>Telegram : Canaux, Groupes & Bot de Vérification</span>
                </span>
                <span className="font-mono text-[10px] text-[#229ED9]">Telegram App</span>
              </div>
              <div
                onClick={() => {
                  switchTab("discord_app");
                  setIsSearchOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-white/5 hover:text-white cursor-pointer flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <DiscordIcon className="size-3.5" />
                  <span>Discord : Serveurs & Gestion des Rôles VIP</span>
                </span>
                <span className="font-mono text-[10px] text-[#8c97f8]">Discord App</span>
              </div>
              <div
                onClick={() => {
                  setAccountSettingsInitialTab("commandes");
                  setIsAccountSettingsModalOpen(true);
                  setIsSearchOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-white/5 hover:text-white cursor-pointer flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag className="size-3.5 text-emerald-400" />
                  <span>Activité</span>
                </span>
                <span className="font-mono text-[10px] text-emerald-400">
                  Entreprises et produits
                </span>
              </div>
              {isCreatorCompanySelected && (
                <div
                  onClick={() => {
                    setEditingProduct(null);
                    setIsProductStudioOpen(true);
                    setIsSearchOpen(false);
                  }}
                  className="p-2 rounded-lg hover:bg-white/5 hover:text-white cursor-pointer flex items-center justify-between"
                >
                  <span>Créer un nouveau produit</span>
                  <span className="font-mono text-[10px] text-emerald-400">Studio Mansa</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT CREATION STUDIO MODAL */}
      {isProductStudioOpen && activeCompany && (
        <ProductCreationStudio
          key={`${activeWorkspaceId}:${activeEditingProduct?.id ?? "new"}`}
          companyName={activeCompany.name}
          companies={[activeCompany]}
          initialCompanyId={activeCompany.id}
          {...(activeEditingProduct ? { initialData: activeEditingProduct } : {})}
          activeCurrency={currency}
          onCurrencyChange={(newCurr) => {
            setCurrency(newCurr);
            setStoredCurrency(newCurr);
          }}
          onClose={() => {
            setIsProductStudioOpen(false);
            setEditingProduct(null);
          }}
          onSave={async (newProduct) => {
            const creatorKey = user?.uid || user?.email || "creator-default";
            await saveProductToFirestore(creatorKey, user?.email || "", user?.name || "Créateur", {
              id: activeEditingProduct ? activeEditingProduct.id : newProduct.id,
              name: newProduct.name,
              description: newProduct.description,
              category: "community",
              priceAmount: newProduct.priceAmount,
              pricingType: newProduct.pricingType,
              billingCycle: newProduct.billingCycle,
              currency: newProduct.currency || currency || "USD",
              includedApps: newProduct.includedApps,
              affiliateRate: newProduct.affiliateRate ?? 25,
              productUrl: newProduct.productUrl,
              ctaText: newProduct.ctaText,
              ...(newProduct.imageUrl ? { coverImage: newProduct.imageUrl } : {}),
              ...(newProduct.bannerUrl ? { bannerUrl: newProduct.bannerUrl } : {}),
              companyId: newProduct.companyId || activeCompany.id,
              companyName: newProduct.companyName || activeCompany.name,
              productType: newProduct.productType,
              digitalFiles: newProduct.digitalFiles || [],
              courseModules: newProduct.courseModules || [],
              visibility: newProduct.visibility,
            });
            setIsProductStudioOpen(false);
            setEditingProduct(null);
            setActiveNav("produits");
          }}
          onDelete={async (productId) => {
            await deleteProductFromFirestore(
              productId,
              user?.uid || user?.email || "creator-default",
            );
            setIsProductStudioOpen(false);
            setEditingProduct(null);
          }}
          lang={lang}
        />
      )}

      {/* CONFIRM PRODUCT DELETION MODAL */}
      {productToDelete && (
        <ConfirmActionModal
          isOpen={!!productToDelete}
          onClose={() => setProductToDelete(null)}
          onConfirm={async () => {
            if (productToDelete.id) {
              await deleteProductFromFirestore(
                productToDelete.id,
                user?.uid || user?.email || "creator-default",
              );
            }
            setProductToDelete(null);
          }}
          title={
            lang === "fr"
              ? "Supprimer définitivement ce produit ?"
              : "Permanently delete this product?"
          }
          description={
            lang === "fr"
              ? "Êtes-vous certain de vouloir supprimer cette offre ? Cette action est irréversible et supprimera le produit de votre catalogue."
              : "Are you sure you want to delete this product? This action is irreversible and will remove the product from your catalog."
          }
          itemName={productToDelete.name}
          itemType={lang === "fr" ? "Produit Mansa" : "Mansa Product"}
          itemDetails={[
            { label: "Tarif", value: productToDelete.priceDisplay },
            { label: "Visibilité", value: productToDelete.visibility },
            { label: "Utilisateurs actifs", value: String(productToDelete.activeUsers) },
            { label: "URL de vente", value: productToDelete.productUrl },
          ]}
          consequences={[
            lang === "fr"
              ? "La vitrine de vente Mansa et le lien de paiement public cesseront de fonctionner."
              : "The Mansa storefront and public payment link will stop working immediately.",
            lang === "fr"
              ? "Les automatisations de synchronisation Discord / Telegram ne distribueront plus de nouveaux rôles."
              : "Discord / Telegram bot sync will no longer distribute new roles.",
            lang === "fr"
              ? "L'historique comptable des paiements passés reste archivé en toute sécurité."
              : "Past payment accounting history remains securely archived.",
          ]}
          confirmButtonText={lang === "fr" ? "Supprimer le produit" : "Delete Product"}
          cancelButtonText={lang === "fr" ? "Annuler" : "Cancel"}
          variant="danger"
          lang={lang}
        />
      )}

      {/* CONFIRM PROJECT DELETION MODAL */}
      {projectToDelete && (
        <ConfirmActionModal
          isOpen={!!projectToDelete}
          onClose={() => setProjectToDelete(null)}
          onConfirm={async () => {
            if (projectToDelete.id) {
              await deleteProductFromFirestore(
                projectToDelete.id,
                user?.uid || user?.email || "creator-default",
              );
            }
            setProjectToDelete(null);
          }}
          title={lang === "fr" ? "Supprimer ce projet de boutique ?" : "Delete this store project?"}
          description={
            lang === "fr"
              ? `Êtes-vous sûr de vouloir supprimer définitivement le projet "${projectToDelete.name}" ? Toutes ses données associées seront effacées.`
              : `Are you sure you want to permanently delete the project "${projectToDelete.name}"? All associated data will be removed.`
          }
          itemName={projectToDelete.name}
          itemType={lang === "fr" ? "Projet Mansa" : "Mansa Project"}
          itemDetails={[
            { label: "Catégorie", value: projectToDelete.category },
            { label: "Statut", value: projectToDelete.status },
            { label: "Membres", value: String(projectToDelete.membersCount) },
          ]}
          confirmButtonText={lang === "fr" ? "Supprimer le projet" : "Delete Project"}
          cancelButtonText={lang === "fr" ? "Annuler" : "Cancel"}
          variant="danger"
          lang={lang}
        />
      )}

      {/* PRODUCT TELEGRAM LINK & CHANGE MODAL */}
      {isTelegramLinkModalOpen && telegramLinkModalProduct && (
        <ProductTelegramLinkModal
          isOpen={isTelegramLinkModalOpen}
          onClose={() => {
            setIsTelegramLinkModalOpen(false);
            setTelegramLinkModalProduct(null);
          }}
          product={telegramLinkModalProduct}
          onSaveProductTelegram={(productId, channelName, channelId) => {
            setProductsList((prev) =>
              prev.map((p) =>
                p.id === productId
                  ? {
                      ...p,
                      communityConfig: {
                        ...(p.communityConfig || {
                          discordEnabled: false,
                          discordServerId: "",
                          discordServerName: "",
                          discordRoleName: "",
                        }),
                        telegramEnabled: true,
                        telegramChannelName: channelName,
                        telegramChannelId: channelId || "",
                      },
                    }
                  : p,
              ),
            );
            setIsTelegramLinkModalOpen(false);
            setTelegramLinkModalProduct(null);
          }}
        />
      )}

      {/* ACCOUNT SETTINGS MODAL */}
      {isAccountSettingsModalOpen && (
        <AccountSettingsModal
          isOpen={isAccountSettingsModalOpen}
          onClose={() => setIsAccountSettingsModalOpen(false)}
          user={user}
          onLogout={onLogout}
          onDeleteAccount={deleteAccount}
          lang={lang}
          initialTab={accountSettingsInitialTab}
          onOpenCompany={handleVisitEnterpriseFromDiscover}
        />
      )}

      {/* NEW COMPANY ONBOARDING MODAL */}
      {isCompanyOnboardingOpen && (
        <CompanyOnboardingModal
          isOpen={isCompanyOnboardingOpen}
          onClose={() => setIsCompanyOnboardingOpen(false)}
          onCompanyCreated={handleCompanyCreated}
          lang={lang}
        />
      )}
    </div>
  );
};
