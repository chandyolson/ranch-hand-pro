import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeRequest {
  columns: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
  purpose: string;
  purposeDescription?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const { columns, sampleRows, totalRows, purpose, purposeDescription } =
      (await req.json()) as AnalyzeRequest;

    if (!columns || !sampleRows || columns.length === 0) {
      throw new Error("Missing columns or sample data");
    }

    // Build a readable data sample for Claude
    const dataSample = sampleRows
      .map((row, i) => {
        const vals = columns.map((col) => `${col}: "${row[col] || ""}"`).join(", ");
        return `Row ${i + 1}: { ${vals} }`;
      })
      .join("\n");

    const purposeMap: Record<string, string> = {
      merge_herd: "merge with or update existing animals in ChuteSide",
      new_animals: "import as new animals into ChuteSide",
      breed_association: "map to a breed association template for submission",
      clean_export: "clean and standardize for a general-purpose export",
      custom: purposeDescription || "custom use",
    };

    const prompt = `You are an expert cattle data analyst working inside ChuteSide, a livestock management platform. A rancher has uploaded a spreadsheet and needs your help cleaning it.

THEIR GOAL: ${purposeMap[purpose] || purpose}
TOTAL ROWS: ${totalRows}
COLUMNS DETECTED: ${columns.join(", ")}

SAMPLE DATA (up to 30 rows sampled from beginning, middle, and end of file):
${dataSample}

CATTLE DATA KNOWLEDGE — use this to interpret columns and values:
- Tag numbers are ALWAYS strings, never integers. They can have leading zeros (0142), letters (R142), or slashes (23/142).
- Common column names and what they mean: tag/ear tag/visual tag = animal ID, EID/electronic ID = RFID number, reg/registration = breed registry number, lifetime ID = permanent unique ID.
- "Sire" or "Dam" columns often combine name + registration number in one cell (e.g., "SAV Bismarck 5682 - 17898245"). These need splitting.
- Date formats vary wildly: MM/DD/YYYY, M/D/YY, YYYY-MM-DD, or even just a year (2022).
- Sex values: Bull, Steer, Heifer, Cow — but ranchers write B, S, H, C, or bull/steer/heifer/cow.
- Breed codes: AN = Angus, AR = Red Angus, HH = Hereford, SM = Simmental, CH = Charolais, LM = Limousin, GV = Gelbvieh, etc.
- Color/tag color: R = Red, B = Black, Y = Yellow, G = Green, O = Orange, W = White, P = Purple.
- Status values: Active, Sold, Dead, Cull — ranchers write "shipped" for sold, "culled" for removed.
- "Dry" or "Open" = not pregnant. "Short bred" = early pregnancy. "Long bred" = late pregnancy.
- "Pairs" = cow with calf. "Keepers" = replacement heifers.
- Weight columns might be birth weight, weaning weight, yearling weight, or sale weight.
- "ADR" = ain't doin' right (general sick observation).
- "Bangs" = brucellosis vaccination. "Cedars" or "CIDRs" = progesterone implants.

ANALYZE THIS DATA AND RETURN JSON ONLY. No markdown, no backticks, no explanation outside the JSON.

Return this exact structure:
{
  "columns": [
    {
      "name": "exact column name from the data",
      "status": "clean" | "empty" | "inconsistent" | "combined" | "unknown" | "format",
      "description": "plain English explanation of what you found — write this for a rancher, not a programmer",
      "suggestion": "what you recommend doing — be specific",
      "confidence": "high" | "medium" | "low",
      "likelyMapsTo": "the ChuteSide database field this probably maps to, or null if unknown"
    }
  ],
  "overallNotes": "1-2 sentence summary of the data quality for the rancher"
}

Rules:
- Every column in the input MUST appear in your output.
- "clean" means the column looks good, values are consistent, and you know what it is.
- "empty" means all or nearly all values in the sample are blank.
- "inconsistent" means mixed formats, spellings, or value types within the same column.
- "combined" means one column contains multiple pieces of data that should be split.
- "unknown" means you can't confidently identify what this column contains.
- "format" means you know what it is but the format needs standardizing (dates, codes, etc.).
- Be honest about confidence. If you're guessing, say "low."
- Suggestions should be actionable and specific. Not "clean this up" — say exactly what to do.
- likelyMapsTo should use these ChuteSide field names: tag, eid, breed, sex, status, birth_date, year_born, lifetime_id, reg_number, reg_name, name, sire_id, dam_id, origin, type, memo, tag_color, official_id, calf_tag, or null.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Anthropic API error:", response.status, errorBody);
      throw new Error(`Anthropic API returned ${response.status}`);
    }

    const data = await response.json();
    const text = data.content
      .filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("");

    // Parse the JSON response — strip any accidental markdown fences
    const cleaned = text.replace(/```json\s?/g, "").replace(/```/g, "").trim();
    const analysis = JSON.parse(cleaned);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cow Cleaner analysis error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Analysis failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
