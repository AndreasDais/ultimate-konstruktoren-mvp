import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { request_id, calculation_type } = await request.json();

    if (!request_id) {
      return Response.json(
        { error: "Manglar request_id" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("calculation_runs")
      .insert({
        request_id,
        calculation_type: calculation_type ?? null,
        run_status: "running",
        agent_package_version: "agents_v0.2",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Klarte ikkje opprette calculation_run:", error);
      return Response.json(
        { error: "Klarte ikkje opprette berekningskøyring" },
        { status: 500 }
      );
    }

    return Response.json({ run_id: data.id });
  } catch (err) {
    console.error("init-run error:", err);
    const errorMessage = err instanceof Error ? err.message : "Ukjent feil";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}