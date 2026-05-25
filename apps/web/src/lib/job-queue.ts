/** 本機不跑 worker 時設為 1：TTS 改由 Web API 同步處理，不寫入 BullMQ（省 Redis 指令）。 */
export function shouldUseJobQueue(): boolean {
  if (process.env.COURSEFLOW_INLINE_JOBS === "1") return false;
  return Boolean(process.env.REDIS_URL?.trim());
}
