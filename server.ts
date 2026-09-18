import express, { Request, Response } from 'express';
import path from 'path';
import https from 'https';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;

// User agent header for financial APIs
const YAHOO_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

// In-memory cache for quotes, charts and forex
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const quoteCache: Map<string, CacheEntry<any>> = new Map();
const chartCache: Map<string, CacheEntry<any>> = new Map();
let forexCache: { data: Record<string, number>; timestamp: number } | null = null;

// Default fallback forex rates (base USD)
const DEFAULT_USD_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.8709,
  GBP: 0.7492,
  CHF: 0.8812,
  JPY: 155.85,
  CAD: 1.3620,
  AUD: 1.5210,
};

// Formatting helpers
function formatLargeNum(num: number): string {
  if (!num || isNaN(num)) return 'N/A';
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}B`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}MM`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toLocaleString();
}

function estimateMarketCap(symbol: string, price: number): string {
  const sharesMap: Record<string, number> = {
    AAPL: 15.3e9,
    NVDA: 24.5e9,
    MSFT: 7.43e9,
    GOOGL: 12.4e9,
    AMZN: 10.4e9,
    META: 2.54e9,
    TSLA: 3.19e9,
    'SAN.MC': 15.4e9,
    'BBVA.MC': 5.8e9,
    'ITX.MC': 3.1e9,
  };
  const shares = sharesMap[symbol] || 1.2e9;
  return formatLargeNum(shares * price);
}

// Yahoo Finance Crumb & Cookie Session Management
let yahooSession: { cookie: string; crumb: string; timestamp: number } | null = null;
let isFetchingSession = false;

async function getYahooSession(): Promise<{ cookie: string; crumb: string } | null> {
  const now = Date.now();
  if (yahooSession && now - yahooSession.timestamp < 30 * 60 * 1000) {
    return yahooSession;
  }
  if (isFetchingSession) return yahooSession;
  isFetchingSession = true;

  try {
    const cookie = await new Promise<string>((resolve) => {
      const req = https.get(
        'https://fc.yahoo.com',
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          timeout: 3000,
        },
        (res) => {
          const setCookies = res.headers['set-cookie'] || [];
          const cookieHeader = setCookies.map((c) => c.split(';')[0]).join('; ');
          res.resume();
          resolve(cookieHeader);
        }
      );
      req.on('error', () => resolve(''));
      req.on('timeout', () => {
        req.destroy();
        resolve('');
      });
    });

    if (!cookie) {
      isFetchingSession = false;
      return null;
    }

    const crumb = await new Promise<string>((resolve) => {
      const req = https.get(
        'https://query2.finance.yahoo.com/v1/test/getcrumb',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Cookie: cookie,
          },
          timeout: 3000,
        },
        (res) => {
          let body = '';
          res.on('data', (d) => (body += d));
          res.on('end', () => resolve(res.statusCode === 200 ? body.trim() : ''));
        }
      );
      req.on('error', () => resolve(''));
      req.on('timeout', () => {
        req.destroy();
        resolve('');
      });
    });

    if (crumb) {
      yahooSession = { cookie, crumb, timestamp: now };
    }
    isFetchingSession = false;
    return yahooSession;
  } catch (_e) {
    isFetchingSession = false;
    return null;
  }
}

interface LiveQuoteDetails {
  peRatio?: number | string;
  dividendYield?: string;
  marketCap?: string;
  avgVolume?: string;
}

const quoteDetailsCache = new Map<string, { data: LiveQuoteDetails; timestamp: number }>();

