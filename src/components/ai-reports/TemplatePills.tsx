import React, { useState, useEffect, useRef, useCallback } from "react";
import { Camera } from "lucide-react";
import { getSavedQuestions, removeSavedQuestion, SavedQuestion } from "./SaveQuestionPopover";

const CURRENT_YEAR = new Date().getFullYear();

const TEMPLATES = [
  {
    label: "Preg Check Summary",
    prompt:
      `Generate a pregnancy check summary for the most recent preg check project in ${CURRENT_YEAR}. Include total head count, count and percentage for each preg stage (Bull Bred, AI, Open, Embryo), and list all Open animals with tag, tag color, and year born.`,
  },
  {
    label: "Calving Report",
    prompt:
      `Generate a calving season report for ${CURRENT_YEAR}. Include total calves born, live vs dead count with death rate percentage, average birth weight, average birth weight by sire, and calving ease breakdown by assistance score. Only include calving records from ${CURRENT_YEAR}.`,
  },
  {
    label: "Herd Inventory",
    prompt:
      "Generate a herd inventory showing current active head count broken down by animal type, sex, breed, and status.",
  },
  {
    label: "Cull List",
    prompt:
      "Generate a cull list showing all animals with active cull flags. Include tag, tag color, breed, year born, flag name, flag note, and when the flag was created.",
  },
  {
    label: "Herd Scan",
    prompt:
      `Run a comprehensive herd health scan for ${CURRENT_YEAR}. Analyze reproductive health (open rates from most recent preg check in ${CURRENT_YEAR}), calving performance (${CURRENT_YEAR} vs ${CURRENT_YEAR - 1}), sire evaluation (birth weights and calving ease by sire for ${CURRENT_YEAR} calves), treatment patterns (last 12 months), herd age profile, and active flags. Only report findings that are actionable — skip areas with no concerns.`,
  },
  {
    label: "Notes Analysis",
    prompt:
      `Analyze all notes across the operation for patterns and recurring themes from ${CURRENT_YEAR}. Scan these sources:\n\n1. animals.quick_notes arrays — look for frequently occurring notes across many animals\n2. animals.memo fields — look for keywords indicating health concerns, behavior issues, or management notes\n3. calving_records.memo fields — look for recurring calving problems from ${CURRENT_YEAR} calving records\n4. calving_records.quick_notes arrays — look for patterns like 'Twin', 'Grafted', 'C-Section'\n5. cow_work.memo fields — look for notes recorded during chuteside work in ${CURRENT_YEAR}\n6. cow_work.quick_notes arrays — look for frequently used quick notes\n7. red_book_notes.body — look for action items, recurring concerns, or seasonal patterns\n\nFor each source, report:\n- The most common note values or keywords (top 10)\n- Any animal tags that appear in notes repeatedly (could indicate chronic issues)\n- Any keywords suggesting health problems: 'lame', 'limp', 'swollen', 'abscess', 'thin', 'poor', 'bad', 'weak', 'sick', 'sore'\n- Red Book entries with has_action = true that haven't been completed\n\nPresent findings as a summary with the most actionable items first. Include a table of animals mentioned in notes more than twice. Suggest follow-ups for any concerning patterns.`,
  },
  {
    label: "Cull Candidates",
    prompt:
      `Analyze the herd and recommend cull candidates based on ${CURRENT_YEAR} data. Check each of these criteria and list any animals that match. Only include active animals.\n\nCRITERIA:\n\n1. REPEAT OPEN: Cows that were preg-checked Open in 2 or more different years. Query cow_work.preg_stage = 'Open' grouped by animal across multiple PREG projects. List the years they were open.\n\n2. OLD + LOW PERFORMANCE: Cows 10+ years old (year_born <= ${CURRENT_YEAR} - 10) that also have any negative indicator: open in most recent preg check, lost a calf in the last 2 years, or have an active production flag.\n\n3. CHRONIC HEALTH: Animals treated 3+ times in the last 12 months. Show diseases and treatment count.\n\n4. POOR CALVING HISTORY: Cows whose calves needed assistance (calving_records.assistance >= 3) more than 50% of the time across all calving records.\n\n5. FAILED BSE BULLS: Bulls with pass_fail = 'Fail' or 'Permanent Fail' on their most recent BSE.\n\n6. STALE CULL FLAGS: Animals already flagged for cull (flag_tier = 'cull', resolved_at IS NULL) for more than 3 months that are still Active.\n\nFORMAT:\n\n- Summary: 'Found X cull candidates across Y criteria'\n- Table with columns: Tag, Tag Color, Year Born, Breed, Criteria, Details\n- Sort by most criteria matched (animals matching 2+ criteria listed first)\n- Suggest: 'Want me to flag all of these as cull candidates?'\n- Follow-ups: 'Show me the treatment history on these', 'Which of these have calves on them right now?', 'How much are cull cows worth right now?'`,
  },
];

