import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, operation_id, conversation_history } = await req.json();
    if (!question || !operation_id) {
      return new Response(
        JSON.stringify({ error: "question and operation_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Gather operation context data
    const [animalsRes, calvingRes, cowWorkRes, flagsRes, groupsRes] = await Promise.all([
      supabase.from("animals").select("id, tag, tag_color, sex, breed, status, year_born, type, birth_date").eq("operation_id", operation_id).limit(500),
      supabase.from("calving_records").select("id, calving_date, calf_sex, calf_status, birth_weight, assistance, sire_id, calf_tag, dam_id").eq("operation_id", operation_id).limit(500),
      supabase.from("cow_work").select("id, date, animal_id, preg_stage, project_id, weight, breeding_sire_id, pass_fail, scrotal, quality").eq("operation_id", operation_id).limit(500),
      supabase.from("animal_flags").select("id, animal_id, flag_name, flag_tier, flag_note, created_at, resolved_at").eq("operation_id", operation_id).is("resolved_at", null).limit(500),
      supabase.from("groups").select("id, name, cattle_type, group_type").eq("operation_id", operation_id).limit(100),
    ]);

    const contextData = {
      animals_count: animalsRes.data?.length ?? 0,
      animals_sample: (animalsRes.data ?? []).slice(0, 100),
      calving_records_count: calvingRes.data?.length ?? 0,
      calving_records: calvingRes.data ?? [],
      cow_work_count: cowWorkRes.data?.length ?? 0,
      cow_work_records: cowWorkRes.data ?? [],
      active_flags: flagsRes.data ?? [],
      groups: groupsRes.data ?? [],
    };

    const currentYear = new Date().getFullYear();

    const systemPrompt = `You are an AI assistant for a cattle operation management app called HerdWork. You analyze operation data and generate reports. The current year is ${currentYear}.

CRITICAL DATE RULE: When a user asks a question without specifying a year or date range, ALWAYS default to the current year (${currentYear}). Filter calving_records by calving_date in ${currentYear}, cow_work by date in ${currentYear}, treatments by date in ${currentYear}. Examples:
- "How many calves do we have?" means calves born in ${currentYear}
- "What's our open rate?" means from the most recent preg check in ${currentYear}
- "Show me death loss" means ${currentYear} calving season death loss
- "Compare calf weights by sire" means ${currentYear} calf weights only
If the user explicitly asks for a different year or a multi-year range ("last 3 years", "since 2020", "in 2024"), use their specified range instead. But the DEFAULT is always current year.

You have access to the following data for this operation:
- ${contextData.animals_count} animals (sample provided)
- ${contextData.calving_records_count} calving records
- ${contextData.cow_work_count} cow work records (preg checks, BSEs, treatments)
- ${contextData.active_flags.length} active flags
- ${contextData.groups.length} groups

TERMINOLOGY: Use ranching language in responses. Say "bag" not "udder", "calving ease" not "calving difficulty", "shipped" not "sold", "doctored" not "treated", "open" not "not pregnant". Never say "dam" — say "cow" or "heifer".

DATA:
${JSON.stringify(contextData, null, 1)}

RESPONSE FORMAT: You MUST respond with valid JSON only. No markdown, no code blocks. The JSON must have these fields:
{
  "summary": "Your text answer with line breaks as \\n",
  "chart_config": null or { "chart_type": "bar"|"pie"|"line"|"stacked_bar", "title": "string", "data": [...], "x_axis": "key", "y_axis": "key" },
  "table_data": null or { "headers": ["col1","col2"], "rows": [["val1","val2"]] },
  "follow_up_suggestions": ["suggestion 1", "suggestion 2"]
}

Include chart_config when the data is best visualized as a chart. Include table_data when there's tabular data to show. Always include 2-3 follow_up_suggestions that reference the current year (${currentYear}).
Be concise, specific, and data-driven. Use actual numbers from the data provided.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversation_history ?? []).slice(-8),
      { role: "user", content: question },
    ];

    if (!anthropicKey) {
      // Fallback: return a helpful message without AI
      return new Response(
        JSON.stringify({
          summary: `I received your question: "${question}"\n\nHere's what I found in your operation data:\n• ${contextData.animals_count} animals in the system\n• ${contextData.calving_records_count} calving records\n• ${contextData.cow_work_count} cow work records\n• ${contextData.active_flags.length} active flags\n\nTo enable full AI-powered analysis, please add an ANTHROPIC_API_KEY to your Supabase Edge Function secrets.`,
          chart_config: null,
          table_data: null,
          follow_up_suggestions: ["Show herd inventory", "List active flags", "Calving summary"],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages.filter((m) => m.role !== "system").map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Anthropic API error:", errText);
      throw new Error("AI service error");
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.content?.[0]?.text ?? "";

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = {
        summary: rawContent,
        chart_config: null,
        table_data: null,
        follow_up_suggestions: [],
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-report error:", err);
    return new Response(
      JSON.stringify({ summary: "Something went wrong. Please try again.", isError: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
