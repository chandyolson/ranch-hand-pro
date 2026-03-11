import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DataCard from "@/components/DataCard";
import ListScreenToolbar from "@/components/ListScreenToolbar";
import { useChuteSideToast } from "@/components/ToastContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnimals } from "@/hooks/useAnimals";
const TYPE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  Calf:        { bg: "rgba(85,186,170,0.25)", text: "#55BAAA" },
  Feeder:      { bg: "rgba(243,209,42,0.20)", text: "#F3D12A" },
  Replacement: { bg: "rgba(91,141,239,0.25)", text: "#5B8DEF" },
  Cow:         { bg: "rgba(240,240,240,0.15)", text: "rgba(240,240,240,0.75)" },
  Bull:        { bg: "rgba(232,138,58,0.25)", text: "#E88A3A" },
};

const getTypeBadge = (type?: string | null) => {
  if (!type) return undefined;
  const colors = TYPE_BADGE_COLORS[type] || { bg: "rgba(240,240,240,0.12)", text: "rgba(240,240,240,0.6)" };
  return { label: type, ...colors };
};


  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sort, setSort] = useState("tag-asc");
  const navigate = useNavigate();
  const { showToast } = useChuteSideToast();

  const { data: animals, isLoading, error, refetch } = useAnimals(statusFilter === "All" ? undefined : statusFilter);

  const filtered = (animals || [])
    .filter(a =>
      !search ||
      a.tag.toLowerCase().includes(search.toLowerCase()) ||
      (a.breed || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.eid || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      switch (sort) {
        case "tag-asc": return a.tag.localeCompare(b.tag);
        case "tag-desc": return b.tag.localeCompare(a.tag);
        case "breed": return (a.breed || "").localeCompare(b.breed || "");
        default: return 0;
      }
    });

  const isFiltering = search.length > 0 || statusFilter !== "All";

  const allAnimals = animals || [];
  const stats = {
    total: allAnimals.length,
    active: allAnimals.filter(a => a.status === "Active").length,
    cows: allAnimals.filter(a => a.sex === "Cow").length,
    bulls: allAnimals.filter(a => a.sex === "Bull").length,
  };

  return (
    <div className="px-4 pt-2 pb-10 space-y-2">
      {/* Totals bar */}
      <div
        className="rounded-xl px-3 py-2.5 flex items-center justify-between"
        style={{ background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}
      >
        {[
          { label: "TOTAL",  value: isLoading ? "—" : stats.total },
          { label: "ACTIVE", value: isLoading ? "—" : stats.active },
          { label: "COWS",   value: isLoading ? "—" : stats.cows },
          { label: "BULLS",  value: isLoading ? "—" : stats.bulls },
        ].map((stat, i, arr) => (
          <div key={stat.label} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <span style={{ fontSize: 20, fontWeight: 800, color: "white", lineHeight: 1, letterSpacing: "-0.02em" }}>
                {stat.value}
              </span>
              <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(168,230,218,0.70)", letterSpacing: "0.10em", marginTop: 2 }}>
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
        title="Animals"
        addLabel="New Animal"
        hideTitle
        compactAdd
        onAdd={() => navigate("/animals/new")}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tags, breeds, EIDs…"
        filterChips={[
          { value: "All", label: "All" },
          { value: "Active", label: "Active" },
          { value: "Sold", label: "Sold" },
          { value: "Dead", label: "Dead" },
        ]}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        sortOptions={[
          { value: "tag-asc", label: "Tag ↑" },
          { value: "tag-desc", label: "Tag ↓" },
          { value: "breed", label: "Breed" },
        ]}
        activeSort={sort}
        onSortChange={setSort}
        onImport={() => showToast("info", "Import — coming soon")}
        onExport={() => showToast("info", "Export — coming soon")}
        onMassSelect={() => showToast("info", "Mass Select — coming soon")}
        onMassEdit={() => showToast("info", "Mass Edit — coming soon")}
        resultCount={filtered.length}
        isFiltering={isFiltering}
      />

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.15)" }} />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="py-12 text-center space-y-3">
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>Failed to load animals</div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: "#0E2646", color: "white" }}
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.map(animal => (
            <div
              key={animal.id}
              className="cursor-pointer active:scale-[0.99] transition-transform duration-100"
              onClick={() => navigate("/animals/" + animal.id)}
            >
              <DataCard
                title={`Tag ${animal.tag}`}
                values={[animal.breed || "Unknown", animal.sex, animal.type || "", animal.year_born ? String(animal.year_born) : ""].filter(Boolean)}
              />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="py-12 text-center space-y-1.5">
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>No animals found</div>
          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.30)" }}>Try a different search or filter</div>
        </div>
      )}
    </div>
  );
};

export default AnimalsScreen;
