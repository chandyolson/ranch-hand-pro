import React from 'react';
import { HERDWORK_FIELDS } from '@/lib/import/column-guesser';
import { ParsedFile } from '@/lib/import/file-parser';

interface Props {
  parsedFile: ParsedFile;
  mapping: Record<string, string>;
  onMappingChange: (header: string, value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

const ColumnMappingStep: React.FC<Props> = ({ parsedFile, mapping, onMappingChange, onBack, onNext }) => {
  const hasMappedTag = Object.values(mapping).includes('tag') || Object.values(mapping).includes('eid');

  return (
    <div className="space-y-5">
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0E2646' }}>Map Columns</h2>
        <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Tell the AI what each column contains</p>
      </div>

      <div className="space-y-3">
        {parsedFile.headers.map(header => (
          <div key={header} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0E2646', minWidth: 120, flexShrink: 0 }}>{header}</span>
            <select
              value={mapping[header] || '__skip__'}
              onChange={e => onMappingChange(header, e.target.value)}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                border: '1px solid #D4D4D0',
                padding: '0 8px',
                fontSize: 14,
                color: mapping[header] === '__skip__' ? '#888' : '#0E2646',
                background: '#fff',
              }}
            >
              {HERDWORK_FIELDS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {parsedFile.headers.filter(h => mapping[h] !== '__skip__').map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #E0E0E0', color: '#55BAAA', fontWeight: 600 }}>
                  {HERDWORK_FIELDS.find(f => f.value === mapping[h])?.label || h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsedFile.rows.slice(0, 3).map((row, i) => (
              <tr key={i}>
                {parsedFile.headers.filter(h => mapping[h] !== '__skip__').map(h => (
                  <td key={h} style={{ padding: '4px 8px', borderBottom: '1px solid #F0F0F0', color: '#0E2646' }}>{String(row[h] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
          onClick={onNext}
          disabled={!hasMappedTag}
          style={{
            flex: 1, height: 40, borderRadius: 20, background: hasMappedTag ? '#F3D12A' : '#E0E0E0',
            color: '#0E2646', fontWeight: 700, fontSize: 14, border: 'none', cursor: hasMappedTag ? 'pointer' : 'not-allowed',
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ColumnMappingStep;
