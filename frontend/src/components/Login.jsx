import React, { useState } from 'react';
import axios from '../api/axiosSetup';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import { Button } from './ui/Button';

export const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/auth/login', { username, password });
      onLogin(res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.msg || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="glass-panel p-8 w-full max-w-md flex flex-col gap-8 shadow-lg">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl accent-gradient mx-auto flex items-center justify-center mb-4 shadow-md">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
              <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4" />
              <circle cx="12" cy="12" r="2" />
              <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4" />
              <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold font-display text-gradient">
            TempTrack
          </h1>
          <p className="text-muted mt-2 text-sm uppercase tracking-widest">System Login</p>
        </div>

        {error && (
          <div
            role="alert"
            className="bg-danger-muted border border-danger/30 text-danger p-3 rounded-lg text-sm text-center"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label htmlFor="login-username" className="sr-only">Username</label>
            <div className="login-input-group">
              <User className="login-input-icon" aria-hidden="true" />
              <input
                id="login-username"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="login-input"
                autoComplete="username"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="login-password" className="sr-only">Password</label>
            <div className="login-input-group">
              <Lock className="login-input-icon" aria-hidden="true" />
              <input
                id="login-password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            className="w-full font-bold"
          >
            {loading ? 'Authenticating…' : 'Access Dashboard'}
          </Button>
        </form>
      </div>
    </div>
  );
};
