export type LlmProviderId = "openai" | "gemini" | "openrouter";

export interface LlmCredentials {
  provider: LlmProviderId;
  apiKey: string;
  model?: string;
}

export interface GeneratedChapter {
  title: string;
  sortOrder: number;
  children?: GeneratedChapter[];
  steps: GeneratedStep[];
}

export interface GeneratedStep {
  screenContent: string;
  infoPool: string[];
  estimatedSeconds: number;
  script?: string;
}

export interface GeneratedOutline {
  chapters: GeneratedChapter[];
  summary: string;
}
