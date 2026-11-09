import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Wallet,
  X,
} from "lucide-react";
import {
  createWithdrawalRequest,
  MIN_WITHDRAWAL_AMOUNT_EUR,
  MIN_WITHDRAWAL_AMOUNT_XOF,
  savePayoutMethod,
} from "../../utils/creatorFinancialEngine";
import { DIAL_CODE_CONFIGS } from "../../utils/phoneValidationRules";
import { CurrencyCode, formatCurrency } from "../../utils/currency";
import {
  CreatorFinancialBalance,
  PayoutMethodConfig,
  PayoutMethodType,
  WithdrawalRequest,
} from "../../types";
import { ModalOverlay } from "./ModalOverlay";

interface WithdrawalRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  accountHolder: string;
  currency: CurrencyCode;
  balance: CreatorFinancialBalance;
  payoutMethods: PayoutMethodConfig[];
  preferredPayoutMethodId?: string;
  onPayoutMethodsChange: (methods: PayoutMethodConfig[]) => void;
  onConfigureMethod?: (method: { type: PayoutMethodType; label: string; country: string }) => void;
  onRequestCreated: (request: WithdrawalRequest) => void;
  onSuccessContinue?: () => void;
  successActionLabel?: string;
}

const DEFAULT_WITHDRAWAL_COUNTRY = DIAL_CODE_CONFIGS["+225"]?.countryName ?? "Côte d'Ivoire";
const normalizeCountryName = (name: string) => name.replace(/[‘’]/g, "'").toLowerCase();
const WITHDRAWAL_METHODS = [
  { id: "wave", name: "Wave", category: "wallet", color: "#1DC3FD" },
  { id: "orange_money", name: "Orange Money", category: "wallet", color: "#FF7900" },
  { id: "mtn_momo", name: "MTN Mobile Money", category: "wallet", color: "#FFCC00" },
  { id: "moov_money", name: "Moov Money", category: "wallet", color: "#005BAA" },
  { id: "visa_mastercard", name: "Carte bancaire", category: "card", color: "#2563EB" },
  { id: "bank_uemoa", name: "Virement bancaire", category: "transfers", color: "#8B5CF6" },
] as const;
const WITHDRAWAL_METHOD_LABELS: Record<string, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
  mtn_momo: "MTN Mobile Money",
  moov_money: "Moov Money",
  bank_uemoa: "Virement bancaire",
  bank_cemac: "Virement bancaire",
  bank_sepa: "Virement bancaire",
  crypto_usdt: "USDT",
  paypal: "PayPal",
};
const WITHDRAWAL_OPERATOR_IDS: Record<string, string> = {
  wave: "wave",
  orange_money: "orange",
  mtn_momo: "mtn",
  moov_money: "moov",
};
const WITHDRAWAL_CATEGORIES = [
  ["all", "Tout"],
  ["card", "Carte"],
  ["transfers", "Versements"],
  ["wallet", "Portefeuille"],
  ["other", "Autres"],
] as const;

type WithdrawalStep = "methods" | "configure" | "form";
type WithdrawalCategory = (typeof WITHDRAWAL_CATEGORIES)[number][0];

