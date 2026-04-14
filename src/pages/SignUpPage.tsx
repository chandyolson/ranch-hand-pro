import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

const SignUpPage: React.FC = () => {
  const { signUp, session } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // With email confirmation disabled, signup auto-logs in.
  // Redirect to onboarding (AuthGuard will handle routing from there).
  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

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
    const { error: err } = await signUp(email, password, displayName);
    if (err) {
      setError(err.message);
      setSubmitting(false);
    }
    // On success, auto-login fires → session set → useEffect redirects
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 font-inter">
      <div className="w-full max-w-[400px] border border-[#E8E4DC] rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img src="/herdwork-logo.svg" alt="HerdWork" style={{ height: 48, width: 'auto' }} />
          </div>
          <p style={{ color: '#717182', fontSize: 14, marginTop: 4 }}>Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A1A1A' }}>Full Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full border border-[#E8E4DC] rounded-xl px-4 font-inter"
                  style={{ height: 44, fontSize: 16 }}
                  placeholder="John Doe"
                />
              </div>

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
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A1A1A' }}>Password</label>
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
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A1A1A' }}>Confirm Password</label>
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
                {submitting ? 'Creating…' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/sign-in" style={{ color: '#55BAAA', fontSize: 14 }}>
                Already have an account? Sign in
              </Link>
            </div>
      </div>
    </div>
  );
};

export default SignUpPage;
