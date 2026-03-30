import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';
import { useChuteSideToast } from '@/components/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { LABEL_STYLE, INPUT_CLS } from '@/lib/styles';

interface Props {
  filteredAnimalIds: string[];
  filterSummary: string; // e.g. "Active Angus Cows"
  onClose: () => void;
}

const CATTLE_TYPES = ['Cows', 'Bulls', 'Calves', 'Heifers', 'Mixed'];
const GROUP_TYPES = ['general', 'pasture', 'breeding', 'management', 'sale'];
const GROUP_TYPE_LABELS: Record<string, string> = {
  general: 'General', pasture: 'Pasture', breeding: 'Breeding',
  management: 'Management', sale: 'Sale',
};

const SaveAsGroupCard: React.FC<Props> = ({ filteredAnimalIds, filterSummary, onClose }) => {
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState(filterSummary);
  const [cattleType, setCattleType] = useState('Cows');
  const [groupType, setGroupType] = useState('general');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { showToast('error', 'Name is required'); return; }
    if (!filteredAnimalIds.length) { showToast('error', 'No animals in filtered set'); return; }
    setSaving(true);
    try {
      const { data: group, error: gErr } = await supabase
        .from('groups')
        .insert({ operation_id: operationId, name: name.trim(), cattle_type: cattleType, group_type: groupType })
        .select('id')
        .single();
      if (gErr) throw gErr;

      const today = new Date().toISOString().slice(0, 10);
      const rows = filteredAnimalIds.map(aid => ({
        animal_id: aid,
        group_id: group.id,
        operation_id: operationId,
        start_date: today,
        source: 'filter',
      }));

      // Insert in batches of 200
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await (supabase.from('animal_groups' as any).insert(rows.slice(i, i + 200)));
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['groups'] });
      showToast('success', `Created group '${name.trim()}' with ${filteredAnimalIds.length} animals`);
      navigate(`/reference/groups/${group.id}`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create group');
    }
    setSaving(false);
  };

  return (
    <div className="rounded-xl px-3 py-3.5 space-y-2" style={{ backgroundColor: 'white', border: '2px solid #F3D12A' }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#0E2646', marginBottom: 4 }}>
        Save {filteredAnimalIds.length} Animals as Group
      </p>
      <div className="flex items-center gap-2 min-w-0">
        <span style={LABEL_STYLE}>Name</span>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Group name" className={INPUT_CLS} style={{ fontSize: 16 }} />
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <span style={LABEL_STYLE}>Cattle</span>
        <select value={cattleType} onChange={e => setCattleType(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
          {CATTLE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <span style={LABEL_STYLE}>Type</span>
        <select value={groupType} onChange={e => setGroupType(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
          {GROUP_TYPES.map(t => <option key={t} value={t}>{GROUP_TYPE_LABELS[t]}</option>)}
        </select>
      </div>
      <div className="flex gap-2 mt-1">
        <button
          onClick={onClose}
          className="flex-1 rounded-full py-2.5 border cursor-pointer active:scale-[0.97]"
          style={{ borderColor: '#D4D4D0', backgroundColor: 'white', fontSize: 13, fontWeight: 600, color: '#0E2646' }}
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="flex-1 rounded-full py-2.5 cursor-pointer active:scale-[0.97]"
          style={{ backgroundColor: '#F3D12A', fontSize: 13, fontWeight: 700, color: '#0E2646', border: 'none', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Creating…' : 'Create Group'}
        </button>
      </div>
    </div>
  );
};

export default SaveAsGroupCard;
