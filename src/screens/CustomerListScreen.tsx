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
    enabled: !!operationId,
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
    enabled: !!vetPractice?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("vet_practice_clients")
        .select("id, operation_id, clinic_client_id, premise_id, notes, operations(id, name, owner_name, email, phone, address)")
        .eq("vet_practice_id", vetPractice!.id);
      return data ?? [];
    },
  });

  const clientOpIds = (customers ?? [])
    .map((c) => (c as { operation_id: string }).operation_id)
    .filter(Boolean);

  // ── Head counts — one parallel COUNT per operation ──
  const { data: headCounts } = useQuery({
    queryKey: ["vet-head-counts", clientOpIds],
    enabled: clientOpIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        clientOpIds.map((opId) =>
          supabase
            .from("animals")
            .select("*", { count: "exact", head: true })
            .eq("operation_id", opId)
            .eq("status", "Active")
            .then(({ count }) => [opId, count ?? 0] as const)
        )
      );
      return Object.fromEntries(results) as Record<string, number>;
    },
  });

  // ── Last worked date — single batch query, pick max date per operation ──
  const { data: lastWorkedMap } = useQuery({
    queryKey: ["vet-last-worked", clientOpIds],
    enabled: clientOpIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("operation_id, date")
        .in("operation_id", clientOpIds)
        .eq("project_status", "Completed")
        .order("date", { ascending: false });

      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        if (!map[row.operation_id]) map[row.operation_id] = row.date;
      }
      return map;
    },
  });

  // ── Project counts — single batch query, count per operation ──
  const { data: projectCounts } = useQuery({
    queryKey: ["vet-project-counts", clientOpIds],
    enabled: clientOpIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("operation_id")
        .in("operation_id", clientOpIds);

      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.operation_id] = (counts[row.operation_id] ?? 0) + 1;
      }
      return counts;
    },
  });

  // Filter by search
  const filtered = (customers ?? []).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const rec = c as { clinic_client_id?: string; operations?: { name?: string; owner_name?: string } };
    const name  = rec.operations?.name?.toLowerCase() ?? "";
    const owner = rec.operations?.owner_name?.toLowerCase() ?? "";
    const id    = rec.clinic_client_id?.toLowerCase() ?? "";
    return name.includes(q) || owner.includes(q) || id.includes(q);
  });

  // Sort: most recently worked first, then alphabetical
  const sorted = [...filtered].sort((a, b) => {
    const recA = a as { operation_id: string; operations?: { name?: string } };
    const recB = b as { operation_id: string; operations?: { name?: string } };
    const dateA = lastWorkedMap?.[recA.operation_id] ?? "";
    const dateB = lastWorkedMap?.[recB.operation_id] ?? "";
    if (dateA && dateB) return dateB.localeCompare(dateA);
    if (dateA) return -1;
    if (dateB) return 1;
    return (recA.operations?.name ?? "").localeCompare(recB.operations?.name ?? "");
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
          {sorted.map((c) => {
            const rec  = c as { id: string; operation_id: string; operations?: { name?: string; owner_name?: string } };
            const name = rec.operations?.name ?? "Unknown";
            const owner = rec.operations?.owner_name;
            const head = headCounts?.[rec.operation_id] ?? "—";
            const projects = projectCounts?.[rec.operation_id] ?? 0;
            const lastDate = lastWorkedMap?.[rec.operation_id];
            const fmtDate = lastDate
              ? new Date(lastDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : null;

            return (
              <div
                key={rec.id}
                className="rounded-xl cursor-pointer active:scale-[0.99] transition-transform duration-100"
                style={{ backgroundColor: C.navy, padding: "14px 16px" }}
                onClick={() => navigate(`/customers/${rec.operation_id}`)}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-lg"
                    style={{
                      width: 40, height: 40,
                      background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                      fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    {getInitials(name)}
                  </div>
                  {/* Name + owner */}
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ fontSize: 15, fontWeight: 600, color: "#F0F0F0" }}>{name}</div>
                    {owner && (
                      <div className="truncate" style={{ fontSize: 12, color: "rgba(240,240,240,0.45)" }}>{owner}</div>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 mt-2.5" style={{ paddingLeft: 52 }}>
                  <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(85,186,170,0.15)", color: "#A8E6DA", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {head} head
                  </span>
                  <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(240,240,240,0.45)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {projects} project{projects !== 1 ? "s" : ""}
                  </span>
                  {fmtDate && (
                    <span style={{ fontSize: 10, color: "rgba(240,240,240,0.3)", marginLeft: "auto" }}>Last: {fmtDate}</span>
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
