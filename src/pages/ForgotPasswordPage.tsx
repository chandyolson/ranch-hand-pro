import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 font-inter">
      <div className="w-full max-w-[400px] border border-[#E8E4DC] rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 style={{ color: '#0E2646', fontSize: 24, fontWeight: 800 }}>HerdWork</h1>
          <p style={{ color: '#717182', fontSize: 14, marginTop: 4 }}>Reset your password</p>
        </div>

        {sent ? (
          <div className="text-center py-6">
            <p style={{ color: '#55BAAA', fontSize: 16, fontWeight: 600 }}>Reset link sent — check your email</p>
            <Link to="/sign-in" style={{ color: '#55BAAA', fontSize: 14 }} className="block mt-4">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A1A1A' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-[#E8E4DC] rounded-xl px-4 font-inter"
                  style={{ height: 44, fontSize: 16 }}
                  placeholder="you@example.com"
                />
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full font-inter disabled:opacity-60"
                style={{ height: 48, backgroundColor: '#F3D12A', color: '#1A1A1A', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }}
              >
                {submitting ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/sign-in" style={{ color: '#55BAAA', fontSize: 14 }}>
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
