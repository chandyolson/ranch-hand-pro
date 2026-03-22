import React, { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDesignationKeys } from "@/hooks/sale-barn/useDesignationKeys";
import { useChuteSideToast as useToast } from "@/components/ToastContext";
import { focusGold, blurReset } from "@/lib/styles";
import type { WorkOrder, SaleBarnAnimal, SaleBarnCustomer, DesignationKey } from "@/types/sale-barn";

const STEPS = ["Sellers", "Select animals", "Confirm"] as const;

const QUICK_NOTE_PILL_COLORS: Record<string, { bg: string; color: string; activeBg: string }> = {
  "#9B2335": { bg: "rgba(155,35,53,0.12)", color: "#9B2335", activeBg: "#9B2335" },
  "#B8860B": { bg: "rgba(184,134,11,0.12)", color: "#B8860B", activeBg: "#B8860B" },
  "#55BAAA": { bg: "rgba(85,186,170,0.12)", color: "#55BAAA", activeBg: "#55BAAA" },
  "#0E2646": { bg: "rgba(14,38,70,0.12)", color: "#0E2646", activeBg: "#0E2646" },
};

const getNoteColor = (note: string): string => {
  const RED = ["Horns", "Lame", "Lump Jaw", "Bad Eye", "Cancer Eye"];
  const GOLD = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const TEAL = ["Thin", "Old", "Broken Mouth"];
  const NAVY = ["Hereford", "Red", "Baldy", "Dairy", "Roping", "Charolais"];
  if (RED.includes(note)) return "#9B2335";
  if (GOLD.includes(note)) return "#B8860B";
  if (TEAL.includes(note)) return "#55BAAA";
  if (NAVY.includes(note)) return "#0E2646";
  return "#717182";
};

interface SellerWoInfo {
  wo: WorkOrder;
  customerName: string;
  totalAnimals: number;
  assignedAnimals: number;
  available: number;
}

