import { StockTicker, Timeframe, PricePoint, StockNews } from '../types';

// Helper to generate realistic historical price curve
export function generateHistoryForTimeframe(
  basePrice: number,
  timeframe: Timeframe,
  volatility = 0.015
): PricePoint[] {
  let count = 40;
  const now = Date.now();
  let stepMs = 60 * 1000;

  switch (timeframe) {
    case '1D':
      count = 30;
      stepMs = 12 * 60 * 1000;
      break;
    case '1S':
      count = 35;
      stepMs = 4 * 3600 * 1000;
      break;
    case '1M':
      count = 30;
      stepMs = 24 * 3600 * 1000;
      break;
    case '3M':
      count = 40;
      stepMs = 2.2 * 24 * 3600 * 1000;
      break;
    case '6M':
      count = 45;
      stepMs = 4 * 24 * 3600 * 1000;
      break;
    case '1A':
      count = 52;
      stepMs = 7 * 24 * 3600 * 1000;
      break;
    case '2A':
      count = 60;
      stepMs = 12 * 24 * 3600 * 1000;
      break;
    case '5A':
      count = 70;
      stepMs = 26 * 24 * 3600 * 1000;
      break;
    case 'TODO':
      count = 80;
      stepMs = 45 * 24 * 3600 * 1000;
      break;
  }

  // Walk backwards from basePrice to guarantee the latest point matches basePrice seamlessly
  const reversePoints: PricePoint[] = [];
  let current = basePrice;
  const trend = (Math.random() > 0.5 ? 1 : -1) * 0.0005 * current;

  for (let i = 0; i < count; i++) {
    const timestamp = now - i * stepMs;
    const dateObj = new Date(timestamp);
    let timeLabel = '';

    if (timeframe === '1D') {
      timeLabel = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (timeframe === '1S' || timeframe === '1M' || timeframe === '3M' || timeframe === '6M') {
      timeLabel = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } else {
      timeLabel = dateObj.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    }

    const price = Number(current.toFixed(2));
    const noise = (Math.random() - 0.49) * volatility * current;
    const open = Number(Math.max(0.1, price - noise * 0.5).toFixed(2));
    const high = Number(Math.max(price, open, price + Math.abs(noise)).toFixed(2));
    const low = Number(Math.max(0.05, Math.min(price, open, price - Math.abs(noise))).toFixed(2));
    const volume = Math.floor(10000 + Math.random() * 500000);

    reversePoints.push({
      timestamp,
      timeLabel,
      price,
      open,
      high,
      low,
      close: price,
      volume,
    });

    // Walk backwards smoothly without artificial jumps
    current = Math.max(0.5, current - (noise + trend));
  }

  // Chronological order (oldest to newest, ending exactly at basePrice)
  return reversePoints.reverse();
}

export function generateAllTimeframes(basePrice: number): Record<Timeframe, PricePoint[]> {
  const timeframes: Timeframe[] = ['1D', '1S', '1M', '3M', '6M', '1A', '2A', '5A', 'TODO'];
  const res = {} as Record<Timeframe, PricePoint[]>;
  
  timeframes.forEach((tf) => {
    res[tf] = generateHistoryForTimeframe(basePrice, tf);
  });
  
  return res;
}

export function generateSparkline(
  currentPrice: number,
  changePercent: number = 0,
  previousClose?: number
): number[] {
  const points = 24;
  const data: number[] = [];
  const startPrice =
    previousClose && previousClose > 0
      ? previousClose
      : currentPrice / (1 + (changePercent || 0) / 100);

  const priceDiff = currentPrice - startPrice;

  for (let i = 0; i < points - 1; i++) {
    const progress = i / (points - 1);
    const base = startPrice + priceDiff * progress;
    const wave = (Math.sin(i * 1.3) * 0.5 + Math.cos(i * 0.9) * 0.5) * (currentPrice * 0.003);
    data.push(Number(Math.max(0.01, base + wave).toFixed(2)));
  }

  if (data.length > 0) {
    data[0] = Number(startPrice.toFixed(2));
  }
  data.push(Number(currentPrice.toFixed(2)));
  return data;
}

export const INITIAL_TICKERS: StockTicker[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    currency: '$',
    currentPrice: 334.76,
    previousClose: 332.41,
    change: 2.35,
    changePercent: 0.71,
    dayHigh: 335.58,
    dayLow: 330.19,
    openPrice: 334.76,
    volume: '36.42 M',
    avgVolume: '53.18 M',
    marketCap: '4.92 B',
    peRatio: 38.2,
    dividendYield: '0.32%',
    week52High: 344.57,
    week52Low: 236.65,
    targetPrice: 350.00,
    targetNote: 'Precio objetivo para cierre de año fiscal (WWDC + iPhone)',
    sparkline: generateSparkline(334.76, 0.71),
    history: generateAllTimeframes(334.76),
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    currency: '$',
    currentPrice: 218.92,
    previousClose: 213.90,
    change: 5.02,
    changePercent: 2.35,
    dayHigh: 219.87,
    dayLow: 217.15,
    openPrice: 218.39,
    volume: '92.85 M',
    avgVolume: '128.87 M',
    marketCap: '5.30 B',
    peRatio: 27.0,
    dividendYield: '0.47%',
    week52High: 236.54,
    week52Low: 164.27,
    targetPrice: 240.00,
    targetNote: 'Nuevo récord tras despliegue de arquitectura Blackwell',
    sparkline: generateSparkline(218.92, 2.35),
    history: generateAllTimeframes(218.92),
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    currency: '$',
    currentPrice: 497.18,
    previousClose: 492.20,
    change: 4.98,
    changePercent: 1.01,
    dayHigh: 498.50,
    dayLow: 491.80,
    openPrice: 492.50,
    volume: '18.30 M',
    avgVolume: '20.10 M',
    marketCap: '3.70 B',
    peRatio: 37.5,
    dividendYield: '0.71%',
    week52High: 502.40,
    week52Low: 385.20,
    targetPrice: 520.00,
    targetNote: 'Crecimiento estimado de Azure Cloud y Copilot',
    sparkline: generateSparkline(497.18, 1.01),
    history: generateAllTimeframes(497.18),
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    exchange: 'NASDAQ',
    currency: '$',
    currentPrice: 258.40,
    previousClose: 252.10,
    change: 6.30,
    changePercent: 2.50,
    dayHigh: 261.20,
    dayLow: 251.00,
    openPrice: 252.30,
    volume: '62.40 M',
    avgVolume: '85.10 M',
    marketCap: '822.5 M',
    peRatio: 61.2,
    dividendYield: '—',
    week52High: 271.00,
    week52Low: 138.80,
    targetPrice: 300.00,
    targetNote: 'Lanzamiento Robotaxi y expansión energética Megapack',
    sparkline: generateSparkline(258.40, 2.50),
    history: generateAllTimeframes(258.40),
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    exchange: 'NASDAQ',
    currency: '$',
    currentPrice: 162.70,
    previousClose: 164.20,
    change: -1.50,
    changePercent: -0.91,
    dayHigh: 165.10,
    dayLow: 161.80,
    openPrice: 164.00,
    volume: '28.15 M',
    avgVolume: '26.40 M',
    marketCap: '2.01 B',
    peRatio: 24.6,
    dividendYield: '0.49%',
    week52High: 191.75,
    week52Low: 120.21,
    targetPrice: 190.00,
    targetNote: 'Integración de Gemini y monetización Search',
    sparkline: generateSparkline(162.70, -0.91),
    history: generateAllTimeframes(162.70),
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    exchange: 'NASDAQ',
    currency: '$',
    currentPrice: 186.40,
    previousClose: 183.90,
    change: 2.50,
    changePercent: 1.36,
    dayHigh: 187.80,
    dayLow: 183.20,
    openPrice: 184.10,
    volume: '39.80 M',
    avgVolume: '42.10 M',
    marketCap: '1.94 B',
    peRatio: 41.3,
    dividendYield: '—',
    week52High: 201.20,
    week52Low: 118.35,
    targetPrice: 215.00,
    targetNote: 'Consolidación de márgenes en AWS y Prime',
    sparkline: generateSparkline(186.40, 1.36),
    history: generateAllTimeframes(186.40),
  },
  {
    symbol: 'META',
    name: 'Meta Platforms, Inc.',
    exchange: 'NASDAQ',
    currency: '$',
    currentPrice: 512.60,
    previousClose: 504.30,
    change: 8.30,
    changePercent: 1.65,
    dayHigh: 515.90,
    dayLow: 502.80,
    openPrice: 505.00,
    volume: '18.40 M',
    avgVolume: '15.90 M',
    marketCap: '1.29 B',
    peRatio: 26.8,
    dividendYield: '0.39%',
    week52High: 542.81,
    week52Low: 279.40,
    targetPrice: 550.00,
    targetNote: 'Excelente tracción de Llama y anuncios en Reels',
    sparkline: generateSparkline(512.60, 1.65),
    history: generateAllTimeframes(512.60),
  },
  {
    symbol: '^GSPC',
    name: 'S&P 500',
    exchange: 'Índice EE.UU.',
    currency: '$',
    currentPrice: 5625.80,
    previousClose: 5598.40,
    change: 27.40,
    changePercent: 0.49,
    dayHigh: 5635.10,
    dayLow: 5590.20,
    openPrice: 5600.00,
    volume: '2.40 B',
    avgVolume: '2.30 B',
    marketCap: '—',
    peRatio: 27.2,
    dividendYield: '1.32%',
    week52High: 5669.67,
    week52Low: 4103.78,
    targetPrice: 5800.00,
    targetNote: 'Objetivo macro para cierre del ciclo anual',
    sparkline: generateSparkline(5625.80, 0.49),
    history: generateAllTimeframes(5625.80),
  },
  {
    symbol: '^IBEX',
    name: 'IBEX 35',
    exchange: 'Bolsa de Madrid',
    currency: '€',
    currentPrice: 11754.20,
    previousClose: 11680.10,
    change: 74.10,
    changePercent: 0.63,
    dayHigh: 11780.00,
    dayLow: 11665.30,
    openPrice: 11690.00,
    volume: '180.4 M',
    avgVolume: '165.0 M',
    marketCap: '—',
    peRatio: 11.8,
    dividendYield: '4.20%',
    week52High: 11840.50,
    week52Low: 8870.00,
    targetPrice: 12000.00,
    targetNote: 'Nivel psicológico clave con banca impulsando',
    sparkline: generateSparkline(11754.20, 0.63),
    history: generateAllTimeframes(11754.20),
  },
  {
    symbol: 'BTC-USD',
    name: 'Bitcoin',
    exchange: 'Crypto',
    currency: '$',
    currentPrice: 63820.00,
    previousClose: 61950.00,
    change: 1870.00,
    changePercent: 3.02,
    dayHigh: 64200.00,
    dayLow: 61500.00,
    openPrice: 61900.00,
    volume: '34.20 B',
    avgVolume: '29.50 B',
    marketCap: '1.26 B',
    peRatio: '—',
    dividendYield: '—',
    week52High: 73750.00,
    week52Low: 26500.00,
    targetPrice: 75000.00,
    targetNote: 'Superación de máximos históricos post-halving',
    sparkline: generateSparkline(63820.00, 3.02),
    history: generateAllTimeframes(63820.00),
  },
  {
    symbol: 'SAN.MC',
    name: 'Banco Santander, S.A.',
    exchange: 'BME',
    currency: '€',
    currentPrice: 12.95,
    previousClose: 12.69,
    change: 0.26,
    changePercent: 2.05,
    dayHigh: 12.98,
    dayLow: 12.87,
    openPrice: 12.98,
    volume: '1.55 M',
    avgVolume: '20.42 M',
    marketCap: '187.0 M',
    peRatio: 14.7,
    dividendYield: '1.97%',
    week52High: 13.12,
    week52Low: 8.10,
    targetPrice: 14.50,
    targetNote: 'Crecimiento de rentabilidad ROTE y dividendo bancario',
    sparkline: generateSparkline(12.95, 2.05),
    history: generateAllTimeframes(12.95),
  }
];

