import { useEffect, useState } from "react";

const COOKIE_CONSENT_KEY = "thal_cookie_consent";

type Consent = "accepted" | "refused" | null;
type ConsentState = Consent | undefined;

const readConsent = (): Consent => {
  try {
    const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    return value === "accepted" || value === "refused" ? value : null;
  } catch {
    return null;
  }
};

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<ConsentState>(undefined);

  useEffect(() => {
    setConsent(readConsent());
  }, []);

  const saveConsent = (value: Exclude<Consent, null>) => {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
    } catch {
      // Le choix reste appliqué pour cette session si le navigateur bloque le stockage.
    }
    setConsent(value);
  };

  if (consent !== null) return null;

  return (
    <aside className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#121316] p-4 text-store-foreground shadow-2xl" role="dialog" aria-label="Consentement aux cookies">
      <p className="text-xs leading-5 text-zinc-300">
        Ce site utilise uniquement les cookies nécessaires à son fonctionnement. Aucun outil de mesure ne sera chargé sans votre accord.
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => saveConsent("refused")} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-white/5 hover:text-white">
          Refuser
        </button>
        <button type="button" onClick={() => saveConsent("accepted")} className="rounded-lg bg-[#00D26A] px-3 py-2 text-xs font-bold text-black transition-colors hover:bg-[#10E47A]">
          Accepter
        </button>
      </div>
    </aside>
  );
}
