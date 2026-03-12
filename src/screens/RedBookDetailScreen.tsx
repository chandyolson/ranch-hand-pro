import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";
import EditDeleteButtons from "@/components/EditDeleteButtons";
import { Skeleton } from "@/components/ui/skeleton";

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

const RedBookDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [hasAction, setHasAction] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const { data: note, isLoading } = useQuery({
    queryKey: ["red-book-note", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("red_book_notes")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Populate form when note loads
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBody(note.body || "");
      setCategory(note.category);
      setHasAction(note.has_action);
      setIsPinned(note.is_pinned);
    }
  }, [note]);

  const handleSave = async () => {
    if (!title.trim()) { showToast("error", "Title is required"); return; }
    if (!category) { showToast("error", "Select a category"); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("red_book_notes")
        .update({
          title: title.trim(),
          body: body.trim() || null,
          category,
          has_action: hasAction,
          is_pinned: isPinned,
        })
        .eq("id", id!);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["red-book-notes"] });
      queryClient.invalidateQueries({ queryKey: ["red-book-note", id] });
      showToast("success", "Note updated");
      setEditing(false);
    } catch (err: any) {
      showToast("error", err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("red_book_notes").delete().eq("id", id!);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["red-book-notes"] });
      showToast("success", "Note deleted");
      navigate("/red-book");
    } catch (err: any) {
      showToast("error", err.message || "Failed to delete");
    }
  };

  const handleCancel = () => {
    if (note) {
      setTitle(note.title);
      setBody(note.body || "");
      setCategory(note.category);
      setHasAction(note.has_action);
      setIsPinned(note.is_pinned);
    }
    setEditing(false);
  };

  const togglePin = async () => {
    if (editing) {
      setIsPinned(!isPinned);
      return;
    }
    try {
      const { error } = await supabase
        .from("red_book_notes")
        .update({ is_pinned: !note!.is_pinned })
        .eq("id", id!);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["red-book-notes"] });
      queryClient.invalidateQueries({ queryKey: ["red-book-note", id] });
      showToast("success", !note!.is_pinned ? "Pinned" : "Unpinned");
    } catch (err: any) {
      showToast("error", err.message || "Failed to update");
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 pt-4 pb-10 space-y-3">
        <Skeleton className="h-8 w-48 rounded-lg" style={{ backgroundColor: "rgba(14,38,70,0.10)" }} />
        <Skeleton className="h-[200px] rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.10)" }} />
        <Skeleton className="h-[80px] rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.10)" }} />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="px-4 pt-4 pb-10">
        <div className="py-12 text-center space-y-2">
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>Note not found</div>
          <button
            className="rounded-full px-5 py-2 cursor-pointer active:scale-[0.97]"
            style={{ backgroundColor: "#0E2646", color: "white", fontSize: 13, fontWeight: 600, border: "none" }}
            onClick={() => navigate("/red-book")}
          >
            ← Back to Red Book
          </button>
        </div>
      </div>
    );
  }

  const cat = categoryConfig[note.category] || categoryConfig["document"];
  const createdDate = new Date(note.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const updatedDate = new Date(note.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer active:scale-[0.95]"
          style={{ backgroundColor: "rgba(14,38,70,0.06)", border: "none" }}
          onClick={() => navigate("/red-book")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0E2646" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase" }}>RED BOOK</span>
        </div>
        {!editing && (
          <div className="flex items-center gap-1.5">
            {/* Pin toggle */}
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer active:scale-[0.95] transition-all"
              style={{ backgroundColor: note.is_pinned ? "rgba(243,209,42,0.15)" : "rgba(14,38,70,0.06)", border: "none" }}
              onClick={togglePin}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill={note.is_pinned ? "#F3D12A" : "none"} stroke={note.is_pinned ? "#F3D12A" : "#0E2646"} strokeWidth="1.2">
                <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1-.707.708l-.89-.89-3.535 3.535.708 4.244a.5.5 0 0 1-.848.39L6.354 10.3l-4.243 4.243a.5.5 0 1 1-.707-.707L5.646 9.594 2.141 6.088a.5.5 0 0 1 .39-.848l4.244.708L10.31 2.413l-.89-.89a.5.5 0 0 1 .407-.8z" />
              </svg>
            </button>
            <EditDeleteButtons onEdit={() => setEditing(true)} onDelete={handleDelete} />
          </div>
        )}
      </div>

      {/* Main card */}
      <div className="rounded-xl px-3 py-3.5 space-y-3" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        {/* Title */}
        {editing ? (
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
        ) : (
          <div className="flex items-start justify-between gap-2 pb-2" style={{ borderBottom: "1px solid rgba(212,212,208,0.30)" }}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5" style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.3 }}>
                {note.is_pinned && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="#F3D12A" className="shrink-0">
                    <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1-.707.708l-.89-.89-3.535 3.535.708 4.244a.5.5 0 0 1-.848.39L6.354 10.3l-4.243 4.243a.5.5 0 1 1-.707-.707L5.646 9.594 2.141 6.088a.5.5 0 0 1 .39-.848l4.244.708L10.31 2.413l-.89-.89a.5.5 0 0 1 .407-.8z" />
                  </svg>
                )}
                <span>{note.title}</span>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              {note.has_action && (
                <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", backgroundColor: "rgba(155,35,53,0.20)", color: "#D4606E" }}>
                  ACTION
                </span>
              )}
              <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", backgroundColor: cat.bg, color: cat.color }}>
                {cat.label.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* Body */}
        {editing ? (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your note here…"
            className="w-full min-h-[140px] resize-none bg-transparent outline-none"
            style={{ fontSize: 16, fontWeight: 400, color: "#1A1A1A", lineHeight: 1.6 }}
          />
        ) : (
          <div style={{ fontSize: 15, fontWeight: 400, color: "#1A1A1A", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
            {note.body || <span style={{ color: "rgba(26,26,26,0.30)", fontStyle: "italic" }}>No content</span>}
          </div>
        )}

        {/* Meta row (view mode only) */}
        {!editing && (
          <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid rgba(212,212,208,0.30)" }}>
            <div
              className="rounded-full flex items-center justify-center shrink-0"
              style={{ width: 24, height: 24, backgroundColor: "rgba(14,38,70,0.08)", fontSize: 10, fontWeight: 700, color: "rgba(26,26,26,0.60)" }}
            >
              {note.author_initials || "—"}
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(26,26,26,0.40)" }}>
              Created {createdDate}
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(26,26,26,0.25)" }}>•</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(26,26,26,0.40)" }}>
              Updated {updatedDate}
            </span>
            <span className="flex-1" />
            {note.attachment_count > 0 && (
              <div className="flex items-center gap-1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(26,26,26,0.40)" }}>{note.attachment_count}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category card (edit mode) */}
      {editing && (
        <div className="rounded-xl px-3 py-3.5" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 8 }}>CATEGORY</div>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => {
              const cfg = categoryConfig[c.value];
              const isSelected = category === c.value;
              return (
                <button
                  key={c.value}
                  className="flex items-center gap-1.5 rounded-full px-3.5 py-2 border cursor-pointer transition-all active:scale-[0.96]"
                  style={{
                    fontSize: 13, fontWeight: 600,
                    backgroundColor: isSelected ? cfg.bg : "white",
                    borderColor: isSelected ? cfg.color : "#D4D4D0",
                    color: isSelected ? cfg.color : "rgba(26,26,26,0.50)",
                  }}
                  onClick={() => setCategory(c.value)}
                >
                  <span className="rounded-full shrink-0" style={{ width: 6, height: 6, backgroundColor: cfg.color }} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Options card (edit mode) */}
      {editing && (
        <div className="rounded-xl px-3 py-3.5 space-y-4" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
          {/* Action toggle */}
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
                style={{ width: 16, height: 16, top: 4, left: hasAction ? 24 : 4 }}
              />
            </button>
          </div>

          {/* Pin toggle */}
          <div className="flex items-center justify-between" style={{ borderTop: "1px solid rgba(212,212,208,0.30)", paddingTop: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Pinned</div>
              <div style={{ fontSize: 12, color: "rgba(26,26,26,0.40)", marginTop: 2 }}>Keeps note at top of list</div>
            </div>
            <button
              className="relative cursor-pointer transition-all rounded-full"
              style={{
                width: 44, height: 24,
                backgroundColor: isPinned ? "#F3D12A" : "rgba(26,26,26,0.15)",
                border: "none",
              }}
              onClick={() => setIsPinned(!isPinned)}
            >
              <span
                className="absolute rounded-full bg-white shadow transition-all"
                style={{ width: 16, height: 16, top: 4, left: isPinned ? 24 : 4 }}
              />
            </button>
          </div>
        </div>
      )}

      {/* Action buttons (edit mode) */}
      {editing && (
        <div className="flex gap-3 pt-1">
          <button
            className="flex-1 rounded-full py-3.5 border cursor-pointer active:scale-[0.97]"
            style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 14, fontWeight: 600, color: "#0E2646" }}
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="rounded-full py-3.5 cursor-pointer active:scale-[0.97]"
            style={{ flex: 2, backgroundColor: "#F3D12A", fontSize: 14, fontWeight: 700, color: "#1A1A1A", border: "none", boxShadow: "0 2px 8px rgba(243,209,42,0.30)", opacity: saving ? 0.5 : 1 }}
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
};

export default RedBookDetailScreen;
