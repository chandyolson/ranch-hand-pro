import React from 'react';
import { REPORT_SECTIONS } from '@/lib/ai-reports/section-prompts';
import { CheckCircle, Loader2, Minus } from 'lucide-react';

interface Props {
  selectedIds: string[];
  sectionStatus: Record<string, 'waiting' | 'loading' | 'done' | 'error'>;
  done: boolean;
  pageCount: number;
  onDownload: () => void;
  onClose: () => void;
}

const ReportProgress: React.FC<Props> = ({ selectedIds, sectionStatus, done, pageCount, onDownload, onClose }) => {
  const doneCount = Object.values(sectionStatus).filter(s => s === 'done').length;

  return (
    <div className="space-y-6" style={{ paddingTop: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0E2646' }}>
          {done ? 'Report Complete' : 'Building Your Report'}
        </h2>
        {!done && (
          <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {doneCount} of {selectedIds.length} sections
          </p>
        )}
      </div>

      <div className="space-y-2">
        {selectedIds.map(id => {
          const section = REPORT_SECTIONS.find(s => s.id === id);
          const status = sectionStatus[id] || 'waiting';
          return (
            <div
              key={id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 8, background: '#fff',
              }}
            >
              {status === 'done' && <CheckCircle size={16} color="#55BAAA" />}
              {status === 'loading' && <Loader2 size={16} color="#F3D12A" className="animate-spin" />}
              {status === 'waiting' && <Minus size={16} color="#D4D4D0" />}
              {status === 'error' && <span style={{ color: '#E74C3C', fontSize: 14, fontWeight: 700 }}>✕</span>}
              <span style={{ fontSize: 14, color: status === 'done' ? '#55BAAA' : status === 'loading' ? '#0E2646' : '#888' }}>
                {section?.label || id}
              </span>
            </div>
          );
        })}
      </div>

      {done && (
        <div
          style={{
            background: '#fff', borderRadius: 8, padding: 16, textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 14, color: '#0E2646', marginBottom: 4 }}>
            <strong style={{ color: '#55BAAA' }}>{doneCount}</strong> sections generated. <strong>{pageCount}</strong> pages.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button
              onClick={onDownload}
              style={{
                flex: 1, height: 40, borderRadius: 20, background: '#55BAAA',
                color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
              }}
            >
              Download Again
            </button>
            <button
              onClick={onClose}
              style={{
                flex: 1, height: 40, borderRadius: 20, background: 'transparent',
                border: '1.5px solid #D4D4D0', color: '#888', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportProgress;
