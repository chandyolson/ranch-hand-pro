import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DataCard from "@/components/DataCard";
import FlagIcon from "@/components/FlagIcon";
import PillButton from "@/components/PillButton";

type FlagColor = "teal" | "gold" | "red";

interface Animal {
  id: string;
  tag: string;
  breed: string;
  weight: string;
  location: string;
  sex: string;
  status: string;
  flag: FlagColor;
  subtitle?: string[];
}

const animals: Animal[] = [
  { id: "4782", tag: "4782", breed: "Black Angus", weight: "1,247 lbs", location: "Pen 2A", sex: "Cow", status: "Active", flag: "teal" },
  { id: "3091", tag: "3091", breed: "Hereford", weight: "983 lbs", location: "Pen 4B", sex: "Cow", status: "Active", flag: "gold", subtitle: ["Treatment follow-up", "Thursday"] },
  { id: "5520", tag: "5520", breed: "Charolais", weight: "1,102 lbs", location: "Pen 1C", sex: "Cow", status: "Active", flag: "red", subtitle: ["Penicillin 10cc due", "Overdue 2 days"] },
  { id: "2218", tag: "2218", breed: "Simmental", weight: "1,340 lbs", location: "Pen 3A", sex: "Cow", status: "Active", flag: "teal" },
  { id: "7801", tag: "7801", breed: "Brahman Cross", weight: "1,410 lbs", location: "Pen 1A", sex: "Bull", status: "Active", flag: "gold", subtitle: ["Calving expected", "Mar 8"] },
  { id: "3309", tag: "3309", breed: "Angus", weight: "1,187 lbs", location: "Pen 2A", sex: "Cow", status: "Active", flag: "teal" },
  { id: "6100", tag: "6100", breed: "Red Angus", weight: "1,055 lbs", location: "East Pasture", sex: "Heifer", status: "Active", flag: "teal" },
  { id: "8841", tag: "8841", breed: "Angus", weight: "520 lbs", location: "Pen 5A", sex: "Bull", status: "Active", flag: "teal", subtitle: ["Calf — born Mar 22"] },
  { id: "4401", tag: "4401", breed: "Hereford", weight: "1,290 lbs", location: "North Place", sex: "Cow", status: "Sold", flag: "teal" },
  { id: "2905", tag: "2905", breed: "Simmental", weight: "1,180 lbs", location: "Feedlot", sex: "Steer", status: "Active", flag: "gold" },
];

const statusFilters = ["All", "Active", "Sold", "Culled", "Dead"];
const flagFilters: { label: string; value: string; color?: FlagColor }[] = [
  { label: "All Flags", value: "all" },
  { label: "Management", value: "teal", color: "teal" },
  { label: "Production", value: "gold", color: "gold" },
  { label: "Cull", value: "red", color: "red" },
];

const AnimalsScreen: React.FC = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [flagFilter, setFlagFilter] = useState("all");
  const navigate = useNavigate();

  const filtered = animals
    .filter(a => statusFilter === "All" || a.status === statusFilter)
    .filter(a => flagFilter === "all" || a.flag === flagFilter)
    .filter(a =>
      !search ||
      a.tag.toLowerCase().includes(search.toLowerCase()) ||
      a.breed.toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 22, fontWeight: 800, color: "#0E2646", letterSpacing: "-0.02em", fontFamily: "'Inter', sans-serif" }}>
          Animals
        </span>
        <button
          className="rounded-full h-9 px-4 flex items-center gap-1.5 cursor-pointer active:scale-[0.97]"
          style={{ backgroundColor: "#F3D12A", border: "none", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}
          onClick={() => navigate("/animals/new")}
        >
          <span style={{ fontSize: 16, fontWeight: 600 }}>+</span> New Animal
        </button>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 bg-white rounded-xl px-3 h-11"
        style={{ border: "1px solid rgba(212,212,208,0.60)" }}
      >
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="shrink-0">
          <circle cx="8" cy="8" r="5.5" stroke="rgba(26,26,26,0.30)" strokeWidth="1.5" />
          <path d="M12.5 12.5L16 16" stroke="rgba(26,26,26,0.30)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tags, breeds, locations…"
          className="flex-1 outline-none bg-transparent"
          style={{ fontSize: 16, fontFamily: "'Inter', sans-serif", color: "#1A1A1A" }}
        />
        {search.length > 0 && (
          <button
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
            style={{ backgroundColor: "rgba(26,26,26,0.08)", border: "none", fontSize: 12, color: "rgba(26,26,26,0.50)" }}
            onClick={() => setSearch("")}
          >×</button>
        )}
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        {statusFilters.map(s => (
          <button
            key={s}
            className="rounded-full px-3 py-1.5 cursor-pointer border transition-all active:scale-[0.96]"
            style={{
              backgroundColor: statusFilter === s ? "#0E2646" : "white",
              borderColor: statusFilter === s ? "#0E2646" : "rgba(212,212,208,0.80)",
              color: statusFilter === s ? "white" : "rgba(26,26,26,0.50)",
              fontSize: 12,
              fontWeight: statusFilter === s ? 700 : 500,
              fontFamily: "'Inter', sans-serif",
            }}
            onClick={() => setStatusFilter(s)}
          >{s}</button>
        ))}
      </div>

      {/* Flag filter chips */}
      <div className="flex gap-2 flex-wrap">
        {flagFilters.map(f => (
          <button
            key={f.value}
            className="rounded-full px-3 py-1.5 cursor-pointer border transition-all active:scale-[0.96] flex items-center gap-1.5"
            style={{
              backgroundColor: flagFilter === f.value ? "#0E2646" : "white",
              borderColor: flagFilter === f.value ? "#0E2646" : "rgba(212,212,208,0.80)",
              color: flagFilter === f.value ? "white" : "rgba(26,26,26,0.50)",
              fontSize: 12,
              fontWeight: flagFilter === f.value ? 700 : 500,
              fontFamily: "'Inter', sans-serif",
            }}
            onClick={() => setFlagFilter(f.value)}
          >
            {f.color && <FlagIcon color={f.color} size="sm" />}
            {f.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      {(search || statusFilter !== "All" || flagFilter !== "all") && (
        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(26,26,26,0.40)", fontFamily: "'Inter', sans-serif" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* Animal list */}
      <div className="space-y-2">
        {filtered.map(animal => (
          <div
            key={animal.id}
            className="cursor-pointer active:scale-[0.99] transition-transform duration-100"
            onClick={() => navigate("/animals/" + animal.tag)}
          >
            <DataCard
              title={`Tag ${animal.tag}`}
              values={[animal.breed, animal.weight, animal.location]}
              subtitle={animal.subtitle}
              trailing={<FlagIcon color={animal.flag} size="sm" />}
            />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="py-12 text-center space-y-1.5" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>No animals found</div>
          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.30)" }}>Try a different search or filter</div>
        </div>
      )}
    </div>
  );
};

export default AnimalsScreen;
