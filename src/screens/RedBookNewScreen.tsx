import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";

const categoryConfig: Record<string, { label: string; color: string; bg: string }> = {
  "invoice":     { label: "Invoice / Receipt", color: "#F3D12A", bg: "rgba(243,209,42,0.12)" },
  "cattle-note": { label: "Cattle Note",       color: "#55BAAA", bg: "rgba(85,186,170,0.12)" },
  "document":    { label: "Document",          color: "#A8A8F0", bg: "rgba(168,168,240,0.12)" },
  "repairs":     { label: "Repairs",           color: "#E8A0BF", bg: "rgba(232,160,191,0.12)" },
};

const categories = [
  { value: "invoice", label: "Invoice / Receipt" },
  { value: "cattle-note", label: "Cattle Note" },
  { value: "document", label: "Document" },
  { value: "repairs", label: "Repairs" },
];

interface PendingFile {
  file: File;
  name: string;
  type: "photo" | "document";
  previewUrl?: string;
}

const RedBookNewScreen: React.FC = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("");
  const [hasAction, setHasAction] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const queryClient = useQueryClient();

  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const previewUrl = URL.createObjectURL(file);
      setPendingFiles(prev => [...prev, { file, name: file.name, type: "photo", previewUrl }]);
    });
    e.target.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      setPendingFiles(prev => [...prev, { file, name: file.name, type: "document" }]);
    });
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => {
      const removed = prev[index];
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSave = async () => {
    if (!title.trim()) { showToast("error", "Title is required"); return; }
    if (!category) { showToast("error", "Select a category"); return; }
    setSaving(true);
    try {
      // 1. Create the note
      const { data: noteData, error: noteErr } = await supabase
        .from("red_book_notes")
        .insert({
          operation_id: operationId,
          title: title.trim(),
          body: body.trim() || null,
          category,
          has_action: hasAction,
          is_pinned: false,
          attachment_count: pendingFiles.length,
          author_initials: "ME",
        })
        .select("id")
        .single();
      if (noteErr) throw noteErr;

      // 2. Upload files and create attachment records
      if (pendingFiles.length > 0) {
        for (const pf of pendingFiles) {
          const ext = pf.file.name.split(".").pop() || "bin";
          const storagePath = `${operationId}/${noteData.id}/${crypto.randomUUID()}.${ext}`;

          const { error: uploadErr } = await supabase.storage
            .from("red-book-attachments")
            .upload(storagePath, pf.file, { cacheControl: "3600", upsert: false });
          if (uploadErr) {
            console.error("Upload error:", uploadErr);
            showToast("error", `Failed to upload ${pf.name}`);
            continue;
          }

          await supabase.from("red_book_attachments").insert({
            note_id: noteData.id,
            operation_id: operationId,
            file_name: pf.name,
            file_type: pf.type,
            file_path: storagePath,
            file_size: pf.file.size,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["red-book-notes"] });
      showToast("success", "Note saved");
      navigate("/red-book");
    } catch (err: any) {
      showToast("error", err.message || "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      {/* Hidden file inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handlePhotoSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.heic"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Main entry card */}
      <div className="rounded-xl px-3 py-3.5 space-y-3" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Note title…"
          className="w-full bg-transparent outline-none pb-2 focus:border-[#F3D12A]"
          style={{
            fontSize: 18, fontWeight: 700, color: "#1A1A1A",
            borderBottom: "1px solid rgba(212,212,208,0.50)",
          }}
          onFocus={e => { e.currentTarget.style.borderBottomColor = "#F3D12A"; }}
          onBlur={e => { e.currentTarget.style.borderBottomColor = "rgba(212,212,208,0.50)"; }}
        />

        <div className="flex items-start gap-2 pt-1">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your note here… or tap the mic to dictate"
            className="flex-1 min-h-[120px] resize-none bg-transparent outline-none"
            style={{ fontSize: 16, fontWeight: 400, color: "#1A1A1A", lineHeight: 1.6 }}
          />
          <button
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-[0.95] relative"
            style={{
              backgroundColor: isListening ? "rgba(155,35,53,0.10)" : "rgba(14,38,70,0.05)",
              border: `1.5px solid ${isListening ? "#9B2335" : "rgba(14,38,70,0.15)"}`,
            }}
            onClick={() => {
              setIsListening(!isListening);
              showToast("info", isListening ? "Dictation stopped" : "Listening… speak your note");
            }}
          >
            {isListening && (
              <span className="animate-ping absolute inset-0 rounded-full" style={{ backgroundColor: "rgba(155,35,53,0.20)" }} />
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isListening ? "#9B2335" : "#0E2646"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
              <rect x="9" y="1" width="6" height="12" rx="3" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        </div>
      </div>

      {/* Category card */}
      <div className="rounded-xl px-3 py-3.5" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 8 }}>CATEGORY</div>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => {
            const cfg = categoryConfig[cat.value];
            const isSelected = category === cat.value;
            return (
              <button
                key={cat.value}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 border cursor-pointer transition-all active:scale-[0.96]"
                style={{
                  fontSize: 13, fontWeight: 600,
                  backgroundColor: isSelected ? cfg.bg : "white",
                  borderColor: isSelected ? cfg.color : "#D4D4D0",
                  color: isSelected ? cfg.color : "rgba(26,26,26,0.50)",
                }}
                onClick={() => setCategory(isSelected ? "" : cat.value)}
              >
                <span className="rounded-full shrink-0" style={{ width: 6, height: 6, backgroundColor: cfg.color }} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Options card */}
      <div className="rounded-xl px-3 py-3.5" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Needs Follow-up</div>
            <div style={{ fontSize: 12, color: "rgba(26,26,26,0.40)", marginTop: 2 }}>Appears on dashboard action list</div>
          </div>
          <button
            className="relative cursor-pointer transition-all rounded-full"
            style={{
              width: 44, height: 24,
              backgroundColor: hasAction ? "#9B2335" : "rgba(26,26,26,0.15)",
              border: "none",
            }}
            onClick={() => setHasAction(!hasAction)}
          >
            <span
              className="absolute rounded-full bg-white shadow transition-all"
              style={{
                width: 16, height: 16, top: 4,
                left: hasAction ? 24 : 4,
              }}
            />
          </button>
        </div>
      </div>

      {/* Attachments card */}
      <div className="rounded-xl px-3 py-3.5" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase" }}>
            ATTACHMENTS {pendingFiles.length > 0 && `(${pendingFiles.length})`}
          </span>
        </div>

        {/* File previews */}
        {pendingFiles.length > 0 && (
          <div className="space-y-2 mb-3">
            {pendingFiles.map((pf, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2" style={{ borderBottom: "1px solid rgba(26,26,26,0.06)" }}>
                {pf.type === "photo" && pf.previewUrl ? (
                  <img
                    src={pf.previewUrl}
                    alt={pf.name}
                    className="rounded-md shrink-0 object-cover"
                    style={{ width: 36, height: 36 }}
                  />
                ) : pf.type === "photo" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                ) : (
                  <div className="shrink-0 w-9 h-9 rounded-md flex items-center justify-center" style={{ backgroundColor: "rgba(14,38,70,0.06)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{pf.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(26,26,26,0.35)" }}>{formatFileSize(pf.file.size)}</div>
                </div>
                <button
                  className="cursor-pointer shrink-0 w-7 h-7 rounded-full flex items-center justify-center active:scale-[0.9]"
                  style={{ backgroundColor: "rgba(155,35,53,0.08)", border: "none" }}
                  onClick={() => removeFile(i)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9B2335" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-xl py-3 border flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97]"
            style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646" }}
            onClick={() => photoInputRef.current?.click()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0E2646" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Add Photo
          </button>
          <button
            className="flex-1 rounded-xl py-3 border flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97]"
            style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646" }}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0E2646" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Add File
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-1">
        <button
          className="flex-1 rounded-full py-3.5 border cursor-pointer active:scale-[0.97]"
          style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 14, fontWeight: 600, color: "#0E2646" }}
          onClick={() => navigate(-1)}
        >
          Cancel
        </button>
        <button
          className="rounded-full py-3.5 cursor-pointer active:scale-[0.97]"
          style={{ flex: 2, backgroundColor: "#0E2646", fontSize: 14, fontWeight: 700, color: "white", border: "none", opacity: saving ? 0.5 : 1 }}
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save Note"}
        </button>
      </div>
    </div>
  );
};

export default RedBookNewScreen;
