import React, { useState } from 'react';
import {
  Globe,
  Save,
  LogOut,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ShieldAlert,
  Database
} from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

interface SettingsViewProps {
  apiUrl: string;
  onSaveUrl: (url: string) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onLogout: () => void;
}

const isValidUrl = (url: string) => {
  if (!url) return false;
  return url.trim().startsWith('https://script.google.com/') && url.includes('/macros/s/') && url.includes('/exec');
};

const SettingsView: React.FC<SettingsViewProps> = ({
  apiUrl,
  onSaveUrl,
  theme,
  setTheme,
  onLogout
}) => {
  const [localUrl, setLocalUrl] = useState(apiUrl);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    onSaveUrl(localUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const copyToClipboard = (text: string, stepId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepId);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  // Determine Connection Status
  const getStatus = () => {
    if (!localUrl) {
      return {
        text: 'Chưa cấu hình',
        colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-500/5 dark:border-amber-500/10',
        dotClass: 'bg-amber-500',
        desc: 'Vui lòng dán link Web App để đồng bộ dữ liệu.'
      };
    }
    if (!isValidUrl(localUrl)) {
      return {
        text: 'Đường dẫn không hợp lệ',
        colorClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/5 dark:border-rose-500/10',
        dotClass: 'bg-rose-500',
        desc: 'Đường dẫn phải bắt đầu bằng Google Apps Script /exec. Vui lòng kiểm tra lại.'
      };
    }
    return {
      text: 'Đã kết nối',
      colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/5 dark:border-emerald-500/10',
      dotClass: 'bg-emerald-500',
      desc: 'Sẵn sàng đồng bộ hóa với Google Sheets.'
    };
  };

  const status = getStatus();

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold">Nhiều hơn</h2>
        <p className="text-xs text-slate-400">Quản lý cấu hình hệ thống và giao diện</p>
      </div>

      {/* API Configuration Card */}
      <div className="glass p-6 flex flex-col gap-5" style={{ padding: "1rem" }}>
        <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/45 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
              <Database size={18} />
            </div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-blue-500 dark:text-blue-400">Cấu hình kết nối sheet</h3>
          </div>
          <span className={`badge border text-[0.7rem] px-2.5 py-1 flex items-center gap-1.5 font-semibold ${status.colorClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
            {status.text}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Google Apps Script Web App URL</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Globe size={18} />
              </div>
              <input
                type="text"
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className={`w-full text-base outline-none transition-all ${localUrl && !isValidUrl(localUrl)
                  ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/10'
                  : 'focus:border-blue-500 focus:ring-blue-500/10'
                  }`}
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>
            <p className="text-[0.72rem] text-slate-400 dark:text-slate-500 leading-normal">{status.desc}</p>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={handleSave}
              className={`btn-primary flex-1 py-3 flex items-center justify-center gap-2 transition-all ${saveSuccess ? 'bg-emerald-500 hover:bg-emerald-600' : ''
                }`}
            >
              {saveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />}
              <span>{saveSuccess ? 'Đã lưu cấu hình!' : 'Lưu cấu hình'}</span>
            </button>

            <button
              onClick={() => setShowGuide(!showGuide)}
              className="btn-ghost border border-slate-200/60 dark:border-slate-800/80 py-3 px-5 flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-850 dark:hover:text-slate-200"
            >
              <HelpCircle size={18} />
              <span className="text-sm">Hướng dẫn</span>
              {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Expandable Deployment Guide */}
        {showGuide && (
          <div className="border-t border-slate-200/50 dark:border-slate-800/40 pt-4 animate-fade-in flex flex-col gap-4">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>Hướng dẫn thiết lập Google Sheets & Web App</span>
            </h4>

            <div className="flex flex-col gap-4 text-xs text-slate-600 dark:text-slate-400">
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[0.7rem] flex-shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Tạo trang tính Google Sheets</p>
                  <p>Tạo một Google Sheet mới và đổi tên tab hiện tại thành <code className="bg-slate-100 dark:bg-slate-850 px-1 rounded font-mono font-bold text-slate-850 dark:text-slate-200">Orders</code>.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[0.7rem] flex-shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Thiết lập tiêu đề cột</p>
                  <p>Nhập tiêu đề cho hàng đầu tiên (cột A đến G) chính xác như sau:</p>
                  <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800/60 mt-1">
                    <code className="font-mono text-[0.7rem] text-blue-500 break-all select-all pr-2">
                      Timestamp, Customer Name, Item Name, Quantity, Price Unit, Total Price, Raw Note
                    </code>
                    <button
                      onClick={() => copyToClipboard('Timestamp, Customer Name, Item Name, Quantity, Price Unit, Total Price, Raw Note', 2)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-0 min-w-0 bg-transparent rounded"
                    >
                      {copiedStep === 2 ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[0.7rem] flex-shrink-0 mt-0.5">
                  3
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Dán mã nguồn vào Apps Script</p>
                  <p>Mở Sheet &gt; **Tiện ích mở rộng** &gt; **Apps Script**. Xoá mọi code cũ và dán toàn bộ code từ file <code className="bg-slate-100 dark:bg-slate-850 px-1 rounded font-mono font-bold text-slate-850 dark:text-slate-200">backend.js</code> trong thư mục dự án.</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[0.7rem] flex-shrink-0 mt-0.5">
                  4
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Cấu hình tham số môi trường</p>
                  <p>Nhấp vào biểu tượng bánh răng **Cài đặt dự án** trong Apps Script. Thêm 2 Thuộc tính Script:</p>
                  <ul className="list-disc list-inside mt-1 flex flex-col gap-0.5 pl-1">
                    <li><code className="font-mono text-[0.75rem] font-bold">OPENAI_API_KEY</code>: Mã khóa OpenAI của bạn</li>
                    <li><code className="font-mono text-[0.75rem] font-bold">APP_PASSWORD</code>: Mật khẩu ứng dụng (dùng để login)</li>
                  </ul>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[0.7rem] flex-shrink-0 mt-0.5">
                  5
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Triển khai Ứng dụng Web</p>
                  <p>Chọn **Triển khai** &gt; **Triển khai mới**. Chọn loại **Ứng dụng web** (Web App):</p>
                  <ul className="list-disc list-inside mt-1 flex flex-col gap-0.5 pl-1">
                    <li>**Thực thi dưới dạng**: Tôi (tài khoản Google của bạn)</li>
                    <li>**Ai có quyền truy cập**: Mọi người (Anyone)</li>
                  </ul>
                  <p className="mt-1">Nhấn Triển khai, cấp quyền cho ứng dụng, sao chép **URL ứng dụng web** dán vào ô cấu hình phía trên và lưu lại.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Theme Settings Card */}
      <div className="glass p-6 flex flex-col gap-4" style={{ padding: "1rem" }}>
        <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-800/40 pb-3">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
            <Sun size={18} />
          </div>
          <h3 className="font-semibold text-sm uppercase tracking-wider text-blue-500 dark:text-blue-400">Giao diện ứng dụng</h3>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Chế độ hiển thị</span>
          <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 relative">
            {(['light', 'dark', 'system'] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`h-10 min-h-0 py-0 px-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${theme === t
                  ? 'bg-white dark:bg-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-blue-500 dark:text-blue-400 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-transparent'
                  }`}
              >
                {t === 'light' && <Sun size={14} />}
                {t === 'dark' && <Moon size={14} />}
                {t === 'system' && <Monitor size={14} />}
                <span className="capitalize">{t === 'light' ? 'Sáng' : t === 'dark' ? 'Tối' : 'Hệ thống'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Security Actions Card */}
      <div className="glass p-6 flex flex-col gap-5 border border-rose-500/10 shadow-[0_8px_24px_rgba(239,68,68,0.02)]" style={{ background: 'var(--error-bg)', padding: "1rem" }}>
        <div className="flex items-center gap-2 border-b border-rose-500/10 pb-3">
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
            <ShieldAlert size={18} />
          </div>
          <h3 className="font-semibold text-sm uppercase tracking-wider text-rose-500">Khu vực bảo mật</h3>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-rose-600/90 dark:text-rose-400/90">Xoá dữ liệu phiên đăng nhập</p>
            <p className="text-[0.72rem] text-slate-500 dark:text-slate-400 leading-normal">
              Đăng xuất khỏi thiết bị này để xoá mật khẩu truy cập và cấu hình lưu trữ của bạn khỏi bộ nhớ cục bộ.
            </p>
          </div>

          <button
            onClick={onLogout}
            className="btn-ghost text-rose-500 border border-rose-500/20 hover:bg-rose-500/10 active:bg-rose-500/15 w-full py-3 px-5 flex items-center justify-center gap-2 transition-all font-semibold text-sm"
          >
            <LogOut size={16} />
            <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
