import React from "react";
import { useNavigate } from "react-router-dom";

const sections = [
  { id: "groups", title: "Groups", description: "Animal groupings — Spring Calvers, Fall Bulls, etc.", count: 6, icon: "group", route: "/reference/groups" },
  { id: "locations", title: "Locations", description: "Pastures, corrals, and fields", count: 8, icon: "location", route: "/reference/locations" },
  { id: "quick-notes", title: "Quick Notes", description: "Reusable note phrases for entry screens", count: 14, icon: "note", route: "/reference/quick-notes" },
  { id: "preg-stages", title: "Preg Stages", description: "Pregnancy stage labels for PREG projects", count: 5, icon: "stages", route: "/reference/preg-stages" },
  { id: "treatments", title: "Products", description: "Vaccine and treatment product library", count: 12, icon: "syringe", route: "/reference/treatments" },
  { id: "breeds", title: "Breeds", description: "Global breed list with operation favorites", count: null, icon: "tag", route: "/reference/breeds" },
  { id: "team", title: "Team", description: "Members, roles, and invitations", count: 4, icon: "team", route: "/reference/team" },
  { id: "settings", title: "Operation Settings", description: "Name, address, tag system, Lifetime ID", count: null, icon: "settings", route: "/reference/settings" },
  { id: "templates", title: "Work Templates", description: "Saved project configurations for reuse", count: 3, icon: "template", route: "/reference/templates" },
];

const icons: Record<string, React.ReactNode> = {
  group: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="6" cy="8" r="3" stroke="#0E2646" strokeWidth="1.5"/><circle cx="14" cy="8" r="3" stroke="#0E2646" strokeWidth="1.5"/><path d="M1 17c0-2.8 2.2-5 5-5h8c2.8 0 5 2.2 5 5" stroke="#0E2646" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  location: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2a6 6 0 016 6c0 4-6 10-6 10S4 12 4 8a6 6 0 016-6z" stroke="#0E2646" strokeWidth="1.5"/><circle cx="10" cy="8" r="2" stroke="#0E2646" strokeWidth="1.5"/></svg>,
  note: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="4" y="4" width="12" height="10" rx="2" stroke="#0E2646" strokeWidth="1.5"/><path d="M7 8h6M7 11h4" stroke="#0E2646" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  stages: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 5h12M4 10h8M4 15h10" stroke="#0E2646" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  syringe: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 3l4 4-9 9-2 1 1-2 6-6" stroke="#0E2646" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 6l4 4" stroke="#0E2646" strokeWidth="1.5" strokeLinecap="round"/><path d="M4 16l2-2" stroke="#0E2646" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  tag: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 3h6l8 8-6 6-8-8V3z" stroke="#0E2646" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="7" cy="7" r="1" fill="#0E2646"/></svg>,
  team: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="8" cy="7" r="3" stroke="#0E2646" strokeWidth="1.5"/><path d="M2 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#0E2646" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 5a3 3 0 010 6" stroke="#0E2646" strokeWidth="1.5" strokeLinecap="round"/><path d="M17 17a5 5 0 00-3-4.6" stroke="#0E2646" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  settings: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3" stroke="#0E2646" strokeWidth="1.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M4.9 15.1l1.4-1.4M13.7 6.3l1.4-1.4" stroke="#0E2646" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  template: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" stroke="#0E2646" strokeWidth="1.5"/><path d="M3 8h14" stroke="#0E2646" strokeWidth="1.5"/><path d="M8 8v9" stroke="#0E2646" strokeWidth="1.5"/></svg>,
};

const ReferenceScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      <span style={{ fontSize: 22, fontWeight: 800, color: "#0E2646", letterSpacing: "-0.02em" }}>Reference</span>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {sections.map(s => (
          <div
            key={s.id}
            className="rounded-xl px-3 py-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all"
            style={{ backgroundColor: "white", border: "1px solid rgba(212,212,208,0.60)" }}
            onClick={() => navigate(s.route)}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(14,38,70,0.06)" }}>
              {icons[s.icon]}
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>{s.title}</div>
              <div className="truncate" style={{ fontSize: 12, fontWeight: 400, color: "rgba(26,26,26,0.45)", marginTop: 2 }}>{s.description}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {s.count !== null && (
                <div className="rounded-full w-6 h-6 flex items-center justify-center" style={{ backgroundColor: "rgba(14,38,70,0.08)", fontSize: 11, fontWeight: 700, color: "#0E2646" }}>
                  {s.count}
                </div>
              )}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReferenceScreen;
