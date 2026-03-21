import React, { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useBuyerDirectory } from "@/hooks/sale-barn/useBuyerDirectory";
import { useChuteSideToast } from "@/components/ToastContext";
import { focusGold, blurReset } from "@/lib/styles";
import type { BuyerDirectoryEntry } from "@/types/sale-barn";

const INPUT: React.CSSProperties = {
  flex: 1, minWidth: 0, height: 36, borderRadius: 8,
  border: "1px solid #D4D4D0", fontSize: 16, padding: "0 12px",
  outline: "none", backgroundColor: "#FFFFFF", boxSizing: "border-box",
};
const LABEL_S: React.CSSProperties = {
  width: 85, flexShrink: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A",
};

const FR: React.FC<{ label: string; req?: boolean; children: React.ReactNode }> = ({ label, req, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
    <span style={LABEL_S}>{label}{req && <span style={{ color: "#9B2335", marginLeft: 2 }}>*</span>}</span>
    <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
  </div>
);

const BuyerDirectory: React.FC = () => {
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();
  const qc = useQueryClient();
  const { data, isLoading } = useBuyerDirectory();
  const buyers = data?.data ?? [];

  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* add form state */
  const empty = { buyer_num: "", name: "", state: "", phone: "", type: "", needs: "", notes: "" };
  const [form, setForm] = useState(empty);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const filtered = useMemo(() => {
    if (!search) return buyers;
    const q = search.toLowerCase();
    return buyers.filter((b) => b.name.toLowerCase().includes(q) || b.buyer_num.toLowerCase().includes(q));
  }, [buyers, search]);

  const handleSave = async () => {
    if (!form.buyer_num.trim() || !form.name.trim()) { showToast("error", "Buyer # and Name are required"); return; }
    setSaving(true);
    const { error } = await (supabase.from("buyer_directory") as any).insert({
      operation_id: operationId,
      buyer_num: form.buyer_num.trim(),
      name: form.name.trim(),
      state: form.state.trim() || null,
      phone: form.phone.trim() || null,
      type: form.type.trim() || null,
      needs: form.needs.trim() || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) { showToast("error", error.message); return; }
    showToast("success", `Buyer ${form.buyer_num} saved`);
    setForm(empty);
    setShowAdd(false);
    qc.invalidateQueries({ queryKey: ["buyer_directory"] });
  };

  return (
    <div style={{ padding: "0 16px 24px" }}>
      {/* Toolbar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646", letterSpacing: "-0.02em" }}>Buyers</span>
          <button
            onClick={() => setShowAdd(!showAdd)}
            style={{
              width: 36, height: 36, borderRadius: 9999, backgroundColor: "#F3D12A",
              border: "none", fontSize: 20, fontWeight: 700, color: "#1A1A1A", lineHeight: 1, cursor: "pointer",
            }}
            className="active:scale-[0.95]"
          >+</button>
        </div>

        {/* Search */}
        <div
          style={{
            height: 44, borderRadius: 12, border: "1px solid rgba(212,212,208,0.60)",
            background: "#FFFFFF", display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="8" cy="8" r="5.5" stroke="rgba(26,26,26,0.30)" strokeWidth="1.5" />
            <path d="M12.5 12.5L16 16" stroke="rgba(26,26,26,0.30)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 16, color: "#1A1A1A", minWidth: 0 }}
            placeholder="Search buyers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ width: 24, height: 24, borderRadius: 12, background: "rgba(26,26,26,0.08)", border: "none", fontSize: 12, color: "rgba(26,26,26,0.50)", cursor: "pointer" }}
            >×</button>
          )}
        </div>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div style={{
          background: "#FFFFFF", borderRadius: 12, border: "1px solid #F3D12A",
          boxShadow: "0 0 0 2px rgba(243,209,42,0.15)", padding: "12px 14px", marginBottom: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0E2646", marginBottom: 10 }}>New Buyer</div>
          <FR label="Buyer #" req><input style={INPUT} value={form.buyer_num} onChange={(e) => set("buyer_num", e.target.value)} onFocus={focusGold} onBlur={blurReset} placeholder="B-0000" /></FR>
          <FR label="Name" req><input style={INPUT} value={form.name} onChange={(e) => set("name", e.target.value)} onFocus={focusGold} onBlur={blurReset} /></FR>
          <FR label="State"><input style={INPUT} value={form.state} onChange={(e) => set("state", e.target.value)} onFocus={focusGold} onBlur={blurReset} /></FR>
          <FR label="Phone"><input style={INPUT} value={form.phone} onChange={(e) => set("phone", e.target.value)} onFocus={focusGold} onBlur={blurReset} /></FR>
          <FR label="Type"><input style={INPUT} value={form.type} onChange={(e) => set("type", e.target.value)} onFocus={focusGold} onBlur={blurReset} placeholder="e.g. Feedlot" /></FR>
          <FR label="Needs"><input style={INPUT} value={form.needs} onChange={(e) => set("needs", e.target.value)} onFocus={focusGold} onBlur={blurReset} /></FR>
          <FR label="Notes"><input style={INPUT} value={form.notes} onChange={(e) => set("notes", e.target.value)} onFocus={focusGold} onBlur={blurReset} /></FR>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={() => { setShowAdd(false); setForm(empty); }} style={{
              flex: 0.4, height: 40, borderRadius: 9999, border: "1.5px solid #D4D4D0",
              background: "transparent", fontSize: 14, fontWeight: 600, color: "#717182", cursor: "pointer",
            }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="active:scale-[0.97]" style={{
              flex: 1, height: 40, borderRadius: 9999, border: "none",
              background: "#F3D12A", fontSize: 14, fontWeight: 700, color: "#1A1A1A",
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
            }}>{saving ? "Saving…" : "Save Buyer"}</button>
          </div>
        </div>
      )}

      {/* Cards */}
      {isLoading && <div style={{ textAlign: "center", padding: 40, color: "#717182" }}>Loading…</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((b) => (
          <BuyerCard key={b.id} buyer={b} expanded={expanded === b.id} onToggle={() => setExpanded(expanded === b.id ? null : b.id)} />
        ))}
      </div>
      {filtered.length === 0 && !isLoading && (
        <div style={{ textAlign: "center", padding: 40, color: "#717182", fontSize: 14 }}>No buyers found</div>
      )}
    </div>
  );
};

/* ── Card ── */
const BuyerCard: React.FC<{
  buyer: BuyerDirectoryEntry; expanded: boolean; onToggle: () => void;
}> = ({ buyer: b, expanded, onToggle }) => {
  const subParts: string[] = [];
  if (b.state) subParts.push(b.state);
  if (b.phone) subParts.push(b.phone);
  if (b.type) subParts.push(b.type);

  const noCvi = b.needs?.toLowerCase().includes("no cvi");
  const cviBadge = noCvi
    ? { bg: "rgba(243,209,42,0.12)", color: "#F3D12A", label: "No CVI" }
    : b.needs ? { bg: "rgba(85,186,170,0.15)", color: "#55BAAA", label: "CVI Required" } : null;

  return (
    <button
      type="button"
      className="active:scale-[0.98]"
      onClick={onToggle}
      style={{
        width: "100%", textAlign: "left", cursor: "pointer",
        background: "#0E2646", borderRadius: 10, padding: "12px 14px", border: "none",
      }}
    >
      {/* Row 1 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#F0F0F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
          {b.name}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#55BAAA", flexShrink: 0, marginLeft: 8 }}>
          {b.buyer_num}
        </span>
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
          {b.description && (
            <div style={{ fontSize: 12, color: "rgba(240,240,240,0.50)", marginBottom: 6 }}>{b.description}</div>
          )}
          {cviBadge && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", borderRadius: 9999,
              padding: "3px 8px", background: cviBadge.bg, color: cviBadge.color,
              display: "inline-block", marginBottom: 6,
            }}>{cviBadge.label}</span>
          )}
          {b.notes ? (
            <div style={{ background: "rgba(85,186,170,0.08)", borderRadius: 8, padding: "8px 10px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#55BAAA" }}>NOTE: </span>
              <span style={{ fontSize: 12, color: "rgba(168,230,218,0.80)" }}>{b.notes}</span>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "rgba(240,240,240,0.30)", fontStyle: "italic" }}>No notes</div>
          )}
        </div>
      )}
    </button>
  );
};

export default BuyerDirectory;
