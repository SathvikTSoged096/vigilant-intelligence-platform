import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-obsidian p-4">
      <form onSubmit={handleSubmit} className="panel w-full max-w-md p-5">
        <div className="flex items-center gap-3 mb-5">
          <ShieldCheck className="text-blue-400" />
          <div>
            <div className="font-mono text-white tracking-widest">GOTHAM</div>
            <div className="eyebrow">SECURE ACCESS GATEWAY</div>
          </div>
        </div>

        <div className="text-[9px] text-amber-400 border border-amber-500/20 p-3 mb-4">
          <AlertTriangle size={12} className="inline mr-2" />
          UNAUTHORIZED ACCESS IS PROHIBITED AND MONITORED.
        </div>

        <label className="label">OPERATOR_ID</label>
        <input
          className="input-tactical mt-2 mb-4"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label className="label">SECURITY_KEY</label>
        <input
          type="password"
          className="input-tactical mt-2 mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="text-red-400 text-[10px] mb-3">{error}</div>}

        <button className="btn-primary w-full">AUTHENTICATE OPERATOR</button>
      </form>
    </main>
  );
}