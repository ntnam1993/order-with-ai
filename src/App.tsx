import { useState, useCallback, useEffect } from 'react';
import { PlusCircle, BarChart3, AlertTriangle, Sun, Moon, Monitor, Search, Sparkles } from 'lucide-react';
import type { Order, RemoteData } from './types';
import { notAsked, loading, success, failure, fold } from './types';
import AuthBarrier from './components/AuthBarrier';
import OrderInput from './components/OrderInput';
import ManagementDashboard from './components/ManagementDashboard';
import SettingsView from './components/SettingsView';

type Theme = 'light' | 'dark' | 'system';
type ActiveTab = 'overview' | 'invoices' | 'add' | 'expenses' | 'settings';

const isValidUrl = (url: string) => {
  if (!url) return true;
  return url.trim().startsWith('https://script.google.com/') && url.includes('/macros/s/') && url.includes('/exec');
};

// ---- INVOICES VIEW (HOÁ ĐƠN) ------------------------------------------------
interface InvoicesViewProps {
  orders: RemoteData<Error, Order[]>;
  onRefresh: () => void;
}

const InvoicesView: React.FC<InvoicesViewProps> = ({ orders, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return fold(
    orders,
    () => <div className="text-center py-8">Chưa có dữ liệu.</div>,
    () => (
      <div className="animate-pulse flex flex-col gap-4 py-8">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 w-full" />)}
      </div>
    ),
    (err) => <div className="text-center text-red-500 py-8">Lỗi: {err.message}</div>,
    (data) => {
      // Filter out expenses and search
      const filtered = data
        .filter(o => !isExpense(o))
        .filter(o =>
          (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
          (o.item_name || '').toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const totalPages = Math.ceil(filtered.length / itemsPerPage);
      const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

      return (
        <div className="flex flex-col gap-4 animate-fade-in pb-16">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-xl font-bold">Danh sách hoá đơn</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} hoá đơn bán lẻ</p>
            </div>
            <button onClick={onRefresh} className="btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
            </button>
          </div>

          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Tìm theo khách hàng hoặc tên hàng..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-blue-400/10 transition-all text-sm outline-none"
            />
          </div>

          <div className="flex flex-col gap-3">
            {paginated.length === 0 ? (
              <div className="glass p-8 text-center text-slate-400">Không tìm thấy hoá đơn nào.</div>
            ) : (
              paginated.map((invoice, idx) => (
                <div key={idx} className="glass p-4 flex flex-col gap-2 hover:border-blue-500/20 transition-all" style={{ padding: '1rem' }}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {(invoice.customer_name || 'K')[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-50 text-[0.95rem]">
                          {invoice.customer_name || 'Khách vãng lai'}
                        </span>
                        <p className="text-[0.72rem] text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(invoice.timestamp)}</p>
                      </div>
                    </div>
                    <span className="font-bold text-blue-500 text-base">
                      {formatCurrency(invoice.total_price)}
                    </span>
                  </div>
                  <div className="mt-2 p-3 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-100/50 dark:border-slate-800/40 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                      <span className="truncate pr-4">{invoice.item_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold tabular-nums">
                        x{invoice.quantity}
                      </span>
                    </div>
                    {invoice.raw_note && (
                      <div className="flex items-center gap-1.5 text-[0.72rem] text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 px-2.5 py-1.5 rounded-lg border border-indigo-100/30 dark:border-indigo-900/10 max-w-full">
                        <Sparkles size={12} className="flex-shrink-0 text-indigo-500/80 dark:text-indigo-400/80" />
                        <span className="italic truncate" title={invoice.raw_note}>"{invoice.raw_note}"</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-4">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="btn-ghost px-3 py-1 text-sm min-h-0"
              >
                Trước
              </button>
              <span className="text-sm text-slate-400">Trang {page} / {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="btn-ghost px-3 py-1 text-sm min-h-0"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      );
    }
  );
};

// ---- EXPENSES VIEW (CHI PHÍ) ------------------------------------------------
interface ExpensesViewProps {
  orders: RemoteData<Error, Order[]>;
  onRefresh: () => void;
}

const ExpensesView: React.FC<ExpensesViewProps> = ({ orders, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return fold(
    orders,
    () => <div className="text-center py-8">Chưa có dữ liệu.</div>,
    () => (
      <div className="animate-pulse flex flex-col gap-4 py-8">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 w-full" />)}
      </div>
    ),
    (err) => <div className="text-center text-red-500 py-8">Lỗi: {err.message}</div>,
    (data) => {
      // Filter expenses and search
      const filtered = data
        .filter(o => isExpense(o))
        .filter(o =>
          (o.item_name || '').toLowerCase().includes(search.toLowerCase()) ||
          (o.raw_note || '').toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const totalPages = Math.ceil(filtered.length / itemsPerPage);
      const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

      return (
        <div className="flex flex-col gap-4 animate-fade-in pb-16">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-xl font-bold">Danh sách chi tiêu</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} khoản chi phí</p>
            </div>
            <button onClick={onRefresh} className="btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
            </button>
          </div>

          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Tìm theo nội dung chi tiêu..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-blue-400/10 transition-all text-sm outline-none"
            />
          </div>

          <div className="flex flex-col gap-3">
            {paginated.length === 0 ? (
              <div className="glass p-8 text-center text-slate-400">Không tìm thấy khoản chi nào.</div>
            ) : (
              paginated.map((exp, idx) => (
                <div key={idx} className="glass p-4 flex flex-col gap-2 hover:border-red-500/20 transition-all animate-fade-in" style={{ borderColor: 'rgba(239, 68, 68, 0.08)', padding: '1rem' }}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {(exp.item_name || 'C')[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-50 text-[0.95rem]">
                          {exp.item_name || 'Chi tiêu'}
                        </span>
                        <p className="text-[0.72rem] text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(exp.timestamp)}</p>
                      </div>
                    </div>
                    <span className="font-bold text-red-500 text-base">
                      -{formatCurrency(Math.abs(exp.total_price))}
                    </span>
                  </div>
                  {exp.raw_note && (
                    <div className="mt-2 p-3 bg-red-50/30 dark:bg-red-950/10 rounded-xl border border-red-100/20 dark:border-red-900/10 flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-[0.72rem] text-red-600 dark:text-red-400 bg-red-50/60 dark:bg-red-950/20 px-2.5 py-1.5 rounded-lg border border-red-100/30 dark:border-red-900/10 max-w-full">
                        <Sparkles size={12} className="flex-shrink-0 text-red-500/80 dark:text-red-400/80" />
                        <span className="italic truncate" title={exp.raw_note}>"{exp.raw_note}"</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-4">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="btn-ghost px-3 py-1 text-sm min-h-0"
              >
                Trước
              </button>
              <span className="text-sm text-slate-400">Trang {page} / {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="btn-ghost px-3 py-1 text-sm min-h-0"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      );
    }
  );
};

// ---- MAIN APPLICATION SHELL -------------------------------------------------
function App() {
  const [password, setPassword] = useState<string>('');
  const [apiUrl, setApiUrl] = useState<string>(localStorage.getItem('api_url') || '');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [orders, setOrders] = useState<RemoteData<Error, Order[]>>(notAsked());
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('app_theme') as Theme) || 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (t: Theme) => {
      if (t === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.setAttribute('data-theme', systemTheme);
      } else {
        root.setAttribute('data-theme', t);
      }
    };

    applyTheme(theme);
    localStorage.setItem('app_theme', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const fetchOrders = useCallback(async (pwd: string, url: string) => {
    if (!url) return;
    setOrders(loading());
    try {
      const res = await fetch(`${url}?password=${encodeURIComponent(pwd)}`);
      const result = await res.json();
      if (result.success) {
        setOrders(success(result.data));
      } else {
        setOrders(failure(new Error(result.error)));
      }
    } catch (err) {
      setOrders(failure(err instanceof Error ? err : new Error('Unknown error')));
    }
  }, []);

  const handleAuth = useCallback((pwd: string) => {
    setPassword(pwd);
    if (apiUrl) fetchOrders(pwd, apiUrl);
  }, [apiUrl, fetchOrders]);

  const handleSaveSettings = useCallback((url: string) => {
    setApiUrl(url);
    localStorage.setItem('api_url', url);
    if (password && url && isValidUrl(url)) {
      fetchOrders(password, url);
      setActiveTab('overview');
    }
  }, [password, fetchOrders]);

  const handleLogout = () => {
    localStorage.removeItem('app_password');
    window.location.reload();
  };

  return (
    <AuthBarrier onAuth={handleAuth}>
      {/* Header */}
      <header className="glass m-4 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex-center text-white">
            <PlusCircle size={24} />
          </div>
          <h1 className="text-xl">OrderAI</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light')}
            className="btn-ghost p-2 rounded-full flex items-center justify-center"
            title={`Current Theme: ${theme.toUpperCase()}`}
            aria-label="Toggle theme"
          >
            {theme === 'light' && <Sun size={20} className="text-amber-500" />}
            {theme === 'dark' && <Moon size={20} className="text-indigo-400" />}
            {theme === 'system' && <Monitor size={20} className="text-slate-400" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container pb-28">
        {activeTab === 'settings' ? (
          <SettingsView
            apiUrl={apiUrl}
            onSaveUrl={handleSaveSettings}
            theme={theme}
            setTheme={setTheme}
            onLogout={handleLogout}
          />
        ) : !apiUrl ? (
          <div className="glass p-8 text-center animate-fade-in flex flex-col gap-4">
            <h2 className="text-xl font-bold">Cấu hình kết nối sheet</h2>
            <p>Please configure your Google Apps Script URL in the settings to start.</p>
            <button onClick={() => setActiveTab('settings')} className="btn-primary">
              Cài đặt ngay
            </button>
          </div>
        ) : !isValidUrl(apiUrl) ? (
          <div className="glass p-8 md:p-10 text-center animate-fade-in flex flex-col items-center gap-6 border border-red-500/15 dark:border-red-500/10 shadow-[0_8px_30px_rgba(239,68,68,0.04)] max-w-md mx-auto rounded-3xl">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 dark:text-red-400 flex items-center justify-center border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-red-600 dark:text-red-400 mt-2">
                Cấu hình link chưa đúng
              </h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn đang cấu hình <strong>đường dẫn bảng tính (Spreadsheet URL)</strong> thay vì <strong>đường dẫn Web App của Google Apps Script</strong>.
            </p>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60 text-left flex flex-col gap-2 w-full">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Định dạng đúng yêu cầu:</span>
              <code className="text-[0.7rem] font-mono text-indigo-600 dark:text-indigo-400 select-all break-all bg-indigo-50/30 dark:bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-100/30 dark:border-indigo-900/10">
                https://script.google.com/macros/s/.../exec
              </code>
            </div>

            <button
              onClick={() => setActiveTab('settings')}
              className="btn-primary w-full mt-4 py-3.5 flex items-center justify-center gap-2 hover:translate-y-[-1px] active:translate-y-[0px] transition-transform"
            >
              <span>Sửa cấu hình kết nối</span>
            </button>
          </div>
        ) : (
          (() => {
            switch (activeTab) {
              case 'overview':
                return <ManagementDashboard orders={orders} onRefresh={() => fetchOrders(password, apiUrl)} />;
              case 'invoices':
                return <InvoicesView orders={orders} onRefresh={() => fetchOrders(password, apiUrl)} />;
              case 'add':
                return <OrderInput apiUrl={apiUrl} password={password} />;
              case 'expenses':
                return <ExpensesView orders={orders} onRefresh={() => fetchOrders(password, apiUrl)} />;
              default:
                return null;
            }
          })()
        )}
      </main>

      {/* CURVED BOTTOM NAVIGATION DOCK */}
      <div className="bottom-dock-wrapper pb-safe">
        <div className="bottom-dock">
          {/* Background curved SVG overlay */}
          <div className="bottom-dock-bg">
            <svg className="bottom-dock-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
              <path d="M 0,0 L 38,0 C 43,0 42,26 50,26 C 58,26 57,0 62,0 L 100,0 L 100,40 L 0,40 Z" />
            </svg>
          </div>

          {/* 1. Overview */}
          <button
            onClick={() => setActiveTab('overview')}
            className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            aria-label="Tổng quan"
          >
            <BarChart3 size={18} />
            <span>Tổng quan</span>
          </button>

          {/* 2. Invoices */}
          <button
            onClick={() => setActiveTab('invoices')}
            className={`nav-tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
            aria-label="Hoá đơn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>
            <span>Hoá đơn</span>
          </button>

          {/* 3. Sales Raised Center Button (FAB) */}
          <div className="fab-container">
            <button
              onClick={() => setActiveTab('add')}
              className="fab-btn"
              aria-label="Bán hàng"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z" /><path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" /></svg>
            </button>
          </div>

          {/* 4. Expenses */}
          <button
            onClick={() => setActiveTab('expenses')}
            className={`nav-tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
            aria-label="Chi phí"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M16 12a2 2 0 0 0 0 4h5v-4z" /></svg>
            <span>Chi phí</span>
          </button>

          {/* 5. More */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`nav-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            aria-label="Nhiều hơn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
            <span>Nhiều hơn</span>
          </button>
        </div>
      </div>
    </AuthBarrier>
  );
}

export default App;
