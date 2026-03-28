import { supabase } from "@/integrations/supabase/client";

export interface Nudge {
  id: string;
  icon: "alert" | "info";
  message: string;
  action: { label: string; route: string };
}

const CACHE_KEY = "dashboard_nudges_cache";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  ts: number;
  opId: string;
  nudges: Nudge[];
}

function readCache(opId: string): Nudge[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (entry.opId !== opId || Date.now() - entry.ts > CACHE_TTL) return null;
    return entry.nudges;
  } catch {
    return null;
  }
}

function writeCache(opId: string, nudges: Nudge[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), opId, nudges }));
}

export async function fetchNudges(operationId: string): Promise<Nudge[]> {
  const cached = readCache(operationId);
  if (cached) return cached;

  const results = await Promise.allSettled([
    nudgeCalvesNoSire(operationId),
    nudgeMissedPregCheck(operationId),
    nudgeStaleCullFlags(operationId),
    nudgeBullsNeedBse(operationId),
    nudgeNoEid(operationId),
  ]);

  const nudges: Nudge[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) nudges.push(r.value);
  }

  writeCache(operationId, nudges);
  return nudges;
}

// Nudge 1: Calves with no sire this season
async function nudgeCalvesNoSire(opId: string): Promise<Nudge | null> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("calving_records")
    .select("*", { count: "exact", head: true })
    .eq("operation_id", opId)
    .is("sire_id", null)
    .gte("calving_date", `${year}-01-01`);

  if (!count || count <= 5) return null;
  return {
    id: "calves-no-sire",
    icon: "alert",
    message: `${count} calves from this season have no sire recorded`,
    action: { label: "Review", route: "/data-quality" },
  };
}

// Nudge 2: Animals not scanned in latest preg check
async function nudgeMissedPregCheck(opId: string): Promise<Nudge | null> {
  // Find most recent preg-check project
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, group_id, group:groups(name)")
    .eq("operation_id", opId)
    .eq("project_status", "Completed")
    .order("date", { ascending: false })
    .limit(20);

  if (!projects || projects.length === 0) return null;

  // Find one with preg_stage data
  for (const proj of projects as any[]) {
    if (!proj.group_id) continue;

    const { count: workedCount } = await supabase
      .from("cow_work" as any)
      .select("*", { count: "exact", head: true })
      .eq("project_id", proj.id)
      .not("preg_stage", "is", null);

    if (!workedCount || workedCount === 0) continue;

    // Count animals in the group
    const { count: groupCount } = await supabase
      .from("animal_groups")
      .select("*", { count: "exact", head: true })
      .eq("group_id", proj.group_id)
      .is("end_date", null);

    if (!groupCount) continue;

    const missed = groupCount - workedCount;
    if (missed <= 0) return null;

    const groupName = proj.group?.name || "group";
    return {
      id: "missed-preg-check",
      icon: "alert",
      message: `${missed} cows in ${groupName} weren't scanned in the last preg check`,
      action: { label: "View list", route: "/data-quality" },
    };
  }
  return null;
}

// Nudge 3: Stale cull flags
async function nudgeStaleCullFlags(opId: string): Promise<Nudge | null> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { count } = await supabase
    .from("animal_flags")
    .select("*", { count: "exact", head: true })
    .eq("operation_id", opId)
    .eq("flag_tier", "cull")
    .is("resolved_at", null)
    .lte("created_at", sixMonthsAgo.toISOString());

  if (!count || count === 0) return null;
  return {
    id: "stale-cull-flags",
    icon: "info",
    message: `${count} cull flags have been sitting for 6+ months with no action`,
    action: { label: "View flags", route: "/animals" },
  };
}

// Nudge 4: Bulls needing BSE
async function nudgeBullsNeedBse(opId: string): Promise<Nudge | null> {
  const { data: bulls } = await supabase
    .from("animals")
    .select("id")
    .eq("operation_id", opId)
    .eq("status", "Active")
    .eq("type", "Bull");

  if (!bulls || bulls.length === 0) return null;

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const bullIds = bulls.map((b: any) => b.id);
  const { data: bseRecords } = await supabase
    .from("cow_work" as any)
    .select("animal_id")
    .in("animal_id", bullIds)
    .not("pass_fail", "is", null)
    .gte("date", oneYearAgo.toISOString().split("T")[0]);

  const withBse = new Set((bseRecords || []).map((r: any) => r.animal_id));
  const missing = bulls.filter((b: any) => !withBse.has(b.id)).length;

  if (missing === 0) return null;
  return {
    id: "bulls-need-bse",
    icon: "alert",
    message: `BSE exams may be due — ${missing} bulls have no exam in the last 12 months`,
    action: { label: "View bulls", route: "/bulls" },
  };
}

// Nudge 5: Active animals with no EID
async function nudgeNoEid(opId: string): Promise<Nudge | null> {
  const { count } = await supabase
    .from("animals")
    .select("*", { count: "exact", head: true })
    .eq("operation_id", opId)
    .eq("status", "Active")
    .in("type", ["Cow", "Bull"])
    .or("eid.is.null,eid.eq.");

  if (!count || count <= 10) return null;
  return {
    id: "no-eid",
    icon: "info",
    message: `${count} active cows and bulls have no EID recorded`,
    action: { label: "Review", route: "/data-quality" },
  };
}
