import React, { useState, useEffect, useMemo } from "react";
import { useOperation } from "@/contexts/OperationContext";
import { supabase } from "@/integrations/supabase/client";
import CalfRegistrationCard, { CalfRow } from "@/components/registration/CalfRegistrationCard";
import { generateRegistrationPDF, RegCalfData, RegOperationInfo } from "@/lib/registration/registration-pdf";
import { useChuteSideToast } from "@/components/ToastContext";

const RegistrationAssistantScreen: React.FC = () => {
  const { operationId } = useOperation();
  const { showToast } = useChuteSideToast();

  const [association, setAssociation] = useState("angus");
  const [dateStart, setDateStart] = useState(`${new Date().getFullYear()}-01-01`);
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split("T")[0]);
  const [groupFilter, setGroupFilter] = useState("all");
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [calves, setCalves] = useState<CalfRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [operationInfo, setOperationInfo] = useState<RegOperationInfo>({ name: "", ownerName: "", address: "" });

  // Load groups + operation info
  useEffect(() => {
    if (!operationId) return;
    supabase.from("groups")
      .select("id, name")
      .eq("operation_id", operationId)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setGroups(data || []));

    supabase.from("operations")
      .select("name, owner_name, address")
      .eq("id", operationId)
      .single()
      .then(({ data }) => {
        if (data) {
          const addr = data.address as unknown as Record<string, string> | null;
          let addressStr = "";
          if (addr && typeof addr === "object") {
            addressStr = [addr.line1, addr.city, addr.state, addr.zip].filter(Boolean).join(", ");
          }
          setOperationInfo({
            name: data.name || "",
            ownerName: data.owner_name || "",
            address: addressStr,
          });
        }
      });
  }, [operationId]);

  const findCalves = async () => {
    if (!operationId) return;
    setLoading(true);
    setSearched(true);
    setCalves([]);
    setSelected(new Set());

    try {
      // Get calving records in date range
      let q = supabase.from("calving_records")
        .select("id, calving_date, birth_weight, calf_sex, calf_tag, calf_tag_color, calf_id, dam_id, sire_id")
        .eq("operation_id", operationId)
        .gte("calving_date", dateStart)
        .lte("calving_date", dateEnd)
        .eq("calf_status", "Alive");

      if (groupFilter !== "all") {
        q = q.eq("group_id", groupFilter);
      }

      const { data: records, error } = await q;
      if (error) throw error;
      if (!records || records.length === 0) {
        setCalves([]);
        setLoading(false);
        return;
      }

      // Collect all animal IDs we need
      const animalIds = new Set<string>();
      for (const r of records) {
        if (r.dam_id) animalIds.add(r.dam_id);
        if (r.sire_id) animalIds.add(r.sire_id);
        if (r.calf_id) animalIds.add(r.calf_id);
      }

      // Fetch animal data
      const { data: animals } = await supabase.from("animals")
        .select("id, tag, tag_color, breed, reg_name, reg_number, sex, year_born")
        .in("id", Array.from(animalIds));

      const animalMap = new Map<string, typeof animals extends (infer T)[] | null | undefined ? T : never>();
      (animals || []).forEach((a) => animalMap.set(a.id, a));

      // Build calf rows — only include calves where dam or sire has reg_number AND calf does NOT
      const rows: CalfRow[] = [];
      for (const r of records) {
        const dam = r.dam_id ? animalMap.get(r.dam_id) : null;
        const sire = r.sire_id ? animalMap.get(r.sire_id) : null;
        const calf = r.calf_id ? animalMap.get(r.calf_id) : null;

        // Skip if calf already has reg_number
        if (calf?.reg_number) continue;

        // At least one parent must have reg_number
        const damHasReg = !!dam?.reg_number;
        const sireHasReg = !!sire?.reg_number;
        if (!damHasReg && !sireHasReg) continue;

        rows.push({
          id: r.id,
          calfTag: r.calf_tag || calf?.tag || "—",
          calfSex: r.calf_sex || calf?.sex || "—",
          birthDate: r.calving_date || "—",
          birthWeight: r.birth_weight ? String(r.birth_weight) : "",
          breed: calf?.breed || dam?.breed || "",
          damTag: dam?.tag || "—",
          damRegName: dam?.reg_name || "",
          damRegNumber: dam?.reg_number || "",
          sireTag: sire?.tag || "",
          sireRegName: sire?.reg_name || "",
          sireRegNumber: sire?.reg_number || "",
          ready: damHasReg && sireHasReg,
        });
      }

      // Sort: ready first, then by tag
      rows.sort((a, b) => {
        if (a.ready !== b.ready) return a.ready ? -1 : 1;
        return a.calfTag.localeCompare(b.calfTag);
      });

      setCalves(rows);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to search");
    } finally {
      setLoading(false);
    }
  };

  const readyCalves = useMemo(() => calves.filter((c) => c.ready), [calves]);

  const selectAllReady = () => {
    setSelected(new Set(readyCalves.map((c) => c.id)));
  };

  const toggleCalf = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const generateForm = () => {
    const selectedCalves = calves.filter((c) => selected.has(c.id));
    if (selectedCalves.length === 0) return;

    const calfData: RegCalfData[] = selectedCalves.map((c) => ({
      calfTag: c.calfTag,
      calfSex: c.calfSex,
      birthDate: c.birthDate,
      birthWeight: c.birthWeight,
      breed: c.breed,
      damTag: c.damTag,
      damRegName: c.damRegName,
      damRegNumber: c.damRegNumber,
      sireTag: c.sireTag,
      sireRegName: c.sireRegName,
      sireRegNumber: c.sireRegNumber,
    }));

    const doc = generateRegistrationPDF(association, calfData, operationInfo);
    const assocShort = association === "angus" ? "AAA" : "AHA";
    doc.save(`Registration_${assocShort}_${new Date().toISOString().split("T")[0]}.pdf`);
    showToast("success", `Generated ${selectedCalves.length} registration form${selectedCalves.length !== 1 ? "s" : ""}`);
  };

  return (
    <div className="px-4 space-y-5">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: "#0E2646" }}>Registration Assistant</h1>
        <p style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
          Pre-fill registration paperwork from your records
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: "#0E2646", display: "block", marginBottom: 4 }}>Association</label>
          <select
            value={association}
            onChange={(e) => setAssociation(e.target.value)}
            style={{
              width: "100%", height: 40, borderRadius: 8, border: "1px solid #D4D4D0",
              padding: "0 12px", fontSize: 16, color: "#0E2646", background: "#fff",
            }}
          >
            <option value="angus">Angus (AAA)</option>
            <option value="hereford">Hereford (AHA)</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: "#0E2646", display: "block", marginBottom: 4 }}>Start Date</label>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              style={{
                width: "100%", height: 40, borderRadius: 8, border: "1px solid #D4D4D0",
                padding: "0 12px", fontSize: 16, color: "#0E2646",
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: "#0E2646", display: "block", marginBottom: 4 }}>End Date</label>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              style={{
                width: "100%", height: 40, borderRadius: 8, border: "1px solid #D4D4D0",
                padding: "0 12px", fontSize: 16, color: "#0E2646",
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: "#0E2646", display: "block", marginBottom: 4 }}>Group</label>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            style={{
              width: "100%", height: 40, borderRadius: 8, border: "1px solid #D4D4D0",
              padding: "0 12px", fontSize: 16, color: "#0E2646", background: "#fff",
            }}
          >
            <option value="all">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={findCalves}
          disabled={loading}
          style={{
            width: "100%",
            height: 40,
            borderRadius: 20,
            background: "#F3D12A",
            color: "#0E2646",
            fontWeight: 700,
            fontSize: 14,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Searching..." : "Find Unregistered Calves"}
        </button>
      </div>

      {/* Results */}
      {searched && !loading && calves.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#888", fontSize: 14 }}>
          No unregistered calves found with registered parents in this date range.
        </div>
      )}

      {calves.length > 0 && (
        <div className="space-y-3">
          {/* Summary + select all */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, color: "#888" }}>
              <span style={{ color: "#55BAAA", fontWeight: 600 }}>{readyCalves.length} ready</span>
              {calves.length - readyCalves.length > 0 && (
                <span> · <span style={{ color: "#F3D12A", fontWeight: 600 }}>{calves.length - readyCalves.length} incomplete</span></span>
              )}
            </div>
            {readyCalves.length > 0 && (
              <button
                onClick={selectAllReady}
                style={{
                  border: "1.5px solid #55BAAA",
                  background: "transparent",
                  color: "#55BAAA",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 20,
                  padding: "4px 12px",
                  cursor: "pointer",
                }}
              >
                Select All Ready
              </button>
            )}
          </div>

          {/* Cards */}
          <div className="space-y-2">
            {calves.map((c) => (
              <CalfRegistrationCard key={c.id} calf={c} selected={selected.has(c.id)} onToggle={toggleCalf} />
            ))}
          </div>

          {/* Generate button */}
          {selected.size > 0 && (
            <button
              onClick={generateForm}
              style={{
                width: "100%",
                height: 40,
                borderRadius: 20,
                background: "#F3D12A",
                color: "#0E2646",
                fontWeight: 700,
                fontSize: 14,
                border: "none",
                cursor: "pointer",
              }}
            >
              Generate Registration Form ({selected.size} calf{selected.size !== 1 ? "es" : ""})
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RegistrationAssistantScreen;
