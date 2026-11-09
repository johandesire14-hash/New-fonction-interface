import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Wallet } from "lucide-react";
import {
  subscribeToCreatorTransactions,
  type FirestoreTransaction,
} from "../../services/dbService";
import {
  calculateCreatorFinancialBalance,
  FINANCIAL_EVENTS,
  getSavedPayoutMethods,
  getWithdrawalHistory,
  MIN_WITHDRAWAL_AMOUNT_EUR,
  MIN_WITHDRAWAL_AMOUNT_XOF,
} from "../../utils/creatorFinancialEngine";
import { CurrencyCode, formatCurrency } from "../../utils/currency";
import { PayoutMethodConfig, WithdrawalRequest } from "../../types";
import { WithdrawalRequestModal } from "./WithdrawalRequestModal";

interface AccountPortfolioTabProps {
  creatorId: string;
  accountHolder: string;
  currency: string;
}

export const AccountPortfolioTab: React.FC<AccountPortfolioTabProps> = ({
  creatorId,
  accountHolder,
  currency,
}) => {
  const activeCurrency = (currency || "XOF") as CurrencyCode;
  const [transactions, setTransactions] = useState<FirestoreTransaction[]>([]);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethodConfig[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);

  const balance = useMemo(
    () => calculateCreatorFinancialBalance(creatorId, transactions, activeCurrency),
    [creatorId, transactions, activeCurrency],
  );
  const minAmount =
    activeCurrency === "EUR" ? MIN_WITHDRAWAL_AMOUNT_EUR : MIN_WITHDRAWAL_AMOUNT_XOF;

  const reloadPayoutData = useCallback(() => {
    setPayoutMethods(getSavedPayoutMethods(creatorId));
    setWithdrawals(getWithdrawalHistory(creatorId));
  }, [creatorId]);

  useEffect(() => {
    const unsubscribe = subscribeToCreatorTransactions(creatorId, (items) =>
      setTransactions(items),
    );
    reloadPayoutData();
    const handleFinancialChange = () => reloadPayoutData();
    window.addEventListener(FINANCIAL_EVENTS.PAYOUT_METHOD_CHANGED, handleFinancialChange);
    window.addEventListener(FINANCIAL_EVENTS.WITHDRAWAL_CREATED, handleFinancialChange);
    window.addEventListener(FINANCIAL_EVENTS.BALANCE_CHANGED, handleFinancialChange);
    return () => {
      unsubscribe?.();
      window.removeEventListener(FINANCIAL_EVENTS.PAYOUT_METHOD_CHANGED, handleFinancialChange);
      window.removeEventListener(FINANCIAL_EVENTS.WITHDRAWAL_CREATED, handleFinancialChange);
      window.removeEventListener(FINANCIAL_EVENTS.BALANCE_CHANGED, handleFinancialChange);
    };
  }, [creatorId, reloadPayoutData]);

  return (
    <>
      <div className="space-y-4 text-xs">
        <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#14161b] to-[#1a1e28] p-5">
          <div className="mb-3 flex items-center gap-2 text-emerald-400">
            <Wallet className="size-4" />
            <span className="text-[11px] font-semibold text-zinc-400">
              Solde disponible au retrait
            </span>
          </div>
          <div className="mb-3 font-mono text-2xl font-black text-white">
            {formatCurrency(balance.availableBalance, activeCurrency)}
          </div>
          {balance.pendingBalance > 0 && (
            <p className="mb-3 text-[11px] text-zinc-400">
              En attente de compensation : {formatCurrency(balance.pendingBalance, activeCurrency)}
            </p>
          )}
          <button
            type="button"
            onClick={() => setIsWithdrawalOpen(true)}
            disabled={balance.availableBalance < minAmount}
            className="flex items-center gap-2 rounded-xl bg-[#00D26A] px-4 py-2 text-xs font-bold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowUpRight className="size-4" />
            Demander un retrait
          </button>
          {balance.availableBalance < minAmount && (
            <p className="mt-2 text-[11px] text-zinc-500">
              Le solde minimum requis est de {formatCurrency(minAmount, activeCurrency)}.
            </p>
          )}
        </div>
        {withdrawals.length > 0 && (
          <p className="text-[11px] text-zinc-500">
            {withdrawals.length} demande{withdrawals.length > 1 ? "s" : ""} de retrait enregistrée
            {withdrawals.length > 1 ? "s" : ""}.
          </p>
        )}
      </div>

      <WithdrawalRequestModal
        isOpen={isWithdrawalOpen}
        onClose={() => setIsWithdrawalOpen(false)}
        creatorId={creatorId}
        accountHolder={accountHolder}
        currency={activeCurrency}
        balance={balance}
        payoutMethods={payoutMethods}
        onPayoutMethodsChange={setPayoutMethods}
        onRequestCreated={() => reloadPayoutData()}
      />
    </>
  );
};
