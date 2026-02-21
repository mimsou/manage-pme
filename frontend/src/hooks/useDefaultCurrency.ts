import { useState, useEffect } from 'react';
import { currencyApi } from '@/api/currency';

const CURRENCY_LABELS: Record<string, string> = {
  TND: 'TND', EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', JPY: '¥', CAD: 'CAD',
  MAD: 'MAD', DZD: 'DZD', SAR: 'SAR', AED: 'AED', KWD: 'KWD', CNY: '¥',
  DKK: 'DKK', NOK: 'NOK', SEK: 'SEK', BHD: 'BHD', QAR: 'QAR', OMR: 'OMR',
  LYD: 'LYD', MRU: 'MRU',
};

function getCurrencyLabel(code: string): string {
  return CURRENCY_LABELS[(code || 'TND').toUpperCase()] || (code || 'TND').toUpperCase();
}

/** Convertit un montant d'une devise vers une autre (via TND). rates: code -> rateToTND */
function convert(
  amount: number,
  fromCode: string,
  toCode: string,
  rates: Record<string, number>
): number {
  const from = (fromCode || 'TND').toUpperCase();
  const to = (toCode || 'TND').toUpperCase();
  if (from === to) return amount;
  const rateFrom = rates[from] ?? 1;
  const rateTo = rates[to] ?? 1;
  return (amount * rateFrom) / rateTo;
}

export interface UseDefaultCurrencyResult {
  defaultCurrencyCode: string;
  currencyLabel: string;
  rates: Record<string, number>;
  loading: boolean;
  /** Convertit un montant vers la devise par défaut (fromCode = devise d'origine). */
  toDefault: (amount: number, fromCode?: string | null) => number;
  /** Montant affiché en devise par défaut : convertit si besoin puis formate (ex: "123.45 TND"). */
  formatInDefault: (amount: number, originCurrencyCode?: string | null) => string;
  getCurrencyLabel: (code: string) => string;
}

export function useDefaultCurrency(): UseDefaultCurrencyResult {
  const [defaultCurrencyCode, setDefaultCurrencyCode] = useState<string>('TND');
  const [rates, setRates] = useState<Record<string, number>>({ TND: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([currencyApi.getDefault(), currencyApi.getRates()])
      .then(([defaultRes, ratesMap]) => {
        if (cancelled) return;
        setDefaultCurrencyCode(defaultRes.code || 'TND');
        setRates({ TND: 1, ...ratesMap });
      })
      .catch(() => {
        if (!cancelled) {
          setDefaultCurrencyCode('TND');
          setRates({ TND: 1 });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const toDefault = (amount: number, fromCode?: string | null): number => {
    const from = (fromCode || 'TND').toUpperCase();
    return convert(amount, from, defaultCurrencyCode, rates);
  };

  const formatInDefault = (amount: number, originCurrencyCode?: string | null): string => {
    const value = toDefault(amount, originCurrencyCode);
    const label = getCurrencyLabel(defaultCurrencyCode);
    return `${value.toFixed(2)} ${label}`;
  };

  return {
    defaultCurrencyCode,
    currencyLabel: getCurrencyLabel(defaultCurrencyCode),
    rates,
    loading,
    toDefault,
    formatInDefault,
    getCurrencyLabel,
  };
}

export { getCurrencyLabel };
