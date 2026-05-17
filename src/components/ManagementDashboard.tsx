import React, { useMemo, useState } from 'react';
import type { Order, RemoteData } from '../types';
import { fold } from '../types';
import {
  TrendingUp, Package, Calendar, RefreshCcw,
  AlertCircle, ShoppingBag, Clock, Users
} from 'lucide-react';

interface DashboardProps {
  orders: RemoteData<Error, Order[]>;
  onRefresh: () => void;
}

type Period = 'today' | 'month' | 'year';

// ---- helpers ----------------------------------------------------------------

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const formatCurrencyCompact = (val: number): string => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M ₫`;
  if (val >= 1_000)     return `${(val / 1_000).toFixed(0)}k ₫`;
  return formatCurrency(val);
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

const RANK_BADGE: Record<number, string> = {
  0: 'badge badge-gold',
  1: 'badge badge-silver',
  2: 'badge badge-bronze',
};

const RANK_LABEL = ['🥇', '🥈', '🥉'];

const FILL_COLORS = [
  '#6366f1', '#10b981', '#f59e0b',
  '#06b6d4', '#ec4899', '#8b5cf6',
];

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

interface KpiCardProps {
  variant: 'today' | 'month' | 'year';
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ variant, label, value, sub, icon, iconBg }) => (
  <div className={`kpi-card ${variant} animate-fade-in`}>
    <div className="flex items-center justify-between">
      <span className="kpi-label">{label}</span>
      <div className="kpi-icon" style={{ background: iconBg }}>{icon}</div>
    </div>
    <div className="kpi-value">{value}</div>
    <div className="kpi-sub">{sub}</div>
  </div>
);

// ---- main component ---------------------------------------------------------

const ManagementDashboard: React.FC<DashboardProps> = ({ orders, onRefresh }) => {
  const [period, setPeriod] = useState<Period>('today');

  const stats = useMemo(() => {
    return fold(
      orders,
      () => null,
      () => null,
      () => null,
      (data) => {
        const now      = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const monthStr = now.toISOString().slice(0, 7);
        const yearStr  = now.getFullYear().toString();

        const todayOrders = data.filter(o => o.timestamp.toString().startsWith(todayStr));
        const monthOrders = data.filter(o => o.timestamp.toString().startsWith(monthStr));
        const yearOrders  = data.filter(o => o.timestamp.toString().startsWith(yearStr));

        const sum = (arr: Order[]) => arr.reduce((s, o) => s + o.total_price, 0);

        const itemBreakdown = data.reduce((acc, o) => {
          acc[o.item_name] = (acc[o.item_name] || 0) + o.quantity;
          return acc;
        }, {} as Record<string, number>);

        const sortedItems = Object.entries(itemBreakdown).sort((a, b) => b[1] - a[1]);
        const maxQty      = sortedItems[0]?.[1] ?? 1;

        const recent = [...data]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10);

        return {
          today:  { total: sum(todayOrders),  count: todayOrders.length  },
          month:  { total: sum(monthOrders),  count: monthOrders.length  },
          year:   { total: sum(yearOrders),   count: yearOrders.length   },
          all:    { total: sum(data),         count: data.length          },
          itemBreakdown: sortedItems,
          maxQty,
          recent,
        };
      }
    );
  }, [orders]);

  // Highlight filtered stats by period
  const periodStats = useMemo(() => {
    if (!stats) return null;
    return {
      today: stats.today,
      month: stats.month,
      year:  stats.year,
    }[period];
  }, [stats, period]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* ── Page Header ────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', lineHeight: 1.2 }}>Dashboard</h2>
          {stats && (
            <p style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
              {stats.all.count} total orders
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

      {/* ── Content ───────────────────────────────────── */}
      {fold(
        orders,
        // NotAsked
        () => <EmptyState onRefresh={onRefresh} />,

        // Loading
        () => <SkeletonDashboard />,

        // Failure
        (err) => <ErrorState message={err.message} onRetry={onRefresh} />,

        // Success
        () => stats && (
          <div className="flex flex-col gap-6">

            {/* ── KPI Cards ── */}
            <div className="kpi-scroll stagger">
              <KpiCard
                variant="today"
                label="Today"
                value={formatCurrencyCompact(stats.today.total)}
                sub={`${stats.today.count} order${stats.today.count !== 1 ? 's' : ''}`}
                icon={<TrendingUp size={16} color="var(--kpi-today)" />}
                iconBg="var(--kpi-today-bg)"
              />
              <KpiCard
                variant="month"
                label="This Month"
                value={formatCurrencyCompact(stats.month.total)}
                sub={`${stats.month.count} order${stats.month.count !== 1 ? 's' : ''}`}
                icon={<Calendar size={16} color="var(--kpi-month)" />}
                iconBg="var(--kpi-month-bg)"
              />
              <KpiCard
                variant="year"
                label="This Year"
                value={formatCurrencyCompact(stats.year.total)}
                sub={`${stats.year.count} order${stats.year.count !== 1 ? 's' : ''}`}
                icon={<Package size={16} color="var(--kpi-year)" />}
                iconBg="var(--kpi-year-bg)"
              />
            </div>

            {/* ── Period Detail Card ── */}
            <div className="glass p-5 flex flex-col gap-4">
              {/* Period Tabs */}
              <div className="period-tabs" role="tablist" aria-label="Time period">
                {(['today', 'month', 'year'] as Period[]).map((p) => (
                  <button
                    key={p}
                    id={`period-tab-${p}`}
                    role="tab"
                    aria-selected={period === p}
                    className={`period-tab ${period === p ? 'active' : ''}`}
                    onClick={() => setPeriod(p)}
                  >
                    {p === 'today' ? 'Today' : p === 'month' ? 'Month' : 'Year'}
                  </button>
                ))}
              </div>

              {/* Selected period stats */}
              {periodStats && (
                <div
                  className="animate-fade-in-scale"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                  }}
                >
                  <div className="glass-sm p-4 flex flex-col gap-1">
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Revenue
                    </span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {formatCurrencyCompact(periodStats.total)}
                    </span>
                  </div>
                  <div className="glass-sm p-4 flex flex-col gap-1">
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Orders
                    </span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {periodStats.count}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Item Breakdown ── */}
            <div className="glass p-5 flex flex-col gap-4">
              <div className="section-header">
                <span className="section-title">
                  <Package size={12} style={{ display: 'inline' }} />
                  Item Breakdown
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  {stats.itemBreakdown.length} items
                </span>
              </div>

              <div className="flex flex-col gap-4">
                {stats.itemBreakdown.map(([item, qty], idx) => {
                  const pct   = Math.round((qty / stats.maxQty) * 100);
                  const color = FILL_COLORS[idx % FILL_COLORS.length];
                  const rankClass = RANK_BADGE[idx] ?? 'badge badge-default';
                  const rankLabel = RANK_LABEL[idx] ?? `#${idx + 1}`;

                  return (
                    <div key={item} className="flex flex-col gap-1.5 animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                          <span className={rankClass}>{rankLabel}</span>
                          <span style={{
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: 'var(--text-main)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {item}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color,
                          flexShrink: 0,
                        }}>
                          {qty} <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 400 }}>units</span>
                        </span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${pct}%`, '--fill-color': color } as React.CSSProperties}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Recent Orders ── */}
            {stats.recent.length > 0 && (
              <div className="glass p-5 flex flex-col gap-1">
                <div className="section-header" style={{ marginBottom: '0.5rem' }}>
                  <span className="section-title">
                    <Clock size={12} style={{ display: 'inline' }} />
                    Recent Orders
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Users size={12} color="var(--text-dim)" />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      Last {stats.recent.length}
                    </span>
                  </div>
                </div>

                {stats.recent.map((order, idx) => (
                  <div key={`${order.timestamp}-${idx}`} className="order-row animate-fade-in" style={{ animationDelay: `${idx * 0.04}s` }}>
                    <div className="order-avatar">
                      {getInitials(order.customer_name || '?')}
                    </div>
                    <div className="order-meta">
                      <div className="order-customer">{order.customer_name || 'Unknown'}</div>
                      <div className="order-detail">
                        {order.quantity}× {order.item_name}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.1rem' }}>
                      <div className="order-price">{formatCurrencyCompact(order.total_price)}</div>
                      <div className="order-time">{timeAgo(order.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )
      )}
    </div>
  );
};

export default ManagementDashboard;
