"use client";

import { useEffect, useMemo, useState } from "react";
import { usePreferences } from "../providers/PreferencesProvider";

const currencyLocales = {
  GBP: "en-GB",
  EUR: "en-IE",
  USD: "en-US",
  AUD: "en-AU",
  CAD: "en-CA",
};

const SUPPORTED_CURRENCIES = ["GBP", "EUR", "USD", "AUD", "CAD"];
const BASE_CURRENCY = "GBP";

export function useCurrencyFormatter() {
  const { currency } = usePreferences();
  const [rates, setRates] = useState({ GBP: 1 });
  const [ratesLoaded, setRatesLoaded] = useState(false);

  const safeCurrency = SUPPORTED_CURRENCIES.includes(currency) ? currency : BASE_CURRENCY;

  useEffect(() => {
    let active = true;

    async function loadRates() {
      try {
        const response = await fetch(
          "https://api.frankfurter.app/latest?from=GBP&to=EUR,USD,AUD,CAD",
          { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load exchange rates.");
        }

        if (!active) return;

        setRates({
          GBP: 1,
          EUR: data?.rates?.EUR ?? 1,
          USD: data?.rates?.USD ?? 1,
          AUD: data?.rates?.AUD ?? 1,
          CAD: data?.rates?.CAD ?? 1,
        });
        setRatesLoaded(true);
      } catch {
        if (!active) return;
        setRates({ GBP: 1 });
        setRatesLoaded(true);
      }
    }

    loadRates();

    return () => {
      active = false;
    };
  }, []);

  const formatter = useMemo(() => {
    const locale = currencyLocales[safeCurrency] || "en-GB";

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }, [safeCurrency]);

  function convertAmount(amount, fromCurrency = BASE_CURRENCY, toCurrency = safeCurrency) {
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount)) return null;

    const safeFromCurrency = SUPPORTED_CURRENCIES.includes(fromCurrency)
      ? fromCurrency
      : BASE_CURRENCY;

    const safeToCurrency = SUPPORTED_CURRENCIES.includes(toCurrency)
      ? toCurrency
      : BASE_CURRENCY;

    if (safeFromCurrency === safeToCurrency) return numericAmount;

    const fromRate = rates[safeFromCurrency];
    const toRate = rates[safeToCurrency];

    if (!fromRate || !toRate) return numericAmount;

    const amountInBase =
      safeFromCurrency === BASE_CURRENCY
        ? numericAmount
        : numericAmount / fromRate;

    if (safeToCurrency === BASE_CURRENCY) return amountInBase;

    return amountInBase * toRate;
  }

  function formatCurrency(amount, fromCurrency = BASE_CURRENCY) {
    const converted = convertAmount(amount, fromCurrency, safeCurrency);
    const numericAmount = Number(converted ?? 0);
    return formatter.format(numericAmount);
  }

  return {
    currency: safeCurrency,
    rates,
    ratesLoaded,
    convertAmount,
    formatCurrency,
  };
}