export const MOCK_NEWS: StockNews[] = [
  {
    id: 'news-1',
    title: 'Los analistas elevan el precio objetivo tras los resultados trimestrales récord',
    source: 'Bloomberg Financiero',
    timeAgo: 'hace 18 min',
    category: 'Resultados',
    relatedSymbol: 'AAPL',
  },
  {
    id: 'news-2',
    title: 'La demanda de semiconductores de IA acelera el volumen de pedidos institucionales',
    source: 'Wall Street Journal',
    timeAgo: 'hace 42 min',
    category: 'Tecnología',
    relatedSymbol: 'NVDA',
  },
  {
    id: 'news-3',
    title: 'La Reserva Federal señala posibles recortes de tipos de interés en las próximas reuniones',
    source: 'Reuters Mercados',
    timeAgo: 'hace 1 hora',
    category: 'Macroeconomía',
    relatedSymbol: '^GSPC',
  },
  {
    id: 'news-4',
    title: 'Nueva alianza estratégica para la expansión global de infraestructura en la nube',
    source: 'Financial Times',
    timeAgo: 'hace 2 horas',
    category: 'Empresas',
    relatedSymbol: 'MSFT',
  },
  {
    id: 'news-5',
    title: 'El sector energético y bancario impulsan al IBEX 35 a máximos de los últimos años',
    source: 'Expansión',
    timeAgo: 'hace 3 horas',
    category: 'Mercados Europa',
    relatedSymbol: '^IBEX',
  },
  {
    id: 'news-6',
    title: 'Aumento de las posiciones institucionales en activos digitales y ETFs al contado',
    source: 'CoinDesk Pro',
    timeAgo: 'hace 4 horas',
    category: 'Criptoactivos',
    relatedSymbol: 'BTC-USD',
  },
];

