import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast } from "@/components/ToastContext";
import { Skeleton } from "@/components/ui/skeleton";
import { LABEL_STYLE, INPUT_CLS } from "@/lib/styles";

const LOCATION_TYPES = ["Pasture", "Pen", "Barn", "Corral", "Feedlot", "Headquarters", "Working Facility", "Water Source", "Lot", "Other"];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Pasture: { bg: "rgba(85,186,170,0.25)", text: "#55BAAA" },
  Pen: { bg: "rgba(243,209,42,0.20)", text: "#B8860B" },
  Barn: { bg: "rgba(232,138,58,0.25)", text: "#E88A3A" },
  Corral: { bg: "rgba(91,141,239,0.25)", text: "#5B8DEF" },
  Feedlot: { bg: "rgba(155,35,53,0.15)", text: "#9B2335" },
  Headquarters: { bg: "rgba(14,38,70,0.15)", text: "#0E2646" },
  "Working Facility": { bg: "rgba(168,168,240,0.20)", text: "#A8A8F0" },
  "Water Source": { bg: "rgba(85,186,170,0.15)", text: "#0F6E56" },
  Lot: { bg: "rgba(243,209,42,0.15)", text: "#B8860B" },
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function ReferenceLocationDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locationType, setLocationType] = useState("Pasture");
  const [isActive, setIsActive] = useState(true);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [capturingGps, setCapturingGps] = useState(false);

  // Add sublocation state
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [subName, setSubName] = useState("");
  const [subType, setSubType] = useState("Pen");
  const [subDesc, setSubDesc] = useState("");

  // ── Location record ──
  const { data: location, isLoading } = useQuery({
    queryKey: ["location-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // ── Parent location (if sublocation) ──
  const parentId = location?.parent_location_id;
  const { data: parentLocation } = useQuery({
    queryKey: ["location-parent", parentId],
    queryFn: async () => {
      if (!parentId) return null;
      const { data } = await supabase.from("locations").select("id, name, location_type").eq("id", parentId).single();
      return data;
    },
    enabled: !!parentId,
  });

  // ── Sublocations ──
  const { data: sublocations } = useQuery({
    queryKey: ["location-sublocations", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*")
        .eq("parent_location_id", id!).eq("operation_id", operationId).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // ── Animals currently at this location ──
  const { data: animalCount } = useQuery({
    queryKey: ["location-animal-count", id],
    queryFn: async () => {
      const { count } = await (supabase.from("animals") as any).select("id", { count: "exact", head: true })
        .eq("location_id", id!).eq("operation_id", operationId).eq("status", "Active");
      return count || 0;
    },
    enabled: !!id,
  });

  // ── Projects that used this location ──
  const { data: projectCount } = useQuery({
    queryKey: ["location-project-count", id],
    queryFn: async () => {
      const { count } = await supabase.from("projects").select("id", { count: "exact", head: true })
        .eq("location_id", id!).eq("operation_id", operationId);
      return count || 0;
    },
    enabled: !!id,
  });

  // ── Calving records at this location ──
  const { data: calvingCount } = useQuery({
    queryKey: ["location-calving-count", id],
    queryFn: async () => {
      const { count } = await supabase.from("calving_records").select("id", { count: "exact", head: true })
        .eq("location_id", id!).eq("operation_id", operationId);
      return count || 0;
    },
    enabled: !!id,
  });

  // ── Recent projects ──
  const { data: recentProjects } = useQuery({
    queryKey: ["location-recent-projects", id],
    queryFn: async () => {
      const { data } = await supabase.from("projects")
        .select("id, name, project_date, head_count, work_types:project_work_types(work_type:work_types(code))")
        .eq("location_id", id!).eq("operation_id", operationId)
        .order("project_date", { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!id,
  });

  // Sync edit fields
  useEffect(() => {
    if (location && !initialized) {
      setName(location.name);
      setDescription(location.description || "");
      setLocationType(location.location_type);
      setIsActive(location.is_active);
      const coords = location.coordinates as any;
      setLat(coords?.lat ? String(coords.lat) : "");
      setLng(coords?.lng ? String(coords.lng) : "");
      setInitialized(true);
    }
  }, [location, initialized]);

  const handleSave = async () => {
    if (!name.trim()) { showToast("error", "Name is required"); return; }
    setSaving(true);
    try {
      const coords = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;
      const { error } = await supabase.from("locations").update({
        name: name.trim(), description: description.trim() || null,
        location_type: locationType, is_active: isActive, coordinates: coords,
      }).eq("id", id!);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["location-detail", id] });
      showToast("success", "Location updated");
      setEditing(false);
    } catch (err: any) { showToast("error", err.message || "Failed to update"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("locations").delete().eq("id", id!);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      showToast("success", "Location deleted");
      navigate("/reference/locations");
    } catch (err: any) { showToast("error", err.message || "Failed to delete"); }
  };

  const handleCancel = () => {
    if (location) {
      setName(location.name); setDescription(location.description || "");
      setLocationType(location.location_type); setIsActive(location.is_active);
      const coords = location.coordinates as any;
      setLat(coords?.lat ? String(coords.lat) : "");
      setLng(coords?.lng ? String(coords.lng) : "");
    }
    setEditing(false);
  };

  const captureGps = () => {
    if (!navigator.geolocation) { showToast("error", "GPS not available on this device"); return; }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)); setCapturingGps(false); showToast("success", "GPS coordinates captured"); },
      (err) => { setCapturingGps(false); showToast("error", "Could not get location: " + err.message); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddSub = async () => {
    if (!subName.trim()) { showToast("error", "Name is required"); return; }
    const { error } = await supabase.from("locations").insert({
      operation_id: operationId, name: subName.trim(), location_type: subType,
      description: subDesc.trim() || null, parent_location_id: id,
    });
    if (error) { showToast("error", error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["location-sublocations", id] });
    queryClient.invalidateQueries({ queryKey: ["locations"] });
    showToast("success", subName.trim() + " added");
    setSubName(""); setSubDesc(""); setSubType("Pen"); setAddSubOpen(false);
  };

  if (isLoading) return (
    <div className="px-4 pt-4 pb-10 space-y-3">
      <Skeleton className="h-[120px] rounded-xl" style={{ backgroundColor: "rgba(14,38,70,0.10)" }} />
    </div>
  );

  if (!location) return (
    <div className="px-4 pt-4 pb-10 text-center" style={{ paddingTop: 48 }}>
      <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(26,26,26,0.40)" }}>Location not found</p>
      <button onClick={() => navigate("/reference/locations")} className="mt-3 rounded-full px-5 py-2 cursor-pointer" style={{ backgroundColor: "#0E2646", color: "white", fontSize: 13, fontWeight: 600, border: "none" }}>Back to Locations</button>
    </div>
  );

  const tc = TYPE_COLORS[location.location_type] || { bg: "rgba(136,135,128,0.20)", text: "#888780" };
  const coords = location.coordinates as any;
  const hasCoords = coords?.lat && coords?.lng;
  const createdDate = location.created_at ? fmtDate(location.created_at) : "";

  return (
    <div className="px-4 pt-1 pb-10 space-y-0">

      {/* ═══ GRADIENT HEADER ═══ */}
      <div style={{ borderRadius: 14, padding: "14px 16px", marginTop: 6, background: "linear-gradient(145deg, #0E2646 0%, #163A5E 55%, #55BAAA 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF" }}>{location.name}</span>
          <div style={{ display: "flex", gap: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10, letterSpacing: "0.04em", background: tc.bg, color: tc.text }}>{location.location_type.toUpperCase()}</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10, letterSpacing: "0.04em", background: location.is_active ? "rgba(85,186,170,0.25)" : "rgba(155,35,53,0.25)", color: location.is_active ? "#A8E6DA" : "#F0A0A0" }}>{location.is_active ? "ACTIVE" : "INACTIVE"}</span>
          </div>
        </div>
        {parentLocation && (
          <div style={{ fontSize: 12, color: "rgba(240,240,240,0.5)", marginTop: 4 }}>
            Sublocation of <button onClick={() => navigate("/reference/locations/" + parentLocation.id)} style={{ color: "#A8E6DA", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 12 }}>{parentLocation.name}</button>
          </div>
        )}
        {createdDate && <div style={{ fontSize: 12, color: "rgba(240,240,240,0.5)", marginTop: parentLocation ? 2 : 4 }}>Created {createdDate}</div>}
        {location.description && <div style={{ fontSize: 12, color: "rgba(240,240,240,0.4)", marginTop: 6, fontStyle: "italic" }}>{location.description}</div>}
        {hasCoords && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="3" stroke="#A8E6DA" strokeWidth="1.5" fill="none"/><path d="M8 1C4.7 1 2 3.5 2 6.5C2 10.5 8 15 8 15C8 15 14 10.5 14 6.5C14 3.5 11.3 1 8 1Z" stroke="#A8E6DA" strokeWidth="1.5" fill="none"/></svg>
            <a href={`https://maps.google.com/?q=${coords.lat},${coords.lng}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#A8E6DA", textDecoration: "none" }}>
              {Number(coords.lat).toFixed(5)}, {Number(coords.lng).toFixed(5)}
            </a>
          </div>
        )}
        {!editing && (
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={() => setEditing(true)} style={{ fontSize: 11, fontWeight: 600, color: "#A8E6DA", background: "rgba(255,255,255,0.10)", border: "none", borderRadius: 20, padding: "4px 12px", cursor: "pointer" }}>Edit</button>
            <button onClick={handleDelete} style={{ fontSize: 11, fontWeight: 600, color: "#F0A0A0", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 20, padding: "4px 12px", cursor: "pointer" }}>Delete</button>
          </div>
        )}
      </div>

      {/* ═══ EDIT MODE ═══ */}
      {editing && (
        <div style={{ background: "#fff", border: "1px solid #D4D4D0", borderRadius: 12, padding: 12, marginTop: 10 }}>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...LABEL_STYLE, width: 85, flexShrink: 0 }}>Name</span>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...LABEL_STYLE, width: 85, flexShrink: 0 }}>Type</span>
              <select value={locationType} onChange={e => setLocationType(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
                {LOCATION_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...LABEL_STYLE, width: 85, flexShrink: 0 }}>Description</span>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional note" className={INPUT_CLS} style={{ fontSize: 16 }} />
            </div>

            {/* GPS */}
            <div style={{ borderTop: "1px solid rgba(26,26,26,0.06)", paddingTop: 8, marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A" }}>GPS Coordinates</span>
                <button onClick={captureGps} disabled={capturingGps} style={{
                  fontSize: 11, fontWeight: 600, color: "#55BAAA", background: "rgba(85,186,170,0.08)",
                  border: "1px solid rgba(85,186,170,0.3)", borderRadius: 20, padding: "4px 12px",
                  cursor: "pointer", opacity: capturingGps ? 0.5 : 1,
                }}>
                  {capturingGps ? "Capturing..." : "Use Current Location"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.35)", marginBottom: 2 }}>Latitude</div>
                  <input type="text" value={lat} onChange={e => setLat(e.target.value)} placeholder="e.g. 43.5460" className={INPUT_CLS} style={{ fontSize: 16, width: "100%" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,26,26,0.35)", marginBottom: 2 }}>Longitude</div>
                  <input type="text" value={lng} onChange={e => setLng(e.target.value)} placeholder="e.g. -96.7313" className={INPUT_CLS} style={{ fontSize: 16, width: "100%" }} />
                </div>
              </div>
            </div>

            {/* Active toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Active</span>
              <button onClick={() => setIsActive(!isActive)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative" as const, background: isActive ? "#55BAAA" : "rgba(26,26,26,0.15)" }}>
                <span style={{ position: "absolute" as const, width: 16, height: 16, borderRadius: "50%", background: "#fff", top: 4, left: isActive ? 24 : 4, transition: "left 0.2s" }} />
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={handleCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 20, border: "1px solid #D4D4D0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#0E2646", cursor: "pointer" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "10px 0", borderRadius: 20, border: "none", background: "#F3D12A", fontSize: 13, fontWeight: 700, color: "#1A1A1A", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>{saving ? "Saving..." : "Save"}</button>
          </div>
        </div>
      )}

      {/* ═══ STATS ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginTop: 10 }}>
        {[
          { val: animalCount ?? "—", lbl: "Animals" },
          { val: sublocations?.length || 0, lbl: "Sub-Loc" },
          { val: projectCount ?? "—", lbl: "Projects" },
          { val: calvingCount ?? "—", lbl: "Calvings" },
        ].map(s => (
          <div key={s.lbl} style={{ background: "#fff", border: "1px solid #D4D4D0", borderRadius: 8, padding: "8px 6px", textAlign: "center" as const }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0E2646" }}>{s.val}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(26,26,26,0.35)", textTransform: "uppercase" as const, letterSpacing: "0.04em", marginTop: 2 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ═══ SUBLOCATIONS ═══ */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.3)", textTransform: "uppercase" as const }}>
            Sublocations ({sublocations?.length || 0})
          </span>
          <button onClick={() => setAddSubOpen(!addSubOpen)} style={{
            fontSize: 11, fontWeight: 600, color: "#55BAAA", background: "none", border: "none", cursor: "pointer",
          }}>{addSubOpen ? "Cancel" : "+ Add"}</button>
        </div>

        {addSubOpen && (
          <div style={{ background: "#fff", border: "2px solid #F3D12A", borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ ...LABEL_STYLE, width: 65, flexShrink: 0 }}>Name</span>
                <input type="text" value={subName} onChange={e => setSubName(e.target.value)} placeholder="e.g. North Tank" className={INPUT_CLS} style={{ fontSize: 16 }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ ...LABEL_STYLE, width: 65, flexShrink: 0 }}>Type</span>
                <select value={subType} onChange={e => setSubType(e.target.value)} className={INPUT_CLS} style={{ fontSize: 16 }}>
                  {LOCATION_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ ...LABEL_STYLE, width: 65, flexShrink: 0 }}>Note</span>
                <input type="text" value={subDesc} onChange={e => setSubDesc(e.target.value)} placeholder="Optional" className={INPUT_CLS} style={{ fontSize: 16 }} />
              </div>
              <button onClick={handleAddSub} style={{ padding: "8px 0", borderRadius: 20, border: "none", background: "#0E2646", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", marginTop: 2 }}>Save Sublocation</button>
            </div>
          </div>
        )}

        {sublocations && sublocations.length > 0 ? sublocations.map((sub: any) => {
          const stc = TYPE_COLORS[sub.location_type] || { bg: "rgba(136,135,128,0.12)", text: "#888780" };
          // Count sublocations of this sublocation (recursive)
          return (
            <div key={sub.id} onClick={() => navigate("/reference/locations/" + sub.id)}
              style={{ background: "#fff", border: "1px solid #D4D4D0", borderRadius: 8, padding: "10px 12px", marginBottom: 6, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0E2646" }}>{sub.name}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 8, letterSpacing: "0.04em", background: stc.bg, color: stc.text }}>{sub.location_type}</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="rgba(26,26,26,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              {sub.description && <div style={{ fontSize: 11, color: "rgba(26,26,26,0.45)", marginTop: 2 }}>{sub.description}</div>}
              {sub.coordinates && (
                <div style={{ fontSize: 10, color: "rgba(26,26,26,0.3)", marginTop: 2 }}>
                  GPS: {(sub.coordinates as any).lat?.toFixed(4)}, {(sub.coordinates as any).lng?.toFixed(4)}
                </div>
              )}
            </div>
          );
        }) : !addSubOpen && (
          <p style={{ fontSize: 13, color: "rgba(26,26,26,0.35)", textAlign: "center" as const, padding: "12px 0" }}>No sublocations</p>
        )}
      </div>

      {/* ═══ RECENT PROJECTS ═══ */}
      {recentProjects && recentProjects.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(26,26,26,0.3)", textTransform: "uppercase" as const, marginBottom: 6 }}>Recent projects</div>
          {recentProjects.map((p: any) => {
            const code = p.work_types?.[0]?.work_type?.code || "WORK";
            return (
              <div key={p.id} onClick={() => navigate("/cow-work/" + p.id)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(26,26,26,0.06)", cursor: "pointer" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{p.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, marginLeft: 6, padding: "1px 6px", borderRadius: 6, background: "rgba(26,26,26,0.06)", color: "rgba(26,26,26,0.45)" }}>{code}</span>
                </div>
                <span style={{ fontSize: 11, color: "rgba(26,26,26,0.4)" }}>{p.project_date ? fmtDate(p.project_date) : "—"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
