import React, { useState } from 'react';
import { CompareAnimal, CompareStatus } from '@/lib/compare/file-comparer';

interface Props {
  results: CompareAnimal[];
  fileName: string;
  targetName: string;
  filter: CompareStatus | null;
  onFilterChange: (f: CompareStatus | null) => void;
}

const STATUS_STYLES: Record<CompareStatus, { border: string; color: string; label: string; badge: string }> = {
  matched: { border: '#55BAAA', color: '#55BAAA', label: 'MATCHED', badge: '#D1FAE5' },
  missing: { border: '#F3D12A', color: '#D4A017', label: 'MISSING', badge: '#FEF3C7' },
  extra: { border: '#E74C3C', color: '#E74C3C', label: 'EXTRA', badge: '#FEE2E2' },
};

const PAGE_SIZE = 30;

const ComparisonResults: React.FC<Props> = ({ results, fileName, targetName, filter, onFilterChange }) => {
  const [showCount, setShowCount] = useState(PAGE_SIZE);
  const counts = { matched: 0, missing: 0, extra: 0 };
  for (const r of results) counts[r.status]++;

  const filtered = filter ? results.filter(r => r.status === filter) : results;
  const visible = filtered.slice(0, showCount);

  return (
    <div className="space-y-4">
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0E2646' }}>Comparison Results</h2>
        <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{fileName} vs {targetName}</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['matched', 'missing', 'extra'] as CompareStatus[]).map(s => {
          const st = STATUS_STYLES[s];
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => onFilterChange(active ? null : s)}
              style={{
                flex: 1, background: active ? '#fff' : '#fff', border: active ? `2px solid ${st.border}` : '1px solid #E5E5E0',
                borderLeft: `3px solid ${st.border}`, borderRadius: 8, padding: '10px 8px', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <p style={{ fontSize: 24, fontWeight: 700, color: st.color }}>{counts[s]}</p>
              <p style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                {s === 'matched' ? 'In both' : s === 'missing' ? `In target not file` : 'In file not target'}
              </p>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-2">
        {visible.map((a, i) => {
          const st = STATUS_STYLES[a.status];
          return (
            <div key={i} style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', borderLeft: `3px solid ${st.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0E2646' }}>{a.tag || '—'}</span>
                {a.tag_color && (
                  <span style={{ fontSize: 11, background: '#F0F0F0', borderRadius: 4, padding: '1px 6px', color: '#666' }}>{a.tag_color}</span>
                )}
                <span style={{ fontSize: 10, fontWeight: 600, background: st.badge, color: st.color, borderRadius: 4, padding: '2px 6px', marginLeft: 'auto' }}>
                  {st.label}
                </span>
              </div>
              {a.eid && <p style={{ fontSize: 12, color: '#888', fontFamily: 'Inter, sans-serif', fontFeatureSettings: '"tnum"', marginTop: 2 }}>{a.eid}</p>}
              {(a.breed || a.year_born || a.sex) && (
                <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {[a.breed, a.year_born, a.sex].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {visible.length < filtered.length && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Showing {visible.length} of {filtered.length}</p>
          <button
            onClick={() => setShowCount(c => c + PAGE_SIZE)}
            style={{ fontSize: 13, fontWeight: 600, color: '#55BAAA', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default ComparisonResults;
