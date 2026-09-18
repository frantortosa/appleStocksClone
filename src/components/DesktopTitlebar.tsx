import React from 'react';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Monitor, 
  Laptop, 
  RefreshCw,
  Terminal,
  Download,
  CheckCircle2,
  TrendingUp,
  Maximize2,
  Minimize2,
  Minus,
  X,
  Briefcase,
  LineChart,
  Globe2,
  Coins
} from 'lucide-react';
import { AppSettings, SupportedCurrency } from '../types';

interface DesktopTitlebarProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenAddModal: () => void;
  onOpenElectronModal: () => void;
  tickerCount: number;
  marketOpen: boolean;
  activeView: 'watchlist' | 'portfolio';
  onSelectView: (view: 'watchlist' | 'portfolio') => void;
  portfolioPositionsCount: number;
  onRefreshQuotes: () => void;
  isRefreshingQuotes?: boolean;
}

export const DesktopTitlebar: React.FC<DesktopTitlebarProps> = ({
  settings,
  onUpdateSettings,
  onOpenAddModal,
  onOpenElectronModal,
  tickerCount,
  marketOpen,
  activeView,
  onSelectView,
  portfolioPositionsCount,
  onRefreshQuotes,
  isRefreshingQuotes = false,
}) => {
  const isMac = settings.platformView === 'macos';

  return (
    <header 
      id="desktop-titlebar"
      className="h-11 bg-[#161618] border-b border-[#2c2c2e] flex items-center justify-between px-3 select-none z-30 shrink-0 text-xs text-neutral-300"
    >
      {/* Left section: OS Window controls + App branding */}
      <div className="flex items-center gap-3">
        {isMac ? (
          <div className="flex items-center gap-2 group mr-2" title="Controles macOS">
            <button 
              className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] flex items-center justify-center text-black/70 hover:opacity-90"
              aria-label="Cerrar ventana"
            >
              <X className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button 
              className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] flex items-center justify-center text-black/70 hover:opacity-90"
              aria-label="Minimizar ventana"
            >
              <Minus className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button 
              className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] flex items-center justify-center text-black/70 hover:opacity-90"
              aria-label="Maximizar ventana"
            >
              <Maximize2 className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-neutral-800 to-neutral-700 flex items-center justify-center border border-white/10 shadow-inner">
            <TrendingUp className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-white tracking-tight text-[13px]">
            Bolsa
          </span>
        </div>

        {/* View Switcher: Watchlist vs Portfolio */}
        <div className="flex items-center bg-[#202023] p-0.5 rounded-lg border border-white/5 ml-2">
          <button
            onClick={() => onSelectView('watchlist')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              activeView === 'watchlist'
                ? 'bg-[#0A84FF] text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <LineChart className="w-3 h-3" />
            <span>Seguimiento</span>
            <span className="text-[10px] font-mono opacity-80">({tickerCount})</span>
          </button>

          <button
            onClick={() => onSelectView('portfolio')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              activeView === 'portfolio'
                ? 'bg-[#0A84FF] text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-3 h-3" />
            <span>Mi Cartera</span>
            {portfolioPositionsCount > 0 && (
              <span className="text-[10px] font-mono px-1 rounded bg-white/20 text-white">
                {portfolioPositionsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Middle section: Market status & Backend status */}
      <div className="hidden md:flex items-center gap-2 text-neutral-400 text-[11px]">
        {/* Market status */}
        <div className="flex items-center gap-1.5 bg-[#202023] px-2.5 py-1 rounded-full border border-white/5">
          <span className={`w-2 h-2 rounded-full ${marketOpen ? 'bg-[#30D158] animate-pulse' : 'bg-[#FF9F0A]'}`} />
          <span className="text-neutral-300 font-medium">
            {marketOpen ? 'Mercado Abierto' : 'Pre/Post Mercado'}
          </span>
          <span className="text-neutral-500 text-[10px]">NYSE/NASDAQ/BME</span>
        </div>

        {/* Yahoo Finance Backend Status */}
        <div 
          className="flex items-center gap-1.5 bg-[#202023] px-2.5 py-1 rounded-full border border-white/5"
          title="Conexión en vivo con Yahoo Finance (cotizaciones en tiempo real y velas de mercado)"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" />
          <Globe2 className="w-3 h-3 text-[#30D158]" />
          <span className="text-neutral-200 font-medium">Yahoo Finance</span>
          <span className="text-[#30D158] text-[10px] font-mono font-bold tracking-wider">LIVE</span>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefreshQuotes}
          disabled={isRefreshingQuotes}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#202023] hover:bg-white/10 transition-colors text-[11px] text-neutral-300 hover:text-white border border-white/5"
          title="Sincronizar cotizaciones en directo desde Yahoo Finance"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshingQuotes ? 'animate-spin text-[#0A84FF]' : 'text-neutral-400'}`} />
          <span>{isRefreshingQuotes ? 'Sincronizando...' : 'Actualizar'}</span>
        </button>
      </div>

      {/* Right section: Actions, platform switch & Windows controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenAddModal}
          id="btn-add-ticker-titlebar"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0A84FF] hover:bg-[#0071E3] text-white text-[11px] font-medium transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Añadir Ticker</span>
        </button>

        <button
          onClick={() => onUpdateSettings({ platformView: isMac ? 'windows' : 'macos' })}
          className="flex items-center gap-1 px-2 py-1 rounded bg-[#242426] hover:bg-[#2c2c2e] text-neutral-300 transition-colors text-[11px] border border-white/5"
          title={`Cambiar a estilo ${isMac ? 'Windows' : 'macOS'}`}
        >
          {isMac ? <Laptop className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isMac ? 'macOS' : 'Windows'}</span>
        </button>

        <button
          onClick={onOpenElectronModal}
          className="flex items-center gap-1 px-2 py-1 rounded bg-[#242426] hover:bg-[#2c2c2e] text-neutral-300 transition-colors text-[11px] border border-white/5"
          title="Ver configuración Electron para escritorio (Mac & Windows)"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Electron</span>
        </button>

        {/* Windows style control buttons if Windows mode */}
        {!isMac && (
          <div className="flex items-center border-l border-[#2c2c2e] pl-2 ml-1">
            <button className="w-7 h-7 flex items-center justify-center hover:bg-white/10 text-neutral-400 hover:text-white transition-colors" aria-label="Minimizar">
              <Minus className="w-3 h-3" />
            </button>
            <button className="w-7 h-7 flex items-center justify-center hover:bg-white/10 text-neutral-400 hover:text-white transition-colors" aria-label="Maximizar">
              <Maximize2 className="w-3 h-3" />
            </button>
            <button className="w-7 h-7 flex items-center justify-center hover:bg-[#E81123] text-neutral-400 hover:text-white transition-colors" aria-label="Cerrar">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
