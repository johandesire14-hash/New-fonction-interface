// @ts-nocheck
import React, { useState } from "react";
import {
  X,
  Star,
  Share2,
  Zap,
  ArrowRight,
  ShieldCheck,
  Lock,
  Check,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Smartphone,
  CreditCard,
  MessageSquare,
  Users,
  UserPlus,
  GraduationCap,
  BookOpen,
  FileText,
  Headphones,
  Sparkles,
  LayoutDashboard,
  FileCheck,
} from "lucide-react";
import { TelegramIcon, DiscordIcon } from "../common/Icons";
import {
  EnterpriseSubscription,
  TelegramChannelItem,
  DiscordChannelItem,
  CreatorPlatformOffer,
} from "../../types";
import { MobileMoneyPaymentForm } from "../payment/MobileMoneyPaymentForm";
import { PhoneValidationResult } from "../../utils/phoneValidationRules";
import { useModalDismiss } from "../../hooks/useModalDismiss";
import {
  createRealTransaction,
  persistFreeMemberEntitlement,
  persistVerifiedMemberEntitlement,
} from "../../services/dbService";
import { recordConfirmedSale } from "../../services/creatorPayoutLedger";
import { CheckoutPreviewModal } from "./CheckoutPreviewModal";
import { persistCustomerPurchase } from "./CustomerPurchasesView";

export type { CreatorPlatformOffer };

interface OfferCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: CreatorPlatformOffer | null;
  user?: {
    uid?: string;
    name?: string;
    email?: string;
    avatarInitials?: string;
  };
  onPaymentSuccess: (newSubscription: EnterpriseSubscription) => void;
  isCompanyOwner?: boolean;
  isAlreadyPurchased?: boolean;
  onAccessContent?: (offer: CreatorPlatformOffer) => void;
}

