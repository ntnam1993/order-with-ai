import React, { useMemo } from 'react';
import type { Order, RemoteData } from '../types';
import { fold } from '../types';
import { TrendingUp, Package, Calendar, RefreshCcw, Loader2 } from 'lucide-react';

interface DashboardProps {
  orders: RemoteData<Error, Order[]>;
  onRefresh: () => void;
}

const ManagementDashboard: React.FC<DashboardProps> = ({ orders, onRefresh }) => {
  const stats = useMemo(() => {
    return fold(
      orders,
      () => null,
      () => null,
      () => null,
      (data) => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const monthStr = now.toISOString().slice(0, 7);
        const yearStr = now.getFullYear().toString();

        const todayTotal = data
          .filter(o => o.timestamp.toString().startsWith(todayStr))
          .reduce((sum, o) => sum + o.total_price, 0);

        const monthTotal = data
          .filter(o => o.timestamp.toString().startsWith(monthStr))
          .reduce((sum, o) => sum + o.total_price, 0);

        const yearTotal = data
          .filter(o => o.timestamp.toString().startsWith(yearStr))
          .reduce((sum, o) => sum + o.total_price, 0);

        const itemBreakdown = data.reduce((acc, o) => {
          acc[o.item_name] = (acc[o.item_name] || 0) + o.quantity;
          return acc;
        }, {} as Record<string, number>);

        return { todayTotal, monthTotal, yearTotal, itemBreakdown };
      }
    );
  }, [orders]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <button onClick={onRefresh} className="btn-ghost p-2 rounded-full">
          <RefreshCcw size={20} className={orders._tag === 'Loading' ? 'animate-spin' : ''} />
        </button>
      </div>

      {fold(
        orders,
        () => <p>No data yet.</p>,
        () => (
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 className="animate-spin text-indigo-500" size={48} />
            <p>Fetching your orders...</p>
          </div>
        ),
        (err) => <p className="text-red-500">Error: {err.message}</p>,
        () => (
          <div className="flex flex-col gap-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard 
                title="Today" 
                value={formatCurrency(stats?.todayTotal || 0)} 
                icon={<TrendingUp className="text-emerald-500" />} 
              />
              <StatCard 
                title="This Month" 
                value={formatCurrency(stats?.monthTotal || 0)} 
                icon={<Calendar className="text-indigo-500" />} 
              />
              <StatCard 
                title="This Year" 
                value={formatCurrency(stats?.yearTotal || 0)} 
                icon={<Package className="text-amber-500" />} 
              />
            </div>

            {/* Item Breakdown */}
            <div className="glass p-6 flex flex-col gap-4">
              <h3 className="font-semibold text-sm text-indigo-400 uppercase tracking-wider">Item Breakdown</h3>
              <div className="flex flex-col gap-3">
                {Object.entries(stats?.itemBreakdown || {}).sort((a, b) => b[1] - a[1]).map(([item, qty]) => (
                  <div key={item} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-slate-300">{item}</span>
                    <span className="font-bold text-indigo-400">{qty} units</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) => (
  <div className="glass p-6 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-slate-400">{title}</span>
      <div className="p-2 rounded-lg bg-white/5">{icon}</div>
    </div>
    <span className="text-2xl font-bold">{value}</span>
  </div>
);

export default ManagementDashboard;
