import { supabase } from "@/integrations/supabase/client";

export interface FlagSuggestion {
  id: string;
  animal_id: string;
  tag: string;
  tag_color: string | null;
  flag_tier: string;
  flag_name: string;
  flag_note: string;
  reason: string;
  rule: string;
}

let counter = 0;
const uid = () => `af-${++counter}-${Date.now()}`;

export async function runAutoFlagRules(operationId: string): Promise<FlagSuggestion[]> {
  const [existingFlags, results] = await Promise.all([
    supabase
      .from("animal_flags")
      .select("animal_id, flag_tier, flag_name")
      .eq("operation_id", operationId)
      .is("resolved_at", null),
    Promise.allSettled([
      ruleOpenTwoYears(operationId),
      ruleFailedBse(operationId),
      ruleTreated3Times(operationId),
      ruleOldCow(operationId),
      ruleBadBag(operationId),
      ruleDeadCalf(operationId),
      ruleMissingFromProject(operationId),
    ]),
  ]);

  const activeFlags = new Set(
    (existingFlags.data || []).map((f: any) => `${f.animal_id}|${f.flag_tier}|${f.flag_name}`)
  );

  const suggestions: FlagSuggestion[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") suggestions.push(...r.value);
  }

  return suggestions.filter(
    (s) => !activeFlags.has(`${s.animal_id}|${s.flag_tier}|${s.flag_name}`)
  );
}

// Rule 1 — CULL: Cow open 2+ years in a row
async function ruleOpenTwoYears(opId: string): Promise<FlagSuggestion[]> {
  // Get preg check projects (work_type with preg check)
  const { data: pregRecords } = await supabase
    .from("cow_work" as any)
    .select("animal_id, date, preg_stage, project_id")
    .eq("operation_id", opId)
    .eq("preg_stage", "Open")
    .order("date", { ascending: false });

  if (!pregRecords || pregRecords.length === 0) return [];

  // Group by animal, get distinct years
  const animalYears = new Map<string, Set<number>>();
  for (const r of pregRecords as any[]) {
    const year = new Date(r.date).getFullYear();
    if (!animalYears.has(r.animal_id)) animalYears.set(r.animal_id, new Set());
    animalYears.get(r.animal_id)!.add(year);
  }

  const candidates = [...animalYears.entries()]
    .filter(([, years]) => years.size >= 2)
    .map(([id, years]) => ({ id, years: [...years].sort().slice(-2) }));

  if (candidates.length === 0) return [];

  const ids = candidates.map((c) => c.id);
  const { data: animals } = await supabase
    .from("animals")
    .select("id, tag, tag_color, type, status")
    .in("id", ids)
    .eq("status", "Active")
    .eq("type", "Cow");

  const animalMap = new Map((animals || []).map((a: any) => [a.id, a]));

  return candidates
    .filter((c) => animalMap.has(c.id))
    .map((c) => {
      const a = animalMap.get(c.id)!;
      return {
        id: uid(),
        animal_id: c.id,
        tag: a.tag,
        tag_color: a.tag_color,
        flag_tier: "cull",
        flag_name: "Cull",
        flag_note: `Open ${c.years[0]} and ${c.years[1]}`,
        reason: `Open 2 years in a row (${c.years[0]}, ${c.years[1]}). Strong cull candidate.`,
        rule: "Open 2+ Years",
      };
    });
}

// Rule 2 — CULL: Bull failed BSE
async function ruleFailedBse(opId: string): Promise<FlagSuggestion[]> {
  const { data } = await supabase
    .from("cow_work" as any)
    .select("animal_id, date, pass_fail")
    .eq("operation_id", opId)
    .in("pass_fail", ["Fail", "Permanent Fail"])
    .order("date", { ascending: false });

  if (!data || data.length === 0) return [];

  // Dedupe by animal (take most recent)
  const seen = new Map<string, any>();
  for (const r of data as any[]) {
    if (!seen.has(r.animal_id)) seen.set(r.animal_id, r);
  }

  const ids = [...seen.keys()];
  const { data: animals } = await supabase
    .from("animals")
    .select("id, tag, tag_color, type, status")
    .in("id", ids)
    .eq("status", "Active")
    .eq("type", "Bull");

  const animalMap = new Map((animals || []).map((a: any) => [a.id, a]));

  return [...seen.entries()]
    .filter(([id]) => animalMap.has(id))
    .map(([id, rec]) => {
      const a = animalMap.get(id)!;
      return {
        id: uid(),
        animal_id: id,
        tag: a.tag,
        tag_color: a.tag_color,
        flag_tier: "cull",
        flag_name: "Cull",
        flag_note: `Failed BSE on ${rec.date}`,
        reason: `Failed BSE exam (${rec.pass_fail}) on ${rec.date}.`,
        rule: "Failed BSE",
      };
    });
}

