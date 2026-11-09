// @ts-nocheck
/**
 * Safe local storage wrapper with in-memory fallback
 * Prevents DOMException / SecurityError crashes in cross-origin iframes (AI Studio preview, Safari private mode, etc.)
 */
const inMemoryFallback = new Map<string, string>();

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // In restricted iframe or disabled cookies
    }
    return inMemoryFallback.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // In restricted iframe or storage full
    }
    inMemoryFallback.set(key, value);
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // In restricted iframe
    }
    inMemoryFallback.delete(key);
  },

  clear(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      // In restricted iframe
    }
    inMemoryFallback.clear();
  },
};

/** Retire uniquement les enregistrements issus de l’ancien auto-seeding. */
export function purgeLegacyDemoData(): void {
  const demoProductIds = new Set([
    "prod-forex-elite",
    "prod-ecommerce-mastery",
    "prod-canva-templates",
    "prod-nocode-ia",
    "prod-growth-ebook",
  ]);
  const jsonKeys = [
    "mansa_saved_products_cache",
    "mansa_saved_transactions_cache",
    "mansa_saved_customers_cache",
    "mansa_saved_workforce_cache",
    "mansa_saved_partners_cache",
  ];

  jsonKeys.forEach((key) => {
    const raw = safeStorage.getItem(key);
    if (!raw) return;
    try {
      const items = JSON.parse(raw);
      if (!Array.isArray(items)) return;
      const filtered = items.filter((item) => {
        const id = String(item?.id || "");
        return (
          !demoProductIds.has(id) &&
          !id.startsWith("tx-demo-") &&
          !id.startsWith("cust-demo-") &&
          !id.startsWith("work-demo-") &&
          !id.startsWith("partner-demo-")
        );
      });
      safeStorage.setItem(key, JSON.stringify(filtered));
    } catch {
      safeStorage.removeItem(key);
    }
  });

  const storageKeys = typeof window !== "undefined" ? Object.keys(window.localStorage) : [];
  storageKeys.forEach((key) => {
    if (
      key.startsWith("mansa_auto_seeded_") ||
      key === "mansa_customer_purchases" ||
      key === "whop_customer_purchases"
    ) {
      safeStorage.removeItem(key);
      return;
    }
    if (key.startsWith("mansa_companies_") || key.startsWith("afhub_companies_")) {
      const raw = safeStorage.getItem(key);
      try {
        const companies = raw ? JSON.parse(raw) : [];
        const filtered = Array.isArray(companies)
          ? companies.filter((company) => !String(company?.id || "").startsWith("comp-"))
          : [];
        safeStorage.setItem(key, JSON.stringify(filtered));
      } catch {
        safeStorage.removeItem(key);
      }
    }
    if (key.startsWith("mansa_enterprise_subscriptions_")) {
      const raw = safeStorage.getItem(key);
      try {
        const subscriptions = raw ? JSON.parse(raw) : [];
        const filtered = Array.isArray(subscriptions)
          ? subscriptions.filter(
              (subscription) => !String(subscription?.id || "").startsWith("sub-"),
            )
          : [];
        safeStorage.setItem(key, JSON.stringify(filtered));
      } catch {
        safeStorage.removeItem(key);
      }
    }
  });
}
