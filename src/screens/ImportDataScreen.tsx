import React, { useState, useCallback } from 'react';
import { useOperation } from '@/contexts/OperationContext';
import { useChuteSideToast } from '@/components/ToastContext';
import { parseFile, ParsedFile } from '@/lib/import/file-parser';
import { guessMapping } from '@/lib/import/column-guesser';
import { matchAnimals, MatchResult } from '@/lib/import/animal-matcher';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AnimalUpdate = Database['public']['Tables']['animals']['Update'];
type AnimalInsert = Database['public']['Tables']['animals']['Insert'];
import UploadStep from '@/components/import/UploadStep';
import ColumnMappingStep from '@/components/import/ColumnMappingStep';
import MatchReviewStep from '@/components/import/MatchReviewStep';
import ImportProgressStep from '@/components/import/ImportProgressStep';

const ImportDataScreen: React.FC = () => {
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();

  const [step, setStep] = useState(1);
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [conflictChoices, setConflictChoices] = useState<Record<string, Record<string, 'keep' | 'import'>>>({});
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [createdCount, setCreatedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  const handleFileSelect = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const result = await parseFile(file);
      setParsedFile(result);
      setMapping(guessMapping(result.headers));
    } catch (err: any) {
      showToast('error', err.message || 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const handleMappingChange = (header: string, value: string) => {
    setMapping(prev => ({ ...prev, [header]: value }));
  };

  const handleMatchStep = async () => {
    if (!parsedFile || !operationId) return;
    setLoading(true);
    try {
      const results = await matchAnimals(parsedFile.rows, mapping, operationId);
      setMatchResults(results);
      setStep(3);
    } catch (err: any) {
      showToast('error', err.message || 'Matching failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConflictChoice = (rowIndex: number, field: string, choice: 'keep' | 'import') => {
    setConflictChoices(prev => ({
      ...prev,
      [rowIndex]: { ...(prev[rowIndex] || {}), [field]: choice },
    }));
  };

  const handleImport = async () => {
    setStep(4);
    setProgress(0);
    setImportDone(false);

    const toProcess = matchResults.filter(r => r.matchType !== 'skipped');
    const batchSize = 10;
    let updated = 0;
    let created = 0;
    let skipped = 0;

    const tagCol = Object.keys(mapping).find(k => mapping[k] === 'tag');
    const eidCol = Object.keys(mapping).find(k => mapping[k] === 'eid');

    for (let i = 0; i < toProcess.length; i += batchSize) {
      const batch = toProcess.slice(i, i + batchSize);

      for (const item of batch) {
        try {
          if (item.matchType === 'matched' && item.animalId) {
            const updates = item.updateFields || {};
            if (Object.keys(updates).length > 0) {
              await supabase.from('animals').update(updates as unknown as AnimalUpdate).eq('id', item.animalId);
              updated++;
            } else {
              skipped++;
            }
          } else if (item.matchType === 'conflict' && item.animalId) {
            const updates: Record<string, unknown> = { ...(item.updateFields || {}) };
            const choices = conflictChoices[item.rowIndex] || {};
            for (const c of item.conflicts || []) {
              if (choices[c.field] === 'import') {
                updates[c.field] = c.field === 'year_born' ? Number(c.importValue) : c.importValue;
              }
            }
            if (Object.keys(updates).length > 0) {
              await supabase.from('animals').update(updates as unknown as AnimalUpdate).eq('id', item.animalId);
              updated++;
            } else {
              skipped++;
            }
          } else if (item.matchType === 'new') {
            const newAnimal: Record<string, unknown> = { operation_id: operationId, status: 'Active', sex: 'Female' };
            for (const [colName, fieldName] of Object.entries(mapping)) {
              if (fieldName === '__skip__' || fieldName === 'sire_tag' || fieldName === 'dam_tag' || fieldName === 'weight') continue;
              const val = item.rowData[colName];
              if (val != null && String(val).trim()) {
                if (fieldName === 'year_born') {
                  newAnimal[fieldName] = Number(val);
                } else {
                  newAnimal[fieldName] = String(val).trim();
                }
              }
            }
            if (!newAnimal.tag) {
              skipped++;
              continue;
            }
            await supabase.from('animals').insert(newAnimal as unknown as AnimalInsert);
            created++;
          }
        } catch {
          skipped++;
        }
      }

      setProgress(Math.min(100, ((i + batch.length) / toProcess.length) * 100));
    }

    setUpdatedCount(updated);
    setCreatedCount(created);
    setSkippedCount(skipped + matchResults.filter(r => r.matchType === 'skipped').length);
    setProgress(100);
    setImportDone(true);
    showToast('success', `Import complete: ${updated} updated, ${created} created`);
  };

  const handleReset = () => {
    setStep(1);
    setParsedFile(null);
    setMapping({});
    setMatchResults([]);
    setConflictChoices({});
    setProgress(0);
    setImportDone(false);
    setUpdatedCount(0);
    setCreatedCount(0);
    setSkippedCount(0);
  };

  return (
    <div style={{ background: '#F5F5F0', minHeight: '100vh', padding: '16px' }}>
      <div style={{ maxWidth: 580, margin: '0 auto' }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: s <= step ? '#55BAAA' : '#D4D4D0',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {step === 1 && (
          <UploadStep
            parsedFile={parsedFile}
            onFileSelect={handleFileSelect}
            onNext={() => setStep(2)}
            loading={loading}
          />
        )}
        {step === 2 && parsedFile && (
          <ColumnMappingStep
            parsedFile={parsedFile}
            mapping={mapping}
            onMappingChange={handleMappingChange}
            onBack={() => setStep(1)}
            onNext={handleMatchStep}
          />
        )}
        {step === 3 && (
          <MatchReviewStep
            results={matchResults}
            conflictChoices={conflictChoices}
            onConflictChoice={handleConflictChoice}
            onBack={() => setStep(2)}
            onImport={handleImport}
            loading={loading}
          />
        )}
        {step === 4 && (
          <ImportProgressStep
            progress={progress}
            done={importDone}
            updatedCount={updatedCount}
            createdCount={createdCount}
            skippedCount={skippedCount}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
};

export default ImportDataScreen;