// Rule 3 — PRODUCTION: Cow treated 3+ times in last 12 months
async function ruleTreated3Times(opId: string): Promise<FlagSuggestion[]> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // Treatments are cow_work records with additional_products or from treatment-type projects
  const { data } = await supabase
    .from("cow_work" as any)
    .select("animal_id, date")
    .eq("operation_id", opId)
    .gte("date", oneYearAgo.toISOString().split("T")[0])
    .not("additional_products", "is", null);

  if (!data || data.length === 0) return [];

  const counts = new Map<string, number>();
  for (const r of data as any[]) {
    counts.set(r.animal_id, (counts.get(r.animal_id) || 0) + 1);
  }

  const frequent = [...counts.entries()].filter(([, c]) => c >= 3);
  if (frequent.length === 0) return [];

  const ids = frequent.map(([id]) => id);
  const { data: animals } = await supabase
    .from("animals")
    .select("id, tag, tag_color, status")
    .in("id", ids)
    .eq("status", "Active");

  const animalMap = new Map((animals || []).map((a: any) => [a.id, a]));

  return frequent
    .filter(([id]) => animalMap.has(id))
    .map(([id, count]) => {
      const a = animalMap.get(id)!;
      return {
        id: uid(),
        animal_id: id,
        tag: a.tag,
        tag_color: a.tag_color,
        flag_tier: "production",
        flag_name: "Needs Treated",
        flag_note: `Treated ${count} times in the last year`,
        reason: `Treated ${count} times in the last 12 months.`,
        rule: "Frequent Treatments",
      };
    });
}

// Rule 4 — PRODUCTION: Cow over 12 years old
async function ruleOldCow(opId: string): Promise<FlagSuggestion[]> {
  const cutoff = new Date().getFullYear() - 12;

  const { data } = await supabase
    .from("animals")
    .select("id, tag, tag_color, year_born")
    .eq("operation_id", opId)
    .eq("status", "Active")
    .eq("type", "Cow")
    .lte("year_born", cutoff);

  return (data || []).map((a: any) => {
    const age = new Date().getFullYear() - a.year_born;
    return {
      id: uid(),
      animal_id: a.id,
      tag: a.tag,
      tag_color: a.tag_color,
      flag_tier: "production",
      flag_name: "Old",
      flag_note: `Born ${a.year_born}, currently ${age} years old`,
      reason: `Born ${a.year_born}, currently ${age} years old.`,
      rule: "Old Cow",
    };
  });
}

// Rule 5 — PRODUCTION: Cow with bad bag score 2 years in a row
async function ruleBadBag(opId: string): Promise<FlagSuggestion[]> {
  const { data } = await supabase
    .from("calving_records")
    .select("dam_id, calving_date, udder")
    .eq("operation_id", opId)
    .lte("udder", 2)
    .not("udder", "is", null)
    .order("calving_date", { ascending: false });

  if (!data || data.length === 0) return [];

  const damYears = new Map<string, Set<number>>();
  for (const r of data as any[]) {
    const year = new Date(r.calving_date).getFullYear();
    if (!damYears.has(r.dam_id)) damYears.set(r.dam_id, new Set());
    damYears.get(r.dam_id)!.add(year);
  }

  const candidates = [...damYears.entries()]
    .filter(([, years]) => years.size >= 2)
    .map(([id, years]) => ({ id, years: [...years].sort().slice(-2) }));

  if (candidates.length === 0) return [];

  const ids = candidates.map((c) => c.id);
  const { data: animals } = await supabase
    .from("animals")
    .select("id, tag, tag_color, status")
    .in("id", ids)
    .eq("status", "Active");

  const animalMap = new Map((animals || []).map((a: any) => [a.id, a]));

  return candidates
    .filter((c) => animalMap.has(c.id))
    .map((c) => {
      const a = animalMap.get(c.id)!;
      return {
        id: uid(),
        animal_id: c.id,
        tag: a.tag,
        tag_color: a.tag_color,
        flag_tier: "production",
        flag_name: "Bad Bag",
        flag_note: `Poor udder scores in ${c.years[0]} and ${c.years[1]}`,
        reason: `Poor udder scores in ${c.years[0]} and ${c.years[1]}.`,
        rule: "Bad Bag 2 Years",
      };
    });
}

