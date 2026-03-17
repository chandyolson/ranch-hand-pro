/**
 * BullsDashboardScreen — standalone /bulls screen.
 * Two tabs: Dashboard (KPIs, breed breakdown, age, flags) | Bull List (full tappable list).
 *
 * All data from animals + animal_flags + sire_details. No mock data.
 * Renders inside AppLayout.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
} from "recharts";

/* ═══════════════ ROYAL PALETTE ═══════════════ */
const C = {
  navy: "#0E2646", navyMid: "#153566", cream: "#F5F5F0",
  yellow: "#F3D12A", white: "#FFFFFF", border: "#D4D4D0",
  text: "#1A1A1A", teal: "#55BAAA", tealLight: "#A8E6DA",
  royalBlue: "#3266AD", deepPurple: "#3B2072", crimson: "#7B2D3B",
  burgundy: "#8B3A4A", antiqueGold: "#C4A24E", lavender: "#9590A8",
};

const pillStyles: Record<string, { bg: string; color: string }> = {
  cull:       { bg: "rgba(123,45,59,0.12)", color: "#7B2D3B" },
  production: { bg: "rgba(196,162,78,0.12)", color: "#8B6914" },
  management: { bg: "rgba(85,186,170,0.12)", color: "#2A7A6C" },
};

const TAG_HEX: Record<string, string> = {
  Red: "#D4606E", Yellow: "#F3D12A", Green: "#55BAAA", White: "#E0E0E0",
  Orange: "#E8863A", Blue: "#5B8DEF", Purple: "#A77BCA", Pink: "#E8A0BF", None: "#999",
};

