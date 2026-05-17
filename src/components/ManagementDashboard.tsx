import React, { useMemo, useState } from 'react';
import type { Order, RemoteData } from '../types';
import { fold } from '../types';
import {
  RefreshCcw, AlertCircle, ShoppingBag, ChevronRight, Eye, EyeOff
} from 'lucide-react';

interface DashboardProps {
  orders: RemoteData<Error, Order[]>;
  onRefresh: () => void;
}

// ---- helpers ----------------------------------------------------------------

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const formatCurrencyCompact = (val: number): string => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M ₫`;
  if (val >= 1_000)     return `${(val / 1_000).toFixed(0)}k ₫`;
  return formatCurrency(val);
};

// ---- sub-components ---------------------------------------------------------

const SkeletonDashboard: React.FC = () => (
  <div className="flex flex-col gap-6 animate-pulse">
    {/* KPI skeleton */}
    <div className="kpi-scroll stagger">
      {[0, 1, 2].map(i => (
        <div key={i} className="kpi-card" style={{ opacity: 1 - i * 0.15 }}>
          <div className="skeleton skeleton-text" style={{ width: '40%' }} />
          <div className="skeleton skeleton-title" style={{ width: '75%' }} />
          <div className="skeleton skeleton-text" style={{ width: '55%' }} />
        </div>
      ))}
    </div>
    {/* Breakdown skeleton */}
    <div className="glass p-6 flex flex-col gap-4">
      <div className="skeleton skeleton-text" style={{ width: '35%' }} />
      {[0, 1, 2].map(i => (
        <div key={i} className="flex flex-col gap-2">
          <div className="flex justify-between">
            <div className="skeleton skeleton-text" style={{ width: '40%' }} />
            <div className="skeleton skeleton-text" style={{ width: '20%' }} />
          </div>
          <div className="progress-track">
            <div className="skeleton" style={{ width: `${70 - i * 20}%`, height: '100%' }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const EmptyState: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => (
  <div className="glass p-10 flex flex-col items-center gap-5 text-center animate-fade-in-scale">
    <div style={{
      width: 72, height: 72,
      borderRadius: '50%',
      background: 'var(--primary-bg)',
      border: '1px solid rgba(99,102,241,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <ShoppingBag size={32} color="var(--primary-light)" />
    </div>
    <div className="flex flex-col gap-2">
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>No orders yet</h3>
      <p style={{ fontSize: '0.875rem' }}>
        Your dashboard will populate once orders are recorded.
      </p>
    </div>
    <button className="btn-ghost" style={{ fontSize: '0.875rem' }} onClick={onRefresh}>
      <RefreshCcw size={16} />
      Refresh
    </button>
  </div>
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div
    className="glass p-8 flex flex-col items-center gap-5 text-center animate-fade-in-scale"
    style={{ borderColor: 'rgba(239,68,68,0.2)' }}
  >
    <div style={{
      width: 64, height: 64,
      borderRadius: '50%',
      background: 'var(--error-bg)',
      border: '1px solid rgba(239,68,68,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <AlertCircle size={28} color="var(--error-color)" />
    </div>
    <div className="flex flex-col gap-2">
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--error-color)' }}>
        Failed to load
      </h3>
      <p style={{ fontSize: '0.8rem' }}>{message}</p>
    </div>
    <button className="btn-primary" style={{ fontSize: '0.875rem' }} onClick={onRetry}>
      <RefreshCcw size={16} />
      Try Again
    </button>
  </div>
);

// KPI card is no longer used in the optimized dashboard

// ---- main component ---------------------------------------------------------

type DashboardPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all';

const ManagementDashboard: React.FC<DashboardProps> = ({ orders, onRefresh }) => {
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [showBalance, setShowBalance] = useState<boolean>(() => {
    return localStorage.getItem('show_balance') !== 'false';
  });
  const [showAllBestSellers, setShowAllBestSellers] = useState<boolean>(false);

  const toggleBalance = () => {
    setShowBalance(prev => {
      localStorage.setItem('show_balance', (!prev).toString());
      return !prev;
    });
  };

  // Smart Expense Detection
  const isExpense = (o: Order): boolean => {
    const note = (o.raw_note || '').toLowerCase();
    const item = (o.item_name || '').toLowerCase();
    return (
      note.includes('chi ') ||
      note.includes('mua ') ||
      note.includes('nhập ') ||
      note.includes('phí ') ||
      item.includes('chi phí') ||
      item.includes('mua ') ||
      o.total_price < 0
    );
  };

  const now = new Date();
  
  // Date checkers
  const checkDate = {
    today: (dStr: string) => {
      const d = new Date(dStr);
      return d.toDateString() === now.toDateString();
    },
    yesterday: (dStr: string) => {
      const d = new Date(dStr);
      const yes = new Date();
      yes.setDate(now.getDate() - 1);
      return d.toDateString() === yes.toDateString();
    },
    week: (dStr: string) => {
      const d = new Date(dStr);
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      return d >= startOfWeek && d <= endOfWeek;
    },
    month: (dStr: string) => {
      const d = new Date(dStr);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    },
    year: (dStr: string) => {
      const d = new Date(dStr);
      return d.getFullYear() === now.getFullYear();
    },
    all: () => true
  };

  const computedData = useMemo(() => {
    return fold(
      orders,
      () => null,
      () => null,
      () => null,
      (data) => {
        // Filter orders based on the selected period
        const filteredOrders = data.filter(o => {
          if (period === 'all') return true;
          return checkDate[period](o.timestamp);
        });

        // Split into sales and expenses
        const sales = filteredOrders.filter(o => !isExpense(o));
        const expensesList = filteredOrders.filter(o => isExpense(o));

        const totalRevenue = sales.reduce((sum, o) => sum + o.total_price, 0);
        const totalExpenses = expensesList.reduce((sum, o) => sum + Math.abs(o.total_price), 0);
        const netProfit = totalRevenue - totalExpenses;

        // Group items for Best Sellers list
        const itemBreakdown = sales.reduce((acc, o) => {
          acc[o.item_name] = (acc[o.item_name] || 0) + o.quantity;
          return acc;
        }, {} as Record<string, number>);

        const sortedItems = Object.entries(itemBreakdown).sort((a, b) => b[1] - a[1]);
        const maxQty = sortedItems[0]?.[1] ?? 1;

        // Construct chart points based on the period
        let chartPoints: { label: string; value: number }[] = [];
        const mm = String(now.getMonth() + 1).padStart(2, '0');

        if (period === 'today' || period === 'yesterday') {
          // Group by 4 intervals: 08:00, 13:00, 18:00, 23:00
          const hours = [8, 13, 18, 23];
          chartPoints = hours.map(h => {
            const hStr = String(h).padStart(2, '0') + ':00';
            const val = sales.filter(o => {
              const od = new Date(o.timestamp);
              // Group orders into nearest window
              if (h === 8) return od.getHours() <= 8;
              if (h === 13) return od.getHours() > 8 && od.getHours() <= 13;
              if (h === 18) return od.getHours() > 13 && od.getHours() <= 18;
              return od.getHours() > 18;
            }).reduce((sum, o) => sum + o.total_price, 0);
            return { label: hStr, value: val };
          });
        } else if (period === 'week') {
          // Group by 7 weekdays
          const daysOfWeek = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
          chartPoints = daysOfWeek.map((dayName, index) => {
            // Index: 0 for Monday (getDay = 1), 6 for Sunday (getDay = 0)
            const targetDay = index === 6 ? 0 : index + 1;
            const val = sales.filter(o => {
              const od = new Date(o.timestamp);
              return od.getDay() === targetDay;
            }).reduce((sum, o) => sum + o.total_price, 0);
            return { label: dayName, value: val };
          });
        } else if (period === 'month') {
          // Group by weeks of the month or 5-day blocks to fit perfectly
          const dates = [1, 8, 15, 22, 29];
          chartPoints = dates.map(d => {
            const dateStr = `${String(d).padStart(2, '0')}/${mm}`;
            const val = sales.filter(o => {
              const od = new Date(o.timestamp);
              // Group orders around this date
              if (d === 1) return od.getDate() <= 7;
              if (d === 8) return od.getDate() > 7 && od.getDate() <= 14;
              if (d === 15) return od.getDate() > 14 && od.getDate() <= 21;
              if (d === 22) return od.getDate() > 21 && od.getDate() <= 28;
              return od.getDate() > 28;
            }).reduce((sum, o) => sum + o.total_price, 0);
            return { label: dateStr, value: val };
          });
        } else if (period === 'year') {
          // Group by months of the year: 6 intervals (bi-monthly)
          const labels = ['T1-2', 'T3-4', 'T5-6', 'T7-8', 'T9-10', 'T11-12'];
          chartPoints = labels.map((l, index) => {
            const months = [index * 2, index * 2 + 1];
            const val = sales.filter(o => {
              const od = new Date(o.timestamp);
              return od.getFullYear() === now.getFullYear() && months.includes(od.getMonth());
            }).reduce((sum, o) => sum + o.total_price, 0);
            return { label: l, value: val };
          });
        } else {
          // All Time - split into 5 chronological periods
          if (sales.length === 0) {
            chartPoints = [{ label: '01/05', value: 0 }];
          } else {
            const sortedSales = [...sales].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            const firstDate = new Date(sortedSales[0].timestamp);
            const lastDate = new Date(sortedSales[sortedSales.length - 1].timestamp);
            const diffTime = Math.max(1, lastDate.getTime() - firstDate.getTime());
            const step = diffTime / 4;

            chartPoints = Array.from({ length: 5 }).map((_, idx) => {
              const targetTime = firstDate.getTime() + step * idx;
              const targetDate = new Date(targetTime);
              const lbl = `${String(targetDate.getDate()).padStart(2, '0')}/${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
              // Count sales in this bucket
              const bucketStart = targetTime - step / 2;
              const bucketEnd = targetTime + step / 2;
              const val = sales.filter(o => {
                const t = new Date(o.timestamp).getTime();
                return t >= bucketStart && t < bucketEnd;
              }).reduce((sum, o) => sum + o.total_price, 0);
              return { label: lbl, value: val };
            });
          }
        }

        // Add dummy point if only 1 point to keep the chart beautiful
        if (chartPoints.length === 1) {
          chartPoints = [{ label: 'Start', value: 0 }, ...chartPoints];
        }

        // Calculate peak index for styling
        let peakIdx = 0;
        let maxVal = 0;
        chartPoints.forEach((p, idx) => {
          if (p.value > maxVal) {
            maxVal = p.value;
            peakIdx = idx;
          }
        });

        return {
          totalRevenue,
          totalExpenses,
          netProfit,
          itemBreakdown: sortedItems,
          maxQty,
          chartPoints,
          peakIdx,
          maxVal,
          count: filteredOrders.length
        };
      }
    );
  }, [orders, period]);

  // Generate SVG Bezier Path
  const svgPath = useMemo(() => {
    if (!computedData || !computedData.chartPoints || computedData.chartPoints.length === 0) return { line: '', area: '', points: [] };
    
    const pts = computedData.chartPoints;
    const width = 500;
    const height = 180;
    const paddingX = 35;
    const paddingY = 30;
    
    const xStep = (width - paddingX * 2) / (pts.length - 1);
    const maxVal = computedData.maxVal || 1;
    
    const points = pts.map((p, idx) => {
      const x = paddingX + idx * xStep;
      // Map y from height-paddingY (0 value) to paddingY (max value)
      const y = (height - paddingY) - (p.value / maxVal) * (height - paddingY * 2);
      return { x, y, label: p.label, value: p.value };
    });

    if (points.length === 0) return { line: '', area: '', points: [] };
    
    // Draw Bezier Line
    let line = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      line += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    
    // Draw Closed Area
    const area = `${line} L ${points[points.length - 1].x} ${height - 10} L ${points[0].x} ${height - 10} Z`;
    
    return { line, area, points };
  }, [computedData]);

  const activePeriodLabel = {
    today: 'Hôm nay',
    yesterday: 'Hôm qua',
    week: 'Tuần này',
    month: 'Tháng này',
    year: 'Năm này',
    all: 'Khác'
  }[period];

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-16">
      {/* ── Page Header ────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', lineHeight: 1.2 }}>Quản lý doanh thu</h2>
          {computedData && (
            <p style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
              {computedData.count} giao dịch trong kỳ
            </p>
          )}
        </div>
        <button
          id="dashboard-refresh-btn"
          onClick={onRefresh}
          className="btn-icon"
          aria-label="Refresh dashboard"
          title="Refresh"
        >
          <RefreshCcw
            size={18}
            style={{
              transition: 'transform 0.4s ease',
              transform: orders._tag === 'Loading' ? 'rotate(360deg)' : 'none',
              animation: orders._tag === 'Loading' ? 'spin 1s linear infinite' : 'none',
            }}
          />
        </button>
      </div>

      {/* ── Period Filters Pill Bar ── */}
      <div className="top-filters-container">
        <div className="top-filters-scroll">
          {([
            { id: 'today', name: 'Hôm nay' },
            { id: 'yesterday', name: 'Hôm qua' },
            { id: 'week', name: 'Tuần này' },
            { id: 'month', name: 'Tháng này' },
            { id: 'year', name: 'Năm này' },
            { id: 'all', name: 'Khác' }
          ] as { id: DashboardPeriod; name: string }[]).map((pill) => (
            <button
              key={pill.id}
              onClick={() => {
                setPeriod(pill.id);
                setShowAllBestSellers(false);
              }}
              className={`filter-pill ${period === pill.id ? 'active' : ''}`}
            >
              {pill.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content States ────────────────────────────── */}
      {fold(
        orders,
        // NotAsked
        () => <EmptyState onRefresh={onRefresh} />,

        // Loading
        () => <SkeletonDashboard />,

        // Failure
        (err) => <ErrorState message={err.message} onRetry={onRefresh} />,

        // Success
        () => computedData && (
          <div className="flex flex-col gap-5">

            {/* ── Revenue Chart Card ── */}
            <div className="chart-card">
              <span className="kpi-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Doanh thu</span>
              
              <div className="chart-container">
                <svg className="chart-svg" viewBox="0 0 500 180" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="30" y1="30" x2="470" y2="30" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />
                  <line x1="30" y1="85" x2="470" y2="85" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />
                  <line x1="30" y1="140" x2="470" y2="140" stroke="var(--border-color)" strokeWidth="0.8" />

                  {/* Filled Area */}
                  {svgPath.area && (
                    <path d={svgPath.area} fill="url(#chartGradient)" className="chart-area" />
                  )}

                  {/* Bezier Curve Line */}
                  {svgPath.line && (
                    <path
                      d={svgPath.line}
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="chart-line"
                    />
                  )}

                  {/* Data Points / Dots & Text Labels */}
                  {svgPath.points.map((p, idx) => {
                    const isPeak = idx === computedData.peakIdx && p.value > 0;
                    const isStart = idx === 0;
                    const shouldShowLabel = isPeak || (isStart && svgPath.points.length > 2);

                    return (
                      <g key={idx}>
                        {/* Dot */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isPeak ? "5.5" : "3.5"}
                          fill={isPeak ? "#3b82f6" : "var(--bg-secondary)"}
                          stroke="#3b82f6"
                          strokeWidth={isPeak ? "3.5" : "2"}
                          className="chart-dot"
                        />
                        
                        {/* Dynamic Tooltip/Label */}
                        {shouldShowLabel && (
                          <g>
                            {/* Value label */}
                            <text
                              x={p.x}
                              y={p.y - 12}
                              textAnchor="middle"
                              fill="var(--text-main)"
                              fontSize="0.75rem"
                              fontWeight="700"
                              style={{
                                background: 'var(--bg-secondary)',
                                padding: '2px 4px',
                                borderRadius: '4px'
                              }}
                            >
                              {formatCurrencyCompact(p.value)}
                            </text>
                          </g>
                        )}

                        {/* X-Axis labels at the very bottom */}
                        {idx % Math.max(1, Math.floor(svgPath.points.length / 5)) === 0 && (
                          <text
                            x={p.x}
                            y="165"
                            textAnchor="middle"
                            fill="var(--text-dim)"
                            fontSize="0.7rem"
                            fontWeight="500"
                          >
                            {p.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* ── Dual Columns Summary Card ── */}
            <div className="glass p-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              
              {/* Left Column: Chi tiêu trong kỳ */}
              <div className="flex flex-col gap-1 pr-4" style={{ borderRight: '1px solid var(--border-color)' }}>
                <span className="flex items-center gap-1" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Chi {activePeriodLabel.toLowerCase()}
                  <ChevronRight size={12} className="text-slate-400" />
                </span>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {formatCurrencyCompact(computedData.totalExpenses)}
                </span>
              </div>

              {/* Right Column: Doanh thu - Chi phí */}
              <div className="flex flex-col gap-1 pl-1">
                <span className="flex items-center justify-between gap-1" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  <span>Doanh thu - Chi phí</span>
                  <button 
                    onClick={toggleBalance} 
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    style={{ minHeight: 'auto', minWidth: 'auto', padding: '2px' }}
                  >
                    {showBalance ? <Eye size={13} className="text-slate-400" /> : <EyeOff size={13} className="text-slate-400" />}
                  </button>
                </span>
                <span className={`privacy-value ${!showBalance ? 'blur' : ''}`} style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2563eb' }}>
                  {showBalance ? `+${formatCurrencyCompact(computedData.netProfit)}` : '••••••'}
                </span>
              </div>
            </div>

            {/* ── Best Sellers Card ── */}
            <div className="glass p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span className="section-title" style={{ fontSize: '0.85rem', textTransform: 'none', fontWeight: 600 }}>
                  Hàng hóa bán chạy
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  {computedData.itemBreakdown.length} sản phẩm
                </span>
              </div>

              {computedData.itemBreakdown.length === 0 ? (
                <p className="text-center py-6 text-sm text-[var(--text-dim)]">Không có sản phẩm nào bán chạy trong kỳ.</p>
              ) : (
                <div className="flex flex-col">
                  {(showAllBestSellers 
                    ? computedData.itemBreakdown 
                    : computedData.itemBreakdown.slice(0, 3)
                  ).map(([item, qty], idx) => {
                    return (
                      <div key={item} className="best-seller-row flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-1" style={{ minWidth: 0 }}>
                          <span className="best-seller-index">{idx + 1}</span>
                          <span className="best-seller-name truncate">{item}</span>
                        </div>
                        <span className="best-seller-qty" style={{ color: '#2563eb', fontWeight: 700 }}>
                          x{qty}
                        </span>
                      </div>
                    );
                  })}
                  
                  {computedData.itemBreakdown.length > 3 && (
                    <button 
                      onClick={() => setShowAllBestSellers(prev => !prev)}
                      className="btn-ghost w-full text-center mt-3 pt-2 text-xs font-semibold text-blue-500 hover:text-blue-600"
                      style={{ minHeight: '32px', padding: '4px 0' }}
                    >
                      {showAllBestSellers ? 'Thu gọn' : 'Xem tất cả'}
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        )
      )}
    </div>
  );
};

export default ManagementDashboard;

