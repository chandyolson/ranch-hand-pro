import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CowWorkProjectCard from "../components/CowWorkProjectCard";

interface Project {
  id: string;
  name: string;
  date: string;
  status: "pending" | "in-progress" | "completed";
  type: string;
  group: string;
  headCount: number;
  workedCount: number;
}

const allProjects: Project[] = [
  { id: "spring-preg-2026", name: "Spring Preg Check 2026", date: "Feb 24, 2026", status: "in-progress", type: "PREG", group: "Spring Calvers", headCount: 45, workedCount: 28 },
  { id: "winter-vax-2026", name: "Winter Vaccination 2026", date: "Jan 14, 2026", status: "completed", type: "TX", group: "Cow Herd", headCount: 62, workedCount: 62 },
  { id: "fall-processing-2025", name: "Fall Processing 2025", date: "Oct 15, 2025", status: "completed", type: "GEN", group: "Yearlings", headCount: 38, workedCount: 38 },
  { id: "bse-bulls-2025", name: "BSE — Working Bulls 2025", date: "Apr 3, 2025", status: "completed", type: "BSE", group: "Bulls", headCount: 12, workedCount: 12 },
  { id: "weaning-2025", name: "Spring Weaning 2025", date: "Sep 22, 2025", status: "completed", type: "WN", group: "Spring Calves", headCount: 41, workedCount: 41 },
  { id: "new-project-pending", name: "Summer AI Program", date: "Mar 15, 2026", status: "pending", type: "AI", group: "Replacement Heifers", headCount: 24, workedCount: 0 },
];

const filterOptions: { value: "all" | "pending" | "in-progress" | "completed"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export default function CowWorkScreen() {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in-progress" | "completed">("all");
  const navigate = useNavigate();

  const filtered = statusFilter === "all" ? allProjects : allProjects.filter(p => p.status === statusFilter);
  const inProgressCount = allProjects.filter(p => p.status === "in-progress").length;
  const activeHead = allProjects.filter(p => p.status === "pending" || p.status === "in-progress").reduce((s, p) => s + p.headCount, 0);

  return (
    <div className="px-4 pt-4 pb-10 space-y-3 font-['Inter']">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 22, fontWeight: 800, color: "#0E2646", letterSpacing: "-0.02em" }}>Cow Work</div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-full w-9 h-9 flex items-center justify-center border border-[#D4D4D0] bg-white cursor-pointer active:scale-[0.97]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16">
              <rect x="2" y="3" width="12" height="2" rx="1" fill="#0E2646" />
              <rect x="2" y="7" width="8" height="2" rx="1" fill="#0E2646" />
              <rect x="2" y="11" width="10" height="2" rx="1" fill="#0E2646" />
            </svg>
          </button>
          <button
            className="rounded-full h-9 px-4 bg-[#F3D12A] flex items-center gap-1.5 cursor-pointer active:scale-[0.97]"
            style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", border: "none" }}
            onClick={() => navigate("/cow-work/new")}
          >
            + New
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {filterOptions.map(f => {
          const active = statusFilter === f.value;
          return (
            <button
              key={f.value}
              className="rounded-full px-3.5 py-1.5 font-['Inter'] cursor-pointer border transition-all duration-150 active:scale-[0.96]"
              style={{
                backgroundColor: active ? "#0E2646" : "white",
                borderColor: active ? "#0E2646" : "rgba(212,212,208,0.80)",
                color: active ? "white" : "rgba(26,26,26,0.50)",
                fontSize: 12,
                fontWeight: active ? 700 : 500,
              }}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Stats summary */}
      <div className="flex gap-3">
        {[
          { value: inProgressCount, label: "IN PROGRESS" },
          { value: activeHead, label: "HEAD ACTIVE" },
        ].map(s => (
          <div
            key={s.label}
            className="flex-1 rounded-xl px-4 py-3 font-['Inter']"
            style={{ background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}
          >
            <div style={{ fontSize: 28, fontWeight: 800, color: "white", lineHeight: 1, letterSpacing: "-0.02em" }}>{s.value}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(168,230,218,0.70)", textTransform: "uppercase", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Project list */}
      <div className="space-y-2.5">
        {filtered.length > 0 ? (
          filtered.map(p => (
            <CowWorkProjectCard
              key={p.id}
              {...p}
              onClick={() => navigate("/cow-work/" + p.id)}
            />
          ))
        ) : (
          <div className="text-center py-12 font-['Inter']">
            <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>No projects</div>
            <div style={{ fontSize: 13, fontWeight: 400, color: "rgba(26,26,26,0.30)", marginTop: 4 }}>Try a different filter</div>
          </div>
        )}
      </div>
    </div>
  );
}
