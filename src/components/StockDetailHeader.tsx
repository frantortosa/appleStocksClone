import React from 'react';
import { Target, ExternalLink, Share2, Star, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import { StockTicker } from '../types';

interface StockDetailHeaderProps {
  ticker: StockTicker;
  onOpenEditTarget: (ticker: StockTicker) => void;
}

export const StockDetailHeader: React.FC<StockDetailHeaderProps> = ({
  ticker,
  onOpenEditTarget,
}) => {
  const isPositive = ticker.changePercent >= 0;
  const isTickingUp = ticker.lastTickDirection === 'up';
  const isTickingDown = ticker.lastTickDirection === 'down';

  return (
    <div id="stock-detail-header" className="flex flex-wrap items-start justify-between gap-4">
      {/* Left info: Company name, symbol, exchange */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {ticker.name}
          </h1>
          <span className="px-2 py-0.5 rounded-md bg-[#242426] text-neutral-300 text-xs font-mono font-semibold border border-white/5">
            {ticker.symbol}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3 text-neutral-500" />
            {ticker.exchange}
          </span>
          <span>•</span>
          <span>Moneda en {ticker.currency}</span>
          <span>•</span>
          <span className="text-neutral-500">Horario oficial de cotización</span>
        </div>
      </div>

      {/* Right: Quick actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onOpenEditTarget(ticker)}
          id="btn-header-target"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF9F0A]/15 hover:bg-[#FF9F0A]/25 text-[#FF9F0A] border border-[#FF9F0A]/30 text-xs font-semibold transition-all active:scale-95 shadow-sm"
        >
          <Target className="w-3.5 h-3.5" />
          <span>
            {ticker.targetPrice ? `Objetivo: ${ticker.currency}${ticker.targetPrice.toFixed(0)}` : 'Fijar Precio Objetivo'}
          </span>
        </button>
      </div>
    </div>
  );
};