/* ═══════════════ PRIMITIVES ═══════════════ */
const WCard = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div className="rounded-xl bg-white border border-[#D4D4D0]/60" style={{ padding: 14, ...style }}>{children}</div>
);
const Lbl = ({ children }: { children: React.ReactNode }) => (
  <p className="uppercase" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(26,26,26,0.4)", lineHeight: 1.3 }}>{children}</p>
);
const Big = ({ value, color = C.navy, size = 28 }: { value: string; color?: string; size?: number }) => (
  <p style={{ fontSize: size, fontWeight: 800, color, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</p>
);
const Sub = ({ children, color = "rgba(26,26,26,0.45)" }: { children: React.ReactNode; color?: string }) => (
  <p style={{ fontSize: 11, fontWeight: 500, color, lineHeight: 1.3 }}>{children}</p>
);
const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 shadow-lg" style={{ backgroundColor: C.navy }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ fontSize: 12, fontWeight: 700, color: p.color || "#fff" }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};
const Legend = ({ data }: { data: { name: string; value: number; color: string }[] }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
    {data.map((d) => (
      <div key={d.name} className="flex items-center gap-1.5">
        <div className="rounded-sm" style={{ width: 8, height: 8, backgroundColor: d.color }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.55)" }}>{d.name}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.text }}>{d.value}</span>
      </div>
    ))}
  </div>
);
const Divider = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3 pt-1">
    <span style={{ fontSize: 13, fontWeight: 700, color: C.navy, whiteSpace: "nowrap" }}>{title}</span>
    <div className="flex-1 h-px" style={{ backgroundColor: "rgba(212,212,208,0.5)" }} />
  </div>
);
const Chevron = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke={C.border} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Skel = () => (
  <WCard><div className="animate-pulse flex flex-col gap-2"><div className="h-3 bg-gray-200 rounded w-1/3" /><div className="h-6 bg-gray-200 rounded w-1/2" /><div className="h-3 bg-gray-200 rounded w-2/3" /></div></WCard>
);

/* ═══════════════ DATA HOOKS ═══════════════ */
function useBulls(operationId: string) {
  return useQuery({
    queryKey: ["bulls-dash", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animals")
        .select("id, tag, tag_color, breed, year_born, name, reg_name, reg_number, status, memo")
        .eq("operation_id", operationId)
        .eq("type", "Bull")
        .eq("status", "Active")
        .order("tag", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!operationId,
  });
}

function useBullFlags(operationId: string) {
  return useQuery({
    queryKey: ["bulls-dash-flags", operationId],
    queryFn: async () => {
      // Get all bull IDs
      const { data: bulls } = await supabase
        .from("animals")
        .select("id, tag")
        .eq("operation_id", operationId)
        .eq("type", "Bull")
        .eq("status", "Active");
      if (!bulls?.length) return [];
      const ids = bulls.map((b) => b.id);
      const tagMap: Record<string, string> = {};
      bulls.forEach((b) => { tagMap[b.id] = b.tag; });

      const { data: flags } = await supabase
        .from("animal_flags")
        .select("animal_id, flag_tier, flag_name")
        .eq("operation_id", operationId)
        .is("resolved_at", null)
        .in("animal_id", ids);
      if (!flags?.length) return [];

      const grouped: Record<string, { tag: string; id: string; pills: { text: string; tier: string }[] }> = {};
      flags.forEach((f) => {
        if (!grouped[f.animal_id]) grouped[f.animal_id] = { tag: tagMap[f.animal_id] || "?", id: f.animal_id, pills: [] };
        grouped[f.animal_id].pills.push({ text: f.flag_name, tier: f.flag_tier });
      });
      return Object.values(grouped);
    },
    enabled: !!operationId,
  });
}

/* ═══════════════ COMPUTE ═══════════════ */
function useBullMetrics(raw: any[] | undefined) {
  return useMemo(() => {
    if (!raw?.length) return null;
    const currentYear = new Date().getFullYear();
    const total = raw.length;

    // Breed breakdown
    const breedMap: Record<string, number> = {};
    raw.forEach((b) => { const br = b.breed || "Unknown"; breedMap[br] = (breedMap[br] || 0) + 1; });
    const breedColors = [C.royalBlue, C.antiqueGold, C.deepPurple, C.teal, C.burgundy, C.lavender];
    const breedBreakdown = Object.entries(breedMap).sort(([, a], [, b]) => b - a)
      .map(([name, value], i) => ({ name, value, color: breedColors[i % breedColors.length] }));

    // Age distribution
    const withAge = raw.filter((b) => b.year_born != null);
    const ages = withAge.map((b) => currentYear - b.year_born);
    const avgAge = ages.length ? (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1) : null;
    const oldestAge = ages.length ? Math.max(...ages) : null;

    const ageBuckets = [
      { r: "Yearling", lo: 0, hi: 1 }, { r: "2 yr", lo: 2, hi: 2 }, { r: "3 yr", lo: 3, hi: 3 },
      { r: "4-5 yr", lo: 4, hi: 5 }, { r: "6-8 yr", lo: 6, hi: 8 }, { r: "9+ yr", lo: 9, hi: 99 },
    ];
    const ageDist = ageBuckets.map((b) => ({
      range: b.r, count: ages.filter((a) => a >= b.lo && a <= b.hi).length,
    }));

    // Registered count
    const registered = raw.filter((b) => b.reg_number != null).length;
    const named = raw.filter((b) => b.name || b.reg_name).length;

    // Bull list with computed age
    const list = raw.map((b) => ({
      id: b.id, tag: b.tag, tagColor: b.tag_color,
      breed: b.breed, age: b.year_born ? currentYear - b.year_born : null,
      name: b.name || b.reg_name || null,
      regNumber: b.reg_number, yearBorn: b.year_born,
    }));

    return { total, breedBreakdown, ageDist, avgAge, oldestAge, registered, named, list };
  }, [raw]);
}

/* ═══════════════ MAIN SCREEN ═══════════════ */
export default function BullsDashboardScreen() {
  const [tab, setTab] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const { operationId } = useOperation();
  const nav = useNavigate();

  const { data: raw, isLoading } = useBulls(operationId);
  const { data: flagged } = useBullFlags(operationId);
  const m = useBullMetrics(raw);

  // Filtered bull list for search
  const filteredList = useMemo(() => {
    if (!m) return [];
    if (!search || search.length < 1) return m.list;
    const q = search.toLowerCase();
    return m.list.filter((b) =>
      b.tag.toLowerCase().includes(q) ||
      (b.breed || "").toLowerCase().includes(q) ||
      (b.name || "").toLowerCase().includes(q) ||
      (b.regNumber || "").toLowerCase().includes(q)
    );
  }, [m, search]);

  return (
    <div className="px-4">
      {/* Tab bar */}
      <div className="flex -mx-4 bg-white" style={{ borderBottom: "1px solid #D4D4D0", paddingLeft: 16, marginTop: -20 }}>
        {["Dashboard", "Bull List"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className="cursor-pointer"
            style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, background: "none", border: "none",
              color: tab === t ? C.navy : "rgba(26,26,26,0.4)",
              borderBottom: tab === t ? `2.5px solid ${C.yellow}` : "2.5px solid transparent",
            }}>{t}</button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative mt-3 mb-2">
        <div className="absolute" style={{ left: 14, top: 22, transform: "translateY(-50%)", pointerEvents: "none" }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="rgba(26,26,26,0.3)" strokeWidth="2" strokeLinecap="round"><circle cx="8.5" cy="8.5" r="6" /><path d="M13 13l4.5 4.5" /></svg>
        </div>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by tag, breed, or name…" className="w-full outline-none"
          style={{ height: 44, borderRadius: 22, border: "1px solid #D4D4D0", background: "#FFF", padding: "0 16px 0 42px", fontSize: 14, fontFamily: "Inter, sans-serif", color: C.text }}
          onFocus={(e) => { e.currentTarget.style.borderColor = C.yellow; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(243,209,42,0.25)"; }}
          onBlur={(e) => { setTimeout(() => { e.currentTarget.style.borderColor = "#D4D4D0"; e.currentTarget.style.boxShadow = "none"; }, 150); }}
        />
      </div>

      {/* ═══════ DASHBOARD TAB ═══════ */}
      {tab === "Dashboard" && (
        <>
          {isLoading || !m ? (
            <div className="flex flex-col gap-3"><Skel /><Skel /><Skel /></div>
          ) : (
            <div className="flex flex-col gap-3 pb-10">

              {/* Banner */}
              <div className="rounded-xl overflow-hidden" style={{ background: `linear-gradient(145deg, ${C.navy} 0%, ${C.navyMid} 55%, ${C.deepPurple} 100%)` }}>
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="uppercase" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)" }}>Active Bulls</p>
                      <p style={{ fontSize: 42, fontWeight: 800, color: "#fff", lineHeight: 1, letterSpacing: "-0.03em", marginTop: 4 }}>{m.total}</p>
                      <p style={{ fontSize: 12, fontWeight: 500, color: C.tealLight, marginTop: 4 }}>herd sires</p>
                    </div>
                    {m.avgAge && (
                      <div className="text-right">
                        <p style={{ fontSize: 36, fontWeight: 800, color: C.yellow, lineHeight: 1 }}>{m.avgAge}</p>
                        <p style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>avg age (yr)</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  {[
                    { l: "Breeds", v: String(m.breedBreakdown.length), c: "#fff" },
                    { l: "Registered", v: String(m.registered), c: C.tealLight },
                    { l: "Named", v: String(m.named), c: "#fff" },
                  ].map((s, i) => (
                    <div key={s.l} className="text-center py-2.5" style={{ borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: s.c, lineHeight: 1.1 }}>{s.v}</p>
                      <p className="uppercase" style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.25)" }}>{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breed Breakdown */}
              <Divider title="Breed Breakdown" />
              <WCard>
                <Lbl>Bulls by Breed</Lbl>
                <div className="flex items-center gap-2 mt-2">
                  <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                    <ResponsiveContainer>
                      <PieChart><Pie data={m.breedBreakdown} cx="50%" cy="50%" innerRadius={28} outerRadius={52} dataKey="value" paddingAngle={2} strokeWidth={0}>
                        {m.breedBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie><Tooltip content={<Tip />} /></PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    {m.breedBreakdown.map((d) => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="rounded-sm" style={{ width: 7, height: 7, backgroundColor: d.color }} />
                          <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(26,26,26,0.6)" }}>{d.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{d.value}</span>
                          <span style={{ fontSize: 9, fontWeight: 500, color: "rgba(26,26,26,0.3)" }}>({Math.round(d.value / m.total * 100)}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </WCard>

              {/* Age Distribution */}
              <Divider title="Age Distribution" />
              <WCard>
                <Lbl>Bulls by Age</Lbl>
                <div style={{ width: "100%", height: 160 }} className="mt-2">
                  <ResponsiveContainer>
                    <BarChart data={m.ageDist} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,38,70,0.06)" />
                      <XAxis dataKey="range" tick={{ fontSize: 9, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 8, fill: "rgba(26,26,26,0.35)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Bulls" fill={C.deepPurple} fillOpacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {[
                    { l: "Avg Age", v: m.avgAge ? `${m.avgAge} yr` : "—" },
                    { l: "Oldest", v: m.oldestAge ? `${m.oldestAge} yr` : "—" },
                  ].map((x) => (
                    <div key={x.l} className="text-center rounded-lg py-2 px-1 bg-white border border-[#D4D4D0]/60">
                      <p className="uppercase" style={{ fontSize: 9, fontWeight: 600, color: "rgba(26,26,26,0.35)", letterSpacing: "0.06em" }}>{x.l}</p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: C.navy, lineHeight: 1.4 }}>{x.v}</p>
                    </div>
                  ))}
                </div>
              </WCard>

              {/* Flagged Bulls */}
              {flagged && flagged.length > 0 && <>
                <Divider title="Flagged Bulls" />
                <WCard>
                  {flagged.map((bull, i) => (
                    <div key={bull.id}>
                      <button onClick={() => nav(`/animals/${bull.id}`)}
                        className="w-full flex items-center justify-between py-2.5 cursor-pointer"
                        style={{ background: "none", border: "none" }}>
                        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: C.text, minWidth: 50 }}>{bull.tag}</span>
                          <div className="flex flex-wrap gap-1">
                            {bull.pills.map((p) => (
                              <span key={p.text} className="uppercase rounded-full px-2 py-0.5" style={{
                                fontSize: 9, fontWeight: 700, letterSpacing: "0.04em",
                                backgroundColor: (pillStyles[p.tier] || pillStyles.management).bg,
                                color: (pillStyles[p.tier] || pillStyles.management).color,
                              }}>{p.text}</span>
                            ))}
                          </div>
                        </div>
                        <Chevron />
                      </button>
                      {i < flagged.length - 1 && <div className="h-px" style={{ backgroundColor: "rgba(212,212,208,0.3)" }} />}
                    </div>
                  ))}
                </WCard>
              </>}

              {/* Link to full list */}
              <WCard>
                <button onClick={() => setTab("Bull List")} className="w-full flex items-center justify-between cursor-pointer" style={{ background: "none", border: "none" }}>
                  <div><p style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>View all {m.total} bulls</p><p style={{ fontSize: 12, fontWeight: 500, color: "rgba(26,26,26,0.35)" }}>Full bull list with details</p></div>
                  <Chevron />
                </button>
              </WCard>

            </div>
          )}
        </>
      )}

      {/* ═══════ BULL LIST TAB ═══════ */}
      {tab === "Bull List" && (
        <div className="pb-10">
          {isLoading || !m ? (
            <div className="flex flex-col gap-3"><Skel /><Skel /></div>
          ) : (
            <>
              <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(26,26,26,0.4)", marginBottom: 8 }}>
                {filteredList.length} of {m.total} bulls{search ? ` matching "${search}"` : ""}
              </p>
              <div className="rounded-xl bg-white border border-[#D4D4D0]/60 overflow-hidden">
                {filteredList.map((b, idx) => (
                  <div key={b.id}>
                    {idx > 0 && <div className="h-px mx-3.5" style={{ backgroundColor: "rgba(212,212,208,0.15)" }} />}
                    <button onClick={() => nav(`/animals/${b.id}`)}
                      className="w-full flex items-center justify-between px-3.5 py-3 cursor-pointer active:bg-gray-50"
                      style={{ background: "none", border: "none" }}>
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Tag color dot */}
                        <div className="rounded-full shrink-0" style={{
                          width: 10, height: 10,
                          backgroundColor: TAG_HEX[b.tagColor || "None"] || "#999",
                          border: (!b.tagColor || b.tagColor === "None") ? "1px solid #D4D4D0" : "none",
                        }} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{b.tag}</span>
                            {b.name && <span className="truncate" style={{ fontSize: 11, fontWeight: 500, color: "rgba(26,26,26,0.4)" }}>{b.name}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {b.breed && <span style={{ fontSize: 10, color: "rgba(26,26,26,0.35)" }}>{b.breed}</span>}
                            {b.yearBorn && <span style={{ fontSize: 10, color: "rgba(26,26,26,0.25)" }}>· Born {b.yearBorn}</span>}
                            {b.regNumber && <span style={{ fontSize: 10, color: C.royalBlue }}>· Reg</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {b.age != null && (
                          <span className="rounded-full px-2 py-0.5" style={{
                            fontSize: 10, fontWeight: 600,
                            backgroundColor: "rgba(59,32,114,0.08)", color: C.deepPurple,
                          }}>{b.age} yr</span>
                        )}
                        <Chevron />
                      </div>
                    </button>
                  </div>
                ))}
                {filteredList.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <p style={{ fontSize: 13, color: "rgba(26,26,26,0.4)" }}>No bulls match "{search}"</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
