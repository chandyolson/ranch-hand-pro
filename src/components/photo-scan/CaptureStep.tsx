import React, { useRef } from "react";
import { Camera, Image as ImageIcon } from "lucide-react";

export type RecordContext = "calving" | "treatment" | "tally" | "receipt" | "general";

const CONTEXTS: { label: string; value: RecordContext }[] = [
  { label: "Calving Book", value: "calving" },
  { label: "Treatment Log", value: "treatment" },
  { label: "Tally Sheet", value: "tally" },
  { label: "Sale Receipt", value: "receipt" },
  { label: "Other", value: "general" },
];

interface Props {
  context: RecordContext;
  onContextChange: (c: RecordContext) => void;
  imageUrl: string | null;
  onFileSelect: (file: File) => void;
  onExtract: () => void;
  extracting: boolean;
}

const CaptureStep: React.FC<Props> = ({ context, onContextChange, imageUrl, onFileSelect, onExtract, extracting }) => {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFileSelect(f);
  };

  return (
    <div className="space-y-4">
      <div>
        <p style={{ fontSize: 17, fontWeight: 700, color: "#0E2646" }}>Scan Photo</p>
        <p style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
          Take a photo or upload an image of your records
        </p>
      </div>

      {/* Context pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {CONTEXTS.map((c) => (
          <button
            key={c.value}
            onClick={() => onContextChange(c.value)}
            style={{
              borderRadius: 20,
              border: context === c.value ? "1.5px solid #F3D12A" : "1.5px solid #D4D4D0",
              background: context === c.value ? "#FFF9DB" : "#fff",
              color: "#0E2646",
              fontSize: 13,
              fontWeight: 600,
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Capture buttons or preview */}
      {!imageUrl ? (
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => cameraRef.current?.click()}
            className="active:scale-[0.97]"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              height: 120,
              borderRadius: 12,
              background: "#F3D12A",
              border: "none",
              cursor: "pointer",
              color: "#0E2646",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            <Camera size={28} />
            Take Photo
          </button>
          <button
            onClick={() => uploadRef.current?.click()}
            className="active:scale-[0.97]"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              height: 120,
              borderRadius: 12,
              background: "transparent",
              border: "1.5px solid #0E2646",
              cursor: "pointer",
              color: "#0E2646",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            <ImageIcon size={28} />
            Upload Image
          </button>
        </div>
      ) : (
        <div>
          <div style={{ borderRadius: 12, overflow: "hidden", background: "#F5F5F0", textAlign: "center" }}>
            <img
              src={imageUrl}
              alt="Scanned record"
              style={{ maxHeight: 200, objectFit: "contain", width: "100%", display: "block", margin: "0 auto" }}
              className={extracting ? "animate-pulse" : ""}
            />
          </div>
          <button
            onClick={() => uploadRef.current?.click()}
            style={{ fontSize: 13, color: "#55BAAA", fontWeight: 600, background: "none", border: "none", cursor: "pointer", marginTop: 6 }}
          >
            Change Image
          </button>
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
      <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/heic,image/webp" onChange={handleFile} style={{ display: "none" }} />

      {imageUrl && (
        <button
          onClick={onExtract}
          disabled={extracting}
          className="w-full active:scale-[0.97]"
          style={{
            height: 40,
            borderRadius: 20,
            background: "#F3D12A",
            border: "none",
            fontSize: 14,
            fontWeight: 700,
            color: "#0E2646",
            cursor: extracting ? "wait" : "pointer",
            opacity: extracting ? 0.7 : 1,
          }}
        >
          {extracting ? "Reading your records…" : "Extract Data"}
        </button>
      )}
    </div>
  );
};

export default CaptureStep;