// Rule 6 — PRODUCTION: Dead calf 2+ years in a row
async function ruleDeadCalf(opId: string): Promise<FlagSuggestion[]> {
  const { data } = await supabase
    .from("calving_records")
    .select("dam_id, calving_date, calf_status")
    .eq("operation_id", opId)
    .eq("calf_status", "Dead")
    .order("calving_date", { ascending: false });

  if (!data || data.length === 0) return [];

  const damYears = new Map<string, Set<number>>();
  for (const r of data as any[]) {
    const year = new Date(r.calving_date).getFullYear();
    if (!damYears.has(r.dam_id)) damYears.set(r.dam_id, new Set());
    damYears.get(r.dam_id)!.add(year);
  }

  const candidates = [...damYears.entries()]
    .filter(([, years]) => years.size >= 2)
    .map(([id, years]) => ({ id, years: [...years].sort().slice(-2) }));

  if (candidates.length === 0) return [];

  const ids = candidates.map((c) => c.id);
  const { data: animals } = await supabase
    .from("animals")
    .select("id, tag, tag_color, status")
    .in("id", ids)
    .eq("status", "Active");

  const animalMap = new Map((animals || []).map((a: any) => [a.id, a]));

  return candidates
    .filter((c) => animalMap.has(c.id))
    .map((c) => {
      const a = animalMap.get(c.id)!;
      return {
        id: uid(),
        animal_id: c.id,
        tag: a.tag,
        tag_color: a.tag_color,
        flag_tier: "production",
        flag_name: "Poor Calf",
        flag_note: `Lost calves in ${c.years[0]} and ${c.years[1]}`,
        reason: `Lost calves in ${c.years[0]} and ${c.years[1]}.`,
        rule: "Dead Calf 2 Years",
      };
    });
}

// Rule 7 — MANAGEMENT: Animal missing from expected project
async function ruleMissingFromProject(opId: string): Promise<FlagSuggestion[]> {
  // Get completed projects for this operation
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("operation_id", opId)
    .eq("project_status", "Completed");

  if (!projects || projects.length === 0) return [];

  const projectIds = projects.map((p: any) => p.id);
  const projMap = new Map(projects.map((p: any) => [p.id, p.name]));

  const { data: expected } = await supabase
    .from("project_expected_animals" as any)
    .select("animal_id, project_id, status")
    .in("project_id", projectIds)
    .eq("status", "Expected");

  if (!expected || expected.length === 0) return [];

  const animalIds = [...new Set((expected as any[]).map((e) => e.animal_id))];
  const { data: animals } = await supabase
    .from("animals")
    .select("id, tag, tag_color, status")
    .in("id", animalIds)
    .eq("status", "Active");

  const animalMap = new Map((animals || []).map((a: any) => [a.id, a]));

  return (expected as any[])
    .filter((e) => animalMap.has(e.animal_id))
    .map((e) => {
      const a = animalMap.get(e.animal_id)!;
      return {
        id: uid(),
        animal_id: e.animal_id,
        tag: a.tag,
        tag_color: a.tag_color,
        flag_tier: "management",
        flag_name: "Missing from project",
        flag_note: `Not scanned in ${projMap.get(e.project_id) || "unknown project"}`,
        reason: `Not scanned in project "${projMap.get(e.project_id) || "unknown"}".`,
        rule: "Missing from Project",
      };
    });
}
