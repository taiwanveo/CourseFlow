/** BullMQ 5+ 不允許佇列名稱含 `:`，Web 與 Worker 共用此常數。 */
export const QUEUE_NAMES = {
  content: "courseflow-content",
  audio: "courseflow-audio",
  subtitles: "courseflow-subtitles",
  visuals: "courseflow-visuals",
  render: "courseflow-render",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
