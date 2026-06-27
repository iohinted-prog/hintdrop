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

function isSupportedCurrency(value) {
  return SUPPORTED_CURRENCIES.includes(String(value || "").toUpperCase());
}

function normaliseCurrency(value, fallback = BASE_CURRENCY) {
  const code = String(value || "").toUpperCase();
  return isSupportedCurrency(code) ? code : fallback;
}

function roundAmount(value, digits = 2) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return null;

  const factor = 10 ** digits;
  return Math.round((numeric + Number.EPSILON) * factor) / factor;
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
          "https://api.frankfurter.dev/v2/rates?base=GBP&quotes=EUR,USD,AUD,CAD",
          { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load exchange rates.");
        }

        if (!active) return;

        setRates({
          GBP: 1,
          EUR: Number(data?.rates?.EUR) || null,
          USD: Number(data?.rates?.USD) || null,
          AUD: Number(data?.rates?.AUD) || null,
          CAD: Number(data?.rates?.CAD) || null,
        });
      } catch {
        if (!active) return;

        setRates((current) => ({
          GBP: 1,
          EUR: Number.isFinite(current?.EUR) ? current.EUR : null,
          USD: Number.isFinite(current?.USD) ? current.USD : null,
          AUD: Number.isFinite(current?.AUD) ? current.AUD : null,
          CAD: Number.isFinite(current?.CAD) ? current.CAD : null,
        }));
      } finally {
        if (active) {
          setRatesLoaded(true);
        }
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
      maximumFractionDigits: 2,
    });
  }, [safeCurrency]);

  function convertAmount(amount, fromCurrency = BASE_CURRENCY, toCurrency = safeCurrency) {
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount)) return null;

    const safeFromCurrency = normaliseCurrency(fromCurrency, BASE_CURRENCY);
    const safeToCurrency = normaliseCurrency(toCurrency, safeCurrency);

    if (safeFromCurrency === safeToCurrency) {
      return roundAmount(numericAmount, 2);
    }

    const fromRate =
      safeFromCurrency === BASE_CURRENCY ? 1 : Number(rates?.[safeFromCurrency]);
    const toRate =
      safeToCurrency === BASE_CURRENCY ? 1 : Number(rates?.[safeToCurrency]);

    if (!Number.isFinite(fromRate) || fromRate <= 0) return null;
    if (!Number.isFinite(toRate) || toRate <= 0) return null;

    const amountInBase =
      safeFromCurrency === BASE_CURRENCY
        ? numericAmount
        : numericAmount / fromRate;

    const converted =
      safeToCurrency === BASE_CURRENCY
        ? amountInBase
        : amountInBase * toRate;

    return roundAmount(converted, 2);
  }

  function buildFormatterForCurrency(targetCurrency) {
    const safeTargetCurrency = normaliseCurrency(targetCurrency, BASE_CURRENCY);
    const locale = currencyLocales[safeTargetCurrency] || "en-GB";

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: safeTargetCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  function formatCurrency(amount, fromCurrency = BASE_CURRENCY) {
    const converted = convertAmount(amount, fromCurrency, safeCurrency);

    if (Number.isFinite(converted)) {
      return formatter.format(converted);
    }

    const fallbackCurrency = normaliseCurrency(fromCurrency, BASE_CURRENCY);
    const fallbackFormatter = buildFormatterForCurrency(fallbackCurrency);
    const fallbackAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;

    return fallbackFormatter.format(fallbackAmount);
  }

  function formatCurrencyIn(amount, toCurrency, fromCurrency = BASE_CURRENCY) {
    const safeToCurrency = normaliseCurrency(toCurrency, safeCurrency);
    const targetFormatter = buildFormatterForCurrency(safeToCurrency);
    const converted = convertAmount(amount, fromCurrency, safeToCurrency);

    if (Number.isFinite(converted)) {
      return targetFormatter.format(converted);
    }

    const fallbackCurrency = normaliseCurrency(fromCurrency, BASE_CURRENCY);
    const fallbackFormatter = buildFormatterForCurrency(fallbackCurrency);
    const fallbackAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;

    return fallbackFormatter.format(fallbackAmount);
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
