import React from 'react';
import { StockTicker } from '../types';

interface StockKeyStatisticsProps {
  ticker: StockTicker;
}

export const StockKeyStatistics: React.FC<StockKeyStatisticsProps> = ({ ticker }) => {
  // 52-week slider position
  const range52 = ticker.week52High - ticker.week52Low || 1;
  const current52Pos = Math.min(
    100,
    Math.max(0, ((ticker.currentPrice - ticker.week52Low) / range52) * 100)
  );

  // Day range slider position
  const dayRange = ticker.dayHigh - ticker.dayLow || 1;
  const currentDayPos = Math.min(
    100,
    Math.max(0, ((ticker.currentPrice - ticker.dayLow) / dayRange) * 100)
  );

  return (
    <div 
      id="stock-key-statistics"
      className="bg-[#161618] rounded-2xl border border-[#242426] p-4.5"
    >
      <h3 className="text-sm font-semibold text-white mb-3 tracking-tight">
        Estadísticas Clave
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3.5 gap-x-6 text-xs divide-y md:divide-y-0 divide-[#242426]">
        {/* Column 1 */}
        <div className="space-y-3 pt-2 md:pt-0">
          <div className="flex justify-between items-baseline">
            <span className="text-neutral-400">Apertura</span>
            <span className="font-semibold text-white tabular-nums">
              {ticker.currency}{ticker.openPrice.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-neutral-400">Cierre anterior</span>
            <span className="font-semibold text-white tabular-nums">
              {ticker.currency}{ticker.previousClose.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Column 2 */}
        <div className="space-y-3 pt-2 md:pt-0">
          <div className="flex justify-between items-baseline">
            <span className="text-neutral-400">Volumen</span>
            <span className="font-semibold text-white tabular-nums">
              {ticker.volume}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-neutral-400">Volumen medio (30d)</span>
            <span className="font-semibold text-white tabular-nums">
              {ticker.avgVolume}
            </span>
          </div>
        </div>

        {/* Column 3 */}
        <div className="space-y-3 pt-2 md:pt-0">
          <div className="flex justify-between items-baseline">
            <span className="text-neutral-400">Cap. bursátil</span>
            <span className="font-semibold text-white tabular-nums">
              {ticker.marketCap}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-neutral-400">Ratio PER</span>
            <span className="font-semibold text-white tabular-nums">
              {typeof ticker.peRatio === 'number' ? ticker.peRatio.toFixed(1) : ticker.peRatio}
            </span>
          </div>
        </div>

        {/* Column 4 */}
        <div className="space-y-3 pt-2 md:pt-0">
          <div className="flex justify-between items-baseline">
            <span className="text-neutral-400">Rent. dividendo</span>
            <span className="font-semibold text-white tabular-nums">
              {ticker.dividendYield}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-neutral-400">Precio Objetivo</span>
            <span className="font-semibold text-[#FF9F0A] tabular-nums">
              {ticker.targetPrice ? `${ticker.currency}${ticker.targetPrice.toFixed(2)}` : 'Sin fijar'}
            </span>
          </div>
        </div>
      </div>

      {/* Ranges: Day Range and 52-Week Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-3 border-t border-[#242426]">
        {/* Day Range slider */}
        <div>
          <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
            <span>Rango del día</span>
            <span className="text-white font-medium">
              {ticker.currency}{ticker.dayLow.toFixed(2)} - {ticker.currency}{ticker.dayHigh.toFixed(2)}
            </span>
          </div>
          <div className="relative h-1.5 bg-[#2c2c2e] rounded-full overflow-visible">
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md border border-neutral-700"
              style={{ left: `${currentDayPos}%` }}
              title={`Precio actual: ${ticker.currency}${ticker.currentPrice.toFixed(2)}`}
            />
          </div>
        </div>

        {/* 52-Week Range slider */}
        <div>
          <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
            <span>Rango 52 semanas</span>
            <span className="text-white font-medium">
              {ticker.currency}{ticker.week52Low.toFixed(2)} - {ticker.currency}{ticker.week52High.toFixed(2)}
            </span>
          </div>
          <div className="relative h-1.5 bg-[#2c2c2e] rounded-full overflow-visible">
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md border border-neutral-700"
              style={{ left: `${current52Pos}%` }}
              title={`Precio actual: ${ticker.currency}${ticker.currentPrice.toFixed(2)}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
