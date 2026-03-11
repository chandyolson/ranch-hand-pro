import { useState, useEffect, useCallback } from "react";
import type { ActiveFilter, FilterPreset } from "@/lib/filter-types";

/**
 * Hook that persists active filters to localStorage.
 * Restores on mount, saves on change.
 */
export function usePersistedFilters(storageKey: string) {
  const [filters, setFilters] = useState<ActiveFilter[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      if (filters.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(filters));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // localStorage unavailable
    }
  }, [filters, storageKey]);

  const clearFilters = useCallback(() => {
    setFilters([]);
    try { localStorage.removeItem(storageKey); } catch {}
  }, [storageKey]);

  return { filters, setFilters, clearFilters };
}

/**
 * Hook that persists saved filter presets to localStorage.
 */
export function useFilterPresets(presetStorageKey: string) {
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    try {
      const saved = localStorage.getItem(presetStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      if (presets.length > 0) {
        localStorage.setItem(presetStorageKey, JSON.stringify(presets));
      } else {
        localStorage.removeItem(presetStorageKey);
      }
    } catch {}
  }, [presets, presetStorageKey]);

  const addPreset = useCallback((name: string, filters: ActiveFilter[]) => {
    const newPreset: FilterPreset = {
      id: crypto.randomUUID?.() || String(Date.now()),
      name,
      filters: [...filters],
      createdAt: new Date().toISOString(),
    };
    setPresets((prev) => [...prev, newPreset]);
    return newPreset;
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { presets, addPreset, deletePreset };
}
