import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';
import { useChuteSideToast } from '@/components/ToastContext';
import { parseFile, ParsedFile, formatFileSize } from '@/lib/import/file-parser';
import { LABEL_STYLE, INPUT_CLS } from '@/lib/styles';
import { Upload, FileText, ChevronDown, ChevronUp } from 'lucide-react';

const CATTLE_TYPES = ['Cows', 'Bulls', 'Calves', 'Heifers', 'Mixed'];
const GROUP_TYPES = ['general', 'pasture', 'breeding', 'management', 'sale'];
const GROUP_TYPE_LABELS: Record<string, string> = {
  general: 'General', pasture: 'Pasture', breeding: 'Breeding',
  management: 'Management', sale: 'Sale',
};

interface MatchedAnimal { id: string; tag: string; eid: string | null }
interface UnmatchedRow { row: Record<string, string | number | null>; identifier: string }

interface Props {
  onClose: () => void;
}

const CreateGroupFromFile: React.FC<Props> = ({ onClose }) => {
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [matchBy, setMatchBy] = useState<'eid' | 'tag'>('eid');
  const [matched, setMatched] = useState<MatchedAnimal[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedRow[]>([]);
  const [matching, setMatching] = useState(false);

  const [name, setName] = useState('');
  const [cattleType, setCattleType] = useState('Cows');
  const [groupType, setGroupType] = useState('general');
  const [saving, setSaving] = useState(false);
  const [showUnmatched, setShowUnmatched] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    setFileLoading(true);
    try {
      const parsed = await parseFile(file);
      setParsedFile(parsed);
      const hasEid = parsed.headers.some(h => /^eid$/i.test(h.trim()));
      setMatchBy(hasEid ? 'eid' : 'tag');
    } catch {
      showToast('error', 'Could not parse file');
    }
    setFileLoading(false);
  }, [showToast]);

  const handleMatch = useCallback(async () => {
    if (!parsedFile) return;
    setMatching(true);
    try {
      const { data: animals } = await supabase
        .from('animals')
        .select('id, tag, eid')
        .eq('operation_id', operationId)
        .eq('status', 'Active');

      const animalMap = new Map<string, MatchedAnimal>();
      for (const a of (animals ?? [])) {
        if (matchBy === 'eid' && a.eid) animalMap.set(a.eid.trim().toLowerCase(), a);
        animalMap.set(a.tag.trim().toLowerCase(), a);
      }

      const col = matchBy === 'eid'
        ? parsedFile.headers.find(h => /^eid$/i.test(h.trim())) ?? parsedFile.headers.find(h => /eid/i.test(h))
        : parsedFile.headers.find(h => /^tag$/i.test(h.trim())) ?? parsedFile.headers.find(h => /tag/i.test(h));

      const matchedSet: MatchedAnimal[] = [];
      const unmatchedSet: UnmatchedRow[] = [];
      const seenIds = new Set<string>();

      for (const row of parsedFile.rows) {
        const val = String(row[col ?? ''] ?? '').trim().toLowerCase();
        if (!val) continue;
        const found = animalMap.get(val);
        if (found && !seenIds.has(found.id)) {
          seenIds.add(found.id);
          matchedSet.push(found);
        } else if (!found) {
          unmatchedSet.push({ row, identifier: val });
        }
      }

      setMatched(matchedSet);
      setUnmatched(unmatchedSet);
      setStep(2);
    } catch {
      showToast('error', 'Matching failed');
    }
    setMatching(false);
  }, [parsedFile, operationId, matchBy, showToast]);

  const handleCreate = async () => {
    if (!name.trim()) { showToast('error', 'Name is required'); return; }
    if (!matched.length) { showToast('error', 'No matched animals'); return; }
    setSaving(true);
    try {
      const { data: group, error: gErr } = await supabase
        .from('groups')
        .insert({ operation_id: operationId, name: name.trim(), cattle_type: cattleType, group_type: groupType })
        .select('id')
        .single();
      if (gErr) throw gErr;

      const today = new Date().toISOString().slice(0, 10);
      const rows = matched.map(a => ({
        animal_id: a.id,
        group_id: group.id,
        operation_id: operationId,
        start_date: today,
        source: 'file_upload',
      }));

      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await (supabase.from('animal_groups' as any).insert(rows.slice(i, i + 200)));
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['groups'] });
      showToast('success', `Created group '${name.trim()}' with ${matched.length} animals`);
      navigate(`/reference/groups/${group.id}`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create group');
    }
    setSaving(false);
  };

  return (
    <div className="rounded-xl px-3 py-3.5 space-y-3" style={{ backgroundColor: 'white', border: '2px solid #F3D12A' }}>
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0E2646' }}>Create Group from File</p>
        <button onClick={onClose} style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          {!parsedFile ? (
            <div
              onClick={() => inputRef.current?.click()}
              style={{ border: '2px dashed #D4D4D0', borderRadius: 10, height: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 6 }}
            >
              {fileLoading ? (
                <p style={{ fontSize: 13, color: '#888' }}>Parsing…</p>
              ) : (
                <>
                  <Upload size={28} color="#BBB" />
                  <p style={{ fontSize: 13, color: '#888' }}>Tap to select a file</p>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F5F5F0', borderRadius: 8, padding: 10 }}>
              <FileText size={18} color="#55BAAA" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0E2646' }}>{parsedFile.fileName}</p>
                <p style={{ fontSize: 11, color: '#888' }}>{parsedFile.totalRows} rows · Matching by {matchBy.toUpperCase()}</p>
              </div>
              <button onClick={() => inputRef.current?.click()} style={{ fontSize: 11, color: '#55BAAA', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Change</button>
            </div>
          )}
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} style={{ display: 'none' }} />

          {parsedFile && (
            <button
              onClick={handleMatch}
              disabled={matching}
              className="w-full rounded-full py-2.5 cursor-pointer active:scale-[0.97]"
              style={{ backgroundColor: '#F3D12A', fontSize: 13, fontWeight: 700, color: '#0E2646', border: 'none', opacity: matching ? 0.6 : 1 }}
            >
              {matching ? 'Matching…' : 'Match Animals'}
            </button>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div style={{ background: '#F5F5F0', borderRadius: 8, padding: 10 }}>
            <p style={{ fontSize: 13, color: '#0E2646' }}>
              <span style={{ fontWeight: 700, color: '#55BAAA' }}>{matched.length}</span> of {parsedFile?.totalRows} matched.{' '}
              {unmatched.length > 0 && <span style={{ color: '#E74C3C' }}>{unmatched.length} not found.</span>}
            </p>
          </div>

          {unmatched.length > 0 && (
            <div>
              <button
                onClick={() => setShowUnmatched(!showUnmatched)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#888', fontWeight: 600 }}
              >
                {showUnmatched ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showUnmatched ? 'Hide' : 'Show'} Unmatched
              </button>
              {showUnmatched && (
                <div style={{ maxHeight: 120, overflowY: 'auto', marginTop: 4 }}>
                  {unmatched.map((u, i) => (
                    <p key={i} style={{ fontSize: 11, color: '#888', padding: '2px 0' }}>{u.identifier}</p>
                  ))}
                </div>
              )}
            </div>
          )}

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

          <button
            onClick={handleCreate}
            disabled={saving || !matched.length}
            className="w-full rounded-full py-2.5 cursor-pointer active:scale-[0.97]"
            style={{ backgroundColor: '#F3D12A', fontSize: 13, fontWeight: 700, color: '#0E2646', border: 'none', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Creating…' : `Create Group (${matched.length} animals)`}
          </button>
        </div>
      )}
    </div>
  );
};

export default CreateGroupFromFile;