// Search directory with popular world stocks so users can pick easily
export const SEARCH_DIRECTORY = [
  { symbol: 'NFLX', name: 'Netflix, Inc.', exchange: 'NASDAQ', price: 685.20, currency: '$' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', price: 154.60, currency: '$' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', exchange: 'NYSE', price: 450.80, currency: '$' },
  { symbol: 'ARM', name: 'Arm Holdings plc', exchange: 'NASDAQ', price: 138.40, currency: '$' },
  { symbol: 'PLTR', name: 'Palantir Technologies', exchange: 'NYSE', price: 34.50, currency: '$' },
  { symbol: 'SAN.MC', name: 'Banco Santander', exchange: 'BME', price: 4.45, currency: '€' },
  { symbol: 'BBVA.MC', name: 'BBVA S.A.', exchange: 'BME', price: 9.35, currency: '€' },
  { symbol: 'ITX.MC', name: 'Inditex', exchange: 'BME', price: 49.20, currency: '€' },
  { symbol: 'COIN', name: 'Coinbase Global, Inc.', exchange: 'NASDAQ', price: 168.90, currency: '$' },
  { symbol: 'ETH-USD', name: 'Ethereum', exchange: 'Crypto', price: 2650.00, currency: '$' },
  { symbol: 'DIS', name: 'The Walt Disney Company', exchange: 'NYSE', price: 93.40, currency: '$' },
  { symbol: 'BABA', name: 'Alibaba Group Holding', exchange: 'NYSE', price: 85.10, currency: '$' },
  { symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ', price: 21.80, currency: '$' },
  { symbol: 'UBER', name: 'Uber Technologies, Inc.', exchange: 'NYSE', price: 74.20, currency: '$' },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings', exchange: 'NASDAQ', price: 295.40, currency: '$' },
  { symbol: 'SPOT', name: 'Spotify Technology S.A.', exchange: 'NYSE', price: 342.10, currency: '$' },
];

export function createNewCustomTicker(
  symbol: string,
  name: string,
  price: number,
  exchange: string,
  currency = '$',
  targetPrice?: number
): StockTicker {
  const currentPrice = Number(price);
  const changePercent = Number(((Math.random() - 0.45) * 3).toFixed(2));
  const change = Number(((currentPrice * changePercent) / 100).toFixed(2));
  const prevClose = Number((currentPrice - change).toFixed(2));

  return {
    symbol: symbol.toUpperCase().trim(),
    name: name.trim() || symbol.toUpperCase().trim(),
    exchange: exchange.trim() || 'GLOBAL',
    currency,
    currentPrice,
    previousClose: prevClose,
    change,
    changePercent,
    dayHigh: Number((currentPrice * (1 + Math.random() * 0.02)).toFixed(2)),
    dayLow: Number((currentPrice * (1 - Math.random() * 0.02)).toFixed(2)),
    openPrice: Number((prevClose + (Math.random() - 0.5) * (currentPrice * 0.01)).toFixed(2)),
    volume: `${(Math.random() * 50 + 5).toFixed(1)} M`,
    avgVolume: `${(Math.random() * 45 + 5).toFixed(1)} M`,
    marketCap: `${(currentPrice * 0.015).toFixed(2)} B`,
    peRatio: Number((Math.random() * 35 + 10).toFixed(1)),
    dividendYield: Math.random() > 0.5 ? `${(Math.random() * 3).toFixed(2)}%` : '—',
    week52High: Number((currentPrice * 1.25).toFixed(2)),
    week52Low: Number((currentPrice * 0.75).toFixed(2)),
    targetPrice: targetPrice ? Number(targetPrice) : undefined,
    targetNote: targetPrice ? 'Objetivo fijado por el usuario' : undefined,
    sparkline: generateSparkline(currentPrice, changePercent),
    history: generateAllTimeframes(currentPrice),
  };
}
