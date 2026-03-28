import React, { useState } from 'react';
import { MatchResult } from '@/lib/import/animal-matcher';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  results: MatchResult[];
  conflictChoices: Record<string, Record<string, 'keep' | 'import'>>;
  onConflictChoice: (rowIndex: number, field: string, choice: 'keep' | 'import') => void;
  onBack: () => void;
  onImport: () => void;
  loading: boolean;
}

const MatchReviewStep: React.FC<Props> = ({ results, conflictChoices, onConflictChoice, onBack, onImport, loading }) => {
  const matched = results.filter(r => r.matchType === 'matched');
  const newItems = results.filter(r => r.matchType === 'new');
  const conflicts = results.filter(r => r.matchType === 'conflict');
  const skipped = results.filter(r => r.matchType === 'skipped');
  const importCount = matched.length + newItems.length + conflicts.length;

  const [expandedSection, setExpandedSection] = useState<string | null>(conflicts.length > 0 ? 'conflicts' : null);

  const toggle = (s: string) => setExpandedSection(prev => prev === s ? null : s);

  const SectionHeader = ({ label, count, color, section }: { label: string; count: number; color: string; section: string }) => (
    <button
      onClick={() => toggle(section)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', background: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer',
        marginBottom: expandedSection === section ? 0 : 8,
        borderBottomLeftRadius: expandedSection === section ? 0 : 8,
        borderBottomRightRadius: expandedSection === section ? 0 : 8,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color }}>{count} {label}</span>
      {expandedSection === section ? <ChevronUp size={16} color="#888" /> : <ChevronDown size={16} color="#888" />}
    </button>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0E2646' }}>Review Matches</h2>
        <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Confirm before importing</p>
      </div>

      {matched.length > 0 && (
        <div>
          <SectionHeader label="matched to existing animals" count={matched.length} color="#55BAAA" section="matched" />
          {expandedSection === 'matched' && (
            <div style={{ background: '#fff', borderRadius: '0 0 8px 8px', padding: 12, marginBottom: 8 }}>
              {matched.slice(0, 20).map(r => (
                <div key={r.rowIndex} style={{ fontSize: 13, color: '#0E2646', padding: '4px 0', borderBottom: '1px solid #F0F0F0' }}>
                  Tag {r.animalTag} — {Object.keys(r.updateFields || {}).length} fields to update
                </div>
              ))}
              {matched.length > 20 && <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>+{matched.length - 20} more</p>}
            </div>
          )}
        </div>
      )}

      {newItems.length > 0 && (
        <div>
          <SectionHeader label="new animals (no match found)" count={newItems.length} color="#F3D12A" section="new" />
          {expandedSection === 'new' && (
            <div style={{ background: '#fff', borderRadius: '0 0 8px 8px', padding: 12, marginBottom: 8 }}>
              {newItems.slice(0, 20).map(r => (
                <div key={r.rowIndex} style={{ fontSize: 13, color: '#0E2646', padding: '4px 0', borderBottom: '1px solid #F0F0F0' }}>
                  {r.animalTag || `Row ${r.rowIndex + 1}`}
                </div>
              ))}
              {newItems.length > 20 && <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>+{newItems.length - 20} more</p>}
            </div>
          )}
        </div>
      )}

      {conflicts.length > 0 && (
        <div>
          <SectionHeader label="conflicts (values differ)" count={conflicts.length} color="#E74C3C" section="conflicts" />
          {expandedSection === 'conflicts' && (
            <div style={{ background: '#fff', borderRadius: '0 0 8px 8px', padding: 12, marginBottom: 8 }}>
              {conflicts.map(r => (
                <div key={r.rowIndex} style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0E2646', marginBottom: 4 }}>Tag {r.animalTag}</p>
                  {r.conflicts?.map(c => {
                    const choice = conflictChoices[r.rowIndex]?.[c.field] || 'keep';
                    return (
                      <div key={c.field} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
                        <span style={{ minWidth: 80, color: '#888' }}>{c.field}</span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                          <input type="radio" name={`${r.rowIndex}-${c.field}`} checked={choice === 'keep'} onChange={() => onConflictChoice(r.rowIndex, c.field, 'keep')} />
                          <span style={{ color: '#0E2646' }}>{c.currentValue}</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                          <input type="radio" name={`${r.rowIndex}-${c.field}`} checked={choice === 'import'} onChange={() => onConflictChoice(r.rowIndex, c.field, 'import')} />
                          <span style={{ color: '#55BAAA' }}>{c.importValue}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {skipped.length > 0 && (
        <div>
          <SectionHeader label="skipped (incomplete data)" count={skipped.length} color="#888" section="skipped" />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onBack}
          style={{
            flex: 1, height: 40, borderRadius: 20, background: 'transparent',
            border: '1.5px solid #D4D4D0', color: '#888', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}
        >
          Back
        </button>
        <button
          onClick={onImport}
          disabled={loading || importCount === 0}
          style={{
            flex: 1, height: 40, borderRadius: 20,
            background: importCount > 0 ? '#55BAAA' : '#E0E0E0',
            color: '#fff', fontWeight: 700, fontSize: 14, border: 'none',
            cursor: importCount > 0 && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Matching…' : `Import ${importCount} Records`}
        </button>
      </div>
    </div>
  );
};

export default MatchReviewStep;
