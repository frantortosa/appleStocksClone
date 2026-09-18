import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  X, 
  SlidersHorizontal, 
  Trash2, 
  Target, 
  ChevronRight, 
  ChevronDown,
  ArrowUpDown, 
  Download, 
  Upload,
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
  Check,
  GripVertical,
  AlertTriangle
} from 'lucide-react';
import { StockTicker, DisplayMetric, Timeframe } from '../types';
import { Sparkline } from './Sparkline';

interface WatchlistSidebarProps {
  tickers: StockTicker[];
  selectedSymbol: string;
  onSelectTicker: (symbol: string) => void;
  onRemoveTicker: (symbol: string) => void;
  onReorderTickers?: (newTickers: StockTicker[]) => void;
  onOpenAddModal: () => void;
  onOpenEditTarget: (ticker: StockTicker) => void;
  displayMetric: DisplayMetric;
  onToggleDisplayMetric: () => void;
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sparklineTimeframe: Timeframe;
  onSelectSparklineTimeframe: (tf: Timeframe) => void;
  batchSparklines?: Record<string, number[]>;
}

const TIMEFRAME_OPTIONS: { id: Timeframe; label: string; description: string }[] = [
  { id: '1D', label: '1D', description: '1 Día (Hoy)' },
  { id: '1S', label: '1S', description: '1 Semana' },
  { id: '1M', label: '1M', description: '1 Mes' },
  { id: '3M', label: '3M', description: '3 Meses' },
  { id: '6M', label: '6M', description: '6 Meses' },
  { id: '1A', label: '1A', description: '1 Año' },
  { id: '2A', label: '2A', description: '2 Años' },
  { id: '5A', label: '5A', description: '5 Años' },
  { id: 'TODO', label: 'TODO', description: 'Máximo' },
];