export const OfferCheckoutModal: React.FC<OfferCheckoutModalProps> = ({
  isOpen,
  onClose,
  offer,
  user,
  onPaymentSuccess,
  isCompanyOwner = false,
  isAlreadyPurchased = false,
  onAccessContent,
}) => {
  if (!isOpen || !offer) return null;

  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    offer.pricingOptions && offer.pricingOptions.length > 0
      ? offer.pricingOptions[0].id
      : "monthly",
  );
  const [paymentMethod, setPaymentMethod] = useState<"card" | "mobile_money">("mobile_money");
  const [mobileMoneyValidation, setMobileMoneyValidation] = useState<PhoneValidationResult | null>(
    null,
  );
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string>(user?.email || "client@mansa.app");
  const customerName = user?.name || (user as any)?.displayName || "Client";
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
  const [createdSubscription, setCreatedSubscription] = useState<EnterpriseSubscription | null>(
    null,
  );

  const defaultFaqs =
    offer.faqs && offer.faqs.length > 0
      ? offer.faqs
      : [
          {
            q: "Comment fonctionne l'accès après le paiement ?",
            a: "Votre accès à l'entreprise est débloqué instantanément. Vos applications et fichiers inclus sont disponibles dans votre espace membre.",
          },
          {
            q: "Ai-je accès à toutes les options de l'entreprise ?",
            a: "En débloquant cette offre, vous avez accès à l'accueil, au support client et à toutes les applications incluses dans la formule choisie.",
          },
          {
            q: "Puis-je résilier à tout moment ?",
            a: "Oui, la gestion s'effectue en 1 clic depuis votre espace membre dans Mansa. Aucun engagement de durée, vous gardez l'accès jusqu'à la fin de la période facturée.",
          },
        ];

  const pricingPlans =
    offer.pricingOptions && offer.pricingOptions.length > 0
      ? offer.pricingOptions
      : [
          {
            id: "monthly",
            name: "Abonnement Mensuel",
            price: offer.priceAmount,
            billing: "par mois",
          },
          {
            id: "yearly",
            name: "Annuel (-20% de réduction)",
            price: Math.round(offer.priceAmount * 12 * 0.8),
            billing: "par an",
          },
        ];

  const currentPlan = pricingPlans.find((p) => p.id === selectedPlanId) || pricingPlans[0];

  // Resolve all apps strictly to the 4 official Mansa Apps: Telegram, Discord, Fichiers, Cours & formations
  const resolvedApps = React.useMemo<string[]>(() => {
    const list: string[] = [];
    if (offer.includedApps && offer.includedApps.length > 0) {
      for (const app of offer.includedApps) {
        const lower = app.toLowerCase();
        if (lower.includes("telegram")) list.push("Telegram");
        else if (lower.includes("discord")) list.push("Discord");
        else if (lower.includes("cours") || lower.includes("course") || lower.includes("formation"))
          list.push("Cours & formations");
        else if (
          lower.includes("fichier") ||
          lower.includes("file") ||
          lower.includes("ebook") ||
          lower.includes("téléchargement")
        )
          list.push("Fichiers");
      }
    }
    if (offer.telegramChannels && offer.telegramChannels.length > 0 && !list.includes("Telegram")) {
      list.push("Telegram");
    }
    if (offer.discordChannels && offer.discordChannels.length > 0 && !list.includes("Discord")) {
      list.push("Discord");
    }
    if (
      ((offer.courses && offer.courses.length > 0) ||
        ((offer as any).courseModules && (offer as any).courseModules.length > 0)) &&
      !list.includes("Cours & formations")
    ) {
      list.push("Cours & formations");
    }
    if (
      ((offer.ebooks && offer.ebooks.length > 0) ||
        ((offer as any).digitalFiles && (offer as any).digitalFiles.length > 0)) &&
      !list.includes("Fichiers")
    ) {
      list.push("Fichiers");
    }
    return Array.from(new Set(list));
  }, [offer]);
  const storefrontApps = resolvedApps.filter((app) => !/(cours|course|formation)/i.test(app));

  const getAppDetail = (appKey: string) => {
    const key = appKey.toLowerCase();
    if (key.includes("telegram")) {
      return {
        title: "Telegram",
        description:
          offer.telegramChannels?.[0]?.description ||
          "Alertes privées, signaux et canal de diffusion officiel réservé aux membres.",
        badge: "Telegram",
        icon: <TelegramIcon className="size-5 text-[#229ED9]" />,
      };
    }
    if (key.includes("discord")) {
      return {
        title: "Discord",
        description:
          offer.discordChannels?.[0]?.description ||
          "Salons textuels et vocaux VIP avec attribution automatique des rôles.",
        badge: "Discord",
        icon: <DiscordIcon className="size-5 text-[#5865F2]" />,
      };
    }
    if (key.includes("cours") || key.includes("course") || key.includes("formation")) {
      return {
        title: "Cours & Formations vidéo",
        description:
          offer.courses?.[0]?.description ||
          "Accès complet au cursus vidéo interactif et fiches d'exercices pratiques.",
        badge: "Formation",
        icon: <GraduationCap className="size-5 text-indigo-400" />,
      };
    }
    return {
      title: "Fichiers & Documents",
      description: "Templates, fichiers téléchargeables et guides immédiatement disponibles.",
      badge: "Fichiers",
      icon: <FileText className="size-5 text-emerald-400" />,
    };
  };

  const isMobileMoneyValid =
    paymentMethod === "mobile_money" ? Boolean(mobileMoneyValidation?.isValid) : true;

  const isPayButtonDisabled =
    isProcessing || (offer.pricingType === "paid" && !isCompanyOwner && !isMobileMoneyValid);

  const handleProcessPayment = async () => {
    setPaymentError(null);
    setIsProcessing(true);

    // The owner sees the same payment page, but the final action is free and
    // must never create an invoice or record a sale.
    if (offer.pricingType === "paid" && !isCompanyOwner) {
      if (paymentMethod === "mobile_money" && !mobileMoneyValidation?.isValid) {
        setIsProcessing(false);
        setPaymentError("Veuillez renseigner un numéro Mobile Money valide avant de continuer.");
        return;
      }

      if (!user?.uid) {
        setIsProcessing(false);
        setPaymentError("Connectez-vous à votre compte Mansa avant de continuer.");
        return;
      }

      try {
        const referralParams =
          typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const referralCode = referralParams?.get("a") || "";
        const paymentProvider =
          paymentMethod === "mobile_money" &&
          mobileMoneyValidation?.operatorId.toLowerCase().includes("wave")
            ? "wave"
            : "kpay";
        const invoiceResponse = await fetch("/api/payment/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerUid: user.uid,
            customerEmail,
            offerId: offer.id,
            offerName: offer.title,
            offerType: offer.type || "membership",
            companyId: offer.companyId,
            creatorId: offer.creatorId || offer.companyId,
            grossAmount: currentPlan.price,
            currency: offer.currency || "XAF",
            paymentProvider,
            operatorId: mobileMoneyValidation?.operatorId,
            countryCode: mobileMoneyValidation?.countryCode,
            phoneNumber: mobileMoneyValidation?.normalizedNumber,
            referralCode: referralCode || undefined,
            referralProductId: offer.id,
            expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          }),
        });
        const invoiceData = await invoiceResponse.json();
        if (!invoiceResponse.ok || !invoiceData.success) {
          setIsProcessing(false);
          setPaymentError(
            "Le paiement n’a pas pu être lancé. Vérifiez vos informations puis réessayez.",
          );
          return;
        }

        // Mode test : simule uniquement la confirmation du prestataire.
        // En production, cette étape sera remplacée par le webhook Wave/KPay.
        const confirmationResponse = await fetch(
          `/api/payment/invoices/${invoiceData.invoice.paymentId}/test-confirm`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: currentPlan.price,
              providerFee: 0,
              referralCode,
              referralProductId: offer.id,
              customerUid: user.uid,
              customerEmail,
              productId: offer.id,
              productName: offer.title,
              companyId: offer.companyId,
              currency: offer.currency || "XAF",
            }),
          },
        );
        const confirmationData = await confirmationResponse.json();
        if (!confirmationResponse.ok || !confirmationData.success) {
          setIsProcessing(false);
          setPaymentError(
            "Le paiement est en attente de confirmation. Vérifiez votre historique dans quelques instants.",
          );
          return;
        }
        await recordConfirmedSale({
          creatorId: offer.creatorId || offer.companyId,
          amount: confirmationData.invoice.creatorNetAmount,
          grossAmount: confirmationData.invoice.grossAmount,
          providerFee: confirmationData.invoice.providerFee,
          platformFee: confirmationData.invoice.platformFee,
          currency: confirmationData.invoice.currency,
          invoiceId: invoiceData.invoice.paymentId,
        });
        await persistVerifiedMemberEntitlement({
          memberUid: user.uid,
          productId: offer.id,
          companyId: offer.companyId,
          invoiceId: invoiceData.invoice.paymentId,
          verifiedAt: confirmationData.invoice.confirmedAt || new Date().toISOString(),
        });
      } catch (err: any) {
        setIsProcessing(false);
        setPaymentError("Impossible de créer ou confirmer la facture. Réessayez.");
        return;
      }
    }

    if (offer.pricingType === "free" && !isCompanyOwner) {
      if (!user?.uid) {
        setIsProcessing(false);
        setPaymentError("Connectez-vous à votre compte Mansa avant de continuer.");
        return;
      }

      try {
        await persistFreeMemberEntitlement({
          memberUid: user.uid,
          productId: offer.id,
          companyId: offer.companyId,
        });
      } catch (error) {
        console.error("Free product entitlement could not be recorded:", error);
        setIsProcessing(false);
        setPaymentError("Une erreur est survenue. Réessayez.");
        return;
      }
    }

    setTimeout(() => {
      // Determine what apps are unlocked with this purchase
      const baseApps = ["dashboard", "support"];
      const offerApps = offer.includedApps || [];
      const combinedApps = Array.from(new Set([...baseApps, ...offerApps]));

      // Create new enterprise subscription
      const newSub: EnterpriseSubscription = {
        id: `sub-${offer.companyId}-${Date.now()}`,
        companyId: offer.companyId,
        companyName: offer.companyName,
        companyInitials: offer.companyInitials || offer.companyName.substring(0, 2).toUpperCase(),
        companyLogo: offer.companyLogo,
        companyGradient: offer.companyGradient || "from-[#0d2818] via-[#051f10] to-[#010a04]",
        productName: offer.title,
        productId: offer.id,
        priceDisplay: offer.priceDisplay,
        status: "active",
        subscribedAt: "À l'instant",
        onlineMembersCount: 142,
        unreadCount: 0,
        includedApps: combinedApps,
        unlockedProductIds: [offer.id],
        purchasedOfferIds: [offer.id],
        hasPaidOffer: offer.pricingType !== "free",
        telegramChannels: offer.telegramChannels || [],
        discordChannels: offer.discordChannels || [],
        ebooks: offer.ebooks || [],
        courses: offer.courses || [],
        digitalFiles: (offer as any).digitalFiles || [],
        courseModules: (offer as any).courseModules || [],
        customResources: offer.customResources || [],
        discordServerName: `${offer.companyName} Discord HQ`,
        discordInvite: offer.discordInvite || offer.discordChannels?.[0]?.inviteLink || "",
        supportChannels: {
          telegramSupport: "@SupportEquipeAfhub",
          email: `support@${offer.companyId}.afhub.app`,
        },
      };

      persistCustomerPurchase({
        id: offer.id,
        orderNumber: `MNSA-${Date.now().toString(36).toUpperCase()}`,
        name: offer.title,
        sellerName: offer.companyName,
        sellerAvatar: offer.companyLogo,
        price: offer.priceDisplay,
        planName: currentPlan.name,
        purchaseDate: new Date().toLocaleDateString("fr-FR"),
        status: "active",
        hasDiscordApp: resolvedApps.includes("Discord"),
        hasTelegramApp: resolvedApps.includes("Telegram"),
        hasCourseApp: resolvedApps.includes("Cours & formations"),
        hasFilesApp: resolvedApps.includes("Fichiers"),
        telegramChannelName: offer.telegramChannels?.[0]?.name,
        telegramChannelId: offer.telegramChannels?.[0]?.id,
        discordServerName: offer.discordChannels?.[0]?.name,
        discordRoleName: offer.discordChannels?.[0]?.role,
      });
      setCreatedSubscription(newSub);
      setIsProcessing(false);
      setIsCompleted(true);

      // Enregistrement systématique de la vente rattachée au compte financier du créateur
      if (
        !isCompanyOwner &&
        offer.creatorId &&
        offer.pricingType !== "free" &&
        currentPlan.price > 0
      ) {
        const creatorKey = offer.creatorId;
        createRealTransaction(creatorKey, {
          buyerName: customerName,
          buyerEmail: customerEmail,
          buyerLocation: mobileMoneyValidation?.countryName || "Afrique de l'Ouest",
          productName: offer.title,
          productId: offer.id,
          amount: `${currentPlan.price.toLocaleString("fr-FR")} ${offer.currency || "XAF"}`,
          amountNumber: currentPlan.price,
          currency: offer.currency || "XOF",
          companyId: offer.companyId,
          companyName: offer.companyName,
          paymentMethod:
            paymentMethod === "mobile_money"
              ? `${mobileMoneyValidation?.operatorName || "Mobile Money"} (${mobileMoneyValidation?.dialCode || ""})`
              : "Carte Bancaire (Stripe/Visa)",
        }).catch((err) => console.warn("Could not log sale transaction:", err));
      }
    }, 1200);
  };

  const handleFinalConfirm = () => {
    if (createdSubscription) {
      onPaymentSuccess(createdSubscription);
      onClose();
    }
  };

  const { overlayProps, contentProps } = useModalDismiss({
    isOpen: true,
    onClose,
    closeOnEscape: true,
    lockScroll: true,
    disabled: isProcessing,
  });

  if (isCompleted && createdSubscription) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
        <div className="w-full max-w-[510px] rounded-2xl border border-white/10 bg-[#101012] p-6 text-center text-white shadow-2xl">
          <CheckCircle2 className="mx-auto mb-4 size-12 text-emerald-400" />
          <h2 className="text-xl font-black">
            {createdSubscription.hasPaidOffer ? "Paiement validé avec succès !" : "Bienvenue !"}
          </h2>
          <p className="mt-2 text-sm text-zinc-300">
            Votre accès à {offer.title} est maintenant disponible.
          </p>
          <button
            type="button"
            onClick={handleFinalConfirm}
            className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-black hover:bg-emerald-400"
          >
            Accéder à l'entreprise
          </button>
        </div>
      </div>
    );
  }

  const previewPlans = pricingPlans.map(
    (plan) =>
      ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        billing:
          plan.billing === "par an"
            ? "yearly"
            : plan.billing === "paiement unique"
              ? "one_time"
              : "monthly",
      }) as const,
  );
  const currencySymbol = offer.currency === "EUR" ? "€" : offer.currency;

  return (
    <CheckoutPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      companyName={offer.companyName}
      productName={offer.title}
      description={offer.description || ""}
      productImage={offer.imageUrl}
      pricingType={offer.pricingType}
      priceAmount={currentPlan.price}
      billingCycle={offer.billingCycle}
      currencyCode={offer.currency || "XAF"}
      currencySymbol={currencySymbol}
      pricingOptions={previewPlans}
      selectedPlanId={selectedPlanId}
      onPlanChange={setSelectedPlanId}
      mode="live"
      initialEmail={customerEmail}
      onEmailChange={setCustomerEmail}
      initialPaymentMethod={paymentMethod}
      onPaymentMethodChange={setPaymentMethod}
      onMobileMoneyValidationChange={setMobileMoneyValidation}
      onSubmit={handleProcessPayment}
      isProcessing={isProcessing}
      isSubmitDisabled={isPayButtonDisabled}
      paymentError={paymentError}
    />
  );
};
