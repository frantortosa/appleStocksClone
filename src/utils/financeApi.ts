import { Timeframe, PricePoint, ForexRates } from '../types';
import { DEFAULT_RATES } from './portfolioUtils';

// Map app timeframes to Yahoo Finance parameters
export function timeframeToYahooParams(timeframe: Timeframe): { range: string; interval: string } {
  switch (timeframe) {
    case '1D':
      return { range: '1d', interval: '5m' };
    case '1S':
      return { range: '5d', interval: '15m' };
    case '1M':
      return { range: '1mo', interval: '1d' };
    case '3M':
      return { range: '3mo', interval: '1d' };
    case '6M':
      return { range: '6mo', interval: '1d' };
    case '1A':
      return { range: '1y', interval: '1d' };
    case '2A':
      return { range: '2y', interval: '1wk' };
    case '5A':
      return { range: '5y', interval: '1wk' };
    case 'TODO':
      return { range: 'max', interval: '1mo' };
    default:
      return { range: '1mo', interval: '1d' };
  }
}

/**
 * Fetch live quote data for multiple symbols from backend Express API
 */
export async function fetchLiveQuotes(symbols: string[]): Promise<any[]> {
  if (!symbols || symbols.length === 0) return [];

  try {
    const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbols.join(','))}`);
    if (!res.ok) {
      return [];
    }
    const json = await res.json();
    return json.quotes || [];
  } catch (_err) {
    return [];
  }
}

/**
 * Fetch real historical price points for a symbol and timeframe
 */
export async function fetchStockHistory(
  symbol: string,
  timeframe: Timeframe
): Promise<PricePoint[] | null> {
  const { range, interval } = timeframeToYahooParams(timeframe);

  try {
    const res = await fetch(
      `/api/history/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`
    );
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    if (data.points && Array.isArray(data.points) && data.points.length > 0) {
      return data.points;
    }
    return null;
  } catch (_err) {
    return null;
  }
}

/**
 * Search real tickers and companies from Yahoo Finance or local catalog
 */
export async function searchYahooTickers(query: string): Promise<any[]> {
  if (!query || query.trim().length < 1) return [];

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (_err) {
    return [];
  }
}

/**
 * Fetch live Forex conversion rates
 */
export async function fetchLiveForexRates(): Promise<ForexRates> {
  try {
    const res = await fetch('/api/forex/rates');
    if (!res.ok) return DEFAULT_RATES;
    const data = await res.json();
    if (data && data.rates) {
      return data as ForexRates;
    }
    return DEFAULT_RATES;
  } catch (_err) {
    return DEFAULT_RATES;
  }
}

/**
 * Fetch multi-timeframe sparklines for multiple tickers in batch
 */
export async function fetchBatchSparklines(
  symbols: string[],
  timeframe: Timeframe
): Promise<Record<string, number[]>> {
  if (!symbols || symbols.length === 0) return {};

  try {
    const res = await fetch(
      `/api/sparklines?symbols=${encodeURIComponent(symbols.join(','))}&timeframe=${encodeURIComponent(
        timeframe
      )}`
    );
    if (!res.ok) return {};
    const data = await res.json();
    return data.sparklines || {};
  } catch (_err) {
    return {};
  }
}
