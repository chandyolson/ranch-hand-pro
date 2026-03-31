import React from "react";
import { FileSpreadsheet, Image, X } from "lucide-react";

interface Props {
  filename: string;
  rowCount?: number;
  isImage: boolean;
  thumbnailUrl?: string;
  onRemove: () => void;
}

const FilePreviewBar: React.FC<Props> = ({ filename, rowCount, isImage, thumbnailUrl, onRemove }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 12px",
      background: "#fff",
      border: "1px solid #D4D4D0",
      borderRadius: 8,
      margin: "0 16px 6px",
    }}
  >
    {isImage && thumbnailUrl ? (
      <img src={thumbnailUrl} alt="" style={{ height: 48, borderRadius: 6, objectFit: "cover" }} />
    ) : isImage ? (
      <Image size={14} color="#55BAAA" />
    ) : (
      <FileSpreadsheet size={14} color="#55BAAA" />
    )}
    <span style={{ fontSize: 12, color: "#666", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {filename}{rowCount != null ? ` • ${rowCount} rows` : ""}
    </span>
    <button
      onClick={onRemove}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 0 }}
    >
      <X size={14} color="#BBB" />
    </button>
  </div>
);

export default FilePreviewBar;