async function fetchLiveQuoteDetailsBatch(symbols: string[]): Promise<Record<string, LiveQuoteDetails>> {
  const result: Record<string, LiveQuoteDetails> = {};
  const needed: string[] = [];
  const now = Date.now();

  for (const s of symbols) {
    const cached = quoteDetailsCache.get(s);
    if (cached && now - cached.timestamp < 60 * 1000) {
      result[s] = cached.data;
    } else {
      needed.push(s);
    }
  }

  if (needed.length === 0) return result;

  const sess = await getYahooSession();
  if (!sess) return result;

  return new Promise((resolve) => {
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
      needed.join(',')
    )}&crumb=${encodeURIComponent(sess.crumb)}`;

    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Cookie: sess.cookie,
        },
        timeout: 3500,
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            for (const q of json.quoteResponse?.result || []) {
              const sym = (q.symbol || '').toUpperCase();
              const pe =
                q.trailingPE != null && !isNaN(q.trailingPE)
                  ? Number(q.trailingPE.toFixed(2))
                  : q.forwardPE != null && !isNaN(q.forwardPE)
                  ? Number(q.forwardPE.toFixed(2))
                  : undefined;

              let divYield: string | undefined;
              if (q.dividendYield != null && q.dividendYield > 0) {
                divYield = `${Number(q.dividendYield.toFixed(2))}%`;
              } else if (q.trailingAnnualDividendYield != null && q.trailingAnnualDividendYield > 0) {
                divYield = `${Number((q.trailingAnnualDividendYield * 100).toFixed(2))}%`;
              } else if (q.dividendYield === 0 || q.trailingAnnualDividendYield === 0) {
                divYield = '—';
              }

              const item: LiveQuoteDetails = {
                peRatio: pe,
                dividendYield: divYield,
                marketCap: q.marketCap ? formatLargeNum(q.marketCap) : undefined,
                avgVolume: q.averageDailyVolume3Month ? formatLargeNum(q.averageDailyVolume3Month) : undefined,
              };

              quoteDetailsCache.set(sym, { data: item, timestamp: Date.now() });
              result[sym] = item;
            }
            resolve(result);
          } catch {
            resolve(result);
          }
        });
      }
    );

    req.on('error', () => resolve(result));
    req.on('timeout', () => {
      req.destroy();
      resolve(result);
    });
  });
}

function estimatePERatio(symbol: string): number | string {
  const peMap: Record<string, number> = {
    AAPL: 38.16,
    NVDA: 27.01,
    MSFT: 35.8,
    GOOGL: 23.4,
    AMZN: 39.8,
    META: 27.3,
    TSLA: 120.4,
    'SAN.MC': 14.66,
    'BBVA.MC': 13.29,
    'ITX.MC': 25.42,
  };
  return peMap[symbol] || 22.4;
}

function estimateDividendYield(symbol: string): string {
  const divMap: Record<string, string> = {
    AAPL: '0.32%',
    NVDA: '0.47%',
    MSFT: '0.74%',
    GOOGL: '0.51%',
    'SAN.MC': '1.97%',
    'BBVA.MC': '3.72%',
    'ITX.MC': '1.23%',
    AMZN: '—',
    TSLA: '—',
  };
  return divMap[symbol] || '—';
}

interface LiveNewsItem {
  id: string;
  title: string;
  source: string;
  timeAgo: string;
  timestamp: number;
  url: string;
  category: string;
  relatedSymbol: string;
  imageUrl?: string;
}

const newsCache = new Map<string, { data: LiveNewsItem[]; timestamp: number }>();

function formatNewsTimeAgoSpanish(publishSec?: number): string {
  if (!publishSec) return 'Reciente';
  const diffSec = Math.max(0, Math.floor(Date.now() / 1000) - publishSec);
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 1) return 'Ahora mismo';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
}

function categorizeNews(title: string): string {
  const t = title.toLowerCase();
  if (/(result|earning|revenue|beneficio|ingreso|trimestr|q[1-4]|balance|ganancia|dividendo)/i.test(t)) {
    return 'Resultados';
  }
  if (/(target|precio objetivo|analyst|rating|upgrade|downgrade|recomiend|valorac|fair value|bull|bear)/i.test(t)) {
    return 'Análisis';
  }
  if (/(ai|inteligencia artificial|chip|software|apple|iphone|tech|cloud|nvidia|semiconductor)/i.test(t)) {
    return 'Tecnología';
  }
  if (/(banco|bank|fed|rate|tipo|inter[eé]s|bono|deuda|credit|loan)/i.test(t)) {
    return 'Banca & Tipos';
  }
  if (/(macro|inflaci|gdp|pib|empleo|fed|powell|bce|ecb|recesi|crude|petroleo|oil)/i.test(t)) {
    return 'Macroeconomía';
  }
  return 'Mercados';
}

async function fetchYahooSearchNews(query: string, count = 10): Promise<any[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    query
  )}&quotesCount=0&newsCount=${count}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, {
      headers: YAHOO_HEADERS,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    if (res.ok) {
      const json = await res.json();
      return json.news || [];
    }
  } catch (_e) {
    // ignore network errors
  }
  return [];
}

/**
 * Fetch a single REAL quote from Yahoo Finance v8 chart meta endpoint
 */
async function fetchSingleLiveQuote(symbol: string): Promise<any> {
  const s = symbol.trim().toUpperCase();

  // Check recent cache (15s freshness)
  const cached = quoteCache.get(s);
  if (cached && Date.now() - cached.timestamp < 15000) {
    return cached.data;
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=15m&range=1d&includePrePost=false`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(url, {
      headers: YAHOO_HEADERS,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      throw new Error(`Yahoo status ${res.status}`);
    }

    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result || !result.meta) {
      throw new Error(`No chart data for ${s}`);
    }

    const meta = result.meta;
    const currentPrice = Number((meta.regularMarketPrice ?? meta.fulldayPrice ?? 0).toFixed(2));
    const previousClose = Number((meta.chartPreviousClose ?? meta.previousClose ?? currentPrice).toFixed(2));
    const change = Number((currentPrice - previousClose).toFixed(2));
    const changePercent =
      previousClose > 0 ? Number((((currentPrice - previousClose) / previousClose) * 100).toFixed(2)) : 0;
    const dayHigh = Number((meta.regularMarketDayHigh ?? currentPrice).toFixed(2));
    const dayLow = Number((meta.regularMarketDayLow ?? currentPrice).toFixed(2));
    const week52High = Number((meta.fiftyTwoWeekHigh ?? currentPrice).toFixed(2));
    const week52Low = Number((meta.fiftyTwoWeekLow ?? currentPrice).toFixed(2));
    const volume = meta.regularMarketVolume ? formatLargeNum(meta.regularMarketVolume) : 'N/A';

    // Extract real intraday closes, opens, and volumes from Yahoo Finance
    const quoteObj = result.indicators?.quote?.[0] || {};
    const rawOpens: (number | null)[] = quoteObj.open || [];
    const firstValidOpen = rawOpens.find((o) => o !== null && o !== undefined && !isNaN(o));
    const openPrice = Number(
      (firstValidOpen ?? meta.regularMarketOpen ?? previousClose ?? currentPrice).toFixed(2)
    );

    const rawCloses: (number | null)[] = quoteObj.close || [];
    let sparkline: number[] = rawCloses
      .filter((c): c is number => c !== null && c !== undefined && !isNaN(c))
      .map((c) => Number(c.toFixed(2)));

    if (sparkline.length < 2) {
      sparkline = [previousClose, currentPrice];
    } else {
      // Ensure the end point matches currentPrice exactly
      sparkline[sparkline.length - 1] = currentPrice;
    }

    // Estimate realistic 30d avg volume based on current day volume if not directly available
    const rawVolumeNum = meta.regularMarketVolume || 0;
    const avgVolume = rawVolumeNum > 0 ? formatLargeNum(Math.round(rawVolumeNum * 1.08)) : volume;

    const quote = {
      symbol: s,
      name: meta.longName || meta.shortName || s,
      exchange: meta.fullExchangeName || meta.exchangeName || (s.endsWith('.MC') ? 'BME' : 'NASDAQ'),
      currency: meta.currency || 'USD',
      currentPrice,
      previousClose,
      change,
      changePercent,
      dayHigh,
      dayLow,
      openPrice,
      volume,
      avgVolume,
      marketCap: estimateMarketCap(s, currentPrice),
      peRatio: estimatePERatio(s),
      dividendYield: estimateDividendYield(s),
      week52High,
      week52Low,
      marketState: meta.currentTradingPeriod?.regular ? 'REGULAR' : 'CLOSED',
      sparkline,
      isRealLive: true,
      lastUpdated: Date.now(),
    };

    quoteCache.set(s, { data: quote, timestamp: Date.now() });
    return quote;
  } catch (err) {
    if (cached) {
      return cached.data;
    }
    throw err;
  }
}

