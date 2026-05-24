import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertPhaseEditable } from "@courseflow/core";
import type { PhaseLocks } from "@courseflow/core";
import { getVisualsQueue } from "@/lib/queue";
import { resolveLlmProvider } from "@/lib/llm-provider";
import type { LlmProviderId } from "@courseflow/llm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("phase_locks")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!project) return NextResponse.json({ error: "找不到專案" }, { status: 404 });

  try {
    assertPhaseEditable(project.phase_locks as PhaseLocks, "visual");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 });
  }

  const body = (await req.json()) as { provider?: LlmProviderId };
  const resolved = await resolveLlmProvider(supabase, user.id, body.provider);
  const provider = resolved.ok ? resolved.provider : null;

  const { data: jobRun } = await supabase
    .from("job_runs")
    .insert({
      project_id: id,
      user_id: user.id,
      job_type: "generate-visuals",
      payload: { provider },
    })
    .select()
    .single();

  try {
    await getVisualsQueue().add("visuals", {
      projectId: id,
      userId: user.id,
      jobRunId: jobRun?.id,
      hasApiKey: resolved.ok,
    });
  } catch {
    /* fallback */
  }

  return NextResponse.json({ ok: true, jobRunId: jobRun?.id });
}
