import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import RedBookCard from "@/components/RedBookCard";

interface RedBookEntry {
  id: string;
  title: string;
  body?: string;
  category: "invoice" | "cattle-note" | "document" | "repairs";
  date: string;
  authorInitials: string;
  isPinned: boolean;
  hasAction: boolean;
  attachmentCount: number;
}

const entries: RedBookEntry[] = [
  { id: "rb1", title: "Vet bill — spring preg check", body: "Total $842. Paid by check #1041. Dr. Hendricks — Prairie Vet Clinic. Breakdown: 45 head preg check at $14/head, 3 treatments billed separately.", category: "invoice", date: "Feb 24, 2026", authorInitials: "JO", isPinned: true, hasAction: false, attachmentCount: 2 },
  { id: "rb2", title: "Cow 3309 — watch rear hooves", body: "Noticed slight limp on left rear leaving chute. Not bad enough to treat yet. Check again at weaning.", category: "cattle-note", date: "Feb 24, 2026", authorInitials: "JO", isPinned: false, hasAction: true, attachmentCount: 0 },
  { id: "rb3", title: "Tractor hydraulic line repair", body: "Line blew on the 4440. Temp fix with tape. Get proper fitting from O'Reilly — 3/8 JIC 37 degree fitting.", category: "repairs", date: "Feb 20, 2026", authorInitials: "TW", isPinned: false, hasAction: true, attachmentCount: 1 },
  { id: "rb4", title: "Hay inventory — Feb 2026", body: "East shed: 140 small squares, 22 rounds. West shed: 8 rounds. Should carry through April at current feeding rate.", category: "cattle-note", date: "Feb 18, 2026", authorInitials: "JO", isPinned: false, hasAction: false, attachmentCount: 0 },
  { id: "rb5", title: "Brand inspection cert — spring 2026", body: "", category: "document", date: "Feb 10, 2026", authorInitials: "JO", isPinned: false, hasAction: false, attachmentCount: 1 },
  { id: "rb6", title: "Feed bill — January", body: "Larson Feed: $2,140 for 4 tons range cubes + mineral. Net 30 terms. Due Feb 28.", category: "invoice", date: "Feb 1, 2026", authorInitials: "JO", isPinned: false, hasAction: true, attachmentCount: 1 },
  { id: "rb7", title: "Bull 101 — pasture rotation note", body: "Moved Bull 101 to south pasture with spring calvers. Pull by June 1.", category: "cattle-note", date: "Jan 28, 2026", authorInitials: "TW", isPinned: false, hasAction: false, attachmentCount: 0 },
  { id: "rb8", title: "Fence repair — north section", body: "Three posts down on the north line near the windmill. Need 10 T-posts and staples. Snow melts first.", category: "repairs", date: "Jan 15, 2026", authorInitials: "JO", isPinned: false, hasAction: true, attachmentCount: 0 },
];

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

  const filtered = entries
    .filter(e => categoryFilter === "all" || e.category === categoryFilter)
    .filter(e =>
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.body || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

  const actionCount = entries.filter(e => e.hasAction).length;
  const firstPinnedIdx = filtered.findIndex(e => e.isPinned);
  const isFiltering = search || categoryFilter !== "all";

  return (
    <div className="px-4 pt-4 pb-10 space-y-3 font-['Inter']">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 22, fontWeight: 800, color: "#0E2646", letterSpacing: "-0.02em" }}>Red Book</span>
        <button
          className="rounded-full h-9 px-4 flex items-center gap-1.5 cursor-pointer active:scale-[0.97] font-['Inter']"
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
          className="flex-1 outline-none font-['Inter'] bg-transparent"
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
              className="rounded-full px-3 py-1.5 font-['Inter'] cursor-pointer border transition-all active:scale-[0.96]"
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

      {/* Entry list */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center space-y-1.5 font-['Inter']">
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>No notes found</div>
          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.30)" }}>Try a different search or category</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e, idx) => (
            <React.Fragment key={e.id}>
              {idx === firstPinnedIdx && e.isPinned && (
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.30)", textTransform: "uppercase", marginBottom: 4 }}>
                  PINNED
                </div>
              )}
              <RedBookCard {...e} onClick={() => navigate("/red-book/" + e.id)} />
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default RedBookScreen;
