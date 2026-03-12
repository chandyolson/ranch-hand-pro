import React, { useState, useMemo } from "react";
import { useChuteSideToast } from "@/components/ToastContext";
import ListScreenToolbar from "@/components/ListScreenToolbar";
import AdvancedSearchPanel from "@/components/AdvancedSearchPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_CONFIG, type ProductCategory } from "@/lib/constants";
import { INPUT_CLS } from "@/lib/styles";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';
import { usePersistedFilters, useFilterPresets } from "@/hooks/usePersistedFilters";
import { applyFilters } from "@/lib/filter-utils";
import type { FilterFieldConfig } from "@/lib/filter-types";

const TREATMENT_FILTER_FIELDS: FilterFieldConfig[] = [
  { key: "name", label: "Product Name", type: "text", group: "Product" },
  { key: "category", label: "Category", type: "select", options: [...PRODUCT_CATEGORIES], group: "Product" },
  { key: "manufacturer", label: "Manufacturer", type: "text", group: "Product" },
  { key: "defaultRoute", label: "Route", type: "text", group: "Product" },
  { key: "withdrawalDays", label: "Withdrawal Days", type: "range", group: "Product" },
];

const ReferenceTreatmentsScreen: React.FC = () => {
  const { operationId } = useOperation();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const { showToast } = useChuteSideToast();
  const { filters, setFilters, clearFilters } = usePersistedFilters("chuteside_filters_treatments");
  const { presets, addPreset, deletePreset } = useFilterPresets("chuteside_presets_treatments");

  const { data: opProducts, isLoading } = useQuery({
    queryKey: ['operation-products', operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operation_products')
        .select('*, product:products(*, manufacturer:manufacturers(name))')
        .eq('operation_id', operationId);
      if (error) throw error;
      return data;
    },
  });

  const { data: allProducts } = useQuery({
    queryKey: ['all-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, manufacturer:manufacturers(name)')
        .eq('use_status', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: addOpen,
  });

  const linkedProductIds = useMemo(() => new Set((opProducts || []).map(op => op.product_id)), [opProducts]);

  const mapped = useMemo(() => (opProducts || []).map(op => ({
    id: op.id,
    productId: op.product_id,
    name: (op.product as any)?.name || 'Unknown',
    category: ((op.product as any)?.product_type?.toLowerCase() || 'other') as ProductCategory,
    defaultDosage: op.custom_dosage || (op.product as any)?.dosage || '',
    defaultRoute: (op.product as any)?.route || '',
    withdrawalDays: parseInt((op.product as any)?.slaughter_withdrawal || '0') || 0,
    manufacturer: (op.product as any)?.manufacturer?.name || '',
  })), [opProducts]);

  const filtered = applyFilters(
    mapped.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase())),
    filters
  )
    .sort((a, b) => {
      switch (sort) {
        case "name": return a.name.localeCompare(b.name);
        case "category": return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
        case "withdrawal": return b.withdrawalDays - a.withdrawalDays;
        default: return 0;
      }
    });












  const handleAddProduct = async (productId: string, productName: string) => {
    const { error } = await supabase.from('operation_products').insert({
      operation_id: operationId,
      product_id: productId,
    });
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['operation-products'] });
    showToast("success", productName + " added");
    setAddOpen(false);
    setAddSearch("");
  };

  const handleDelete = async (opProductId: string, name: string) => {
    const { error } = await supabase.from('operation_products').delete().eq('id', opProductId);
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['operation-products'] });
    showToast("success", name + " removed");
  };

  const availableProducts = useMemo(() =>
    (allProducts || []).filter(p =>
      !linkedProductIds.has(p.id) &&
      (!addSearch || p.name.toLowerCase().includes(addSearch.toLowerCase()))
    ).slice(0, 50),
  [allProducts, linkedProductIds, addSearch]);

  const isFiltering = search.length > 0 || filters.length > 0;
  const allMapped = mapped;
  const stats = {
    total: allMapped.length,
    vaccines: allMapped.filter(p => p.category === "vaccine").length,
    antibiotics: allMapped.filter(p => p.category === "antibiotic").length,
  };

  return (
    <div className="px-4 pt-1 pb-10 space-y-2">
      {/* Stats bar */}
      <div
        className="rounded-xl px-3 py-2.5 flex items-center justify-between"
        style={{ background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}
      >
        {[
          { label: "TOTAL", value: isLoading ? "—" : stats.total },
          { label: "VACCINES", value: isLoading ? "—" : stats.vaccines },
          { label: "ANTIBIOTICS", value: isLoading ? "—" : stats.antibiotics },
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
        title="Products"
        addLabel="Add Product"
        onAdd={() => setAddOpen(true)}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search products…"
        filterChips={[]}
        activeFilter=""
        onFilterChange={() => {}}
        sortOptions={[
          { value: "name", label: "Name" },
          { value: "category", label: "Category" },
          { value: "withdrawal", label: "Withdrawal" },
        ]}
        activeSort={sort}
        onSortChange={setSort}
        onExport={() => showToast("info", "Export — coming soon")}
        resultCount={filtered.length}
        isFiltering={isFiltering}
        advancedFilter={
          <AdvancedSearchPanel
            fields={TREATMENT_FILTER_FIELDS}
            filters={filters}
            onFiltersChange={setFilters}
            presets={presets}
            onAddPreset={addPreset}
            onDeletePreset={deletePreset}
            onClearAll={clearFilters}
          />
        }
      />

      {/* Add product picker */}
      {addOpen && (
        <div className="rounded-xl px-3 py-3.5 space-y-2" style={{ backgroundColor: "white", border: "2px solid #F3D12A" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0E2646" }}>Link a product to your operation</div>
          <input
            type="text"
            value={addSearch}
            onChange={e => setAddSearch(e.target.value)}
            placeholder="Search products…"
            className={INPUT_CLS}
            style={{ fontSize: 16, width: "100%" }}
          />
          <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
            {availableProducts.length === 0 ? (
              <div className="py-4 text-center" style={{ fontSize: 13, color: "rgba(26,26,26,0.4)" }}>
                {addSearch ? "No matching products" : "All products already linked"}
              </div>
            ) : availableProducts.map(p => {
              const catKey = (p.product_type?.toLowerCase() || 'other') as ProductCategory;
              const cat = PRODUCT_CATEGORY_CONFIG[catKey] || PRODUCT_CATEGORY_CONFIG.other;
              return (
                <button
                  key={p.id}
                  className="w-full flex items-center gap-2 py-2.5 px-1 border-b border-[rgba(26,26,26,0.06)] last:border-b-0 cursor-pointer hover:bg-[rgba(14,38,70,0.03)] transition-colors text-left"
                  style={{ background: "none", border: "none", borderBottom: "1px solid rgba(26,26,26,0.06)" }}
                  onClick={() => handleAddProduct(p.id, p.name)}
                >
                  <div className="flex-1 min-w-0">
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{p.name}</span>
                    {(p as any).manufacturer?.name && (
                      <span style={{ fontSize: 12, color: "rgba(26,26,26,0.45)", marginLeft: 6 }}>{(p as any).manufacturer.name}</span>
                    )}
                  </div>
                  <span className="rounded-full shrink-0" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", backgroundColor: cat.bg, color: cat.color }}>
                    {cat.label.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            className="w-full rounded-full py-2.5 border cursor-pointer active:scale-[0.97]"
            style={{ borderColor: "#D4D4D0", backgroundColor: "white", fontSize: 13, fontWeight: 600, color: "#0E2646" }}
            onClick={() => { setAddOpen(false); setAddSearch(""); }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Product list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.15)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center space-y-1.5">
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>No products found</div>
          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.30)" }}>Try a different search or filter</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {filtered.map(p => {
            const cat = PRODUCT_CATEGORY_CONFIG[p.category] || PRODUCT_CATEGORY_CONFIG.other;
            return (
              <div key={p.id} className="rounded-xl px-3.5 py-3 flex items-start gap-3" style={{ backgroundColor: "#0E2646", minHeight: 56 }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{p.name}</span>
                    <span className="rounded-full shrink-0" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", backgroundColor: cat.bg, color: cat.color }}>
                      {cat.label.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {(p.defaultDosage || p.defaultRoute) && (
                      <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(240,240,240,0.50)" }}>
                        {[p.defaultDosage, p.defaultRoute].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {p.manufacturer && (
                      <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(240,240,240,0.40)" }}>
                        {p.manufacturer}
                      </span>
                    )}
                    {p.withdrawalDays > 0 && (
                      <span className="rounded-full" style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", backgroundColor: "rgba(243,209,42,0.15)", color: "#F3D12A" }}>
                        {p.withdrawalDays}d withdrawal
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  style={{ width: 28, height: 28, borderRadius: 8, border: "none", backgroundColor: "rgba(155,35,53,0.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3H10M4.5 5V9M7.5 5V9M3 3L3.5 10.5H8.5L9 3" stroke="rgba(155,35,53,0.7)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReferenceTreatmentsScreen;
