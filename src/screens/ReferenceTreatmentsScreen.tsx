import React, { useState } from "react";
import { useChuteSideToast } from "@/components/ToastContext";

interface Product {
  id: string;
  name: string;
  category: "vaccine" | "antibiotic" | "hormone" | "mineral" | "other";
  defaultDosage: string;
  defaultRoute: string;
  withdrawalDays: number;
}

const routeOptions = ["IM", "SQ", "IV", "Topical", "Oral", "Intranasal"];
const categoryOptions: Product["category"][] = ["vaccine", "antibiotic", "hormone", "mineral", "other"];
const categoryConfig: Record<string, { label: string; color: string; bg: string }> = {
  vaccine:    { label: "Vaccine",    color: "#55BAAA", bg: "rgba(85,186,170,0.12)" },
  antibiotic: { label: "Antibiotic", color: "#E87461", bg: "rgba(232,116,97,0.12)" },
  hormone:    { label: "Hormone",    color: "#A8A8F0", bg: "rgba(168,168,240,0.12)" },
  mineral:    { label: "Mineral",    color: "#F3D12A", bg: "rgba(243,209,42,0.12)" },
  other:      { label: "Other",      color: "#A8A8A8", bg: "rgba(168,168,168,0.12)" },
};

const labelStyle: React.CSSProperties = { width: 96, flexShrink: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A" };
const inputClass = "flex-1 h-10 rounded-lg border border-[#D4D4D0] bg-white px-3 outline-none font-['Inter'] transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25";

const ReferenceTreatmentsScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([
    { id: "p1",  name: "Multimin 90",        category: "mineral",    defaultDosage: "12 mL",  defaultRoute: "SQ",      withdrawalDays: 0 },
    { id: "p2",  name: "Lutalyse",           category: "hormone",    defaultDosage: "5 mL",   defaultRoute: "IM",      withdrawalDays: 0 },
    { id: "p3",  name: "Bovi-Shield Gold 5", category: "vaccine",    defaultDosage: "2 mL",   defaultRoute: "IM",      withdrawalDays: 21 },
    { id: "p4",  name: "Ivermectin Pour-On", category: "mineral",    defaultDosage: "55 mL",  defaultRoute: "Topical", withdrawalDays: 48 },
    { id: "p5",  name: "Penicillin G",       category: "antibiotic", defaultDosage: "10 mL",  defaultRoute: "IM",      withdrawalDays: 10 },
    { id: "p6",  name: "Banamine",           category: "other",      defaultDosage: "20 mL",  defaultRoute: "IV",      withdrawalDays: 4 },
    { id: "p7",  name: "Dectomax Pour-On",   category: "mineral",    defaultDosage: "50 mL",  defaultRoute: "Topical", withdrawalDays: 45 },
    { id: "p8",  name: "MU-SE",             category: "mineral",    defaultDosage: "2.5 mL", defaultRoute: "SQ",      withdrawalDays: 0 },
    { id: "p9",  name: "Exceed",            category: "antibiotic", defaultDosage: "6 mL",   defaultRoute: "SQ",      withdrawalDays: 13 },
    { id: "p10", name: "Estrumate",         category: "hormone",    defaultDosage: "2 mL",   defaultRoute: "IM",      withdrawalDays: 0 },
    { id: "p11", name: "Rumensin",          category: "other",      defaultDosage: "",        defaultRoute: "Oral",    withdrawalDays: 0 },
    { id: "p12", name: "Express FP",        category: "vaccine",    defaultDosage: "2 mL",   defaultRoute: "IM",      withdrawalDays: 21 },
  ]);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [newProduct, setNewProduct] = useState({ name: "", category: "vaccine" as Product["category"], defaultDosage: "", defaultRoute: "IM", withdrawalDays: "0" });
  const { showToast } = useChuteSideToast();

  const filtered = products
    .filter(p => categoryFilter === "all" || p.category === categoryFilter)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = () => {
    if (!newProduct.name.trim()) { showToast("error", "Product name is required"); return; }
    setProducts(prev => [...prev, {
      id: "p" + Date.now(), name: newProduct.name.trim(), category: newProduct.category,
      defaultDosage: newProduct.defaultDosage.trim(), defaultRoute: newProduct.defaultRoute,
      withdrawalDays: parseInt(newProduct.withdrawalDays) || 0,
    }]);
    showToast("success", newProduct.name.trim() + " added");
    setNewProduct({ name: "", category: "vaccine", defaultDosage: "", defaultRoute: "IM", withdrawalDays: "0" });
    setAddOpen(false);
  };

  const filterChips = [
    { value: "all", label: "All" },
    ...categoryOptions.map(c => ({ value: c, label: categoryConfig[c].label })),
  ];

  return (
    <div className="px-3 pt-4 pb-10 space-y-3 font-['Inter']">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0E2646" }}>Products</span>
        <button className="rounded-full h-9 px-4 flex items-center gap-1.5 cursor-pointer active:scale-[0.97] font-['Inter']" style={{ backgroundColor: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A", border: "none" }} onClick={() => setAddOpen(true)}>
          <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</span> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white rounded-xl px-3 h-11" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.30)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" className="flex-1 outline-none font-['Inter'] bg-transparent" style={{ fontSize: 16, color: "#1A1A1A" }} />
        {search.length > 0 && (
          <button className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 cursor-pointer" style={{ backgroundColor: "rgba(26,26,26,0.08)", fontSize: 12, color: "rgba(26,26,26,0.50)", border: "none" }} onClick={() => setSearch("")}>×</button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 flex-wrap">
        {filterChips.map(chip => {
          const isActive = categoryFilter === chip.value;
          return (
            <button key={chip.value} className="rounded-full px-3 py-1.5 font-['Inter'] cursor-pointer border transition-all active:scale-[0.96]" style={{ backgroundColor: isActive ? "#0E2646" : "white", borderColor: isActive ? "#0E2646" : "rgba(212,212,208,0.80)", color: isActive ? "white" : "rgba(26,26,26,0.50)", fontSize: 12, fontWeight: isActive ? 700 : 500 }} onClick={() => setCategoryFilter(chip.value)}>
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Add form */}
      {addOpen && (
        <div className="rounded-xl px-3 py-3.5 space-y-2 font-['Inter']" style={{ backgroundColor: "white", border: "2px solid #F3D12A" }}>
          <div className="flex items-center gap-2">
            <span style={labelStyle}>Name</span>
            <input type="text" value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="Product name" className={inputClass} style={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center gap-2">
            <span style={labelStyle}>Category</span>
            <select value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value as Product["category"] }))} className={inputClass} style={{ fontSize: 16 }}>
              {categoryOptions.map(c => <option key={c} value={c}>{categoryConfig[c].label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span style={labelStyle}>Default Dose</span>
            <input type="text" value={newProduct.defaultDosage} onChange={e => setNewProduct(p => ({ ...p, defaultDosage: e.target.value }))} placeholder="e.g. 2 mL" className={inputClass} style={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center gap-2">
            <span style={labelStyle}>Route</span>
            <select value={newProduct.defaultRoute} onChange={e => setNewProduct(p => ({ ...p, defaultRoute: e.target.value }))} className={inputClass} style={{ fontSize: 16 }}>
              {routeOptions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span style={labelStyle}>Withdrawal</span>
            <input type="number" min="0" value={newProduct.withdrawalDays} onChange={e => setNewProduct(p => ({ ...p, withdrawalDays: e.target.value }))} placeholder="days (0 = none)" className={inputClass} style={{ fontSize: 16 }} />
          </div>
          <div className="flex gap-2 mt-1">
            <button className="flex-1 rounded-full py-2.5 border font-['Inter'] cursor-pointer active:scale-[0.97]" style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646" }} onClick={() => { setAddOpen(false); setNewProduct({ name: "", category: "vaccine", defaultDosage: "", defaultRoute: "IM", withdrawalDays: "0" }); }}>Cancel</button>
            <button className="flex-1 rounded-full py-2.5 font-['Inter'] cursor-pointer active:scale-[0.97]" style={{ backgroundColor: "#0E2646", fontSize: 13, fontWeight: 700, color: "white", border: "none" }} onClick={handleAdd}>Save</button>
          </div>
        </div>
      )}

      {/* Product list */}
      <div className="rounded-xl px-3" style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}>
        {filtered.length === 0 ? (
          <div className="py-8 text-center" style={{ fontSize: 13, color: "rgba(26,26,26,0.40)" }}>No products found</div>
        ) : filtered.map(p => {
          const cat = categoryConfig[p.category];
          return (
            <div key={p.id} className="flex items-start gap-3 py-3 border-b border-[rgba(26,26,26,0.06)] last:border-b-0 font-['Inter']">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>{p.name}</span>
                  <span className="rounded-full shrink-0" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", backgroundColor: cat.bg, color: cat.color }}>{cat.label.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {(p.defaultDosage || p.defaultRoute) && (
                    <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(26,26,26,0.50)" }}>
                      {[p.defaultDosage, p.defaultRoute].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {p.withdrawalDays > 0 && (
                    <>
                      <span style={{ width: 1, height: 10, backgroundColor: "rgba(26,26,26,0.12)" }} />
                      <span className="rounded-full" style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", backgroundColor: "rgba(243,209,42,0.12)", color: "#B8960F" }}>
                        {p.withdrawalDays}d withdrawal
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                <button className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer active:scale-[0.95] transition-all" style={{ backgroundColor: "rgba(14,38,70,0.06)", border: "none" }} onClick={() => showToast("info", "Edit " + p.name)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0E2646" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer active:scale-[0.95] transition-all" style={{ backgroundColor: "rgba(212,24,61,0.06)", border: "none" }} onClick={() => { setProducts(prev => prev.filter(x => x.id !== p.id)); showToast("success", p.name + " deleted"); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4183d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReferenceTreatmentsScreen;
