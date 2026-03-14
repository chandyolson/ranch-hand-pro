import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useOperationPreferences } from "@/hooks/useOperationPreferences";
import { useChuteSideToast } from "@/components/ToastContext";
import ListScreenToolbar from "@/components/ListScreenToolbar";
import { Skeleton } from "@/components/ui/skeleton";

const BREED_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  beef: { label: "BEEF", color: "#0E2646", bg: "rgba(14,38,70,0.10)" },
  dairy: { label: "DAIRY", color: "#1B6B93", bg: "rgba(27,107,147,0.10)" },
  dual: { label: "DUAL", color: "#6B4C1B", bg: "rgba(107,76,27,0.10)" },
};

const ReferenceBreedsScreen: React.FC = () => {
  const { operationId } = useOperation();
  const queryClient = useQueryClient();
  const { showToast } = useChuteSideToast();
  const { data: prefs } = useOperationPreferences();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [filterType, setFilterType] = useState("");

  const { data: breeds, isLoading } = useQuery({
    queryKey: ["breeds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breeds")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const favorites = useMemo(() => new Set(prefs?.preferred_breeds || []), [prefs]);

  const filtered = useMemo(() => {
    let list = breeds || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b => b.name.toLowerCase().includes(q) || b.origin?.toLowerCase().includes(q));
    }
    if (filterType) {
      list = list.filter(b => b.breed_type === filterType);
    }
    return list.sort((a, b) => {
      if (sort === "favorites") {
        const aFav = favorites.has(a.name) ? 0 : 1;
        const bFav = favorites.has(b.name) ? 0 : 1;
        if (aFav !== bFav) return aFav - bFav;
      }
      return a.name.localeCompare(b.name);
    });
  }, [breeds, search, filterType, sort, favorites]);

  const toggleFavorite = async (breedName: string) => {
    const current = prefs?.preferred_breeds || [];
    const next = current.includes(breedName)
      ? current.filter(b => b !== breedName)
      : [...current, breedName];

    const { error } = await supabase
      .from("operation_preferences")
      .upsert(
        { operation_id: operationId, preferred_breeds: next },
        { onConflict: "operation_id" }
      );

    if (error) {
      showToast("error", error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["operation-preferences"] });
    showToast("success", current.includes(breedName) ? `${breedName} removed from favorites` : `${breedName} added to favorites`);
  };

  const stats = useMemo(() => {
    const all = breeds || [];
    return {
      total: all.length,
      favorites: (prefs?.preferred_breeds || []).length,
      beef: all.filter(b => b.breed_type === "beef").length,
    };
  }, [breeds, prefs]);

  const isFiltering = search.length > 0 || filterType.length > 0;

  return (
    <div className="px-4 pt-1 pb-10 space-y-2">
      {/* Stats bar */}
      <div
        className="rounded-xl px-3 py-2.5 flex items-center justify-between"
        style={{ background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}
      >
        {[
          { label: "TOTAL", value: isLoading ? "—" : stats.total },
          { label: "FAVORITES", value: isLoading ? "—" : stats.favorites },
          { label: "BEEF", value: isLoading ? "—" : stats.beef },
        ].map((stat, i, arr) => (
          <div key={stat.label} className="flex items-center gap-3">
            <div className="flex flex-col items-center" style={{ minWidth: 50 }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: "white", lineHeight: 1 }}>{stat.value}</span>
              <span style={{ fontSize: 9, fontWeight: 500, color: "rgba(168,230,218,0.60)", letterSpacing: "0.08em", marginTop: 4 }}>{stat.label}</span>
            </div>
            {i < arr.length - 1 && <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.12)" }} />}
          </div>
        ))}
      </div>

      <ListScreenToolbar
        title="Breeds"
        addLabel=""
        onAdd={() => {}}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search breeds…"
        filterChips={[
          { value: "", label: "All" },
          { value: "beef", label: "Beef" },
          { value: "dairy", label: "Dairy" },
          { value: "dual", label: "Dual" },
        ]}
        activeFilter={filterType}
        onFilterChange={setFilterType}
        sortOptions={[
          { value: "name", label: "Name" },
          { value: "favorites", label: "Favorites First" },
        ]}
        activeSort={sort}
        onSortChange={setSort}
        resultCount={filtered.length}
        isFiltering={isFiltering}
      />

      {/* Breed list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[56px] rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.15)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center space-y-1.5">
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>No breeds found</div>
          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.30)" }}>Try a different search or filter</div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Favorite breeds */}
          {favBreeds.length > 0 && (
            <div className="grid grid-cols-1 gap-1.5">
              {favBreeds.map(breed => <BreedRow key={breed.id} breed={breed} isFav toggleFavorite={toggleFavorite} />)}
            </div>
          )}

          {/* Other breeds in collapsible */}
          {otherBreeds.length > 0 && (
            <CollapsibleSection
              title={`All Breeds (${otherBreeds.length})`}
              defaultOpen={favBreeds.length === 0}
            >
              <div className="grid grid-cols-1 gap-1.5">
                {otherBreeds.map(breed => <BreedRow key={breed.id} breed={breed} isFav={false} toggleFavorite={toggleFavorite} />)}
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}
    </div>
  );
};

export default ReferenceBreedsScreen;
