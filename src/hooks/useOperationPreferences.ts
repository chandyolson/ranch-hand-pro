import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";

export interface OperationPreferences {
  id: string;
  operation_id: string;
  use_year_tag_system: boolean;
  calf_tag_system: "same_as_dam" | "year_prefix_seq" | "year_letter_seq" | "manual";
  calf_tag_pattern: string | null;
  calf_tag_next_seq: number;
  calf_tag_seq_year: number | null;
  calf_tag_default_color: string | null;
  calf_tag_seq_padding: number;
  year_letter_map: Record<string, string>;
  lifetime_id_prefix: string | null;
  lifetime_id_pattern: string | null;
  lifetime_id_next_seq: number;
  preferred_preg_stages: string[] | null;
  preferred_breeds: string[] | null;
  preferred_diseases: string[] | null;
}

const DEFAULT_PREFS: Omit<OperationPreferences, "id" | "operation_id"> = {
  use_year_tag_system: false,
  calf_tag_system: "manual",
  calf_tag_pattern: null,
  calf_tag_next_seq: 1,
  calf_tag_seq_year: null,
  calf_tag_default_color: null,
  calf_tag_seq_padding: 0,
  year_letter_map: {
    "2019": "H", "2020": "J", "2021": "K", "2022": "L", "2023": "M",
    "2024": "N", "2025": "P", "2026": "R", "2027": "S", "2028": "T",
    "2029": "U", "2030": "W", "2031": "X", "2032": "Y", "2033": "Z",
    "2034": "A", "2035": "B", "2036": "C", "2037": "D", "2038": "E",
  },
  lifetime_id_prefix: null,
  lifetime_id_pattern: null,
  lifetime_id_next_seq: 1,
  preferred_preg_stages: null,
  preferred_breeds: null,
  preferred_diseases: null,
};

export function useOperationPreferences() {
  const { operationId } = useOperation();

  return useQuery({
    queryKey: ["operation-preferences", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operation_preferences")
        .select("*")
        .eq("operation_id", operationId)
        .maybeSingle();

      if (error) {
        console.warn("operation_preferences query failed:", error.message);
        return null;
      }
      return data as OperationPreferences | null;
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes — preferences rarely change
  });
}

/**
 * Generate the next calf tag based on the operation's tagging system.
 * Returns null if the system is 'manual' or preferences are not set.
 * The user can always override the generated value.
 */
export function generateCalfTag(
  prefs: OperationPreferences | null,
  damTag: string,
  calvingYear: number
): string | null {
  if (!prefs) return null;

  switch (prefs.calf_tag_system) {
    case "same_as_dam":
      return damTag;

    case "year_prefix_seq": {
      // Last digit of year + padded sequence
      // e.g., 2025 → "5", seq 1 → "5001" (with padding 3)
      //        2026 → "6", seq 42 → "6042" (with padding 3)
      const yearDigit = String(calvingYear).slice(-1);
      const seq = getSeqForYear(prefs, calvingYear);
      const padWidth = Math.max(prefs.calf_tag_seq_padding, 0);
      const paddedSeq = padWidth > 0 ? String(seq).padStart(padWidth, "0") : String(seq);
      return `${yearDigit}${paddedSeq}`;
    }

    case "year_letter_seq": {
      // Uses the pattern with year letter substitution
      // e.g., pattern='{seq}{yearletter}' → '105M' for 2026
      // e.g., pattern='{yearletter}{seq}' → 'M105' for 2026
      const yearStr = String(calvingYear);
      const yearLetter = (prefs.year_letter_map || {})[yearStr] || "?";
      const seq = getSeqForYear(prefs, calvingYear);
      const padWidth = Math.max(prefs.calf_tag_seq_padding, 0);
      const paddedSeq = padWidth > 0 ? String(seq).padStart(padWidth, "0") : String(seq);

      const pattern = prefs.calf_tag_pattern || "{seq}{yearletter}";
      return pattern
        .replace("{seq}", paddedSeq)
        .replace("{yearletter}", yearLetter)
        .replace("{year2}", yearStr.slice(-2))
        .replace("{year4}", yearStr)
        .replace("{damtag}", damTag);
    }

    case "manual":
    default:
      return null;
  }
}

/**
 * Get the sequence number for a given year.
 * If the year has changed since last use, the sequence resets to 1.
 */
function getSeqForYear(prefs: OperationPreferences, year: number): number {
  if (prefs.calf_tag_seq_year === year) {
    return prefs.calf_tag_next_seq;
  }
  // Year changed — sequence resets
  return 1;
}

/**
 * Increment the sequence in Supabase after a calf is saved.
 * Call this after successful calving record save.
 */
export async function incrementCalfTagSeq(
  operationId: string,
  calvingYear: number,
  currentPrefs: OperationPreferences
) {
  const isNewYear = currentPrefs.calf_tag_seq_year !== calvingYear;
  const nextSeq = isNewYear ? 2 : currentPrefs.calf_tag_next_seq + 1;

  await supabase
    .from("operation_preferences")
    .update({
      calf_tag_next_seq: nextSeq,
      calf_tag_seq_year: calvingYear,
    })
    .eq("operation_id", operationId);
}
