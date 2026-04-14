import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const OP_TYPES = [
  { label: 'Ranch', value: 'ranch' },
  { label: 'Vet Practice', value: 'vet_practice' },
] as const;

const OnboardingPage: React.FC = () => {
  const { user, userProfile, switchOperation, reloadOperations, operations, isLoading } = useAuth();
  const navigate = useNavigate();

  // Guard: authenticated user who already has an operation should never be here
  useEffect(() => {
    if (isLoading) return;
    if (operations.length === 1) {
      navigate('/', { replace: true });
    } else if (operations.length > 1) {
      navigate('/operation-picker', { replace: true });
    }
  }, [operations, isLoading, navigate]);

  const [name, setName] = useState('');
  const [opType, setOpType] = useState<string>('ranch');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Operation name is required'); return; }
    setError('');
    setSubmitting(true);

    try {
      // Check for duplicate operation name among this user's existing operations
      const duplicate = operations.some(
        (op) => op.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (duplicate) {
        setError(`You already have an operation named "${name.trim()}"`);
        setSubmitting(false);
        return;
      }

      // 1. Insert operation
      const { data: newOp, error: opErr } = await (supabase as any)
        .from('operations')
        .insert({
          name: name.trim(),
          operation_type: opType,
          email: email.trim(),
          owner_name: ownerName.trim() || null,
          claimed: true,
          claimed_by: user?.id,
          claimed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (opErr) throw opErr;

      // 2. Insert operation_teams
      await (supabase as any)
        .from('operation_teams')
        .insert({
          operation_id: newOp.id,
          user_id: user?.id,
          user_type: 'admin',
          display_name: userProfile?.display_name ?? '',
        });

      // 3. If vet practice, insert vet_practices
      if (opType === 'vet_practice') {
        await (supabase as any)
          .from('vet_practices')
          .insert({
            name: name.trim(),
            owner_user_id: user?.id,
            email: email.trim(),
          });
      }

      // 4. Reload and switch
      await reloadOperations();
      await switchOperation(newOp.id);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create operation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 font-inter">
      <div className="w-full max-w-[400px] border border-[#E8E4DC] rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img src="/herdwork-logo.svg" alt="HerdWork" style={{ height: 48, width: 'auto' }} />
          </div>
          <h2 style={{ color: '#0E2646', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Create Your Operation</h2>
          <p style={{ color: '#717182', fontSize: 14, marginTop: 4 }}>Set up your ranch or practice to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#1A1A1A' }}>Operation Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-[#E8E4DC] rounded-xl px-4 font-inter"
              style={{ height: 44, fontSize: 16 }}
              placeholder="e.g. Frederickson Ranch"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>Operation Type</label>
            <div className="flex rounded-xl overflow-hidden border border-[#E8E4DC]">
              {OP_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setOpType(t.value)}
                  className="flex-1 py-2.5 text-center font-inter transition-colors"
                  style={{
                    fontSize: 13,
                    fontWeight: opType === t.value ? 700 : 400,
                    backgroundColor: opType === t.value ? '#0E2646' : 'white',
                    color: opType === t.value ? 'white' : '#717182',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#1A1A1A' }}>Owner Name <span style={{ color: '#717182' }}>(optional)</span></label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full border border-[#E8E4DC] rounded-xl px-4 font-inter"
              style={{ height: 44, fontSize: 16 }}
              placeholder="Owner or manager name"
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
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full font-inter disabled:opacity-60"
            style={{ height: 48, backgroundColor: '#F3D12A', color: '#1A1A1A', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }}
          >
            {submitting ? 'Creating…' : 'Create Operation'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OnboardingPage;
