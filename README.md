# CourseFlow

多租戶 SaaS 教學影片生成平台：從教學文件 → 大綱/步驟/口說稿 → TTS/字幕 → WYSIWYG 視覺 → 瀏覽器播放器 + HyperFrames MP4。

## 架構

```
apps/web      Next.js Studio + API
apps/worker   BullMQ（背景任務佇列）+ TTS / HyperFrames 渲染
packages/*    core, db, llm, tts, composition, wvp-bridge, hf-bridge, player, shared
skills/       vendored web-video-presentation
supabase/     Postgres migrations + RLS
```

## 快速開始

### 1. 依賴

- Node.js 22+
- pnpm 9+
- Supabase 專案
- Redis（Upstash 或本機，供 worker）
- FFmpeg + Chrome（worker 端 HyperFrames 渲染）

### 2. 環境變數

複製 `.env.example` 為 `apps/web/.env.local` 與 `apps/worker/.env`：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=redis://127.0.0.1:6379
API_KEY_ENCRYPTION_SECRET=請換成長隨機字串
```

### 3. 資料庫

```bash
supabase db push
# 或在 Supabase Dashboard SQL Editor 執行 supabase/migrations/*.sql
```

建立 Storage bucket：`courseflow-assets`（私有）。

### 4. 安裝與開發

```bash
pnpm install
pnpm --filter @courseflow/core build
pnpm --filter @courseflow/shared build
pnpm --filter @courseflow/db build
pnpm --filter @courseflow/wvp-bridge build
pnpm --filter @courseflow/llm build
pnpm --filter @courseflow/tts build
pnpm --filter @courseflow/composition build
pnpm --filter @courseflow/hf-bridge build
pnpm --filter @courseflow/player build
pnpm dev
```

預設 **只啟動 Web**（不會常駐 Worker，避免 BullMQ 空轉耗盡 Upstash 指令額度）。  
本機 `apps/web/.env.local` 建議設 `COURSEFLOW_INLINE_JOBS=1`，批次 TTS 會在 Web 進程內同步完成，無需 Worker。

需要 **MP4 匯出** 或 **佇列版 TTS** 時，另開終端：

```bash
pnpm dev:worker
```

並將 `COURSEFLOW_INLINE_JOBS` 移除或設為 `0`，且兩邊使用相同 `REDIS_URL`。

### 5. WVP Skill 同步

```bash
pnpm sync-wvp
```

## 部署到 Render

完整步驟（Git、Supabase、環境變數、Blueprint 連結）見 **[docs/DEPLOY-RENDER.md](./docs/DEPLOY-RENDER.md)**。

專案根目錄已有 `render.yaml`（Web + Worker Docker）與 `Dockerfile.web` / `Dockerfile.worker`。

## 三階段工作流

| 階段 | 路徑 | 功能 |
|------|------|------|
| 1 文稿 | `/projects/[id]/content` | 上傳文件、AI 大綱/口說稿、樹狀編輯、鎖定 |
| 2 語音 | `/projects/[id]/audio` | 多供應商 TTS、字幕 WYSIWYG、鎖定 |
| 3 視覺 | `/projects/[id]/visual` | 主題、Konva WYSIWYG、動畫/轉場、鎖定 |
| 輸出 | `/projects/[id]/play` / `export` | 瀏覽器播放器、Draft/Full MP4 |

鎖定規則：解鎖階段 1 → 連鎖解鎖 2、3；解鎖階段 2 → 僅解鎖 3。

## 部署

- **Web**：Vercel（`apps/web`）
- **Worker**：Render / Fly.io（Node 22 + FFmpeg + Redis）

## 授權

Private — CourseFlow
