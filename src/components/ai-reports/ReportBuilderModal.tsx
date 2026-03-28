import React, { useState, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { useOperation } from '@/contexts/OperationContext';
import { useChuteSideToast } from '@/components/ToastContext';
import ReportSectionPicker from './ReportSectionPicker';
import ReportConfigForm from './ReportConfigForm';
import ReportProgress from './ReportProgress';
import { generateSectionData, assembleReportPDF, SectionResult } from '@/lib/ai-reports/report-builder';
import { ReportConfig } from '@/lib/ai-reports/section-prompts';
import { generateReportFilename } from '@/lib/ai-reports/export-utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

const today = new Date().toISOString().split('T')[0];
const janFirst = `${new Date().getFullYear()}-01-01`;

const ReportBuilderModal: React.FC<Props> = ({ open, onClose }) => {
  const { operationId, operationName } = useOperation();
  const { showToast } = useChuteSideToast();

  const [step, setStep] = useState(1);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [title, setTitle] = useState(`Herd Report — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);
  const [dateStart, setDateStart] = useState(janFirst);
  const [dateEnd, setDateEnd] = useState(today);
  const [groupFilter, setGroupFilter] = useState('all');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeTables, setIncludeTables] = useState(true);
  const [sectionStatus, setSectionStatus] = useState<Record<string, 'waiting' | 'loading' | 'done' | 'error'>>({});
  const [generationDone, setGenerationDone] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const pdfRef = useRef<any>(null);

  const handleToggle = (id: string) => {
    setSelectedSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleQuickSelect = (ids: string[]) => {
    setSelectedSections(ids);
  };

  const handleGenerate = useCallback(async () => {
    setStep(3);
    const statusInit: Record<string, 'waiting'> = {};
    selectedSections.forEach(id => { statusInit[id] = 'waiting'; });
    setSectionStatus(statusInit);
    setGenerationDone(false);

    const config: ReportConfig = {
      title,
      dateStart,
      dateEnd,
      groupFilter,
      groupName: groupFilter === 'all' ? 'All Groups' : groupFilter,
      includeCharts,
      includeTables,
      operationId,
      operationName,
    };

    const results: SectionResult[] = [];

    for (const sectionId of selectedSections) {
      const result = await generateSectionData(sectionId, config, (id, status) => {
        setSectionStatus(prev => ({ ...prev, [id]: status }));
      });
      results.push(result);
    }

    try {
      const doc = assembleReportPDF(config, results);
      pdfRef.current = doc;
      const pages = (doc as any).internal.getNumberOfPages();
      setPageCount(pages);
      doc.save(generateReportFilename(title, 'pdf'));
      showToast('success', `Report generated — ${pages} pages`);
    } catch {
      showToast('error', 'Failed to assemble PDF');
    }

    setGenerationDone(true);
  }, [selectedSections, title, dateStart, dateEnd, groupFilter, includeCharts, includeTables, operationId, operationName, showToast]);

  const handleDownloadAgain = () => {
    if (pdfRef.current) {
      pdfRef.current.save(generateReportFilename(title, 'pdf'));
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedSections([]);
    setGenerationDone(false);
    setSectionStatus({});
    onClose();
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: '#F5F5F0',
        animation: 'slideUp 0.3s ease-out',
        overflowY: 'auto',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'linear-gradient(180deg, #153566 0%, #081020 100%)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>Build Report</span>
        <button
          onClick={handleClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          <X size={20} color="#fff" />
        </button>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 4, padding: '12px 16px 0' }}>
        {[1, 2, 3].map(s => (
          <div
            key={s}
            style={{
              flex: 1, height: 4, borderRadius: 2,
              background: s <= step ? '#55BAAA' : '#D4D4D0',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 16, maxWidth: 580, margin: '0 auto' }}>
        {step === 1 && (
          <ReportSectionPicker
            selected={selectedSections}
            onToggle={handleToggle}
            onQuickSelect={handleQuickSelect}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <ReportConfigForm
            title={title}
            dateStart={dateStart}
            dateEnd={dateEnd}
            groupFilter={groupFilter}
            includeCharts={includeCharts}
            includeTables={includeTables}
            onChangeTitle={setTitle}
            onChangeDateStart={setDateStart}
            onChangeDateEnd={setDateEnd}
            onChangeGroupFilter={setGroupFilter}
            onChangeIncludeCharts={setIncludeCharts}
            onChangeIncludeTables={setIncludeTables}
            onBack={() => setStep(1)}
            onGenerate={handleGenerate}
          />
        )}
        {step === 3 && (
          <ReportProgress
            selectedIds={selectedSections}
            sectionStatus={sectionStatus}
            done={generationDone}
            pageCount={pageCount}
            onDownload={handleDownloadAgain}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
};

export default ReportBuilderModal;
