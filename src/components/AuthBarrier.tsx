import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

interface AuthBarrierProps {
  onAuth: (password: string) => void;
  children: React.ReactNode;
}

const AuthBarrier: React.FC<AuthBarrierProps> = ({ onAuth, children }) => {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('app_password');
    if (saved) {
      setIsAuthed(true);
      onAuth(saved);
    }
  }, [onAuth]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      localStorage.setItem('app_password', password);
      setIsAuthed(true);
      onAuth(password);
    } else {
      setError(true);
    }
  };

  if (isAuthed) return <>{children}</>;

  return (
    <div className="container flex-center" style={{ minHeight: '100vh' }}>
      <form onSubmit={handleSubmit} className="glass p-8 w-full animate-fade-in flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-500">
            <Lock size={48} />
          </div>
          <h1 className="text-2xl">OrderAI Login</h1>
          <p className="text-center">Please enter your access key to continue.</p>
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="password"
            placeholder="Access Key"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            className={error ? 'border-red-500' : ''}
          />
          {error && <p className="text-red-500 text-sm">Key is required</p>}
        </div>

        <button type="submit" className="btn-primary w-full py-4">
          Unlock Application
        </button>
      </form>
    </div>
  );
};

export default AuthBarrier;
