import React, { useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import { ParsedFile, formatFileSize } from '@/lib/import/file-parser';

interface Props {
  parsedFile: ParsedFile | null;
  onFileSelect: (file: File) => void;
  onNext: () => void;
  loading: boolean;
}

const UploadStep: React.FC<Props> = ({ parsedFile, onFileSelect, onNext, loading }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFileSelect(f);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0E2646' }}>Import Data</h2>
        <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
          Upload a CSV or Excel file and the AI will map it to your records
        </p>
      </div>

      {!parsedFile ? (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: '2px dashed #D4D4D0',
            borderRadius: 12,
            height: 160,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            gap: 8,
          }}
        >
          {loading ? (
            <p style={{ fontSize: 14, color: '#888' }}>Parsing file…</p>
          ) : (
            <>
              <Upload size={40} color="#BBB" />
              <p style={{ fontSize: 14, color: '#888' }}>Tap to select a file or drag and drop</p>
              <p style={{ fontSize: 12, color: '#BBB' }}>Supports .csv, .xlsx, .xls</p>
            </>
          )}
        </div>
      ) : (
        <div
          style={{
            background: '#fff',
            borderRadius: 8,
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <FileText size={20} color="#55BAAA" />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0E2646' }}>{parsedFile.fileName}</p>
            <p style={{ fontSize: 12, color: '#888' }}>
              {formatFileSize(parsedFile.fileSize)} · {parsedFile.totalRows} rows · {parsedFile.headers.length} columns
            </p>
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            style={{ fontSize: 12, color: '#55BAAA', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Change file
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      {parsedFile && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {parsedFile.headers.map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #E0E0E0', color: '#888', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedFile.rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {parsedFile.headers.map(h => (
                      <td key={h} style={{ padding: '4px 8px', borderBottom: '1px solid #F0F0F0', color: '#0E2646' }}>{String(row[h] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={onNext}
            style={{
              width: '100%',
              height: 40,
              borderRadius: 20,
              background: '#F3D12A',
              color: '#0E2646',
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Next
          </button>
        </>
      )}
    </div>
  );
};

export default UploadStep;
