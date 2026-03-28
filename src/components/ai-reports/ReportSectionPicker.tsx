import React from 'react';
import { REPORT_SECTIONS, QUICK_REPORTS } from '@/lib/ai-reports/section-prompts';

interface Props {
  selected: string[];
  onToggle: (id: string) => void;
  onQuickSelect: (ids: string[]) => void;
  onNext: () => void;
}

const ReportSectionPicker: React.FC<Props> = ({ selected, onToggle, onQuickSelect, onNext }) => {
  return (
    <div className="space-y-5">
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0E2646' }}>Build a Custom Report</h2>
        <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Choose what to include</p>
      </div>

      {/* Quick shortcuts */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {QUICK_REPORTS.map(qr => (
          <button
            key={qr.label}
            onClick={() => onQuickSelect(qr.sectionIds)}
            style={{
              border: '1.5px solid #55BAAA',
              background: 'transparent',
              color: '#55BAAA',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 20,
              padding: '6px 14px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {qr.label}
          </button>
        ))}
      </div>

      {/* Section cards */}
      <div className="space-y-2">
        {REPORT_SECTIONS.map(s => {
          const isSelected = selected.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => onToggle(s.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: 12,
                borderRadius: 8,
                border: isSelected ? '1.5px solid #55BAAA' : '1px solid #E0E0E0',
                background: isSelected ? 'rgba(85,186,170,0.06)' : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                border: isSelected ? 'none' : '1.5px solid #D4D4D0',
                background: isSelected ? '#55BAAA' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0E2646' }}>{s.label}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{s.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        disabled={selected.length === 0}
        style={{
          width: '100%',
          height: 40,
          borderRadius: 20,
          background: selected.length > 0 ? '#F3D12A' : '#E0E0E0',
          color: '#0E2646',
          fontWeight: 700,
          fontSize: 14,
          border: 'none',
          cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
        }}
      >
        Next — {selected.length} section{selected.length !== 1 ? 's' : ''}
      </button>
    </div>
  );
};

export default ReportSectionPicker;