const AssignAnimals: React.FC = () => {
  const { id: saleDayId, woId } = useParams<{ id: string; woId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [selectedSellerWoIds, setSelectedSellerWoIds] = useState<Set<string>>(new Set());
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [desFilter, setDesFilter] = useState("All");
  const [pregFilter, setPregFilter] = useState("All");
  const [sexFilter, setSexFilter] = useState("All");
  const [noteFilter, setNoteFilter] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch buyer work order
  const { data: buyerWo } = useQuery({
    queryKey: ["assign_buyer_wo", woId],
    enabled: !!woId,
    queryFn: async () => {
      const { data } = await (supabase.from("work_orders") as any).select("*").eq("id", woId!).single();
      return data as unknown as WorkOrder | null;
    },
  });

  // Fetch buyer customer
  const { data: buyerCustomer } = useQuery({
    queryKey: ["assign_buyer_customer", buyerWo?.customer_id],
    enabled: !!buyerWo?.customer_id,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_customers") as any).select("*").eq("id", buyerWo!.customer_id!).single();
      return data as unknown as SaleBarnCustomer | null;
    },
  });

  // Fetch all seller work orders for this sale day
  const { data: sellerWos } = useQuery({
    queryKey: ["assign_seller_wos", saleDayId],
    enabled: !!saleDayId,
    queryFn: async () => {
      const { data } = await (supabase.from("work_orders") as any)
        .select("*").eq("sale_day_id", saleDayId!).eq("entity_type", "seller")
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as WorkOrder[];
    },
  });

  // Fetch customer names for sellers
  const sellerCustomerIds = useMemo(() => [...new Set((sellerWos ?? []).map(w => w.customer_id).filter(Boolean))], [sellerWos]);
  const { data: sellerCustomers } = useQuery({
    queryKey: ["assign_seller_customers", sellerCustomerIds],
    enabled: sellerCustomerIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_customers") as any)
        .select("*").in("id", sellerCustomerIds);
      return (data ?? []) as unknown as SaleBarnCustomer[];
    },
  });
  const custMap = useMemo(() => {
    const m: Record<string, SaleBarnCustomer> = {};
    (sellerCustomers ?? []).forEach(c => { m[c.id] = c; });
    return m;
  }, [sellerCustomers]);

  // Fetch animal counts per seller WO
  const sellerWoIds = useMemo(() => (sellerWos ?? []).map(w => w.id), [sellerWos]);
  const { data: allSellerAnimals } = useQuery({
    queryKey: ["assign_seller_animals_counts", sellerWoIds],
    enabled: sellerWoIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_animals") as any)
        .select("id,work_order_id,buyer_work_order_id").in("work_order_id", sellerWoIds);
      return (data ?? []) as { id: string; work_order_id: string; buyer_work_order_id: string | null }[];
    },
  });

  const sellerInfos: SellerWoInfo[] = useMemo(() => {
    return (sellerWos ?? []).map(wo => {
      const animals = (allSellerAnimals ?? []).filter(a => a.work_order_id === wo.id);
      const assigned = animals.filter(a => a.buyer_work_order_id != null).length;
      return {
        wo,
        customerName: wo.customer_id ? (custMap[wo.customer_id]?.name ?? "Unknown") : "Unknown",
        totalAnimals: animals.length,
        assignedAnimals: assigned,
        available: animals.length - assigned,
      };
    });
  }, [sellerWos, allSellerAnimals, custMap]);

  // Designation keys
  const { data: dkData } = useDesignationKeys();
  const desKeys = dkData?.data ?? [];

  // STEP 2: Fetch animals for selected sellers
  const selectedSellerArr = useMemo(() => [...selectedSellerWoIds], [selectedSellerWoIds]);
  const { data: sellerAnimalsForStep2 } = useQuery({
    queryKey: ["assign_step2_animals", selectedSellerArr],
    enabled: step >= 1 && selectedSellerArr.length > 0,
    queryFn: async () => {
      const { data } = await (supabase.from("sale_barn_animals") as any)
        .select("*").in("work_order_id", selectedSellerArr)
        .order("created_at", { ascending: true });
      return (data ?? []) as unknown as SaleBarnAnimal[];
    },
  });
  const step2Animals = sellerAnimalsForStep2 ?? [];

  // Seller name map for step 2
  const woToSellerName = useMemo(() => {
    const m: Record<string, string> = {};
    sellerInfos.forEach(si => { m[si.wo.id] = si.customerName; });
    return m;
  }, [sellerInfos]);

  // Filters
  const filteredAnimals = useMemo(() => {
    let list = step2Animals;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => a.eid?.toLowerCase().includes(q) || a.back_tag?.toLowerCase().includes(q) || a.tag_number?.toLowerCase().includes(q));
    }
    if (desFilter !== "All") list = list.filter(a => a.designation_key === desFilter);
    if (pregFilter !== "All") list = list.filter(a => a.preg_status === pregFilter);
    if (sexFilter !== "All") list = list.filter(a => a.sex === sexFilter);
    if (noteFilter) list = list.filter(a => (a.quick_notes ?? []).includes(noteFilter));
    return list;
  }, [step2Animals, search, desFilter, pregFilter, sexFilter, noteFilter]);

  const availableAnimals = useMemo(() => filteredAnimals.filter(a => !a.buyer_work_order_id), [filteredAnimals]);
  const alreadyAssigned = useMemo(() => filteredAnimals.filter(a => !!a.buyer_work_order_id), [filteredAnimals]);

  // All unique quick notes
  const allNotes = useMemo(() => {
    const set = new Set<string>();
    step2Animals.forEach(a => (a.quick_notes ?? []).forEach(n => set.add(n)));
    return [...set];
  }, [step2Animals]);

  const toggleSellerWo = (id: string) => {
    setSelectedSellerWoIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAnimal = (id: string) => {
    setSelectedAnimalIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectFiltered = () => {
    setSelectedAnimalIds(prev => {
      const next = new Set(prev);
      availableAnimals.forEach(a => next.add(a.id));
      return next;
    });
  };

  const selectedAnimals = useMemo(() => step2Animals.filter(a => selectedAnimalIds.has(a.id)), [step2Animals, selectedAnimalIds]);

  // Group selected by seller for confirm step
  const sellerBreakdown = useMemo(() => {
    const m: Record<string, { name: string; count: number; wo: WorkOrder }> = {};
    selectedAnimals.forEach(a => {
      if (!m[a.work_order_id]) {
        const si = sellerInfos.find(s => s.wo.id === a.work_order_id);
        m[a.work_order_id] = { name: si?.customerName ?? "Unknown", count: 0, wo: si?.wo! };
      }
      m[a.work_order_id].count++;
    });
    return Object.values(m);
  }, [selectedAnimals, sellerInfos]);

  const handleConfirm = useCallback(async () => {
    if (selectedAnimalIds.size === 0) return;
    setSaving(true);
    const ids = [...selectedAnimalIds];
    const { error } = await (supabase.from("sale_barn_animals") as any)
      .update({ buyer_work_order_id: woId })
      .in("id", ids);
    setSaving(false);
    if (error) {
      showToast("error", `Assignment failed: ${error.message}`);
      return;
    }
    qc.invalidateQueries({ queryKey: ["assign_"] });
    qc.invalidateQueries({ queryKey: ["wo_animal_count"] });
    qc.invalidateQueries({ queryKey: ["assigned_animals"] });
    showToast("success", `${ids.length} animals assigned to ${buyerCustomer?.name ?? "buyer"}`);
    navigate(`/sale-barn/${saleDayId}/work-order/${woId}`);
  }, [selectedAnimalIds, woId, saleDayId, navigate, showToast, qc, buyerCustomer]);

  const buyerName = buyerCustomer?.name ?? "Buyer";
  const pensLabel = (buyerWo?.pens ?? []).join(", ");

  return (
    <div style={{ paddingBottom: 90, fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px 8px", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => navigate(`/sale-barn/${saleDayId}/work-order/${woId}`)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#0E2646" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0E2646" }}>Assign animals</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#55BAAA" }}>
            {buyerName}{buyerWo?.buyer_num ? ` · Buyer ${buyerWo.buyer_num}` : ""}{pensLabel ? ` · Pen ${pensLabel}` : ""}
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ padding: "8px 16px", borderBottom: "1px solid #D4D4D0", display: "flex", alignItems: "center", gap: 6 }}>
        {STEPS.map((s, i) => {
          const isActive = i === step;
          const isComplete = i < step;
          const isPending = i > step;
          return (
            <React.Fragment key={s}>
              {i > 0 && <span style={{ fontSize: 12, color: "#717182" }}>›</span>}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 12, fontSize: 12, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isActive ? "#55BAAA" : isComplete ? "#0E2646" : "rgba(212,212,208,0.40)",
                  color: isPending ? "#717182" : "#FFFFFF",
                }}>{i + 1}</div>
                <span style={{ fontSize: 12, fontWeight: 500, color: isActive ? "#1A1A1A" : "#717182" }}>{s}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ padding: "12px 16px" }}>
        {/* STEP 1: Pick sellers */}
        {step === 0 && (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0E2646", marginBottom: 4 }}>Select sellers to pull from</div>
            <div style={{ fontSize: 12, color: "#717182", marginBottom: 12 }}>Choose one or more seller work orders</div>
            {sellerInfos.map(si => {
              const sel = selectedSellerWoIds.has(si.wo.id);
              const disabled = si.available === 0;
              return (
                <button key={si.wo.id} type="button" onClick={() => !disabled && toggleSellerWo(si.wo.id)}
                  className="active:scale-[0.98]"
                  style={{
                    width: "100%", textAlign: "left", cursor: disabled ? "default" : "pointer",
                    background: sel ? "rgba(85,186,170,0.03)" : "#FFFFFF",
                    borderRadius: 10, border: sel ? "2px solid #55BAAA" : "1px solid rgba(212,212,208,0.60)",
                    padding: "10px 14px", marginBottom: 6, display: "flex", alignItems: "flex-start", gap: 10,
                    opacity: disabled ? 0.45 : 1,
                  }}>
                  {/* Checkbox */}
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 2,
                    background: sel ? "#55BAAA" : "#FFFFFF",
                    border: sel ? "none" : "1.5px solid #D4D4D0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {sel && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#FFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{si.customerName}</div>
                    <div style={{ fontSize: 12, color: "#717182" }}>
                      {si.wo.work_type}{si.wo.animal_type ? ` · ${si.wo.animal_type}` : ""}{si.wo.pens?.length ? ` · Pen ${si.wo.pens.join(", ")}` : ""}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#717182", marginTop: 2 }}>
                      {si.totalAnimals} head · {si.available} available · {si.assignedAnimals} assigned
                    </div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: 9999, padding: "2px 8px", background: "rgba(243,209,42,0.12)", color: "#B8860B", flexShrink: 0 }}>SELLER</span>
                </button>
              );
            })}
            {sellerInfos.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#717182", fontSize: 13 }}>No seller work orders found</div>}
          </>
        )}

        {/* STEP 2: Select animals */}
        {step === 1 && (
          <>
            {/* Source info */}
            <div style={{ background: "rgba(85,186,170,0.06)", borderBottom: "1px solid rgba(85,186,170,0.20)", padding: "10px 0", marginBottom: 10 }}>
              {selectedSellerArr.length === 1 ? (
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>Pulling from: {woToSellerName[selectedSellerArr[0]]}</span>
                  <span style={{ fontSize: 11, color: "#717182", marginLeft: 8 }}>{step2Animals.length} head</span>
                </div>
              ) : (
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>Pulling from {selectedSellerArr.length} sellers</span>
                  <span style={{ fontSize: 11, color: "#717182", marginLeft: 8 }}>{availableAnimals.length + alreadyAssigned.length} total</span>
                </div>
              )}
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0E2646" }}>Filter & select</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={selectFiltered} style={{ fontSize: 11, fontWeight: 600, color: "#55BAAA", border: "1px solid #55BAAA", borderRadius: 9999, padding: "4px 10px", background: "transparent", cursor: "pointer" }}>Select filtered</button>
                <button onClick={() => setSelectedAnimalIds(new Set())} style={{ fontSize: 11, fontWeight: 600, color: "#717182", border: "1px solid #D4D4D0", borderRadius: 9999, padding: "4px 10px", background: "transparent", cursor: "pointer" }}>Clear</button>
              </div>
            </div>

            {/* Search */}
            <input style={{ width: "100%", height: 40, borderRadius: 10, border: "1px solid rgba(212,212,208,0.60)", fontSize: 16, padding: "0 12px", outline: "none", boxSizing: "border-box", marginBottom: 8 }}
              placeholder="Search EID, back tag, tag #..." value={search} onChange={e => setSearch(e.target.value)} onFocus={focusGold} onBlur={blurReset} />

            {/* Designation filter */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,26,26,0.40)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>DESIGNATION</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {["All", ...desKeys.map(d => d.label)].map(d => {
                  const active = desFilter === d;
                  const dk = desKeys.find(k => k.label === d);
                  return (
                    <button key={d} onClick={() => setDesFilter(d)} style={{
                      height: 28, borderRadius: 9999, padding: "0 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                      background: active ? "#0E2646" : "#FFFFFF", color: active ? "#FFFFFF" : "#1A1A1A",
                      border: active ? "none" : "1px solid #D4D4D0", display: "flex", alignItems: "center", gap: 4,
                    }}>
                      {dk && <span style={{ width: 8, height: 8, borderRadius: 4, background: dk.hex_color }} />}
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preg filter */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,26,26,0.40)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>PREG STATUS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {["All", "Pregnant", "Open", "Not Checked"].map(p => {
                  const active = pregFilter === p;
                  return (
                    <button key={p} onClick={() => setPregFilter(p)} style={{
                      height: 28, borderRadius: 9999, padding: "0 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                      background: active ? "#0E2646" : "#FFFFFF", color: active ? "#FFFFFF" : "#1A1A1A",
                      border: active ? "none" : "1px solid #D4D4D0",
                    }}>{p}</button>
                  );
                })}
              </div>
            </div>

            {/* Sex filter */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,26,26,0.40)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>SEX</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {["All", "Bull", "Heifer", "Steer"].map(s => {
                  const active = sexFilter === s;
                  return (
                    <button key={s} onClick={() => setSexFilter(s)} style={{
                      height: 28, borderRadius: 9999, padding: "0 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                      background: active ? "#0E2646" : "#FFFFFF", color: active ? "#FFFFFF" : "#1A1A1A",
                      border: active ? "none" : "1px solid #D4D4D0",
                    }}>{s}</button>
                  );
                })}
              </div>
            </div>

            {/* Quick notes filter */}
            {allNotes.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,26,26,0.40)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>QUICK NOTES</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {allNotes.map(n => {
                    const active = noteFilter === n;
                    const c = getNoteColor(n);
                    return (
                      <button key={n} onClick={() => setNoteFilter(active ? "" : n)} style={{
                        height: 26, borderRadius: 9999, padding: "0 8px", fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer",
                        background: active ? c : QUICK_NOTE_PILL_COLORS[c]?.bg ?? "rgba(113,113,130,0.12)",
                        color: active ? "#FFFFFF" : c,
                        border: "none",
                      }}>{n}</button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Count bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "4px 0" }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                <span style={{ color: "#1A1A1A" }}>{availableAnimals.length} available</span>
                <span style={{ color: "#55BAAA", marginLeft: 8 }}>{selectedAnimalIds.size} selected</span>
              </span>
              {alreadyAssigned.length > 0 && <span style={{ fontSize: 11, color: "#717182" }}>{alreadyAssigned.length} already assigned</span>}
            </div>

            {/* Animal rows */}
            {filteredAnimals.map((a, idx) => {
              const isAssigned = !!a.buyer_work_order_id;
              const isSel = selectedAnimalIds.has(a.id);
              return (
                <button key={a.id} type="button" onClick={() => !isAssigned && toggleAnimal(a.id)}
                  style={{
                    width: "100%", textAlign: "left", cursor: isAssigned ? "default" : "pointer",
                    background: "#FFFFFF", borderRadius: 10, padding: "8px 12px", marginBottom: 4,
                    border: isSel ? "2px solid #55BAAA" : "1px solid rgba(212,212,208,0.60)",
                    display: "flex", alignItems: "center", gap: 8, opacity: isAssigned ? 0.4 : 1,
                  }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                    background: isSel ? "#55BAAA" : "#FFFFFF",
                    border: isSel ? "none" : isAssigned ? "none" : "1.5px solid #D4D4D0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isSel && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#FFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    {isAssigned && <span style={{ fontSize: 12, color: "#717182" }}>✕</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isAssigned ? (
                      <div style={{ fontSize: 12, fontStyle: "italic", color: "#717182" }}>Assigned to buyer</div>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{a.tag_number || (a.eid ? a.eid.slice(-6) : "—")}</span>
                          <span style={{ fontSize: 11, color: "#717182" }}>{a.eid}</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                          {a.designation_key && (
                            <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 9999, padding: "1px 6px", background: "rgba(14,38,70,0.06)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <span style={{ width: 6, height: 6, borderRadius: 3, background: desKeys.find(d => d.label === a.designation_key)?.hex_color ?? "#717182" }} />
                              {a.designation_key}
                            </span>
                          )}
                          {a.preg_status && <span style={{ fontSize: 10, color: a.preg_status === "Pregnant" ? "#55BAAA" : a.preg_status === "Open" ? "#B8860B" : "#717182" }}>{a.preg_status}</span>}
                          {a.sex && <span style={{ fontSize: 10, color: "#717182" }}>{a.sex}</span>}
                          {(a.quick_notes ?? []).map(n => {
                            const c = getNoteColor(n);
                            return <span key={n} style={{ fontSize: 9, borderRadius: 9999, padding: "1px 5px", background: QUICK_NOTE_PILL_COLORS[c]?.bg ?? "rgba(113,113,130,0.12)", color: c }}>{n}</span>;
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "#717182", flexShrink: 0 }}>#{idx + 1}</span>
                </button>
              );
            })}
            {filteredAnimals.length === 0 && <div style={{ textAlign: "center", padding: 30, color: "#717182", fontSize: 13 }}>No animals found</div>}
          </>
        )}

        {/* STEP 3: Confirm */}
        {step === 2 && (
          <>
            <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(212,212,208,0.60)", padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0E2646", marginBottom: 10 }}>Confirm assignment</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>{buyerName}</span>
                <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 9999, padding: "2px 8px", background: "rgba(85,186,170,0.15)", color: "#55BAAA", textTransform: "uppercase", letterSpacing: "0.06em" }}>BUYER</span>
                {buyerWo?.buyer_num && <span style={{ fontSize: 12, color: "#717182" }}>#{buyerWo.buyer_num}</span>}
                {pensLabel && <span style={{ fontSize: 12, color: "#717182" }}>Pen {pensLabel}</span>}
              </div>

              <div style={{ height: 1, background: "rgba(26,26,26,0.08)", margin: "8px 0" }} />

              {sellerBreakdown.map(sb => (
                <div key={sb.wo.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{sb.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 9999, padding: "2px 8px", background: "rgba(243,209,42,0.12)", color: "#B8860B", textTransform: "uppercase", letterSpacing: "0.06em" }}>SELLER</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0E2646" }}>{sb.count} head</div>
                  <div style={{ fontSize: 12, color: "#717182" }}>{sb.wo.work_type}{sb.wo.pens?.length ? ` · Pen ${sb.wo.pens.join(", ")}` : ""}</div>
                </div>
              ))}

              <div style={{ height: 1, background: "rgba(26,26,26,0.08)", margin: "8px 0" }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: "#55BAAA" }}>{selectedAnimalIds.size} animals to assign</div>
            </div>

            {/* Animal preview */}
            <div style={{ maxHeight: 300, overflowY: "auto", borderRadius: 10, border: "1px solid rgba(212,212,208,0.60)" }}>
              {selectedAnimals.map((a, idx) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", padding: "6px 12px", gap: 8, borderBottom: "1px solid rgba(212,212,208,0.15)" }}>
                  <span style={{ fontSize: 11, color: "#717182", width: 24 }}>{idx + 1}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#1A1A1A", fontFamily: "monospace", flex: 1 }}>{a.eid}</span>
                  <span style={{ fontSize: 12, color: "#717182" }}>{a.tag_number ?? ""}</span>
                  {a.designation_key && (
                    <span style={{ fontSize: 10, borderRadius: 9999, padding: "1px 5px", background: "rgba(14,38,70,0.06)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <span style={{ width: 5, height: 5, borderRadius: 3, background: desKeys.find(d => d.label === a.designation_key)?.hex_color ?? "#717182" }} />
                      {a.designation_key}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#717182", textAlign: "center", padding: "6px 0" }}>{selectedAnimals.length} animals</div>
          </>
        )}
      </div>

      {/* Sticky bottom */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
        background: "#FFFFFF", borderTop: "1px solid #D4D4D0",
        padding: "12px 16px", boxShadow: "0 -2px 12px rgba(0,0,0,0.06)",
      }}>
        {step === 0 && (
          <button onClick={() => setStep(1)} disabled={selectedSellerWoIds.size === 0}
            className="active:scale-[0.97]"
            style={{
              width: "100%", height: 48, borderRadius: 9999,
              background: selectedSellerWoIds.size === 0 ? "rgba(243,209,42,0.4)" : "#F3D12A",
              border: "none", fontSize: 15, fontWeight: 700, color: "#1A1A1A",
              cursor: selectedSellerWoIds.size === 0 ? "not-allowed" : "pointer",
            }}>Next — Select Animals</button>
        )}
        {step === 1 && (
          <>
            {selectedSellerArr.length > 1 && sellerBreakdown.length > 0 && (
              <div style={{ fontSize: 11, color: "#717182", textAlign: "center", marginBottom: 4 }}>
                ({sellerBreakdown.map(sb => `${sb.count} from ${sb.name}`).join(", ")})
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#55BAAA" }}>{selectedAnimalIds.size} animals selected</span>
              <span style={{ fontSize: 13, color: "#717182" }}>from {step2Animals.filter(a => !a.buyer_work_order_id).length}</span>
            </div>
            <button onClick={() => setStep(2)} disabled={selectedAnimalIds.size === 0}
              className="active:scale-[0.97]"
              style={{
                width: "100%", height: 52, borderRadius: 9999,
                background: selectedAnimalIds.size === 0 ? "rgba(85,186,170,0.3)" : "#55BAAA",
                border: "none", fontSize: 16, fontWeight: 700, color: "#FFFFFF",
                cursor: selectedAnimalIds.size === 0 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
              Assign {selectedAnimalIds.size} to {buyerName}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7H11M8 4L11 7L8 10" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </>
        )}
        {step === 2 && (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(1)}
              style={{
                flex: 0.35, height: 52, borderRadius: 9999,
                border: "1.5px solid #D4D4D0", background: "transparent",
                fontSize: 14, fontWeight: 600, color: "#717182", cursor: "pointer",
              }}>Back</button>
            <button onClick={handleConfirm} disabled={saving}
              className="active:scale-[0.97]"
              style={{
                flex: 1, height: 52, borderRadius: 9999,
                background: "#55BAAA", border: "none",
                fontSize: 16, fontWeight: 700, color: "#FFFFFF",
                cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke="#FFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {saving ? "Assigning…" : "Confirm Assignment"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignAnimals;
