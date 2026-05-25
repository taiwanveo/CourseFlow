import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PhaseLocks } from "@courseflow/core";
import { shouldUseJobQueue } from "@/lib/job-queue";
import { getRenderQueue } from "@/lib/queue";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    includeSubtitles?: boolean;
    quality?: "draft" | "standard" | "high";
  };
  const includeSubtitles = body.includeSubtitles !== false;
  const quality =
    body.quality === "draft" || body.quality === "standard" || body.quality === "high"
      ? body.quality
      : "standard";
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

  const locks = project.phase_locks as PhaseLocks;
  if (!locks.visual) {
    return NextResponse.json({ error: "請先鎖定階段 3" }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("render_jobs")
    .insert({
      project_id: id,
      user_id: user.id,
      kind: "export",
      status: "pending",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!shouldUseJobQueue()) {
    await supabase
      .from("render_jobs")
      .update({
        status: "failed",
        progress: 0,
        error_message:
          "本機未啟用佇列（COURSEFLOW_INLINE_JOBS=1）。請執行 pnpm dev:worker 並關閉該變數後再匯出。",
      })
      .eq("id", job.id);
    return NextResponse.json(
      {
        error:
          "MP4 匯出需要 worker。請另開終端執行 pnpm dev:worker，並將 COURSEFLOW_INLINE_JOBS 設為 0 或移除。",
      },
      { status: 503 },
    );
  }

  try {
    await getRenderQueue().add("render", {
      projectId: id,
      userId: user.id,
      renderJobId: job.id,
      kind: "export",
      includeSubtitles,
      quality,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "無法加入渲染佇列";
    await supabase
      .from("render_jobs")
      .update({
        status: "failed",
        progress: 0,
        error_message: `Redis 佇列不可用：${message}。請確認 Redis 已啟動且 worker 正在執行。`,
      })
      .eq("id", job.id);
    return NextResponse.json(
      { error: "無法開始渲染，請確認 worker 與 Redis 已啟動" },
      { status: 503 },
    );
  }

  return NextResponse.json({ renderJob: job });
}
