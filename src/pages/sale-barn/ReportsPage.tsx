import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChuteSideToast as useToast } from "@/components/ToastContext";
import type { SaleDay } from "@/types/sale-barn";

const REPORTS = [
  { letter: "P", title: "Preg Cows by Designation", desc: "Per seller: pregnant count grouped by tag color", who: "Sale barn office" },
  { letter: "D", title: "Daily Designation Totals", desc: "Total head by designation key across all sellers", who: "Sale barn office" },
  { letter: "B", title: "Billing Summary", desc: "Seller vs buyer charges with Vet/Admin/SOL breakdown", who: "Office + CATL" },
  { letter: "H", title: "Head Count by Work Type", desc: "Total head by work type for the day", who: "CATL + office" },
  { letter: "C", title: "CVI Prep Sheet", desc: "Interstate animals: EID, Back Tag, Tag #, buyer, destination", who: "Veterinarian" },
  { letter: "S", title: "Sort Pen Manifest", desc: "Per sort pen: head by buyer/seller, source pen", who: "Office + pen workers" },
  { letter: "O", title: "State Ownership Report", desc: "All cattle processed — Excel export", who: "State vet office" },
];

const ReportsPage: React.FC = () => {
  const { id: saleDayId } = useParams<{ id: string }>();
  const { showToast } = useToast();

  return (
    <div style={{ padding: "0 16px 24px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#0E2646", marginBottom: 12 }}>Reports</div>

      {REPORTS.map(r => (
        <button key={r.letter}
          onClick={() => showToast("info", `Report: ${r.title} — coming soon`)}
          className="active:scale-[0.98]"
          style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", background: "#fff", borderRadius: 10, border: "1px solid rgba(212,212,208,0.60)", padding: "12px 14px", marginBottom: 8, cursor: "pointer", textAlign: "left", transition: "transform 0.1s" }}>
          {/* Icon */}
          <div style={{ width: 40, height: 40, minWidth: 40, borderRadius: 10, background: "rgba(14,38,70,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#0E2646" }}>
            {r.letter}
          </div>
          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{r.title}</div>
            <div style={{ fontSize: 12, fontWeight: 400, color: "#717182" }}>{r.desc}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#55BAAA", marginTop: 2 }}>{r.who}</div>
          </div>
          {/* Chevron */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ minWidth: 16 }}>
            <path d="M6 3L11 8L6 13" stroke="rgba(26,26,26,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      ))}
    </div>
  );
};

export default ReportsPage;
