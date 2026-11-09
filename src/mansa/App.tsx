import { lazy, Suspense, useEffect, useState } from "react";
import type { CreatedProductData } from "./components/ProductCreationStudio";
import {
  CurrencyCode,
  SUPPORTED_CURRENCIES,
  detectUserLocationAndCurrency,
  getStoredCurrency,
  setStoredCurrency,
} from "./utils/currency";
import { useAuth } from "./context/AuthContext";
import { saveProductToFirestore } from "./services/dbService";
import { purgeLegacyDemoData } from "./utils/storage";
import { getSavedCompanies } from "./utils/companyStorage";
import { AppLoadingScreen } from "./components/common/AppLoadingScreen";

const UserDashboard = lazy(() =>
  import("./components/UserDashboard").then((module) => ({ default: module.UserDashboard })),
);
const ProductCreationStudio = lazy(() =>
  import("./components/ProductCreationStudio").then((module) => ({
    default: module.ProductCreationStudio,
  })),
);

export default function App({ openStudioOnMount = false }: { openStudioOnMount?: boolean }) {
  const { user: authUser, logout } = useAuth();
  const [lang] = useState<"fr" | "en">("fr");
  const initialAppCurrency = getStoredCurrency();
  const [userLocationInfo, setUserLocationInfo] = useState({
    country: "France",
    currency: initialAppCurrency,
    currencySymbol: SUPPORTED_CURRENCIES[initialAppCurrency]?.symbol || "$",
  });
  const [isStudioOpen, setIsStudioOpen] = useState(openStudioOnMount);

  useEffect(() => {
    purgeLegacyDemoData();
    const loc = detectUserLocationAndCurrency();
    const stored = getStoredCurrency();
    const activeCurr = stored || loc.currency;
    setUserLocationInfo({
      country: loc.countryName,
      currency: activeCurr,
      currencySymbol: SUPPORTED_CURRENCIES[activeCurr]?.symbol || "$",
    });
    const handleStorageCurrency = (e: Event) => {
      const detail = (e as CustomEvent<{ currency?: CurrencyCode }>).detail;
      const newCurr = detail?.currency || getStoredCurrency();
      if (newCurr && SUPPORTED_CURRENCIES[newCurr]) {
        setUserLocationInfo((prev) => ({
          ...prev,
          currency: newCurr,
          currencySymbol: SUPPORTED_CURRENCIES[newCurr]?.symbol || "$",
        }));
      }
    };
    window.addEventListener("mansa_currency_changed", handleStorageCurrency);
    return () => window.removeEventListener("mansa_currency_changed", handleStorageCurrency);
  }, []);

  const displayName = authUser?.displayName || "Créateur Mansa";
  const currentUser = authUser
    ? {
        uid: authUser.uid,
        name: displayName,
        email: authUser.email || "",
        avatarInitials: displayName
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      }
    : null;

  const handleOpenStudio = () => {
    setIsStudioOpen(true);
  };

  const handleGlobalCurrencyChange = (newCurrency: CurrencyCode) => {
    setStoredCurrency(newCurrency);
    setUserLocationInfo((prev) => ({
      ...prev,
      currency: newCurrency,
      currencySymbol: SUPPORTED_CURRENCIES[newCurrency]?.symbol || "$",
    }));
  };

  const handleSaveProductFromStudio = async (product: CreatedProductData) => {
    const creatorId = authUser?.uid;
    if (!creatorId) {
      throw new Error("Votre session Supabase est absente ou expirée. Reconnectez-vous.");
    }
    const creatorEmail = authUser.email || "";
    const creatorName = authUser.displayName || "Créateur Mansa";
    await saveProductToFirestore(creatorId, creatorEmail, creatorName, {
      id: product.id,
      name: product.name,
      description: product.description,
      category: "community",
      priceAmount: product.priceAmount,
      pricingType: product.pricingType,
      billingCycle: product.billingCycle,
      currency: product.currency || userLocationInfo.currency || "USD",
      includedApps: product.includedApps || ["Chat VIP", "Mansa Checkout"],
      affiliateRate: product.affiliateRate ?? 25,
      visibility: product.visibility,
      productType: product.productType,
      productUrl: product.productUrl,
      ...(product.imageUrl ? { coverImage: product.imageUrl } : {}),
      ...(product.bannerUrl ? { bannerUrl: product.bannerUrl } : {}),
      companyId: product.companyId || "",
      companyName: product.companyName || "",
    });
    setIsStudioOpen(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  if (!currentUser) return <AppLoadingScreen />;

  return (
    <Suspense fallback={<AppLoadingScreen />}>
      <>
        <UserDashboard
          user={currentUser}
          onLogout={handleLogout}
          onOpenProductStudio={() => handleOpenStudio()}
          lang={lang}
        />
        {isStudioOpen && (
          <ProductCreationStudio
            isOpen={isStudioOpen}
            activeCurrency={userLocationInfo.currency}
            onCurrencyChange={handleGlobalCurrencyChange}
            lang={lang}
            onClose={() => setIsStudioOpen(false)}
            onSaveProduct={handleSaveProductFromStudio}
            companies={getSavedCompanies(currentUser.uid)}
            {...(getSavedCompanies(currentUser.uid)[0]?.id
              ? { initialCompanyId: getSavedCompanies(currentUser.uid)[0]!.id }
              : {})}
          />
        )}
      </>
    </Suspense>
  );
}
