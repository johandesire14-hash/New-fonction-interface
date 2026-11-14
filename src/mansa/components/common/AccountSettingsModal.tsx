// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Link2,
  ShieldCheck,
  Bookmark,
  Bell,
  CreditCard,
  Folder,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  ChevronLeft,
  DollarSign,
  MapPin,
  Store,
  Users,
  Copy,
  Check,
  LogOut,
  Smartphone,
  ExternalLink,
  Trash2,
  Key,
  Globe,
  Receipt,
  Download,
  LifeBuoy,
  Loader2,
  Sun,
  Moon,
} from "lucide-react";
import {
  getUserProfile,
  updateUserProfile,
  type AccountPaymentSettings,
} from "../../services/dbService";
import { subscribeToCreatorTransactions } from "../../services/dbService";
import { supabase } from "../../services/supabase";
import { CustomerPurchasesView } from "../dashboard/CustomerPurchasesView";
import { ActivityView } from "./ActivityView";
import { AccountPortfolioTab } from "./AccountPortfolioTab";
import { useModalDismiss } from "../../hooks/useModalDismiss";
import { siteUrl } from "@/lib/site";
import { getUserFacingErrorMessage } from "../../utils/userFacingError";
import {
  DIAL_CODE_CONFIGS,
  normalizePhoneNumber,
  validatePhoneNumber,
} from "../../utils/phoneValidationRules";
import {
  DEFAULT_PAYMENT_METHODS,
  PaymentMethodsTemplate,
  type PaymentMethodCategory,
} from "./PaymentMethodsTemplate";
import { SecuritySettingsPanel } from "./SecuritySettingsPanel";
import { AccountVerificationPanel } from "./AccountVerificationPanel";
import { ResolutionCenterPanel } from "./ResolutionCenterPanel";
import { ConfirmActionModal } from "./ConfirmActionModal";
import { AppTheme, getAppTheme, setAppTheme, THEME_CHANGE_EVENT } from "../../utils/theme";

export type AccountSettingsTab =
  | "profil"
  | "invitations"
  | "comptes_connectes"
  | "securite"
  | "commandes"
  | "notifications"
  | "paiements"
  | "portefeuille"
  | "verifications"
  | "resolution";

interface AccountSettingsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
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
  initialTab?: AccountSettingsTab;
  isModal?: boolean;
  onOpenCompany?: (company: unknown) => void;
}

