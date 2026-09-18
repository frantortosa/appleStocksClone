import React from 'react';
import { Target, TrendingUp, TrendingDown, CheckCircle, AlertCircle, Edit3, Flag } from 'lucide-react';
import { StockTicker } from '../types';

interface TargetPriceProgressCardProps {
  ticker: StockTicker;
  onOpenEditTarget: (ticker: StockTicker) => void;
}

export const TargetPriceProgressCard: React.FC<TargetPriceProgressCardProps> = ({
  ticker,
  onOpenEditTarget,
}) => {
  const hasTarget = typeof ticker.targetPrice === 'number' && ticker.targetPrice > 0;

  if (!hasTarget) {
    return (
      <div 
        id="target-price-empty-card"
        className="bg-[#1c1c1e] rounded-xl p-3.5 border border-white/5 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#FF9F0A]/10 border border-[#FF9F0A]/20 flex items-center justify-center text-[#FF9F0A]">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">
              Sin Precio Objetivo Configurado
            </h4>
            <p className="text-[11px] text-neutral-400">
              Establece un precio objetivo para monitorizar el progreso y recibir alertas visuales en el gráfico.
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenEditTarget(ticker)}
          id="btn-set-target"
          className="px-3 py-1.5 rounded-lg bg-[#FF9F0A] hover:bg-[#FF8C00] text-black text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Target className="w-3.5 h-3.5" />
          <span>Fijar Objetivo</span>
        </button>
      </div>
    );
  }

  const target = ticker.targetPrice!;
  const current = ticker.currentPrice;
  const prevClose = ticker.previousClose;
  const isAboveTarget = current >= target;

  // Calculate percentage gap
  const diffValue = target - current;
  const diffPercent = ((diffValue) / current) * 100;
  
  // Progress computation:
  // Base could be 52-week low, open price or a normalized scale around current & target
  const minBound = Math.min(ticker.week52Low, current * 0.85, prevClose * 0.9);
  const maxBound = Math.max(target * 1.08, current * 1.08);
  const totalRange = maxBound - minBound;
  
  const currentPosPercent = Math.min(100, Math.max(0, ((current - minBound) / totalRange) * 100));
  const targetPosPercent = Math.min(100, Math.max(0, ((target - minBound) / totalRange) * 100));

  // % of goal reached (if target > minBound)
  const progressRatio = current >= target 
    ? 100 + ((current - target) / target) * 100 
    : Math.max(0, Math.min(99.9, (current / target) * 100));

  return (
    <div 
      id="target-price-progress-card"
      className="bg-[#1c1c1e] rounded-xl p-4 border border-[#2c2c2e] relative overflow-hidden"
    >
      {/* Background glow when reached */}
      {isAboveTarget && (
        <div className="absolute inset-0 bg-[#30D158]/5 pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isAboveTarget 
              ? 'bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30' 
              : 'bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/30'
          }`}>
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-white tracking-tight">
                Progreso de Precio Objetivo
              </h4>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                isAboveTarget 
                  ? 'bg-[#30D158]/20 text-[#30D158]' 
                  : 'bg-[#FF9F0A]/20 text-[#FF9F0A]'
              }`}>
                {isAboveTarget ? '¡Objetivo Alcanzado!' : 'En Seguimiento'}
              </span>
            </div>
            {ticker.targetNote && (
              <p className="text-[11px] text-neutral-400 truncate max-w-sm mt-0.5">
                {ticker.targetNote}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => onOpenEditTarget(ticker)}
          id="btn-edit-target"
          className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white bg-[#2c2c2e] hover:bg-[#38383a] px-2.5 py-1 rounded-md transition-colors"
        >
          <Edit3 className="w-3 h-3" />
          <span>Modificar</span>
        </button>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 bg-[#161618] p-3 rounded-lg border border-white/5">
        <div>
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
            Precio Actual
          </span>
          <span className="text-sm sm:text-base font-bold text-white tabular-nums">
            {ticker.currency}{current.toFixed(2)}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
            Precio Objetivo
          </span>
          <span className="text-sm sm:text-base font-bold text-[#FF9F0A] tabular-nums">
            {ticker.currency}{target.toFixed(2)}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
            {isAboveTarget ? 'Superado En' : 'Distancia Restante'}
          </span>
          <span className={`text-sm sm:text-base font-bold tabular-nums flex items-center gap-1 ${
            isAboveTarget ? 'text-[#30D158]' : 'text-neutral-200'
          }`}>
            {isAboveTarget ? '+' : ''}
            {ticker.currency}{Math.abs(diffValue).toFixed(2)}
            <span className="text-xs font-medium text-neutral-400">
              ({isAboveTarget ? '+' : ''}{Math.abs(diffPercent).toFixed(1)}%)
            </span>
          </span>
        </div>

        <div>
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
            Cumplimiento
          </span>
          <span className={`text-sm sm:text-base font-bold tabular-nums ${
            isAboveTarget ? 'text-[#30D158]' : 'text-white'
          }`}>
            {progressRatio.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Visual Interactive Progress Bar */}
      <div className="mt-2">
        <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1.5 font-mono">
          <span>{ticker.currency}{minBound.toFixed(0)}</span>
          <span className="text-neutral-300">
            {isAboveTarget ? 'Objetivo completado' : `Faltan ${ticker.currency}${diffValue.toFixed(2)}`}
          </span>
          <span>{ticker.currency}{maxBound.toFixed(0)}</span>
        </div>

        <div className="relative h-3.5 bg-[#2c2c2e] rounded-full overflow-hidden p-0.5">
          {/* Filled progress towards target */}
          <div 
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isAboveTarget 
                ? 'bg-gradient-to-r from-[#30D158] to-[#2bd454]' 
                : 'bg-gradient-to-r from-[#0A84FF] via-[#FF9F0A] to-[#FF9F0A]'
            }`}
            style={{ width: `${Math.min(100, currentPosPercent)}%` }}
          />

          {/* Target Flag marker line */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white shadow-sm z-10"
            style={{ left: `${targetPosPercent}%` }}
            title={`Objetivo: ${ticker.currency}${target}`}
          />
        </div>

        <div className="relative h-5 mt-1 text-[10px]">
          {/* Target Flag Label */}
          <div 
            className="absolute -top-1 -translate-x-1/2 flex flex-col items-center pointer-events-none"
            style={{ left: `${targetPosPercent}%` }}
          >
            <span className="text-[#FF9F0A] font-bold flex items-center gap-0.5 bg-[#1c1c1e] px-1 rounded border border-[#FF9F0A]/40">
              <Flag className="w-2.5 h-2.5" />
              <span>{ticker.currency}{target.toFixed(0)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
