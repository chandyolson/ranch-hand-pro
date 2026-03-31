import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Intent Classification ──
const INTENT_SYSTEM = `You classify user requests for a cattle management app.
Respond with ONLY a JSON object, no markdown.

If the user is ASKING A QUESTION (counts, comparisons, lists, reports, trends), return:
{"intent": "read"}

If the user wants to CHANGE data (mark as sold, flag animals, record calving, record treatment, create group), return:
{"intent": "write", "action_type": "<type>", "details": "<what they want>"}

action_type options: mark_status, create_flags, resolve_flags, create_calving, create_treatment, create_group

Examples:
"How many cows are open?" -> {"intent": "read"}
"Mark all open cows as sold" -> {"intent": "write", "action_type": "mark_status", "details": "mark open cows as sold"}
"Flag 442 as a cull" -> {"intent": "write", "action_type": "create_flags", "details": "flag tag 442 as cull"}
"I just calved 3309, bull calf, 80 lbs" -> {"intent": "write", "action_type": "create_calving", "details": "calving for 3309, bull, 80 lbs"}
"I doctored 2204 for pinkeye with Draxxin" -> {"intent": "write", "action_type": "create_treatment", "details": "treat 2204 for pinkeye with Draxxin"}
"Make a group of all the open cows" -> {"intent": "write", "action_type": "create_group", "details": "group from open cows"}
"Remove the cull flag on 3309" -> {"intent": "write", "action_type": "resolve_flags", "details": "resolve cull flag on 3309"}
"Here's a list of cows I shipped: 442, 1087, 3309" -> {"intent": "write", "action_type": "mark_status", "details": "mark 442, 1087, 3309 as sold"}
"Compare calf weights by sire" -> {"intent": "read"}
"Generate a cull list" -> {"intent": "read"}`;

// ── Write Action Planner ──
const WRITE_PLANNER_SYSTEM = `You plan write actions for a cattle management app. Given a write request and animal data, generate a plan.
Respond with ONLY a JSON object:
{
  "action_type": "mark_status|create_flags|resolve_flags|create_calving|create_treatment|create_group",
  "risk_tier": 1|2|3,
  "preview_title": "Human-readable title like 'Mark 15 cows as Sold'",
  "params": { ... },
  "preview_animals": [{"tag": "442", "tag_color": "White", "year_born": 2018}]
}
RISK TIERS: 1=status/flags/groups, 2=new records, 3=edit/delete
PARAMS by type:
mark_status: { "animal_ids": ["uuid",...], "new_status": "Sold"|"Dead", "reason": "why" }
create_flags: { "animal_ids": ["uuid",...], "flag_tier": "management"|"production"|"cull", "flag_name": "name", "flag_note": "note" }
resolve_flags: { "animal_ids": ["uuid",...], "flag_tier": "cull", "flag_name": "optional" }
create_calving: { "dam_tag": "3309", "calving_date": "2026-03-29", "calf_sex": "Bull"|"Heifer", "birth_weight": 80, "calf_status": "Alive"|"Dead", "assistance": 1, "sire_tag": null, "calf_tag": null, "memo": null }
create_treatment: { "animal_tag": "2204", "disease_name": "Pinkeye", "treatment_date": "2026-03-29", "product_names": ["Draxxin"], "memo": null }
create_group: { "group_name": "name", "cattle_type": "Cow", "group_type": "management", "animal_ids": ["uuid",...] }
Use actual UUIDs from the animal data. Match by tag number.`;

// ── Helpers ──
async function callClaude(apiKey: string, system: string, messages: {role:string;content:string}[], maxTokens=4096): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},
    body: JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,system,messages:messages.filter(m=>m.role!=="system").map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.content}))}),
  });
  if (!res.ok) { const e=await res.text(); console.error("Claude error:",res.status,e); throw new Error("AI service error"); }
  const d = await res.json();
  return d.content?.[0]?.text ?? "";
}

function parseJSON(text: string): any {
  return JSON.parse(text.trim().replace(/^```json?\n?/i,"").replace(/\n?```$/i,"").trim());
}

