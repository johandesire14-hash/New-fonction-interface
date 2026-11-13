import React, { useEffect, useRef } from "react";
import NumberFlow from "@number-flow/react";
import { convertFromUSD, CurrencyCode, SUPPORTED_CURRENCIES } from "../../utils/currency";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  currency?: CurrencyCode;
  compact?: boolean;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  locale?: string;
}

/**
 * Affiche un nombre qui ne roule que lorsque sa valeur change.
 * Pour currency, value est exprimée en USD, comme pour formatCurrency.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  className,
  currency,
  compact = false,
  decimals,
  prefix = "",
  suffix = "",
  locale = "fr-FR",
}) => {
  const previousDisplayValue = useRef<number | null>(null);
  const safeValue = Number.isFinite(value) ? value : 0;
  let displayValue = safeValue;
  let displayPrefix = prefix;
  let displaySuffix = suffix;
  let fractionDigits = decimals ?? 0;

  if (currency) {
    const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.XOF;
    const converted = convertFromUSD(safeValue, currency);

    if (compact && converted >= 1_000_000) {
      displayValue = converted / 1_000_000;
      displayPrefix = "";
      displaySuffix = "M";
      fractionDigits = 1;
    } else if (compact && converted >= 1_000) {
      displayValue = converted / 1_000;
      displayPrefix = "";
      displaySuffix = "k";
      fractionDigits = 0;
    } else {
      displayValue = converted;
      fractionDigits = decimals ?? config.decimals;
      displayPrefix = config.prefix || "";
      displaySuffix = config.prefix ? "" : config.suffix || ` ${config.symbol}`;
    }
  }

  const shouldAnimate =
    previousDisplayValue.current !== null && previousDisplayValue.current !== displayValue;

  useEffect(() => {
    previousDisplayValue.current = displayValue;
  }, [displayValue]);

  return (
    <NumberFlow
      className={className}
      value={displayValue}
      locales={locale}
      format={{
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }}
      prefix={displayPrefix}
      suffix={displaySuffix}
      animated={shouldAnimate}
      respectMotionPreference
    />
  );
};
