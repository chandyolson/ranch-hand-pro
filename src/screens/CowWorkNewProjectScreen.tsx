import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChuteSideToast } from "../components/ToastContext";

const typeOptions = ["", "PREG", "AI / BR", "BSE", "SALE / CULL", "TX", "WN", "GEN"];
const groupOptions = ["", "Spring Calvers", "Cow Herd", "Yearlings", "Bulls", "Replacement Heifers", "Summer Pairs"];
const cattleTypeOptions = ["", "Cow", "Heifer", "Bull", "Steer", "Calf", "Mixed"];
const locationOptions = ["", "Home Place", "East Pasture", "West Pasture", "Feedlot", "Sale Barn"];

const templates = [
  { name: "Spring Preg Check", type: "PREG" },
  { name: "Fall Processing", type: "GEN" },
  { name: "Winter Vaccination", type: "TX" },
];

const labelStyle: React.CSSProperties = { width: 96, flexShrink: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A" };
const inputStyle: React.CSSProperties = {
  flex: 1, height: 40, borderRadius: 8, border: "1px solid #D4D4D0", backgroundColor: "white",
  padding: "0 12px", fontFamily: "'Inter', sans-serif", outline: "none", fontSize: 16,
};

export default function CowWorkNewProjectScreen() {
  const [date, setDate] = useState("2026-03-09");
  const [processingType, setProcessingType] = useState("");
  const [group, setGroup] = useState("");
  const [cattleType, setCattleType] = useState("");
  const [location, setLocation] = useState("");
  const [memo, setMemo] = useState("");
  const [productsOpen, setProductsOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [products, setProducts] = useState<{ name: string; dosage: string; route: string }[]>([]);
  const { showToast } = useChuteSideToast();
  const navigate = useNavigate();

  return (
    <div className="px-4 pt-4 pb-10 space-y-3 font-['Inter']">
      {/* Section label */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase" }}>
        PROJECT SETUP
      </div>

      {/* Form card */}
      <div className="rounded-xl bg-white px-3 py-3.5 space-y-2" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        {/* Date */}
        <div className="flex items-center gap-2">
          <label style={labelStyle}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle}
            className="focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25" />
        </div>

        {/* Type */}
        <div className="flex items-center gap-2">
          <label style={labelStyle}>Type</label>
          <select value={processingType} onChange={e => setProcessingType(e.target.value)} style={inputStyle}
            className="focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25">
            <option value="" disabled>Select type</option>
            {typeOptions.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Group */}
        <div className="flex items-center gap-2">
          <label style={labelStyle}>Group</label>
          <select value={group} onChange={e => setGroup(e.target.value)} style={inputStyle}
            className="focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25">
            <option value="" disabled>Select group</option>
            {groupOptions.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Cattle Type */}
        <div className="flex items-center gap-2">
          <label style={labelStyle}>Cattle Type</label>
          <select value={cattleType} onChange={e => setCattleType(e.target.value)} style={inputStyle}
            className="focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25">
            <option value="" disabled>Optional</option>
            {cattleTypeOptions.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2">
          <label style={labelStyle}>Location</label>
          <select value={location} onChange={e => setLocation(e.target.value)} style={inputStyle}
            className="focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25">
            <option value="" disabled>Optional</option>
            {locationOptions.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Memo */}
        <div className="pt-2">
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.40)", textTransform: "uppercase", marginBottom: 6 }}>MEMO</div>
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            className="w-full resize-none rounded-lg px-3 py-2.5 font-['Inter'] outline-none transition-all focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/25"
            style={{ minHeight: 56, backgroundColor: "#F5F5F0", border: "1px solid #D4D4D0", fontSize: 16 }}
          />
        </div>
      </div>

      {/* Products Given collapsible */}
      <div className="rounded-xl bg-white overflow-hidden" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <button
          className="flex items-center justify-between w-full px-4 py-3.5 cursor-pointer active:scale-[0.99]"
          onClick={() => setProductsOpen(!productsOpen)}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>Products Given</span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
            style={{ transform: productsOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
            <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="rgba(26,26,26,0.40)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {productsOpen && (
          <div className="px-4 pb-4" style={{ borderTop: "1px solid rgba(212,212,208,0.40)" }}>
            {products.length === 0 ? (
              <div className="text-center py-3" style={{ fontSize: 13, color: "rgba(26,26,26,0.40)" }}>No products added</div>
            ) : (
              products.map((p, i) => (
                <div key={i} className="flex items-center gap-2 py-2" style={{ borderBottom: "1px solid rgba(26,26,26,0.06)" }}>
                  <span className="flex-1" style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{p.name}</span>
                  <span style={{ fontSize: 13, color: "rgba(26,26,26,0.50)" }}>{p.dosage} · {p.route}</span>
                  <button
                    className="cursor-pointer active:scale-[0.97]"
                    style={{ fontSize: 16, color: "rgba(26,26,26,0.30)", background: "none", border: "none", padding: "0 4px" }}
                    onClick={() => setProducts(prev => prev.filter((_, idx) => idx !== i))}
                  >×</button>
                </div>
              ))
            )}
            <button
              className="mt-2 rounded-full px-4 py-2 border border-[#D4D4D0] bg-white font-['Inter'] cursor-pointer active:scale-[0.97]"
              style={{ fontSize: 13, fontWeight: 600, color: "#0E2646" }}
              onClick={() => setProducts(prev => [...prev, { name: "Multimin 90", dosage: "12 mL", route: "SQ" }])}
            >
              + Add Product
            </button>
          </div>
        )}
      </div>

      {/* Load from Template collapsible */}
      <div className="rounded-xl bg-white overflow-hidden" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
        <button
          className="flex items-center justify-between w-full px-4 py-3.5 cursor-pointer active:scale-[0.99]"
          onClick={() => setTemplateOpen(!templateOpen)}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>Load from Template</span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
            style={{ transform: templateOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
            <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="rgba(26,26,26,0.40)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {templateOpen && (
          <div className="px-4 pb-2" style={{ borderTop: "1px solid rgba(212,212,208,0.40)" }}>
            {templates.map(t => (
              <button
                key={t.name}
                className="flex items-center justify-between w-full py-2.5 cursor-pointer active:bg-[rgba(26,26,26,0.02)]"
                style={{ borderBottom: "1px solid rgba(26,26,26,0.06)", background: "none", border: "none", borderBottomStyle: "solid", borderBottomWidth: 1, borderBottomColor: "rgba(26,26,26,0.06)" }}
                onClick={() => {
                  setProcessingType(t.type);
                  setTemplateOpen(false);
                  showToast("success", "Template loaded");
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{t.name}</span>
                <span
                  className="rounded-full"
                  style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", backgroundColor: "rgba(243,209,42,0.15)", color: "#F3D12A" }}
                >
                  {t.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          className="flex-1 rounded-full py-3.5 border border-[#D4D4D0] bg-white font-['Inter'] cursor-pointer active:scale-[0.97]"
          style={{ fontSize: 14, fontWeight: 600, color: "#0E2646" }}
          onClick={() => navigate("/cow-work")}
        >
          Save
        </button>
        <button
          className="flex-1 rounded-full py-3.5 bg-[#0E2646] font-['Inter'] cursor-pointer active:scale-[0.97]"
          style={{ fontSize: 14, fontWeight: 700, color: "white", border: "none" }}
          onClick={() => navigate("/cow-work/spring-preg-2026")}
        >
          Save & Work Cows
        </button>
      </div>
    </div>
  );
}
