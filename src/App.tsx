import { useState, useCallback } from 'react';
import { PlusCircle, BarChart3, Settings, LogOut, AlertTriangle } from 'lucide-react';
import type { Order, RemoteData } from './types';
import { notAsked, loading, success, failure } from './types';
import AuthBarrier from './components/AuthBarrier';
import OrderInput from './components/OrderInput';
import ManagementDashboard from './components/ManagementDashboard';

const isValidUrl = (url: string) => {
  if (!url) return true;
  return url.trim().startsWith('https://script.google.com/') && url.includes('/macros/s/') && url.includes('/exec');
};

function App() {
  const [password, setPassword] = useState<string>('');
  const [apiUrl, setApiUrl] = useState<string>(localStorage.getItem('api_url') || '');
  const [activeTab, setActiveTab] = useState<'add' | 'manage'>('add');
  const [orders, setOrders] = useState<RemoteData<Error, Order[]>>(notAsked());
  const [showSettings, setShowSettings] = useState(false);

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

  const handleSaveSettings = () => {
    localStorage.setItem('api_url', apiUrl);
    setShowSettings(false);
    if (password && apiUrl) fetchOrders(password, apiUrl);
  };

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
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(true)} className="btn-ghost p-2 rounded-full">
            <Settings size={20} />
          </button>
          <button onClick={handleLogout} className="btn-ghost p-2 rounded-full text-red-400">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container pb-24">
        {!apiUrl && !showSettings && (
          <div className="glass p-8 text-center animate-fade-in flex flex-col gap-4">
            <h2 className="text-xl font-bold">Setup Required</h2>
            <p>Please configure your Google Apps Script URL in the settings to start.</p>
            <button onClick={() => setShowSettings(true)} className="btn-primary">
              Open Settings
            </button>
          </div>
        )}

        {apiUrl && !isValidUrl(apiUrl) && (
          <div className="glass p-8 text-center animate-fade-in flex flex-col gap-6 border border-red-500/20">
            <div className="flex flex-col items-center gap-4 text-red-400">
              <div className="p-4 rounded-full bg-red-500/10">
                <AlertTriangle size={48} />
              </div>
              <h2 className="text-2xl font-bold">Incorrect URL Configured</h2>
            </div>
            <p className="text-sm text-slate-300">
              You configured a <strong>Google Sheets Spreadsheet URL</strong> (<code>docs.google.com</code>) instead of your <strong>Google Apps Script Web App Deployment URL</strong>.
            </p>
            <div className="p-4 rounded-xl bg-slate-800/50 text-left flex flex-col gap-2">
              <span className="text-xs text-slate-400">Expected Format:</span>
              <code className="text-xs text-indigo-400 select-all break-all">
                https://script.google.com/macros/s/.../exec
              </code>
            </div>
            <button onClick={() => setShowSettings(true)} className="btn-primary">
              Fix Configuration
            </button>
          </div>
        )}

        {apiUrl && isValidUrl(apiUrl) && (
          activeTab === 'add' ? (
            <OrderInput apiUrl={apiUrl} password={password} />
          ) : (
            <ManagementDashboard orders={orders} onRefresh={() => fetchOrders(password, apiUrl)} />
          )
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 p-4 pb-safe flex-center">
        <div className="glass w-full max-w-sm px-2 py-2 flex items-center justify-around gap-2">
          <button 
            onClick={() => setActiveTab('add')}
            className={`btn-ghost flex-1 py-3 ${activeTab === 'add' ? 'active' : ''}`}
          >
            <PlusCircle size={20} />
            <span>Add Order</span>
          </button>
          <button 
            onClick={() => setActiveTab('manage')}
            className={`btn-ghost flex-1 py-3 ${activeTab === 'manage' ? 'active' : ''}`}
          >
            <BarChart3 size={20} />
            <span>Management</span>
          </button>
        </div>
      </nav>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass p-8 w-full max-w-md animate-fade-in flex flex-col gap-6">
            <h2 className="text-2xl font-bold">Settings</h2>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-slate-400">Google Apps Script Web App URL</label>
              <input 
                type="text" 
                value={apiUrl} 
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className={apiUrl && !isValidUrl(apiUrl) ? 'border-red-500/50 focus:border-red-500' : ''}
              />
              {apiUrl && !isValidUrl(apiUrl) && (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                  <AlertTriangle size={12} />
                  <span>Must be a Web App URL ending in /exec. Do not use your Sheet spreadsheet URL!</span>
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSettings(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleSaveSettings} className="btn-primary flex-1">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </AuthBarrier>
  );
}

export default App;
