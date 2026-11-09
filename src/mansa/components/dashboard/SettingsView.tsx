// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Building2,
  User,
  Image as ImageIcon,
  Camera,
  Upload,
  Sparkles,
  RefreshCw,
  Eye,
  X,
  Smartphone,
} from "lucide-react";
import { AccountSettingsModal } from "../common/AccountSettingsModal";
import { DEFAULT_PAYMENT_METHODS, PaymentMethodsTemplate } from "../common/PaymentMethodsTemplate";
import {
  getUserProfile,
  updateUserProfile,
  isCreatorPayoutConfigured,
  uploadProjectAsset,
} from "../../services/dbService";
import { getSavedCompanies, updateCompanyBranding } from "../../utils/companyStorage";
import { updateSubscriptionBranding } from "../../utils/subscriptionsStorage";
import { CurrencySelector } from "./CurrencySelector";
import { CurrencyCode } from "../../utils/currency";
import { getUserFacingErrorMessage } from "../../utils/userFacingError";
import {
  DIAL_CODE_CONFIGS,
  validatePhoneNumber,
  normalizePhoneNumber,
} from "../../utils/phoneValidationRules";

interface SettingsViewProps {
  lang?: "fr" | "en";
  user: {
    uid?: string;
    name: string;
    email: string;
    avatarInitials?: string;
    handle?: string;
  };
  onLogout?: () => void;
  onDeleteAccount?: () => Promise<void>;
  initialTab?: "account" | "store";
  activeCompanyId?: string;
  activeCompanyName?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  lang = "fr",
  user,
  onLogout,
  onDeleteAccount,
  initialTab = "account",
  activeCompanyId,
  activeCompanyName,
}) => {
  const [activeTab, setActiveTab] = useState<"account" | "store">(initialTab);
  const [companySettingsSection, setCompanySettingsSection] = useState<
    "menu" | "general" | "payment"
  >("menu");

  useEffect(() => {
    if (activeTab === "store") setCompanySettingsSection("menu");
  }, [activeTab, activeCompanyId]);

  // Check if we are configuring a specific enterprise or the personal profile
  const isCompanyContext = !!activeCompanyId && activeCompanyId !== "personnel";

  // Enterprise Settings State
  const defaultCompanyName = user.name
    ? `${user.name.toLowerCase().replace(/\s+/g, "_")}`
    : "mon_entreprise";
  const [storeName, setStoreName] = useState(defaultCompanyName);
  const [storeTagline, setStoreTagline] = useState(
    "Vente de produits digitaux, formations & accès VIP",
  );
  const [supportEmail, setSupportEmail] = useState(user.email || "support@mansa.app");
  const [storeCurrency, setStoreCurrency] = useState("XOF");
  const [payoutMethod, setPayoutMethod] = useState<
    "wave" | "orange_momo" | "bank_uemoa" | "bank_cemac" | "crypto"
  >("wave");

  // Enterprise Banner & Profile Photo State
  const [companyBanner, setCompanyBanner] = useState<string>(
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1800&q=85",
  );
  const [companyLogo, setCompanyLogo] = useState<string>("");

  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Mobile Money Details
  const [momoNumber, setMomoNumber] = useState("+225 07 00 00 00 00");
  const [momoName, setMomoName] = useState(user.name || "Compte Mobile Money");
  const [isWaveConfigOpen, setIsWaveConfigOpen] = useState(false);
  const [waveDialCode, setWaveDialCode] = useState("+225");
  const [wavePhoneNumber, setWavePhoneNumber] = useState("0700000000");
  const [waveAccountName, setWaveAccountName] = useState(user.name || "");
  const [waveVerificationStatus, setWaveVerificationStatus] = useState<
    "not_configured" | "pending" | "configured"
  >("not_configured");
  const [paymentCategory, setPaymentCategory] = useState<
    "all" | "card" | "transfers" | "wallet" | "other"
  >("all");
  const [includeDefaultPaymentMethods, setIncludeDefaultPaymentMethods] = useState(true);
  const [paymentConfigMethod, setPaymentConfigMethod] = useState<string | null>(null);
  const [paymentConfigDialCode, setPaymentConfigDialCode] = useState("+225");
  const [paymentConfigPhone, setPaymentConfigPhone] = useState("");
  const [paymentConfigName, setPaymentConfigName] = useState(user.name || "");
  const [paymentVerificationStatuses, setPaymentVerificationStatuses] = useState<
    Record<string, "not_configured" | "pending" | "configured">
  >({});

  const waveCountryOptions = Object.values(DIAL_CODE_CONFIGS).filter((country) =>
    country.operators.some((operator) => operator.id === "wave"),
  );
  const waveValidation = validatePhoneNumber(waveDialCode, "wave", wavePhoneNumber, storeCurrency);
  const paymentMethods = DEFAULT_PAYMENT_METHODS;
  const selectedPaymentMethod = paymentMethods.find((method) => method.id === paymentConfigMethod);
  const selectedMobileOperator =
    selectedPaymentMethod && ["orange", "mtn", "moov"].includes(selectedPaymentMethod.id)
      ? selectedPaymentMethod.id
      : null;
  const paymentConfigCountries = selectedMobileOperator
    ? Object.values(DIAL_CODE_CONFIGS).filter((country) =>
        country.operators.some((operator) => operator.id === selectedMobileOperator),
      )
    : [];
  const paymentConfigValidation = selectedMobileOperator
    ? validatePhoneNumber(
        paymentConfigDialCode,
        selectedMobileOperator,
        paymentConfigPhone,
        storeCurrency,
      )
    : { isValid: true };
  const templatePaymentMethods = paymentMethods.map((method) => ({
    ...method,
    pending:
      (method.id === "wave" && waveVerificationStatus === "pending") ||
      paymentVerificationStatuses[method.id] === "pending",
  }));

  // African Bank Account Details
  const [bankName, setBankName] = useState("Ecobank Côte d'Ivoire / UEMOA");
  const [bankIbanRib, setBankIbanRib] = useState("CI059 01001 12345678901 45");
  const [bankAccountHolder, setBankAccountHolder] = useState(
    `${user.name.toUpperCase()} ENTREPRISE`,
  );

  // Loading & Feedback States
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load existing profile or company settings on mount / change
  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      setPayoutMethod("wave");
      setMomoNumber("");
      setMomoName(user.name || "");
      setWaveVerificationStatus("not_configured");
      setWaveDialCode("+225");
      setWavePhoneNumber("");
      setWaveAccountName(user.name || "");
      setPaymentCategory("all");
      setIncludeDefaultPaymentMethods(true);
      setPaymentConfigMethod(null);
      setPaymentConfigDialCode("+225");
      setPaymentConfigPhone("");
      setPaymentConfigName(user.name || "");
      setPaymentVerificationStatuses({});
      setBankName("Ecobank Côte d'Ivoire / UEMOA");
      setBankIbanRib("");
      setBankAccountHolder(`${user.name.toUpperCase()} ENTREPRISE`);
      setIsWaveConfigOpen(false);
      setIsLoadingProfile(true);
      try {
        const userKey = user.uid || user.email || "default";

        if (isCompanyContext && activeCompanyId) {
          // STRICT ENTERPRISE ISOLATION:
          // Read from specific company settings first
          const isolatedRaw = localStorage.getItem(`mansa_company_settings_${activeCompanyId}`);
          const isolated = isolatedRaw ? JSON.parse(isolatedRaw) : null;

          // If not in isolated cache, search in user companies
          const userCompanies = getSavedCompanies(userKey);
          const comp = userCompanies.find((c) => c.id === activeCompanyId);

          const target = isolated || comp;
          if (target && isMounted) {
            setStoreName(target.name || activeCompanyName || "Mon Entreprise");
            setStoreTagline(target.description || "");
            setSupportEmail(target.supportEmail || user.email || "");
            if (target.primaryCurrency) setStoreCurrency(target.primaryCurrency);
            if (target.payoutMethod) setPayoutMethod(target.payoutMethod);
            if (target.momoNumber) {
              setMomoNumber(target.momoNumber);
              if (target.payoutMethod === "wave") {
                const savedWaveDialCode = Object.keys(DIAL_CODE_CONFIGS).find((dialCode) =>
                  target.momoNumber.startsWith(dialCode),
                );
                if (savedWaveDialCode) {
                  setWaveDialCode(savedWaveDialCode);
                  setWavePhoneNumber(
                    normalizePhoneNumber(
                      target.momoNumber.replace(savedWaveDialCode, "").trim(),
                      savedWaveDialCode,
                    ),
                  );
                }
              }
            }
            if (target.momoName) {
              setMomoName(target.momoName);
              if (target.payoutMethod === "wave") setWaveAccountName(target.momoName);
            }
            if (target.payoutVerificationStatus)
              setWaveVerificationStatus(target.payoutVerificationStatus);
            if (typeof target.includeDefaultPaymentMethods === "boolean") {
              setIncludeDefaultPaymentMethods(target.includeDefaultPaymentMethods);
            }
            if (target.paymentVerificationStatuses) {
              setPaymentVerificationStatuses(target.paymentVerificationStatuses);
            }
            if (target.bankName) setBankName(target.bankName);
            if (target.bankIbanRib) setBankIbanRib(target.bankIbanRib);
            if (target.bankAccountHolder) setBankAccountHolder(target.bankAccountHolder);
            if (target.companyBanner) setCompanyBanner(target.companyBanner);
            if (target.companyLogo) setCompanyLogo(target.companyLogo);
          } else if (isMounted) {
            setStoreName(activeCompanyName || "Mon Entreprise");
          }
        } else {
          // Personal profile settings
          if (user.uid) {
            const profile = await getUserProfile(user.uid);
            if (profile && isMounted) {
              if (profile.storeName) setStoreName(profile.storeName);
              if (profile.storeTagline) setStoreTagline(profile.storeTagline);
              if (profile.supportEmail) setSupportEmail(profile.supportEmail);
              if (profile.storeCurrency) setStoreCurrency(profile.storeCurrency);
              if (profile.payoutMethod) setPayoutMethod(profile.payoutMethod);
              if (profile.momoNumber) setMomoNumber(profile.momoNumber);
              if (profile.momoName) setMomoName(profile.momoName);
              if (profile.payoutVerificationStatus)
                setWaveVerificationStatus(profile.payoutVerificationStatus);
              if (profile.bankName) setBankName(profile.bankName);
              if (profile.bankIbanRib) setBankIbanRib(profile.bankIbanRib);
              if (profile.bankAccountHolder) setBankAccountHolder(profile.bankAccountHolder);
              if (profile.companyBanner || profile.storeBanner) {
                setCompanyBanner(profile.companyBanner || profile.storeBanner || "");
              }
              if (profile.companyLogo || profile.storeLogo) {
                setCompanyLogo(profile.companyLogo || profile.storeLogo || "");
              }
            }
          }
        }
      } catch (err: unknown) {
        console.warn("Failed to load settings:", err);
      } finally {
        if (isMounted) setIsLoadingProfile(false);
      }
    };

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, [user.uid, user.email, activeCompanyId, isCompanyContext, activeCompanyName]);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCompanyBanner(await uploadProjectAsset(file, `${user.uid || "anonymous"}/branding`));
    } catch (error) {
      console.error("Company banner upload failed:", error);
      setSaveError(getUserFacingErrorMessage(error, "Impossible de téléverser la bannière. Réessayez."));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCompanyLogo(await uploadProjectAsset(file, `${user.uid || "anonymous"}/branding`));
    } catch (error) {
      console.error("Company logo upload failed:", error);
      setSaveError(getUserFacingErrorMessage(error, "Impossible de téléverser le logo. Réessayez."));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    setSaveError(null);
    setSavedSuccess(false);

    try {
      const userKey = user.uid || user.email || "default";

      if (isCompanyContext && activeCompanyId) {
        // STRICT ENTERPRISE ISOLATION:
        // Save EXCLUSIVELY for this enterprise ID.
        // It does NOT modify any other company, nor does it overwrite the personal profile!
        const companySettings = {
          id: activeCompanyId,
          name: storeName.trim(),
          description: storeTagline.trim(),
          supportEmail: supportEmail.trim(),
          primaryCurrency: storeCurrency,
          companyBanner: companyBanner.trim(),
          companyLogo: companyLogo.trim(),
          payoutMethod,
          momoNumber: momoNumber.trim(),
          momoName: momoName.trim(),
          payoutVerificationStatus: waveVerificationStatus,
          includeDefaultPaymentMethods,
          paymentVerificationStatuses,
          bankName,
          bankIbanRib: bankIbanRib.trim(),
          bankAccountHolder: bankAccountHolder.trim(),
        };

        localStorage.setItem(
          `mansa_company_settings_${activeCompanyId}`,
          JSON.stringify(companySettings),
        );

        const currentCompanies = getSavedCompanies(userKey);
        const updatedCompanies = currentCompanies.map((c) => {
          if (c.id === activeCompanyId) {
            return {
              ...c,
              ...companySettings,
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        });
        try {
          localStorage.removeItem(`mansa_companies_${userKey}`);
        } catch {}

        updateCompanyBranding(userKey, activeCompanyId, {
          name: storeName.trim(),
          description: storeTagline.trim(),
          companyBanner: companyBanner.trim(),
          companyLogo: companyLogo.trim(),
        });
        updateSubscriptionBranding(userKey, activeCompanyId, {
          companyName: storeName.trim(),
          companyBanner: companyBanner.trim(),
          companyLogo: companyLogo.trim(),
        });

        window.dispatchEvent(
          new CustomEvent("mansa_companies_updated", { detail: updatedCompanies }),
        );
        window.dispatchEvent(
          new CustomEvent("mansa_company_branding_changed", {
            detail: { companyId: activeCompanyId, branding: companySettings },
          }),
        );
      } else {
        // Personal profile save
        if (!user.uid) {
          setSaveError("Reconnectez-vous pour enregistrer ces paramètres.");
          setIsSaving(false);
          return;
        }

        const updatedProfile = await updateUserProfile(user.uid, {
          storeName: storeName.trim(),
          storeTagline: storeTagline.trim(),
          supportEmail: supportEmail.trim(),
          storeCurrency,
          companyBanner: companyBanner.trim(),
          storeBanner: companyBanner.trim(),
          companyLogo: companyLogo.trim(),
          storeLogo: companyLogo.trim(),
          payoutMethod,
          momoNumber: momoNumber.trim(),
          momoName: momoName.trim(),
          payoutVerificationStatus: waveVerificationStatus,
          bankName,
          bankIbanRib: bankIbanRib.trim(),
          bankAccountHolder: bankAccountHolder.trim(),
        });

        window.dispatchEvent(
          new CustomEvent("mansa_profile_updated", {
            detail: updatedProfile,
          }),
        );
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: unknown) {
      console.error("Enterprise settings save error:", err);
      setSaveError(getUserFacingErrorMessage(err, "Impossible d’enregistrer les paramètres. Réessayez."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header with Settings Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {activeTab === "store"
                ? isCompanyContext
                  ? `Paramètres de l'entreprise (${storeName || activeCompanyName})`
                  : lang === "fr"
                    ? "Paramètres de l'Entreprise"
                    : "Enterprise Settings"
                : lang === "fr"
                  ? "Paramètres du Compte"
                  : "Account Settings"}
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {activeTab === "store"
              ? companySettingsSection === "menu"
                ? "Choisissez une rubrique pour configurer votre entreprise."
                : companySettingsSection === "general"
                  ? "Configurez l'identité et la présentation de votre entreprise."
                  : "Configurez vos moyens de versement et vos coordonnées financières."
              : "Gérez votre profil public Mansa, votre bio, votre identifiant et vos préférences d'affichage."}
          </p>
        </div>

        {/* Dual Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#121316] border border-white/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "account"
                ? "bg-[#00D26A] text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <User className="size-3.5" />
            <span>{lang === "fr" ? "Profil & Compte" : "Profile & Account"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("store")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "store"
                ? "bg-[#00D26A] text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Building2 className="size-3.5" />
            <span>{lang === "fr" ? "Entreprise" : "Enterprise"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: PARAMÈTRES DU COMPTE & PROFIL (EXACT REPRODUCTION) */}
      {/* ========================================================================= */}
      {activeTab === "account" ? (
        <AccountSettingsModal
          isModal={false}
          user={user}
          onLogout={onLogout}
          onDeleteAccount={onDeleteAccount}
          lang={lang}
          initialTab="profil"
        />
      ) : /* ========================================================================= */
      /* MODE 2: PARAMÈTRES DE L'ENTREPRISE MANSA */
      /* ========================================================================= */
      companySettingsSection === "menu" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d0e] p-5 sm:p-6">
            <div className="flex items-center gap-2 pb-4 border-b border-white/5">
              <Building2 className="size-4 text-[#00D26A]" />
              <h2 className="text-sm font-bold text-white">Paramètres de l'entreprise</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <button
                type="button"
                onClick={() => setCompanySettingsSection("general")}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-[#14161b] p-4 text-left transition-all hover:border-[#00D26A]/60 hover:bg-[#00D26A]/5"
              >
                <span>
                  <span className="block text-sm font-bold text-white">Général</span>
                  <span className="mt-1 block text-xs text-zinc-400">
                    Identité, vitrine, logo et bannière
                  </span>
                </span>
                <span className="text-lg text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-[#00D26A]">
                  ›
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCompanySettingsSection("payment")}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-[#14161b] p-4 text-left transition-all hover:border-[#00D26A]/60 hover:bg-[#00D26A]/5"
              >
                <span>
                  <span className="block text-sm font-bold text-white">Paiement</span>
                  <span className="mt-1 block text-xs text-zinc-400">
                    Versements, Mobile Money et coordonnées bancaires
                  </span>
                </span>
                <span className="text-lg text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-[#00D26A]">
                  ›
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {isLoadingProfile && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 p-2">
              <Loader2 className="size-3.5 animate-spin text-[#00D26A]" />
              <span>Chargement des paramètres...</span>
            </div>
          )}

          {savedSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs font-semibold text-emerald-400 shadow-md animate-in fade-in">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Les paramètres de votre entreprise ont été enregistrés avec succès !</span>
            </div>
          )}

          {saveError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3.5 text-xs font-semibold text-red-400 shadow-md animate-in fade-in">
              <AlertCircle className="size-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCompanySettingsSection("menu")}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              ← Paramètres
            </button>
            <span className="text-xs text-zinc-600">/</span>
            <span className="text-xs font-semibold text-[#00D26A]">
              {companySettingsSection === "general" ? "Général" : "Paiement"}
            </span>
          </div>

          {/* 1. Identity & Branding */}
          {companySettingsSection === "general" && (
            <>
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d0e] p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                  <Building2 className="size-4 text-[#00D26A]" />
                  <h3 className="text-sm font-bold text-white">
                    Identité de l'Entreprise & Vitrine
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Nom de l'entreprise
                    </label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Nom de l'entreprise"
                      className="w-full rounded-xl border border-white/10 bg-[#16181f] p-2.5 text-white outline-none focus:border-[#00D26A]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Email du support client
                    </label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#16181f] p-2.5 text-white outline-none focus:border-[#00D26A]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Description de la vitrine & Slogan
                    </label>
                    <input
                      type="text"
                      value={storeTagline}
                      onChange={(e) => setStoreTagline(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#16181f] p-2.5 text-white outline-none focus:border-[#00D26A]"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Visual Branding: Bannière et Photo de profil de l'entreprise */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d0e] p-6 space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Camera className="size-4 text-[#00D26A]" />
                    <h3 className="text-sm font-bold text-white">
                      Bannière & Photo de Profil de l'Entreprise
                    </h3>
                  </div>
                </div>

                {/* LIVE PREVIEW COMPOSITE (Banner + Overlayed Profile Photo) */}
                <div className="space-y-2">
                  <label className="block text-xs text-zinc-300 font-semibold">
                    Aperçu en direct de votre marque
                  </label>
                  <div className="relative w-full h-36 sm:h-44 rounded-2xl overflow-hidden border border-white/10 bg-[#14161f] shadow-inner group">
                    <img
                      src={
                        companyBanner ||
                        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1800&q=85"
                      }
                      alt="Aperçu de la bannière"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

                    {/* Profile Photo Overlaid */}
                    <div className="absolute bottom-3 left-4 flex items-end gap-3 z-10">
                      <div className="relative size-16 sm:size-20 rounded-2xl border-2 border-black bg-[#121316] shadow-xl overflow-hidden shrink-0">
                        {companyLogo ? (
                          <img
                            src={companyLogo}
                            alt="Aperçu du logo"
                            className="size-full object-cover mansa-avatar-image"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center mansa-profile-avatar text-xl font-black">
                            {storeName.trim().slice(0, 2).toUpperCase() || "AF"}
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 size-2.5 rounded-full bg-emerald-400 ring-2 ring-black" />
                      </div>
                      <div className="text-white drop-shadow-md pb-0.5">
                        <h4 className="text-sm font-bold tracking-tight">
                          {storeName || "Mon Entreprise"}
                        </h4>
                        <p className="text-[11px] text-zinc-300 line-clamp-1">
                          {storeTagline || "Slogan ou description de l'entreprise"}
                        </p>
                      </div>
                    </div>

                    <div className="absolute top-2.5 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-[10px] text-zinc-300 font-mono">
                      Aperçu temps réel
                    </div>
                  </div>
                </div>

                {/* BANNER CONFIGURATION */}
                <div className="p-4 rounded-xl bg-[#14151a] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="size-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">
                        Bannière de l'entreprise (1800 x 600 recommandé)
                      </span>
                    </div>
                    {/* Upload Trigger Button */}
                    <div>
                      <input
                        ref={bannerFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => bannerFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Upload className="size-3" />
                        <span>Téléverser une image</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Presets for Banner */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                      Ou choisir une bannière premium prédéfinie :
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        {
                          label: "Trading & Finance",
                          url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1800&q=85",
                        },
                        {
                          label: "Émeraude Prestige",
                          url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1800&q=85",
                        },
                        {
                          label: "Cyber Studio",
                          url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1800&q=85",
                        },
                        {
                          label: "Minimaliste Dark",
                          url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1800&q=85",
                        },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setCompanyBanner(preset.url)}
                          className={`relative h-12 rounded-lg overflow-hidden border transition-all text-left p-1.5 cursor-pointer ${
                            companyBanner === preset.url
                              ? "border-[#00D26A] ring-1 ring-[#00D26A]"
                              : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="absolute inset-0 size-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 hover:bg-black/40 transition-colors" />
                          <span className="relative z-10 text-[10px] font-bold text-white drop-shadow block line-clamp-1">
                            {preset.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* PROFILE PHOTO / LOGO CONFIGURATION */}
                <div className="p-4 rounded-xl bg-[#14151a] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <User className="size-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">
                        Photo de profil / Logo de l'entreprise
                      </span>
                    </div>
                    {/* Upload Trigger Button */}
                    <div>
                      <input
                        ref={logoFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Upload className="size-3" />
                        <span>Téléverser une photo</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Presets for Logo */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                      Ou choisir un logo/avatar prédéfini :
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        {
                          label: "Émeraude abstrait",
                          url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80",
                        },
                        {
                          label: "Réseau numérique",
                          url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=300&q=80",
                        },
                        {
                          label: "Gradient graphite",
                          url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=300&q=80",
                        },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setCompanyLogo(preset.url)}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all text-left cursor-pointer bg-[#0d0e12] ${
                            companyLogo === preset.url
                              ? "border-[#00D26A] bg-[#00D26A]/10"
                              : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="size-8 rounded-lg object-cover shrink-0 mansa-avatar-image"
                          />
                          <span className="text-[10px] font-semibold text-zinc-200 line-clamp-1">
                            {preset.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {companySettingsSection === "payment" && (
            <>
              <PaymentMethodsTemplate
                methods={templatePaymentMethods}
                includeDefaultPaymentMethods={includeDefaultPaymentMethods}
                onToggleDefaultPaymentMethods={() =>
                  setIncludeDefaultPaymentMethods((value) => !value)
                }
                paymentCategory={paymentCategory}
                onPaymentCategoryChange={setPaymentCategory}
                onConfigure={(method) => {
                  if (method.id === "wave") {
                    setPayoutMethod("wave");
                    setIsWaveConfigOpen(true);
                  } else {
                    setPaymentConfigMethod(method.id);
                    setPaymentConfigPhone("");
                    setPaymentConfigName(user.name || "");
                    if (method.category === "wallet") setPaymentConfigDialCode("+225");
                  }
                }}
                onRestoreDefaults={() => {
                  setPaymentCategory("all");
                  setIncludeDefaultPaymentMethods(true);
                  setPayoutMethod("wave");
                  setWaveVerificationStatus("not_configured");
                }}
                onCancel={() => setCompanySettingsSection("menu")}
              />
            </>
          )}

          {paymentConfigMethod && selectedPaymentMethod && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111318] p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-10 items-center justify-center rounded-xl text-xs font-black text-white"
                      style={{ backgroundColor: selectedPaymentMethod.color }}
                    >
                      {selectedPaymentMethod.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        Configurer {selectedPaymentMethod.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        Renseignez les informations nécessaires pour activer cette méthode.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaymentConfigMethod(null)}
                    aria-label="Fermer la configuration"
                    className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-4 text-xs">
                  {selectedMobileOperator && (
                    <>
                      <div>
                        <label className="mb-1 block font-semibold text-zinc-300">Pays</label>
                        <select
                          value={paymentConfigDialCode}
                          onChange={(event) => {
                            setPaymentConfigDialCode(event.target.value);
                            setPaymentConfigPhone("");
                          }}
                          className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 text-white outline-none focus:border-[#00D26A]"
                        >
                          {paymentConfigCountries.map((country) => (
                            <option key={country.dialCode} value={country.dialCode}>
                              {country.countryName} ({country.dialCode})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block font-semibold text-zinc-300">
                          Numéro {selectedPaymentMethod.name}
                        </label>
                        <div
                          className={`flex items-center rounded-lg border bg-[#101114] ${paymentConfigValidation.isValid ? "border-emerald-500/70" : "border-white/10"}`}
                        >
                          <span className="border-r border-white/10 px-3 py-2.5 font-mono text-zinc-400">
                            {paymentConfigDialCode}
                          </span>
                          <input
                            type="tel"
                            inputMode="numeric"
                            value={paymentConfigPhone}
                            onChange={(event) =>
                              setPaymentConfigPhone(
                                normalizePhoneNumber(event.target.value, paymentConfigDialCode),
                              )
                            }
                            placeholder={
                              DIAL_CODE_CONFIGS[paymentConfigDialCode]?.operators.find(
                                (operator) => operator.id === selectedMobileOperator,
                              )?.format
                            }
                            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-white outline-none placeholder:text-zinc-600"
                          />
                        </div>
                        {paymentConfigPhone && !paymentConfigValidation.isValid && (
                          <p className="mt-1 text-[10px] text-red-300">
                            {paymentConfigValidation.errorMessage || "Numéro invalide."}
                          </p>
                        )}
                        {paymentConfigValidation.isValid && paymentConfigPhone && (
                          <p className="mt-1 text-[10px] text-emerald-300">Numéro valide.</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block font-semibold text-zinc-300">
                          Nom du titulaire
                        </label>
                        <input
                          type="text"
                          value={paymentConfigName}
                          onChange={(event) => setPaymentConfigName(event.target.value)}
                          placeholder="Nom associé au compte"
                          className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 text-white outline-none focus:border-[#00D26A]"
                        />
                      </div>
                    </>
                  )}

                  {selectedPaymentMethod.id === "bank" && (
                    <>
                      <div>
                        <label className="mb-1 block font-semibold text-zinc-300">
                          Banque partenaire
                        </label>
                        <select
                          value={bankName}
                          onChange={(event) => setBankName(event.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 text-white outline-none"
                        >
                          <option>Ecobank (UEMOA / CEMAC)</option>
                          <option>Coris Bank International</option>
                          <option>Société Générale (SGCI / SGS)</option>
                          <option>United Bank for Africa (UBA)</option>
                          <option>NSIA Banque</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block font-semibold text-zinc-300">
                          Titulaire du compte
                        </label>
                        <input
                          type="text"
                          value={bankAccountHolder}
                          onChange={(event) => setBankAccountHolder(event.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 text-white outline-none focus:border-[#00D26A]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block font-semibold text-zinc-300">RIB / IBAN</label>
                        <input
                          type="text"
                          value={bankIbanRib}
                          onChange={(event) => setBankIbanRib(event.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 font-mono text-white outline-none focus:border-[#00D26A]"
                        />
                      </div>
                    </>
                  )}

                  {selectedPaymentMethod.id === "card" && (
                    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-zinc-300">
                      <p className="font-semibold text-white">Vérification du compte marchand</p>
                      <p className="leading-relaxed text-zinc-400">
                        La connexion sécurisée du prestataire carte bancaire sera nécessaire avant
                        d’accepter les paiements.
                      </p>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="accent-[#00D26A]" /> J’autorise la
                        vérification de mon identité
                      </label>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() => setPaymentConfigMethod(null)}
                      className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      disabled={
                        (Boolean(selectedMobileOperator) &&
                          (!paymentConfigValidation.isValid || !paymentConfigName.trim())) ||
                        (selectedPaymentMethod.id === "bank" &&
                          (!bankIbanRib.trim() || !bankAccountHolder.trim()))
                      }
                      onClick={() => {
                        if (selectedMobileOperator) {
                          setPayoutMethod("orange_momo");
                          setMomoNumber(`${paymentConfigDialCode} ${paymentConfigPhone}`);
                          setMomoName(paymentConfigName.trim());
                        } else if (selectedPaymentMethod.id === "bank") {
                          setPayoutMethod("bank_uemoa");
                        }
                        setPaymentVerificationStatuses((current) => ({
                          ...current,
                          [selectedPaymentMethod.id]: "pending",
                        }));
                        setPaymentConfigMethod(null);
                      }}
                      className="rounded-xl bg-[#00D26A] px-4 py-2.5 text-xs font-bold text-black transition-colors hover:bg-[#10E47A] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Continuer la vérification
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isWaveConfigOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111318] p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-[#1DC3FD]/15 text-[#1DC3FD]">
                      <Smartphone className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Configurer Wave</h3>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        Ajoutez le compte qui recevra vos versements.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsWaveConfigOpen(false)}
                    aria-label="Fermer la configuration Wave"
                    className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-4 text-xs">
                  <div>
                    <label className="mb-1 block font-semibold text-zinc-300">Pays</label>
                    <select
                      value={waveDialCode}
                      onChange={(event) => {
                        setWaveDialCode(event.target.value);
                        setWavePhoneNumber("");
                      }}
                      className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 text-white outline-none focus:border-[#00D26A]"
                    >
                      {waveCountryOptions.map((country) => (
                        <option key={country.dialCode} value={country.dialCode}>
                          {country.countryName} ({country.dialCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-zinc-300">Numéro Wave</label>
                    <div
                      className={`flex items-center rounded-lg border bg-[#101114] ${waveValidation.isValid ? "border-emerald-500/70" : "border-white/10"}`}
                    >
                      <span className="border-r border-white/10 px-3 py-2.5 font-mono text-zinc-400">
                        {waveDialCode}
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={wavePhoneNumber}
                        onChange={(event) =>
                          setWavePhoneNumber(normalizePhoneNumber(event.target.value, waveDialCode))
                        }
                        placeholder={
                          DIAL_CODE_CONFIGS[waveDialCode]?.operators.find(
                            (operator) => operator.id === "wave",
                          )?.format || "07 XX XX XX XX"
                        }
                        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-white outline-none placeholder:text-zinc-600"
                      />
                    </div>
                    {wavePhoneNumber && !waveValidation.isValid && (
                      <p className="mt-1 text-[10px] text-red-300">
                        {waveValidation.errorMessage || "Numéro Wave invalide."}
                      </p>
                    )}
                    {waveValidation.isValid && (
                      <p className="mt-1 text-[10px] text-emerald-300">Numéro Wave valide.</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-zinc-300">
                      Nom du titulaire
                    </label>
                    <input
                      type="text"
                      value={waveAccountName}
                      onChange={(event) => setWaveAccountName(event.target.value)}
                      placeholder="Nom associé au compte Wave"
                      className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 text-white outline-none focus:border-[#00D26A]"
                    />
                  </div>

                  <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-zinc-300">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="accent-[#00D26A]" />
                      Recevoir les paiements de mes clients
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="accent-[#00D26A]" />
                      Recevoir mes versements
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsWaveConfigOpen(false)}
                      className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      disabled={!waveValidation.isValid || !waveAccountName.trim()}
                      onClick={() => {
                        setMomoNumber(`${waveDialCode} ${wavePhoneNumber}`);
                        setMomoName(waveAccountName.trim());
                        setWaveVerificationStatus("pending");
                        setIsWaveConfigOpen(false);
                      }}
                      className="rounded-xl bg-[#00D26A] px-4 py-2.5 text-xs font-bold text-black transition-colors hover:bg-[#10E47A] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Continuer la vérification
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {companySettingsSection !== "payment" && (
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold cursor-pointer transition-colors"
              >
                <LogOut className="size-3.5" />
                <span>Se déconnecter</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-[#00D26A] hover:bg-[#10E47A] disabled:opacity-50 disabled:cursor-not-allowed text-black px-6 py-2.5 text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    <span>Enregistrer les modifications</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
};
