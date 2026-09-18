import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Check, 
  Sparkles, 
  Building, 
  Globe, 
  Target, 
  Loader2 
} from 'lucide-react';
import { SEARCH_DIRECTORY, createNewCustomTicker } from '../utils/stockData';
import { StockTicker } from '../types';
import { searchYahooTickers, fetchLiveQuotes } from '../utils/financeApi';

interface AddTickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTicker: (ticker: StockTicker) => void;
  existingSymbols: string[];
}

export const AddTickerModal: React.FC<AddTickerModalProps> = ({
  isOpen,
  onClose,
  onAddTicker,
  existingSymbols,
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'custom'>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [yahooResults, setYahooResults] = useState<any[]>([]);
  const [isSearchingYahoo, setIsSearchingYahoo] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);

  // Custom form state
  const [customSymbol, setCustomSymbol] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('150.00');
  const [customExchange, setCustomExchange] = useState('NASDAQ');
  const [customCurrency, setCustomCurrency] = useState('$');
  const [customTargetPrice, setCustomTargetPrice] = useState('');

  // Debounced search on Yahoo Finance API backend
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setYahooResults([]);
      setIsSearchingYahoo(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingYahoo(true);
      try {
        const results = await searchYahooTickers(searchQuery);
        setYahooResults(results);
      } catch (e) {
        // ignore
      } finally {
        setIsSearchingYahoo(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  const filteredDirectory = SEARCH_DIRECTORY.filter(
    (item) =>
      item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddFromDirectory = (item: typeof SEARCH_DIRECTORY[0]) => {
    const newTicker = createNewCustomTicker(
      item.symbol,
      item.name,
      item.price,
      item.exchange,
      item.currency,
      Number((item.price * 1.15).toFixed(2)) // default +15% target
    );
    onAddTicker(newTicker);
  };

  const handleAddFromYahoo = async (yahooItem: any) => {
    setAddingSymbol(yahooItem.symbol);
    try {
      // Fetch live quote from backend
      const liveQuotes = await fetchLiveQuotes([yahooItem.symbol]);
      const quote = liveQuotes?.[0];

      const price = quote?.currentPrice || 100;
      const curSymbol =
        quote?.currency === 'EUR' ? '€' : quote?.currency === 'GBP' ? '£' : '$';

      const newTicker = createNewCustomTicker(
        yahooItem.symbol,
        quote?.name || yahooItem.name || yahooItem.symbol,
        price,
        quote?.exchange || yahooItem.exchange || 'Mercado',
        curSymbol,
        Number((price * 1.15).toFixed(2))
      );

      if (quote) {
        newTicker.change = quote.change;
        newTicker.changePercent = quote.changePercent;
        newTicker.previousClose = quote.previousClose;
        newTicker.dayHigh = quote.dayHigh;
        newTicker.dayLow = quote.dayLow;
        newTicker.volume = quote.volume;
        newTicker.marketCap = quote.marketCap;
        newTicker.peRatio = quote.peRatio;
        newTicker.dividendYield = quote.dividendYield;
        newTicker.week52High = quote.week52High;
        newTicker.week52Low = quote.week52Low;
      }

      onAddTicker(newTicker);
    } catch (e) {
      const fallbackTicker = createNewCustomTicker(
        yahooItem.symbol,
        yahooItem.name || yahooItem.symbol,
        150,
        yahooItem.exchange || 'MERCADO',
        '$',
        172.5
      );
      onAddTicker(fallbackTicker);
    } finally {
      setAddingSymbol(null);
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSymbol.trim()) return;

    const price = parseFloat(customPrice) || 100;
    const target = customTargetPrice ? parseFloat(customTargetPrice) : undefined;

    const newTicker = createNewCustomTicker(
      customSymbol.toUpperCase(),
      customName || customSymbol.toUpperCase(),
      price,
      customExchange,
      customCurrency,
      target
    );

    onAddTicker(newTicker);
    onClose();
  };

  return (
    <div 
      id="add-ticker-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-[#1c1c1e] border border-[#38383a] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2c2c2e] bg-[#141416]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0A84FF]/20 text-[#0A84FF] flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Añadir Ticker a la Lista
              </h3>
              <p className="text-[11px] text-neutral-400">
                Búsqueda en directo con Yahoo Finance y catálogo global
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[#2c2c2e] bg-[#161618] px-4 pt-2">
          <button
            onClick={() => setActiveTab('directory')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'directory'
                ? 'border-[#0A84FF] text-[#0A84FF]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Buscar en Vivo / Directorio
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'custom'
                ? 'border-[#0A84FF] text-[#0A84FF]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Crear Ticker Manual
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'directory' ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar ticker real (AAPL, TSLA, SAN.MC, BTC-USD...)"
                  className="w-full bg-[#2c2c2e] text-white placeholder-neutral-500 text-xs rounded-lg pl-9 pr-9 py-2 border border-transparent focus:border-[#0A84FF] focus:outline-none"
                />
                {isSearchingYahoo && (
                  <Loader2 className="w-3.5 h-3.5 text-[#0A84FF] animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* Yahoo Finance Real-Time API Results */}
              {yahooResults.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1 py-1 font-semibold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-[#0A84FF]" />
                      <span>Resultados Yahoo Finance</span>
                    </span>
                    <span className="text-[10px] text-[#30D158] font-mono">En Vivo</span>
                  </div>
                  <div className="divide-y divide-[#28282a] bg-[#161618] rounded-xl p-1 border border-white/5">
                    {yahooResults.map((item) => {
                      const isAdded = existingSymbols.includes(item.symbol);
                      const isAdding = addingSymbol === item.symbol;
                      return (
                        <div
                          key={item.symbol}
                          className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs font-mono">
                                {item.symbol}
                              </span>
                              <span className="text-[10px] text-neutral-400 bg-white/5 px-1.5 py-0.2 rounded font-mono">
                                {item.exchange}
                              </span>
                              <span className="text-[9px] text-[#0A84FF] bg-[#0A84FF]/10 px-1.5 py-0.2 rounded font-semibold">
                                {item.type}
                              </span>
                            </div>
                            <span className="text-[11px] text-neutral-400 line-clamp-1">
                              {item.name}
                            </span>
                          </div>

                          <button
                            onClick={() => handleAddFromYahoo(item)}
                            disabled={isAdded || isAdding}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
                              isAdded
                                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                : 'bg-[#0A84FF] hover:bg-[#0071E3] text-white shadow'
                            }`}
                          >
                            {isAdding ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isAdded ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Añadido</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Añadir</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Local Directory */}
              <div className="space-y-1">
                <div className="text-[11px] text-neutral-400 px-1 py-1 font-semibold uppercase tracking-wider">
                  {yahooResults.length > 0 ? 'Catálogo Destacado' : 'Valores Populares'}
                </div>
                <div className="divide-y divide-[#28282a]">
                  {filteredDirectory.map((item) => {
                    const isAdded = existingSymbols.includes(item.symbol);
                    return (
                      <div
                        key={item.symbol}
                        className="flex items-center justify-between py-2.5 px-2 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs font-mono">
                              {item.symbol}
                            </span>
                            <span className="text-[10px] text-neutral-400 bg-white/5 px-1.5 py-0.2 rounded font-mono">
                              {item.exchange}
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-400">
                            {item.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-neutral-200 tabular-nums">
                            {item.currency}{item.price.toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleAddFromDirectory(item)}
                            disabled={isAdded}
                            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                              isAdded
                                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                : 'bg-[#0A84FF] hover:bg-[#0071E3] text-white shadow'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Añadido</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Añadir</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Custom form */
            <form onSubmit={handleAddCustom} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Símbolo del Ticker *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: ARM, PLTR, BABA, BBVA.MC"
                  value={customSymbol}
                  onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-[#2c2c2e] text-white placeholder-neutral-500 text-xs rounded-lg px-3 py-2 border border-transparent focus:border-[#0A84FF] focus:outline-none uppercase font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Nombre de la Empresa o Activo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Palantir Technologies Inc."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-[#2c2c2e] text-white placeholder-neutral-500 text-xs rounded-lg px-3 py-2 border border-transparent focus:border-[#0A84FF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Precio Inicial de Cotización *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full bg-[#2c2c2e] text-white text-xs rounded-lg px-3 py-2 border border-transparent focus:border-[#0A84FF] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Moneda
                  </label>
                  <select
                    value={customCurrency}
                    onChange={(e) => setCustomCurrency(e.target.value)}
                    className="w-full bg-[#2c2c2e] text-white text-xs rounded-lg px-3 py-2 border border-transparent focus:border-[#0A84FF] focus:outline-none"
                  >
                    <option value="$">$ (USD)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                    <option value="CHF">CHF (CHF)</option>
                    <option value="¥">¥ (JPY)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Bolsa / Mercado
                  </label>
                  <input
                    type="text"
                    placeholder="NASDAQ, NYSE, BME, Crypto..."
                    value={customExchange}
                    onChange={(e) => setCustomExchange(e.target.value)}
                    className="w-full bg-[#2c2c2e] text-white text-xs rounded-lg px-3 py-2 border border-transparent focus:border-[#0A84FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1 flex items-center gap-1 text-[#FF9F0A]">
                    <Target className="w-3 h-3" />
                    <span>Precio Objetivo Inicial</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Opcional (ej: 180.00)"
                    value={customTargetPrice}
                    onChange={(e) => setCustomTargetPrice(e.target.value)}
                    className="w-full bg-[#2c2c2e] text-white placeholder-neutral-500 text-xs rounded-lg px-3 py-2 border border-[#FF9F0A]/30 focus:border-[#FF9F0A] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-[#0A84FF] hover:bg-[#0071E3] text-white font-semibold transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear e Incorporar a la Bolsa</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
