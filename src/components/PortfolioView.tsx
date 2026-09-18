import React, { useState } from 'react';
import { 
  Briefcase, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Coins, 
  PieChart, 
  Sliders, 
  RefreshCw, 
  Target, 
  Edit3, 
  Trash2, 
  Globe2, 
  Calculator,
  ArrowRightLeft,
  Sparkles
} from 'lucide-react';
import { 
  StockTicker, 
  PortfolioPosition, 
  SupportedCurrency, 
  ForexRates 
} from '../types';
import { 
  PortfolioSummary, 
  CURRENCY_SYMBOLS, 
  CURRENCY_NAMES, 
  formatMoney 
} from '../utils/portfolioUtils';

interface PortfolioViewProps {
  portfolio: PortfolioSummary;
  tickers: StockTicker[];
  baseCurrency: SupportedCurrency;
  onChangeBaseCurrency: (currency: SupportedCurrency) => void;
  forexRates: ForexRates;
  onOpenAddPosition: () => void;
  onEditPosition: (position: PortfolioPosition) => void;
  onDeletePosition: (positionId: string) => void;
  onOpenEditTarget: (ticker: StockTicker) => void;
  onRefreshData: () => void;
  isLoadingQuotes?: boolean;
}

const ALLOCATION_COLORS = [
  '#0A84FF', // Apple Blue
  '#30D158', // Apple Green
  '#FF9F0A', // Apple Orange
  '#BF5AF2', // Apple Purple
  '#64D2FF', // Apple Cyan
  '#FF375F', // Apple Pink
  '#FFD60A', // Apple Yellow
  '#AC8E68', // Apple Brown
];

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  portfolio,
  tickers,
  baseCurrency,
  onChangeBaseCurrency,
  forexRates,
  onOpenAddPosition,
  onEditPosition,
  onDeletePosition,
  onOpenEditTarget,
  onRefreshData,
  isLoadingQuotes = false,
}) => {
  // Scenario simulator state: percentage market shift (-30% to +50%)
  const [simulationShiftPct, setSimulationShiftPct] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'positions' | 'simulator'>('positions');

  const baseSymbol = CURRENCY_SYMBOLS[baseCurrency] || '$';

  // Simulated metrics
  const simulatedValue = portfolio.totalValue * (1 + simulationShiftPct / 100);
  const simulatedPnl = simulatedValue - portfolio.totalCost;
  const simulatedPnlPct = portfolio.totalCost > 0 ? (simulatedPnl / portfolio.totalCost) * 100 : 0;
  const simulatedDiff = simulatedValue - portfolio.totalValue;

  // Potential profit if all positions reach their target prices
  const totalTargetPotentialProfit = portfolio.positions.reduce((sum, p) => {
    return sum + (p.targetProfitBase != null ? p.targetProfitBase : 0);
  }, 0);

  const hasTargets = portfolio.positions.some((p) => p.targetPrice != null);

  return (
    <div 
      id="portfolio-view-container"
      className="space-y-6 animate-in fade-in duration-200"
    >
      {/* Top Bar: Title, Base Currency Switcher, Add Position Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#161618] border border-[#2c2c2e] p-4 sm:p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0A84FF]/20 to-[#0A84FF]/10 text-[#0A84FF] flex items-center justify-center border border-[#0A84FF]/30">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Mi Cartera de Inversión
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-300">
                {portfolio.positionsCount} {portfolio.positionsCount === 1 ? 'activo' : 'activos'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Control de P&L en tiempo real con conversión multidivisa automática
            </p>
          </div>
        </div>

        {/* Currency & Actions Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Base Currency Pills */}
          <div className="flex items-center bg-[#202023] p-1 rounded-xl border border-white/5">
            <span className="text-[11px] text-neutral-400 px-2 flex items-center gap-1 font-medium">
              <Globe2 className="w-3 h-3 text-[#0A84FF]" />
              <span className="hidden sm:inline">Divisa Base:</span>
            </span>
            {(['EUR', 'USD', 'GBP', 'CHF', 'JPY'] as SupportedCurrency[]).map((curr) => {
              const isSelected = baseCurrency === curr;
              return (
                <button
                  key={curr}
                  onClick={() => onChangeBaseCurrency(curr)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-[#0A84FF] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={CURRENCY_NAMES[curr]}
                >
                  {curr} ({CURRENCY_SYMBOLS[curr]?.trim() || curr})
                </button>
              );
            })}
          </div>

          {/* Refresh Quotes button */}
          <button
            onClick={onRefreshData}
            disabled={isLoadingQuotes}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#242426] hover:bg-[#2c2c2e] border border-white/5 text-neutral-300 hover:text-white text-xs font-medium transition-colors"
            title="Actualizar cotizaciones y divisas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQuotes ? 'animate-spin text-[#0A84FF]' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {/* Add Position Button */}
          <button
            onClick={onOpenAddPosition}
            id="btn-add-position"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0A84FF] hover:bg-[#0071E3] text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Posición</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Portfolio Value */}
        <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="font-medium">Valor Total de Cartera</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-300">
              {baseCurrency}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight my-1">
            {formatMoney(portfolio.totalValue, baseCurrency)}
          </div>
          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-1">
            <span>Coste invertido:</span>
            <span className="font-mono text-neutral-300">
              {formatMoney(portfolio.totalCost, baseCurrency)}
            </span>
          </div>
        </div>

        {/* Card 2: Total Accumulated P&L */}
        <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="font-medium">Ganancia / Pérdida Total</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              portfolio.totalPnl >= 0 ? 'bg-[#30D158]/20 text-[#30D158]' : 'bg-[#FF453A]/20 text-[#FF453A]'
            }`}>
              {portfolio.totalPnl >= 0 ? 'En Ganancias' : 'En Pérdidas'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${
              portfolio.totalPnl >= 0 ? 'text-[#30D158]' : 'text-[#FF453A]'
            }`}>
              {formatMoney(portfolio.totalPnl, baseCurrency, true)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className={`flex items-center ${portfolio.totalPnl >= 0 ? 'text-[#30D158]' : 'text-[#FF453A]'}`}>
              {portfolio.totalPnl >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {portfolio.totalPnlPercent >= 0 ? '+' : ''}{portfolio.totalPnlPercent.toFixed(2)}%
            </span>
            <span className="text-[11px] text-neutral-500 font-normal">
              ({portfolio.profitablePositions}/{portfolio.positionsCount} en verde)
            </span>
          </div>
        </div>

        {/* Card 3: Today's Change */}
        <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="font-medium">Variación Hoy (Sesión)</span>
            <span className="w-2 h-2 rounded-full bg-[#30D158] animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight my-1">
            <span className={portfolio.todayPnl >= 0 ? 'text-[#30D158]' : 'text-[#FF453A]'}>
              {formatMoney(portfolio.todayPnl, baseCurrency, true)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold">
            <span className={portfolio.todayPnl >= 0 ? 'text-[#30D158]' : 'text-[#FF453A]'}>
              {portfolio.todayPnlPercent >= 0 ? '+' : ''}{portfolio.todayPnlPercent.toFixed(2)}%
            </span>
            <span className="text-[11px] text-neutral-500 font-normal">respecto al cierre previo</span>
          </div>
        </div>

        {/* Card 4: Potential Target Profit */}
        <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="font-medium flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-[#FF9F0A]" />
              <span>Proyección Objetivos</span>
            </span>
            <span className="text-[10px] text-neutral-500">Metas</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#FF9F0A] font-mono tracking-tight my-1">
            {hasTargets ? formatMoney(totalTargetPotentialProfit, baseCurrency, true) : '---'}
          </div>
          <div className="text-[11px] text-neutral-400">
            {hasTargets ? (
              <span>Beneficio al alcanzar todos los objetivos</span>
            ) : (
              <span className="text-neutral-500">Asigna precios objetivo a tus activos</span>
            )}
          </div>
        </div>
      </div>

      {/* Allocation Breakdown Bar & Currency Diversification */}
      {portfolio.positions.length > 0 && (
        <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#0A84FF]" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Diversificación de Cartera y Multidivisa
              </h3>
            </div>
            {/* Currency Badges */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-400 text-[11px]">Exposición por divisa:</span>
              {portfolio.currencyBreakdown.map((cb) => (
                <span
                  key={cb.currency}
                  className="px-2 py-0.5 rounded-full bg-[#2c2c2e] text-neutral-300 font-mono text-[11px] border border-white/5"
                >
                  {cb.currency}: <strong>{cb.percentage.toFixed(1)}%</strong>
                </span>
              ))}
            </div>
          </div>

          {/* Allocation visual progress bar */}
          <div className="h-3 w-full bg-[#2c2c2e] rounded-full overflow-hidden flex">
            {portfolio.positions.map((pos, idx) => {
              const widthPct = Math.max(0.5, pos.allocationPercent);
              const color = ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length];
              return (
                <div
                  key={pos.position.id}
                  style={{ width: `${widthPct}%`, backgroundColor: color }}
                  className="h-full transition-all duration-300 relative group cursor-pointer"
                  title={`${pos.position.symbol}: ${pos.allocationPercent.toFixed(1)}% (${formatMoney(pos.valueBase, baseCurrency)})`}
                />
              );
            })}
          </div>

          {/* Legend chips */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {portfolio.positions.map((pos, idx) => {
              const color = ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length];
              return (
                <div
                  key={pos.position.id}
                  className="flex items-center gap-1.5 text-xs text-neutral-300"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-semibold text-white font-mono">{pos.position.symbol}</span>
                  <span className="text-neutral-400 text-[11px]">
                    {pos.allocationPercent.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs: Posiciones vs Simulador de Cartera */}
      <div className="flex items-center gap-2 border-b border-[#2c2c2e] pb-3">
        <button
          onClick={() => setActiveTab('positions')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'positions'
              ? 'bg-white/10 text-white border border-white/10'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Posiciones y Activos ({portfolio.positionsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'simulator'
              ? 'bg-white/10 text-white border border-white/10'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-[#0A84FF]" />
          <span>Simulador de Escenarios y Rentabilidad</span>
        </button>
      </div>

      {/* TAB 1: Positions Table */}
      {activeTab === 'positions' && (
        <div className="bg-[#161618] border border-[#2c2c2e] rounded-2xl overflow-hidden shadow-xl">
          {portfolio.positions.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 text-neutral-300 flex items-center justify-center mx-auto">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">No tienes posiciones en tu cartera</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Registra tus compras de acciones indicando número de títulos y precio de compra para seguir tus ganancias y pérdidas en tiempo real.
              </p>
              <button
                onClick={onOpenAddPosition}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:bg-[#0071E3] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Primera Posición</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#2c2c2e] bg-[#1c1c1e] text-neutral-400 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Activo / Empresa</th>
                    <th className="py-3 px-3 text-right">Títulos</th>
                    <th className="py-3 px-3 text-right">Precio Compra</th>
                    <th className="py-3 px-3 text-right">Cotización Actual</th>
                    <th className="py-3 px-3 text-right">Coste Total</th>
                    <th className="py-3 px-3 text-right font-bold text-white">Valor en Cartera ({baseCurrency})</th>
                    <th className="py-3 px-3 text-right">P&L Latente</th>
                    <th className="py-3 px-3 text-right">Variación Hoy</th>
                    <th className="py-3 px-3 text-right">Objetivo</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2c2c2e]">
                  {portfolio.positions.map((pos) => {
                    const isProfitable = pos.pnlBase >= 0;
                    const todayProfitable = pos.todayPnlBase >= 0;

                    return (
                      <tr
                        key={pos.position.id}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                        {/* Asset Symbol & Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#2c2c2e] flex items-center justify-center font-bold text-white text-[11px] font-mono shrink-0">
                              {pos.position.symbol.slice(0, 3)}
                            </div>
                            <div>
                              <div className="font-bold text-white font-mono flex items-center gap-1.5">
                                <span>{pos.position.symbol}</span>
                                <span className="text-[10px] font-normal px-1 py-0.2 rounded bg-white/10 text-neutral-300">
                                  {pos.currency}
                                </span>
                              </div>
                              <div className="text-[11px] text-neutral-400 truncate max-w-[140px]">
                                {pos.ticker?.name || pos.position.notes || 'Acción'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Shares count */}
                        <td className="py-3.5 px-3 text-right font-mono text-white font-medium">
                          {pos.shares.toLocaleString()}
                        </td>

                        {/* Buy Price */}
                        <td className="py-3.5 px-3 text-right font-mono text-neutral-300">
                          {formatMoney(pos.buyPrice, pos.currency)}
                        </td>

                        {/* Current Price */}
                        <td className="py-3.5 px-3 text-right font-mono text-white font-semibold">
                          {formatMoney(pos.currentPrice, pos.currency)}
                        </td>

                        {/* Cost Basis (Converted to Base) */}
                        <td className="py-3.5 px-3 text-right font-mono text-neutral-400">
                          <div>{formatMoney(pos.costBase, baseCurrency)}</div>
                          {pos.currency !== baseCurrency && (
                            <div className="text-[10px] text-neutral-500">
                              {formatMoney(pos.costNative, pos.currency)}
                            </div>
                          )}
                        </td>

                        {/* Current Value in Base Currency */}
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-white">
                          <div className="text-[13px]">{formatMoney(pos.valueBase, baseCurrency)}</div>
                          <div className="text-[10px] text-neutral-400 font-normal">
                            {pos.allocationPercent.toFixed(1)}% cartera
                          </div>
                        </td>

                        {/* P&L Latente (Moneda & %) */}
                        <td className="py-3.5 px-3 text-right font-mono font-semibold">
                          <div className={isProfitable ? 'text-[#30D158]' : 'text-[#FF453A]'}>
                            {formatMoney(pos.pnlBase, baseCurrency, true)}
                          </div>
                          <div className={`text-[11px] ${isProfitable ? 'text-[#30D158]' : 'text-[#FF453A]'}`}>
                            {pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%
                          </div>
                        </td>

                        {/* Today's Change */}
                        <td className="py-3.5 px-3 text-right font-mono">
                          <div className={todayProfitable ? 'text-[#30D158]' : 'text-[#FF453A]'}>
                            {formatMoney(pos.todayPnlBase, baseCurrency, true)}
                          </div>
                          <div className="text-[10px] text-neutral-500">
                            {pos.ticker ? `${pos.ticker.changePercent >= 0 ? '+' : ''}${pos.ticker.changePercent.toFixed(2)}%` : '---'}
                          </div>
                        </td>

                        {/* Target Price & Projections */}
                        <td className="py-3.5 px-3 text-right">
                          {pos.targetPrice ? (
                            <div className="font-mono">
                              <span className="text-[#FF9F0A] font-semibold">
                                {formatMoney(pos.targetPrice, pos.currency)}
                              </span>
                              {pos.targetProfitBase != null && (
                                <div className="text-[10px] text-neutral-400">
                                  Meta: +{formatMoney(pos.targetProfitBase, baseCurrency)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => pos.ticker && onOpenEditTarget(pos.ticker)}
                              className="text-[11px] text-neutral-500 hover:text-[#FF9F0A] underline decoration-dotted"
                            >
                              + Fijar meta
                            </button>
                          )}
                        </td>

                        {/* Action buttons */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onEditPosition(pos.position)}
                              className="w-7 h-7 rounded-lg hover:bg-[#2c2c2e] text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
                              title="Editar títulos o precio"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeletePosition(pos.position.id)}
                              className="w-7 h-7 rounded-lg hover:bg-[#FF453A]/20 text-neutral-400 hover:text-[#FF453A] flex items-center justify-center transition-colors"
                              title="Eliminar de cartera"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Interactive Portfolio Simulator */}
      {activeTab === 'simulator' && (
        <div className="bg-[#161618] border border-[#2c2c2e] rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#0A84FF]" />
                <h3 className="text-base font-bold text-white">
                  Simulador de Escenarios de Mercado y Rentabilidad
                </h3>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Visualiza al instante el impacto que tendría una subida o bajada en tu patrimonio neto y beneficios en {baseCurrency}.
              </p>
            </div>
            <button
              onClick={() => setSimulationShiftPct(0)}
              className="text-xs text-neutral-400 hover:text-white px-2.5 py-1 rounded bg-[#2c2c2e] transition-colors"
            >
              Restablecer
            </button>
          </div>

          {/* Slider */}
          <div className="bg-[#1c1c1e] p-5 rounded-xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-300 font-medium">
                Variación simulada de mercado:
              </span>
              <span className={`text-lg font-bold font-mono ${
                simulationShiftPct > 0 ? 'text-[#30D158]' : simulationShiftPct < 0 ? 'text-[#FF453A]' : 'text-white'
              }`}>
                {simulationShiftPct > 0 ? `+${simulationShiftPct}%` : `${simulationShiftPct}%`}
              </span>
            </div>

            <input
              type="range"
              min="-30"
              max="50"
              step="1"
              value={simulationShiftPct}
              onChange={(e) => setSimulationShiftPct(parseInt(e.target.value, 10))}
              className="w-full accent-[#0A84FF] h-2 bg-[#2c2c2e] rounded-lg cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
              <span>-30% (Corrección dura)</span>
              <span>-15%</span>
              <span className="text-neutral-300 font-bold">0% (Actual)</span>
              <span>+15%</span>
              <span>+30%</span>
              <span>+50% (Rally alcista)</span>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap gap-2">
            {[-20, -10, -5, 5, 10, 20, 30].map((preset) => (
              <button
                key={preset}
                onClick={() => setSimulationShiftPct(preset)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium border transition-colors ${
                  simulationShiftPct === preset
                    ? 'bg-[#0A84FF] border-[#0A84FF] text-white'
                    : 'bg-[#242426] border-white/5 text-neutral-300 hover:bg-[#2c2c2e]'
                }`}
              >
                {preset > 0 ? `+${preset}%` : `${preset}%`}
              </button>
            ))}
          </div>

          {/* Simulation Results Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-[#1c1c1e] p-4 rounded-xl border border-white/5">
              <div className="text-[11px] text-neutral-400 mb-1">Nuevo Valor de Cartera</div>
              <div className="text-xl font-bold font-mono text-white">
                {formatMoney(simulatedValue, baseCurrency)}
              </div>
              <div className={`text-xs font-mono mt-1 ${simulatedDiff >= 0 ? 'text-[#30D158]' : 'text-[#FF453A]'}`}>
                {simulatedDiff >= 0 ? '+' : ''}{formatMoney(simulatedDiff, baseCurrency)}
              </div>
            </div>

            <div className="bg-[#1c1c1e] p-4 rounded-xl border border-white/5">
              <div className="text-[11px] text-neutral-400 mb-1">Ganancia / Pérdida Neta</div>
              <div className={`text-xl font-bold font-mono ${simulatedPnl >= 0 ? 'text-[#30D158]' : 'text-[#FF453A]'}`}>
                {formatMoney(simulatedPnl, baseCurrency, true)}
              </div>
              <div className={`text-xs font-mono mt-1 ${simulatedPnl >= 0 ? 'text-[#30D158]' : 'text-[#FF453A]'}`}>
                Rentabilidad: {simulatedPnlPct >= 0 ? '+' : ''}{simulatedPnlPct.toFixed(2)}%
              </div>
            </div>

            <div className="bg-[#1c1c1e] p-4 rounded-xl border border-white/5">
              <div className="text-[11px] text-neutral-400 mb-1">Tipo de Cambio Aplicado</div>
              <div className="text-xs text-neutral-300 space-y-1 mt-1 font-mono">
                <div>1 USD = {(forexRates.rates['EUR'] || 0.92).toFixed(4)} EUR</div>
                <div>1 EUR = {(1 / (forexRates.rates['EUR'] || 0.92)).toFixed(4)} USD</div>
                <div>1 GBP = {((forexRates.rates['EUR'] || 0.92) / (forexRates.rates['GBP'] || 0.79)).toFixed(4)} EUR</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
