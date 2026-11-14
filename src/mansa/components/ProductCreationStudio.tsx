// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Monitor,
  Smartphone,
  Users,
  Upload,
  Image as ImageIcon,
  Plus,
  HelpCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  GraduationCap,
  FileText,
  Send,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Settings as SettingsIcon,
  Download,
  FolderArchive,
  BookOpen,
  ArrowRight,
  Lock,
  MessageCircle,
  FileCheck,
  ExternalLink,
  Bot,
  Star,
  Zap,
  Globe,
  Share2,
  Music,
  Sparkles,
} from "lucide-react";
import { CreatorBotSetupModal, CreatorCommunityConfig } from "./CreatorBotSetupModal";
import { DiscordIcon, TelegramIcon } from "./common/Icons";
import { ConfirmActionModal } from "./common/ConfirmActionModal";
import { ModalOverlay } from "./common/ModalOverlay";
import { AudioPreview30sPlayer } from "./common/AudioPreview30sPlayer";
import { CurrencySelector } from "./dashboard/CurrencySelector";
import { siteUrl } from "@/lib/site";
import { getUserFacingErrorMessage } from "../utils/userFacingError";
import { CheckoutPreviewModal } from "./dashboard/CheckoutPreviewModal";
import { getStoredTelegramChannels, TelegramChannelItem } from "../utils/telegramStorage";
import type { Company } from "../types";
import { saveDigitalAsset } from "../utils/digitalAssetStorage";
import {
  CurrencyCode,
  SUPPORTED_CURRENCIES,
  detectUserLocationAndCurrency,
  getStoredCurrency,
  setStoredCurrency,
  convertBetweenCurrencies,
  formatConvertedNumericPrice,
  formatCurrency,
} from "../utils/currency";

const createLocalId = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

export type ProductTypeCategory = "digital" | "course" | "ebook" | "membership";

export interface DigitalFileAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  isFreePreview?: boolean;
  downloadUrl?: string;
  storageKey?: string;
  isAudio?: boolean;
  audioPreviewSeconds?: number;
}

export interface CourseModuleItem {
  id: string;
  title: string;
  duration: string;
}

export interface PricingOption {
  id: string;
  name: string;
  price: number;
  currency: CurrencyCode;
  billing: "monthly" | "yearly" | "one_time" | "free";
  subscribersCount: number;
}

export interface FaqItem {
  id: string;
  q: string;
  a: string;
}

export interface CreatedProductData {
  id: string;
  productType: ProductTypeCategory;
  name: string;
  priceDisplay: string;
  priceAmount: number;
  currency: CurrencyCode;
  pricingType: "free" | "paid";
  billingCycle: "one_time" | "monthly" | "yearly";
  visibility: "Visible" | "Caché";
  discoverStatus: string;
  includedApps: string[];
  conversionRate: string;
  totalRevenue: string;
  activeUsers: number;
  imageUrl?: string;
  bannerUrl?: string;
  title: string;
  description: string;
  storeName?: string;
  companyId?: string;
  companyName?: string;
  productUrl: string;
  affiliateRate: number;
  ctaText: string;
  pricingOptions?: PricingOption[];
  faqs?: FaqItem[];
  digitalFiles?: DigitalFileAttachment[];
  courseModules?: CourseModuleItem[];
  ebookDetails?: {
    format: string;
    pageCount: number;
    previewExcerpt: string;
  };
  communityConfig?: CreatorCommunityConfig;
}

interface ProductCreationStudioProps {
  isOpen?: boolean;
  onClose: () => void;
  onSave?: (product: CreatedProductData) => void;
  onSaveProduct?: (product: CreatedProductData) => void;
  onDelete?: (productId: string) => void;
  initialData?: Partial<CreatedProductData>;
  lang?: "fr" | "en";
  activeCurrency?: CurrencyCode;
  onCurrencyChange?: (currency: CurrencyCode) => void;
  companyName?: string;
  companies?: Company[];
  initialCompanyId?: string;
}

