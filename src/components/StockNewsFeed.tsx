import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StockNews } from '../types';
import { Newspaper, ExternalLink, RefreshCw, Globe, Radio, Sparkles } from 'lucide-react';

interface StockNewsFeedProps {
  news?: StockNews[];
  fallbackNews?: StockNews[];
  selectedSymbol: string;
  companyName?: string;
}

export const StockNewsFeed: React.FC<StockNewsFeedProps> = ({
  news: legacyNews,
  fallbackNews,
  selectedSymbol,
  companyName,
}) => {
  const initialFallback = fallbackNews || legacyNews || [];
  const [newsItems, setNewsItems] = useState<StockNews[]>(initialFallback);
  const [activeTab, setActiveTab] = useState<'symbol' | 'market'>('symbol');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Prevent race conditions between quick ticker switches
  const currentRequestRef = useRef<number>(0);

  const fetchLiveNews = useCallback(
    async (isManualRefresh = false) => {
      const requestId = ++currentRequestRef.current;
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const params = new URLSearchParams({
          symbol: selectedSymbol,
          category: activeTab,
          limit: '8',
        });
        if (companyName) {
          params.append('name', companyName);
        }

        const res = await fetch(`/api/news?${params.toString()}`);
        if (!res.ok) throw new Error('News fetch failed');

        const data = await res.json();
        if (requestId === currentRequestRef.current && Array.isArray(data.news) && data.news.length > 0) {
          setNewsItems(data.news);
          setLastUpdated(new Date());
        }
      } catch (_err) {
        // Keep existing news or fallback on error
      } finally {
        if (requestId === currentRequestRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [selectedSymbol, companyName, activeTab]
  );

  // Fetch whenever symbol or active tab changes
  useEffect(() => {
    fetchLiveNews(false);
  }, [fetchLiveNews]);

  // Periodic auto-refresh every 5 minutes (300,000 ms)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLiveNews(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchLiveNews]);

  const handleImageError = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <section id="stock-news-section" className="bg-[#161618] rounded-2xl border border-[#242426] p-4.5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#0A84FF]/10 flex items-center justify-center text-[#0A84FF]">
            <Newspaper className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Noticias y Análisis Relevantes
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                En directo
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Feed financiero verificado • Yahoo Finance & Reuters
            </p>
          </div>
        </div>

        {/* Right side: Tabs & Refresh button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Segmented control */}
          <div className="bg-[#1c1c1e] p-0.5 rounded-xl border border-white/5 flex items-center text-xs">
            <button
              onClick={() => setActiveTab('symbol')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'symbol'
                  ? 'bg-[#2c2c2e] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {selectedSymbol}
            </button>
            <button
              onClick={() => setActiveTab('market')}
              className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'market'
                  ? 'bg-[#2c2c2e] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>Mercado</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchLiveNews(true)}
            disabled={isLoading || isRefreshing}
            title={formattedTime ? `Última actualización a las ${formattedTime}` : 'Actualizar noticias'}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1 text-[11px]"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? 'animate-spin text-[#0A84FF]' : ''}`}
            />
            {formattedTime && (
              <span className="hidden lg:inline text-[10px] text-neutral-500 font-mono">
                {formattedTime}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content Grid */}
      {isLoading && newsItems.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="p-3 rounded-xl bg-[#1c1c1e] border border-white/5 animate-pulse flex gap-3 h-28"
            >
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-28 bg-white/10 rounded" />
                  <div className="h-4 w-full bg-white/10 rounded" />
                  <div className="h-4 w-3/4 bg-white/10 rounded" />
                </div>
                <div className="h-3 w-20 bg-white/5 rounded" />
              </div>
              <div className="w-20 h-20 bg-white/5 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {newsItems.map((item) => {
            const hasValidImage = item.imageUrl && !failedImages[item.id];

            return (
              <a
                key={item.id}
                href={item.url || `https://finance.yahoo.com/quote/${selectedSymbol}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-3.5 rounded-xl bg-[#1c1c1e] hover:bg-[#242426] border border-white/5 transition-all hover:border-white/10 cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Metadata line: Source, Time, Category */}
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-1.5 flex-wrap">
                      <span className="text-[#0A84FF] font-medium truncate max-w-[120px]">
                        {item.source}
                      </span>
                      <span>•</span>
                      <span className="text-neutral-500">{item.timeAgo}</span>
                      <span className="ml-auto px-1.5 py-0.5 rounded text-[9.5px] bg-white/5 text-neutral-300 font-medium tracking-wide">
                        {item.category}
                      </span>
                    </div>

                    {/* News headline */}
                    <h4 className="text-xs sm:text-[13px] font-medium text-neutral-100 group-hover:text-[#0A84FF] transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </h4>
                  </div>

                  {/* Thumbnail if available */}
                  {hasValidImage && (
                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-lg overflow-hidden shrink-0 bg-[#2c2c2e] border border-white/5">
                      <img
                        src={item.imageUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={() => handleImageError(item.id)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>

                {/* Footer read CTA */}
                <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-2.5 pt-2 border-t border-white/5">
                  <span className="text-[10px] text-neutral-500 truncate">
                    {activeTab === 'symbol' ? `Relevante para ${selectedSymbol}` : 'Mercado Financiero'}
                  </span>
                  <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-[#0A84FF] font-medium text-xs">
                    <span>Leer artículo</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
};

