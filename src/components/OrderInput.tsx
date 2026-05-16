import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface OrderInputProps {
  apiUrl: string;
  password: string;
}

const OrderInput: React.FC<OrderInputProps> = ({ apiUrl, password }) => {
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    if (!note.trim()) return;

    setStatus('loading');
    try {
      await fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors', // Apps Script requires no-cors for simple POST or redirects handle
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, note })
      });
      
      // Note: With 'no-cors', we can't see the body, but Apps Script usually handles it.
      // If we want a response, we'd need to use JSONP or a proxy, but for simplicity:
      setNote('');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setErrorMsg('Failed to save order. Please check your connection.');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">New Order</h2>
        <p>Type your order details naturally (e.g., "3 phở 60k cho khách Nam").</p>
      </div>

      <div className="relative">
        <textarea
          rows={6}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What are we selling today?"
          className="resize-none"
          disabled={status === 'loading'}
        />
        
        <div className="absolute bottom-4 right-4">
          <button
            onClick={handleSubmit}
            disabled={status === 'loading' || !note.trim()}
            className={`btn-primary px-6 ${status === 'success' ? 'bg-emerald-500' : ''}`}
          >
            {status === 'loading' ? <Loader2 className="animate-spin" /> : 
             status === 'success' ? <CheckCircle2 /> : <Send />}
            <span>{status === 'loading' ? 'Saving...' : status === 'success' ? 'Saved!' : 'Save Order'}</span>
          </button>
        </div>
      </div>

      {status === 'error' && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3">
          <AlertCircle size={20} />
          <p>{errorMsg}</p>
        </div>
      )}

      <div className="glass p-6 flex flex-col gap-4">
        <h3 className="font-semibold text-sm text-indigo-400 uppercase tracking-wider">Quick Tips</h3>
        <ul className="text-sm flex flex-col gap-2 text-slate-400">
          <li>• Mention item, quantity, and price.</li>
          <li>• Use "k" for thousands (e.g., 50k).</li>
          <li>• "3 bánh mì 60k" will calculate 20k per unit.</li>
          <li>• Mention the customer name at the end.</li>
        </ul>
      </div>
    </div>
  );
};

export default OrderInput;