export const ProductCreationStudio: React.FC<ProductCreationStudioProps> = ({
  onClose,
  onSave,
  onSaveProduct,
  onDelete,
  initialData,
  lang = "fr",
  activeCurrency,
  onCurrencyChange,
  companyName,
  companies = [],
  initialCompanyId,
}) => {
  const handleSave = onSave || onSaveProduct || (() => {});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    initialData?.companyId || initialCompanyId || companies[0]?.id || "",
  );
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const selectedCompanyCurrencyCode = selectedCompany?.primaryCurrency as CurrencyCode | undefined;
  const selectedCompanyCurrency =
    selectedCompanyCurrencyCode && SUPPORTED_CURRENCIES[selectedCompanyCurrencyCode]
      ? selectedCompanyCurrencyCode
      : undefined;
  const effectiveCompanyName =
    selectedCompany?.name ||
    companyName ||
    initialData?.companyName ||
    initialData?.storeName ||
    "Créateur";
  const [productId] = useState(() => initialData?.id || `prod-${Date.now()}`);

  useEffect(() => {
    if (!selectedCompanyId && (initialCompanyId || companies[0]?.id)) {
      setSelectedCompanyId(initialCompanyId || companies[0].id);
    }
  }, [selectedCompanyId, initialCompanyId, companies]);

  // Community product prices use the community's primary currency, not the creator's account currency.
  const initialCurrency: CurrencyCode =
    selectedCompanyCurrency || initialData?.currency || activeCurrency || getStoredCurrency();
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyCode>(initialCurrency);

  // 4 Core Product Sections
  const [productType, setProductType] = useState<ProductTypeCategory>(
    (initialData?.productType as ProductTypeCategory) || "membership",
  );

  // View mode switcher: desktop / mobile / member
  const [viewMode, setViewMode] = useState<"desktop" | "mobile" | "member">("desktop");

  // Preview write / preview tab state for description editor
  const [descTab, setDescTab] = useState<"write" | "preview">("write");

  // Single Synchronized Source of Truth for Offer Name & Title
  const [productName, setProductName] = useState(initialData?.name || initialData?.title || "");

  // Store/Enterprise Name (Locked to effective company name)
  const [storeName, setStoreName] = useState(effectiveCompanyName);

  useEffect(() => {
    if (effectiveCompanyName) {
      setStoreName(effectiveCompanyName);
    }
  }, [effectiveCompanyName]);

  // Product Description (fully synchronized between left form and right preview)
  const [productDescription, setProductDescription] = useState(initialData?.description || "");

  // Tags
  const [tags, setTags] = useState<string[]>(
    productType === "membership"
      ? ["vip", "communauté"]
      : productType === "digital"
        ? ["fichier", "téléchargement", "templates"]
        : productType === "course"
          ? ["formation", "vidéo", "cours"]
          : ["ebook", "guide", "pdf", "epub"],
  );
  const [tagInput, setTagInput] = useState("");
  const [collectShipping, setCollectShipping] = useState(false);

  // Base USD template prices
  const defaultBasePriceUSD =
    productType === "membership"
      ? 29
      : productType === "ebook"
        ? 19
        : productType === "course"
          ? 49
          : 39;

  // Initial computed price amount converted to active currency
  const getInitialPriceAmount = (): string => {
    if (initialData?.priceAmount !== undefined) {
      if (initialData.currency && initialData.currency !== initialCurrency) {
        return formatConvertedNumericPrice(
          initialData.priceAmount,
          initialData.currency,
          initialCurrency,
        );
      }
      return initialData.priceAmount.toString();
    }
    return formatConvertedNumericPrice(defaultBasePriceUSD, "USD", initialCurrency);
  };

  // Pricing state
  const [pricingType, setPricingType] = useState<"free" | "paid">(
    initialData?.pricingType || "paid",
  );
  const [priceAmount, setPriceAmount] = useState<string>(getInitialPriceAmount());
  const [billingCycle, setBillingCycle] = useState<"one_time" | "monthly" | "yearly">(
    initialData?.billingCycle || (productType === "membership" ? "monthly" : "one_time"),
  );

  // Multiple Pricing Options
  const initialNumericPrice = parseFloat(priceAmount) || 0;
  const initialCurrencyConfig = SUPPORTED_CURRENCIES[currentCurrency] || SUPPORTED_CURRENCIES.USD;
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>(
    initialData?.pricingOptions || [
      {
        id: "plan-1",
        name: `${initialNumericPrice} ${initialCurrencyConfig.symbol} ${productType === "membership" ? "par mois" : "paiement unique"}`,
        price: initialNumericPrice,
        currency: currentCurrency,
        billing: productType === "membership" ? "monthly" : "one_time",
        subscribersCount: 0,
      },
    ],
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    initialData?.pricingOptions?.[0]?.id || "plan-1",
  );
  const selectedPreviewPlan =
    pricingOptions.find((option) => option.id === selectedPlanId) || pricingOptions[0];
  const [isAddingPricingOption, setIsAddingPricingOption] = useState(false);
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionPrice, setNewOptionPrice] = useState(
    formatConvertedNumericPrice(49, "USD", initialCurrency),
  );
  const [newOptionBilling, setNewOptionBilling] = useState<"monthly" | "yearly" | "one_time">(
    "monthly",
  );

  // Currency switcher with automatic conversion of configured prices and plans
  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    if (selectedCompanyCurrency) return;
    if (newCurrency === currentCurrency) return;
    const oldCurrency = currentCurrency;

    // Convert main price
    const numericPrice = parseFloat(priceAmount);
    if (!isNaN(numericPrice) && numericPrice > 0) {
      const convertedStr = formatConvertedNumericPrice(numericPrice, oldCurrency, newCurrency);
      setPriceAmount(convertedStr);
    }

    // Convert newOptionPrice
    const numericNewOpt = parseFloat(newOptionPrice);
    if (!isNaN(numericNewOpt) && numericNewOpt > 0) {
      const convertedOptStr = formatConvertedNumericPrice(numericNewOpt, oldCurrency, newCurrency);
      setNewOptionPrice(convertedOptStr);
    }

    // Convert existing pricing options
    const newConfig = SUPPORTED_CURRENCIES[newCurrency] || SUPPORTED_CURRENCIES.USD;
    setPricingOptions((prev) =>
      prev.map((opt) => {
        const convertedOptPrice = convertBetweenCurrencies(opt.price, oldCurrency, newCurrency);
        const roundedOptPrice =
          newConfig.decimals === 0
            ? Math.round(convertedOptPrice)
            : Math.round(convertedOptPrice * 100) / 100;
        return {
          ...opt,
          currency: newCurrency,
          price: roundedOptPrice,
          name: `${roundedOptPrice} ${newConfig.symbol} ${
            opt.billing === "monthly"
              ? "par mois"
              : opt.billing === "yearly"
                ? "par an"
                : opt.billing === "free"
                  ? "(Accès gratuit)"
                  : "paiement unique"
          }`,
        };
      }),
    );

    setCurrentCurrency(newCurrency);
    setStoredCurrency(newCurrency);
    if (onCurrencyChange) {
      onCurrencyChange(newCurrency);
    }
  };

  // Keep plan-1 synced when main price, billing, or currency changes
  useEffect(() => {
    const numericPrice = parseFloat(priceAmount) || 0;
    const currencyConfig = SUPPORTED_CURRENCIES[currentCurrency] || SUPPORTED_CURRENCIES.USD;
    const symbol = currencyConfig.symbol;
    const billingText =
      pricingType === "free"
        ? "Gratuit"
        : billingCycle === "monthly"
          ? `${numericPrice} ${symbol} par mois`
          : billingCycle === "yearly"
            ? `${numericPrice} ${symbol} par an`
            : `${numericPrice} ${symbol} paiement unique`;

    setPricingOptions((prev) => {
      if (prev.length === 0) {
        return [
          {
            id: "plan-1",
            name: billingText,
            price: numericPrice,
            currency: currentCurrency,
            billing: pricingType === "free" ? "free" : billingCycle,
            subscribersCount: 0,
          },
        ];
      }
      return prev.map((p, idx) =>
        idx === 0
          ? {
              ...p,
              name: billingText,
              price: numericPrice,
              currency: currentCurrency,
              billing: pricingType === "free" ? "free" : billingCycle,
            }
          : p,
      );
    });
  }, [priceAmount, billingCycle, pricingType, currentCurrency]);

  // Digital files & E-book upload documents (Only default for ebook and digital type, empty for membership/course)
  const [digitalFiles, setDigitalFiles] = useState<DigitalFileAttachment[]>(
    initialData?.digitalFiles || [],
  );
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);

  // Course modules
  const [courseModules, setCourseModules] = useState<CourseModuleItem[]>(
    initialData?.courseModules || [],
  );

  // Ebook details
  const [pageCount, setPageCount] = useState(initialData?.ebookDetails?.pageCount || 96);
  const [ebookFormat, setEbookFormat] = useState(initialData?.ebookDetails?.format || "PDF & ePub");

  // 4 Official Valid Mansa Apps
  const VALID_MANSA_APPS = ["Telegram", "Discord", "Fichiers", "Cours & formations"];

  // Helper to render official app icon
  const renderAppIcon = (appName: string, sizeClass = "size-3.5") => {
    switch (appName) {
      case "Discord":
      case "Communauté VIP Discord":
        return <DiscordIcon className={`${sizeClass} shrink-0`} />;
      case "Telegram":
      case "Canal privé Telegram":
        return <TelegramIcon className={`${sizeClass} shrink-0`} />;
      case "Fichiers":
      case "Fichiers & Documents":
      case "Téléchargement instantané":
        return <FileText className={`${sizeClass} text-emerald-400 shrink-0`} />;
      case "Cours & formations":
      case "Formation":
        return <GraduationCap className={`${sizeClass} text-indigo-400 shrink-0`} />;
      default:
        return <CheckCircle2 className={`${sizeClass} text-[#3DDC84] shrink-0`} />;
    }
  };

  // Course modules creation & edition state
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDuration, setNewModuleDuration] = useState("25 min");
  const [isAddingCourseModule, setIsAddingCourseModule] = useState(false);

  const handleAddCourseModule = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newModuleTitle.trim()) return;
    const newMod: CourseModuleItem = {
      id: createLocalId("mod"),
      title: newModuleTitle.trim(),
      duration: newModuleDuration.trim() || "20 min",
    };
    setCourseModules((previous) => [...previous, newMod]);
    setNewModuleTitle("");
    setNewModuleDuration("25 min");
    setIsAddingCourseModule(false);
  };

  const handleRemoveCourseModule = (id: string) => {
    setCourseModules((previous) => previous.filter((m) => m.id !== id));
  };

  const sanitizeApps = (apps?: string[]): string[] => {
    if (!apps || apps.length === 0) return [];
    return apps.filter((a) => VALID_MANSA_APPS.includes(a));
  };

  // Règle stricte : Les étiquettes ou options ne doivent jamais être présélectionnées par défaut.
  // L'utilisateur doit obligatoirement faire un choix explicite.
  const [selectedApps, setSelectedApps] = useState<string[]>(() => {
    return initialData?.includedApps ? sanitizeApps(initialData.includedApps) : [];
  });

  // La sélection explicite d’applications détermine celles qui sont incluses dans l’offre.
  const effectivePreviewApps = sanitizeApps(selectedApps);
  const customerFacingApps = effectivePreviewApps.filter(
    (app) => !/(cours|course|formation)/i.test(app),
  );

  // CTA Text
  const [ctaButtonText, setCtaButtonText] = useState(
    initialData?.ctaText ||
      (productType === "membership"
        ? "Rejoindre maintenant"
        : productType === "digital"
          ? "Télécharger maintenant"
          : productType === "course"
            ? "Accéder à la formation"
            : "Acheter l'e-book"),
  );

  const [customUrl, setCustomUrl] = useState(
    initialData?.productUrl ||
      siteUrl(
        `/mon-espace/${productName.toLowerCase().replace(/[^a-z0-9]/g, "-") || "mon-produit"}`,
      ),
  );
  const [enableAffiliate, setEnableAffiliate] = useState((initialData?.affiliateRate ?? 30) > 0);
  const [affiliateRate, setAffiliateRate] = useState(
    Math.min(100, Math.max(0, initialData?.affiliateRate ?? 30)),
  );
  const [storefrontVisible, setStorefrontVisible] = useState(initialData?.visibility !== "Caché");
  const [isProductSettingsOpen, setIsProductSettingsOpen] = useState(false);
  const [isListedOnDiscover, setIsListedOnDiscover] = useState(
    initialData?.discoverStatus !== "Non répertorié",
  );

  // Images
  const [productImage, setProductImage] = useState<string | null>(initialData?.imageUrl || null);
  const [bannerImage, setBannerImage] = useState<string | null>(initialData?.bannerUrl || null);
  const [isCheckoutPreviewOpen, setIsCheckoutPreviewOpen] = useState(false);
  const bannerImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const reminderImage = bannerImage || productImage;

  const productImageFileInputRef = useRef<HTMLInputElement | null>(null);

  const processImageUpload = (file: File, onImageLoaded: (image: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const source = reader.result;
      const image = new Image();
      image.onload = () => {
        if (!image.naturalWidth || !image.naturalHeight) {
          onImageLoaded(source);
          return;
        }
        const scale = Math.min(1, 1280 / image.naturalWidth, 720 / image.naturalHeight);
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          onImageLoaded(source);
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        onImageLoaded(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => onImageLoaded(source);
      image.src = source;
    };
    reader.readAsDataURL(file);
  };

  const handleBannerImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) processImageUpload(file, (image) => setBannerImage(image));
  };

  const handleProductImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    processImageUpload(file, (image) => setProductImage(image));
  };

  // FAQs (Fully editable from the preview & form)
  const [faqs, setFaqs] = useState<FaqItem[]>(
    initialData?.faqs || [
      {
        id: "faq-1",
        q: "Comment puis-je accéder à mon contenu après l'achat ?",
        a: "Dès la confirmation du paiement, vous recevez un accès immédiat avec invitations automatiques Discord & Telegram et vos fichiers sécurisés.",
      },
      {
        id: "faq-2",
        q: "Quels sont les moyens de paiement acceptés ?",
        a: "Cartes bancaires (Visa, Mastercard), Apple Pay, Google Pay ainsi que Mobile Money (Orange Money, Wave, MTN, Moov) selon votre pays.",
      },
    ],
  );
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>("faq-1");
  const [isAddingFaq, setIsAddingFaq] = useState(false);
  const [newFaqQ, setNewFaqQ] = useState("");
  const [newFaqA, setNewFaqA] = useState("");

  // Configuration Bot & Communauté : aucune fausse présélection par défaut
  const [communityConfig, setCommunityConfig] = useState<CreatorCommunityConfig>(
    initialData?.communityConfig || {
      discordEnabled: false,
      discordServerId: "",
      discordServerName: "",
      discordRoleName: "",
      telegramEnabled: false,
      telegramChannelId: "",
      telegramChannelName: "",
    },
  );
  const [isBotSetupModalOpen, setIsBotSetupModalOpen] = useState(false);
  const [botModalTab, setBotModalTab] = useState<"discord" | "telegram">("telegram");

  // Handle product category switch
  const handleSelectProductType = (type: ProductTypeCategory) => {
    setProductType(type);
  };
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Upload file handlers: keep the actual Blob in IndexedDB; local product data stores only its key.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingFile(true);
    setFileUploadError(null);
    const companyId = selectedCompanyId || initialData?.companyId || initialCompanyId || productId;
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file: File, index: number) => {
          const id = createLocalId(`file-${index}`);
          const stored = await saveDigitalAsset(companyId, id, file, productId);
          const isAudio =
            file.type.startsWith("audio/") || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(file.name);
          return {
            id,
            name: file.name,
            size: (file.size / (1024 * 1024)).toFixed(1) + " MB",
            type: file.type || "application/octet-stream",
            storageKey: stored.storageKey,
            isFreePreview: false,
            isAudio,
            audioPreviewSeconds: isAudio ? 30 : undefined,
          };
        }),
      );
      setDigitalFiles((prev) => [...prev, ...uploaded]);
    } catch (error) {
      console.error("Product asset upload failed:", error);
      setFileUploadError(getUserFacingErrorMessage(error, "Le téléversement a échoué. Réessayez."));
    } finally {
      setIsUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setDigitalFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Toggle App in membership
  const handleToggleApp = (appName: string) => {
    const isCurrentlySelected = selectedApps.includes(appName);
    setSelectedApps((previous) =>
      isCurrentlySelected ? previous.filter((app) => app !== appName) : [...previous, appName],
    );

    // Telegram et Discord deviennent immédiatement des étiquettes produit.
    if (appName === "Telegram" || appName === "Discord") {
      setTags((previous) => {
        if (isCurrentlySelected) {
          return previous.filter((tag) => tag.toLowerCase() !== appName.toLowerCase());
        }
        const next = [...previous];
        for (const tag of ["vip", "communauté", appName]) {
          if (!next.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
            next.push(tag);
          }
        }
        return next;
      });
    }
  };

  // FAQ Handlers
  const handleAddFaq = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFaqQ.trim()) return;
    const newFaq: FaqItem = {
      id: "faq-" + Date.now(),
      q: newFaqQ.trim(),
      a: newFaqA.trim() || "Consultez notre support pour toute question.",
    };
    setFaqs([...faqs, newFaq]);
    setExpandedFaqId(newFaq.id);
    setNewFaqQ("");
    setNewFaqA("");
    setIsAddingFaq(false);
  };

  const handleRemoveFaq = (id: string) => {
    setFaqs(faqs.filter((f) => f.id !== id));
  };

  // Add pricing option
  const handleAddPricingOption = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = parseFloat(newOptionPrice) || 0;
    const currencyConfig = SUPPORTED_CURRENCIES[currentCurrency] || SUPPORTED_CURRENCIES.USD;
    const symbol = currencyConfig.symbol;
    const name =
      newOptionName.trim() ||
      (newOptionBilling === "monthly"
        ? `${numeric} ${symbol} par mois`
        : newOptionBilling === "yearly"
          ? `${numeric} ${symbol} par an`
          : `${numeric} ${symbol} paiement unique`);

    const newOpt: PricingOption = {
      id: "plan-" + Date.now(),
      name,
      price: numeric,
      currency: currentCurrency,
      billing: newOptionBilling,
      subscribersCount: 0,
    };
    setPricingOptions([...pricingOptions, newOpt]);
    setSelectedPlanId(newOpt.id);
    setIsAddingPricingOption(false);
    setNewOptionName("");
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    const numericPrice = pricingType === "free" ? 0 : parseFloat(priceAmount) || 0;
    const currencyConfig = SUPPORTED_CURRENCIES[currentCurrency] || SUPPORTED_CURRENCIES.USD;
    const symbol = currencyConfig.symbol;

    const formattedPrice =
      pricingType === "free"
        ? `0 ${symbol} gratuit`
        : billingCycle === "monthly"
          ? `${numericPrice} ${symbol} / mois`
          : billingCycle === "yearly"
            ? `${numericPrice} ${symbol} / an`
            : `${numericPrice} ${symbol} paiement unique`;

    const newProduct: CreatedProductData = {
      id: productId,
      productType,
      name: productName,
      title: productName,
      description: productDescription,
      storeName: effectiveCompanyName,
      companyId: selectedCompany?.id || initialData?.companyId || initialCompanyId || undefined,
      companyName:
        selectedCompany?.name ||
        companyName ||
        initialData?.companyName ||
        initialData?.storeName ||
        undefined,
      priceDisplay: formattedPrice,
      priceAmount: numericPrice,
      currency: currentCurrency,
      pricingType,
      billingCycle,
      visibility: storefrontVisible ? "Visible" : "Caché",
      discoverStatus: isListedOnDiscover ? "Répertorié sur Discover" : "Non répertorié",
      includedApps: effectivePreviewApps,
      conversionRate: "-",
      totalRevenue: `0 ${symbol}`,
      activeUsers: 0,
      imageUrl: productImage || undefined,
      bannerUrl: bannerImage || undefined,
      productUrl: customUrl,
      affiliateRate: enableAffiliate ? Math.min(100, Math.max(0, Number(affiliateRate) || 0)) : 0,
      ctaText: ctaButtonText,
      pricingOptions,
      faqs,
      digitalFiles,
      courseModules,
      ebookDetails:
        productType === "ebook"
          ? {
              format: ebookFormat,
              pageCount,
              previewExcerpt: "Aperçu de 10 pages inclus",
            }
          : undefined,
      communityConfig: communityConfig,
    };

    try {
      await handleSave(newProduct);
    } catch (error) {
      console.error("Product save failed:", error);
      window.alert(
        getUserFacingErrorMessage(
          error,
          "Le produit n’a pas pu être enregistré. Vérifiez vos informations puis réessayez.",
        ),
      );
    }
  };

  // The studio opens directly on product configuration.
  // =========================================================================
  // STEP 2: STUDIO CUSTOMIZATION WITH FULL PREVIEW AND INLINE CONTROLS
  // =========================================================================
  const currencyConfig = SUPPORTED_CURRENCIES[currentCurrency] || SUPPORTED_CURRENCIES.USD;

  return (
    <div className="mansa-viewport mansa-safe-bottom fixed inset-0 z-50 flex flex-col bg-[#0b0c0e] text-[#eeeeee] font-sans antialiased overflow-hidden selection:bg-[#00D26A]/30 selection:text-[#00D26A]">
      {/* 1. TOP HEADER BAR */}
      <header className="flex h-14 w-full shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#0f1013] px-4 sm:px-6">
        {/* Left: Close & Back */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="size-5" />
          </button>
          <span className="text-sm font-bold text-white">
            {initialData?.id ? "Modifier le produit" : "Ajouter un produit"}
          </span>
        </div>

        {/* Center: Device Switcher */}
        <div className="hidden items-center rounded-xl border border-white/10 bg-[#17181c] p-1 text-xs sm:flex">
          <button
            type="button"
            aria-pressed={viewMode === "desktop"}
            onClick={() => setViewMode("desktop")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
              viewMode === "desktop"
                ? "bg-[#252830] text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Monitor
              className={`size-3.5 ${viewMode === "desktop" ? "text-[#00D26A]" : "text-zinc-400"}`}
            />
            <span>Bureau</span>
          </button>

          <button
            type="button"
            aria-pressed={viewMode === "mobile"}
            onClick={() => setViewMode("mobile")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
              viewMode === "mobile"
                ? "bg-[#252830] text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Smartphone
              className={`size-3.5 ${viewMode === "mobile" ? "text-[#00D26A]" : "text-zinc-400"}`}
            />
            <span>Mobile</span>
          </button>

          <button
            type="button"
            aria-pressed={viewMode === "member"}
            onClick={() => setViewMode("member")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
              viewMode === "member"
                ? "bg-[#252830] text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Users
              className={`size-3.5 ${viewMode === "member" ? "text-[#00D26A]" : "text-zinc-400"}`}
            />
            <span>Vue membre</span>
          </button>
        </div>

        {/* Right: Currency Indicator & Save Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <span className="hidden sm:inline text-zinc-400 font-mono text-[11px]">Devise :</span>
            {selectedCompanyCurrency ? (
              <span
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-white"
                title={`Devise principale de ${selectedCompany?.name || "la communauté"}`}
              >
                {SUPPORTED_CURRENCIES[selectedCompanyCurrency].symbol} ({selectedCompanyCurrency})
              </span>
            ) : (
              <CurrencySelector
                currentCurrency={currentCurrency}
                onSelectCurrency={(newCurr) => handleCurrencyChange(newCurr)}
                variant="pill"
                lang="fr"
              />
            )}
          </div>

          <button
            onClick={handleFinalSubmit}
            className="ui-btn-primary text-xs px-4 py-2 font-bold cursor-pointer flex items-center gap-1.5 shadow-lg"
          >
            <Check className="size-3.5" />
            <span>{initialData?.id ? "Enregistrer les modifications" : "Créer un produit"}</span>
          </button>
        </div>
      </header>

      {/* 2. WORKSPACE: vertical flow on mobile, split columns on desktop */}
      <div className="flex flex-1 min-h-0 flex-col overflow-y-auto overflow-x-hidden sm:flex-row sm:overflow-hidden">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: EDIT PRODUCT DETAILS                                         */}
        {/* ========================================================================= */}
        <div className="flex w-full shrink-0 flex-col justify-between space-y-6 border-b border-white/[0.08] bg-[#0c0d10] p-5 sm:w-[420px] sm:border-b-0 sm:border-r md:w-[460px] sm:overflow-y-auto">
          <div className="space-y-6">
            {/* SECTION: DÉTAILS DU PRODUIT */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Détails</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Le nom que les acheteurs voient sur votre page produit.
                </p>
              </div>

              {/* Nom de l'offre */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-300">
                    {lang === "fr" ? "Nom de l'offre" : "Offer name"}{" "}
                    <span className="text-[#00D26A]">*</span>
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {productName.length} / 80
                  </span>
                </div>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  maxLength={80}
                  placeholder={
                    lang === "fr"
                      ? "ex. Accès Club VIP Scalping, Formation Pro..."
                      : "e.g. VIP Scalping Club Access..."
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#16181f] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#00D26A] transition-colors"
                  required
                />
              </div>

              {/* Description Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-300">
                    Description du produit
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {productDescription.length} caractères
                  </span>
                </div>
                <textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  rows={4}
                  placeholder="Expliquez ce qui est inclus dans cette offre..."
                  className="w-full rounded-xl border border-white/10 bg-[#16181f] p-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#00D26A] leading-relaxed resize-none"
                />
              </div>

              {/* Étiquettes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] font-semibold text-zinc-300">Étiquettes</label>
                    <HelpCircle className="size-3 text-zinc-500" />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">{tags.length} / 20</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-[#16181f] p-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-md bg-[#252832] px-2 py-0.5 text-[10px] font-mono text-zinc-300"
                    >
                      #{tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-400 cursor-pointer ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Tapez une étiquette et tapez Entrée"
                    className="flex-1 min-w-[140px] bg-transparent text-xs text-white placeholder-zinc-500 outline-none py-1 px-1"
                  />
                </div>
              </div>
            </div>

              {/* Apps checklist / selector */}
            <div className="space-y-2.5 pt-4 border-t border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-200 block">
                  Applications incluses dans ce produit :
                </span>
                <span className="text-[10px] text-[#B6B5B0]">
                  {selectedApps.length} sélectionnée{selectedApps.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VALID_MANSA_APPS.map((app) => {
                  const isSelected = selectedApps.includes(app);
                  return (
                    <button
                      key={app}
                      type="button"
                      onClick={() => handleToggleApp(app)}
                      className={`text-xs p-2.5 rounded-xl border font-medium transition-all cursor-pointer flex items-center justify-between gap-2 text-left ${
                        isSelected
                          ? "bg-[#3DDC84]/15 border-[#3DDC84] text-white"
                          : "bg-[#151515] border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {renderAppIcon(app, "size-4")}
                        <span className="truncate">{app}</span>
                      </div>
                      <div
                        className={`size-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-[#3DDC84] border-[#3DDC84] text-black"
                            : "border-zinc-600 bg-black/40 text-transparent"
                        }`}
                      >
                        <Check className="size-3 stroke-[3]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION: TARIFICATION */}
            <div className="space-y-4 pt-3 border-t border-white/[0.08]">
              <div>
                <h3 className="text-sm font-bold text-white">Tarification</h3>
                <p className="text-[11px] text-[#B6B5B0] mt-0.5">
                  Choisissez comment les gens accèdent à ce produit.
                </p>
              </div>

              {/* Free vs Paid switch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPricingType("free")}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    pricingType === "free"
                      ? "border-[#3DDC84] bg-[#3DDC84]/15 text-white"
                      : "border-white/10 bg-[#151515] text-zinc-400 hover:border-white/20"
                  }`}
                >
                  <span className="text-xs font-semibold flex items-center gap-2">
                    <span className="text-base">🌐</span>
                    <span>Accès gratuit</span>
                  </span>
                  <span
                    className={`size-4 rounded-full border flex items-center justify-center ${
                      pricingType === "free" ? "border-[#3DDC84] bg-[#3DDC84]" : "border-zinc-600"
                    }`}
                  >
                    {pricingType === "free" && (
                      <span className="size-1.5 rounded-full bg-[#2A2929]" />
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPricingType("paid")}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    pricingType === "paid"
                      ? "border-[#3DDC84] bg-[#3DDC84]/15 text-white"
                      : "border-white/10 bg-[#151515] text-zinc-400 hover:border-white/20"
                  }`}
                >
                  <span className="text-xs font-semibold flex items-center gap-2">
                    <span className="text-base">💲</span>
                    <span>Accès payant</span>
                  </span>
                  <span
                    className={`size-4 rounded-full border flex items-center justify-center ${
                      pricingType === "paid" ? "border-[#3DDC84] bg-[#3DDC84]" : "border-zinc-600"
                    }`}
                  >
                    {pricingType === "paid" && (
                      <span className="size-1.5 rounded-full bg-[#2A2929]" />
                    )}
                  </span>
                </button>
              </div>

              {/* Price configuration */}
              {pricingType === "paid" && (
                <div className="space-y-3 p-3.5 rounded-xl bg-[#151515] border border-white/10">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {/* Fixed attached prefix to prevent overlapping characters like FCF20 */}
                    <div className="flex items-center rounded-xl border border-white/10 bg-[#2A2929] focus-within:border-[#3DDC84] overflow-hidden flex-1 transition-colors">
                      <span className="px-3.5 py-2.5 text-xs font-mono font-bold text-[#B6B5B0] bg-white/[0.04] border-r border-white/10 select-none whitespace-nowrap flex items-center justify-center shrink-0">
                        {currencyConfig.symbol}
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={priceAmount}
                        onChange={(e) => setPriceAmount(e.target.value)}
                        placeholder="20"
                        className="w-full bg-transparent px-3 py-2 text-xs font-mono font-bold text-white outline-none placeholder:text-zinc-600"
                      />
                    </div>

                    <select
                      value={billingCycle}
                      onChange={(e) => setBillingCycle(e.target.value as any)}
                      className="rounded-xl border border-white/10 bg-[#2A2929] px-3.5 py-2.5 text-xs font-semibold text-white outline-none focus:border-[#3DDC84] cursor-pointer hover:border-white/20 transition-colors shrink-0"
                    >
                      <option value="monthly">par mois</option>
                      <option value="yearly">par an</option>
                      <option value="one_time">paiement unique</option>
                    </select>
                  </div>
                </div>
              )}

              {/* List of active pricing options */}
              <div className="space-y-2">
                {pricingOptions.map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedPlanId(opt.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedPlanId === opt.id
                        ? "border-[#3DDC84] bg-[#3DDC84]/10 text-white"
                        : "border-white/10 bg-[#151515] text-zinc-300 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{opt.name}</span>
                      <span className="text-[10px] text-[#B6B5B0] font-mono">
                        👤 {opt.subscribersCount}
                      </span>
                    </div>
                    <span className="text-[#B6B5B0]">›</span>
                  </div>
                ))}

                {/* Add new pricing option button */}
                {!isAddingPricingOption ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingPricingOption(true)}
                    className="w-full py-2.5 rounded-xl border border-dashed border-white/15 bg-white/5 hover:bg-white/10 hover:border-[#3DDC84]/40 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="size-3.5 text-[#3DDC84]" />
                    <span>+ Nouvelle option de tarification</span>
                  </button>
                ) : (
                  <form
                    onSubmit={handleAddPricingOption}
                    className="p-3 rounded-xl bg-[#151515] border border-white/10 space-y-2.5"
                  >
                    <input
                      type="text"
                      value={newOptionName}
                      onChange={(e) => setNewOptionName(e.target.value)}
                      placeholder="Nom de l'option (ex: Accès Annuel VIP)"
                      className="w-full rounded-xl border border-white/10 bg-[#2A2929] px-3 py-2 text-xs text-white outline-none focus:border-[#3DDC84]"
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex items-center rounded-xl border border-white/10 bg-[#2A2929] focus-within:border-[#3DDC84] overflow-hidden flex-1">
                        <span className="px-3 py-2 text-xs font-mono font-bold text-[#B6B5B0] bg-white/[0.04] border-r border-white/10 select-none whitespace-nowrap">
                          {currencyConfig.symbol}
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={newOptionPrice}
                          onChange={(e) => setNewOptionPrice(e.target.value)}
                          placeholder="Prix"
                          className="w-full bg-transparent px-3 py-2 text-xs font-mono font-bold text-white outline-none"
                        />
                      </div>
                      <select
                        value={newOptionBilling}
                        onChange={(e) => setNewOptionBilling(e.target.value as any)}
                        className="rounded-xl border border-white/10 bg-[#2A2929] px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-[#3DDC84] shrink-0"
                      >
                        <option value="monthly">par mois</option>
                        <option value="yearly">par an</option>
                        <option value="one_time">une fois</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingPricingOption(false)}
                        className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="ui-btn-primary px-4 py-1.5 text-xs font-bold cursor-pointer"
                      >
                        Ajouter l'option
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* SECTION: FAQ BUILDER */}
            <div className="space-y-4 pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Questions fréquemment posées (FAQ)
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Rassurez vos clients avec des réponses claires.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingFaq(true)}
                  className="text-xs text-[#00D26A] font-semibold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Plus className="size-3" />
                  <span>Ajouter</span>
                </button>
              </div>

              <div className="space-y-2">
                {faqs.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl bg-[#161820] border border-white/10 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{f.q}</span>
                      <button
                        onClick={() => handleRemoveFaq(f.id)}
                        className="text-zinc-500 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-light">{f.a}</p>
                  </div>
                ))}

                {isAddingFaq && (
                  <form
                    onSubmit={handleAddFaq}
                    className="p-3 rounded-xl bg-[#181a22] border border-[#00D26A]/40 space-y-2.5"
                  >
                    <input
                      type="text"
                      value={newFaqQ}
                      onChange={(e) => setNewFaqQ(e.target.value)}
                      placeholder="Question (ex: Comment recevoir mes accès ?)"
                      className="w-full rounded-lg border border-white/10 bg-[#101116] px-3 py-2 text-xs text-white outline-none focus:border-[#00D26A]"
                      autoFocus
                    />
                    <textarea
                      value={newFaqA}
                      onChange={(e) => setNewFaqA(e.target.value)}
                      rows={2}
                      placeholder="Réponse détaillée..."
                      className="w-full rounded-lg border border-white/10 bg-[#101116] px-3 py-2 text-xs text-white outline-none focus:border-[#00D26A]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingFaq(false)}
                        className="px-3 py-1 text-xs text-zinc-400 hover:text-white cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="ui-btn-primary px-3 py-1 text-xs font-bold cursor-pointer"
                      >
                        Enregistrer FAQ
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* SECTION: PARAMÈTRES AVANCÉS */}
            <div className="space-y-4 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsProductSettingsOpen(!isProductSettingsOpen)}
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <div>
                  <h3 className="text-sm font-bold text-white">Paramètres avancés</h3>
                  <p className="text-[11px] text-zinc-400">
                    Bouton d'achat, affiliation, visibilité Discover.
                  </p>
                </div>
                {isProductSettingsOpen ? (
                  <ChevronUp className="size-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="size-4 text-zinc-400" />
                )}
              </button>

              {isProductSettingsOpen && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-zinc-300">
                      Texte du bouton d'action
                    </label>
                    <input
                      type="text"
                      value={ctaButtonText}
                      onChange={(e) => setCtaButtonText(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#16181f] px-3 py-2 text-xs text-white outline-none focus:border-[#00D26A]"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-zinc-300 font-medium">
                      Répertorier sur Discover
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsListedOnDiscover(!isListedOnDiscover)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        isListedOnDiscover ? "bg-[#00D26A]" : "bg-[#252830]"
                      }`}
                    >
                      <span
                        className={`inline-block size-4 transform rounded-full bg-white transition ${
                          isListedOnDiscover ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="space-y-1">
                      <span className="block text-xs text-zinc-300 font-medium">
                        Programme d'affiliation
                      </span>
                      <span className="block text-[10px] text-zinc-500">
                        Le créateur choisit la part reversée aux affiliés.
                      </span>
                    </div>
                    {enableAffiliate && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={affiliateRate}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            setAffiliateRate(
                              Number.isFinite(next) ? Math.min(100, Math.max(0, next)) : 0,
                            );
                          }}
                          className="w-16 rounded-lg border border-white/10 bg-[#16181f] px-2 py-1.5 text-right text-xs font-bold text-white outline-none focus:border-[#00D26A]"
                          aria-label="Taux de commission en pourcentage"
                        />
                        <span className="text-xs text-zinc-400">%</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setEnableAffiliate(!enableAffiliate)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        enableAffiliate ? "bg-[#00D26A]" : "bg-[#252830]"
                      }`}
                    >
                      <span
                        className={`inline-block size-4 transform rounded-full bg-white transition ${
                          enableAffiliate ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Save Button & Actions */}
          <div className="pt-4 border-t border-white/10 space-y-2">
            <button
              type="button"
              onClick={handleFinalSubmit}
              className="ui-btn-primary w-full py-3.5 text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="size-4" />
              <span>{initialData?.id ? "Enregistrer les modifications" : "Créer un produit"}</span>
            </button>

            {/* Contrôles d'affichage dans le flux mobile, entre création et preview. */}
            <div className="flex items-center rounded-xl border border-white/10 bg-[#17181c] p-1 text-xs sm:hidden">
              <button
                type="button"
                aria-pressed={viewMode === "desktop"}
                onClick={() => setViewMode("desktop")}
                className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 font-semibold transition-all cursor-pointer ${viewMode === "desktop" ? "bg-[#252830] text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                <Monitor
                  className={`size-3.5 ${viewMode === "desktop" ? "text-[#00D26A]" : "text-zinc-400"}`}
                />
                <span>Bureau</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === "mobile"}
                onClick={() => setViewMode("mobile")}
                className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 font-semibold transition-all cursor-pointer ${viewMode === "mobile" ? "bg-[#252830] text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                <Smartphone
                  className={`size-3.5 ${viewMode === "mobile" ? "text-[#00D26A]" : "text-zinc-400"}`}
                />
                <span>Mobile</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === "member"}
                onClick={() => setViewMode("member")}
                className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 font-semibold transition-all cursor-pointer ${viewMode === "member" ? "bg-[#252830] text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                <Users
                  className={`size-3.5 ${viewMode === "member" ? "text-[#00D26A]" : "text-zinc-400"}`}
                />
                <span>Membre</span>
              </button>
            </div>

            {initialData?.id && onDelete && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold cursor-pointer flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="size-3.5" />
                <span>
                  {lang === "fr"
                    ? "Supprimer définitivement ce produit"
                    : "Permanently delete this product"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: LIVE INTERACTIVE PREVIEW (MOBILE / DESKTOP / MEMBER)       */}
        {/* ========================================================================= */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-start overflow-visible bg-[#07080a] p-4 pb-36 sm:h-full sm:overflow-y-auto sm:overflow-x-hidden sm:p-8">
          {/* ONE CUSTOMER-FACING PRODUCT PAGE, ADAPTED TO THE SELECTED PREVIEW WIDTH */}
          {/* ======================================================================= */}
          {(viewMode === "desktop" || viewMode === "mobile" || viewMode === "member") && (
            <div
              className={`w-full ${
                viewMode === "mobile"
                  ? "max-w-[390px] rounded-2xl border border-white/15 bg-[#0e1015] shadow-xl"
                  : "max-w-5xl rounded-2xl border border-white/15 bg-[#0e1015] shadow-2xl"
              } overflow-hidden my-2 sm:my-6 shrink-0 animate-in fade-in duration-200`}
            >
              {/* Desktop Store Top Bar */}
              <div
                className={`bg-[#14161d] border-b border-white/10 ${viewMode === "mobile" ? "px-4 py-3 gap-y-2" : "px-6 py-3.5"} flex flex-wrap items-center justify-between`}
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-[#00D26A]/20 text-[#00D26A] flex items-center justify-center font-bold text-sm border border-[#00D26A]/30">
                    {productType === "ebook" ? "📖" : productType === "membership" ? "👑" : "📈"}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">
                      {effectiveCompanyName}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Entreprise créatrice
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <div className="flex items-center gap-1 font-mono text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded">
                    <Star className="size-3 fill-amber-400" />
                    <span>4.9 / 5.0 (184 avis)</span>
                  </div>
                  <button className="flex items-center gap-1 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    <Share2 className="size-3.5" />
                    <span>Partager</span>
                  </button>
                </div>
              </div>

              {/* Desktop 2-Column Storefront */}
              <div
                className={`grid ${viewMode === "mobile" ? "grid-cols-1 gap-5 p-4" : "grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-8"}`}
              >
                {/* LEFT MAIN CONTENT (8 COLS) */}
                <div
                  className={
                    viewMode === "mobile" ? "order-4 space-y-5" : "lg:col-span-7 space-y-6"
                  }
                >
                  {/* Hero Media Showcase */}
                  <div
                    className={
                      viewMode === "mobile"
                        ? "hidden"
                        : "relative hidden rounded-2xl border border-white/10 bg-[#151720] overflow-hidden group sm:block"
                    }
                  >
                    <input
                      ref={productImageFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProductImageUpload}
                      className="hidden"
                    />
                    {productImage ? (
                      <div className={`relative ${viewMode === "mobile" ? "h-48" : "h-72"} w-full`}>
                        <img
                          src={productImage}
                          alt={productName}
                          className="size-full object-cover"
                        />
                        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#00D26A] flex items-center gap-1 border border-white/10">
                          <Zap className="size-3" />
                          <span>Accès instantané 24/7</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => productImageFileInputRef.current?.click()}
                          className="absolute bottom-3 right-3 rounded-lg bg-black/75 hover:bg-black/90 border border-white/15 px-3 py-2 text-xs font-bold text-white flex items-center gap-2 transition-colors"
                          aria-label="Modifier l’image bannière du produit"
                        >
                          <Upload className="size-3.5" />
                          Modifier l’image
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-10 text-center space-y-3">
                        <div className="size-12 rounded-full bg-[#1e2028] flex items-center justify-center text-zinc-400">
                          <ImageIcon className="size-6 text-[#00D26A]" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white">
                            Visuel principal de votre produit
                          </h4>
                          <p className="text-xs text-zinc-400 font-light">
                            Ajoutez l’image de votre choix pour illustrer votre produit.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => productImageFileInputRef.current?.click()}
                          className="ui-btn-primary text-xs px-4 py-2 font-bold cursor-pointer flex items-center gap-2"
                        >
                          <Upload className="size-3.5" />
                          Ajouter une image
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Headline */}
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                      {productName}
                    </h1>
                  </div>

                  {/* Applications liées */}
                  {customerFacingApps.length > 0 && (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="size-3.5 text-[#00D26A]" />
                          <span>Applications liées</span>
                        </h3>
                      </div>

                      <div
                        className={`grid ${viewMode === "mobile" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"} gap-2.5`}
                      >
                        {customerFacingApps.map((app) => {
                          let appTitle = app;
                          let appDesc = "Accès inclus dès validation.";
                          let appIcon = renderAppIcon(app, "size-4");

                          if (app === "Telegram") {
                            appTitle = "Telegram";
                            appDesc = "Accès au canal privé d'alertes & diffusion Telegram.";
                          } else if (app === "Discord") {
                            appTitle = "Discord";
                            appDesc = "Salons VIP et gestion automatique des rôles.";
                          } else if (app === "Fichiers" || app === "Fichiers & Documents") {
                            appTitle = "Fichiers & Documents";
                            appDesc = `${digitalFiles.length > 0 ? `${digitalFiles.length} fichier(s) prêt(s)` : "Téléchargement immédiat des ressources"}`;
                          }

                          return (
                            <div
                              key={app}
                              className="p-3.5 rounded-xl bg-[#14161f] border border-white/10 flex items-start gap-3"
                            >
                              <div className="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                {appIcon}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-white text-xs block truncate">
                                  {appTitle}
                                </span>
                                <span className="text-[11px] text-zinc-400 block line-clamp-1 leading-snug">
                                  {appDesc}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Full Product Description */}
                  <div className="hidden space-y-3 sm:block">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      À propos de cette offre
                    </h3>
                    <div className="p-5 rounded-2xl bg-[#14161f] border border-white/10 text-xs text-zinc-300 leading-relaxed font-light whitespace-pre-wrap">
                      {productDescription || "Description détaillée de l'offre."}
                    </div>
                  </div>

                  {/* FAQ Accordion */}
                  <div className="hidden space-y-3 sm:block">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Questions fréquemment posées
                    </h3>
                    <div className="space-y-2">
                      {faqs.map((faq) => {
                        const isExpanded = expandedFaqId === faq.id;
                        return (
                          <div
                            key={faq.id}
                            className="rounded-2xl border border-white/10 bg-[#14161f] p-4 space-y-2 transition-all"
                          >
                            <div
                              onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                              className="flex items-center justify-between cursor-pointer text-xs font-bold text-white"
                            >
                              <span>{faq.q}</span>
                              <span className="text-[#00D26A] font-bold">
                                {isExpanded ? "−" : "+"}
                              </span>
                            </div>
                            {isExpanded && (
                              <p className="text-xs text-zinc-400 pt-2 border-t border-white/5 leading-relaxed font-light">
                                {faq.a}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* RIGHT STICKY SIDEBAR (5 COLS) - CHECKOUT & PRICING CARD */}
                <div
                  className={
                    viewMode === "mobile" ? "order-1 space-y-5" : "lg:col-span-5 space-y-5"
                  }
                >
                  <div
                    className={`${viewMode === "mobile" ? "" : "sticky top-4"} rounded-3xl border border-white/15 bg-[#14161f] ${viewMode === "mobile" ? "p-4" : "p-6"} shadow-2xl space-y-5`}
                  >
                    <div className="space-y-2.5">
                      <div className="relative aspect-[16/7] overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e12]">
                        {reminderImage ? (
                          <img
                            src={reminderImage}
                            alt={productName}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="size-full flex flex-col items-center justify-center gap-2 text-zinc-400">
                            <ImageIcon className="size-6" />
                            <span className="text-xs">Ajouter une image de rappel produit</span>
                          </div>
                        )}
                        <input
                          ref={bannerImageFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleBannerImageUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => bannerImageFileInputRef.current?.click()}
                          className="absolute bottom-2 right-2 rounded-lg bg-black/75 hover:bg-black/90 border border-white/15 px-2.5 py-1.5 text-[10px] font-semibold text-white flex items-center gap-1.5 transition-colors"
                          aria-label="Modifier l’image de rappel du produit"
                        >
                          <Upload className="size-3" />
                          <span>{reminderImage ? "Modifier l’image" : "Ajouter une image"}</span>
                        </button>
                      </div>
                      <h2 className="text-base font-bold text-white leading-snug">{productName}</h2>
                    </div>

                    {/* Price Header */}
                    <div className="space-y-1 pb-3 border-b border-white/10">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 block">
                        {pricingType === "free" ? "Gratuit" : "Tarif Officiel"}
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white font-mono">
                          {pricingType === "free"
                            ? "0 € Gratuit"
                            : `${selectedPreviewPlan?.price ?? priceAmount} ${currencyConfig.symbol}`}
                        </span>
                        {pricingType === "paid" && (
                          <span className="text-xs text-zinc-400 font-mono">
                            /{" "}
                            {(selectedPreviewPlan?.billing || billingCycle) === "monthly"
                              ? "mois"
                              : (selectedPreviewPlan?.billing || billingCycle) === "yearly"
                                ? "an"
                                : "paiement unique"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Plan Options Selector */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-zinc-300 block">
                        Choisissez votre formule :
                      </label>
                      {pricingOptions.map((opt) => (
                        <div
                          key={opt.id}
                          onClick={() => setSelectedPlanId(opt.id)}
                          className={`p-3.5 rounded-2xl border text-xs font-semibold cursor-pointer transition-all flex items-center justify-between ${
                            selectedPlanId === opt.id
                              ? "border-[#00D26A] bg-[#00D26A]/10 text-white shadow-md"
                              : "border-white/10 bg-[#1b1e2a] text-zinc-300 hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`size-3 rounded-full border flex items-center justify-center ${
                                selectedPlanId === opt.id
                                  ? "border-[#00D26A] bg-[#00D26A]"
                                  : "border-zinc-500"
                              }`}
                            >
                              {selectedPlanId === opt.id && (
                                <span className="size-1 rounded-full bg-[#2A2929]" />
                              )}
                            </span>
                            <span>{opt.name}</span>
                          </div>
                          <span className="font-mono font-bold text-white">
                            {opt.price} {currencyConfig.symbol}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Main CTA Button */}
                    <button
                      type="button"
                      onClick={() => setIsCheckoutPreviewOpen(true)}
                      className="w-full py-4 rounded-2xl bg-[#0066FF] hover:bg-[#0055EE] text-white font-black text-base shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>{ctaButtonText || "Rejoindre maintenant"}</span>
                      <ArrowRight className="size-4" />
                    </button>

                    {/* Security & Features Checklist */}
                    <div className="space-y-2 text-xs text-zinc-300 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-[#00D26A] shrink-0" />
                        <span>Paiement sécurisé par carte & Mobile Money</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="size-4 text-[#00D26A] shrink-0" />
                        <span>Livraison automatique et accès immédiat</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Lock className="size-4 text-[#00D26A] shrink-0" />
                        <span>Annulation en 1-clic sans engagement</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sur mobile, la description et la FAQ suivent directement le CTA. */}
                <div className="order-3 space-y-5 sm:hidden">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      À propos de cette offre
                    </h3>
                    <div className="rounded-2xl border border-white/10 bg-[#14161f] p-5 text-xs font-light leading-relaxed text-zinc-300 whitespace-pre-wrap">
                      {productDescription || "Description détaillée de l'offre."}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      Questions fréquemment posées
                    </h3>
                    <div className="space-y-2">
                      {faqs.map((faq) => {
                        const isExpanded = expandedFaqId === faq.id;
                        return (
                          <div
                            key={`mobile-${faq.id}`}
                            className="space-y-2 rounded-2xl border border-white/10 bg-[#14161f] p-4 transition-all"
                          >
                            <div
                              onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                              className="flex cursor-pointer items-center justify-between text-xs font-bold text-white"
                            >
                              <span>{faq.q}</span>
                              <span className="font-bold text-[#00D26A]">
                                {isExpanded ? "−" : "+"}
                              </span>
                            </div>
                            {isExpanded && (
                              <p className="border-t border-white/5 pt-2 text-xs font-light leading-relaxed text-zinc-400">
                                {faq.a}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CheckoutPreviewModal
        isOpen={isCheckoutPreviewOpen}
        onClose={() => setIsCheckoutPreviewOpen(false)}
        companyName={effectiveCompanyName}
        productName={productName}
        description={productDescription}
        productImage={productImage}
        pricingType={pricingType}
        priceAmount={parseFloat(priceAmount) || 0}
        billingCycle={billingCycle}
        currencyCode={currentCurrency}
        currencySymbol={currencyConfig.symbol}
        pricingOptions={pricingOptions}
        selectedPlanId={selectedPlanId}
        onPlanChange={setSelectedPlanId}
      />

      {/* CREATOR BOT SETUP MODAL */}
      <CreatorBotSetupModal
        isOpen={isBotSetupModalOpen}
        onClose={() => setIsBotSetupModalOpen(false)}
        initialConfig={communityConfig}
        onSaveConfig={(newConfig) => setCommunityConfig(newConfig)}
        productName={productName}
        initialTab={botModalTab}
        platformMode={botModalTab}
      />

      {/* CONFIRM PRODUCT DELETION MODAL */}
      {isDeleteModalOpen && initialData?.id && onDelete && (
        <ConfirmActionModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={() => {
            onDelete(initialData.id!);
            setIsDeleteModalOpen(false);
            onClose();
          }}
          title={
            lang === "fr"
              ? "Supprimer définitivement ce produit ?"
              : "Permanently delete this product?"
          }
          description={
            lang === "fr"
              ? `Êtes-vous certain de vouloir supprimer le produit "${productName || initialData.name}" ? Toutes ses automatisations et pages de vente associées cesseront immédiatement de fonctionner.`
              : `Are you sure you want to delete "${productName || initialData.name}"?`
          }
          itemName={productName || initialData.name || "Produit"}
          itemType={lang === "fr" ? "Produit créateur" : "Creator Product"}
          itemDetails={[
            { label: "Nom du produit", value: productName || initialData.name || "Sans titre" },
            {
              label: "Tarif configuré",
              value: `${priceAmount} ${SUPPORTED_CURRENCIES[currentCurrency]?.symbol || "€"}`,
            },
          ]}
          confirmButtonText={lang === "fr" ? "Supprimer le produit" : "Delete Product"}
          cancelButtonText={lang === "fr" ? "Annuler" : "Cancel"}
          variant="danger"
          lang={lang}
        />
      )}
    </div>
  );
};
