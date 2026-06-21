# CLAUDE.md(WorkShop 專案)

This file provides guidance to AI coding agents (Claude Code, Gemini CLI,
OpenAI Codex / AGENTS.md-compatible) when working on this **WorkShop** project.
It is the **single authoritative specification** for all AI-assisted workflows
inside this folder.

> **專案憲法**:本檔是 WorkShop 專案內所有 AI 引擎的唯一規範來源。
> 專案根的 `GEMINI.md`、`AGENTS.md` 都是 **10 bytes 純指路檔**,內容只有一行 `CLAUDE.md`。
> 任何 AI 工具讀到對應入口檔,會被引導至本檔。

---

## Project Overview

**WorkShop** 是「好學生筆記方法論」的**實踐推廣**項目。本專案的單一交付物 =
設計與舉辦兩小時內訓工作坊,讓 daily AI users 體驗「**在原稿上做筆記** vs
**在新頁面開摘要**」的學習觀點差異。

工作坊設計詳見 [`docs/workshop-design-v4.md`](./docs/workshop-design-v4.md)。

## 獨立性政策

WorkShop 是自包含專案,所有腳本與規則檔本地齊備,無外部依賴。

**鐵律**:
1. 所有腳本**只引用 WorkShop/ 內檔**,絕不 import 或 source 外部專案路徑
2. 任何 AI agent 看到絕對路徑(如 `/Users/.../<other-project>/`)在引用流程裡,**應視為錯誤**,改成 WorkShop 本地路徑
3. Meta-Loop **不做網頁出版**,交付形式為純 markdown(email body 或 .md 附件)

---

## 工作坊設計核心(從 docs/workshop-design-v4.md 抽要)

### 招生宣言(權威來源 = `materials/recruitment/announcement.md`)

> **好學生筆記:我們期待給你的是不同的學習觀點。**
> 同時讓新的科技幫助你在學習的速度與深度更快速的內化,
> 讓我們也一同討論這個學習結果的未來與下一步。

### 三道哲學提問(現場與招生敘事貫穿)

> **Q1**:我們什麼時候會成為學生?
>
> **Q2**:怎麼把「獲得」給落實?「獲得」在掌握程度有什麼樣的分類?是否需要將所有的學習都昇華成為反射?該做的練習與複習的方式與工具是什麼?
>
> **Q3**:在時間有限的情況下,透過『語言模型』這樣新的工具,我們該用來賦能、協作與加速在學習這件事情的內化 roadmap 上,是否有一種全新的體驗能夠來試試看?

字面 wording **不可變**(W1 lint 規則會比對三處一致性,見 § Lint)。

### 核心觀念樞紐:摘要 vs 筆記 不同物種

| | 摘要(NBLM / Gemini / ChatGPT TL;DR) | 筆記(傳統人類 / 好學生筆記) |
|---|---|---|
| 位置 | **新開一頁** | **在原稿上** |
| 形式 | 條列、節錄、目錄式 | 重點劃線、邊欄註記、重複強調、立場註寫 |
| 結構 | 像「目錄」 | 像「閱讀軌跡」 |
| 關係於原稿 | 替代 | 增厚 |
| 對「獲得」的貢獻 | 知道(最淺) | 從知道一路通到反射 |

**好學生筆記** = 把 AI 帶到「在原稿上做筆記」的位置,而非「另開一頁做摘要」。

### 兩小時節目單摘要

| 時段 | 主題 | 時長 |
|---:|---|---:|
| 0:00–0:10 | 開場 + Q1 質問 + Meta-Loop 揭示 | 10 |
| 0:10–0:25 | 物種 reframe(共同錄音對照) | 15 |
| 0:25–0:55 | 紙本慢讀體驗 | 30 |
| 0:55–1:10 | Q2 對話 | 15 |
| 1:10–1:30 | 動手:碎形切片 + Step 1-2 | 20 |
| 1:30–1:55 | 動手:Step 3 旁註 + Step 4 立場 | 25 |
| 1:55–2:00 | Q3 引線 + 結語 + Meta-Loop 預告 | 5 |

詳節目細節見 `docs/workshop-design-v4.md`。

---

## Step 1-4 系統

工作坊跑 Meta-Loop 時(把上課錄影轉成好學生筆記)使用本專案的 Step 1-4:

### Step 1-2(轉錄 + Phase A 清理 + Phase B 校稿)
- 工具:`scripts/session.py new <audio>`
- 規則:`prompts/qaqc_core_rules.md` § R1 (Phase A) + § R2 (Phase B)
- 鐵律:**零省略**(95-105% 字數帶),**SRT 不可變**

### Step 3(知識補充)+ Step 4(立場置入)
- 規則:`prompts/qaqc_core_rules.md` § R3 / R4
- 工作坊用法:現場讓觀眾**親手在自己 cleaned.md 上做 Step 3 旁註與 Step 4 立場**

### 好學生筆記圖像版 (生圖機制)
- 規則:`prompts/image_notes_design.md` (6色手寫語義與類比庫) + `prompts/image_notes_skill.md` (生圖 SOP)
- 流程：
  1. **Stage 1 (生底稿)**: `python3 scripts/image_notes_session.py note <file.md>` -> 用 Playwright 渲染成 A4 尺寸 `base_pNN.png`
  2. **Stage 2 (生圖指令)**: `python3 scripts/image_notes_session.py notes <slug> --identity "<身份>"` -> 產生 `banana_prompts_<身份>.md`
  3. **生圖**:
     - **Antigravity IDE / Codex**: 執行端會使用 `generate_image` 工具（Imagen 2）吃底圖並根據 prompt 疊加手寫字，產出視覺化好學生筆記（`pNN.png`）。
     - **Gemini CLI**: 使用 `nanobanana` extension。
     - **手動**: 拖入 Nano Banana 工具生圖。