export const WithdrawalRequestModal: React.FC<WithdrawalRequestModalProps> = ({
  isOpen,
  onClose,
  creatorId,
  accountHolder,
  currency,
  balance,
  payoutMethods,
  preferredPayoutMethodId,
  onPayoutMethodsChange,
  onConfigureMethod,
  onRequestCreated,
  onSuccessContinue,
  successActionLabel = "Fermer",
}) => {
  const activeCurrency = currency || "XOF";
  const countryOptions = useMemo(() => Object.values(DIAL_CODE_CONFIGS), []);
  const [step, setStep] = useState<WithdrawalStep>("methods");
  const [category, setCategory] = useState<WithdrawalCategory>("all");
  const [includeDefaultWithdrawalMethods, setIncludeDefaultWithdrawalMethods] = useState(true);
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [methodType, setMethodType] = useState<PayoutMethodType | null>(null);
  const [country, setCountry] = useState(DEFAULT_WITHDRAWAL_COUNTRY);
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<WithdrawalRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMethodLabel, setNewMethodLabel] = useState("");
  const [newMethodHolder, setNewMethodHolder] = useState(accountHolder);
  const [newMethodIdentifier, setNewMethodIdentifier] = useState("");
  const [newMethodBank, setNewMethodBank] = useState("");
  const currentOpenData = useRef({
    payoutMethods,
    balance,
    accountHolder,
    preferredPayoutMethodId,
  });
  currentOpenData.current = { payoutMethods, balance, accountHolder, preferredPayoutMethodId };

  const minAmount =
    activeCurrency === "EUR" ? MIN_WITHDRAWAL_AMOUNT_EUR : MIN_WITHDRAWAL_AMOUNT_XOF;
  const selectedPayoutMethod = payoutMethods.find((method) => method.id === selectedMethodId);
  const directMobileMethodId =
    methodType && WITHDRAWAL_OPERATOR_IDS[methodType] ? methodType : undefined;
  const isDirectMobileMoney = Boolean(
    directMobileMethodId && selectedMethodId.startsWith("direct-mobile-money:"),
  );
  const directOperatorId = directMobileMethodId
    ? WITHDRAWAL_OPERATOR_IDS[directMobileMethodId]
    : undefined;
  const directCountryOptions = directOperatorId
    ? countryOptions.filter((item) =>
        item.operators.some((operator) => operator.id === directOperatorId),
      )
    : [];
  const visibleMethods = WITHDRAWAL_METHODS.filter((method) => {
    if (category !== "all" && method.category !== category) return false;
    const operatorId = WITHDRAWAL_OPERATOR_IDS[method.id];
    if (!operatorId) return true;
    return countryOptions.some(
      (item) =>
        normalizeCountryName(item.countryName) === normalizeCountryName(country) &&
        item.operators.some((operator) => operator.id === operatorId),
    );
  });

  useEffect(() => {
    if (!isOpen) return;
    const {
      payoutMethods: savedMethods,
      balance: currentBalance,
      accountHolder: holder,
      preferredPayoutMethodId: preferredId,
    } = currentOpenData.current;
    const defaultMethod =
      savedMethods.find((method) => method.id === preferredId) ??
      savedMethods.find((method) => method.isDefault) ??
      savedMethods[0];
    setStep("methods");
    setCategory("all");
    setIncludeDefaultWithdrawalMethods(true);
    setSelectedMethodId(defaultMethod?.id ?? "");
    setMethodType(defaultMethod?.type ?? null);
    setCountry(defaultMethod?.country || DEFAULT_WITHDRAWAL_COUNTRY);
    setAmount(currentBalance.availableBalance > 0 ? String(currentBalance.availableBalance) : "");
    setDestination(defaultMethod?.accountIdentifier ?? "");
    setError(null);
    setSuccess(null);
    setIsSubmitting(false);
    setNewMethodLabel("");
    setNewMethodHolder(holder);
    setNewMethodIdentifier("");
    setNewMethodBank("");
  }, [isOpen]);

  const closeDialog = () => {
    setSuccess(null);
    setError(null);
    setStep("methods");
    onClose();
  };

  const chooseMethod = (method: (typeof WITHDRAWAL_METHODS)[number]) => {
    const operatorId = WITHDRAWAL_OPERATOR_IDS[method.id];
    if (operatorId) {
      const supportedCountries = countryOptions.filter((item) =>
        item.operators.some((operator) => operator.id === operatorId),
      );
      const selectedCountry =
        supportedCountries.find(
          (item) => normalizeCountryName(item.countryName) === normalizeCountryName(country),
        ) ??
        supportedCountries.find((item) => item.countryCode === "CI") ??
        supportedCountries[0];
      setSelectedMethodId(`direct-mobile-money:${method.id}`);
      setMethodType(method.id as PayoutMethodType);
      setDestination("");
      setCountry(selectedCountry?.countryName || DEFAULT_WITHDRAWAL_COUNTRY);
      setError(null);
      setStep("form");
      return;
    }

    const configuredMethod = payoutMethods.find((item) => item.type === method.id);
    if (configuredMethod) {
      setSelectedMethodId(configuredMethod.id);
      setMethodType(configuredMethod.type);
      setDestination(configuredMethod.accountIdentifier);
      setCountry(configuredMethod.country || DEFAULT_WITHDRAWAL_COUNTRY);
      setError(null);
      setStep("form");
      return;
    }

    if (onConfigureMethod) {
      onConfigureMethod({
        type: method.id as PayoutMethodType,
        label: method.name,
        country,
      });
      closeDialog();
      return;
    }

    setSelectedMethodId("");
    setMethodType(method.id as PayoutMethodType);
    setNewMethodLabel(method.name);
    setNewMethodHolder(accountHolder);
    setNewMethodIdentifier("");
    setNewMethodBank("");
    setError(null);
    setStep("configure");
  };

  const saveNewMethod = (event: React.FormEvent) => {
    event.preventDefault();
    if (!methodType) return;
    const newConfig: PayoutMethodConfig = {
      id: `pm-${Date.now()}`,
      type: methodType,
      label: newMethodLabel.trim(),
      accountHolder: newMethodHolder.trim(),
      accountIdentifier: newMethodIdentifier.trim(),
      bankName: newMethodBank.trim(),
      country,
      isVerified: true,
      isDefault: payoutMethods.length === 0,
      createdAt: new Date().toISOString(),
    };
    const updatedMethods = savePayoutMethod(creatorId, newConfig);
    onPayoutMethodsChange(updatedMethods);
    setSelectedMethodId(newConfig.id);
    setDestination(newConfig.accountIdentifier);
    setError(null);
    setStep("form");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const numericAmount = Number.parseFloat(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Veuillez saisir un montant de virement valide.");
      return;
    }
    if (!selectedMethodId) {
      setError("Veuillez sélectionner un moyen de retrait.");
      return;
    }
    if (!country.trim()) {
      setError("Veuillez sélectionner le pays du retrait.");
      return;
    }
    if (!destination.trim()) {
      setError("Veuillez renseigner le numéro du compte à créditer.");
      return;
    }
    if (numericAmount > balance.availableBalance) {
      setError(
        `Le montant demandé dépasse votre solde disponible (${formatCurrency(balance.availableBalance, activeCurrency)}).`,
      );
      return;
    }
    if (numericAmount < minAmount) {
      setError(
        `Le montant minimum de retrait est de ${formatCurrency(minAmount, activeCurrency)}.`,
      );
      return;
    }

    let oneTimePayoutMethod: PayoutMethodConfig | undefined;
    if (isDirectMobileMoney && directMobileMethodId) {
      const mobileCountry = directCountryOptions.find(
        (item) => normalizeCountryName(item.countryName) === normalizeCountryName(country),
      );
      if (!mobileCountry) {
        setError("Ce moyen de retrait n'est pas disponible dans le pays sélectionné.");
        return;
      }
      const dialCodeDigits = mobileCountry.dialCode.replace(/\D/g, "");
      const enteredDigits = destination.replace(/\D/g, "");
      const nationalDigits = enteredDigits.startsWith(dialCodeDigits)
        ? enteredDigits.slice(dialCodeDigits.length)
        : enteredDigits;
      if (!nationalDigits) {
        setError("Veuillez saisir le numéro de téléphone à créditer.");
        return;
      }
      const selectedMethod = WITHDRAWAL_METHODS.find((item) => item.id === directMobileMethodId);
      oneTimePayoutMethod = {
        id: `mobile-money-direct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: directMobileMethodId,
        label: `${selectedMethod?.name || WITHDRAWAL_METHOD_LABELS[directMobileMethodId]} ${mobileCountry.countryName}`,
        accountHolder,
        accountIdentifier: `${mobileCountry.dialCode} ${nationalDigits}`,
        country: mobileCountry.countryName,
        isVerified: false,
        isDefault: false,
        createdAt: new Date().toISOString(),
      };
    }

    setIsSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    if (
      selectedPayoutMethod &&
      (destination.trim() !== selectedPayoutMethod.accountIdentifier ||
        country !== selectedPayoutMethod.country)
    ) {
      onPayoutMethodsChange(
        savePayoutMethod(creatorId, {
          ...selectedPayoutMethod,
          accountIdentifier: destination.trim(),
          country: country.trim(),
        }),
      );
    }

    const result = createWithdrawalRequest({
      creatorId,
      amount: numericAmount,
      currency: activeCurrency,
      payoutMethodId: oneTimePayoutMethod?.id ?? selectedMethodId,
      ...(oneTimePayoutMethod ? { payoutMethod: oneTimePayoutMethod } : {}),
    });
    setIsSubmitting(false);
    if (result.success && result.request) {
      setSuccess(result.request);
      onRequestCreated(result.request);
    } else {
      setError(result.error || "Échec de l'envoi de la demande de virement.");
    }
  };

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={closeDialog}
      contentClassName="max-w-md mx-auto"
      zIndex="z-[90]"
    >
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#121316] p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            {step !== "methods" && !success && (
              <button
                type="button"
                aria-label="Retour"
                onClick={() =>
                  setStep(
                    step === "form" && !isDirectMobileMoney && !selectedPayoutMethod
                      ? "configure"
                      : "methods",
                  )
                }
                className="rounded-lg p-1 text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <ArrowUpRight className="size-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Demande de retrait</h3>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={closeDialog}
            className="text-zinc-400 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {success ? (
          <div className="space-y-3 py-5 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-400" />
            <h4 className="text-base font-bold text-white">Demande de retrait transmise !</h4>
            <p className="text-xs text-zinc-300">
              <strong className="font-mono text-emerald-400">
                {formatCurrency(success.amount, success.currency as CurrencyCode)}
              </strong>{" "}
              ont été transmis vers votre compte {success.payoutMethodLabel}.
            </p>
            <div className="rounded-xl border border-white/5 bg-black/40 p-3 font-mono text-[11px] text-zinc-400">
              Réf : {success.referenceNumber}
            </div>
            <button
              type="button"
              onClick={() => {
                if (onSuccessContinue) onSuccessContinue();
                else closeDialog();
              }}
              className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-black hover:bg-emerald-400"
            >
              {successActionLabel}
            </button>
          </div>
        ) : step === "methods" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="size-5 text-white" />
              <h4 className="text-xl font-bold text-white">Méthodes de retrait</h4>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#292929] p-4">
              <label className="mb-1 block text-sm font-semibold text-white">Pays</label>
              <p className="mb-2 text-xs text-zinc-400">
                Les méthodes disponibles correspondent aux opérateurs de ce pays.
              </p>
              <select
                aria-label="Pays du retrait"
                value={country}
                onChange={(event) => {
                  setCountry(event.target.value);
                  setSelectedMethodId("");
                  setError(null);
                }}
                className="w-full rounded-xl border border-white/10 bg-[#16181f] px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
              >
                {countryOptions.map((item) => (
                  <option key={item.dialCode} value={item.countryName}>
                    {item.countryName} ({item.dialCode})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#292929] p-4">
              <div>
                <p className="text-sm font-semibold text-white">
                  Inclure les méthodes de retrait par défaut
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Activer automatiquement les nouvelles méthodes de retrait disponibles.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={includeDefaultWithdrawalMethods}
                onClick={() => setIncludeDefaultWithdrawalMethods((value) => !value)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${includeDefaultWithdrawalMethods ? "bg-emerald-500" : "bg-zinc-600"}`}
              >
                <span
                  className={`absolute top-1 size-5 rounded-full bg-white transition-transform ${includeDefaultWithdrawalMethods ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
            <div className="overflow-x-auto border-b border-white/10">
              <div className="flex min-w-max items-end gap-5">
                {WITHDRAWAL_CATEGORIES.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCategory(id)}
                    className={`border-b-2 px-1 pb-3 text-xs font-semibold ${category === id ? "border-emerald-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-200"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#292929]">
              {visibleMethods.map((method, index) => {
                const configured = payoutMethods.find((item) => item.type === method.id);
                const selected = selectedMethodId === configured?.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => chooseMethod(method)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${index > 0 ? "border-t border-white/[0.08]" : ""} ${selected ? "bg-emerald-500/10" : "hover:bg-white/[0.04]"}`}
                  >
                    {!WITHDRAWAL_OPERATOR_IDS[method.id] && (
                      <Lock className="size-5 shrink-0 text-zinc-600" />
                    )}
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white"
                      style={{ backgroundColor: method.color }}
                    >
                      {method.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                      {method.name}
                    </span>
                    <span
                      className={`shrink-0 text-xs font-semibold ${selected ? "text-emerald-300" : configured ? "text-white" : "text-zinc-500"}`}
                    >
                      {selected
                        ? "Sélectionné"
                        : configured
                          ? "Sélectionner"
                          : WITHDRAWAL_OPERATOR_IDS[method.id]
                            ? "Continuer"
                            : "Configurer"}
                    </span>
                  </button>
                );
              })}
              {visibleMethods.length === 0 && (
                <p className="p-5 text-center text-xs text-zinc-500">
                  Aucune méthode disponible pour ce pays.
                </p>
              )}
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300"
              >
                {error}
              </p>
            )}
            <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => {
                  setCategory("all");
                  setIncludeDefaultWithdrawalMethods(true);
                  const defaultMethod =
                    payoutMethods.find((method) => method.isDefault) ?? payoutMethods[0];
                  setSelectedMethodId(defaultMethod?.id ?? "");
                  setMethodType(defaultMethod?.type ?? null);
                  setDestination(defaultMethod?.accountIdentifier ?? "");
                  setCountry(defaultMethod?.country || DEFAULT_WITHDRAWAL_COUNTRY);
                }}
                className="text-[11px] font-semibold text-zinc-400 transition-colors hover:text-white"
              >
                Restaurer les paramètres par défaut
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-xl bg-[#292929] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#383838]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={!selectedMethodId}
                  onClick={() => setStep("form")}
                  className="rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continuer
                </button>
              </div>
            </div>
          </div>
        ) : step === "configure" ? (
          <form onSubmit={saveNewMethod} className="space-y-3">
            <h4 className="text-lg font-bold text-white">Configurer le compte de retrait</h4>
            <label className="block text-xs text-zinc-300">
              Nom du compte
              <input
                required
                value={newMethodLabel}
                onChange={(event) => setNewMethodLabel(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#16181f] px-4 py-2.5 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-zinc-300">
              Titulaire du compte
              <input
                required
                value={newMethodHolder}
                onChange={(event) => setNewMethodHolder(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#16181f] px-4 py-2.5 text-sm text-white"
              />
            </label>
            {methodType?.startsWith("bank") && (
              <label className="block text-xs text-zinc-300">
                Banque
                <input
                  required
                  value={newMethodBank}
                  onChange={(event) => setNewMethodBank(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#16181f] px-4 py-2.5 text-sm text-white"
                />
              </label>
            )}
            <label className="block text-xs text-zinc-300">
              Numéro de compte / IBAN
              <input
                required
                value={newMethodIdentifier}
                onChange={(event) => setNewMethodIdentifier(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#16181f] px-4 py-2.5 font-mono text-sm text-white"
              />
            </label>
            {error && (
              <p role="alert" className="text-xs text-rose-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-black hover:bg-emerald-400"
            >
              Enregistrer et continuer
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300"
              >
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </p>
            )}
            <div>
              <label
                htmlFor="withdrawal-request-amount"
                className="mb-1 block text-xs font-semibold text-zinc-300"
              >
                Montant du retrait
              </label>
              <div className="relative">
                <input
                  id="withdrawal-request-amount"
                  type="number"
                  min={minAmount}
                  max={balance.availableBalance}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#16181f] py-2.5 pl-4 pr-16 font-mono text-sm text-white outline-none focus:border-emerald-500"
                  placeholder="50000"
                  required
                />
                <span className="absolute right-3.5 top-3 font-mono text-xs font-bold text-zinc-400">
                  {activeCurrency}
                </span>
              </div>
            </div>
            {isDirectMobileMoney ? (
              <label className="block text-xs font-semibold text-zinc-300">
                Indicatif téléphonique
                <select
                  aria-label="Pays et indicatif téléphonique"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#16181f] px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                >
                  {directCountryOptions.map((item) => (
                    <option key={item.dialCode} value={item.countryName}>
                      {item.flag} {item.countryName} ({item.dialCode})
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="block text-xs font-semibold text-zinc-300">
                Pays
                <select
                  aria-label="Pays du compte de retrait"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#16181f] px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                >
                  {countryOptions.map((item) => (
                    <option key={item.dialCode} value={item.countryName}>
                      {item.countryName} ({item.dialCode})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-xs font-semibold text-zinc-300">
              {methodType?.startsWith("bank") ? "Numéro RIB / IBAN" : "Numéro de téléphone"}
              <input
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#16181f] px-4 py-2.5 font-mono text-sm text-white outline-none focus:border-emerald-500"
                placeholder={
                  isDirectMobileMoney
                    ? "Numéro sans indicatif"
                    : methodType?.startsWith("bank")
                      ? "RIB ou IBAN"
                      : "Numéro de compte"
                }
                required
              />
            </label>
            <p className="text-[11px] text-zinc-500">
              Disponible : {formatCurrency(balance.availableBalance, activeCurrency)} · Minimum :{" "}
              {formatCurrency(minAmount, activeCurrency)}
            </p>
            <button
              type="submit"
              disabled={isSubmitting || balance.availableBalance < minAmount}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUpRight className="size-4" />
              )}
              Confirmer
            </button>
          </form>
        )}
      </div>
    </ModalOverlay>
  );
};
