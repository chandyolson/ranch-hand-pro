/**
 * CustomerDetailScreen — /customers/:id
 * Single vet practice client view. Shows operation details, head count,
 * recent projects, and quick actions (new project, view animals).
 * The :id param is the operation_id of the client operation.
 */
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Plus, ClipboardList, Users } from "lucide-react";

const C = {
  navy: "#0E2646", cream: "#F5F5F0", teal: "#55BAAA",
  gold: "#F3D12A", text: "#1A1A1A", border: "#D4D4D0",
  tealLight: "#A8E6DA",
};

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function SectionHeading({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span style={{ fontSize: 13, fontWeight: 700, color: C.navy, letterSpacing: "0.01em" }}>{text}</span>
      <div className="flex-1 h-px" style={{ backgroundColor: "rgba(212,212,208,0.50)" }} />
    </div>
  );
}

const CustomerDetailScreen: React.FC = () => {
  const { id: clientOpId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── Operation details ──
  const { data: operation, isLoading } = useQuery({
    queryKey: ["customer-detail", clientOpId],
    queryFn: async () => {
      const { data } = await supabase
        .from("operations")
        .select("id, name, owner_name, email, phone, address, operation_type")
        .eq("id", clientOpId!)
        .single();
      return data;
    },
    enabled: !!clientOpId,
  });

  // ── Head count ──
  const { data: headCount } = useQuery({
    queryKey: ["customer-head-count", clientOpId],
    queryFn: async () => {
      const { count } = await supabase
        .from("animals")
        .select("*", { count: "exact", head: true })
        .eq("operation_id", clientOpId!)
        .eq("status", "Active");
      return count || 0;
    },
    enabled: !!clientOpId,
  });

  // ── Animal type breakdown ──
  const { data: typeBreakdown } = useQuery({
    queryKey: ["customer-type-breakdown", clientOpId],
    queryFn: async () => {
      const { data } = await supabase
        .from("animals")
        .select("type")
        .eq("operation_id", clientOpId!)
        .eq("status", "Active");
      const counts: Record<string, number> = {};
      (data || []).forEach((a: any) => {
        const t = a.type || "Unknown";
        counts[t] = (counts[t] || 0) + 1;
      });
      return counts;
    },
    enabled: !!clientOpId,
  });

  // ── Projects (most recent 10) ──
  const { data: projects } = useQuery({
    queryKey: ["customer-projects", clientOpId],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, date, project_status, head_count, work_types:project_work_types(work_type:work_types(code, name))")
        .eq("operation_id", clientOpId!)
        .order("date", { ascending: false })
        .limit(10);
      return (data || []).map((p: any) => ({
        ...p,
        workTypeCode: p.work_types?.[0]?.work_type?.code || "",
        workTypeName: p.work_types?.[0]?.work_type?.name || "",
      }));
    },
    enabled: !!clientOpId,
  });

  // ── Assigned protocols ──
  const { data: protocols } = useQuery({
    queryKey: ["customer-protocols", clientOpId],
    queryFn: async () => {
      const { data } = await supabase
        .from("assigned_protocols")
        .select("id, animal_class, protocol_status, protocol_year, template:vaccination_protocol_templates(name)")
        .eq("client_operation_id", clientOpId!)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!clientOpId,
  });

  const name = operation?.name || "Customer";
  const addr = operation?.address as any;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="px-4 space-y-4">
        <div className="h-8 w-48 rounded-lg animate-pulse" style={{ backgroundColor: "rgba(14,38,70,0.08)" }} />
        <div className="h-[120px] rounded-xl animate-pulse" style={{ backgroundColor: "rgba(14,38,70,0.06)" }} />
        <div className="h-[200px] rounded-xl animate-pulse" style={{ backgroundColor: "rgba(14,38,70,0.06)" }} />
      </div>
    );
  }

  return (
    <div className="px-4 space-y-5">
      {/* Back + name */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/customers")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
        >
          <ChevronLeft size={20} style={{ color: C.teal }} />
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy }}>{name}</h2>
      </div>

      {/* Overview card */}
      <div className="rounded-xl" style={{ backgroundColor: C.navy, padding: "16px 18px" }}>
        <div className="flex items-center gap-4">
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-xl"
            style={{
              width: 52,
              height: 52,
              background: "linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))",
              fontSize: 18,
              fontWeight: 600,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            {getInitials(name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate" style={{ fontSize: 16, fontWeight: 700, color: "#F0F0F0" }}>{name}</div>
            {operation?.owner_name && (
              <div style={{ fontSize: 12, color: "rgba(240,240,240,0.5)", marginTop: 2 }}>{operation.owner_name}</div>
            )}
            {operation?.phone && (
              <div style={{ fontSize: 12, color: "rgba(240,240,240,0.35)", marginTop: 1 }}>{operation.phone}</div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-4">
          <div className="flex-1 text-center rounded-lg py-2" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#FFFFFF" }}>{headCount ?? "—"}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Active head</div>
          </div>
          <div className="flex-1 text-center rounded-lg py-2" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#FFFFFF" }}>{projects?.length ?? "—"}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Projects</div>
          </div>
          <div className="flex-1 text-center rounded-lg py-2" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#FFFFFF" }}>{protocols?.length ?? "—"}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Protocols</div>
          </div>
        </div>
      </div>

      {/* Herd breakdown pills */}
      {typeBreakdown && Object.keys(typeBreakdown).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(typeBreakdown)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([type, count]) => (
              <span
                key={type}
                className="rounded-full"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 10px",
                  backgroundColor: "rgba(85,186,170,0.10)",
                  color: "#0F6E56",
                }}
              >
                {count} {type}{(count as number) !== 1 ? "s" : ""}
              </span>
            ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          className="rounded-xl flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          style={{ height: 44, backgroundColor: C.gold, border: "none", cursor: "pointer" }}
          onClick={() => navigate("/cow-work/new")}
        >
          <Plus size={16} style={{ color: C.text }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>New Project</span>
        </button>
        <button
          className="rounded-xl flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          style={{ height: 44, backgroundColor: "white", border: `1px solid ${C.border}`, cursor: "pointer" }}
          onClick={() => navigate("/protocols")}
        >
          <ClipboardList size={16} style={{ color: C.teal }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Protocols</span>
        </button>
      </div>

      {/* Contact info */}
      {(operation?.email || operation?.phone || addr) && (
        <div className="rounded-xl bg-white p-4" style={{ border: `1px solid rgba(212,212,208,0.60)` }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.35)", textTransform: "uppercase", marginBottom: 8 }}>
            Contact
          </div>
          {operation?.email && (
            <div style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>{operation.email}</div>
          )}
          {operation?.phone && (
            <div style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>{operation.phone}</div>
          )}
          {addr && (typeof addr === "object") && (
            <div style={{ fontSize: 13, color: "rgba(26,26,26,0.55)" }}>
              {[addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Recent projects */}
      <div>
        <SectionHeading text="Recent Projects" />
        {(projects || []).length > 0 ? (
          <div className="rounded-xl bg-white overflow-hidden divide-y" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
            {(projects || []).map((p: any) => {
              const fmtDate = new Date(p.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const statusColor =
                p.project_status === "Completed" ? "#55BAAA" :
                p.project_status === "In Progress" ? C.gold :
                "rgba(26,26,26,0.35)";
              return (
                <div
                  key={p.id}
                  className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#F5F5F0] active:bg-[#E8E8E0] transition-colors"
                  onClick={() => navigate(`/cow-work/${p.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(26,26,26,0.40)" }}>
                      {[p.workTypeCode, p.head_count ? `${p.head_count} head` : null].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="rounded-full"
                      style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", color: statusColor, backgroundColor: `${statusColor}18` }}
                    >
                      {p.project_status}
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(26,26,26,0.35)" }}>{fmtDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-white px-4 py-6 text-center" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(26,26,26,0.35)" }}>No projects yet</div>
          </div>
        )}
      </div>

      {/* Protocols */}
      {(protocols || []).length > 0 && (
        <div>
          <SectionHeading text="Assigned Protocols" />
          <div className="rounded-xl bg-white overflow-hidden divide-y" style={{ border: "1px solid rgba(212,212,208,0.60)" }}>
            {(protocols || []).map((p: any) => {
              const statusColor =
                p.protocol_status === "active" ? "#55BAAA" :
                p.protocol_status === "draft" ? "rgba(26,26,26,0.35)" :
                p.protocol_status === "completed" ? C.navy : "rgba(26,26,26,0.35)";
              return (
                <div
                  key={p.id}
                  className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#F5F5F0] transition-colors"
                  onClick={() => navigate(`/protocols/customer/${p.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                      {(p.template as any)?.name || "Protocol"}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(26,26,26,0.40)" }}>
                      {[p.animal_class, p.protocol_year].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span
                    className="rounded-full capitalize"
                    style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", color: statusColor, backgroundColor: `${statusColor}18` }}
                  >
                    {p.protocol_status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="h-6" />
    </div>
  );
};

export default CustomerDetailScreen;
