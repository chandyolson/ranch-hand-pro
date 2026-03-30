import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';
import { useChuteSideToast } from '@/components/ToastContext';
import { parseFile, ParsedFile } from '@/lib/import/file-parser';
import { MatchBy, CompareTarget, CompareAnimal, CompareStatus, fetchTargetAnimals, compareFile, detectMatchBy } from '@/lib/compare/file-comparer';
import UploadAndTargetStep from '@/components/compare/UploadAndTargetStep';
import ComparisonResults from '@/components/compare/ComparisonResults';
import ComparisonActions from '@/components/compare/ComparisonActions';
import { ArrowLeft } from 'lucide-react';

export default function CompareFileScreen() {
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [target, setTarget] = useState<CompareTarget>('group');
  const [targetId, setTargetId] = useState('');
  const [matchBy, setMatchBy] = useState<MatchBy>('eid');
  const [comparing, setComparing] = useState(false);
  const [results, setResults] = useState<CompareAnimal[]>([]);
  const [filter, setFilter] = useState<CompareStatus | null>(null);
  const [targetName, setTargetName] = useState('');

  const { data: groups = [] } = useQuery({
    queryKey: ['groups', operationId],
    queryFn: async () => {
      const { data } = await supabase.from('groups').select('id, name').eq('operation_id', operationId).eq('is_active', true).order('name');
      return data ?? [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list', operationId],
    queryFn: async () => {
      const { data } = await (supabase.from('projects' as any).select('id, name, date').eq('operation_id', operationId).order('date', { ascending: false }));
      return (data ?? []) as Array<{ id: string; name: string; date: string }>;
    },
  });

  const handleFileSelect = useCallback(async (file: File) => {
    setFileLoading(true);
    try {
      const parsed = await parseFile(file);
      setParsedFile(parsed);
      setMatchBy(detectMatchBy(parsed.headers));
    } catch {
      showToast('error', 'Could not parse file');
    }
    setFileLoading(false);
  }, [showToast]);

  const handleCompare = useCallback(async () => {
    if (!parsedFile || !targetId) return;
    setComparing(true);
    try {
      const animals = await fetchTargetAnimals(operationId, target, targetId);
      const res = compareFile(parsedFile.rows, parsedFile.headers, animals, matchBy);
      setResults(res);
      const name = target === 'group'
        ? groups.find(g => g.id === targetId)?.name ?? 'Group'
        : projects.find(p => p.id === targetId)?.name ?? 'Project';
      setTargetName(name);
      setFilter(null);
      setStep(2);
    } catch {
      showToast('error', 'Comparison failed');
    }
    setComparing(false);
  }, [parsedFile, targetId, operationId, target, matchBy, groups, projects, showToast]);

  return (
    <div style={{ background: '#F5F5F0', minHeight: '100vh' }}>
      <div
        style={{
          background: 'linear-gradient(180deg, #153566 0%, #0E2646 100%)',
          padding: '48px 16px 16px',
        }}
      >
        <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Compare File</h1>
      </div>

      <div style={{ maxWidth: 576, margin: '0 auto', padding: 16 }}>
        {step === 2 && (
          <button
            onClick={() => setStep(1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#55BAAA', fontSize: 13, fontWeight: 600, marginBottom: 12 }}
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}

        {step === 1 && (
          <UploadAndTargetStep
            parsedFile={parsedFile}
            onFileSelect={handleFileSelect}
            loading={fileLoading}
            target={target}
            onTargetChange={t => { setTarget(t); setTargetId(''); }}
            targetId={targetId}
            onTargetIdChange={setTargetId}
            matchBy={matchBy}
            onMatchByChange={setMatchBy}
            groups={groups}
            projects={projects}
            onCompare={handleCompare}
            comparing={comparing}
          />
        )}

        {step === 2 && (
          <div className="space-y-4">
            <ComparisonResults
              results={results}
              fileName={parsedFile?.fileName ?? ''}
              targetName={targetName}
              filter={filter}
              onFilterChange={setFilter}
            />
            <ComparisonActions
              results={results}
              targetId={targetId}
              targetName={targetName}
              targetType={target}
            />
          </div>
        )}
      </div>
    </div>
  );
}
