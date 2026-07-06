// Supabase Edge Function: AI session-plan generation.
// Runs with the CALLER's JWT — all reads/writes go through RLS, so the AI
// can only see this coach's drills and their own linked players' data.
//
// Deploy:  supabase functions deploy generate-plan
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//          supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6   (optional override)

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });

const MAX_ITEMS = 12;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    // --- auth: client scoped to the calling user, RLS enforced ---
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Not signed in." }, 401);
    if (!Deno.env.get("ANTHROPIC_API_KEY")) {
      return json({ error: "ANTHROPIC_API_KEY is not set — run: supabase secrets set ANTHROPIC_API_KEY=..." }, 500);
    }

    const { athleteId, focus, durationMin } = await req.json().catch(() => ({}));
    const targetMin = Number(durationMin) > 0 ? Number(durationMin) : 60;

    // --- gather the coach's real drill library (RLS: only their drills) ---
    const { data: drills, error: dErr } = await supabase
      .from("drills")
      .select("id, title, description, skill_tags, difficulty, duration_min");
    if (dErr) return json({ error: dErr.message }, 400);
    if (!drills || drills.length === 0) {
      return json({ error: "Your drill library is empty — add drills before generating a session." }, 400);
    }

    // --- gather player context (all RLS-scoped to this coach's players) ---
    let playerContext = "No specific player — plan a general group session.";
    let athleteName = "";
    if (athleteId) {
      const [{ data: prof }, { data: goals }, { data: notes }, { data: logs }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", athleteId).single(),
        supabase.from("goals").select("title, status").eq("athlete_id", athleteId).eq("status", "active").limit(5),
        supabase.from("coach_notes").select("note_date, body").eq("athlete_id", athleteId)
          .order("note_date", { ascending: false }).limit(5),
        supabase.from("progress_logs").select("log_date, metric, value").eq("athlete_id", athleteId)
          .order("log_date", { ascending: false }).limit(8),
      ]);
      if (!prof) return json({ error: "Player not found, or not linked to you." }, 400);
      athleteName = prof.full_name;
      playerContext = [
        `Player: ${prof.full_name}`,
        goals?.length ? `Active goals: ${goals.map((g) => g.title).join("; ")}` : "",
        notes?.length ? `Recent coach notes: ${notes.map((n) => `[${n.note_date}] ${n.body}`).join(" | ")}` : "",
        logs?.length ? `Recent progress: ${logs.map((l) => `${l.metric}${l.value != null ? `=${l.value}` : ""}`).join(", ")}` : "",
      ].filter(Boolean).join("\n");
    }

    // --- ask Claude to compose ONLY from the provided drill IDs ---
    const drillCatalog = drills.map((d) =>
      `- id:${d.id} | ${d.title} | tags:${(d.skill_tags ?? []).join(",") || "none"} | ${d.difficulty} | ${d.duration_min ?? "?"} min | ${d.description ?? ""}`
    ).join("\n");

    const prompt = `You are an expert tennis coach planning a ${targetMin}-minute session.

${playerContext}
${focus ? `Session focus requested by the coach: ${focus}` : ""}

Compose the session ONLY from these drills (use the exact id values; do not invent drills):
${drillCatalog}

Structure it like a real lesson: warm-up first, main technical/tactical work, finish with points play or cool-down where suitable drills exist. Total duration should be close to ${targetMin} minutes.

Respond with ONLY a JSON object, no markdown fences, no other text:
{"title": "...", "objectives": "...", "items": [{"drill_id": "...", "duration_min": number, "coaching_points": "..."}]}`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!aiRes.ok) {
      const detail = await aiRes.text();
      console.error("Anthropic API error:", detail);
      return json({ error: "The AI service returned an error — try again shortly." }, 502);
    }
    const aiData = await aiRes.json();
    const text = (aiData.content ?? [])
      .map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : ""))
      .join("");

    // --- defensive parse + validation: hallucinated drills are rejected ---
    let parsed: { title?: string; objectives?: string; items?: Array<{ drill_id: string; duration_min?: number; coaching_points?: string }> };
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      return json({ error: "The AI response couldn't be read — try again." }, 502);
    }
    const validIds = new Set(drills.map((d) => d.id));
    const items = (parsed.items ?? [])
      .filter((i) => i && validIds.has(i.drill_id))
      .slice(0, MAX_ITEMS);
    if (items.length === 0) {
      return json({ error: "The AI couldn't build a session from your drill library — add more (well-tagged) drills." }, 422);
    }

    // --- persist as a draft plan for the coach to review (RLS applies) ---
    const title = (parsed.title ?? "").trim() ||
      `AI session${athleteName ? ` — ${athleteName}` : ""}`;
    const { data: plan, error: pErr } = await supabase.from("session_plans")
      .insert({
        coach_id: user.id, athlete_id: athleteId ?? null,
        title: title.slice(0, 120),
        objectives: (parsed.objectives ?? "").slice(0, 1000) || null,
        ai_generated: true,
      })
      .select("id").single();
    if (pErr) return json({ error: pErr.message }, 400);

    const rows = items.map((i, idx) => ({
      plan_id: plan.id, drill_id: i.drill_id, sort_order: idx + 1,
      duration_min: Number(i.duration_min) > 0 ? Number(i.duration_min) : null,
      coaching_points: (i.coaching_points ?? "").slice(0, 500) || null,
    }));
    const { error: iErr } = await supabase.from("session_plan_items").insert(rows);
    if (iErr) {
      // Don't leave an empty shell plan behind.
      await supabase.from("session_plans").delete().eq("id", plan.id);
      return json({ error: iErr.message }, 400);
    }

    return json({ planId: plan.id });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong generating the plan." }, 500);
  }
});
