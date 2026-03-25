/**
 * CustomerListScreen — /customers
 * Vet practice client list. Shows all vet_practice_clients → operations
 * with head count, last worked date, and search.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { Search } from "lucide-react";

const C = {
  navy: "#0E2646", cream: "#F5F5F0", teal: "#55BAAA",
  gold: "#F3D12A", text: "#1A1A1A", border: "#D4D4D0",
};

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

const CustomerListScreen: React.FC = () => {
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const [search, setSearch] = useState("");

  // ── Vet practice lookup ──
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

  // ── Clients ──
  const { data: customers, isLoading } = useQuery({
    queryKey: ["vet-customers", vetPractice?.id],
    queryFn: async () => {
      if (!vetPractice?.id) return [];
      const { data } = await supabase
        .from("vet_practice_clients")
        .select("id, operation_id, clinic_client_id, premise_id, notes, operations(id, name, owner_name, email, phone, address)")
        .eq("vet_practice_id", vetPractice.id);
      return data || [];
    },
    enabled: !!vetPractice?.id,
  });

  // ── Head counts per client operation ──
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

  // ── Last worked date per client ──
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
          map[opId] = data[0].date;
        }
      }
      return map;
    },
    enabled: clientOpIds.length > 0,
  });

  // ── Project count per client (all time) ──
  const { data: projectCounts } = useQuery({
    queryKey: ["vet-project-counts", clientOpIds],
    queryFn: async () => {
      if (clientOpIds.length === 0) return {};
      const counts: Record<string, number> = {};
      for (const opId of clientOpIds) {
        const { count } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("operation_id", opId);
        counts[opId] = count || 0;
      }
      return counts;
    },
    enabled: clientOpIds.length > 0,
  });

  // Filter by search
  const filtered = (customers || []).filter((c: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = c.operations?.name?.toLowerCase() || "";
    const owner = c.operations?.owner_name?.toLowerCase() || "";
    const clientId = c.clinic_client_id?.toLowerCase() || "";
    return name.includes(q) || owner.includes(q) || clientId.includes(q);
  });

  // Sort: most recently worked first, then alphabetical
  const sorted = [...filtered].sort((a: any, b: any) => {
    const dateA = lastWorkedMap?.[a.operation_id] || "";
    const dateB = lastWorkedMap?.[b.operation_id] || "";
    if (dateA && dateB) return dateB.localeCompare(dateA);
    if (dateA) return -1;
    if (dateB) return 1;
    return (a.operations?.name || "").localeCompare(b.operations?.name || "");
  });

  return (
    <div className="px-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "rgba(26,26,26,0.16)" }}
        />
        <input
          type="text"
          placeholder="Search customers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-[44px] rounded-xl bg-white border font-inter outline-none transition-all pl-10 pr-4 focus:border-[#F3D12A] focus:ring-2 focus:ring-[#F3D12A]/20"
          style={{ fontSize: 16, fontWeight: 400, color: C.text, borderColor: C.border }}
        />
      </div>

      {/* Summary pill */}
      <div className="flex items-center gap-2">
        <span
          className="rounded-full"
          style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", backgroundColor: "rgba(85,186,170,0.12)", color: "#0F6E56" }}
        >
          {sorted.length} customer{sorted.length !== 1 ? "s" : ""}
        </span>
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{ fontSize: 11, color: C.teal, background: "none", border: "none", cursor: "pointer" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl h-[88px] animate-pulse" style={{ backgroundColor: "rgba(14,38,70,0.06)" }} />
          ))}
        </div>
      )}

      {/* Customer cards */}
      {!isLoading && sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map((c: any) => {
            const op = c.operations;
            const name = op?.name || "Unknown";
            const owner = op?.owner_name;
            const head = headCounts?.[c.operation_id] ?? "—";
            const projects = projectCounts?.[c.operation_id] ?? 0;
            const lastDate = lastWorkedMap?.[c.operation_id];
            const fmtDate = lastDate
              ? new Date(lastDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : null;

            return (
              <div
                key={c.id}
                className="rounded-xl cursor-pointer active:scale-[0.99] transition-transform duration-100"
                style={{ backgroundColor: C.navy, padding: "14px 16px" }}
                onClick={() => navigate(`/customers/${c.operation_id}`)}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-lg"
                    style={{
                      width: 40,
                      height: 40,
                      background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    {getInitials(name)}
                  </div>

                  {/* Name + owner */}
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ fontSize: 15, fontWeight: 600, color: "#F0F0F0" }}>
                      {name}
                    </div>
                    {owner && (
                      <div className="truncate" style={{ fontSize: 12, color: "rgba(240,240,240,0.45)" }}>
                        {owner}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 mt-2.5" style={{ paddingLeft: 52 }}>
                  <span
                    className="rounded-full"
                    style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(85,186,170,0.15)", color: "#A8E6DA", textTransform: "uppercase", letterSpacing: "0.06em" }}
                  >
                    {head} head
                  </span>
                  <span
                    className="rounded-full"
                    style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(240,240,240,0.45)", textTransform: "uppercase", letterSpacing: "0.06em" }}
                  >
                    {projects} project{projects !== 1 ? "s" : ""}
                  </span>
                  {fmtDate && (
                    <span style={{ fontSize: 10, color: "rgba(240,240,240,0.3)", marginLeft: "auto" }}>
                      Last: {fmtDate}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sorted.length === 0 && !search && (
        <div className="rounded-xl bg-white px-6 py-10 text-center" style={{ border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.15 }}>🏠</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>No customers yet</div>
          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.45)" }}>
            Add ranch customers from Reference → Team to start managing their herds
          </div>
        </div>
      )}

      {/* No results */}
      {!isLoading && sorted.length === 0 && search && (
        <div className="rounded-xl bg-white px-6 py-8 text-center" style={{ border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, color: "rgba(26,26,26,0.45)" }}>
            No customers matching "{search}"
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerListScreen;
