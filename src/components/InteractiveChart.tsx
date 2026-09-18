import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Timeframe, 
  PricePoint, 
  StockTicker 
} from '../types';
import { 
  BarChart2, 
  TrendingUp, 
  Target, 
  Maximize2, 
  Sliders, 
  Clock,
  Sparkles,
  Globe2
} from 'lucide-react';
import { fetchStockHistory } from '../utils/financeApi';

interface InteractiveChartProps {
  ticker: StockTicker;
  selectedTimeframe: Timeframe;
  onSelectTimeframe: (tf: Timeframe) => void;
  chartType: 'area' | 'candles';
  onToggleChartType: () => void;
  onOpenEditTarget: (ticker: StockTicker) => void;
  onUpdateTargetPrice?: (symbol: string, newTargetPrice: number) => void;
}

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: '1D', label: '1 D' },
  { id: '1S', label: '1 S' },
  { id: '1M', label: '1 M' },
  { id: '3M', label: '3 M' },
  { id: '6M', label: '6 M' },
  { id: '1A', label: '1 A' },
  { id: '2A', label: '2 A' },
  { id: '5A', label: '5 A' },
  { id: 'TODO', label: 'TODO' },
];

/**
 * Formats a point timestamp or fallback label to the user's local timezone
 */
function formatPointLocalTime(point?: PricePoint | null, timeframe?: Timeframe): string {
  if (!point) return 'Ahora';
  if (point.timestamp && !isNaN(point.timestamp)) {
    const d = new Date(point.timestamp);
    if (timeframe === '1D') {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (timeframe === '1S') {
      // 5-day view shows both date and local time
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (timeframe === '1M' || timeframe === '3M' || timeframe === '6M') {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return point.timeLabel || 'Ahora';
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  ticker,
  selectedTimeframe,
  onSelectTimeframe,
  chartType,
  onToggleChartType,
  onOpenEditTarget,
  onUpdateTargetPrice,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 380 });
  const [hoveredPoint, setHoveredPoint] = useState<PricePoint | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [liveHistoryPoints, setLiveHistoryPoints] = useState<PricePoint[] | null>(null);
  const [isLiveFromBackend, setIsLiveFromBackend] = useState(false);

  // Drag-and-drop state for Target Price
  const [isDraggingTarget, setIsDraggingTarget] = useState(false);
  const [dragTargetPrice, setDragTargetPrice] = useState<number | null>(null);
  const isDraggingTargetRef = useRef(false);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 50 && height > 50) {
          setDimensions({ width, height: Math.max(260, height) });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch real candle/tick points from Yahoo Finance API via Express backend
  useEffect(() => {
    let active = true;
    fetchStockHistory(ticker.symbol, selectedTimeframe).then((points) => {
      if (active && points && points.length > 3) {
        setLiveHistoryPoints(points);
        setIsLiveFromBackend(true);
      } else if (active) {
        setLiveHistoryPoints(null);
        setIsLiveFromBackend(false);
      }
    }).catch(() => {
      if (active) {
        setLiveHistoryPoints(null);
        setIsLiveFromBackend(false);
      }
    });

    return () => {
      active = false;
    };
  }, [ticker.symbol, selectedTimeframe]);

  const history = liveHistoryPoints || ticker.history[selectedTimeframe] || [];
  const firstPoint = history[0];
  const lastPoint = history[history.length - 1];

  // Active point: hovered or last point
  const activePoint = hoveredPoint || lastPoint || { price: ticker.currentPrice, timeLabel: 'Ahora' };
  
  // Period change computation
  const periodBasePrice = firstPoint ? firstPoint.price : ticker.previousClose;
  const currentDiff = activePoint.price - periodBasePrice;
  const currentDiffPercent = periodBasePrice > 0 ? (currentDiff / periodBasePrice) * 100 : 0;
  const isPeriodPositive = currentDiff >= 0;

  // Primary colors like Apple Stocks
  const strokeColor = isPeriodPositive ? '#30D158' : '#FF453A';
  const fillColorId = isPeriodPositive ? 'greenGradient' : 'redGradient';

  // Chart bounds calculation
  const { minPrice, maxPrice, volumeMax } = useMemo(() => {
    if (!history.length) return { minPrice: 0, maxPrice: 100, volumeMax: 1000 };
    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    history.forEach((p) => {
      const low = p.low ?? p.price;
      const high = p.high ?? p.price;
      if (low < min) min = low;
      if (high > max) max = high;
      if ((p.volume || 0) > maxVol) maxVol = p.volume || 0;
    });

    // If target price is configured and within reasonable bounds, include in scale
    if (ticker.targetPrice) {
      if (ticker.targetPrice > max && ticker.targetPrice < max * 1.5) max = ticker.targetPrice;
      if (ticker.targetPrice < min && ticker.targetPrice > min * 0.5) min = ticker.targetPrice;
    }

    const padding = (max - min) * 0.1 || 1;
    return {
      minPrice: min - padding,
      maxPrice: max + padding,
      volumeMax: maxVol || 1,
    };
  }, [history, ticker.targetPrice]);

  const chartTopPadding = 20;
  const chartBottomPadding = 50; // for volume & dates
  const usableChartHeight = dimensions.height - chartTopPadding - chartBottomPadding;

  const getY = (val: number) => {
    const range = maxPrice - minPrice || 1;
    return dimensions.height - chartBottomPadding - ((val - minPrice) / range) * usableChartHeight;
  };

  const getPriceFromY = (yCoord: number) => {
    const clampedY = Math.max(chartTopPadding, Math.min(dimensions.height - chartBottomPadding, yCoord));
    const range = maxPrice - minPrice || 1;
    const ratio = (dimensions.height - chartBottomPadding - clampedY) / usableChartHeight;
    const rawPrice = minPrice + ratio * range;
    
    // Round to 2 decimals or 1 decimal based on magnitude
    if (rawPrice >= 100) {
      return Math.round(rawPrice * 10) / 10;
    }
    return Math.round(rawPrice * 100) / 100;
  };

  const getX = (index: number) => {
    if (history.length <= 1) return 0;
    return (index / (history.length - 1)) * dimensions.width;
  };

  // Build SVG Path for Area & Line
  const { linePath, areaPath } = useMemo(() => {
    if (!history.length) return { linePath: '', areaPath: '' };

    const points = history.map((p, idx) => ({
      x: getX(idx),
      y: getY(p.price),
    }));

    if (points.length === 1) {
      return { linePath: `M 0,${points[0].y} L ${dimensions.width},${points[0].y}`, areaPath: '' };
    }

    // Build smooth cubic bezier curve
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }

    const baselineY = dimensions.height - chartBottomPadding;
    const area = `${d} L ${points[points.length - 1].x},${baselineY} L ${points[0].x},${baselineY} Z`;

    return { linePath: d, areaPath: area };
  }, [history, dimensions.width, dimensions.height, minPrice, maxPrice]);

  // Active target price: during drag, use dragTargetPrice; otherwise ticker.targetPrice
  const activeTargetPrice = isDraggingTarget && dragTargetPrice !== null 
    ? dragTargetPrice 
    : ticker.targetPrice;

  // Target price Y coord
  const targetY = activeTargetPrice ? getY(activeTargetPrice) : null;
  const isTargetVisible = targetY !== null && targetY >= chartTopPadding && targetY <= dimensions.height - chartBottomPadding;

  // Start dragging target price
  const handleStartTargetDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingTarget(true);
    isDraggingTargetRef.current = true;
    setHoveredPoint(null);
    setHoverX(null);

    const initialPrice = ticker.targetPrice ?? ticker.currentPrice * 1.1;
    setDragTargetPrice(initialPrice);
  };

  // Window-level mousemove/mouseup while dragging target to ensure smooth scrubbing anywhere on screen
  useEffect(() => {
    if (!isDraggingTarget) return;

    const handleWindowMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingTargetRef.current || !containerRef.current) return;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      const newPrice = getPriceFromY(relativeY);
      setDragTargetPrice(newPrice);
    };

    const handleWindowUp = () => {
      if (isDraggingTargetRef.current) {
        isDraggingTargetRef.current = false;
        setIsDraggingTarget(false);
        if (dragTargetPrice !== null && onUpdateTargetPrice) {
          onUpdateTargetPrice(ticker.symbol, dragTargetPrice);
        }
      }
    };

    window.addEventListener('mousemove', handleWindowMove, { passive: false });
    window.addEventListener('mouseup', handleWindowUp);
    window.addEventListener('touchmove', handleWindowMove, { passive: false });
    window.addEventListener('touchend', handleWindowUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
      window.removeEventListener('touchmove', handleWindowMove);
      window.removeEventListener('touchend', handleWindowUp);
    };
  }, [isDraggingTarget, dragTargetPrice, minPrice, maxPrice, dimensions.height, ticker.symbol, onUpdateTargetPrice]);

  // Handle Mouse Scrubbing
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingTarget) return; // Do not scrub price while dragging target
    if (!containerRef.current || !history.length) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = mouseX / rect.width;
    const index = Math.round(ratio * (history.length - 1));
    const clampedIndex = Math.max(0, Math.min(history.length - 1, index));
    
    setHoveredPoint(history[clampedIndex]);
    setHoverX(getX(clampedIndex));
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setHoverX(null);
  };

  return (
    <div 
      id="interactive-chart-container"
      className="bg-[#121214] rounded-2xl border border-[#242426] p-4 flex flex-col relative select-none"
    >
      {/* Chart Top Header: Scrub price, diff badge & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 z-10">
        <div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums">
              {ticker.currency}{activePoint.price.toFixed(2)}
            </span>
            <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              isPeriodPositive 
                ? 'bg-[#30D158]/20 text-[#30D158]' 
                : 'bg-[#FF453A]/20 text-[#FF453A]'
            }`}>
              <span>
                {isPeriodPositive ? '+' : ''}{ticker.currency}{currentDiff.toFixed(2)}
              </span>
              <span>
                ({isPeriodPositive ? '+' : ''}{currentDiffPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="text-xs text-neutral-400 mt-0.5 flex items-center gap-2">
            <Clock className="w-3 h-3 text-neutral-500" />
            <span>{formatPointLocalTime(activePoint, selectedTimeframe)}</span>
            {isLiveFromBackend ? (
              <span className="text-[#30D158] text-[11px] flex items-center gap-1.5 bg-[#30D158]/10 border border-[#30D158]/20 px-2 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" />
                <span>Yahoo Finance En Vivo</span>
              </span>
            ) : (
              <span className="text-neutral-400 text-[11px] flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full">
                <span>Histórico sincronizado</span>
              </span>
            )}
            {hoveredPoint && (
              <span className="text-neutral-500 text-[11px]">(Desplaza para explorar)</span>
            )}
          </div>
        </div>

        {/* View toggle (Velas japonesas / Línea) + Target info */}
        <div className="flex items-center gap-2">
          {ticker.targetPrice && (
            <button
              onClick={() => onOpenEditTarget(ticker)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FF9F0A]/10 hover:bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/30 text-xs font-medium transition-colors"
              title="Ajustar precio objetivo"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Obj: {ticker.currency}{ticker.targetPrice.toFixed(0)}</span>
            </button>
          )}

          <button
            onClick={onToggleChartType}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
              chartType === 'candles'
                ? 'bg-[#0A84FF] text-white border-transparent'
                : 'bg-[#1c1c1e] hover:bg-[#2c2c2e] text-neutral-300 border-white/10'
            }`}
            title="Alternar entre gráfico de línea y velas japonesas"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{chartType === 'candles' ? 'Velas' : 'Línea'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Chart Canvas / SVG Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full h-[280px] sm:h-[320px] md:h-[350px] cursor-crosshair overflow-hidden touch-none"
      >
        <svg
          width={dimensions.width}
          height={dimensions.height}
          className="absolute inset-0 pointer-events-none"
        >
          <defs>
            {/* Green Apple Gradient */}
            <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#30D158" stopOpacity="0.30" />
              <stop offset="70%" stopColor="#30D158" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#30D158" stopOpacity="0.00" />
            </linearGradient>

            {/* Red Apple Gradient */}
            <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF453A" stopOpacity="0.30" />
              <stop offset="70%" stopColor="#FF453A" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#FF453A" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          <line
            x1="0"
            y1={getY(maxPrice)}
            x2={dimensions.width}
            y2={getY(maxPrice)}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
          />
          <line
            x1="0"
            y1={getY((maxPrice + minPrice) / 2)}
            x2={dimensions.width}
            y2={getY((maxPrice + minPrice) / 2)}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
          />
          <line
            x1="0"
            y1={getY(minPrice)}
            x2={dimensions.width}
            y2={getY(minPrice)}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
          />

          {/* Target Price Horizontal Line (Interactive & Draggable) */}
          {isTargetVisible && targetY !== null && (
            <g 
              className="cursor-ns-resize group/target-line"
              onMouseDown={handleStartTargetDrag}
              onTouchStart={handleStartTargetDrag}
            >
              {/* Invisible thicker hit-box line for effortless mouse/touch grabbing */}
              <line
                x1="0"
                y1={targetY}
                x2={dimensions.width}
                y2={targetY}
                stroke="transparent"
                strokeWidth="16"
                className="pointer-events-auto"
              />
              {/* Visible dashed target line */}
              <line
                x1="0"
                y1={targetY}
                x2={dimensions.width}
                y2={targetY}
                stroke={isDraggingTarget ? '#FFB340' : '#FF9F0A'}
                strokeWidth={isDraggingTarget ? '2.5' : '1.5'}
                strokeDasharray={isDraggingTarget ? 'none' : '6 4'}
                opacity={isDraggingTarget ? '1' : '0.85'}
              />
            </g>
          )}

          {/* Volume bars at bottom */}
          {history.map((p, idx) => {
            const x = getX(idx);
            const vol = p.volume || 0;
            const barHeight = (vol / volumeMax) * 35;
            const barY = dimensions.height - chartBottomPadding - barHeight;
            const isCandleGreen = (p.close || p.price) >= (p.open || p.price);
            return (
              <rect
                key={`vol-${idx}`}
                x={x - 2}
                y={barY}
                width="3"
                height={barHeight}
                fill={isCandleGreen ? '#30D158' : '#FF453A'}
                opacity="0.18"
              />
            );
          })}

          {/* Chart Rendering: Area/Line OR Candlesticks */}
          {chartType === 'area' ? (
            <>
              {/* Area fill */}
              <path d={areaPath} fill={`url(#${fillColorId})`} />

              {/* Stroke line */}
              <path
                d={linePath}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            /* Candlesticks view */
            history.map((p, idx) => {
              const x = getX(idx);
              const openY = getY(p.open || p.price);
              const closeY = getY(p.close || p.price);
              const highY = getY(p.high || Math.max(p.open || p.price, p.close || p.price));
              const lowY = getY(p.low || Math.min(p.open || p.price, p.close || p.price));
              const isUp = (p.close || p.price) >= (p.open || p.price);
              const candleColor = isUp ? '#30D158' : '#FF453A';
              const top = Math.min(openY, closeY);
              const candleHeight = Math.max(2, Math.abs(closeY - openY));

              return (
                <g key={`candle-${idx}`}>
                  {/* Wick */}
                  <line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    stroke={candleColor}
                    strokeWidth="1.2"
                  />
                  {/* Body */}
                  <rect
                    x={x - 3}
                    y={top}
                    width="6"
                    height={candleHeight}
                    fill={candleColor}
                    rx="1"
                  />
                </g>
              );
            })
          )}

          {/* Hover Crosshair Vertical Line */}
          {hoverX !== null && hoveredPoint && (
            <g>
              <line
                x1={hoverX}
                y1={chartTopPadding}
                x2={hoverX}
                y2={dimensions.height - chartBottomPadding}
                stroke="#FFFFFF"
                strokeWidth="1.2"
                strokeDasharray="4 3"
                opacity="0.6"
              />
              {/* Hover point circle on line */}
              <circle
                cx={hoverX}
                cy={getY(hoveredPoint.price)}
                r="4.5"
                fill="#FFFFFF"
                stroke={strokeColor}
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>

        {/* Floating Target Price Badge on right edge (Interactive & Draggable up/down) */}
        {isTargetVisible && targetY !== null && activeTargetPrice && (
          <div
            id="draggable-target-badge"
            onMouseDown={handleStartTargetDrag}
            onTouchStart={handleStartTargetDrag}
            className={`absolute right-2 -translate-y-1/2 rounded shadow-lg flex items-center gap-1.5 cursor-ns-resize select-none z-30 transition-transform ${
              isDraggingTarget
                ? 'bg-[#FFB340] text-black scale-105 ring-2 ring-white/50 px-2.5 py-1 text-[11px] font-extrabold shadow-amber-500/20'
                : 'bg-[#FF9F0A] hover:bg-[#ffaa24] text-black text-[10px] font-bold px-2 py-0.5 hover:scale-102'
            }`}
            style={{ top: `${targetY}px` }}
            title="Haz click y arrastra hacia arriba o abajo para ajustar el precio objetivo"
          >
            <Target className={`shrink-0 ${isDraggingTarget ? 'w-3 h-3 animate-spin' : 'w-2.5 h-2.5'}`} />
            <span>
              {isDraggingTarget ? 'Fijando: ' : 'Objetivo: '}
              {ticker.currency}{activeTargetPrice.toFixed(2)}
            </span>
            <span className="text-[9px] font-mono opacity-80 border-l border-black/20 pl-1">
              {activeTargetPrice >= ticker.currentPrice ? '+' : ''}
              {(((activeTargetPrice - ticker.currentPrice) / ticker.currentPrice) * 100).toFixed(1)}%
            </span>
          </div>
        )}

        {/* Live Dragging Indicator Banner */}
        {isDraggingTarget && activeTargetPrice && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#FF9F0A] text-black px-3 py-1 rounded-full text-xs font-bold shadow-xl flex items-center gap-1.5 z-40 animate-pulse">
            <Target className="w-3.5 h-3.5" />
            <span>Arrastrando objetivo: {ticker.currency}{activeTargetPrice.toFixed(2)} (suelta para guardar)</span>
          </div>
        )}

        {/* Scrubbing Tooltip Box */}
        {hoverX !== null && hoveredPoint && (
          <div
            className="absolute top-2 -translate-x-1/2 bg-[#1c1c1e] text-white border border-[#38383a] rounded-lg px-2.5 py-1 text-xs shadow-xl pointer-events-none z-20 flex flex-col items-center"
            style={{ left: `${Math.min(dimensions.width - 60, Math.max(60, hoverX))}px` }}
          >
            <span className="font-bold tabular-nums">
              {ticker.currency}{hoveredPoint.price.toFixed(2)}
            </span>
            <span className="text-[10px] text-neutral-400">
              {formatPointLocalTime(hoveredPoint, selectedTimeframe)}
            </span>
          </div>
        )}
      </div>

      {/* Apple Stocks Timeframe Selector Ribbon */}
      <div 
        id="chart-timeframe-selector"
        className="flex items-center justify-between border-t border-[#202023] pt-3 mt-1"
      >
        {TIMEFRAMES.map((tf) => {
          const isActive = tf.id === selectedTimeframe;
          return (
            <button
              key={tf.id}
              onClick={() => onSelectTimeframe(tf.id)}
              className={`px-2.5 sm:px-3.5 py-1 rounded-md text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-white text-black shadow'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tf.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
