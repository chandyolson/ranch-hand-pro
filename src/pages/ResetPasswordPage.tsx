import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;

    // Listen for PASSWORD_RECOVERY (hash flow) or SIGNED_IN (PKCE flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
      if (event === 'SIGNED_IN' && session) {
        // PKCE flow: Supabase exchanges the code and fires SIGNED_IN
        // Check if this came from a recovery link
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const isRecovery =
          params.get('type') === 'recovery' ||
          hashParams.get('type') === 'recovery' ||
          !!session.user?.recovery_sent_at;
        if (isRecovery) setReady(true);
      }
    });

    // Detect token in either hash (#access_token=...&type=recovery)
    // or query string (?code=...&type=recovery) — Supabase uses both
    const hash = window.location.hash;
    const search = window.location.search;
    const hasRecoveryToken =
      hash.includes('type=recovery') ||
      hash.includes('access_token') ||
      search.includes('type=recovery') ||
      search.includes('code=');

    if (!hasRecoveryToken) {
      safetyTimer = setTimeout(() => setExpired(true), 2000);
    } else {
      safetyTimer = setTimeout(() => {
        setExpired((prev) => { if (!ready) return true; return prev; });
      }, 8000);
    }

    return () => {
      if (safetyTimer) clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setSubmitting(false);
    } else {
      // Navigate first so AuthGuard doesn't see the signed-out/no-operations state
      // and incorrectly redirect to onboarding
      navigate('/sign-in', { state: { message: 'Password updated — please sign in' }, replace: true });
      await supabase.auth.signOut();
    }
  };

  // Expired / no token state
  if (expired && !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4 font-inter">
        <div className="w-full max-w-[400px] border border-[#E8E4DC] rounded-2xl shadow-sm p-8 text-center">
          <div className="mb-6">
            <div className="flex justify-center mb-3">
              <img src="/herdwork-logo.svg" alt="HerdWork" style={{ height: 48, width: 'auto' }} />
            </div>
          </div>
          <p style={{ color: '#1A1A1A', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            Reset link expired or invalid
          </p>
          <p style={{ color: '#717182', fontSize: 14, marginBottom: 24 }}>
            Password reset links are single-use and expire after 1 hour. Request a new one below.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block w-full rounded-full font-inter text-center"
            style={{
              height: 48,
              lineHeight: '48px',
              backgroundColor: '#F3D12A',
              color: '#1A1A1A',
              fontWeight: 700,
              fontSize: 16,
              textDecoration: 'none',
            }}
          >
            Request New Link
          </Link>
          <Link to="/sign-in" style={{ color: '#55BAAA', fontSize: 14 }} className="block mt-4">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Loading / waiting for token consumption
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div
            className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: '#E8E4DC', borderTopColor: '#0E2646' }}
          />
          <p style={{ color: '#717182', fontSize: 14 }}>Verifying reset link…</p>
        </div>
      </div>
    );
  }

  // Ready — show the reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 font-inter">
      <div className="w-full max-w-[400px] border border-[#E8E4DC] rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img src="/herdwork-logo.svg" alt="HerdWork" style={{ height: 48, width: 'auto' }} />
          </div>
          <p style={{ color: '#717182', fontSize: 14, marginTop: 4 }}>Set your new password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#1A1A1A' }}>New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-[#E8E4DC] rounded-xl px-4 pr-12 font-inter"
                style={{ height: 44, fontSize: 16 }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: '#717182' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#1A1A1A' }}>Confirm New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border border-[#E8E4DC] rounded-xl px-4 font-inter"
              style={{ height: 44, fontSize: 16 }}
              placeholder="••••••••"
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full font-inter disabled:opacity-60"
            style={{ height: 48, backgroundColor: '#F3D12A', color: '#1A1A1A', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }}
          >
            {submitting ? 'Updating…' : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
