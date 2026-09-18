/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  StockTicker, 
  Timeframe, 
  DisplayMetric, 
  AppSettings, 
  PricePoint,
  PortfolioPosition,
  ForexRates,
  SupportedCurrency
} from './types';
import { 
  INITIAL_TICKERS, 
  MOCK_NEWS, 
  generateSparkline,
  createNewCustomTicker 
} from './utils/stockData';
import { 
  DEFAULT_RATES, 
  calculatePortfolio 
} from './utils/portfolioUtils';
import { 
  fetchLiveQuotes, 
  fetchLiveForexRates,
  fetchBatchSparklines
} from './utils/financeApi';
import { DesktopTitlebar } from './components/DesktopTitlebar';
import { WatchlistSidebar } from './components/WatchlistSidebar';
import { StockDetailHeader } from './components/StockDetailHeader';
import { TargetPriceProgressCard } from './components/TargetPriceProgressCard';
import { InteractiveChart } from './components/InteractiveChart';
import { StockKeyStatistics } from './components/StockKeyStatistics';
import { StockNewsFeed } from './components/StockNewsFeed';
import { PortfolioView } from './components/PortfolioView';
import { AddTickerModal } from './components/AddTickerModal';
import { AddPositionModal } from './components/AddPositionModal';
import { EditTargetModal } from './components/EditTargetModal';
import { ElectronInfoModal } from './components/ElectronInfoModal';
import { BellRing, CheckCircle2, Sparkles, X } from 'lucide-react';

const STORAGE_KEY_TICKERS = 'apple_stocks_tickers_v2';
const STORAGE_KEY_SETTINGS = 'apple_stocks_settings_v2';
const STORAGE_KEY_POSITIONS = 'apple_stocks_portfolio_positions_v2';

const INITIAL_PORTFOLIO: PortfolioPosition[] = [
  {
    id: 'pos-1',
    symbol: 'AAPL',
    shares: 25,
    buyPrice: 192.50,
    currency: 'USD',
    buyDate: '2024-01-15',
    notes: 'Posición principal a largo plazo',
  },
  {
    id: 'pos-2',
    symbol: 'NVDA',
    shares: 40,
    buyPrice: 95.20,
    currency: 'USD',
    buyDate: '2024-03-10',
    notes: 'Crecimiento IA Data Centers',
  },
  {
    id: 'pos-3',
    symbol: 'MSFT',
    shares: 15,
    buyPrice: 395.00,
    currency: 'USD',
    buyDate: '2024-02-20',
  },
  {
    id: 'pos-4',
    symbol: 'SAN.MC',
    shares: 950,
    buyPrice: 3.90,
    currency: 'EUR',
    buyDate: '2023-11-05',
    notes: 'Dividendo bancario europeo',
  },
];

