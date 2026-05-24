import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PhaseLocks } from "@courseflow/core";
import { getRenderQueue } from "@/lib/queue";

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

  const body = (await req.json()) as { kind?: "preview" | "export" };
  const kind = body.kind ?? "preview";

  const { data: project } = await supabase
    .from("projects")
    .select("phase_locks")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!project) return NextResponse.json({ error: "找不到專案" }, { status: 404 });

  const locks = project.phase_locks as PhaseLocks;
  if (!locks.visual) {
    return NextResponse.json({ error: "請先鎖定階段 3（視覺動效）" }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("render_jobs")
    .insert({
      project_id: id,
      user_id: user.id,
      kind,
      status: "pending",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await getRenderQueue().add("render", {
      projectId: id,
      userId: user.id,
      renderJobId: job.id,
      kind,
    });
  } catch {
    /* worker fallback */
  }

  return NextResponse.json({ renderJob: job });
}
