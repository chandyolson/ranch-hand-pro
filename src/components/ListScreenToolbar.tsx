import React, { useState, useRef, useEffect } from "react";

interface FilterChip {
  value: string;
  label: string;
}

interface SortOption {
  value: string;
  label: string;
}

interface ListScreenToolbarProps {
  title: string;
  addLabel: string;
  onAdd: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filterChips: FilterChip[];
  activeFilter: string;
  onFilterChange: (value: string) => void;
  sortOptions?: SortOption[];
  activeSort?: string;
  onSortChange?: (value: string) => void;
  onImport?: () => void;
  onExport?: () => void;
  onMassSelect?: () => void;
  onMassEdit?: () => void;
  resultCount?: number;
  isFiltering?: boolean;
  hideTitle?: boolean;
  compactAdd?: boolean;
  hideSort?: boolean;
}

const ListScreenToolbar: React.FC<ListScreenToolbarProps> = ({
  title, addLabel, onAdd, searchValue, onSearchChange, searchPlaceholder = "Search…",
  filterChips, activeFilter, onFilterChange, sortOptions, activeSort, onSortChange,
  onImport, onExport, onMassSelect, onMassEdit, resultCount, isFiltering,
  hideTitle, compactAdd, hideSort,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const hasMenu = !!(onImport || onExport || onMassSelect || onMassEdit);
  const activeFilterLabel = filterChips.find(c => c.value === activeFilter)?.label || "Filter";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeSortLabel = sortOptions?.find(s => s.value === activeSort)?.label || "Sort";

  const menuItems: { icon: React.ReactNode; label: string; onClick: () => void }[] = [];
  if (onImport) menuItems.push({ icon: <ImportIcon />, label: "Import", onClick: () => { onImport(); setMenuOpen(false); } });
  if (onExport) menuItems.push({ icon: <ExportIcon />, label: "Export", onClick: () => { onExport(); setMenuOpen(false); } });
  const hasDivider = menuItems.length > 0 && !!(onMassSelect || onMassEdit);
  if (onMassSelect) menuItems.push({ icon: <CheckSquareIcon />, label: "Mass Select", onClick: () => { onMassSelect(); setMenuOpen(false); } });
  if (onMassEdit) menuItems.push({ icon: <EditIcon />, label: "Mass Edit", onClick: () => { onMassEdit(); setMenuOpen(false); } });
  const dividerAfterIdx = hasDivider ? (onImport && onExport ? 1 : 0) : -1;

  return (
    <div className="space-y-3">
      {/* Row 1: Title/Search + menu + add */}
      <div className="flex items-center gap-2">
        {!hideTitle && (
          <span className="flex-shrink-0" style={{ fontSize: 20, fontWeight: 800, color: "#0E2646", letterSpacing: "-0.02em" }}>
            {title}
          </span>
        )}
        {hideTitle ? (
          <div
            className="flex items-center gap-2 bg-white rounded-xl px-3 flex-1 min-w-0"
            style={{ height: 40, border: "1px solid rgba(212,212,208,0.60)" }}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="shrink-0">
              <circle cx="8" cy="8" r="5.5" stroke="rgba(26,26,26,0.30)" strokeWidth="1.5" />
              <path d="M12.5 12.5L16 16" stroke="rgba(26,26,26,0.30)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 outline-none bg-transparent min-w-0"
              style={{ fontSize: 15, color: "#1A1A1A" }}
            />
            {searchValue.length > 0 && (
              <button
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                style={{ backgroundColor: "rgba(26,26,26,0.08)", border: "none", fontSize: 12, color: "rgba(26,26,26,0.50)" }}
                onClick={() => onSearchChange("")}
              >×</button>
            )}
          </div>
        ) : <div className="flex-1" />}
        <div className="flex items-center gap-2 shrink-0">
          {hasMenu && (
            <div className="relative" ref={menuRef}>
              <button
                className="flex items-center justify-center cursor-pointer active:scale-[0.97]"
                style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: "white", border: "1px solid #D4D4D0" }}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <svg width="4" height="18" viewBox="0 0 4 18" fill="none">
                  <circle cx="2" cy="3" r="1.5" fill="#0E2646" />
                  <circle cx="2" cy="9" r="1.5" fill="#0E2646" />
                  <circle cx="2" cy="15" r="1.5" fill="#0E2646" />
                </svg>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-1 z-50 rounded-xl py-1"
                  style={{ backgroundColor: "white", border: "1px solid #D4D4D0", boxShadow: "0 10px 25px rgba(0,0,0,0.12)", minWidth: 180 }}
                >
                  {menuItems.map((item, i) => (
                    <React.Fragment key={item.label}>
                      {i === dividerAfterIdx + 1 && hasDivider && (
                        <div style={{ height: 1, backgroundColor: "rgba(212,212,208,0.60)", margin: "4px 0" }} />
                      )}
                      <button
                        className="flex items-center gap-3 w-full cursor-pointer active:bg-[rgba(0,0,0,0.04)]"
                        style={{ height: 44, paddingLeft: 16, paddingRight: 16, border: "none", backgroundColor: "transparent", fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}
                        onClick={item.onClick}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            className="flex items-center justify-center cursor-pointer active:scale-[0.95]"
            style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: "#F3D12A", border: "none", fontSize: 20, fontWeight: 700, color: "#1A1A1A", lineHeight: 1 }}
            onClick={onAdd}
          >+</button>
        </div>
      </div>

      {/* Row 2: Search (only when title is shown) */}
      {!hideTitle && (
        <div
          className="flex items-center gap-2 bg-white rounded-xl px-3"
          style={{ height: 44, border: "1px solid rgba(212,212,208,0.60)" }}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="shrink-0">
            <circle cx="8" cy="8" r="5.5" stroke="rgba(26,26,26,0.30)" strokeWidth="1.5" />
            <path d="M12.5 12.5L16 16" stroke="rgba(26,26,26,0.30)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 outline-none bg-transparent"
            style={{ fontSize: 16, color: "#1A1A1A" }}
          />
          {searchValue.length > 0 && (
            <button
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
              style={{ backgroundColor: "rgba(26,26,26,0.08)", border: "none", fontSize: 12, color: "rgba(26,26,26,0.50)" }}
              onClick={() => onSearchChange("")}
            >×</button>
          )}
        </div>
      )}

      {/* Row 3: Filter dropdown + Sort */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1" ref={filterRef}>
          <button
            className="flex items-center gap-1.5 rounded-full cursor-pointer active:scale-[0.97]"
            style={{
              height: 30,
              paddingLeft: 10,
              paddingRight: 10,
              backgroundColor: activeFilter === filterChips[0]?.value ? "white" : "#0E2646",
              border: "1px solid " + (activeFilter === filterChips[0]?.value ? "#D4D4D0" : "#0E2646"),
              fontSize: 12,
              fontWeight: 600,
              color: activeFilter === filterChips[0]?.value ? "rgba(26,26,26,0.50)" : "white",
            }}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M2 3h12L9 8.5V13l-2-1V8.5L2 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {activeFilterLabel}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: filterOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 150ms" }}>
              <path d="M2.5 3.75L5 6.25L7.5 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {filterOpen && (
            <div
              className="absolute left-0 mt-1 z-50 rounded-xl py-1"
              style={{ backgroundColor: "white", border: "1px solid #D4D4D0", boxShadow: "0 10px 25px rgba(0,0,0,0.12)", minWidth: 160 }}
            >
              {filterChips.map(chip => (
                <button
                  key={chip.value}
                  className="flex items-center justify-between w-full cursor-pointer"
                  style={{
                    height: 36,
                    paddingLeft: 14,
                    paddingRight: 14,
                    border: "none",
                    backgroundColor: activeFilter === chip.value ? "rgba(14,38,70,0.06)" : "transparent",
                    fontSize: 13,
                    fontWeight: activeFilter === chip.value ? 700 : 400,
                    color: "#1A1A1A",
                  }}
                  onClick={() => { onFilterChange(chip.value); setFilterOpen(false); }}
                >
                  {chip.label}
                  {activeFilter === chip.value && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7l3 3 5-5" stroke="#0E2646" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        {!hideSort && sortOptions && sortOptions.length > 0 && onSortChange && (
          <div className="relative shrink-0" ref={sortRef}>
            <button
              className="flex items-center gap-1 rounded-full cursor-pointer active:scale-[0.96]"
              style={{ height: 26, paddingLeft: 8, paddingRight: 8, backgroundColor: "white", border: "1px solid #D4D4D0", fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.50)" }}
              onClick={() => setSortOpen(!sortOpen)}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {activeSortLabel}
            </button>
            {sortOpen && (
              <div
                className="absolute right-0 mt-1 z-50 rounded-xl py-1"
                style={{ backgroundColor: "white", border: "1px solid #D4D4D0", boxShadow: "0 10px 25px rgba(0,0,0,0.12)", minWidth: 140 }}
              >
                {sortOptions.map(opt => (
                  <button
                    key={opt.value}
                    className="flex items-center w-full cursor-pointer"
                    style={{
                      height: 36,
                      paddingLeft: 14,
                      paddingRight: 14,
                      border: "none",
                      backgroundColor: activeSort === opt.value ? "rgba(14,38,70,0.06)" : "transparent",
                      fontSize: 12,
                      fontWeight: activeSort === opt.value ? 700 : 500,
                      color: "#1A1A1A",
                    }}
                    onClick={() => { onSortChange(opt.value); setSortOpen(false); }}
                  >{opt.label}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Result count */}
      {isFiltering && resultCount !== undefined && (
        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>
          {resultCount} result{resultCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
};

/* ── Inline menu icons (16×16) ── */
const ImportIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ExportIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 10V2M5 5l3-3 3 3M3 12h10" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CheckSquareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="#1A1A1A" strokeWidth="1.5" />
    <path d="M5 8l2 2 4-4" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default ListScreenToolbar;