import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import StatCard from "@/components/StatCard";
import CollapsibleSection from "@/components/CollapsibleSection";
import { useOperation } from "@/contexts/OperationContext";
import { supabase } from "@/integrations/supabase/client";

function SectionHeading({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span style={{ fontSize: 13, fontWeight: 700, color: "#0E2646", letterSpacing: "0.01em" }}>{text}</span>
      <div className="flex-1 h-px" style={{ backgroundColor: "rgba(212,212,208,0.50)" }} />
    </div>
  );
}

const VetDashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { operationId } = useOperation();

  // ── Vet practice ID lookup ──
  const { data: vetPractice } = useQuery({
    queryKey: ["vet-practice", operationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("vet_practices")
        .select("id")
        .eq("owner_user_id", (await supabase.auth.getUser()).data.user?.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // ── Customers (vet_practice_clients → operations) ──
  const { data: customers } = useQuery({
    queryKey: ["vet-customers", vetPractice?.id],
    queryFn: async () => {
      if (!vetPractice?.id) return [];
      const { data } = await supabase
        .from("vet_practice_clients")
        .select("id, operation_id, clinic_client_id, notes, operations(id, name, owner_name)")
        .eq("vet_practice_id", vetPractice.id);
      return data || [];
    },
    enabled: !!vetPractice?.id,
  });

  // ── Head counts per customer operation ──
  const clientOpIds = (customers || []).map((c: any) => c.operation_id).filter(Boolean);
  const { data: headCounts } = useQuery({
    queryKey: ["vet-head-counts", clientOpIds],
    queryFn: async () => {
      if (clientOpIds.length === 0) return {};
      const counts: Record<string, number> = {};
      for (const opId of clientOpIds) {
        const { count } = await supabase
          .from("animals")
          .select("*", { count: "exact", head: true })
          .eq("operation_id", opId)
          .eq("status", "Active");
        counts[opId] = count || 0;
      }
      return counts;
    },
    enabled: clientOpIds.length > 0,
  });

  // ── Projects completed this month (across client operations) ──
  const { data: completedMTD } = useQuery({
    queryKey: ["vet-completed-mtd", clientOpIds],
    queryFn: async () => {
      if (clientOpIds.length === 0) return 0;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const { count } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .in("operation_id", clientOpIds)
        .eq("project_status", "Completed")
        .gte("date", startOfMonth);
      return count || 0;
    },
    enabled: clientOpIds.length > 0,
  });

  // ── Upcoming events (assigned_protocol_events) ──
  const { data: upcomingEvents } = useQuery({
    queryKey: ["vet-upcoming-events", clientOpIds],
    queryFn: async () => {
      if (clientOpIds.length === 0) return [];
      const { data } = await supabase
        .from("assigned_protocol_events")
        .select("id, event_name, scheduled_date, event_status, assigned_protocol:assigned_protocols(client_operation_id, animal_class, estimated_head_count, operations:client_operation_id(name))")
        .eq("event_status", "upcoming")
        .order("scheduled_date", { ascending: true })
        .limit(5);
      // Filter to only events belonging to our client operations
      const filtered = (data || []).filter((e: any) => {
        const clientOpId = e.assigned_protocol?.client_operation_id;
        return clientOpId && clientOpIds.includes(clientOpId);
      });
      return filtered;
    },
    enabled: clientOpIds.length > 0,
  });

  // ── Head worked this month (cow_work records across client ops) ──
  const { data: headWorkedMTD } = useQuery({
    queryKey: ["vet-head-mtd", clientOpIds],
    queryFn: async () => {
      if (clientOpIds.length === 0) return 0;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const { count } = await supabase
        .from("cow_work")
        .select("*", { count: "exact", head: true })
        .in("operation_id", clientOpIds)
        .gte("date", startOfMonth);
      return count || 0;
    },
    enabled: clientOpIds.length > 0,
  });

  // ── Recent completed projects ──
  const { data: recentWork } = useQuery({
    queryKey: ["vet-recent-work", clientOpIds],
    queryFn: async () => {
      if (clientOpIds.length === 0) return [];
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, date, head_count, project_status, operation_id, work_types:project_work_types(work_type:work_types(code))")
        .in("operation_id", clientOpIds)
        .eq("project_status", "Completed")
        .order("date", { ascending: false })
        .limit(5);
      // Attach customer name
      const opNameMap: Record<string, string> = {};
      (customers || []).forEach((c: any) => {
        if (c.operations) opNameMap[c.operation_id] = c.operations.name;
      });
      return (projects || []).map((p: any) => ({
        ...p,
        customerName: opNameMap[p.operation_id] || "Unknown",
        workTypeCode: p.work_types?.[0]?.work_type?.code || "",
      }));
    },
    enabled: clientOpIds.length > 0 && !!customers,
  });

  // ── Action items (Red Book) ──
  const { data: actionItems } = useQuery({
    queryKey: ["vet-action-items", operationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("red_book_notes")
        .select("id, title, category")
        .eq("operation_id", operationId)
        .eq("has_action", true)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  // ── Most recent project date per customer ──
  const { data: lastWorkedMap } = useQuery({
    queryKey: ["vet-last-worked", clientOpIds],
    queryFn: async () => {
      if (clientOpIds.length === 0) return {};
      const map: Record<string, string> = {};
      for (const opId of clientOpIds) {
        const { data } = await supabase
          .from("projects")
          .select("date")
          .eq("operation_id", opId)
          .eq("project_status", "Completed")
          .order("date", { ascending: false })
          .limit(1);
        if (data?.[0]?.date) {
          map[opId] = new Date(data[0].date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
      }
      return map;
    },
    enabled: clientOpIds.length > 0,
  });

  const stats = [
    { label: "Completed", value: String(completedMTD ?? "—"), subtitle: "projects this month", angle: 140, route: "/cow-work" },
    { label: "Upcoming", value: String(upcomingEvents?.length ?? "—"), subtitle: "scheduled events", angle: 155, route: "/protocols" },
    { label: "Head MTD", value: String(headWorkedMTD ?? "—"), subtitle: "worked this month", angle: 165, route: "/cow-work" },
  ];

  const events = upcomingEvents || [];
  const work = recentWork || [];
  const actions = actionItems || [];

  // Build customer initials
  const getInitials = (name: string) => {
    return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  };

  return (
    <div className="px-4 space-y-5">
      {/* SECTION 1 — Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ zIndex: 1 }}>
          <circle cx="8" cy="8" r="5.5" stroke="rgba(26,26,26,0.16)" strokeWidth="1.5" />
          <path d="M12.5 12.5L16 16" stroke="rgba(26,26,26,0.16)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search customers, tags, projects…"
          className="w-full h-[46px] rounded-xl bg-white border border-border-divider font-inter outline-none transition-all pl-10 pr-4 focus:border-gold focus:ring-2 focus:ring-gold/20"
          style={{ fontSize: 16, fontWeight: 400, color: "#1A1A1A" }}
          readOnly
        />
      </div>

      {/* SECTION 2 — Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} subtitle={s.subtitle} gradientAngle={s.angle} onClick={() => navigate(s.route)} />
        ))}
        <div
          className="rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors duration-150 active:scale-[0.98] hover:border-gold/40 hover:bg-gold/5"
          style={{ border: "2px dashed rgba(14,38,70,0.12)", minHeight: 72 }}
          onClick={() => navigate("/red-book/new")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/red-book/new"); }}
        >
          <span style={{ fontSize: 28, fontWeight: 300, color: "rgba(14,38,70,0.20)" }}>+</span>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(14,38,70,0.30)" }}>NEW NOTE</span>
        </div>
      </div>

      {/* SECTION 3 — Upcoming Events */}
      <div>
        <SectionHeading text="Upcoming Events" />
        {events.length > 0 ? (
          <div className="rounded-xl bg-white overflow-hidden divide-y" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
            {events.map((ev: any) => {
              const proto = ev.assigned_protocol;
              const customerName = proto?.operations?.name || "—";
              const animalClass = proto?.animal_class || "";
              const headCount = proto?.estimated_head_count;
              const fmtDate = ev.scheduled_date
                ? new Date(ev.scheduled_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "—";
              return (
                <div
                  key={ev.id}
                  className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-page-bg active:bg-border-divider/40 transition-colors"
                  onClick={() => navigate("/protocols")}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>
                      {customerName} — {ev.event_name}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(26,26,26,0.40)" }}>
                      {[animalClass, headCount ? `${headCount} head` : null].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#55BAAA", flexShrink: 0 }}>{fmtDate}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-white px-4 py-6 text-center" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(26,26,26,0.35)" }}>No upcoming events</div>
          </div>
        )}
      </div>

      {/* SECTION 4 — Customers */}
      <div>
        <SectionHeading text="Customers" />
        {(customers || []).length > 0 ? (
          <div className="rounded-xl bg-white overflow-hidden divide-y" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
            {(customers || []).map((c: any) => {
              const op = c.operations;
              const name = op?.name || "Unknown";
              const head = headCounts?.[c.operation_id] ?? "—";
              const lastDate = lastWorkedMap?.[c.operation_id];
              return (
                <div
                  key={c.id}
                  className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-page-bg active:bg-border-divider/40 transition-colors"
                  onClick={() => navigate(`/customers/${c.operation_id}`)}
                >
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-lg"
                    style={{
                      width: 32,
                      height: 32,
                      background: "linear-gradient(145deg, #0E2646, #1a3a5c)",
                      fontSize: 12,
                      fontWeight: 500,
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    {getInitials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="rounded-full"
                        style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(85,186,170,0.12)", color: "#0F6E56", textTransform: "uppercase", letterSpacing: "0.06em" }}
                      >
                        {head} head
                      </span>
                    </div>
                  </div>
                  {lastDate && (
                    <span style={{ fontSize: 11, color: "rgba(26,26,26,0.35)", flexShrink: 0 }}>Last: {lastDate}</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-white px-4 py-6 text-center" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(26,26,26,0.35)" }}>No customers yet</div>
          </div>
        )}
      </div>

      {/* SECTION 5 — Action Items + New Note */}
      {actions.length > 0 && (
        <div
          className="rounded-xl bg-white p-4 cursor-pointer active:scale-[0.99] transition-transform"
          style={{ border: "1px solid #D4D4D0" }}
          onClick={() => navigate("/red-book")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 1.5V14.5M3 1.5H12L9.5 5.25L12 9H3" stroke="#E74C3C" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0E2646" }}>Action Items</span>
            </div>
            <span className="rounded-full" style={{ padding: "2px 10px", fontSize: 11, fontWeight: 700, color: "#C62828", backgroundColor: "#FFEBEE" }}>
              {actions.length}
            </span>
          </div>
          {actions.slice(0, 3).map((item: any, idx: number) => (
            <div
              key={item.id}
              className="flex items-center gap-3"
              style={{ padding: "10px 0", borderBottom: idx < Math.min(actions.length, 3) - 1 ? "1px solid rgba(212,212,208,0.30)" : "none" }}
            >
              <div className="flex-1 min-w-0">
                <span className="truncate block" style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{item.title}</span>
                <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(26,26,26,0.35)" }}>{item.category || ""}</span>
              </div>
            </div>
          ))}
          <div className="mt-2" style={{ color: "#55BAAA", fontSize: 12, fontWeight: 600 }}>
            View all {actions.length} action items →
          </div>
        </div>
      )}

      {/* SECTION 6 — Recent Work */}
      <div>
        <SectionHeading text="Recent Work" />
        {work.length > 0 ? (
          <div className="rounded-xl bg-white overflow-hidden divide-y" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
            {work.map((w: any) => {
              const fmtDate = new Date(w.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
              return (
                <div
                  key={w.id}
                  className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-page-bg active:bg-border-divider/40 transition-colors"
                  onClick={() => navigate(`/cow-work/${w.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>
                      {w.name} — {w.customerName}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(26,26,26,0.40)" }}>
                      {[w.workTypeCode, w.head_count ? `${w.head_count} head` : null, "Completed"].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(26,26,26,0.35)", flexShrink: 0 }}>{fmtDate}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-white px-4 py-6 text-center" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(26,26,26,0.35)" }}>No completed projects yet</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VetDashboardScreen;
