import { supabase } from "@/integrations/supabase/client";

export interface Violation {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  rule: string;
  tag: string;
  message: string;
  table_source: string;
  animal_id: string | null;
  record_id: string | null;
}

let counter = 0;
const uid = () => `dq-${++counter}-${Date.now()}`;

export async function runAllChecks(operationId: string): Promise<Violation[]> {
  const results = await Promise.allSettled([
    checkNoTag(operationId),
    checkCowsNoCalving(operationId),
    checkCalvingNoSire(operationId),
    checkNoBreed(operationId),
    checkNoEid(operationId),
    checkBullsNoBse(operationId),
    checkNoYearBorn(operationId),
    checkNoBirthWeight(operationId),
    checkDuplicateCowWork(operationId),
    checkStaleCullFlags(operationId),
  ]);

  const violations: Violation[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") violations.push(...r.value);
  }
  return violations;
}

// Check 1 — CRITICAL: Animals with no tag
async function checkNoTag(opId: string): Promise<Violation[]> {
  const { data } = await supabase
    .from("animals")
    .select("id, tag, tag_color")
    .eq("operation_id", opId)
    .eq("status", "Active")
    .or("tag.is.null,tag.eq.");

  return (data || []).map((a: any) => ({
    id: uid(),
    severity: "critical" as const,
    rule: "Missing Tag",
    tag: a.tag || "(no tag)",
    message: "Active animal has no tag",
    table_source: "animals",
    animal_id: a.id,
    record_id: null,
  }));
}

// Check 2 — HIGH: Active cows 3+ years old with no calving record
async function checkCowsNoCalving(opId: string): Promise<Violation[]> {
  const currentYear = new Date().getFullYear();
  const cutoff = currentYear - 3;

  const { data: cows } = await supabase
    .from("animals")
    .select("id, tag, tag_color, year_born")
    .eq("operation_id", opId)
    .eq("status", "Active")
    .eq("type", "Cow")
    .lte("year_born", cutoff);

  if (!cows || cows.length === 0) return [];

  const cowIds = cows.map((c: any) => c.id);
  const { data: calvingDams } = await supabase
    .from("calving_records")
    .select("dam_id")
    .eq("operation_id", opId)
    .in("dam_id", cowIds);

  const damsWithRecords = new Set((calvingDams || []).map((r: any) => r.dam_id));

  return cows
    .filter((c: any) => !damsWithRecords.has(c.id))
    .map((c: any) => ({
      id: uid(),
      severity: "high" as const,
      rule: "No Calving History",
      tag: c.tag || "(no tag)",
      message: `Cow ${c.tag} is ${currentYear - (c.year_born || currentYear)} years old with no calving history`,
      table_source: "animals",
      animal_id: c.id,
      record_id: null,
    }));
}

// Check 3 — HIGH: Calving records with no sire linked
async function checkCalvingNoSire(opId: string): Promise<Violation[]> {
  const { data } = await supabase
    .from("calving_records")
    .select("id, dam_id, calving_date")
    .eq("operation_id", opId)
    .is("sire_id", null)
    .gte("calving_date", "2023-01-01");

  if (!data || data.length === 0) return [];

  const damIds = [...new Set(data.map((r: any) => r.dam_id))];
  const { data: dams } = await supabase.from("animals").select("id, tag").in("id", damIds);
  const damMap = new Map((dams || []).map((d: any) => [d.id, d.tag]));

  return data.map((r: any) => ({
    id: uid(),
    severity: "high" as const,
    rule: "No Sire on Calving",
    tag: damMap.get(r.dam_id) || "(unknown)",
    message: `Calving record for ${damMap.get(r.dam_id) || "unknown"} on ${r.calving_date} has no sire`,
    table_source: "calving_records",
    animal_id: r.dam_id,
    record_id: r.id,
  }));
}

// Check 4 — MEDIUM: Animals with no breed set
async function checkNoBreed(opId: string): Promise<Violation[]> {
  const { data } = await supabase
    .from("animals")
    .select("id, tag")
    .eq("operation_id", opId)
    .eq("status", "Active")
    .in("type", ["Cow", "Bull"])
    .or("breed.is.null,breed.eq.");

  return (data || []).map((a: any) => ({
    id: uid(),
    severity: "medium" as const,
    rule: "No Breed",
    tag: a.tag || "(no tag)",
    message: `${a.tag} has no breed recorded`,
    table_source: "animals",
    animal_id: a.id,
    record_id: null,
  }));
}

// Check 5 — MEDIUM: Animals with no EID
async function checkNoEid(opId: string): Promise<Violation[]> {
  const { data } = await supabase
    .from("animals")
    .select("id, tag")
    .eq("operation_id", opId)
    .eq("status", "Active")
    .in("type", ["Cow", "Bull", "Replacement"])
    .or("eid.is.null,eid.eq.");

  return (data || []).map((a: any) => ({
    id: uid(),
    severity: "medium" as const,
    rule: "No EID",
    tag: a.tag || "(no tag)",
    message: `${a.tag} has no EID (electronic ID)`,
    table_source: "animals",
    animal_id: a.id,
    record_id: null,
  }));
}

