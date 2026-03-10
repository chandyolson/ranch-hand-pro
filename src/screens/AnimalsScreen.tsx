import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DataCard from "@/components/DataCard";
import FlagIcon from "@/components/FlagIcon";
import ListScreenToolbar from "@/components/ListScreenToolbar";
import { useChuteSideToast } from "@/components/ToastContext";
import type { FlagColor } from "@/lib/constants";

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

const parseWeight = (w: string) => parseInt(w.replace(/[^0-9]/g, "")) || 0;

const AnimalsScreen: React.FC = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sort, setSort] = useState("tag-asc");
  const navigate = useNavigate();
  const { showToast } = useChuteSideToast();

  const filtered = animals
    .filter(a => statusFilter === "All" || a.status === statusFilter)
    .filter(a =>
      !search ||
      a.tag.toLowerCase().includes(search.toLowerCase()) ||
      a.breed.toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      switch (sort) {
        case "tag-asc": return a.tag.localeCompare(b.tag);
        case "tag-desc": return b.tag.localeCompare(a.tag);
        case "breed": return a.breed.localeCompare(b.breed);
        case "weight": return parseWeight(b.weight) - parseWeight(a.weight);
        case "location": return a.location.localeCompare(b.location);
        default: return 0;
      }
    });

  const isFiltering = search.length > 0 || statusFilter !== "All";

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      <ListScreenToolbar
        title="Animals"
        addLabel="New Animal"
        onAdd={() => navigate("/animals/new")}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tags, breeds, locations…"
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
          { value: "weight", label: "Weight" },
          { value: "location", label: "Location" },
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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

      {filtered.length === 0 && (
        <div className="py-12 text-center space-y-1.5">
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>No animals found</div>
          <div style={{ fontSize: 13, color: "rgba(26,26,26,0.30)" }}>Try a different search or filter</div>
        </div>
      )}
    </div>
  );
};

export default AnimalsScreen;
