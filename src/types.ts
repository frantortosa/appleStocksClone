export type Timeframe = '1D' | '1S' | '1M' | '3M' | '6M' | '1A' | '2A' | '5A' | 'TODO';

export type DisplayMetric = 'percent' | 'value' | 'marketCap';

export interface PricePoint {
  timestamp: number;
  timeLabel: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export interface StockTicker {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  openPrice: number;
  volume: string;
  avgVolume: string;
  marketCap: string;
  peRatio: number | string;
  dividendYield: string;
  week52High: number;
  week52Low: number;
  targetPrice?: number;
  targetNote?: string;
  sparkline: number[]; // 20-30 data points for quick list view
  history: Record<Timeframe, PricePoint[]>;
  lastTickDirection?: 'up' | 'down' | 'neutral';
  lastTickTime?: number;
}

export interface StockNews {
  id: string;
  title: string;
  source: string;
  timeAgo: string;
  url?: string;
  category: string;
  relatedSymbol: string;
  imageUrl?: string;
}

export type SupportedCurrency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'JPY';

export interface PortfolioPosition {
  id: string;
  symbol: string;
  shares: number;
  buyPrice: number;
  currency: string;
  buyDate?: string;
  notes?: string;
}

export interface ForexRates {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

export interface AppSettings {
  displayMetric: DisplayMetric;
  realtimeEnabled: boolean;
  tickIntervalMs: number;
  platformView: 'macos' | 'windows';
  chartType: 'area' | 'candles';
  soundEnabled: boolean;
  portfolioBaseCurrency: SupportedCurrency;
  apiSource: 'yahoo' | 'simulated';
}

