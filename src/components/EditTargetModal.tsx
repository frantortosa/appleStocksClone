import React, { useState, useEffect } from 'react';
import { Target, X, Check, Trash2, ArrowUpRight, TrendingUp, AlertCircle } from 'lucide-react';
import { StockTicker } from '../types';

interface EditTargetModalProps {
  isOpen: boolean;
  ticker: StockTicker | null;
  onClose: () => void;
  onSaveTarget: (symbol: string, targetPrice?: number, targetNote?: string) => void;
}

export const EditTargetModal: React.FC<EditTargetModalProps> = ({
  isOpen,
  ticker,
  onClose,
  onSaveTarget,
}) => {
  const [targetValue, setTargetValue] = useState('');
  const [targetNote, setTargetNote] = useState('');

  useEffect(() => {
    if (ticker) {
      setTargetValue(ticker.targetPrice ? ticker.targetPrice.toString() : (ticker.currentPrice * 1.15).toFixed(2));
      setTargetNote(ticker.targetNote || '');
    }
  }, [ticker]);

  if (!isOpen || !ticker) return null;

  const numericTarget = parseFloat(targetValue) || 0;
  const current = ticker.currentPrice;
  const diff = numericTarget - current;
  const diffPercent = current > 0 ? (diff / current) * 100 : 0;
  const isAbove = numericTarget >= current;

  const handleApplyPreset = (percent: number) => {
    const newPrice = current * (1 + percent / 100);
    setTargetValue(newPrice.toFixed(2));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericTarget > 0) {
      onSaveTarget(ticker.symbol, numericTarget, targetNote.trim() || undefined);
    } else {
      onSaveTarget(ticker.symbol, undefined, undefined);
    }
    onClose();
  };

  const handleRemove = () => {
    onSaveTarget(ticker.symbol, undefined, undefined);
    onClose();
  };

  return (
    <div 
      id="edit-target-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="bg-[#1c1c1e] border border-[#38383a] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2c2c2e] bg-[#141416]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FF9F0A]/20 text-[#FF9F0A] flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Precio Objetivo: {ticker.symbol}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {ticker.name} • Precio actual: {ticker.currency}{current.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 space-y-4 text-xs">
          {/* Main Target Input */}
          <div>
            <label className="block text-neutral-300 font-medium mb-1.5 flex items-center justify-between">
              <span>Precio Objetivo Deseado ({ticker.currency})</span>
              <span className="text-neutral-400 text-[11px]">
                Actual: {ticker.currency}{current.toFixed(2)}
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-base">
                {ticker.currency}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="w-full bg-[#2c2c2e] text-white text-lg font-bold rounded-xl pl-9 pr-4 py-2.5 border border-[#38383a] focus:border-[#FF9F0A] focus:outline-none tabular-nums"
              />
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <span className="block text-[11px] text-neutral-400 mb-1.5">
              Accesos rápidos basados en precio actual:
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[5, 10, 15, 25].map((pct) => (
                <button
                  type="button"
                  key={pct}
                  onClick={() => handleApplyPreset(pct)}
                  className="py-1 px-2 rounded-lg bg-[#2c2c2e] hover:bg-[#38383a] text-neutral-200 text-xs font-semibold transition-colors border border-white/5"
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Distance calculation preview */}
          {numericTarget > 0 && (
            <div className={`p-3 rounded-xl border ${
              isAbove ? 'bg-[#FF9F0A]/10 border-[#FF9F0A]/20' : 'bg-neutral-800/40 border-white/5'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 text-[11px]">Distancia al objetivo</span>
                <span className={`font-bold tabular-nums text-sm ${
                  isAbove ? 'text-[#FF9F0A]' : 'text-neutral-300'
                }`}>
                  {isAbove ? '+' : ''}{ticker.currency}{diff.toFixed(2)} ({isAbove ? '+' : ''}{diffPercent.toFixed(1)}%)
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                {isAbove
                  ? `Se requiere una subida del ${diffPercent.toFixed(1)}% para alcanzar la meta.`
                  : `El precio objetivo está un ${Math.abs(diffPercent).toFixed(1)}% por debajo del precio actual.`}
              </p>
            </div>
          )}

          {/* Notes field */}
          <div>
            <label className="block text-neutral-300 font-medium mb-1">
              Nota o Tesis de Inversión (Opcional)
            </label>
            <textarea
              rows={2}
              value={targetNote}
              onChange={(e) => setTargetNote(e.target.value)}
              placeholder="Ej: Resistencia técnica en máximos anuales o resultados trimestrales."
              className="w-full bg-[#2c2c2e] text-white placeholder-neutral-500 text-xs rounded-lg p-2.5 border border-transparent focus:border-[#FF9F0A] focus:outline-none resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#2c2c2e]">
            {ticker.targetPrice && (
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-xs transition-colors flex items-center gap-1"
                title="Eliminar precio objetivo"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-[#2c2c2e] hover:bg-[#38383a] text-neutral-300 font-semibold text-xs transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="flex-1 py-2 rounded-lg bg-[#FF9F0A] hover:bg-[#FF8C00] text-black font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar Objetivo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
