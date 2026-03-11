import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { TAG_COLOR_HEX } from "@/lib/constants";

interface AnimalResult {
  id: string;
  tag: string;
  tag_color: string | null;
  eid: string | null;
  sex: string;
  animal_type: string;
  year_born: number | null;
  breed: string | null;
  status: string;
}

interface AnimalLookupProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (animal: AnimalResult) => void;
  onNoMatch?: (search: string) => void;
  placeholder?: string;
  inputStyle?: React.CSSProperties;
  /** Filter to specific sexes, e.g. ["Cow","Spayed Heifer"] for dam lookup */
  sexFilter?: string[];
}

/**
 * Rank search results per the build manual spec:
 * 1. Exact match on tag
 * 2. Starts-with on tag
 * 3. Contains on tag
 * 4. Exact match on EID
 * 5. Ends-with on EID
 * Within each tier, most recently updated first.
 */
function rankResults(results: AnimalResult[], search: string): AnimalResult[] {
  const s = search.toLowerCase();
  const scored = results.map((a) => {
    const tag = (a.tag || "").toLowerCase();
    const eid = (a.eid || "").toLowerCase();
    let score = 99;
    if (tag === s) score = 1;
    else if (tag.startsWith(s)) score = 2;
    else if (tag.includes(s)) score = 3;
    else if (eid === s) score = 4;
    else if (eid.endsWith(s)) score = 5;
    else if (eid.includes(s)) score = 6;
    return { ...a, _score: score };
  });
  scored.sort((a, b) => a._score - b._score);
  return scored;
}

export default function AnimalLookup({
  value,
  onChange,
  onSelect,
  onNoMatch,
  placeholder = "Type tag or EID…",
  inputStyle,
  sexFilter,
}: AnimalLookupProps) {
  const { operationId } = useOperation();
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const search = value.trim();
  const shouldSearch = search.length >= 1 && !selected;

  const { data: results } = useQuery({
    queryKey: ["animal-lookup", search, operationId, sexFilter?.join(",")],
    queryFn: async () => {
      if (!search) return [];
      let query = supabase
        .from("animals")
        .select("id, tag, tag_color, eid, sex, animal_type, year_born, breed, status")
        .eq("operation_id", operationId)
        .eq("status", "Active");

      if (sexFilter && sexFilter.length > 0) {
        query = query.in("sex", sexFilter);
      }

      // Search by tag OR eid (progressive/partial match)
      query = query.or(`tag.ilike.%${search}%,eid.ilike.%${search}%`);
      query = query.limit(10);

      const { data, error } = await query;
      if (error) throw error;
      return rankResults(data || [], search);
    },
    enabled: shouldSearch,
  });

  const ranked = results || [];
  const showDropdown = focused && shouldSearch && ranked.length > 0;
  const showNoMatch = focused && shouldSearch && search.length >= 2 && ranked.length === 0;

  // Auto-select on exact single match
  useEffect(() => {
    if (ranked.length === 1 && !selected) {
      const match = ranked[0];
      if (match.tag.toLowerCase() === search.toLowerCase() || match.eid?.toLowerCase() === search.toLowerCase()) {
        handleSelect(match);
      }
    }
  }, [ranked, search, selected]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (animal: AnimalResult) => {
    setSelected(true);
    setFocused(false);
    onChange(animal.tag);
    onSelect(animal);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelected(false);
    onChange(e.target.value);
  };

  const handleFocus = () => {
    setFocused(true);
    if (selected) setSelected(false);
  };

  const defaultInputStyle: React.CSSProperties = {
    flex: 1, minWidth: 0, height: 36, borderRadius: 8,
    border: "1px solid #D4D4D0", paddingLeft: 12, paddingRight: 12,
    fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 400,
    color: "#1A1A1A", outline: "none", backgroundColor: "#FFFFFF",
    boxSizing: "border-box" as const,
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        style={inputStyle || defaultInputStyle}
      />

      {/* Selected indicator */}
      {selected && (
        <div style={{
          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          width: 18, height: 18, borderRadius: 9999, backgroundColor: "#55BAAA",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Results dropdown */}
      {showDropdown && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, marginTop: 4,
          backgroundColor: "white", borderRadius: 12,
          border: "1px solid #D4D4D0", boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
          maxHeight: 240, overflowY: "auto",
        }}>
          {ranked.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => handleSelect(a)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "10px 12px", border: "none", backgroundColor: "transparent",
                borderBottom: "1px solid rgba(26,26,26,0.04)", cursor: "pointer",
                textAlign: "left" as const,
              }}
            >
              {/* Tag color dot */}
              <span style={{
                width: 8, height: 8, borderRadius: 9999, flexShrink: 0,
                backgroundColor: TAG_COLOR_HEX[a.tag_color || "None"] || "#999",
              }} />
              {/* Tag number */}
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", minWidth: 40 }}>
                {a.tag}
              </span>
              {/* Details */}
              <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(26,26,26,0.45)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                {[a.animal_type, a.breed, a.year_born].filter(Boolean).join(" · ")}
              </span>
              {/* Sex badge */}
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", padding: "2px 6px", borderRadius: 9999, backgroundColor: "rgba(14,38,70,0.06)", color: "rgba(14,38,70,0.50)", flexShrink: 0 }}>
                {a.sex}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No match message */}
      {showNoMatch && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, marginTop: 4,
          backgroundColor: "white", borderRadius: 12,
          border: "1px solid #D4D4D0", boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
          padding: 12, textAlign: "center" as const,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>
            No match for "{search}"
          </div>
          {onNoMatch && (
            <button
              type="button"
              onClick={() => { onNoMatch(search); setFocused(false); }}
              style={{
                marginTop: 8, padding: "6px 16px", borderRadius: 9999, border: "none",
                backgroundColor: "rgba(85,186,170,0.12)", fontSize: 12, fontWeight: 700,
                color: "#55BAAA", cursor: "pointer",
              }}
            >
              + Quick-Add Dam
            </button>
          )}
        </div>
      )}
    </div>
  );
}