export const WatchlistSidebar: React.FC<WatchlistSidebarProps> = ({
  tickers,
  selectedSymbol,
  onSelectTicker,
  onRemoveTicker,
  onReorderTickers,
  onOpenAddModal,
  onOpenEditTarget,
  displayMetric,
  onToggleDisplayMetric,
  onExportJson,
  onImportJson,
  sparklineTimeframe = '1D',
  onSelectSparklineTimeframe,
  batchSparklines = {},
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'target' | 'gainers' | 'losers'>('all');
  const [isTimeframeDropdownOpen, setIsTimeframeDropdownOpen] = useState(false);

  // Drag & Drop reorder state
  const [draggedSymbol, setDraggedSymbol] = useState<string | null>(null);
  const [dragOverSymbol, setDragOverSymbol] = useState<string | null>(null);

  // Delete confirmation modal state
  const [symbolToDelete, setSymbolToDelete] = useState<StockTicker | null>(null);

  const filteredTickers = tickers.filter((t) => {
    const matchesSearch =
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterTab === 'target') return !!t.targetPrice;
    if (filterTab === 'gainers') return t.changePercent > 0;
    if (filterTab === 'losers') return t.changePercent < 0;
    return true;
  });

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, symbol: string) => {
    setDraggedSymbol(symbol);
    e.dataTransfer.setData('text/plain', symbol);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, symbol: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (symbol !== dragOverSymbol) {
      setDragOverSymbol(symbol);
    }
  };

  const handleDragLeave = () => {
    // Optional cleanup
  };

  const handleDrop = (e: React.DragEvent, targetSymbol: string) => {
    e.preventDefault();
    if (!draggedSymbol || draggedSymbol === targetSymbol || !onReorderTickers) {
      setDraggedSymbol(null);
      setDragOverSymbol(null);
      return;
    }

    const draggedIndex = tickers.findIndex((t) => t.symbol === draggedSymbol);
    const targetIndex = tickers.findIndex((t) => t.symbol === targetSymbol);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedSymbol(null);
      setDragOverSymbol(null);
      return;
    }

    const updated = [...tickers];
    const [removed] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, removed);

    onReorderTickers(updated);
    setDraggedSymbol(null);
    setDragOverSymbol(null);
  };

  const handleDragEnd = () => {
    setDraggedSymbol(null);
    setDragOverSymbol(null);
  };

  const getMetricDisplay = (ticker: StockTicker) => {
    if (displayMetric === 'percent') {
      const sign = ticker.changePercent >= 0 ? '+' : '';
      return `${sign}${ticker.changePercent.toFixed(2)}%`;
    }
    if (displayMetric === 'value') {
      const sign = ticker.change >= 0 ? '+' : '';
      return `${sign}${ticker.currency}${Math.abs(ticker.change).toFixed(2)}`;
    }
    // marketCap
    return ticker.marketCap;
  };

  const getMetricLabel = () => {
    if (displayMetric === 'percent') return '%';
    if (displayMetric === 'value') return '$ / €';
    return 'Cap.';
  };

  /**
   * Resolve the historical sparkline points for this ticker and chosen timeframe
   */
  const getSparklineData = (ticker: StockTicker): number[] => {
    // 1. If batch sparklines are loaded for this timeframe, prioritize them
    if (batchSparklines && batchSparklines[ticker.symbol] && batchSparklines[ticker.symbol].length >= 2) {
      return batchSparklines[ticker.symbol];
    }

    // 2. For 1D: use real intraday sparkline returned in live quote
    if (sparklineTimeframe === '1D') {
      if (ticker.sparkline && ticker.sparkline.length >= 2) {
        return ticker.sparkline;
      }
      if (ticker.history?.['1D'] && ticker.history['1D'].length >= 2) {
        return ticker.history['1D'].map((p) => p.price);
      }
    }

    // 3. For other timeframes: use ticker.history for that timeframe
    if (ticker.history?.[sparklineTimeframe] && ticker.history[sparklineTimeframe].length >= 2) {
      return ticker.history[sparklineTimeframe].map((p) => p.price);
    }

    // Fallback to ticker.sparkline
    return ticker.sparkline || [];
  };

  return (
    <aside 
      id="watchlist-sidebar"
      className="w-80 md:w-88 xl:w-96 flex flex-col bg-[#000000] border-r border-[#202022] select-none h-full shrink-0 overflow-hidden"
    >
      {/* Header section with search & controls */}
      <div className="p-3 border-b border-[#1c1c1e] bg-[#0c0c0e]">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
            <span>Lista de Seguimiento</span>
            <span className="text-neutral-500 font-normal text-xs">({tickers.length})</span>
          </h2>

          <div className="flex items-center gap-1">
            {/* Dropdown selector for Sparkline Timeframe (1D, 1S, 1M, etc.) */}
            <div className="relative">
              <button
                onClick={() => setIsTimeframeDropdownOpen(!isTimeframeDropdownOpen)}
                id="btn-sparkline-timeframe-dropdown"
                title={`Periodo de la mini-gráfica en lista: ${sparklineTimeframe}. Clic para cambiar.`}
                className="px-2 py-1 text-[11px] font-medium bg-[#1c1c1e] hover:bg-[#28282e] text-neutral-200 hover:text-white rounded border border-white/10 transition-colors flex items-center gap-1"
              >
                <Clock className="w-3 h-3 text-[#0A84FF]" />
                <span className="font-semibold text-white tracking-tight">{sparklineTimeframe}</span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>

              {isTimeframeDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsTimeframeDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#1c1c1e] border border-white/15 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2.5 py-1 text-[10px] uppercase font-semibold text-neutral-400 border-b border-white/5 mb-1">
                      Periodo mini-gráfica
                    </div>
                    {TIMEFRAME_OPTIONS.map((tf) => {
                      const isSelected = sparklineTimeframe === tf.id;
                      return (
                        <button
                          key={tf.id}
                          onClick={() => {
                            onSelectSparklineTimeframe(tf.id);
                            setIsTimeframeDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                            isSelected
                              ? 'bg-[#0A84FF] text-white font-medium'
                              : 'text-neutral-300 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{tf.label}</span>
                            <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-neutral-400'}`}>
                              {tf.description}
                            </span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Toggle metric display (% vs $) */}
            <button
              onClick={onToggleDisplayMetric}
              title={`Modo de visualización: ${displayMetric === 'percent' ? 'Porcentaje' : displayMetric === 'value' ? 'Valor monetario' : 'Cap. Bursátil'}. Clic para alternar.`}
              className="px-2 py-1 text-[11px] font-medium bg-[#1e1e22] hover:bg-[#28282e] text-neutral-300 rounded border border-white/10 transition-colors flex items-center gap-1"
            >
              <ArrowUpDown className="w-3 h-3 text-neutral-400" />
              <span>{getMetricLabel()}</span>
            </button>

            {/* Add ticker button */}
            <button
              onClick={onOpenAddModal}
              id="btn-add-ticker-sidebar"
              title="Añadir nuevo ticker a la lista"
              className="p-1.5 rounded bg-[#0A84FF] hover:bg-[#0071E3] text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search Input in Apple style */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por símbolo o empresa..."
            className="w-full bg-[#1c1c1e] text-white placeholder-neutral-500 text-xs rounded-lg pl-8 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A84FF] border border-transparent focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1 mt-2.5 overflow-x-auto no-scrollbar text-[11px]">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-2 py-0.5 rounded-full transition-colors whitespace-nowrap ${
              filterTab === 'all'
                ? 'bg-white text-black font-medium'
                : 'bg-[#1c1c1e] text-neutral-400 hover:text-white'
            }`}
          >
            Todos ({tickers.length})
          </button>
          <button
            onClick={() => setFilterTab('target')}
            className={`px-2 py-0.5 rounded-full transition-colors whitespace-nowrap flex items-center gap-1 ${
              filterTab === 'target'
                ? 'bg-[#FF9F0A] text-black font-medium'
                : 'bg-[#1c1c1e] text-neutral-400 hover:text-white'
            }`}
          >
            <Target className="w-2.5 h-2.5" />
            <span>Con Objetivo</span>
          </button>
          <button
            onClick={() => setFilterTab('gainers')}
            className={`px-2 py-0.5 rounded-full transition-colors whitespace-nowrap flex items-center gap-1 ${
              filterTab === 'gainers'
                ? 'bg-[#30D158] text-black font-medium'
                : 'bg-[#1c1c1e] text-neutral-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-2.5 h-2.5" />
            <span>Al alza</span>
          </button>
          <button
            onClick={() => setFilterTab('losers')}
            className={`px-2 py-0.5 rounded-full transition-colors whitespace-nowrap flex items-center gap-1 ${
              filterTab === 'losers'
                ? 'bg-[#FF453A] text-white font-medium'
                : 'bg-[#1c1c1e] text-neutral-400 hover:text-white'
            }`}
          >
            <TrendingDown className="w-2.5 h-2.5" />
            <span>A la baja</span>
          </button>
        </div>
      </div>

      {/* List of Tickers */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#151517] scrollbar-thin">
        {filteredTickers.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 text-xs">
            <p className="mb-2">No se encontraron tickers.</p>
            <button
              onClick={onOpenAddModal}
              className="text-[#0A84FF] hover:underline font-medium"
            >
              + Añadir nuevo ticker
            </button>
          </div>
        ) : (
          filteredTickers.map((ticker) => {
            const isSelected = ticker.symbol === selectedSymbol;
            const isPositive = ticker.changePercent >= 0;
            const hasTarget = !!ticker.targetPrice;
            const targetDistance = hasTarget
              ? ((ticker.targetPrice! - ticker.currentPrice) / ticker.currentPrice) * 100
              : 0;
            const targetReached = hasTarget && ticker.currentPrice >= ticker.targetPrice!;

            // Flash effect on live price tick
            const isTickingUp = ticker.lastTickDirection === 'up';
            const isTickingDown = ticker.lastTickDirection === 'down';

            const isBeingDragged = draggedSymbol === ticker.symbol;
            const isDragTarget = dragOverSymbol === ticker.symbol && draggedSymbol !== ticker.symbol;

            return (
              <div
                key={ticker.symbol}
                id={`ticker-item-${ticker.symbol}`}
                draggable={!searchQuery} // Drag enabled when not actively searching
                onDragStart={(e) => handleDragStart(e, ticker.symbol)}
                onDragOver={(e) => handleDragOver(e, ticker.symbol)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, ticker.symbol)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectTicker(ticker.symbol)}
                className={`group relative flex items-center justify-between px-2.5 py-2 cursor-pointer transition-colors border-y border-transparent ${
                  isSelected
                    ? 'bg-[#1c1c1e]'
                    : 'hover:bg-[#121214]'
                } ${
                  isBeingDragged ? 'opacity-40 scale-[0.98]' : 'opacity-100'
                } ${
                  isDragTarget ? 'border-t-2 !border-t-[#0A84FF] bg-[#0A84FF]/10' : ''
                }`}
              >
                {/* Active indicator bar */}
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0A84FF]" />
                )}

                {/* Drag handle icon (subtle, gives visual feedback for click & drag) */}
                <div 
                  className="mr-1 text-neutral-600 group-hover:text-neutral-400 cursor-grab active:cursor-grabbing transition-colors shrink-0"
                  title="Arrastrar para reordenar"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                {/* Left: Symbol, Name & Target badge (Fixed width so center sparkline never shifts) */}
                <div className="w-[100px] sm:w-[112px] shrink-0 flex flex-col justify-center min-w-0 pr-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="font-bold text-white text-[13px] tracking-tight leading-none shrink-0">
                      {ticker.symbol}
                    </span>
                    {hasTarget && (
                      <span 
                        className={`text-[9px] px-1 py-0.5 rounded font-mono font-medium flex items-center gap-0.5 shrink-0 max-w-[54px] truncate ${
                          targetReached
                            ? 'bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30'
                            : 'bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/30'
                        }`}
                        title={`Precio Objetivo: ${ticker.currency}${ticker.targetPrice?.toFixed(2)} (${targetDistance > 0 ? '+' : ''}${targetDistance.toFixed(1)}%)`}
                      >
                        <Target className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{targetReached ? '¡Listo!' : `${ticker.currency}${ticker.targetPrice?.toFixed(0)}`}</span>
                      </span>
                    )}
                  </div>
                  <span 
                    className="text-[11px] text-neutral-400 truncate w-full mt-1" 
                    title={ticker.name}
                  >
                    {ticker.name}
                  </span>
                </div>

                {/* Center: Sparkline graph with fixed width container to guarantee perfect vertical alignment across all rows */}
                {(() => {
                  const sparkData = getSparklineData(ticker);
                  const isSparkPositive =
                    sparkData.length >= 2
                      ? sparkData[sparkData.length - 1] >= sparkData[0]
                      : ticker.changePercent >= 0;
                  return (
                    <div 
                      className="hidden sm:flex w-[60px] shrink-0 items-center justify-center"
                      title={`${ticker.symbol} gráfica (${sparklineTimeframe}): ${sparkData[0] ?? ''} → ${sparkData[sparkData.length - 1] ?? ''} ${ticker.currency}`}
                    >
                      <Sparkline 
                        data={sparkData} 
                        isPositive={isSparkPositive} 
                        width={54} 
                        height={22} 
                      />
                    </div>
                  );
                })()}

                {/* Right: Price, Pill badge and ALWAYS VISIBLE Vertical Actions */}
                <div className="flex-1 flex items-center justify-end gap-1.5 shrink-0 pl-1">
                  <div className="flex flex-col items-end">
                    <span
                      className={`text-[13px] font-semibold tabular-nums leading-none transition-colors duration-300 ${
                        isTickingUp
                          ? 'text-[#30D158]'
                          : isTickingDown
                          ? 'text-[#FF453A]'
                          : 'text-white'
                      }`}
                    >
                      {ticker.currency}{ticker.currentPrice.toFixed(2)}
                    </span>

                    {/* Apple Stocks signature rounded pill badge */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDisplayMetric();
                      }}
                      className={`mt-1 min-w-[58px] text-center px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums leading-tight transition-transform active:scale-95 ${
                        isPositive
                          ? 'bg-[#30D158] text-black'
                          : 'bg-[#FF453A] text-white'
                      }`}
                    >
                      {getMetricDisplay(ticker)}
                    </button>
                  </div>

                  {/* Always visible vertical action buttons: Target on top, Delete on bottom */}
                  <div className="flex flex-col items-center justify-center gap-1 ml-1 shrink-0 py-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditTarget(ticker);
                      }}
                      id={`btn-target-${ticker.symbol}`}
                      title="Configurar Precio Objetivo"
                      className={`p-1 rounded transition-colors ${
                        hasTarget 
                          ? 'text-[#FF9F0A] hover:bg-[#FF9F0A]/20' 
                          : 'text-neutral-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Target className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSymbolToDelete(ticker);
                      }}
                      id={`btn-delete-${ticker.symbol}`}
                      disabled={tickers.length <= 1}
                      title={tickers.length <= 1 ? "No se puede eliminar el único elemento" : `Eliminar ${ticker.symbol}`}
                      className={`p-1 rounded transition-colors ${
                        tickers.length <= 1 
                          ? 'text-neutral-700 cursor-not-allowed' 
                          : 'text-neutral-500 hover:text-[#FF453A] hover:bg-[#FF453A]/15'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer bar with backup import/export */}
      <div className="p-2 border-t border-[#1c1c1e] bg-[#0c0c0e] flex items-center justify-between text-[11px] text-neutral-400">
        <div className="flex items-center gap-2">
          <button
            onClick={onExportJson}
            title="Exportar configuración de tickers a JSON"
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>Exportar</span>
          </button>
          <label 
            title="Importar lista de tickers desde archivo JSON"
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
          >
            <Upload className="w-3 h-3" />
            <span>Importar</span>
            <input 
              type="file" 
              accept=".json" 
              onChange={onImportJson} 
              className="hidden" 
            />
          </label>
        </div>

        <span className="text-[10px] text-neutral-500">
          Apple Stocks UI
        </span>
      </div>

      {/* Delete Confirmation Modal */}
      {symbolToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSymbolToDelete(null)}
        >
          <div 
            className="w-full max-w-sm bg-[#1c1c1e] border border-white/15 rounded-2xl p-5 shadow-2xl space-y-4 text-left animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            id="modal-confirm-delete-ticker"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FF453A]/15 border border-[#FF453A]/30 flex items-center justify-center shrink-0 text-[#FF453A]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  ¿Eliminar {symbolToDelete.symbol}?
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  ¿Estás seguro de que deseas eliminar <span className="text-white font-medium">{symbolToDelete.name}</span> ({symbolToDelete.symbol}) de tu lista de seguimiento?
                </p>
                {symbolToDelete.targetPrice && (
                  <p className="text-[11px] text-[#FF9F0A] bg-[#FF9F0A]/10 border border-[#FF9F0A]/20 rounded-lg px-2 py-1 mt-1.5">
                    Aviso: También se borrará el precio objetivo fijado en {symbolToDelete.currency}{symbolToDelete.targetPrice}.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                id="btn-cancel-delete"
                onClick={() => setSymbolToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-delete"
                onClick={() => {
                  onRemoveTicker(symbolToDelete.symbol);
                  setSymbolToDelete(null);
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#FF453A] hover:bg-[#ff5b52] text-white transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar ticker</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
