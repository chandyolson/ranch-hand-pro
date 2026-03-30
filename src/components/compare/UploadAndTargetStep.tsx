import React, { useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import { ParsedFile, formatFileSize } from '@/lib/import/file-parser';
import { MatchBy, CompareTarget } from '@/lib/compare/file-comparer';

interface Props {
  parsedFile: ParsedFile | null;
  onFileSelect: (file: File) => void;
  loading: boolean;
  target: CompareTarget;
  onTargetChange: (t: CompareTarget) => void;
  targetId: string;
  onTargetIdChange: (id: string) => void;
  matchBy: MatchBy;
  onMatchByChange: (m: MatchBy) => void;
  groups: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; date: string }>;
  onCompare: () => void;
  comparing: boolean;
}

const Radio: React.FC<{ checked: boolean; label: string; onTap: () => void }> = ({ checked, label, onTap }) => (
  <button onClick={onTap} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}>
    <span style={{
      width: 18, height: 18, borderRadius: '50%', border: checked ? 'none' : '2px solid #D4D4D0',
      background: checked ? '#F3D12A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {checked && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0E2646' }} />}
    </span>
    <span style={{ fontSize: 14, color: '#0E2646', fontWeight: checked ? 600 : 400 }}>{label}</span>
  </button>
);

const UploadAndTargetStep: React.FC<Props> = ({
  parsedFile, onFileSelect, loading, target, onTargetChange, targetId, onTargetIdChange,
  matchBy, onMatchByChange, groups, projects, onCompare, comparing,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-5">
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0E2646' }}>Compare File</h2>
        <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Upload a file and compare against a group or project</p>
      </div>

      {!parsedFile ? (
        <div
          onClick={() => inputRef.current?.click()}
          style={{ border: '2px dashed #D4D4D0', borderRadius: 12, height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 8 }}
        >
          {loading ? (
            <p style={{ fontSize: 14, color: '#888' }}>Parsing file…</p>
          ) : (
            <>
              <Upload size={36} color="#BBB" />
              <p style={{ fontSize: 14, color: '#888' }}>Tap to select a CSV file</p>
              <p style={{ fontSize: 12, color: '#BBB' }}>Supports .csv, .xlsx, .xls</p>
            </>
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={20} color="#55BAAA" />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0E2646' }}>{parsedFile.fileName}</p>
            <p style={{ fontSize: 12, color: '#888' }}>{formatFileSize(parsedFile.fileSize)} · {parsedFile.totalRows} rows</p>
          </div>
          <button onClick={() => inputRef.current?.click()} style={{ fontSize: 12, color: '#55BAAA', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Change</button>
        </div>
      )}

      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }} style={{ display: 'none' }} />

      {parsedFile && (
        <>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0E2646', marginBottom: 6 }}>Compare Against</p>
            <div style={{ display: 'flex', gap: 20 }}>
              <Radio checked={target === 'group'} label="A Group" onTap={() => onTargetChange('group')} />
              <Radio checked={target === 'project'} label="A Project" onTap={() => onTargetChange('project')} />
            </div>
          </div>

          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0E2646', marginBottom: 6 }}>
              Select {target === 'group' ? 'Group' : 'Project'}
            </p>
            <select
              value={targetId}
              onChange={e => onTargetIdChange(e.target.value)}
              style={{ width: '100%', height: 40, borderRadius: 8, border: '1px solid #D4D4D0', padding: '0 12px', fontSize: 16, color: '#0E2646', background: '#fff' }}
            >
              <option value="">— Select —</option>
              {target === 'group'
                ? groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)
                : projects.map(p => <option key={p.id} value={p.id}>{p.name} — {p.date}</option>)
              }
            </select>
          </div>

          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0E2646', marginBottom: 6 }}>Match By</p>
            <div style={{ display: 'flex', gap: 20 }}>
              <Radio checked={matchBy === 'eid'} label="EID" onTap={() => onMatchByChange('eid')} />
              <Radio checked={matchBy === 'tag'} label="Tag" onTap={() => onMatchByChange('tag')} />
              <Radio checked={matchBy === 'tag_color'} label="Tag + Color" onTap={() => onMatchByChange('tag_color')} />
            </div>
          </div>

          <button
            onClick={onCompare}
            disabled={!targetId || comparing}
            style={{
              width: '100%', height: 40, borderRadius: 20, background: !targetId ? '#D4D4D0' : '#F3D12A',
              color: '#0E2646', fontWeight: 700, fontSize: 14, border: 'none', cursor: !targetId ? 'default' : 'pointer',
              opacity: comparing ? 0.6 : 1,
            }}
          >
            {comparing ? 'Comparing…' : 'Compare'}
          </button>
        </>
      )}
    </div>
  );
};

export default UploadAndTargetStep;