### Meta-Loop 交付
- WorkShop **不出網頁**。Step 4 產出的 markdown (cleaned.md /
  enhanced.md / notes_<identity>.md 任一終點) 或上述圖像版好學生筆記**直接寄給觀眾**(email body
  或 .md / .png 附件)
- 招生宣傳的承諾文字:「一週內收到一份好學生筆記」(不可暗示有網頁連結)
- 時程約束見 W5 SLA


---

## WorkShop 專屬:Lint(W1-W5)

工作坊有自己的產出對齊規則(W 系列),與 R 系列(轉錄/校稿規則)正交:

| Lint | 規則 | 自動化 |
|---|---|---|
| **W1** 招生敘事字面一致 | 三道提問在 announcement / poster / opening-slides 三處字面完全一致 | string diff |
| **W2** 共同錄音三件套 | `materials/common-recording/<event>/{audio.mp3, cleaned.md, notebooklm-summary.md}` 必存且對齊 | 檔案存在 + cleaned.md 通過 R2.3 |
| **W3** 紙本母版來源一致 | `materials/paper-handout/<event>/source.md` 是 common-recording cleaned.md 的全文或選段 | 子集檢查 |
| **W4** 報名表↔節目單時長對齊 | registration-form.md 的時長要求 = sessions/<run>/schedule.md 的時長承諾 | regex 抽數字比對 |
| **W5** Meta-Loop 交付 SLA | 錄影→cleaned.md ≤ 48hr;cleaned.md→寄送觀眾 ≤ 7 天 | metadata 時間戳比對 |

**SSoT**:`prompts/workshop_qaqc.md`(W 規則定義 + lint 操作指南)
**自動化**:`python3 scripts/workshop_lint.py`(支援 `--rule W1`、`--event <slug>`)

---

## 流程總覽

```
[招生階段]
  寫 materials/recruitment/{announcement.md, poster-source.md, registration-form.md}
  跑 workshop_lint.py --rule W1
       ↓ (全綠)
[預備階段]
  寫 materials/common-recording/<event>/{audio.mp3 + cleaned.md + notebooklm-summary.md}
  寫 materials/paper-handout/<event>/source.md
  跑 workshop_lint.py --rule W2,W3
       ↓ (全綠)
[實際工作坊]
  建 sessions/<run>/  含 schedule.md, opening-slides.md
  跑 workshop_lint.py --rule W1,W4
       ↓ (全綠)
  舉行工作坊,錄影
       ↓
[Meta-Loop 後處理]
  錄影 → Step 1-4 → 整理 markdown
  跑 workshop_lint.py --rule W5 --event <run>
       ↓ (全綠)
  寄 .md 給觀眾(email body / 附件)
```

---

## 目錄結構

```
WorkShop/
├── CLAUDE.md / GEMINI.md / AGENTS.md / README.md  # 規範與導引
├── LICENSE / LICENSE-CONTENT / NOTICE             # 雙軌授權
├── docs/
│   └── workshop-design-v4.md   # 工作坊定案(2 小時設計細節)
├── scripts/                    # session.py/qaqc_phase_b.py/qaqc_srt.py/workshop_lint.py/image_notes_session.py/md_to_a4_png.py
├── prompts/                    # qaqc_core_rules.md(R 系列)/workshop_qaqc.md(W 系列)/image_notes_design.md/image_notes_skill.md
├── dict/                       # 共用詞典(typo_dict.json + hallucination_prefixes.json)
├── .claude/skills/             # good-student-notes CLI skill
├── .agent/workflows/           # Antigravity IDE /note 與 /好學生筆記 工作流指令
├── .gemini/commands/           # Gemini CLI note 與 好學生筆記 自訂指令
├── materials/                  # 工作坊預備材料
│   ├── common-recording/<event>/
│   ├── paper-handout/<event>/
│   └── recruitment/
└── sessions/<run-slug>/        # 實際工作坊跑場(逐字稿、cleaned.md、metadata.json)
```


---

## API Keys

- 存在專案根 `.env`(gitignored)
- 範本:`.env.example`
- 格式:
  ```
  GROQ_API_KEY=<your-key>
  GEMINI_API_KEY=<your-key>
  ```

## Runtime Dependencies

- **Python ≥ 3.10**、**ffmpeg**(brew install ffmpeg)、**pip install requests**
- **網路連線**:Groq + Gemini API

---

## 雙軌授權

- **程式碼**:MIT(`LICENSE`)
- **內容**(站台文案、講者逐字稿、好學生筆記):CC BY 4.0(`LICENSE-CONTENT`)
- **講者話語**:歸講者個別所有,經授權刊載

詳見 `NOTICE`。

---

## Common Gotchas(WorkShop 特定)

1. **Groq Whisper prompt 896 bytes UTF-8 上限** — 中文字 3 bytes/字 → context ≤ ~290 中文字。送 Groq 前用 `wc -c` 確認。
2. **共同錄音的時長選擇** — 過短(<10 min)NBLM vs 好學生筆記的對比不明顯。建議 30-60 min。
3. **紙本印刷必須留邊欄** — 給觀眾寫字,左右邊各 4cm,字行距 1.8 倍。
4. **Meta-Loop 失約 = 信任崩塌** — 答應一週寄出就不能拖。若做不到,寧可不承諾。

## 變更紀錄

- **2026-05-26 v0**:WorkShop 專案骨架初版
