import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONTEXT_PROMPTS: Record<string, string> = {
  calving: `Extract calving records from this image. Return a JSON object with:
- "records": array of objects with keys: "Dam Tag", "Date", "Calf Sex", "Weight", "Status", "Assistance", "Sire", "Notes"
- "confidence": "high", "medium", or "low"
- "notes": any issues or uncertainties
Date format: YYYY-MM-DD. Calf Sex: "Bull" or "Heifer". Status: "Alive" or "Dead". Assistance: 1-5 (1=unassisted).`,

  treatment: `Extract treatment records from this image. Return a JSON object with:
- "records": array of objects with keys: "Tag", "Date", "Disease", "Products", "Notes"
- "confidence": "high", "medium", or "low"
- "notes": any issues
Date format: YYYY-MM-DD. Products as comma-separated string.`,

  tally: `Extract tally/count records from this image. Return a JSON object with:
- "records": array of objects with keys: "Tag", "EID", "Value", "Category", "Notes"
- "confidence": "high", "medium", or "low"
- "notes": any issues`,

  receipt: `Extract sale receipt line items from this image. Return a JSON object with:
- "records": array of objects with keys: "Tag", "Weight", "Price/lb", "Total", "Description"
- "confidence": "high", "medium", or "low"
- "notes": any issues`,

  general: `Extract structured data from this image of handwritten or printed records. Return a JSON object with:
- "headers": array of column names you detect
- "records": array of objects using those column names as keys
- "confidence": "high", "medium", or "low"
- "notes": any issues`,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_base64, media_type, context, operation_id } = await req.json();

    if (!image_base64 || !context) {
      return new Response(JSON.stringify({ error: "image_base64 and context are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = CONTEXT_PROMPTS[context] || CONTEXT_PROMPTS.general;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: media_type || "image/jpeg",
                  data: image_base64,
                },
              },
              {
                type: "text",
                text: systemPrompt + "\n\nReturn ONLY valid JSON, no markdown fences.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const text = aiResult.content?.[0]?.text || "{}";

    // Parse JSON from response (strip markdown fences if present)
    let parsed;
    try {
      const cleaned = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { records: [], confidence: "low", notes: "Could not parse AI response" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("photo-extract error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
