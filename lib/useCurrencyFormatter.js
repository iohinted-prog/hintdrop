"use client";

import { useEffect, useMemo, useState } from "react";
import { usePreferences } from "../app/providers/PreferencesProvider";

const currencyLocales = {
  GBP: "en-GB",
  EUR: "en-IE",
  USD: "en-US",
  AUD: "en-AU",
  CAD: "en-CA",
};

const SUPPORTED_CURRENCIES = ["GBP", "EUR", "USD", "AUD", "CAD"];
const BASE_CURRENCY = "GBP";

function roundCurrency(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function isSupportedCurrency(value) {
  return SUPPORTED_CURRENCIES.includes(String(value || "").toUpperCase());
}

function normaliseCurrency(value, fallback = BASE_CURRENCY) {
  const code = String(value || "").toUpperCase();
  return isSupportedCurrency(code) ? code : fallback;
}

export function useCurrencyFormatter() {
  const { currency } = usePreferences();
  const [rates, setRates] = useState({ GBP: 1 });
  const [ratesLoaded, setRatesLoaded] = useState(false);

  const safeCurrency = useMemo(
    () => normaliseCurrency(currency, BASE_CURRENCY),
    [currency]
  );

  useEffect(() => {
    let active = true;

    async function loadRates() {
      try {
        setRatesLoaded(false);

        const response = await fetch(
          "/api/currency",
          { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load exchange rates.");
        }

        if (!active) return;

        setRates({
          GBP: 1,
          EUR: Number(data?.rates?.EUR) || 1,
          USD: Number(data?.rates?.USD) || 1,
          AUD: Number(data?.rates?.AUD) || 1,
          CAD: Number(data?.rates?.CAD) || 1,
        });
        setRatesLoaded(true);
      } catch {
        if (!active) return;
        setRates({
          GBP: 1,
          EUR: 1,
          USD: 1,
          AUD: 1,
          CAD: 1,
        });
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

    const safeFromCurrency = normaliseCurrency(fromCurrency, BASE_CURRENCY);
    const safeToCurrency = normaliseCurrency(toCurrency, safeCurrency);

    if (safeFromCurrency === safeToCurrency) {
      return roundCurrency(numericAmount);
    }

    const fromRate = Number(rates?.[safeFromCurrency]);
    const toRate = Number(rates?.[safeToCurrency]);

    if (!Number.isFinite(fromRate) || fromRate <= 0) {
      return roundCurrency(numericAmount);
    }

    if (!Number.isFinite(toRate) || toRate <= 0) {
      return roundCurrency(numericAmount);
    }

    const amountInBase =
      safeFromCurrency === BASE_CURRENCY
        ? numericAmount
        : numericAmount / fromRate;

    const converted =
      safeToCurrency === BASE_CURRENCY
        ? amountInBase
        : amountInBase * toRate;

    return roundCurrency(converted, 2);
  }

  function formatCurrency(amount, fromCurrency = BASE_CURRENCY) {
    const converted = convertAmount(amount, fromCurrency, safeCurrency);
    const numericAmount = Number.isFinite(converted) ? converted : 0;
    return formatter.format(numericAmount);
  }

  function formatCurrencyIn(amount, toCurrency, fromCurrency = BASE_CURRENCY) {
    const safeToCurrency = normaliseCurrency(toCurrency, safeCurrency);
    const locale = currencyLocales[safeToCurrency] || "en-GB";

    const targetFormatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: safeToCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    const converted = convertAmount(amount, fromCurrency, safeToCurrency);
    const numericAmount = Number.isFinite(converted) ? converted : 0;

    return targetFormatter.format(numericAmount);
  }

  return {
    currency: safeCurrency,
    rates,
    ratesLoaded,
    convertAmount,
    formatCurrency,
    formatCurrencyIn,
  };
}
