import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import ListScreenToolbar from "@/components/ListScreenToolbar";
import { Skeleton } from "@/components/ui/skeleton";

const CLASS_COLORS: Record<string, { bg: string; text: string }> = {
  Calves: { bg: "rgba(85,186,170,0.12)", text: "#55BAAA" },
  Cows: { bg: "rgba(243,209,42,0.12)", text: "#B8860B" },
  Bulls: { bg: "rgba(14,38,70,0.12)", text: "#0E2646" },
  Heifers: { bg: "rgba(232,116,97,0.12)", text: "#E87461" },
  Feeders: { bg: "rgba(168,168,168,0.12)", text: "#888888" },
};

const FILTER_CHIPS = [
  { value: "all", label: "All" },
  { value: "Calves", label: "Calves" },
  { value: "Cows", label: "Cows" },
  { value: "Heifers", label: "Heifers" },
  { value: "Bulls", label: "Bulls" },
  { value: "Feeders", label: "Feeders" },
];

export default function ProtocolsScreen() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const navigate = useNavigate();
  const { operationId } = useOperation();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["vaccination-protocols", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vaccination_protocol_templates")
        .select("*, events:protocol_template_events(id)")
        .eq("operation_id", operationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const mapped = (templates || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    animalClass: t.animal_class || "Calves",
    eventCount: Array.isArray(t.events) ? t.events.length : 0,
    status: (t.protocol_status || "draft") as string,
    createdAt: t.created_at,
  }));

  const filtered = mapped
    .filter((p) => classFilter === "all" || p.animalClass === classFilter)
    .filter(
      (p) =>
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.animalClass.toLowerCase().includes(search.toLowerCase())
    );

  const activeCount = mapped.filter((p) => p.status === "active").length;
  const totalCount = mapped.length;

  return (
    <div className="px-4 pt-1 pb-10 space-y-2">
      {/* Stats bar */}
      <div
        className="rounded-xl px-3 py-2.5 flex items-center justify-between"
        style={{ background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}
      >
        {[
          { label: "TEMPLATES", value: isLoading ? "—" : totalCount },
          { label: "ACTIVE", value: isLoading ? "—" : activeCount },
          { label: "DRAFT", value: isLoading ? "—" : totalCount - activeCount },
        ].map((stat, i, arr) => (
          <div key={stat.label} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <span style={{ fontSize: 18, fontWeight: 600, color: "white", lineHeight: 1 }}>
                {stat.value}
              </span>
              <span style={{ fontSize: 9, fontWeight: 500, color: "rgba(168,230,218,0.60)", letterSpacing: "0.08em", marginTop: 4 }}>
                {stat.label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.12)" }} />
            )}
          </div>
        ))}
      </div>

      <ListScreenToolbar
        title="Protocols"
        addLabel="New Protocol"
        hideTitle
        compactAdd
        onAdd={() => navigate("/protocols/new")}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search protocols…"
        filterChips={FILTER_CHIPS}
        activeFilter={classFilter}
        onFilterChange={setClassFilter}
        hideSort
        resultCount={filtered.length}
        isFiltering={search.length > 0 || classFilter !== "all"}
      />

      {/* Protocol list */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.15)" }} />
          ))}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((p) => {
            const cls = CLASS_COLORS[p.animalClass] || CLASS_COLORS.Feeders;
            const isActive = p.status === "active";
            return (
              <button
                key={p.id}
                className="w-full text-left rounded-xl bg-white px-4 py-3 cursor-pointer active:scale-[0.98] transition-transform"
                style={{ border: "1px solid #D4D4D0" }}
                onClick={() => navigate(`/protocols/${p.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.3 }} className="truncate">
                      {p.name}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="rounded-full px-2 py-0.5"
                        style={{ fontSize: 11, fontWeight: 600, backgroundColor: cls.bg, color: cls.text }}
                      >
                        {p.animalClass}
                      </span>
                      <span style={{ fontSize: 12, color: "#717182" }}>
                        {p.eventCount} Working Event{p.eventCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 shrink-0 mt-0.5"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: isActive ? "rgba(85,186,170,0.12)" : "rgba(168,168,168,0.12)",
                      color: isActive ? "#55BAAA" : "#888888",
                    }}
                  >
                    {isActive ? "Active" : "Draft"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!isLoading && filtered.length === 0 && mapped.length === 0 && (
        <div className="py-16 text-center space-y-3">
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>
            No vaccination protocols yet
          </div>
          <button
            className="rounded-xl px-5 py-2.5 cursor-pointer active:scale-[0.95]"
            style={{ backgroundColor: "#55BAAA", color: "white", fontSize: 14, fontWeight: 600, border: "none" }}
            onClick={() => navigate("/protocols/new")}
          >
            Create Your First Protocol
          </button>
        </div>
      )}

      {!isLoading && filtered.length === 0 && mapped.length > 0 && (
        <div className="py-12 text-center space-y-1.5">
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>No protocols found</div>
          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.30)" }}>Try a different search or filter</div>
        </div>
      )}
    </div>
  );
}