export default function App() {
  // Load saved tickers or default list, sanitizing any corrupt flat/spike sparklines
  const [tickers, setTickers] = useState<StockTicker[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TICKERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((t: StockTicker) => {
            const spark = t.sparkline || [];
            let isCorrupt = false;
            if (spark.length < 2) {
              isCorrupt = true;
            } else {
              const lastVal = spark[spark.length - 1];
              const prevVals = spark.slice(0, -1);
              const prevMin = Math.min(...prevVals);
              const prevMax = Math.max(...prevVals);
              if (prevMax - prevMin < 0.03 * t.currentPrice && Math.abs(lastVal - prevMax) > 0.1 * t.currentPrice) {
                isCorrupt = true;
              }
            }
            if (isCorrupt) {
              return {
                ...t,
                sparkline: generateSparkline(t.currentPrice, t.changePercent, t.previousClose),
              };
            }
            return t;
          });
        }
      }
    } catch (e) {
      console.error('Error loading saved tickers', e);
    }
    return INITIAL_TICKERS;
  });

  // Portfolio positions state
  const [positions, setPositions] = useState<PortfolioPosition[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POSITIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading saved portfolio positions', e);
    }
    return INITIAL_PORTFOLIO;
  });

  // Forex rates state
  const [forexRates, setForexRates] = useState<ForexRates>(DEFAULT_RATES);

  // Active view: Watchlist vs Portfolio
  const [activeView, setActiveView] = useState<'watchlist' | 'portfolio'>('watchlist');

  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    return INITIAL_TICKERS[0]?.symbol || 'AAPL';
  });

  // Detail view timeframe (1D, 1S, 1M, etc.)
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1D');

  // Watchlist sidebar sparklines timeframe (default 1D as requested)
  const [sparklineTimeframe, setSparklineTimeframe] = useState<Timeframe>('1D');
  const [batchSparklines, setBatchSparklines] = useState<Record<string, number[]>>({});

  // Auto-fetch multi-timeframe sparklines for watchlist when the timeframe dropdown changes
  useEffect(() => {
    if (sparklineTimeframe === '1D') {
      return; // 1D is natively populated via live quotes in real-time
    }
    const symbols = tickers.map((t) => t.symbol);
    if (symbols.length === 0) return;

    fetchBatchSparklines(symbols, sparklineTimeframe).then((sparks) => {
      if (sparks && Object.keys(sparks).length > 0) {
        setBatchSparklines((prev) => ({ ...prev, ...sparks }));
      }
    });
  }, [sparklineTimeframe, tickers.map((t) => t.symbol).join(',')]);

  // App settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        return { ...JSON.parse(saved) };
      }
    } catch (e) {
      // ignore
    }
    return {
      displayMetric: 'percent',
      realtimeEnabled: true,
      tickIntervalMs: 1600,
      platformView: 'macos',
      chartType: 'area',
      soundEnabled: true,
      portfolioBaseCurrency: 'EUR',
      apiSource: 'yahoo',
    };
  });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddPositionModalOpen, setIsAddPositionModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<PortfolioPosition | null>(null);
  const [editingTargetTicker, setEditingTargetTicker] = useState<StockTicker | null>(null);
  const [isElectronModalOpen, setIsElectronModalOpen] = useState(false);
  const [isRefreshingQuotes, setIsRefreshingQuotes] = useState(false);

  // Target price achievement notification toast
  const [targetToast, setTargetToast] = useState<{
    symbol: string;
    targetPrice: number;
    currentPrice: number;
  } | null>(null);

  // Persistence to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TICKERS, JSON.stringify(tickers));
    } catch (e) {
      console.warn('LocalStorage quota or serialization issue', e);
    }
  }, [tickers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(positions));
    } catch (e) {
      console.warn('LocalStorage portfolio positions issue', e);
    }
  }, [positions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      // ignore
    }
  }, [settings]);

  // Fetch real forex rates and live quotes from backend on startup
  useEffect(() => {
    fetchLiveForexRates().then((rates) => {
      if (rates) setForexRates(rates);
    });
    handleRefreshLiveQuotes();
  }, []);

  // Periodic live quotes sync with Yahoo Finance directly (every 10 seconds)
  useEffect(() => {
    if (!settings.realtimeEnabled) return;

    const interval = setInterval(() => {
      handleRefreshLiveQuotes(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [settings.realtimeEnabled]);

  // Handle Electron IPC listener if inside Electron
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.onOpenAddTicker?.(() => {
        setIsAddModalOpen(true);
      });
    }
  }, []);

  // Clear tick animation flashes after 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setTickers((prev) =>
        prev.map((t) => (t.lastTickDirection ? { ...t, lastTickDirection: undefined } : t))
      );
    }, 2500);
    return () => clearTimeout(timer);
  }, [tickers]);

  // Current selected ticker
  const selectedTicker = tickers.find((t) => t.symbol === selectedSymbol) || tickers[0];

  // Refresh real quotes from Yahoo Finance via Express backend
  const handleRefreshLiveQuotes = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setIsRefreshingQuotes(true);
    try {
      const allSymbols = Array.from(
        new Set([
          ...tickers.map((t) => t.symbol),
          ...positions.map((p) => p.symbol),
        ])
      );

      const liveQuotes = await fetchLiveQuotes(allSymbols);
      if (liveQuotes && liveQuotes.length > 0) {
        setTickers((prev) =>
          prev.map((t) => {
            const found = liveQuotes.find(
              (q) => q.symbol.toUpperCase() === t.symbol.toUpperCase()
            );
            if (!found) return t;

            const oldPrice = t.currentPrice;
            const newPrice = found.currentPrice;
            const direction: 'up' | 'down' | undefined =
              newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : undefined;

            // Check target price reach with real quote
            if (t.targetPrice && oldPrice < t.targetPrice && newPrice >= t.targetPrice) {
              setTargetToast({
                symbol: t.symbol,
                targetPrice: t.targetPrice,
                currentPrice: newPrice,
              });

              if (typeof window !== 'undefined' && (window as any).electronAPI) {
                (window as any).electronAPI.sendNotification?.(
                  `¡Precio Objetivo Alcanzado: ${t.symbol}!`,
                  `${t.name} ha alcanzado los ${t.currency}${newPrice.toFixed(2)} superando el objetivo de ${t.currency}${t.targetPrice.toFixed(2)}.`
                );
              }
            }

            // Real intraday sparkline directly from Yahoo Finance quote
            const updatedSpark =
              found.sparkline && Array.isArray(found.sparkline) && found.sparkline.length >= 2
                ? found.sparkline
                : generateSparkline(newPrice, found.changePercent, found.previousClose);

            // Update ticker.history['1D'] with this live curve
            const updatedHistory = { ...t.history };
            if (updatedSpark.length >= 2) {
              const now = Date.now();
              const stepMs = Math.max(60000, Math.floor((6.5 * 3600 * 1000) / updatedSpark.length));
              updatedHistory['1D'] = updatedSpark.map((p: number, idx: number) => {
                const ts = now - (updatedSpark.length - 1 - idx) * stepMs;
                return {
                  timestamp: ts,
                  timeLabel: new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                  price: p,
                  open: p,
                  high: p,
                  low: p,
                  close: p,
                };
              });
            }

            return {
              ...t,
              name: found.name || t.name,
              exchange: found.exchange || t.exchange,
              currentPrice: newPrice,
              change: found.change,
              changePercent: found.changePercent,
              previousClose: found.previousClose,
              openPrice: found.openPrice !== undefined ? found.openPrice : t.openPrice,
              dayHigh: found.dayHigh,
              dayLow: found.dayLow,
              volume: found.volume || t.volume,
              avgVolume: found.avgVolume || t.avgVolume,
              marketCap: found.marketCap || t.marketCap,
              peRatio: found.peRatio || t.peRatio,
              dividendYield: found.dividendYield || t.dividendYield,
              week52High: found.week52High || t.week52High,
              week52Low: found.week52Low || t.week52Low,
              sparkline: updatedSpark,
              history: updatedHistory,
              lastTickDirection: direction,
              lastTickTime: direction ? Date.now() : t.lastTickTime,
            };
          })
        );
      }

      const rates = await fetchLiveForexRates();
      if (rates) {
        setForexRates(rates);
      }
    } catch (_err) {
      // Gracefully handled with fallback tickers
    } finally {
      if (showLoadingIndicator) setIsRefreshingQuotes(false);
    }
  };

  // Portfolio Multi-Currency Calculations
  const baseCurrency = settings.portfolioBaseCurrency || 'EUR';
  const portfolioSummary = useMemo(() => {
    return calculatePortfolio(positions, tickers, baseCurrency, forexRates);
  }, [positions, tickers, baseCurrency, forexRates]);

  // Watchlist Actions
  const handleSelectTicker = (symbol: string) => {
    setSelectedSymbol(symbol);
    if (activeView === 'portfolio') {
      setActiveView('watchlist');
    }
  };

  const handleRemoveTicker = (symbol: string) => {
    setTickers((prev) => {
      const next = prev.filter((t) => t.symbol !== symbol);
      if (selectedSymbol === symbol && next.length > 0) {
        setSelectedSymbol(next[0].symbol);
      }
      return next;
    });
  };

  const handleReorderTickers = (reordered: StockTicker[]) => {
    setTickers(reordered);
  };

  const handleAddTicker = (newTicker: StockTicker) => {
    setTickers((prev) => {
      const exists = prev.some((t) => t.symbol === newTicker.symbol);
      if (exists) return prev;
      return [newTicker, ...prev];
    });
    setSelectedSymbol(newTicker.symbol);
    setIsAddModalOpen(false);
  };

  const handleSaveTarget = (symbol: string, targetPrice?: number, targetNote?: string) => {
    setTickers((prev) =>
      prev.map((t) => {
        if (t.symbol === symbol) {
          return {
            ...t,
            targetPrice,
            targetNote,
          };
        }
        return t;
      })
    );
  };

  // Portfolio Actions
  const handleSavePosition = (pos: PortfolioPosition) => {
    setPositions((prev) => {
      const idx = prev.findIndex((p) => p.id === pos.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = pos;
        return next;
      }
      return [pos, ...prev];
    });

    // If ticker not present in watchlist, add it
    const inWatchlist = tickers.some(
      (t) => t.symbol.toUpperCase() === pos.symbol.toUpperCase()
    );
    if (!inWatchlist) {
      const newTicker = createNewCustomTicker(
        pos.symbol,
        pos.symbol,
        pos.buyPrice,
        'MERCADO',
        pos.currency === 'EUR' ? '€' : pos.currency === 'GBP' ? '£' : '$'
      );
      setTickers((prev) => [newTicker, ...prev]);
      
      // Async live quote update
      fetchLiveQuotes([pos.symbol]).then((quotes) => {
        if (quotes && quotes[0]) {
          const q = quotes[0];
          setTickers((prev) =>
            prev.map((t) =>
              t.symbol.toUpperCase() === q.symbol.toUpperCase()
                ? {
                    ...t,
                    name: q.name,
                    exchange: q.exchange,
                    currentPrice: q.currentPrice,
                    change: q.change,
                    changePercent: q.changePercent,
                    previousClose: q.previousClose,
                    openPrice: q.openPrice !== undefined ? q.openPrice : t.openPrice,
                    dayHigh: q.dayHigh,
                    dayLow: q.dayLow,
                    volume: q.volume,
                    avgVolume: q.avgVolume || t.avgVolume,
                    marketCap: q.marketCap,
                    peRatio: q.peRatio,
                    dividendYield: q.dividendYield,
                    week52High: q.week52High,
                    week52Low: q.week52Low,
                  }
                : t
            )
          );
        }
      });
    }
  };

  const handleDeletePosition = (id: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  };

  const handleToggleDisplayMetric = () => {
    setSettings((prev) => {
      const nextMetric: DisplayMetric =
        prev.displayMetric === 'percent'
          ? 'value'
          : prev.displayMetric === 'value'
          ? 'marketCap'
          : 'percent';
      return { ...prev, displayMetric: nextMetric };
    });
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Export & Import
  const handleExportJson = () => {
    const exportData = {
      tickers,
      positions,
      baseCurrency: settings.portfolioBaseCurrency,
      exportedAt: new Date().toISOString(),
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bolsa-apple-datos-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const imported = JSON.parse(content);
        if (Array.isArray(imported)) {
          setTickers(imported);
          if (imported[0]?.symbol) setSelectedSymbol(imported[0].symbol);
        } else if (imported.tickers) {
          setTickers(imported.tickers);
          if (imported.positions) setPositions(imported.positions);
          if (imported.baseCurrency) {
            handleUpdateSettings({ portfolioBaseCurrency: imported.baseCurrency });
          }
        }
      } catch (err) {
        alert('Archivo JSON no válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div 
      id="apple-stocks-desktop-root"
      className="flex flex-col h-screen w-screen bg-[#000000] text-white overflow-hidden font-sans select-none"
    >
      {/* Desktop Window Titlebar (macOS / Windows style) */}
      <DesktopTitlebar
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenElectronModal={() => setIsElectronModalOpen(true)}
        tickerCount={tickers.length}
        marketOpen={true}
        activeView={activeView}
        onSelectView={setActiveView}
        portfolioPositionsCount={positions.length}
        onRefreshQuotes={() => handleRefreshLiveQuotes(true)}
        isRefreshingQuotes={isRefreshingQuotes}
      />

      {/* Main App Body: Split between Watchlist and Active View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Watchlist Sidebar (Always accessible like Apple Stocks) */}
        <WatchlistSidebar
          tickers={tickers}
          selectedSymbol={selectedSymbol}
          onSelectTicker={handleSelectTicker}
          onRemoveTicker={handleRemoveTicker}
          onReorderTickers={handleReorderTickers}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenEditTarget={(ticker) => setEditingTargetTicker(ticker)}
          displayMetric={settings.displayMetric}
          onToggleDisplayMetric={handleToggleDisplayMetric}
          onExportJson={handleExportJson}
          onImportJson={handleImportJson}
          sparklineTimeframe={sparklineTimeframe}
          onSelectSparklineTimeframe={setSparklineTimeframe}
          batchSparklines={batchSparklines}
        />

        {/* Right Main Content: Switches between Watchlist Detail & Portfolio Calculator */}
        <main 
          id="main-app-content"
          className="flex-1 overflow-y-auto bg-[#000000] p-4 sm:p-6 lg:p-8 space-y-6 scrollbar-thin"
        >
          {activeView === 'portfolio' ? (
            /* Portfolio Dashboard & Multi-Currency Calculator */
            <PortfolioView
              portfolio={portfolioSummary}
              tickers={tickers}
              baseCurrency={baseCurrency}
              onChangeBaseCurrency={(curr) =>
                handleUpdateSettings({ portfolioBaseCurrency: curr })
              }
              forexRates={forexRates}
              onOpenAddPosition={() => {
                setEditingPosition(null);
                setIsAddPositionModalOpen(true);
              }}
              onEditPosition={(pos) => {
                setEditingPosition(pos);
                setIsAddPositionModalOpen(true);
              }}
              onDeletePosition={handleDeletePosition}
              onOpenEditTarget={(ticker) => setEditingTargetTicker(ticker)}
              onRefreshData={() => handleRefreshLiveQuotes(true)}
              isLoadingQuotes={isRefreshingQuotes}
            />
          ) : selectedTicker ? (
            /* Single Stock Detail View */
            <>
              {/* Header: Company, Symbol, Exchange, Price, Live Flash */}
              <StockDetailHeader
                ticker={selectedTicker}
                onOpenEditTarget={(ticker) => setEditingTargetTicker(ticker)}
              />

              {/* Target Price Progress Card */}
              <TargetPriceProgressCard
                ticker={selectedTicker}
                onOpenEditTarget={(ticker) => setEditingTargetTicker(ticker)}
              />

              {/* Interactive Detail Chart */}
              <InteractiveChart
                ticker={selectedTicker}
                selectedTimeframe={selectedTimeframe}
                onSelectTimeframe={setSelectedTimeframe}
                chartType={settings.chartType}
                onToggleChartType={() =>
                  handleUpdateSettings({
                    chartType: settings.chartType === 'area' ? 'candles' : 'area',
                  })
                }
                onOpenEditTarget={(ticker) => setEditingTargetTicker(ticker)}
                onUpdateTargetPrice={(symbol, newPrice) => handleSaveTarget(symbol, newPrice, selectedTicker.targetNote)}
              />

              {/* Key Statistics Grid */}
              <StockKeyStatistics ticker={selectedTicker} />

              {/* Relevant Financial News Section */}
              <StockNewsFeed
                fallbackNews={MOCK_NEWS}
                selectedSymbol={selectedTicker.symbol}
                companyName={selectedTicker.name}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-neutral-400">
              <p className="text-base mb-3">No hay ningún ticker seleccionado.</p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-[#0A84FF] text-white rounded-lg font-semibold text-xs"
              >
                Añadir Ticker
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Target Price Reached Notification Toast */}
      {targetToast && (
        <div 
          id="target-achievement-toast"
          className="fixed bottom-6 right-6 z-50 bg-[#1c1c1e]/95 backdrop-blur-md border border-[#30D158]/40 shadow-2xl rounded-2xl p-4 max-w-sm flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="w-10 h-10 rounded-xl bg-[#30D158]/20 text-[#30D158] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1">
                <span>¡Precio Objetivo Alcanzado!</span>
                <Sparkles className="w-3.5 h-3.5 text-[#30D158]" />
              </h4>
              <button
                onClick={() => setTargetToast(null)}
                className="text-neutral-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-neutral-300 mt-1 leading-normal">
              <strong>{targetToast.symbol}</strong> ha alcanzado cotización de{' '}
              <span className="text-[#30D158] font-bold">
                ${targetToast.currentPrice.toFixed(2)}
              </span>
              , superando tu precio objetivo de ${targetToast.targetPrice.toFixed(2)}.
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddTickerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTicker={handleAddTicker}
        existingSymbols={tickers.map((t) => t.symbol)}
      />

      <AddPositionModal
        isOpen={isAddPositionModalOpen}
        onClose={() => {
          setIsAddPositionModalOpen(false);
          setEditingPosition(null);
        }}
        onSavePosition={handleSavePosition}
        onDeletePosition={handleDeletePosition}
        tickers={tickers}
        editingPosition={editingPosition}
        baseCurrency={baseCurrency}
        forexRates={forexRates}
      />

      <EditTargetModal
        isOpen={!!editingTargetTicker}
        ticker={editingTargetTicker}
        onClose={() => setEditingTargetTicker(null)}
        onSaveTarget={handleSaveTarget}
      />

      <ElectronInfoModal
        isOpen={isElectronModalOpen}
        onClose={() => setIsElectronModalOpen(false)}
      />
    </div>
  );
}
