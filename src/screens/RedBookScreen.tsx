import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import RedBookCard from "@/components/RedBookCard";
import { Skeleton } from "@/components/ui/skeleton";

const filterChips = [
  { value: "all", label: "All" },
  { value: "invoice", label: "Invoice / Receipt" },
  { value: "cattle-note", label: "Cattle Note" },
  { value: "document", label: "Document" },
  { value: "repairs", label: "Repairs" },
];

const RedBookScreen: React.FC = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const navigate = useNavigate();
  const { operationId } = useOperation();

  const { data: entries, isLoading } = useQuery({
    queryKey: ["red-book-notes", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("red_book_notes")
        .select("*")
        .eq("operation_id", operationId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const notes = entries || [];

  const filtered = notes
    .filter(e => categoryFilter === "all" || e.category === categoryFilter)
    .filter(e =>
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.body || "").toLowerCase().includes(search.toLowerCase())
    );

  const actionCount = notes.filter(e => e.has_action).length;
  const firstPinnedIdx = filtered.findIndex(e => e.is_pinned);
  const isFiltering = search || categoryFilter !== "all";

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 22, fontWeight: 800, color: "#0E2646", letterSpacing: "-0.02em" }}>Red Book</span>
        <button
          className="rounded-full h-9 px-4 flex items-center gap-1.5 cursor-pointer active:scale-[0.97]"
          style={{ backgroundColor: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A", border: "none" }}
          onClick={() => navigate("/red-book/new")}
        >
          <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</span> New
        </button>
      </div>

      {/* Action banner */}
      {actionCount > 0 && (
        <div
          className="rounded-xl px-3 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #9B2335 0%, #7A1C2A 100%)" }}
          onClick={() => setCategoryFilter("all")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
            <line x1="12" y1="8" x2="12" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1" fill="white" />
          </svg>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
              {actionCount} action {actionCount === 1 ? "item" : "items"} need attention
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.60)", marginTop: 2 }}>Tap to filter</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.50)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 bg-white rounded-xl px-3 h-11" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.30)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes…"
          className="flex-1 outline-none bg-transparent"
          style={{ fontSize: 16, color: "#1A1A1A" }}
        />
        {search.length > 0 && (
          <button
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
            style={{ backgroundColor: "rgba(26,26,26,0.08)", fontSize: 12, color: "rgba(26,26,26,0.50)", border: "none" }}
            onClick={() => setSearch("")}
          >
            ×
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 flex-wrap">
        {filterChips.map(chip => {
          const isActive = categoryFilter === chip.value;
          return (
            <button
              key={chip.value}
              className="rounded-full px-3 py-1.5 cursor-pointer border transition-all active:scale-[0.96]"
              style={{
                backgroundColor: isActive ? "#0E2646" : "white",
                borderColor: isActive ? "#0E2646" : "rgba(212,212,208,0.80)",
                color: isActive ? "white" : "rgba(26,26,26,0.50)",
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
              }}
              onClick={() => setCategoryFilter(chip.value)}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Results label */}
      {isFiltering && (
        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.15)" }} />
          ))}
        </div>
      )}

      {/* Entry list */}
      {!isLoading && (
        filtered.length === 0 ? (
          <div className="py-12 text-center space-y-1.5">
            <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>No notes found</div>
            <div style={{ fontSize: 13, color: "rgba(26,26,26,0.30)" }}>
              {notes.length === 0 ? "Tap + New to create your first note" : "Try a different search or category"}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filtered.map((e, idx) => (
              <React.Fragment key={e.id}>
                {idx === firstPinnedIdx && e.is_pinned && (
                  <div className="md:col-span-2" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.30)", textTransform: "uppercase", marginBottom: 4 }}>
                    PINNED
                  </div>
                )}
                <RedBookCard
                  id={e.id}
                  title={e.title}
                  body={e.body || undefined}
                  category={e.category as any}
                  date={new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  authorInitials={e.author_initials || "—"}
                  isPinned={e.is_pinned}
                  hasAction={e.has_action}
                  attachmentCount={e.attachment_count}
                  onClick={() => navigate("/red-book/" + e.id)}
                />
              </React.Fragment>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default RedBookScreen;