interface Props {
  onSelect: (prompt: string) => void;
  disabled: boolean;
  onScanPhoto?: () => void;
}

const TemplatePills: React.FC<Props> = ({ onSelect, disabled, onScanPhoto }) => {
  const [saved, setSaved] = useState<SavedQuestion[]>(getSavedQuestions());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = useCallback(() => setSaved(getSavedQuestions()), []);

  useEffect(() => {
    window.addEventListener("saved-questions-updated", refresh);
    return () => window.removeEventListener("saved-questions-updated", refresh);
  }, [refresh]);

  const handleDelete = (id: string) => {
    removeSavedQuestion(id);
    setDeleteId(null);
    refresh();
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        msOverflowStyle: "none",
        scrollbarWidth: "none",
      }}
    >
      {onScanPhoto && (
        <button
          disabled={disabled}
          onClick={onScanPhoto}
          style={{
            borderRadius: 20,
            border: "1.5px solid #0E2646",
            background: "#fff",
            color: "#0E2646",
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
            padding: "6px 14px",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Camera size={14} />
          Scan Photo
        </button>
      )}
      {TEMPLATES.map((t) => (
        <button
          key={t.label}
          disabled={disabled}
          onClick={() => onSelect(t.prompt)}
          style={{
            borderRadius: 20,
            border: "1.5px solid #0E2646",
            background: "#fff",
            color: "#0E2646",
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
            padding: "6px 14px",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          {t.label}
        </button>
      ))}

      {saved.map((sq) => (
        <div key={sq.id} style={{ position: "relative", flexShrink: 0 }}>
          <button
            disabled={disabled}
            onClick={() => {
              if (deleteId === sq.id) return;
              onSelect(sq.prompt);
            }}
            onPointerDown={() => {
              longPressTimer.current = setTimeout(() => setDeleteId(sq.id), 500);
            }}
            onPointerUp={() => {
              if (longPressTimer.current) clearTimeout(longPressTimer.current);
            }}
            onPointerLeave={() => {
              if (longPressTimer.current) clearTimeout(longPressTimer.current);
            }}
            style={{
              borderRadius: 20,
              border: "1.5px solid #0E2646",
              background: "#fff",
              color: "#0E2646",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              padding: "6px 14px",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "#55BAAA",
                flexShrink: 0,
              }}
            />
            {sq.label}
          </button>

          {deleteId === sq.id && (
            <>
              <div
                onClick={() => setDeleteId(null)}
                style={{ position: "fixed", inset: 0, zIndex: 40 }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 4px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#fff",
                  border: "1px solid #D4D4D0",
                  borderRadius: 8,
                  padding: "6px 0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  zIndex: 50,
                  whiteSpace: "nowrap",
                }}
              >
                <button
                  onClick={() => handleDelete(sq.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#E74C3C",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "4px 16px",
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "left",
                  }}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default TemplatePills;