const createDefaultAccountPaymentSettings = (): AccountPaymentSettings => ({
  includeDefaultPaymentMethods: true,
  paymentVerificationStatuses: {},
  methods: {},
});

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen = true,
  onClose,
  lang = "fr",
  user,
  onLogout,
  onDeleteAccount,
  initialTab = "profil",
  isModal = true,
  onOpenCompany,
}) => {
  const userId = user?.uid || "user_default";
  const [activeTab, setActiveTab] = useState<AccountSettingsTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [appTheme, setAppThemeState] = useState<AppTheme>(() => getAppTheme());
  const [isDeleteAccountConfirmOpen, setIsDeleteAccountConfirmOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(isModal);

  useEffect(() => {
    if (isModal) setMobileMenuOpen(true);
  }, [isModal]);

  useEffect(() => {
    const syncTheme = (event?: Event) => {
      const eventTheme = (event as CustomEvent<AppTheme> | undefined)?.detail;
      setAppThemeState(eventTheme || getAppTheme());
    };
    syncTheme();
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
  }, []);

  // Profil Form State
  const [username, setUsername] = useState(
    user.handle || (user.email ? user.email.split("@")[0] : "johandesire16"),
  );
  const [bio, setBio] = useState("");
  const [birthDate, setBirthDate] = useState("");

  // Toggles for "Plus de détails"
  const [showTotalEarned, setShowTotalEarned] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showOwnedBusinesses, setShowOwnedBusinesses] = useState(true);
  const [showJoinedWhops, setShowJoinedWhops] = useState(true);

  // Status & loaders
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [profileOverview, setProfileOverview] = useState({
    totalEarned: 0,
    currency: "XOF",
    country: "Non renseigné",
    ownedSpaces: [],
    joinedCommunities: [],
  });

  // Other tabs state
  const [copiedLink, setCopiedLink] = useState(false);

  // Connected accounts
  const [discordConnected, setDiscordConnected] = useState(true);
  const [telegramConnected, setTelegramConnected] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(true);
  const [xConnected, setXConnected] = useState(false);

  // Personal account payment settings are stored on the user profile, not on any company.
  const [accountPaymentCategory, setAccountPaymentCategory] =
    useState<PaymentMethodCategory>("all");
  const [accountPaymentSettings, setAccountPaymentSettings] = useState<AccountPaymentSettings>(
    createDefaultAccountPaymentSettings,
  );
  const [accountPaymentConfigMethod, setAccountPaymentConfigMethod] = useState<string | null>(null);
  const [accountPaymentCurrency, setAccountPaymentCurrency] = useState("XOF");
  const [accountPaymentConfigDraft, setAccountPaymentConfigDraft] = useState({
    dialCode: "+225",
    phone: "",
    accountName: user.name || "",
    bankName: "Ecobank (UEMOA / CEMAC)",
    bankIbanRib: "",
    bankAccountHolder: user.name || "",
    identityAuthorized: false,
  });
  const [isSavingAccountPayments, setIsSavingAccountPayments] = useState(false);
  const [accountPaymentSaveSuccess, setAccountPaymentSaveSuccess] = useState(false);
  const [accountPaymentSaveError, setAccountPaymentSaveError] = useState<string | null>(null);

  // Load existing profile from Firestore on mount
  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      if (!userId) return;
      setAccountPaymentSettings(createDefaultAccountPaymentSettings());
      setAccountPaymentCategory("all");
      setAccountPaymentConfigMethod(null);
      setAccountPaymentCurrency("XOF");
      setAccountPaymentSaveSuccess(false);
      setAccountPaymentSaveError(null);
      setAccountPaymentConfigDraft({
        dialCode: "+225",
        phone: "",
        accountName: user.name || "",
        bankName: "Ecobank (UEMOA / CEMAC)",
        bankIbanRib: "",
        bankAccountHolder: user.name || "",
        identityAuthorized: false,
      });
      setIsLoadingProfile(true);
      try {
        const profile = await getUserProfile(userId);
        if (profile && isMounted) {
          if (profile.handle) setUsername(profile.handle.replace(/^@/, ""));
          if (profile.bio !== undefined) setBio(profile.bio);
          if (profile.birthDate !== undefined) setBirthDate(profile.birthDate);
          if (profile.showTotalEarned !== undefined) setShowTotalEarned(profile.showTotalEarned);
          if (profile.showLocation !== undefined) setShowLocation(profile.showLocation);
          if (profile.showOwnedBusinesses !== undefined) {
            setShowOwnedBusinesses(profile.showOwnedBusinesses);
          } else if (profile.showOwnedWhops !== undefined) {
            setShowOwnedBusinesses(profile.showOwnedWhops);
          }
          if (profile.showJoinedWhops !== undefined) setShowJoinedWhops(profile.showJoinedWhops);
          if (profile.storeCurrency || profile.currency) {
            setAccountPaymentCurrency(profile.storeCurrency || profile.currency);
          }
          if (profile.accountPaymentSettings) {
            setAccountPaymentSettings({
              includeDefaultPaymentMethods:
                profile.accountPaymentSettings.includeDefaultPaymentMethods ?? true,
              paymentVerificationStatuses:
                profile.accountPaymentSettings.paymentVerificationStatuses ?? {},
              methods: profile.accountPaymentSettings.methods ?? {},
            });
          }
        }
      } catch (err: any) {
        console.error("Failed to load user profile from Firestore:", err);
      } finally {
        if (isMounted) setIsLoadingProfile(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [userId, user.name]);

  useEffect(() => {
    let mounted = true;
    const loadProfileOverview = async () => {
      if (!userId || userId === "user_default") return;
      const [profile, ownedResult, membershipsResult] = await Promise.all([
        getUserProfile(userId),
        supabase.from("communities").select("id, name").eq("owner_id", userId),
        supabase.from("community_members").select("community_id").eq("member_id", userId),
      ]);
      const joinedIds = (membershipsResult.data || [])
        .map((row) => row.community_id)
        .filter(Boolean);
      const joinedResult = joinedIds.length
        ? await supabase.from("communities").select("id, name").in("id", joinedIds)
        : { data: [] };
      if (mounted) {
        setProfileOverview((current) => ({
          ...current,
          currency: profile?.currency || profile?.storeCurrency || "XOF",
          country: profile?.country || "Non renseigné",
          ownedSpaces: ownedResult.data || [],
          joinedCommunities: joinedResult.data || [],
        }));
      }
    };
    void loadProfileOverview().catch((error) =>
      console.error("Impossible de charger l’aperçu du profil:", error),
    );
    const unsubscribe = subscribeToCreatorTransactions(userId, (transactions) => {
      if (!mounted) return;
      const totalEarned = transactions
        .filter((transaction) => transaction.status === "completed")
        .reduce((total, transaction) => total + Number(transaction.amountNumber || 0), 0);
      setProfileOverview((current) => ({ ...current, totalEarned }));
    });
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [userId]);

  const selectedAccountPaymentMethod = DEFAULT_PAYMENT_METHODS.find(
    (method) => method.id === accountPaymentConfigMethod,
  );
  const accountMobileOperator =
    selectedAccountPaymentMethod &&
    ["wave", "orange", "mtn", "moov"].includes(selectedAccountPaymentMethod.id)
      ? selectedAccountPaymentMethod.id
      : null;
  const accountPaymentCountries = accountMobileOperator
    ? Object.values(DIAL_CODE_CONFIGS).filter((country) =>
        country.operators.some((operator) => operator.id === accountMobileOperator),
      )
    : [];
  const accountPaymentValidation = accountMobileOperator
    ? validatePhoneNumber(
        accountPaymentConfigDraft.dialCode,
        accountMobileOperator,
        accountPaymentConfigDraft.phone,
        accountPaymentCurrency,
      )
    : { isValid: true };
  const accountPaymentTemplateMethods = DEFAULT_PAYMENT_METHODS.map((method) => ({
    ...method,
    pending: accountPaymentSettings.paymentVerificationStatuses[method.id] === "pending",
  }));

  const handleConfigureAccountPaymentMethod = (methodId: string) => {
    const existing = accountPaymentSettings.methods[methodId] || {};
    const operatorId = ["wave", "orange", "mtn", "moov"].includes(methodId) ? methodId : null;
    const supportedCountries = operatorId
      ? Object.values(DIAL_CODE_CONFIGS).filter((country) =>
          country.operators.some((operator) => operator.id === operatorId),
        )
      : [];
    const dialCode =
      supportedCountries.find((country) => country.dialCode === existing.dialCode)?.dialCode ??
      supportedCountries.find((country) => country.dialCode === "+225")?.dialCode ??
      supportedCountries[0]?.dialCode ??
      "+225";

    setAccountPaymentConfigDraft({
      dialCode,
      phone: existing.phone || "",
      accountName: existing.accountName || user.name || "",
      bankName: existing.bankName || "Ecobank (UEMOA / CEMAC)",
      bankIbanRib: existing.bankIbanRib || "",
      bankAccountHolder: existing.bankAccountHolder || user.name || "",
      identityAuthorized: existing.identityAuthorized || false,
    });
    setAccountPaymentSaveError(null);
    setAccountPaymentConfigMethod(methodId);
  };

  const handleConfirmAccountPaymentMethod = () => {
    if (!selectedAccountPaymentMethod) return;

    const methodId = selectedAccountPaymentMethod.id;
    const methodConfig = accountMobileOperator
      ? {
          dialCode: accountPaymentConfigDraft.dialCode,
          phone: normalizePhoneNumber(
            accountPaymentConfigDraft.phone,
            accountPaymentConfigDraft.dialCode,
          ),
          accountName: accountPaymentConfigDraft.accountName.trim(),
        }
      : methodId === "bank"
        ? {
            bankName: accountPaymentConfigDraft.bankName,
            bankIbanRib: accountPaymentConfigDraft.bankIbanRib.trim(),
            bankAccountHolder: accountPaymentConfigDraft.bankAccountHolder.trim(),
          }
        : { identityAuthorized: accountPaymentConfigDraft.identityAuthorized };

    setAccountPaymentSettings((current) => ({
      ...current,
      methods: { ...current.methods, [methodId]: methodConfig },
      paymentVerificationStatuses: {
        ...current.paymentVerificationStatuses,
        [methodId]: "pending",
      },
    }));
    setAccountPaymentConfigMethod(null);
  };

  const handleSaveAccountPaymentSettings = async () => {
    setIsSavingAccountPayments(true);
    setAccountPaymentSaveError(null);
    setAccountPaymentSaveSuccess(false);
    try {
      await updateUserProfile(userId, { accountPaymentSettings });
      setAccountPaymentSaveSuccess(true);
      setTimeout(() => setAccountPaymentSaveSuccess(false), 3500);
    } catch (err: unknown) {
      console.error("Account payment settings save failed:", err);
      setAccountPaymentSaveError(
        getUserFacingErrorMessage(
          err,
          "Impossible d’enregistrer les méthodes de paiement. Réessayez.",
        ),
      );
    } finally {
      setIsSavingAccountPayments(false);
    }
  };

  if (isModal && !isOpen) return null;

  const handleCopyProfileLink = () => {
    const link = siteUrl(`/@${username}`);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updatedProfile = await updateUserProfile(userId, {
        handle: username.trim().startsWith("@") ? username.trim() : `@${username.trim()}`,
        bio: bio.trim(),
        birthDate: birthDate.trim(),
        showTotalEarned,
        showLocation,
        showOwnedBusinesses,
        showOwnedWhops: showOwnedBusinesses,
        showJoinedWhops,
      });
      window.dispatchEvent(
        new CustomEvent("mansa_profile_updated", { detail: updatedProfile }),
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error("Error saving user profile:", err);
      setSaveError(
        getUserFacingErrorMessage(err, "Impossible d’enregistrer le profil. Réessayez."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  interface NavItem {
    id: AccountSettingsTab;
    label: string;
    fullLabel?: string;
    icon: React.ComponentType<{ className?: string }>;
  }

  const navItems: NavItem[] = [
    { id: "profil", label: "Profil", icon: User },
    { id: "invitations", label: "Invitations", icon: Mail },
    { id: "comptes_connectes", label: "Comptes connectés", icon: Link2 },
    { id: "securite", label: "Sécurité du compte", icon: ShieldCheck },
    { id: "commandes", label: "Activité", fullLabel: "Mon activité", icon: Bookmark },
    { id: "notifications", label: "Notifications", icon: Bell },
    {
      id: "paiements",
      label: "Méthodes de paie...",
      fullLabel: "Méthodes de paiement",
      icon: CreditCard,
    },
    { id: "portefeuille", label: "Portefeuille", icon: Folder },
    { id: "verifications", label: "Vérifications", icon: CheckCircle2 },
    { id: "resolution", label: "Centre de résolution", icon: AlertCircle },
  ];

  const filteredNavItems = navItems.filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.fullLabel && item.fullLabel.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const containerContent = (
    <div
      className={`w-full ${
        isModal
          ? "max-w-5xl bg-[#111216] border border-white/[0.08] rounded-t-[28px] md:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[min(680px,92vh)] max-h-[92vh]"
          : "w-full bg-[#111216] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[620px]"
      }`}
    >
      {/* MOBILE SETTINGS SHEET (< md) */}
      <div className={`${mobileMenuOpen ? "flex" : "hidden"} md:hidden min-h-0 flex-1 flex-col bg-[#111216] select-none`}>
        <div className="flex justify-center pt-3"><span className="h-1.5 w-16 rounded-full bg-white/15" aria-hidden="true" /></div>
        <div className="flex items-center justify-between px-7 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-[#252830] text-sm font-bold text-white">
              {user?.avatarInitials || user?.name?.slice(0, 2).toUpperCase() || "U"}
            </div>
            <div>
              <p className="text-lg font-semibold text-white">{user.name}</p>
              <button type="button" onClick={() => { setActiveTab("profil"); setMobileMenuOpen(false); }} className="text-sm text-zinc-400 hover:text-white">Voir le profil</button>
            </div>
          </div>
          {isModal && onClose && <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white"><X className="size-5" /></button>}
        </div>
        <div className="mx-7 border-t border-white/10" />
        <nav className="min-h-0 flex-1 overflow-y-auto px-7 py-2">
          {[
            { id: "notifications" as AccountSettingsTab, label: "Notifications", icon: Bell },
            { id: "resolution" as AccountSettingsTab, label: "Centre de résolution", icon: AlertCircle },
            { id: "commandes" as AccountSettingsTab, label: "Mon activité", icon: Bookmark },
            { id: "profil" as AccountSettingsTab, label: "Paramètres du profil", icon: User },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => { setActiveTab(id); setMobileMenuOpen(false); }} className="flex min-h-14 w-full items-center gap-4 text-left text-[17px] text-white transition-colors hover:text-emerald-300">
              <Icon className="size-6 shrink-0 text-zinc-200" strokeWidth={1.8} /><span>{label}</span>
            </button>
          ))}
          <div className="my-2 border-t border-white/10" />
          {navItems.filter((item) => ["invitations", "comptes_connectes", "securite", "paiements", "portefeuille", "verifications"].includes(item.id)).map((item) => {
            const Icon = item.icon;
            return <button key={item.id} type="button" onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }} className="flex min-h-14 w-full items-center gap-4 text-left text-[17px] text-white transition-colors hover:text-emerald-300"><Icon className="size-6 shrink-0 text-zinc-200" strokeWidth={1.8} /><span>{item.fullLabel || item.label}</span></button>;
          })}
          <button type="button" onClick={() => setAppTheme(appTheme === "dark" ? "light" : "dark")} className="flex min-h-14 w-full items-center gap-4 text-left text-[17px] text-white transition-colors hover:text-emerald-300">
            {appTheme === "dark" ? <Moon className="size-6 text-zinc-200" strokeWidth={1.8} /> : <Sun className="size-6 text-zinc-200" strokeWidth={1.8} />}<span>Apparence</span>
          </button>
        </nav>
        <div className="mx-7 border-t border-white/10" />
        <div className="px-7 pb-6 pt-2"><button type="button" onClick={onLogout} disabled={!onLogout} className="flex min-h-14 w-full items-center gap-4 text-left text-[17px] text-white transition-colors hover:text-red-300 disabled:opacity-50"><LogOut className="size-6 text-zinc-200" strokeWidth={1.8} /><span>{lang === "fr" ? "Se déconnecter" : "Log out"}</span></button></div>
      </div>

      {/* DESKTOP LEFT SIDEBAR (>= md) */}
      <aside className="hidden md:flex md:w-96 shrink-0 bg-[#0e0f12] border-r border-white/[0.08] flex-col justify-between p-3.5 select-none">
        <div className="space-y-3">
          {/* Title */}
          <div className="px-2 pt-1 pb-0.5">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Paramètres du compte
            </h2>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Paramètres de recherche"
              className="w-full rounded-xl bg-[#16181d] border border-white/[0.06] pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-white/20 transition-all"
            />
          </div>

          {/* Navigation links */}
          <nav className="mt-2">
            <div className="space-y-0.5">
              {filteredNavItems
                .filter((item) => item.id !== "resolution")
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as AccountSettingsTab)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                        isActive
                          ? "bg-[#252830] text-white font-semibold shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon className={`size-4 ${isActive ? "text-white" : "text-zinc-400"}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
            </div>
            {filteredNavItems.some((item) => item.id === "resolution") && (
              <div className="mt-0.5 flex items-stretch gap-1 border-t border-white/[0.06] pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("resolution")}
                  aria-label="Centre de résolution"
                  className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[9px] font-medium leading-tight transition-colors cursor-pointer ${
                    activeTab === "resolution"
                      ? "bg-[#252830] text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  }`}
                >
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span className="text-center">Centre de résolution</span>
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  disabled={!onLogout}
                  className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border border-red-900/30 bg-[#331414] px-1 py-1 text-[9px] font-semibold leading-tight text-red-300 transition-colors hover:bg-[#421a1a] disabled:opacity-50"
                >
                  <LogOut className="size-3.5 shrink-0" />
                  <span className="text-center">{lang === "fr" ? "Déconnexion" : "Log out"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteAccountConfirmOpen(true)}
                  disabled={!onDeleteAccount}
                  aria-label={lang === "fr" ? "Supprimer mon compte" : "Delete my account"}
                  className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border border-red-500/30 bg-red-950/40 px-1 py-1 text-[9px] font-semibold leading-tight text-red-300 transition-colors hover:bg-red-900/50 disabled:opacity-50"
                >
                  <Trash2 className="size-3.5 shrink-0" />
                  <span className="text-center">
                    {lang === "fr" ? "Supprimer mon compte" : "Delete account"}
                  </span>
                </button>
              </div>
            )}
          </nav>
        </div>
      </aside>

      {/* RIGHT MAIN PANEL */}
      <main className={`${mobileMenuOpen ? "hidden md:flex" : "flex"} flex-1 bg-[#111216] flex-col overflow-hidden`}>
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMobileMenuOpen(true)} className="md:hidden rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Retour aux paramètres"><ChevronLeft className="size-4" /></button>
            <h1 className="text-base font-bold text-white capitalize">
              {activeTab === "profil" && "Profil"}
              {activeTab === "invitations" && "Invitations"}
              {activeTab === "comptes_connectes" && "Comptes connectés"}
              {activeTab === "securite" && "Sécurité du compte"}
              {activeTab === "commandes" && "Mon activité"}
              {activeTab === "notifications" && "Notifications"}
              {activeTab === "paiements" && "Méthodes de paiement"}
              {activeTab === "portefeuille" && "Portefeuille"}
              {activeTab === "verifications" && "Vérifications"}
              {activeTab === "resolution" && "Centre de résolution"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy public profile URL button */}
            <button
              onClick={handleCopyProfileLink}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer relative"
              title="Copier le lien public de votre profil"
            >
              {copiedLink ? (
                <Check className="size-4 text-[#00D26A]" />
              ) : (
                <Link2 className="size-4" />
              )}
              {copiedLink && (
                <span className="absolute -bottom-7 right-0 text-[10px] bg-zinc-900 border border-white/10 text-emerald-400 px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                  Lien copié !
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Body Content (Scrollable) */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* ================================================================= */}
          {/* 1. TAB: PROFIL */}
          {/* ================================================================= */}
          {activeTab === "profil" && (
            <div className="space-y-5">
              <section className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#14161b] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[#1d2027] text-zinc-300">
                    {appTheme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Apparence</h3>
                    <p className="mt-0.5 text-[11px] text-zinc-400">
                      Mode {appTheme === "dark" ? "sombre" : "clair"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-pressed={appTheme === "dark"}
                  aria-label={
                    appTheme === "dark" ? "Activer le mode clair" : "Activer le mode sombre"
                  }
                  onClick={() => setAppTheme(appTheme === "dark" ? "light" : "dark")}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors ${appTheme === "dark" ? "bg-[#0055ff]" : "bg-zinc-700"}`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md transition-transform ${appTheme === "dark" ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </section>

              {/* Notifications / Alerts */}
              {saveSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-semibold text-emerald-400 animate-in fade-in">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>Votre profil a été enregistré avec succès</span>
                </div>
              )}

              {saveError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs font-semibold text-red-400">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {isLoadingProfile ? (
                <div className="py-8 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
                  <Loader2 className="size-5 animate-spin text-[#0055ff]" />
                  <span>Chargement du profil...</span>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {/* Field: Nom d'utilisateur */}
                  <div className="rounded-xl border border-white/[0.08] bg-[#14161b] p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Nom d'utilisateur</span>
                    <div className="flex items-center rounded-lg bg-[#191b22] border border-white/[0.08] px-3 py-1.5 text-xs text-white font-mono">
                      <span className="text-zinc-400">@</span>
                      <input
                        type="text"
                        value={username.replace(/^@/, "")}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-transparent text-xs text-white outline-none pl-0.5 font-mono w-36 sm:w-44"
                      />
                    </div>
                  </div>

                  {/* Field: Bio */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-white">Bio</label>
                    <div className="rounded-xl border border-white/[0.08] bg-[#14161b] p-3">
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Parlez de votre parcours ou de vos communautés..."
                        rows={3}
                        className="w-full bg-transparent text-xs text-white placeholder-zinc-600 outline-none resize-none"
                      />
                    </div>
                  </div>

                  {/* Field: Date de naissance */}
                  <div className="rounded-xl border border-white/[0.08] bg-[#14161b] p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Date de naissance</span>
                    <div className="flex items-center rounded-lg bg-[#191b22] border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-300 font-mono">
                      <input
                        type="text"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        placeholder="jj / mm / aaaa"
                        className="bg-transparent text-xs text-white placeholder-zinc-500 outline-none text-center w-28 font-mono"
                      />
                    </div>
                  </div>

                  {/* Section: Plus de détails */}
                  <div className="space-y-2 pt-1">
                    <h3 className="text-xs font-bold text-white">Plus de détails</h3>
                    <p className="text-[11px] text-zinc-400">
                      Choisissez ce qui apparaît sur votre profil et d'autres surfaces de
                      découverte.
                    </p>

                    {/* Switch list items */}
                    <div className="rounded-xl border border-white/[0.08] bg-[#14161b] divide-y divide-white/[0.06] overflow-hidden">
                      {/* 1. Total gagné */}
                      <div className="flex items-center justify-between p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-[#1d2027] text-zinc-300">
                            <DollarSign className="size-4" />
                          </div>
                          <span className="text-xs font-semibold text-white">Total gagné</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowTotalEarned(!showTotalEarned)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out p-0.5 ${
                            showTotalEarned ? "bg-[#0055ff]" : "bg-zinc-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              showTotalEarned ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* 2. Emplacement */}
                      <div className="flex items-center justify-between p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-[#1d2027] text-zinc-300">
                            <MapPin className="size-4" />
                          </div>
                          <span className="text-xs font-semibold text-white">
                            Emplacement géographique
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowLocation(!showLocation)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out p-0.5 ${
                            showLocation ? "bg-[#0055ff]" : "bg-zinc-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              showLocation ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* 3. Boutiques possédées */}
                      <div className="flex items-center justify-between p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-[#1d2027] text-zinc-300">
                            <Store className="size-4" />
                          </div>
                          <span className="text-xs font-semibold text-white">
                            Espaces / Boutiques possédés
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowOwnedBusinesses(!showOwnedBusinesses)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out p-0.5 ${
                            showOwnedBusinesses ? "bg-[#0055ff]" : "bg-zinc-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              showOwnedBusinesses ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* 4. Communautés rejointes */}
                      <div className="flex items-center justify-between p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-[#1d2027] text-zinc-300">
                            <Users className="size-4" />
                          </div>
                          <span className="text-xs font-semibold text-white">
                            Communautés rejointes
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowJoinedWhops(!showJoinedWhops)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out p-0.5 ${
                            showJoinedWhops ? "bg-[#0055ff]" : "bg-zinc-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              showJoinedWhops ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Save Button for Profile */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0055ff] hover:bg-[#0047d6] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Enregistrement en cours...</span>
                        </>
                      ) : (
                        <span>Enregistrer les modifications</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* 2. TAB: INVITATIONS */}
          {/* ================================================================= */}
          {activeTab === "invitations" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.08] bg-[#14161b] p-4 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white">Inviter des membres & co-créateurs</h4>
                    <p className="text-zinc-400 text-[11px]">
                      Partagez votre lien d'invitation personnel pour débloquer des commissions.
                    </p>
                  </div>
                  <button
                    onClick={handleCopyProfileLink}
                    className="px-3 py-1.5 rounded-lg bg-[#0055ff] hover:bg-blue-600 text-white font-medium text-xs cursor-pointer"
                  >
                    Générer un lien
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#14161b] p-6 text-center text-xs text-zinc-500">
                Aucune invitation en attente pour le moment.
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 3. TAB: COMPTES CONNECTÉS */}
          {/* ================================================================= */}
          {activeTab === "comptes_connectes" && (
            <div className="space-y-3">
              {[
                {
                  name: "Discord",
                  desc: "Synchronisation des rôles et accès aux serveurs VIP",
                  connected: discordConnected,
                  toggle: () => setDiscordConnected(!discordConnected),
                  icon: Users,
                  color: "text-[#5865F2]",
                },
                {
                  name: "Telegram",
                  desc: "Livraison des canaux secrets et alertes de vente",
                  connected: telegramConnected,
                  toggle: () => setTelegramConnected(!telegramConnected),
                  icon: Smartphone,
                  color: "text-[#229ED9]",
                },
                {
                  name: "Google",
                  desc: "Authentification rapide et synchronisation Drive",
                  connected: googleConnected,
                  toggle: () => setGoogleConnected(!googleConnected),
                  icon: Globe,
                  color: "text-red-400",
                },
                {
                  name: "X (Twitter)",
                  desc: "Partage automatique et badges créateur",
                  connected: xConnected,
                  toggle: () => setXConnected(!xConnected),
                  icon: Link2,
                  color: "text-zinc-300",
                },
              ].map((acc) => (
                <div
                  key={acc.name}
                  className="rounded-xl border border-white/[0.08] bg-[#14161b] p-3.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-[#1e2027] ${acc.color}`}>
                      <acc.icon className="size-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-white text-xs block">{acc.name}</span>
                      <span className="text-[11px] text-zinc-400">{acc.desc}</span>
                    </div>
                  </div>
                  <button
                    onClick={acc.toggle}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      acc.connected
                        ? "border border-red-500/30 text-red-400 hover:bg-red-500/10"
                        : "bg-[#0055ff] text-white hover:bg-blue-600"
                    }`}
                  >
                    {acc.connected ? "Déconnecter" : "Connecter"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ================================================================= */}
          {/* 4. TAB: SÉCURITÉ DU COMPTE */}
          {/* ================================================================= */}
          {activeTab === "securite" && <SecuritySettingsPanel email={user.email} />}

          {/* ================================================================= */}
          {/* 5. TAB: COMMANDES & ACHATS */}
          {/* ================================================================= */}
          {activeTab === "commandes" && (
            <div className="h-full overflow-y-auto p-4 sm:p-6">
              <ActivityView userKey={userId} onOpenCompany={onOpenCompany} />
              <div className="mt-8 border-t border-white/10 pt-6">
                <CustomerPurchasesView lang={lang} isEmbeddedInSettings={true} />
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 6. TAB: NOTIFICATIONS */}
          {/* ================================================================= */}
          {activeTab === "notifications" && (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-white/[0.08] bg-[#14161b] p-4 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white block">
                    Alertes de ventes instantanées
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Recevez un ping à chaque nouveau paiement Wave ou Mobile Money.
                  </span>
                </div>
                <button className="h-6 w-11 rounded-full bg-[#0055ff] p-0.5 relative inline-flex cursor-pointer">
                  <span className="size-5 rounded-full bg-white translate-x-5 transition-transform" />
                </button>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#14161b] p-4 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white block">
                    Rapports hebdomadaires de revenus
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Récapitulatif chaque lundi matin par email.
                  </span>
                </div>
                <button className="h-6 w-11 rounded-full bg-[#0055ff] p-0.5 relative inline-flex cursor-pointer">
                  <span className="size-5 rounded-full bg-white translate-x-5 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 7. TAB: MÉTHODES DE PAIEMENT */}
          {/* ================================================================= */}
          {activeTab === "paiements" && (
            <div className="space-y-4">
              {accountPaymentSaveSuccess && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400">
                  Les méthodes de paiement du compte ont été enregistrées.
                </div>
              )}
              {accountPaymentSaveError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-400">
                  {accountPaymentSaveError}
                </div>
              )}
              <PaymentMethodsTemplate
                methods={accountPaymentTemplateMethods}
                includeDefaultPaymentMethods={accountPaymentSettings.includeDefaultPaymentMethods}
                onToggleDefaultPaymentMethods={() =>
                  setAccountPaymentSettings((current) => ({
                    ...current,
                    includeDefaultPaymentMethods: !current.includeDefaultPaymentMethods,
                  }))
                }
                paymentCategory={accountPaymentCategory}
                onPaymentCategoryChange={setAccountPaymentCategory}
                onConfigure={(method) => handleConfigureAccountPaymentMethod(method.id)}
                onRestoreDefaults={() => {
                  setAccountPaymentCategory("all");
                  setAccountPaymentSettings(createDefaultAccountPaymentSettings());
                  setAccountPaymentSaveError(null);
                  setAccountPaymentSaveSuccess(false);
                }}
                onSave={handleSaveAccountPaymentSettings}
                isSaving={isSavingAccountPayments}
              />

              {accountPaymentConfigMethod && selectedAccountPaymentMethod && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
                  <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111318] p-5 shadow-2xl">
                    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex size-10 items-center justify-center rounded-xl text-xs font-black text-white"
                          style={{ backgroundColor: selectedAccountPaymentMethod.color }}
                        >
                          {selectedAccountPaymentMethod.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <h3 className="text-base font-bold text-white">
                            Configurer {selectedAccountPaymentMethod.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-zinc-400">
                            Renseignez les informations nécessaires pour activer cette méthode.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAccountPaymentConfigMethod(null)}
                        aria-label="Fermer la configuration"
                        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <div className="mt-4 space-y-4 text-xs">
                      {accountMobileOperator && (
                        <>
                          <div>
                            <label className="mb-1 block font-semibold text-zinc-300">Pays</label>
                            <select
                              value={accountPaymentConfigDraft.dialCode}
                              onChange={(event) =>
                                setAccountPaymentConfigDraft((current) => ({
                                  ...current,
                                  dialCode: event.target.value,
                                  phone: "",
                                }))
                              }
                              className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 text-white outline-none focus:border-[#00D26A]"
                            >
                              {accountPaymentCountries.map((country) => (
                                <option key={country.dialCode} value={country.dialCode}>
                                  {country.countryName} ({country.dialCode})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block font-semibold text-zinc-300">
                              Numéro {selectedAccountPaymentMethod.name}
                            </label>
                            <div
                              className={`flex items-center rounded-lg border bg-[#101114] ${accountPaymentValidation.isValid ? "border-emerald-500/70" : "border-white/10"}`}
                            >
                              <span className="border-r border-white/10 px-3 py-2.5 font-mono text-zinc-400">
                                {accountPaymentConfigDraft.dialCode}
                              </span>
                              <input
                                type="tel"
                                inputMode="numeric"
                                value={accountPaymentConfigDraft.phone}
                                onChange={(event) =>
                                  setAccountPaymentConfigDraft((current) => ({
                                    ...current,
                                    phone: normalizePhoneNumber(
                                      event.target.value,
                                      current.dialCode,
                                    ),
                                  }))
                                }
                                placeholder={
                                  DIAL_CODE_CONFIGS[
                                    accountPaymentConfigDraft.dialCode
                                  ]?.operators.find(
                                    (operator) => operator.id === accountMobileOperator,
                                  )?.format
                                }
                                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-white outline-none placeholder:text-zinc-600"
                              />
                            </div>
                            {accountPaymentConfigDraft.phone &&
                              !accountPaymentValidation.isValid && (
                                <p className="mt-1 text-[10px] text-red-300">
                                  {accountPaymentValidation.errorMessage || "Numéro invalide."}
                                </p>
                              )}
                          </div>
                          <div>
                            <label className="mb-1 block font-semibold text-zinc-300">
                              Nom du titulaire
                            </label>
                            <input
                              type="text"
                              value={accountPaymentConfigDraft.accountName}
                              onChange={(event) =>
                                setAccountPaymentConfigDraft((current) => ({
                                  ...current,
                                  accountName: event.target.value,
                                }))
                              }
                              placeholder="Nom associé au compte"
                              className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 text-white outline-none focus:border-[#00D26A]"
                            />
                          </div>
                        </>
                      )}

                      {selectedAccountPaymentMethod.id === "bank" && (
                        <>
                          <div>
                            <label className="mb-1 block font-semibold text-zinc-300">
                              Banque partenaire
                            </label>
                            <select
                              value={accountPaymentConfigDraft.bankName}
                              onChange={(event) =>
                                setAccountPaymentConfigDraft((current) => ({
                                  ...current,
                                  bankName: event.target.value,
                                }))
                              }
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
                              value={accountPaymentConfigDraft.bankAccountHolder}
                              onChange={(event) =>
                                setAccountPaymentConfigDraft((current) => ({
                                  ...current,
                                  bankAccountHolder: event.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 text-white outline-none focus:border-[#00D26A]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block font-semibold text-zinc-300">
                              RIB / IBAN
                            </label>
                            <input
                              type="text"
                              value={accountPaymentConfigDraft.bankIbanRib}
                              onChange={(event) =>
                                setAccountPaymentConfigDraft((current) => ({
                                  ...current,
                                  bankIbanRib: event.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-white/10 bg-[#101114] p-2.5 font-mono text-white outline-none focus:border-[#00D26A]"
                            />
                          </div>
                        </>
                      )}

                      {selectedAccountPaymentMethod.id === "card" && (
                        <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-zinc-300">
                          <p className="font-semibold text-white">
                            Vérification du compte marchand
                          </p>
                          <p className="leading-relaxed text-zinc-400">
                            La connexion sécurisée du prestataire carte bancaire sera nécessaire
                            avant d’accepter les paiements.
                          </p>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={accountPaymentConfigDraft.identityAuthorized}
                              onChange={(event) =>
                                setAccountPaymentConfigDraft((current) => ({
                                  ...current,
                                  identityAuthorized: event.target.checked,
                                }))
                              }
                              className="accent-[#00D26A]"
                            />
                            J’autorise la vérification de mon identité
                          </label>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                        <button
                          type="button"
                          onClick={() => setAccountPaymentConfigMethod(null)}
                          className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          disabled={
                            (Boolean(accountMobileOperator) &&
                              (!accountPaymentValidation.isValid ||
                                !accountPaymentConfigDraft.accountName.trim())) ||
                            (selectedAccountPaymentMethod.id === "bank" &&
                              (!accountPaymentConfigDraft.bankIbanRib.trim() ||
                                !accountPaymentConfigDraft.bankAccountHolder.trim())) ||
                            (selectedAccountPaymentMethod.id === "card" &&
                              !accountPaymentConfigDraft.identityAuthorized)
                          }
                          onClick={handleConfirmAccountPaymentMethod}
                          className="rounded-xl bg-[#00D26A] px-4 py-2.5 text-xs font-bold text-black transition-colors hover:bg-[#10E47A] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Continuer la vérification
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* 8. TAB: PORTEFEUILLE */}
          {/* ================================================================= */}
          {activeTab === "portefeuille" && (
            <AccountPortfolioTab
              creatorId={user?.uid || user?.email || "creator-default"}
              accountHolder={user?.name || ""}
              currency={accountPaymentCurrency}
            />
          )}

          {/* ================================================================= */}
          {/* 9. TAB: VÉRIFICATIONS */}
          {/* ================================================================= */}
          {activeTab === "verifications" && <AccountVerificationPanel userId={userId} />}

          {/* ================================================================= */}
          {/* 10. TAB: CENTRE DE RÉSOLUTION */}
          {/* ================================================================= */}
          {activeTab === "resolution" && (
            <ResolutionCenterPanel
              userId={userId}
              customerName={user?.name || ""}
              customerEmail={user?.email || ""}
            />
          )}
        </div>
      </main>
      <ConfirmActionModal
        isOpen={isDeleteAccountConfirmOpen}
        onClose={() => setIsDeleteAccountConfirmOpen(false)}
        onConfirm={async () => {
          if (!onDeleteAccount) return;
          await onDeleteAccount();
        }}
        title={
          lang === "fr"
            ? "Supprimer définitivement votre compte ?"
            : "Permanently delete your account?"
        }
        description={
          lang === "fr"
            ? "Votre compte de connexion et votre profil seront supprimés. Cette action ne peut pas être annulée."
            : "Your sign-in account and profile will be deleted. This action cannot be undone."
        }
        itemName={user?.email || user?.name}
        itemType={lang === "fr" ? "Compte utilisateur" : "User account"}
        consequences={
          lang === "fr"
            ? [
                "Vous serez immédiatement déconnecté et ne pourrez plus accéder à ce compte.",
                "Les contenus et données partagés avec d’autres utilisateurs ne sont pas supprimés automatiquement.",
              ]
            : [
                "You will be signed out immediately and will no longer be able to access this account.",
                "Content and data shared with other users are not automatically deleted.",
              ]
        }
        confirmButtonText={lang === "fr" ? "Supprimer mon compte" : "Delete my account"}
        requireTextMatch={lang === "fr" ? "SUPPRIMER" : "DELETE"}
        lang={lang}
      />
    </div>
  );

  const { overlayProps, contentProps } = useModalDismiss({
    isOpen: isModal && isOpen && !!onClose,
    onClose: onClose || (() => {}),
    closeOnEscape: true,
  });

  if (isModal) {
    if (!isOpen) return null;
    return (
      <div
        {...overlayProps}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200 cursor-pointer"
      >
        <div {...contentProps} className="w-full flex items-center justify-center cursor-default">
          {containerContent}
        </div>
      </div>
    );
  }

  return <div className="max-w-4xl mx-auto">{containerContent}</div>;
};
