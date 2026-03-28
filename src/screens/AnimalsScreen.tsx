import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DataCard from "@/components/DataCard";
import ListScreenToolbar from "@/components/ListScreenToolbar";
import AdvancedSearchPanel from "@/components/AdvancedSearchPanel";
import { useChuteSideToast } from "@/components/ToastContext";
import StatsBar from "@/components/StatsBar";
import EmptyState from "@/components/EmptyState";
import LoadingGrid from "@/components/LoadingGrid";
import { useAnimals, useAnimalCounts } from "@/hooks/useAnimals";
import { usePersistedFilters, useFilterPresets } from "@/hooks/usePersistedFilters";
import type { AnimalSortKey } from "@/hooks/useAnimals";
import type { FilterFieldConfig } from "@/lib/filter-types";
import {
  SEX_OPTIONS, ANIMAL_TYPE_OPTIONS, STATUS_OPTIONS, BREED_OPTIONS, TAG_COLOR_OPTIONS,
} from "@/lib/constants";
import { useDebounce } from "@/hooks/useDebounce";

const ANIMAL_FILTER_FIELDS: FilterFieldConfig[] = [
  { key: "tag",        label: "Tag",        type: "text",   group: "Identity" },
  { key: "tag_color",  label: "Tag Color",  type: "select", options: [...TAG_COLOR_OPTIONS], group: "Identity" },
  { key: "eid",        label: "EID",        type: "text",   group: "Identity" },
  { key: "sex",        label: "Sex",        type: "select", options: [...SEX_OPTIONS],        group: "Identity" },
  { key: "type",       label: "Type",       type: "select", options: [...ANIMAL_TYPE_OPTIONS], group: "Identity" },
  { key: "breed",      label: "Breed",      type: "select", options: [...BREED_OPTIONS],      group: "Identity" },
  { key: "year_born",  label: "Year Born",  type: "range",  group: "Identity" },
  { key: "status",     label: "Status",     type: "select", options: [...STATUS_OPTIONS],     group: "Identity" },
  { key: "lifetime_id", label: "Lifetime ID", type: "text", group: "IDs" },
  { key: "reg_name",   label: "Reg Name",   type: "text",   group: "IDs" },
  { key: "reg_number", label: "Reg Number", type: "text",   group: "IDs" },
  { key: "memo",       label: "Memo",       type: "text",   group: "Notes" },
];

const TYPE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  Calf:        { bg: "rgba(85,186,170,0.25)",  text: "#55BAAA" },
  Feeder:      { bg: "rgba(243,209,42,0.20)",  text: "#F3D12A" },
  Replacement: { bg: "rgba(91,141,239,0.25)",  text: "#5B8DEF" },
  Cow:         { bg: "rgba(240,240,240,0.15)", text: "rgba(240,240,240,0.75)" },
  Bull:        { bg: "rgba(232,138,58,0.25)",  text: "#E88A3A" },
};

const getTypeBadge = (type?: string | null) => {
  if (!type) return undefined;
  const colors = TYPE_BADGE_COLORS[type] || { bg: "rgba(240,240,240,0.12)", text: "rgba(240,240,240,0.6)" };
  return { label: type, ...colors };
};

const AnimalsScreen: React.FC = () => {
  const [search, setSearch]   = useState("");
  const [sort, setSort]       = useState<AnimalSortKey>("tag-asc");
  const navigate              = useNavigate();
  const { showToast }         = useChuteSideToast();

  const { filters, setFilters, clearFilters } = usePersistedFilters("chuteside_filters_animals");
  const { presets, addPreset, deletePreset }  = useFilterPresets("chuteside_presets_animals");

  // Debounce so we don't fire a query on every keystroke
  const debouncedSearch = useDebounce(search, 300);

  const {
    data: animalPages,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAnimals({
    search:  debouncedSearch,
    filters,
    sort,
  });

  const animals = animalPages?.pages.flat() ?? [];

  // Stats always reflect the full herd, not the current search result
  const { data: counts } = useAnimalCounts();

  const isFiltering = search.length > 0 || filters.length > 0;
  const totalLoaded = animals.length;

  return (
    <div className="px-4 pt-1 pb-10 space-y-2">
      {/* Totals bar — sourced from count queries, never from the filtered page */}
      <StatsBar stats={[
        { label: "TOTAL",  value: counts?.total  },
        { label: "ACTIVE", value: counts?.active },
        { label: "COWS",   value: counts?.cows   },
        { label: "BULLS",  value: counts?.bulls  },
      ]} />

      <ListScreenToolbar
        title="Animals"
        addLabel="New Animal"
        hideTitle
        compactAdd
        onAdd={() => navigate("/animals/new")}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tags, breeds, EIDs…"
        filterChips={[]}
        activeFilter=""
        onFilterChange={() => {}}
        sortOptions={[
          { value: "tag-asc",  label: "Tag ↑" },
          { value: "tag-desc", label: "Tag ↓" },
          { value: "breed",    label: "Breed" },
        ]}
        activeSort={sort}
        onSortChange={(v) => setSort(v as AnimalSortKey)}
        onImport={() => showToast("info", "Import — coming soon")}
        onExport={() => showToast("info", "Export — coming soon")}
        onMassSelect={() => showToast("info", "Mass Select — coming soon")}
        onMassEdit={() => showToast("info", "Mass Edit — coming soon")}
        resultCount={totalLoaded}
        isFiltering={isFiltering}
        advancedFilter={
          <AdvancedSearchPanel
            fields={ANIMAL_FILTER_FIELDS}
            filters={filters}
            onFiltersChange={setFilters}
            presets={presets}
            onAddPreset={addPreset}
            onDeletePreset={deletePreset}
            onClearAll={clearFilters}
          />
        }
      />

      {isLoading && <LoadingGrid count={6} columns={2} height={72} />}

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

      {!isLoading && !error && animals.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {animals.map(animal => (
              <div
                key={animal.id}
                className="cursor-pointer active:scale-[0.99] transition-transform duration-100"
                onClick={() => navigate("/animals/" + animal.id)}
              >
                <DataCard
                  title={`Tag ${animal.tag}`}
                  values={[animal.breed || "Unknown", animal.sex, animal.year_born ? String(animal.year_born) : ""].filter(Boolean)}
                  badge={getTypeBadge(animal.type)}
                />
              </div>
            ))}
          </div>

          {hasNextPage && (
            <div className="flex justify-center pt-2 pb-4">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "#0E2646", color: "white", opacity: isFetchingNextPage ? 0.6 : 1 }}
              >
                {isFetchingNextPage ? "Loading…" : "Load More"}
              </button>
            </div>
          )}
        </>
      )}

      {!isLoading && !error && animals.length === 0 && (
        <EmptyState
          title={isFiltering ? "No animals match your search" : "No animals yet"}
          subtitle={isFiltering ? "Try a different search or filter" : undefined}
        />
      )}
    </div>
  );
};

export default AnimalsScreen;
