import { PortfolioPosition, StockTicker, SupportedCurrency, ForexRates } from '../types';

export const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF ',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
};

export const CURRENCY_NAMES: Record<SupportedCurrency, string> = {
  EUR: 'Euro (€)',
  USD: 'Dólar USA ($)',
  GBP: 'Libra Esterlina (£)',
  CHF: 'Franco Suizo (CHF)',
  JPY: 'Yen Japonés (¥)',
};

/**
 * Standard exchange rates (fallback if API is updating)
 * Base: USD
 */
export const DEFAULT_RATES: ForexRates = {
  base: 'USD',
  rates: {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    CHF: 0.88,
    JPY: 154.5,
    CAD: 1.36,
    AUD: 1.52,
  },
  timestamp: Date.now(),
};

/**
 * Convert an amount from one currency to another using the USD-based rate table
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: SupportedCurrency,
  rates: ForexRates = DEFAULT_RATES
): number {
  if (fromCurrency === toCurrency) return amount;

  const rateTable = rates.rates;
  const fromRate = rateTable[fromCurrency.toUpperCase()] || 1.0;
  const toRate = rateTable[toCurrency.toUpperCase()] || 1.0;

  // Amount in USD
  const amountInUSD = amount / fromRate;
  // Converted to target currency
  return amountInUSD * toRate;
}

/**
 * Format currency value with symbol and precision
 */
export function formatMoney(
  amount: number,
  currency: string,
  includeSign = false
): string {
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()] || `${currency} `;
  const absVal = Math.abs(amount);
  const formatted = absVal.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sign = amount > 0 && includeSign ? '+' : amount < 0 ? '-' : '';
  return `${sign}${symbol}${formatted}`;
}

export interface CalculatedPosition {
  position: PortfolioPosition;
  ticker?: StockTicker;
  shares: number;
  buyPrice: number;
  currentPrice: number;
  currency: string;
  // Native currency values
  costNative: number;
  valueNative: number;
  pnlNative: number;
  pnlPercent: number;
  todayPnlNative: number;
  targetPrice?: number;
  targetProfitNative?: number;
  // Converted to base portfolio currency
  costBase: number;
  valueBase: number;
  pnlBase: number;
  todayPnlBase: number;
  targetProfitBase?: number;
  allocationPercent: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercent: number;
  todayPnl: number;
  todayPnlPercent: number;
  baseCurrency: SupportedCurrency;
  positionsCount: number;
  profitablePositions: number;
  positions: CalculatedPosition[];
  currencyBreakdown: { currency: string; percentage: number; valueBase: number }[];
}

export function calculatePortfolio(
  positions: PortfolioPosition[],
  tickers: StockTicker[],
  baseCurrency: SupportedCurrency,
  rates: ForexRates = DEFAULT_RATES
): PortfolioSummary {
  // Map tickers by symbol for quick lookup
  const tickerMap = new Map<string, StockTicker>();
  tickers.forEach((t) => tickerMap.set(t.symbol, t));

  // First pass: calculate native and converted values
  const prePositions = positions.map((pos) => {
    const ticker = tickerMap.get(pos.symbol);
    const shares = pos.shares;
    const buyPrice = pos.buyPrice;
    const currentPrice = ticker ? ticker.currentPrice : buyPrice;
    const currency = pos.currency || ticker?.currency || 'USD';

    const costNative = shares * buyPrice;
    const valueNative = shares * currentPrice;
    const pnlNative = valueNative - costNative;
    const pnlPercent = costNative > 0 ? (pnlNative / costNative) * 100 : 0;

    const change = ticker ? ticker.change : 0;
    const todayPnlNative = shares * change;

    const targetPrice = ticker?.targetPrice;
    const targetProfitNative = targetPrice ? (targetPrice - buyPrice) * shares : undefined;

    // Convert to base currency
    const costBase = convertCurrency(costNative, currency, baseCurrency, rates);
    const valueBase = convertCurrency(valueNative, currency, baseCurrency, rates);
    const pnlBase = valueBase - costBase;
    const todayPnlBase = convertCurrency(todayPnlNative, currency, baseCurrency, rates);
    const targetProfitBase = targetProfitNative != null
      ? convertCurrency(targetProfitNative, currency, baseCurrency, rates)
      : undefined;

    return {
      position: pos,
      ticker,
      shares,
      buyPrice,
      currentPrice,
      currency,
      costNative,
      valueNative,
      pnlNative,
      pnlPercent,
      todayPnlNative,
      targetPrice,
      targetProfitNative,
      costBase,
      valueBase,
      pnlBase,
      todayPnlBase,
      targetProfitBase,
      allocationPercent: 0,
    };
  });

  const totalValue = prePositions.reduce((acc, p) => acc + p.valueBase, 0);
  const totalCost = prePositions.reduce((acc, p) => acc + p.costBase, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const todayPnl = prePositions.reduce((acc, p) => acc + p.todayPnlBase, 0);
  const prevDayTotal = totalValue - todayPnl;
  const todayPnlPercent = prevDayTotal > 0 ? (todayPnl / prevDayTotal) * 100 : 0;

  // Calculate allocation %
  const calculatedPositions: CalculatedPosition[] = prePositions.map((p) => ({
    ...p,
    allocationPercent: totalValue > 0 ? (p.valueBase / totalValue) * 100 : 0,
  }));

  // Currency breakdown
  const currencyTotals: Record<string, number> = {};
  calculatedPositions.forEach((p) => {
    currencyTotals[p.currency] = (currencyTotals[p.currency] || 0) + p.valueBase;
  });

  const currencyBreakdown = Object.entries(currencyTotals).map(([cur, valBase]) => ({
    currency: cur,
    valueBase: valBase,
    percentage: totalValue > 0 ? (valBase / totalValue) * 100 : 0,
  }));

  return {
    totalValue,
    totalCost,
    totalPnl,
    totalPnlPercent,
    todayPnl,
    todayPnlPercent,
    baseCurrency,
    positionsCount: positions.length,
    profitablePositions: calculatedPositions.filter((p) => p.pnlBase >= 0).length,
    positions: calculatedPositions,
    currencyBreakdown,
  };
}

export const INITIAL_PORTFOLIO_POSITIONS: PortfolioPosition[] = [
  {
    id: 'pos-1',
    symbol: 'AAPL',
    shares: 15,
    buyPrice: 198.5,
    currency: 'USD',
    buyDate: '2024-01-15',
    notes: 'Compra a largo plazo tecnología Apple',
  },
  {
    id: 'pos-2',
    symbol: 'NVDA',
    shares: 20,
    buyPrice: 112.4,
    currency: 'USD',
    buyDate: '2024-03-20',
    notes: 'Inversión en chips y centro de datos IA',
  },
  {
    id: 'pos-3',
    symbol: 'SAN.MC',
    shares: 450,
    buyPrice: 4.15,
    currency: 'EUR',
    buyDate: '2024-02-10',
    notes: 'Posición bancaria europea con dividendo',
  },
];