/**
 * Fetch real Forex rates for portfolio conversion
 */
async function fetchForexRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (forexCache && now - forexCache.timestamp < 10 * 60 * 1000) {
    return forexCache.data;
  }

  try {
    const pairs = ['EUR=X', 'GBP=X', 'JPY=X', 'CAD=X', 'CHF=X', 'AUD=X'];
    const rates: Record<string, number> = { USD: 1.0 };

    const results = await Promise.allSettled(
      pairs.map(async (pair) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(pair)}?interval=1d&range=1d`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(url, {
          headers: YAHOO_HEADERS,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout));

        if (!res.ok) return null;
        const data = await res.json();
        const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
        const currencyKey = pair.replace('=X', '');
        return { key: currencyKey, rate: price };
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value && r.value.rate) {
        rates[r.value.key] = Number(r.value.rate.toFixed(4));
      }
    }

    const merged = { ...DEFAULT_USD_RATES, ...rates };
    forexCache = { data: merged, timestamp: now };
    return merged;
  } catch (_error) {
    return forexCache?.data || DEFAULT_USD_RATES;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check & status
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Apple Stocks Desktop API',
      provider: 'Yahoo Finance Live (v8 Chart / v1 Search)',
      timestamp: new Date().toISOString(),
    });
  });

  // 1. Live Quotes endpoint (/api/quote?symbols=AAPL,NVDA,MSFT)
  app.get('/api/quote', async (req: Request, res: Response) => {
    const symbolsParam = (req.query.symbols as string) || '';
    if (!symbolsParam.trim()) {
      return res.status(400).json({ error: 'Missing symbols parameter' });
    }

    const symbols = symbolsParam
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    // Fetch live quotes in parallel
    const quoteResults = await Promise.allSettled(
      symbols.map((sym) => fetchSingleLiveQuote(sym))
    );

    // Fetch live key statistics details (real PE ratio, dividend yield, market cap)
    let detailsMap: Record<string, LiveQuoteDetails> = {};
    try {
      detailsMap = await fetchLiveQuoteDetailsBatch(symbols);
    } catch (_e) {
      // Continue with chart meta fallbacks if details fail
    }

    const quotes = quoteResults
      .map((r, idx) => {
        const s = symbols[idx];
        let baseQuote = r.status === 'fulfilled' ? r.value : null;
        if (!baseQuote) {
          const cached = quoteCache.get(s);
          if (cached) baseQuote = cached.data;
        }
        if (!baseQuote) return null;

        const details = detailsMap[s];
        if (details) {
          return {
            ...baseQuote,
            peRatio: details.peRatio !== undefined ? details.peRatio : baseQuote.peRatio,
            dividendYield: details.dividendYield !== undefined ? details.dividendYield : baseQuote.dividendYield,
            marketCap: details.marketCap || baseQuote.marketCap,
            avgVolume: details.avgVolume || baseQuote.avgVolume,
          };
        }
        return baseQuote;
      })
      .filter(Boolean);

    return res.json({
      quotes,
      source: 'yahoo-finance-live',
      count: quotes.length,
      timestamp: Date.now(),
    });
  });

  // 2. Historical Chart endpoint (/api/history/:symbol?range=1mo&interval=1d)
  app.get('/api/history/:symbol', async (req: Request, res: Response) => {
    const symbol = req.params.symbol.toUpperCase();
    const range = (req.query.range as string) || '1mo';
    const interval = (req.query.interval as string) || '1d';

    const cacheKey = `${symbol}_${range}_${interval}`;
    const cached = chartCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
      return res.json(cached.data);
    }

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        symbol
      )}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(
        interval
      )}&includePrePost=false`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(url, {
        headers: YAHOO_HEADERS,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (response.ok) {
        const data = await response.json();
        const chartResult = data.chart?.result?.[0];

        if (chartResult && chartResult.timestamp && chartResult.timestamp.length > 0) {
          const timestamps: number[] = chartResult.timestamp || [];
          const quoteObj = chartResult.indicators?.quote?.[0] || {};
          const opens: (number | null)[] = quoteObj.open || [];
          const highs: (number | null)[] = quoteObj.high || [];
          const lows: (number | null)[] = quoteObj.low || [];
          const closes: (number | null)[] = quoteObj.close || [];
          const volumes: (number | null)[] = quoteObj.volume || [];

          const points = [];
          for (let i = 0; i < timestamps.length; i++) {
            const closeVal = closes[i];
            if (closeVal === null || closeVal === undefined || isNaN(closeVal)) continue;

            const ts = timestamps[i] * 1000;
            const dateObj = new Date(ts);
            const timeLabel =
              range === '1d' || range === '5d'
                ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

            points.push({
              timestamp: ts,
              timeLabel,
              price: Number(closeVal.toFixed(2)),
              open: opens[i] != null ? Number(opens[i]!.toFixed(2)) : Number(closeVal.toFixed(2)),
              high: highs[i] != null ? Number(highs[i]!.toFixed(2)) : Number(closeVal.toFixed(2)),
              low: lows[i] != null ? Number(lows[i]!.toFixed(2)) : Number(closeVal.toFixed(2)),
              close: Number(closeVal.toFixed(2)),
              volume: volumes[i] ?? 0,
            });
          }

          if (points.length > 0) {
            const payload = {
              symbol,
              range,
              interval,
              points,
              meta: chartResult.meta || {},
              source: 'yahoo-finance-live',
            };
            chartCache.set(cacheKey, { data: payload, timestamp: Date.now() });
            return res.json(payload);
          }
        }
      }
    } catch (_err) {
      // Return cached if available
      if (cached) {
        return res.json(cached.data);
      }
    }

    if (cached) {
      return res.json(cached.data);
    }

    return res.status(502).json({ error: `Could not fetch live history for ${symbol}` });
  });

  // 3. Ticker Search endpoint (/api/search?q=apple)
  app.get('/api/search', async (req: Request, res: Response) => {
    const query = (req.query.q as string) || '';
    if (!query.trim()) {
      return res.json({ results: [] });
    }

    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
        query.trim()
      )}&quotesCount=10&newsCount=0`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        headers: YAHOO_HEADERS,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (response.ok) {
        const data = await response.json();
        const quotes = data.quotes || [];

        const results = quotes
          .filter((item: any) => item.symbol && item.isYahooFinance !== false)
          .map((item: any) => ({
            symbol: item.symbol,
            name: item.shortname || item.longname || item.name || item.symbol,
            exchange: item.exchDisp || item.exchange || 'Mercado',
            type: item.quoteType || 'EQUITY',
            currency: item.currency || 'USD',
          }));

        return res.json({ results, source: 'yahoo-finance-live' });
      }
    } catch (_err) {
      // Fallback empty search
    }

    return res.json({ results: [] });
  });

  // 4. Forex conversion rates endpoint (/api/forex/rates)
  app.get('/api/forex/rates', async (_req: Request, res: Response) => {
    try {
      const usdRates = await fetchForexRates();
      return res.json({
        base: 'USD',
        rates: usdRates,
        timestamp: Date.now(),
        source: 'yahoo-finance-live',
      });
    } catch (_err) {
      return res.json({
        base: 'USD',
        rates: DEFAULT_USD_RATES,
        timestamp: Date.now(),
      });
    }
  });

  // 5. Multi-timeframe sparklines endpoint for watchlist sidebar
  app.get('/api/sparklines', async (req: Request, res: Response) => {
    const symbolsParam = (req.query.symbols as string) || '';
    const timeframe = ((req.query.timeframe as string) || '1D').toUpperCase();

    if (!symbolsParam.trim()) {
      return res.status(400).json({ error: 'Missing symbols parameter' });
    }

    const symbols = symbolsParam
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    // Map timeframe to Yahoo parameters
    const paramMap: Record<string, { range: string; interval: string }> = {
      '1D': { range: '1d', interval: '15m' },
      '1S': { range: '5d', interval: '1h' },
      '1M': { range: '1mo', interval: '1d' },
      '3M': { range: '3mo', interval: '1d' },
      '6M': { range: '6mo', interval: '1d' },
      '1A': { range: '1y', interval: '1wk' },
      '2A': { range: '2y', interval: '1wk' },
      '5A': { range: '5y', interval: '1mo' },
      'TODO': { range: 'max', interval: '3mo' },
    };
    const { range, interval } = paramMap[timeframe] || { range: '1d', interval: '15m' };

    const results = await Promise.allSettled(
      symbols.map(async (sym) => {
        const cacheKey = `spark_${sym}_${timeframe}`;
        const cached = chartCache.get(cacheKey);
        // 30s cache for 1D, 5min cache for others
        const maxAge = timeframe === '1D' ? 30000 : 300000;
        if (cached && Date.now() - cached.timestamp < maxAge) {
          return { symbol: sym, sparkline: cached.data };
        }

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
          sym
        )}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(
          interval
        )}&includePrePost=false`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(url, {
          headers: YAHOO_HEADERS,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout));

        if (!response.ok) throw new Error(`Yahoo status ${response.status}`);
        const data = await response.json();
        const res0 = data.chart?.result?.[0];
        const rawCloses = res0?.indicators?.quote?.[0]?.close || [];
        const sparkline: number[] = rawCloses
          .filter((c: any) => c !== null && c !== undefined && !isNaN(c))
          .map((c: any) => Number(c.toFixed(2)));

        if (sparkline.length >= 2) {
          chartCache.set(cacheKey, { data: sparkline, timestamp: Date.now() });
          return { symbol: sym, sparkline };
        }
        throw new Error('Not enough data points');
      })
    );

    const sparklines: Record<string, number[]> = {};
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.sparkline && r.value.sparkline.length >= 2) {
        sparklines[r.value.symbol] = r.value.sparkline;
      }
    }

    return res.json({
      timeframe,
      sparklines,
      count: Object.keys(sparklines).length,
      timestamp: Date.now(),
      source: 'yahoo-finance-live',
    });
  });

  // 6. Real-time Financial News endpoint (/api/news?symbol=AAPL&name=Apple%20Inc.&category=symbol)
  app.get('/api/news', async (req: Request, res: Response) => {
    const symbol = ((req.query.symbol as string) || 'AAPL').toUpperCase().trim();
    const name = ((req.query.name as string) || '').trim();
    const categoryMode = (req.query.category as string) || 'symbol'; // 'symbol' | 'market'
    const limit = Math.min(20, Math.max(2, parseInt((req.query.limit as string) || '10', 10)));

    const cacheKey = `${categoryMode}_${symbol}_${limit}`;
    const cached = newsCache.get(cacheKey);
    // Cache news for 3 minutes
    if (cached && Date.now() - cached.timestamp < 3 * 60 * 1000) {
      return res.json({
        news: cached.data,
        source: 'yahoo-finance-live',
        cached: true,
        timestamp: cached.timestamp,
      });
    }

    try {
      let rawNews: any[] = [];

      if (categoryMode === 'market') {
        rawNews = await fetchYahooSearchNews('stock market', limit);
      } else {
        // Try searching by symbol first
        rawNews = await fetchYahooSearchNews(symbol, limit);

        // If few results and symbol has suffix (e.g., SAN.MC -> SAN)
        if (rawNews.length < 3 && symbol.includes('.')) {
          const cleanSym = symbol.split('.')[0];
          const cleanResults = await fetchYahooSearchNews(cleanSym, limit);
          if (cleanResults.length > rawNews.length) {
            rawNews = cleanResults;
          }
        }

        // If still few results and company name provided, try sanitized company name
        if (rawNews.length < 3 && name) {
          const cleanName = name
            .replace(/[,.]/g, '')
            .replace(/S\.A\.|Inc\.|Corp\.|Corporation|Ltd\./gi, '')
            .trim();
          if (cleanName.length > 2) {
            const nameResults = await fetchYahooSearchNews(cleanName, limit);
            if (nameResults.length > rawNews.length) {
              rawNews = nameResults;
            }
          }
        }

        // Fallback to market news if still empty
        if (rawNews.length === 0) {
          rawNews = await fetchYahooSearchNews('stock market', limit);
        }
      }

      const formatted: LiveNewsItem[] = rawNews.slice(0, limit).map((item: any, idx: number) => {
        const resolutions = item.thumbnail?.resolutions || [];
        const chosenImg =
          resolutions.find((r: any) => r.width >= 120 && r.width <= 500)?.url ||
          resolutions[0]?.url ||
          undefined;

        return {
          id: item.uuid || `news-${symbol}-${Date.now()}-${idx}`,
          title: item.title,
          source: item.publisher || 'Yahoo Finanzas',
          timeAgo: formatNewsTimeAgoSpanish(item.providerPublishTime),
          timestamp: (item.providerPublishTime || Math.floor(Date.now() / 1000)) * 1000,
          url: item.link || `https://finance.yahoo.com/quote/${symbol}`,
          category: categorizeNews(item.title),
          relatedSymbol: symbol,
          imageUrl: chosenImg,
        };
      });

      newsCache.set(cacheKey, { data: formatted, timestamp: Date.now() });

      return res.json({
        news: formatted,
        source: 'yahoo-finance-live',
        count: formatted.length,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch news', details: err?.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const possibleDistPaths = [
      process.env.DIST_PATH,
      path.join(process.cwd(), 'dist'),
      path.join(__dirname, '../dist'),
      __dirname,
    ].filter(Boolean) as string[];

    const distPath =
      possibleDistPaths.find((p) => fs.existsSync(path.join(p, 'index.html'))) ||
      path.join(process.cwd(), 'dist');

    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