// Check 6 — MEDIUM: Bulls with no BSE on record
async function checkBullsNoBse(opId: string): Promise<Violation[]> {
  const { data: bulls } = await supabase
    .from("animals")
    .select("id, tag")
    .eq("operation_id", opId)
    .eq("status", "Active")
    .eq("type", "Bull");

  if (!bulls || bulls.length === 0) return [];

  const bullIds = bulls.map((b: any) => b.id);
  const { data: bseRecords } = await supabase
    .from("cow_work")
    .select("animal_id")
    .eq("operation_id", opId)
    .in("animal_id", bullIds)
    .not("pass_fail", "is", null);

  const withBse = new Set((bseRecords || []).map((r: any) => r.animal_id));

  return bulls
    .filter((b: any) => !withBse.has(b.id))
    .map((b: any) => ({
      id: uid(),
      severity: "medium" as const,
      rule: "No BSE Exam",
      tag: b.tag || "(no tag)",
      message: `Bull ${b.tag} has no BSE exam on record`,
      table_source: "animals",
      animal_id: b.id,
      record_id: null,
    }));
}

// Check 7 — LOW: Animals with no year_born
async function checkNoYearBorn(opId: string): Promise<Violation[]> {
  const { data } = await supabase
    .from("animals")
    .select("id, tag")
    .eq("operation_id", opId)
    .eq("status", "Active")
    .is("year_born", null);

  return (data || []).map((a: any) => ({
    id: uid(),
    severity: "low" as const,
    rule: "No Birth Year",
    tag: a.tag || "(no tag)",
    message: `${a.tag} has no birth year recorded`,
    table_source: "animals",
    animal_id: a.id,
    record_id: null,
  }));
}

// Check 8 — LOW: Calving records with no birth weight
async function checkNoBirthWeight(opId: string): Promise<Violation[]> {
  const { data } = await supabase
    .from("calving_records")
    .select("id, dam_id, calving_date")
    .eq("operation_id", opId)
    .eq("calf_status", "Alive")
    .is("birth_weight", null)
    .gte("calving_date", "2024-01-01");

  if (!data || data.length === 0) return [];

  const damIds = [...new Set(data.map((r: any) => r.dam_id))];
  const { data: dams } = await supabase.from("animals").select("id, tag").in("id", damIds);
  const damMap = new Map((dams || []).map((d: any) => [d.id, d.tag]));

  return data.map((r: any) => ({
    id: uid(),
    severity: "low" as const,
    rule: "No Birth Weight",
    tag: damMap.get(r.dam_id) || "(unknown)",
    message: `Calving record for ${damMap.get(r.dam_id) || "unknown"} on ${r.calving_date} — live calf has no birth weight`,
    table_source: "calving_records",
    animal_id: r.dam_id,
    record_id: r.id,
  }));
}

// Check 9 — HIGH: Duplicate cow_work records (same animal + same project)
async function checkDuplicateCowWork(opId: string): Promise<Violation[]> {
  const { data } = await supabase
    .from("cow_work")
    .select("id, animal_id, project_id")
    .eq("operation_id", opId)
    .not("project_id", "is", null);

  if (!data || data.length === 0) return [];

  const counts = new Map<string, { ids: string[]; animal_id: string; project_id: string }>();
  for (const r of data) {
    const key = `${r.animal_id}|${r.project_id}`;
    if (!counts.has(key)) counts.set(key, { ids: [r.id], animal_id: r.animal_id, project_id: r.project_id });
    else counts.get(key)!.ids.push(r.id);
  }

  const dupes = [...counts.values()].filter((v) => v.ids.length > 1);
  if (dupes.length === 0) return [];

  const animalIds = [...new Set(dupes.map((d) => d.animal_id))];
  const { data: animals } = await supabase.from("animals").select("id, tag").in("id", animalIds);
  const tagMap = new Map((animals || []).map((a: any) => [a.id, a.tag]));

  const projectIds = [...new Set(dupes.map((d) => d.project_id))];
  const { data: projects } = await supabase.from("projects").select("id, name").in("id", projectIds);
  const projMap = new Map((projects || []).map((p: any) => [p.id, p.name]));

  return dupes.map((d) => ({
    id: uid(),
    severity: "high" as const,
    rule: "Duplicate Work Record",
    tag: tagMap.get(d.animal_id) || "(unknown)",
    message: `${tagMap.get(d.animal_id) || "Unknown"} has ${d.ids.length} duplicate records in project ${projMap.get(d.project_id) || "Unknown"}`,
    table_source: "cow_work",
    animal_id: d.animal_id,
    record_id: d.ids[0],
  }));
}

// Check 10 — MEDIUM: Cull-flagged animals still marked Active for 6+ months
async function checkStaleCullFlags(opId: string): Promise<Violation[]> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: flags } = await supabase
    .from("animal_flags")
    .select("id, animal_id, flag_tier, created_at")
    .eq("operation_id", opId)
    .eq("flag_tier", "cull")
    .is("resolved_at", null)
    .lte("created_at", sixMonthsAgo.toISOString());

  if (!flags || flags.length === 0) return [];

  const animalIds = [...new Set(flags.map((f: any) => f.animal_id))];
  const { data: animals } = await supabase
    .from("animals")
    .select("id, tag, status")
    .in("id", animalIds)
    .eq("status", "Active");

  const activeSet = new Set((animals || []).map((a: any) => a.id));
  const tagMap = new Map((animals || []).map((a: any) => [a.id, a.tag]));

  return flags
    .filter((f: any) => activeSet.has(f.animal_id))
    .map((f: any) => {
      const months = Math.round((Date.now() - new Date(f.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30));
      return {
        id: uid(),
        severity: "medium" as const,
        rule: "Stale Cull Flag",
        tag: tagMap.get(f.animal_id) || "(unknown)",
        message: `${tagMap.get(f.animal_id) || "Unknown"} has been flagged for cull for ${months} months but is still Active`,
        table_source: "animal_flags",
        animal_id: f.animal_id,
        record_id: f.id,
      };
    });
}
