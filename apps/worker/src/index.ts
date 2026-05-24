import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workerRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(workerRoot, ".env") });

import { Worker } from "bullmq";
import { createRedisConnection, QUEUE_NAMES } from "@courseflow/shared";
import { processRender, processSynthesizeAudio } from "./processors.js";

async function main() {
  const connection = createRedisConnection();

  new Worker(
    QUEUE_NAMES.audio,
    async (job) => {
      if (job.name === "synthesize") await processSynthesizeAudio(job.data);
    },
    { connection },
  );

  const renderWorker = new Worker(
    QUEUE_NAMES.render,
    async (job) => {
      if (job.name === "render") await processRender(job.data);
    },
    { connection },
  );

  renderWorker.on("failed", (job, err) => {
    console.error(`[render] 佇列任務失敗 ${job?.id ?? "?"}:`, err?.message ?? err);
  });

  console.log("CourseFlow worker 已啟動");
}

main().catch(console.error);
