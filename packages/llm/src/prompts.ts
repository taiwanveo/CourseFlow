import type { GeneratedOutline } from "./types.js";

export const OUTLINE_SYSTEM_PROMPT = `你是資深大學教授與教學影片總編，擅長把學術／技術原文轉成「Web Video Presentation」節奏的大綱。

核心原則：
1. **螢幕文字（screenContent）≠ 口說稿**：螢幕是「一張簡報投影片」，在**同一個 step** 內完整呈現一個概念的重點，供觀眾閱讀；口說由後續步驟另行撰寫，禁止把口說全文貼上螢幕。
2. **螢幕內容不可只有一行字**：每步 screenContent 必須是結構化多行文字，至少包含：
   - 一行**小標或核心概念**（8~20 字）
   - 加上 **2~5 行**補充說明：條列重點（可用「·」或「-」開頭）、短句、對照、數字或步驟
   - 整體通常 **3~8 行**、**80~220 字**（視語言而定），讓單張投影片資訊量足夠，但仍是「看」的精簡版，不是口說逐字稿
3. **一步一概念**：每步只聚焦一個教學概念；原文的列表、對照、因果、步驟必須拆成多個 step，不可擠在一步。
4. **節奏**：每步 estimatedSeconds 建議 12~45 秒（依內容深度）；一章累計約 60~180 秒；整體覆蓋原文重點，不可過度精簡。
5. **教學深度**：infoPool 收錄該步可延伸的定義、例子、數據、反例、與前後章的銜接語，供口說稿擴寫使用。
6. **語言**：與使用者指定語言一致；專有名詞首次出現可附簡短解釋。
7. 只規劃節奏與內容結構，不規劃動畫。
8. 輸出合法 JSON，勿 markdown 包裹。`;

export function buildOutlineUserPrompt(article: string, language: string): string {
  return `語言：${language}

教學原文（請完整消化，勿遺漏重要論點）：
"""
${article.slice(0, 120000)}
"""

請輸出 JSON：
{
  "summary": "200~400 字課程總覽：學習目標、受眾、全課敘事弧線",
  "chapters": [
    {
      "title": "章節標題",
      "sortOrder": 0,
      "steps": [
        {
          "screenContent": "第一行：本步核心概念小標\\n· 重點一（短句）\\n· 重點二（短句）\\n· 重點三或簡短結論",
          "infoPool": ["延伸資訊1", "例子或數據", "與他章連結"],
          "estimatedSeconds": 25
        }
      ],
      "children": []
    }
  ]
}`;
}

export const SCRIPT_SYSTEM_PROMPT = `你是經驗豐富的大學教授，正在錄製高品質線上課程口說。你的語氣清晰、有層次、有熱忱，會用比喻與例子幫助理解。

硬性規則：
1. **禁止**只是複誦螢幕上的字；口說必須補充脈絡、定義、為何重要、如何應用。
2. 每步口說稿 **至少 4 句、建議 6~10 句**（約 80~200 字，視語言而定），可自然分成 2~3 個短段。
3. 開頭可用過渡語承接上一步；結尾可預告下一步或總結本步重點。
4. 善用 infoPool 與課程摘要中的材料；可加入「舉例來說」「換句話說」「這裡的重點是」等教學用語。
5. 保持原文語言，口語但專業，不要 markdown，不要列點符號開頭的機械朗讀。
6. 輸出 JSON：{ "scripts": [ { "stepIndex": 0, "script": "..." } ] }，stepIndex 從 0 對應步驟陣列順序。`;

export function buildScriptUserPrompt(
  steps: { id: string; screenContent: string; infoPool: string[] }[],
  context: { language: string; summary: string; articleExcerpt: string },
): string {
  return `語言：${context.language}

課程摘要：
${context.summary}

原文摘錄（供你補充口說深度，勿逐字照念螢幕）：
"""
${context.articleExcerpt.slice(0, 24000)}
"""

為以下步驟撰寫教授級口說稿。螢幕文字僅供對照，口說必須明顯比螢幕更豐富。

步驟：
${JSON.stringify(
    steps.map((s, i) => ({
      stepIndex: i,
      screenContent: s.screenContent,
      infoPool: s.infoPool,
    })),
    null,
    2,
  )}`;
}

export function parseOutlineJson(text: string): GeneratedOutline {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(cleaned) as GeneratedOutline;
  if (!parsed.chapters?.length) {
    throw new Error("LLM 未產生有效章節");
  }
  return parsed;
}

export function parseScriptsJson(
  text: string,
): { stepIndex: number; script: string }[] {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(cleaned) as { scripts: { stepIndex: number; script: string }[] };
  return parsed.scripts ?? [];
}
