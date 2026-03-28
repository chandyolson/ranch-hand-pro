import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';

interface Props {
  title: string;
  dateStart: string;
  dateEnd: string;
  groupFilter: string;
  includeCharts: boolean;
  includeTables: boolean;
  onChangeTitle: (v: string) => void;
  onChangeDateStart: (v: string) => void;
  onChangeDateEnd: (v: string) => void;
  onChangeGroupFilter: (v: string) => void;
  onChangeIncludeCharts: (v: boolean) => void;
  onChangeIncludeTables: (v: boolean) => void;
  onBack: () => void;
  onGenerate: () => void;
}

const ReportConfigForm: React.FC<Props> = (props) => {
  const { operationId } = useOperation();
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!operationId) return;
    supabase.from('groups')
      .select('id, name')
      .eq('operation_id', operationId)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setGroups(data || []));
  }, [operationId]);

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
        background: value ? '#55BAAA' : '#CBCED4',
        position: 'relative', transition: 'background 0.2s',
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 11, background: '#fff',
        position: 'absolute', top: 3,
        left: value ? 23 : 3, transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0E2646' }}>Configure Report</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#0E2646', display: 'block', marginBottom: 4 }}>Report Title</label>
          <input
            value={props.title}
            onChange={e => props.onChangeTitle(e.target.value)}
            style={{
              width: '100%', height: 40, borderRadius: 8, border: '1px solid #D4D4D0',
              padding: '0 12px', fontSize: 16, color: '#0E2646',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#0E2646', display: 'block', marginBottom: 4 }}>Start Date</label>
            <input
              type="date"
              value={props.dateStart}
              onChange={e => props.onChangeDateStart(e.target.value)}
              style={{
                width: '100%', height: 40, borderRadius: 8, border: '1px solid #D4D4D0',
                padding: '0 12px', fontSize: 16, color: '#0E2646',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#0E2646', display: 'block', marginBottom: 4 }}>End Date</label>
            <input
              type="date"
              value={props.dateEnd}
              onChange={e => props.onChangeDateEnd(e.target.value)}
              style={{
                width: '100%', height: 40, borderRadius: 8, border: '1px solid #D4D4D0',
                padding: '0 12px', fontSize: 16, color: '#0E2646',
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#0E2646', display: 'block', marginBottom: 4 }}>Group Filter</label>
          <select
            value={props.groupFilter}
            onChange={e => props.onChangeGroupFilter(e.target.value)}
            style={{
              width: '100%', height: 40, borderRadius: 8, border: '1px solid #D4D4D0',
              padding: '0 12px', fontSize: 16, color: '#0E2646', background: '#fff',
            }}
          >
            <option value="all">All Groups</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0E2646' }}>Include Charts</span>
          <Toggle value={props.includeCharts} onChange={props.onChangeIncludeCharts} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0E2646' }}>Include Tables</span>
          <Toggle value={props.includeTables} onChange={props.onChangeIncludeTables} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={props.onBack}
          style={{
            flex: 1, height: 40, borderRadius: 20, background: 'transparent',
            border: '1.5px solid #D4D4D0', color: '#888', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}
        >
          Back
        </button>
        <button
          onClick={props.onGenerate}
          style={{
            flex: 1, height: 40, borderRadius: 20, background: '#F3D12A',
            color: '#0E2646', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
          }}
        >
          Generate Report
        </button>
      </div>
    </div>
  );
};

export default ReportConfigForm;
