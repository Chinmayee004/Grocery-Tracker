import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Lock, Mail, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

export default function AuthModal() {
  const { signIn, signUp, continueAsDemo, isConfigured } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        const data = await signUp(email.trim(), password);
        // Supabase often requires email confirmation unless disabled in project settings
        if (data?.user && !data?.session) {
          setSuccessMsg('Account registered! Please check your email inbox to confirm your account.');
        }
      }
    } catch (err) {
      console.error('[AUTH ERROR]', err);
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-icon-wrapper" style={{ margin: '0 auto' }}>
            <ShoppingBag size={22} />
          </div>
          <h1 className="auth-title">Shared Grocery List</h1>
          <p className="auth-subtitle">
            {mode === 'login' ? 'Sign in to access your shared list' : 'Create an account to start syncing groceries'}
          </p>
        </div>

        {!isConfigured && (
          <div className="config-banner">
            <strong>Local / Demo Mode:</strong> No Supabase database connected yet. You can click <strong>Instant Demo Access</strong> below to immediately use the full app with local in-memory storage, or enter any test email/password.
          </div>
        )}

        {/* Instant Demo Access Button */}
        <button
          type="button"
          className="btn-demo-access"
          onClick={() => continueAsDemo()}
          id="btn-instant-demo"
        >
          <Sparkles size={18} color="#5c807e" />
          <span>⚡ Continue with Instant Demo Access</span>
        </button>

        <div className="auth-divider">
          <span>or sign in with email</span>
        </div>

        {/* Mode Switcher */}
        <div className="auth-mode-toggle">
          <button
            type="button"
            className={`mode-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div className="auth-alert">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert success">
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="auth-email">
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="auth-email"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="auth-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-auth-submit"
            disabled={isSubmitting}
            id="btn-auth-submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="spin-icon" />
                <span>{mode === 'login' ? 'Authenticating...' : 'Creating Account...'}</span>
              </>
            ) : (
              <span>
                {isConfigured
                  ? mode === 'login'
                    ? 'Sign In to List'
                    : 'Create Account'
                  : mode === 'login'
                  ? 'Sign In (Instant Demo)'
                  : 'Create Account (Instant Demo)'}
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
