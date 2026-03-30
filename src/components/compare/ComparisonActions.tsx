import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';
import { useChuteSideToast } from '@/components/ToastContext';
import { CompareAnimal, exportComparisonCsv } from '@/lib/compare/file-comparer';

interface Props {
  results: CompareAnimal[];
  targetId: string;
  targetName: string;
  targetType: 'group' | 'project';
}

const pill = (bg: string, color: string, border?: string): React.CSSProperties => ({
  padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
  background: bg, color, border: border ?? 'none', cursor: 'pointer',
});

const ComparisonActions: React.FC<Props> = ({ results, targetId, targetName, targetType }) => {
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();
  const [busy, setBusy] = useState('');

  const missing = results.filter(r => r.status === 'missing' && r.id);
  const extras = results.filter(r => r.status === 'extra' && r.id);

  const handleFlagMissing = async () => {
    if (!missing.length) return;
    setBusy('flag');
    try {
      const rows = missing.map(a => ({
        animal_id: a.id!,
        operation_id: operationId,
        flag_tier: 'management',
        flag_name: `Missing from ${targetName}`,
        flag_note: `Not found in comparison file`,
      }));
      const { error } = await supabase.from('animal_flags').insert(rows);
      if (error) throw error;
      showToast('success', `Flagged ${missing.length} animals`);
    } catch {
      showToast('error', 'Failed to flag animals');
    }
    setBusy('');
  };

  const handleRemoveFromGroup = async () => {
    if (targetType !== 'group' || !missing.length) return;
    setBusy('remove');
    try {
      for (const a of missing) {
        await (supabase.from('animal_groups' as any)
          .update({ end_date: new Date().toISOString().slice(0, 10) })
          .eq('group_id', targetId)
          .eq('animal_id', a.id!)
          .is('end_date', null));
      }
      showToast('success', `Removed ${missing.length} from group`);
    } catch {
      showToast('error', 'Failed to remove animals');
    }
    setBusy('');
  };

  const handleAddToGroup = async () => {
    if (targetType !== 'group' || !extras.length) return;
    setBusy('add');
    try {
      const rows = extras.map(a => ({
        animal_id: a.id!,
        group_id: targetId,
        operation_id: operationId,
        start_date: new Date().toISOString().slice(0, 10),
      }));
      const { error } = await (supabase.from('animal_groups' as any).insert(rows));
      if (error) throw error;
      showToast('success', `Added ${extras.length} to group`);
    } catch {
      showToast('error', 'Failed to add animals');
    }
    setBusy('');
  };

  const handleExport = () => {
    const csv = exportComparisonCsv(results);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${targetName.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 16 }} className="space-y-3">
      <p style={{ fontSize: 13, fontWeight: 700, color: '#0E2646' }}>Actions</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {missing.length > 0 && (
          <>
            <button onClick={handleFlagMissing} disabled={busy === 'flag'} style={pill('transparent', '#55BAAA', '1.5px solid #55BAAA')}>
              Flag {missing.length} Missing
            </button>
            {targetType === 'group' && (
              <button onClick={handleRemoveFromGroup} disabled={busy === 'remove'} style={pill('transparent', '#E74C3C', '1.5px solid #E74C3C')}>
                Remove {missing.length} from Group
              </button>
            )}
          </>
        )}
        {extras.length > 0 && targetType === 'group' && (
          <button onClick={handleAddToGroup} disabled={busy === 'add'} style={pill('#F3D12A', '#0E2646')}>
            Add {extras.length} to Group
          </button>
        )}
        <button onClick={handleExport} style={pill('transparent', '#888', '1.5px solid #D4D4D0')}>
          Export CSV
        </button>
      </div>
    </div>
  );
};

export default ComparisonActions;
