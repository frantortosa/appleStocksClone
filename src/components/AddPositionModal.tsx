import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  X, 
  Check, 
  Trash2, 
  DollarSign, 
  Coins, 
  Calendar, 
  Calculator,
  ArrowRightLeft
} from 'lucide-react';
import { StockTicker, PortfolioPosition, SupportedCurrency, ForexRates } from '../types';
import { CURRENCY_SYMBOLS, convertCurrency, formatMoney } from '../utils/portfolioUtils';

interface AddPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePosition: (position: PortfolioPosition) => void;
  onDeletePosition?: (positionId: string) => void;
  tickers: StockTicker[];
  editingPosition?: PortfolioPosition | null;
  baseCurrency: SupportedCurrency;
  forexRates: ForexRates;
}

export const AddPositionModal: React.FC<AddPositionModalProps> = ({
  isOpen,
  onClose,
  onSavePosition,
  onDeletePosition,
  tickers,
  editingPosition,
  baseCurrency,
  forexRates,
}) => {
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [buyDate, setBuyDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editingPosition) {
      setSymbol(editingPosition.symbol);
      setShares(editingPosition.shares.toString());
      setBuyPrice(editingPosition.buyPrice.toString());
      setCurrency(editingPosition.currency || 'USD');
      setBuyDate(editingPosition.buyDate || '');
      setNotes(editingPosition.notes || '');
    } else {
      // Default to first ticker or AAPL
      const defaultTicker = tickers[0];
      setSymbol(defaultTicker ? defaultTicker.symbol : 'AAPL');
      setShares('10');
      setBuyPrice(defaultTicker ? defaultTicker.currentPrice.toString() : '150');
      setCurrency(defaultTicker?.currency || 'USD');
      setBuyDate(new Date().toISOString().slice(0, 10));
      setNotes('');
    }
  }, [editingPosition, isOpen, tickers]);

  // When symbol selection changes, auto-fill current price and currency
  const handleSymbolChange = (newSymbol: string) => {
    setSymbol(newSymbol);
    const matched = tickers.find((t) => t.symbol.toUpperCase() === newSymbol.toUpperCase());
    if (matched) {
      setBuyPrice(matched.currentPrice.toString());
      setCurrency(matched.currency || 'USD');
    }
  };

  if (!isOpen) return null;

  const numShares = parseFloat(shares) || 0;
  const numBuyPrice = parseFloat(buyPrice) || 0;
  const totalCostNative = numShares * numBuyPrice;
  const totalCostBase = convertCurrency(totalCostNative, currency, baseCurrency, forexRates);

  const matchedTicker = tickers.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase());
  const currentPrice = matchedTicker ? matchedTicker.currentPrice : numBuyPrice;
  const currentValueNative = numShares * currentPrice;
  const pnlNative = currentValueNative - totalCostNative;
  const pnlPercent = totalCostNative > 0 ? (pnlNative / totalCostNative) * 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || numShares <= 0 || numBuyPrice <= 0) return;

    const newPos: PortfolioPosition = {
      id: editingPosition ? editingPosition.id : `pos-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      symbol: symbol.trim().toUpperCase(),
      shares: numShares,
      buyPrice: numBuyPrice,
      currency: currency.toUpperCase(),
      buyDate: buyDate || undefined,
      notes: notes.trim() || undefined,
    };

    onSavePosition(newPos);
    onClose();
  };

  return (
    <div 
      id="add-position-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2c2c2e]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0A84FF]/20 text-[#0A84FF] flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {editingPosition ? 'Editar Posición en Cartera' : 'Nueva Posición de Inversión'}
              </h2>
              <p className="text-[11px] text-neutral-400">
                Registra títulos comprados para calcular P&L y conversión multidivisa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#2c2c2e] hover:bg-[#3a3a3c] flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Symbol selection */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Activo / Ticker
            </label>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => handleSymbolChange(e.target.value)}
                  placeholder="ej. AAPL, NVDA, SAN.MC, BTC-USD..."
                  className="flex-1 bg-[#2c2c2e] border border-[#3a3a3c] rounded-xl px-3 py-2 text-sm text-white font-mono uppercase focus:outline-none focus:border-[#0A84FF]"
                  required
                />
                {/* Quick picker dropdown from active tickers */}
                <select
                  value={tickers.some((t) => t.symbol === symbol) ? symbol : ''}
                  onChange={(e) => e.target.value && handleSymbolChange(e.target.value)}
                  className="bg-[#2c2c2e] border border-[#3a3a3c] rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-[#0A84FF]"
                >
                  <option value="">Elegir de la lista...</option>
                  {tickers.map((t) => (
                    <option key={t.symbol} value={t.symbol}>
                      {t.symbol} - {t.name.slice(0, 20)}
                    </option>
                  ))}
                </select>
              </div>
              {matchedTicker && (
                <div className="flex items-center justify-between text-[11px] px-2 text-neutral-400">
                  <span>{matchedTicker.name} ({matchedTicker.exchange})</span>
                  <span className="font-mono text-neutral-200">
                    Cotización actual: {CURRENCY_SYMBOLS[matchedTicker.currency] || '$'}
                    {matchedTicker.currentPrice.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Shares & Buy Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Cantidad de Acciones (Títulos)
              </label>
              <input
                type="number"
                step="any"
                min="0.0001"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="10"
                className="w-full bg-[#2c2c2e] border border-[#3a3a3c] rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#0A84FF]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Precio de Compra Medio
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  placeholder="150.00"
                  className="w-full bg-[#2c2c2e] border border-[#3a3a3c] rounded-xl pl-8 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#0A84FF]"
                  required
                />
                <span className="absolute left-3 top-2.5 text-xs text-neutral-400 font-mono">
                  {CURRENCY_SYMBOLS[currency] || '$'}
                </span>
              </div>
            </div>
          </div>

          {/* Currency selection & Purchase Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Divisa Nativa del Activo
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#2c2c2e] border border-[#3a3a3c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0A84FF]"
              >
                <option value="USD">USD ($ - Dólar USA)</option>
                <option value="EUR">EUR (€ - Euro)</option>
                <option value="GBP">GBP (£ - Libra Esterlina)</option>
                <option value="CHF">CHF (Franco Suizo)</option>
                <option value="JPY">JPY (¥ - Yen Japonés)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Fecha de Adquisición (Opcional)
              </label>
              <input
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                className="w-full bg-[#2c2c2e] border border-[#3a3a3c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0A84FF]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Notas o Tesis de Inversión
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ej. Compradas en soporte clave, horizonte 2 años..."
              className="w-full bg-[#2c2c2e] border border-[#3a3a3c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0A84FF]"
            />
          </div>

          {/* Instant calculation summary card */}
          {numShares > 0 && numBuyPrice > 0 && (
            <div className="p-3.5 bg-[#242426] border border-white/5 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Coste de compra total:</span>
                <span className="font-mono font-medium text-white">
                  {formatMoney(totalCostNative, currency)}
                </span>
              </div>

              {currency !== baseCurrency && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <ArrowRightLeft className="w-3 h-3 text-[#0A84FF]" />
                    <span>Equivalente en Cartera ({baseCurrency}):</span>
                  </span>
                  <span className="font-mono font-semibold text-[#0A84FF]">
                    {formatMoney(totalCostBase, baseCurrency)}
                  </span>
                </div>
              )}

              {matchedTicker && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                  <span className="text-neutral-400">P&L Latente estimada:</span>
                  <span className={`font-mono font-bold ${pnlNative >= 0 ? 'text-[#30D158]' : 'text-[#FF453A]'}`}>
                    {pnlNative >= 0 ? '+' : ''}{formatMoney(pnlNative, currency)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-[#2c2c2e]">
            {editingPosition && onDeletePosition ? (
              <button
                type="button"
                onClick={() => {
                  onDeletePosition(editingPosition.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Posición</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:bg-[#2c2c2e] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0A84FF] hover:bg-[#0071E3] text-white transition-colors shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{editingPosition ? 'Guardar Cambios' : 'Añadir a Cartera'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
