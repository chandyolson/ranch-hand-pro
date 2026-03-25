import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    // Also check if already in recovery state
    setReady(true);
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
    } else {
      navigate('/sign-in', { state: { message: 'Password updated — please sign in' } });
    }
    setSubmitting(false);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#E8E4DC', borderTopColor: '#0E2646' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 font-inter">
      <div className="w-full max-w-[400px] border border-[#E8E4DC] rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 style={{ color: '#0E2646', fontSize: 24, fontWeight: 800 }}>HerdWork</h1>
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
