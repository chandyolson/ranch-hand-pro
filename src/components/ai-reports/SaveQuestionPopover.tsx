import React, { useState } from "react";

export interface SavedQuestion {
  id: string;
  label: string;
  prompt: string;
  created_at: string;
}

const STORAGE_KEY = "ai_saved_questions";

export function getSavedQuestions(): SavedQuestion[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addSavedQuestion(q: SavedQuestion): boolean {
  const current = getSavedQuestions();
  if (current.length >= 10) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, q]));
  return true;
}

export function removeSavedQuestion(id: string) {
  const current = getSavedQuestions().filter((q) => q.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

interface Props {
  prompt: string;
  onClose: () => void;
  onSaved: () => void;
  onMaxReached: () => void;
}

const SaveQuestionPopover: React.FC<Props> = ({ prompt, onClose, onSaved, onMaxReached }) => {
  const [label, setLabel] = useState(prompt.slice(0, 60));

  const handleSave = () => {
    const q: SavedQuestion = {
      id: crypto.randomUUID(),
      label: label.trim() || prompt.slice(0, 60),
      prompt,
      created_at: new Date().toISOString(),
    };
    const ok = addSavedQuestion(q);
    if (!ok) {
      onMaxReached();
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: -4,
        right: 0,
        transform: "translateY(-100%)",
        background: "#fff",
        border: "1px solid #D4D4D0",
        borderRadius: 10,
        padding: 12,
        width: 260,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        zIndex: 50,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: "#0E2646", marginBottom: 8 }}>
        Save this question
      </div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        maxLength={60}
        style={{
          width: "100%",
          height: 34,
          borderRadius: 6,
          border: "1px solid #D4D4D0",
          padding: "0 8px",
          fontSize: 13,
          color: "#0E2646",
          marginBottom: 8,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={handleSave}
          style={{
            borderRadius: 20,
            background: "#55BAAA",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            padding: "5px 16px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Save
        </button>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#888",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default SaveQuestionPopover;
