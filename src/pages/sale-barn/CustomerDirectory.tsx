import React, { useState, useMemo } from "react";
import { useSaleBarnCustomers } from "@/hooks/sale-barn/useSaleBarnCustomers";
import type { SaleBarnCustomer } from "@/types/sale-barn";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "Seller", label: "Sellers" },
  { value: "Buyer", label: "Buyers" },
];

const BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  Seller: { bg: "rgba(243,209,42,0.12)", color: "#F3D12A" },
  Buyer: { bg: "rgba(85,186,170,0.15)", color: "#55BAAA" },
  Both: { bg: "rgba(240,240,240,0.10)", color: "rgba(240,240,240,0.50)" },
};

const CustomerDirectory: React.FC = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useSaleBarnCustomers(search, page);
  const customers = data?.data ?? [];
  const total = data?.count ?? 0;

  const filtered = useMemo(() => {
    if (filter === "all") return customers;
    return customers.filter((c) => c.type === filter || c.type === "Both");
  }, [customers, filter]);

  return (
    <div style={{ padding: "0 16px 24px" }}>
      {/* Toolbar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646", letterSpacing: "-0.02em" }}>Customers</span>
          <button
            style={{
              height: 32, borderRadius: 9999, border: "1px solid #D4D4D0", background: "#FFFFFF",
              padding: "0 12px", fontSize: 12, fontWeight: 600, color: "#717182",
              display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
            }}
            onClick={() => {/* import CSV placeholder */}}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="#717182" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Import CSV
          </button>
        </div>

        {/* Search */}
        <div
          style={{
            height: 44, borderRadius: 12, border: "1px solid rgba(212,212,208,0.60)",
            background: "#FFFFFF", display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
            marginBottom: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="8" cy="8" r="5.5" stroke="rgba(26,26,26,0.30)" strokeWidth="1.5" />
            <path d="M12.5 12.5L16 16" stroke="rgba(26,26,26,0.30)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 16, color: "#1A1A1A", minWidth: 0 }}
            placeholder={`Search ${total.toLocaleString()} customers…`}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(0); }}
              style={{ width: 24, height: 24, borderRadius: 12, background: "rgba(26,26,26,0.08)", border: "none", fontSize: 12, color: "rgba(26,26,26,0.50)", cursor: "pointer" }}
            >×</button>
          )}
        </div>

        {/* Filter pills + result count */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{
                  height: 30, borderRadius: 9999, padding: "0 12px", fontSize: 12, fontWeight: 600,
                  border: active ? "1px solid #0E2646" : "1px solid #D4D4D0",
                  background: active ? "#0E2646" : "#FFFFFF",
                  color: active ? "#FFFFFF" : "rgba(26,26,26,0.50)",
                  cursor: "pointer",
                }}
              >{f.label}</button>
            );
          })}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Cards */}
      {isLoading && <div style={{ textAlign: "center", padding: 40, color: "#717182" }}>Loading…</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((c) => (
          <CustomerCard key={c.id} customer={c} expanded={expanded === c.id} onToggle={() => setExpanded(expanded === c.id ? null : c.id)} />
        ))}
      </div>

      {/* Load more */}
      {customers.length >= 50 && (
        <button
          onClick={() => setPage((p) => p + 1)}
          style={{
            width: "100%", height: 40, borderRadius: 10, border: "1px solid #D4D4D0",
            background: "transparent", fontSize: 13, fontWeight: 600, color: "#717182",
            cursor: "pointer", marginTop: 10,
          }}
        >Load More</button>
      )}

      {/* Last sync */}
      <div style={{ textAlign: "center", fontSize: 11, color: "#717182", marginTop: 16 }}>
        Last sync: {new Date().toLocaleString()}
      </div>
    </div>
  );
};

/* ── Card ── */
const CustomerCard: React.FC<{
  customer: SaleBarnCustomer; expanded: boolean; onToggle: () => void;
}> = ({ customer: c, expanded, onToggle }) => {
  const badge = BADGE_STYLE[c.type ?? ""] ?? BADGE_STYLE.Both;
  const subParts: string[] = [];
  if (c.state) subParts.push(c.state);
  if (c.phone) subParts.push(c.phone);

  return (
    <button
      type="button"
      className="active:scale-[0.98]"
      onClick={onToggle}
      style={{
        width: "100%", textAlign: "left", cursor: "pointer",
        background: "#0E2646", borderRadius: 10, padding: "12px 14px",
        border: "none",
      }}
    >
      {/* Row 1 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#F0F0F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
          {c.name}
        </span>
        {c.type && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", borderRadius: 9999,
            padding: "3px 8px", background: badge.bg, color: badge.color, flexShrink: 0, marginLeft: 8,
          }}>{c.type.toUpperCase()}</span>
        )}
      </div>

      {/* Row 2 */}
      {subParts.length > 0 && (
        <div style={{ fontSize: 13, fontWeight: 400, color: "rgba(240,240,240,0.60)", marginTop: 2 }}>
          {subParts.join(" · ")}
        </div>
      )}

      {/* Expanded */}
      {expanded && (
        <div style={{ marginTop: 8, borderTop: "1px solid rgba(240,240,240,0.08)", paddingTop: 8 }}>
          {c.address && (
            <div style={{ fontSize: 12, color: "rgba(240,240,240,0.50)", marginBottom: 6 }}>{c.address}</div>
          )}
          {c.notes ? (
            <div style={{ background: "rgba(85,186,170,0.08)", borderRadius: 8, padding: "8px 10px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#55BAAA" }}>NOTE: </span>
              <span style={{ fontSize: 12, color: "rgba(168,230,218,0.80)" }}>{c.notes}</span>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "rgba(240,240,240,0.30)", fontStyle: "italic" }}>No notes</div>
          )}
        </div>
      )}
    </button>
  );
};

export default CustomerDirectory;
