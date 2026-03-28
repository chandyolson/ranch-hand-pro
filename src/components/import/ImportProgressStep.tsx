import React from 'react';
import { CheckCircle } from 'lucide-react';

interface Props {
  progress: number;
  done: boolean;
  updatedCount: number;
  createdCount: number;
  skippedCount: number;
  onReset: () => void;
}

const ImportProgressStep: React.FC<Props> = ({ progress, done, updatedCount, createdCount, skippedCount, onReset }) => {
  return (
    <div className="space-y-6" style={{ textAlign: 'center', paddingTop: 40 }}>
      {!done ? (
        <>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0E2646' }}>Importing…</h2>
          <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#E0E0E0', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: '#55BAAA',
                borderRadius: 4,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <p style={{ fontSize: 13, color: '#888' }}>{Math.round(progress)}% complete</p>
        </>
      ) : (
        <>
          <CheckCircle size={48} color="#55BAAA" style={{ margin: '0 auto' }} />
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0E2646' }}>Import Complete</h2>
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 16,
              textAlign: 'left',
            }}
          >
            <p style={{ fontSize: 14, color: '#0E2646', marginBottom: 4 }}>
              <strong style={{ color: '#55BAAA' }}>{updatedCount}</strong> animals updated
            </p>
            <p style={{ fontSize: 14, color: '#0E2646', marginBottom: 4 }}>
              <strong style={{ color: '#F3D12A' }}>{createdCount}</strong> new animals created
            </p>
            <p style={{ fontSize: 14, color: '#888' }}>
              <strong>{skippedCount}</strong> skipped
            </p>
          </div>
          <button
            onClick={onReset}
            style={{
              width: '100%',
              height: 40,
              borderRadius: 20,
              background: 'transparent',
              border: '1.5px solid #55BAAA',
              color: '#55BAAA',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Import another file
          </button>
        </>
      )}
    </div>
  );
};

export default ImportProgressStep;