// ── Main ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const startTime = Date.now();
  const log: Record<string, any> = { claude_calls: 0 };

  try {
    const { question, operation_id, conversation_history, template_used, file_context } = await req.json();
    if (!question || !operation_id) return new Response(JSON.stringify({error:"question and operation_id are required"}),{status:400,headers:{...corsHeaders,"Content-Type":"application/json"}});

    log.operation_id = operation_id;
    log.question = question.substring(0, 2000);
    log.template_used = template_used || null;
    log.user_agent = req.headers.get("user-agent")?.substring(0, 500) || null;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) return new Response(JSON.stringify({summary:"AI not configured. Add ANTHROPIC_API_KEY.",chart_config:null,table_data:null,follow_up_suggestions:[]}),{headers:{...corsHeaders,"Content-Type":"application/json"}});

    // ── FILE PATH: If a file is attached, analyze it ──
    if (file_context && file_context.headers && file_context.row_count > 0) {
      console.log(`[ai-report] File attached: ${file_context.filename} | ${file_context.row_count} rows | Cols: ${file_context.headers.join(", ")}`);
      log.intent = "file";
      log.action_type = "file_analysis";

      // Fetch groups for comparison options
      const { data: groups } = await supabase.from("groups").select("id,name,cattle_type").eq("operation_id",operation_id).eq("is_active",true).limit(50);
      // Fetch animal data for matching context
      const { data: animals } = await supabase.from("animals").select("id,tag,tag_color,eid,status,type,year_born,breed").eq("operation_id",operation_id).eq("status","Active").limit(500);

      // Try to match file rows against existing animals
      const hasEID = file_context.headers.some((h: string) => /eid|electronic.?id|rfid/i.test(h));
      const hasTag = file_context.headers.some((h: string) => /^tag$|animal.?tag|cow.?tag|ear.?tag/i.test(h));
      const hasWeight = file_context.headers.some((h: string) => /weight|wt|lbs|pounds/i.test(h));

      const fileAnalysisPrompt = `You are an AI assistant for HerdWork. A user uploaded a file in the chat. Analyze it and tell them what you can do with it.

FILE: "${file_context.filename}"
COLUMNS: ${file_context.headers.join(", ")}
ROW COUNT: ${file_context.row_count}
SAMPLE ROWS (first 5):
${JSON.stringify(file_context.sample_rows?.slice(0, 5) || [], null, 1)}

USER'S MESSAGE: "${question}"

AVAILABLE GROUPS: ${(groups || []).map((g: any) => g.name).join(", ") || "none"}
ACTIVE ANIMALS: ${(animals || []).length} in the system
FILE HAS EID COLUMN: ${hasEID}
FILE HAS TAG COLUMN: ${hasTag}
FILE HAS WEIGHT COLUMN: ${hasWeight}

Based on the file contents, tell the user:
1. What you found in the file (column types, row count, what it appears to be)
2. What you can do with it. Options to offer:
   - If it has EIDs or tags: "Compare against a group to find who's missing"
   - If it has EIDs or tags: "Import these animals or update existing records"
   - If it has EIDs or tags: "Create a new group from these animals"
   - If it has weights: "Update weights on matched animals"
   - If the user specified what they want, do that directly

RESPONSE FORMAT: Valid JSON only:
{"summary":"your analysis and options","chart_config":null,"table_data":null,"follow_up_suggestions":["Compare against 2026 Cows group","Import these as new records","Create a group from this file"]}

Be specific about what you found. Use actual column names and counts.`;

      const fileAnalysis = await callClaude(anthropicKey, fileAnalysisPrompt, [{role:"user",content:question}], 2048);
      log.claude_calls++;

      let parsed;
      try { parsed = parseJSON(fileAnalysis); } catch { parsed = {summary:fileAnalysis,chart_config:null,table_data:null,follow_up_suggestions:[]}; }

      log.sql_valid = true;
      log.response_type = "text";
      log.query_row_count = file_context.row_count;
      log.duration_ms = Date.now() - startTime;
      const {data:logRow} = await supabase.from("ai_interaction_logs").insert(log).select("id").single();
      parsed.log_id = logRow?.id || null;

      console.log(`[ai-report] File analysis complete | ${log.duration_ms}ms`);
      return new Response(JSON.stringify(parsed),{headers:{...corsHeaders,"Content-Type":"application/json"}});
    }

    // ── Step 1: Classify intent ──
    console.log(`[ai-report] Q: "${question.substring(0,80)}" | Op: ${operation_id}`);
    const intentRaw = await callClaude(anthropicKey, INTENT_SYSTEM, [{role:"user",content:question}], 256);
    log.claude_calls++;
    let intent: any;
    try { intent = parseJSON(intentRaw); } catch { intent = {intent:"read"}; }
    log.intent = intent.intent;
    log.action_type = intent.action_type || null;
    console.log(`[ai-report] Intent: ${intent.intent}${intent.action_type?" / "+intent.action_type:""}`);

    // ── Gather data ──
    const [animalsRes, calvingRes, cowWorkRes, flagsRes, groupsRes] = await Promise.all([
      supabase.from("animals").select("id,tag,tag_color,sex,breed,status,year_born,type,birth_date,eid").eq("operation_id",operation_id).limit(500),
      supabase.from("calving_records").select("id,calving_date,calf_sex,calf_status,birth_weight,assistance,sire_id,calf_tag,dam_id,memo").eq("operation_id",operation_id).limit(500),
      supabase.from("cow_work").select("id,date,animal_id,preg_stage,project_id,weight,breeding_sire_id,pass_fail,scrotal,quality,memo").eq("operation_id",operation_id).limit(500),
      supabase.from("animal_flags").select("id,animal_id,flag_name,flag_tier,flag_note,created_at,resolved_at").eq("operation_id",operation_id).is("resolved_at",null).limit(500),
      supabase.from("groups").select("id,name,cattle_type,group_type").eq("operation_id",operation_id).limit(100),
    ]);
    const animals = animalsRes.data ?? [];

    // ── WRITE PATH ──
    if (intent.intent === "write") {
      const animalCtx = JSON.stringify(animals.slice(0,200).map((a:any)=>({id:a.id,tag:a.tag,tag_color:a.tag_color,year_born:a.year_born,status:a.status,type:a.type,breed:a.breed})));
      const planRaw = await callClaude(anthropicKey, WRITE_PLANNER_SYSTEM, [{role:"user",content:`Request: "${question}"\nAction: ${intent.action_type}\nDetails: ${intent.details}\n\nAnimals:\n${animalCtx}`}], 2048);
      log.claude_calls++;

      let plan: any;
      try { plan = parseJSON(planRaw); } catch(e) {
        console.error("[ai-report] Write plan parse fail:", e);
        log.sql_valid=false; log.sql_error="Write plan parse failed"; log.response_type="text"; log.duration_ms=Date.now()-startTime;
        await supabase.from("ai_interaction_logs").insert(log).catch(()=>{});
        return new Response(JSON.stringify({summary:"I want to help with that change but couldn't figure out the details. Could you rephrase?",chart_config:null,table_data:null,follow_up_suggestions:[]}),{headers:{...corsHeaders,"Content-Type":"application/json"}});
      }

      let previewTable = null;
      if (plan.preview_animals?.length > 0) {
        previewTable = {headers:["Tag","Tag Color","Year Born"],rows:plan.preview_animals.slice(0,50).map((a:any)=>[a.tag||"",a.tag_color||"",a.year_born||""])};
      }

      let previewDetail = null;
      if (plan.risk_tier === 2 && plan.params) {
        const p = plan.params;
        const at = plan.action_type || intent.action_type;
        if (at === "create_calving") {
          previewDetail = {} as Record<string,string>;
          if (p.dam_tag) previewDetail["Cow"] = p.dam_tag;
          if (p.calf_sex) previewDetail["Calf"] = `${p.calf_sex}${p.birth_weight?", "+p.birth_weight+" lbs":""}`;
          if (p.assistance) { const l:Record<number,string>={1:"No help",2:"Easy Pull",3:"Hard Pull",4:"C-Section",5:"Abnormal"}; previewDetail["Assistance"]=l[p.assistance]||String(p.assistance); }
          if (p.sire_tag) previewDetail["Sire"] = p.sire_tag;
          if (p.calving_date) previewDetail["Date"] = p.calving_date;
        } else if (at === "create_treatment") {
          previewDetail = {} as Record<string,string>;
          if (p.animal_tag) previewDetail["Animal"] = p.animal_tag;
          if (p.disease_name) previewDetail["Diagnosis"] = p.disease_name;
          if (p.product_names?.length) previewDetail["Products"] = p.product_names.join(", ");
          if (p.treatment_date) previewDetail["Date"] = p.treatment_date;
        }
      }

      const {data:actionRow,error:insertErr} = await supabase.from("pending_ai_actions").insert({operation_id,action_type:plan.action_type||intent.action_type,params:plan.params,preview_title:plan.preview_title||"Confirm action"}).select("id").single();
      if (insertErr||!actionRow) {
        log.sql_valid=false; log.sql_error="Pending action insert failed"; log.response_type="text"; log.duration_ms=Date.now()-startTime;
        await supabase.from("ai_interaction_logs").insert(log).catch(()=>{});
        return new Response(JSON.stringify({summary:"Couldn't prepare that action. Try again.",chart_config:null,table_data:null,follow_up_suggestions:[]}),{headers:{...corsHeaders,"Content-Type":"application/json"}});
      }

      log.sql_valid=true; log.response_type="action_preview"; log.action_id=actionRow.id; log.query_row_count=plan.preview_animals?.length||0; log.duration_ms=Date.now()-startTime;
      const {data:logRow} = await supabase.from("ai_interaction_logs").insert(log).select("id").single();
      console.log(`[ai-report] Write: ${plan.preview_title} | action: ${actionRow.id}`);

      return new Response(JSON.stringify({
        type:"action_preview",action_type:plan.action_type||intent.action_type,risk_tier:plan.risk_tier||1,
        action_id:actionRow.id,preview_title:plan.preview_title,preview_detail:previewDetail,
        preview_table:previewTable,diff:null,summary:plan.preview_title,content:plan.preview_title,
        chart_config:null,table_data:null,export_available:false,export_format:null,follow_up_suggestions:[],
        log_id:logRow?.id||null,
      }),{headers:{...corsHeaders,"Content-Type":"application/json"}});
    }

    // ── READ PATH ──
    const currentYear = new Date().getFullYear();
    const contextData = {
      animals_count: animals.length, animals_sample: animals.slice(0,100),
      calving_records_count: (calvingRes.data??[]).length, calving_records: calvingRes.data??[],
      cow_work_count: (cowWorkRes.data??[]).length, cow_work_records: cowWorkRes.data??[],
      active_flags: flagsRes.data??[], groups: groupsRes.data??[],
    };

    const readPrompt = `You are an AI assistant for HerdWork, a cattle operation management app. Current year: ${currentYear}.

CRITICAL DATE RULE: Default to ${currentYear} when no year specified. "How many calves?" means ${currentYear}. "Open rate?" means most recent ${currentYear} preg check. User can override by specifying years.

Data for this operation:
- ${contextData.animals_count} animals (sample provided)
- ${contextData.calving_records_count} calving records
- ${contextData.cow_work_count} cow work records
- ${contextData.active_flags.length} active flags
- ${contextData.groups.length} groups

TERMINOLOGY: "bag" not "udder", "calving ease" not "difficulty", "shipped" not "sold", "doctored" not "treated". Never say "dam" — say "cow" or "heifer".

DATA:
${JSON.stringify(contextData, null, 1)}

RESPONSE FORMAT: Valid JSON only, no markdown. Fields:
{"summary":"text with \\n","chart_config":null|{"chart_type":"bar"|"pie"|"line"|"stacked_bar","title":"","data":[...],"x_axis":"key","y_axis":"key"},"table_data":null|{"headers":[""],"rows":[[""]]},"follow_up_suggestions":["",""]}
Include charts for comparisons, tables for lists. Always 2-3 follow-ups referencing ${currentYear}. Be concise and data-driven.`;

    const msgs = [...(conversation_history??[]).slice(-8),{role:"user",content:question}];
    const raw = await callClaude(anthropicKey, readPrompt, msgs, 4096);
    log.claude_calls++;

    let parsed;
    try { parsed = parseJSON(raw); } catch { parsed = {summary:raw,chart_config:null,table_data:null,follow_up_suggestions:[]}; }

    log.sql_valid=true;
    log.response_type = parsed.chart_config ? "mixed" : parsed.table_data ? "table" : "text";
    log.query_row_count = parsed.table_data?.rows?.length || 0;
    log.duration_ms = Date.now()-startTime;
    const {data:logRow} = await supabase.from("ai_interaction_logs").insert(log).select("id").single();
    parsed.log_id = logRow?.id || null;

    console.log(`[ai-report] ${log.response_type} | ${log.duration_ms}ms | log: ${parsed.log_id}`);
    return new Response(JSON.stringify(parsed),{headers:{...corsHeaders,"Content-Type":"application/json"}});

  } catch (err: any) {
    console.error("[ai-report] Error:", err);
    log.sql_valid=false; log.sql_error=(err.message||"Error").substring(0,500); log.response_type="error"; log.duration_ms=Date.now()-startTime;
    try { const s=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!); await s.from("ai_interaction_logs").insert(log).catch(()=>{}); } catch(_){}
    return new Response(JSON.stringify({summary:"Something went wrong. Please try again.",isError:true}),{status:500,headers:{...corsHeaders,"Content-Type":"application/json"}});
  }
});
