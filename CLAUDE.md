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

## 與 study/ 主專案的關係(獨立性政策)

WorkShop **fork** 自鄰近的 study/ 主專案(`/Users/shuotaochiang/Desktop/study/`),
時間點:**2026-05-26**。

| 從 study/ fork 的內容 | 政策 |
|---|---|
| `scripts/{session.py, qaqc_phase_b.py, publish_qaqc.py, publish_goodedunote.sh, compress_images.py, lang/}` | hard copy,**不互相依賴執行** |
| `prompts/{qaqc_core_rules.md, publish_qaqc.md}` | hard copy,本地是 SSoT |
| `dict/`、`SRT/`、`.claude/skills/good-student-notes/` | hard copy |
| `LICENSE`, `LICENSE-CONTENT`, `NOTICE`, `docs/origin-story.md` | hard copy(授權與緣起一致) |

**鐵律**:
1. WorkShop 內所有腳本**只引用 WorkShop/ 內檔**,絕不 import / source study/
2. study/ 之後若更新這些檔,WorkShop **不自動同步**;需人工 diff + apply
3. WorkShop 與 study/ 是 sibling 目錄,**.gitignore 互不重疊**,彼此私資料互不干擾
4. 任何在 WorkShop 內的 AI agent 看到指向 `/Users/shuotaochiang/Desktop/study/` 的路徑,**應視為錯誤**,並改成 WorkShop 本地路徑

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

## Step 1-5 系統(承襲 study,規則不變)

工作坊跑 Meta-Loop 時(把上課錄影轉成好學生筆記)使用本專案的 Step 1-5:

### Step 1-2(轉錄 + Phase A 清理 + Phase B 校稿)
- 工具:`scripts/session.py new <audio>`
- 規則:`prompts/qaqc_core_rules.md` § R1 (Phase A) + § R2 (Phase B)
- 鐵律:**零省略**(95-105% 字數帶),**SRT 不可變**

### Step 3(知識補充)+ Step 4(立場置入)
- 規則:`prompts/qaqc_core_rules.md` § R3 / R4
- 工作坊用法:現場讓觀眾**親手在自己 cleaned.md 上做 Step 3 旁註與 Step 4 立場**

### Step 4.5 / 6(出版前後 QAQC)
- 規則:`prompts/publish_qaqc.md` § S4.5 / § S6
- 工具:`scripts/publish_qaqc.py`(出版後 audit)

### Step 5(出版到 Firebase goodedunote)
- 工具:`scripts/publish_goodedunote.sh`(把 Meta-Loop 產出的 cleaned.md 上線)
- 部署目標:沿用 study/ 同一個 Firebase 專案 `goodedunote`
- 注意:WorkShop 的出版內容會放在獨立的 slug(例如 `workshop-<run-slug>`),
  不與 study 既有的 koshi-cafe / code-with-claude-london / bim-revit-mcp 衝突

---

## WorkShop 專屬:Lint(W1-W6)

工作坊有自己的產出對齊規則,獨立於 study 的 R / S 系列:

| Lint | 規則 | 自動化 |
|---|---|---|
| **W1** 招生敘事字面一致 | 三道提問在 announcement / poster / opening-slides 三處字面完全一致 | string diff |
| **W2** 共同錄音三件套 | `materials/common-recording/<event>/{audio.mp3, cleaned.md, notebooklm-summary.md}` 必存且對齊 | 檔案存在 + cleaned.md 通過 R2.3 |
| **W3** 紙本母版來源一致 | `materials/paper-handout/<event>/source.md` 是 common-recording cleaned.md 的全文或選段 | 子集檢查 |
| **W4** 報名表↔節目單時長對齊 | registration-form.md 的時長要求 = sessions/<run>/schedule.md 的時長承諾 | regex 抽數字比對 |
| **W5** Meta-Loop SLA | 錄影→cleaned.md ≤ 48hr;上線 ≤ 7 天;通知觀眾 ≤ 上線+24hr | metadata 時間戳比對 |
| **W6** 出版承襲 study | publish 出去的每篇通過 `publish_qaqc.py` audit 全綠 | 呼叫 publish_qaqc.py |

**SSoT**:`docs/lint-standards.md` 與 `prompts/workshop_qaqc.md`
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
  錄影 → Step 1-4 → publish 到 goodedunote
  跑 workshop_lint.py --rule W5,W6
       ↓ (全綠)
  寄 link 給觀眾
```

---

## 目錄結構

```
WorkShop/
├── CLAUDE.md / GEMINI.md / AGENTS.md / README.md  # 規範與導引
├── LICENSE / LICENSE-CONTENT / NOTICE             # 雙軌授權
├── docs/
│   ├── workshop-design-v4.md   # 工作坊定案(2 小時設計細節)
│   ├── lint-standards.md       # W1-W6 規則 SSoT
│   └── origin-story.md         # 緣起(從 study fork)
├── scripts/                    # Step 1-5 工具(從 study fork)+ workshop_lint.py
├── prompts/                    # SSoT 規則檔(從 study fork)+ workshop_qaqc.md
├── dict/                       # 詞典(從 study fork)
├── SRT/                        # SRT 工具(從 study fork)
├── .claude/skills/             # CLI skills(從 study fork)
├── materials/                  # 工作坊預備材料
│   ├── common-recording/<event>/
│   ├── paper-handout/<event>/
│   └── recruitment/
├── sessions/<run-slug>/        # 實際工作坊跑場
└── publish/                    # Meta-Loop 出版產物
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

## 雙軌授權(沿用 study 政策)

- **程式碼**:MIT(`LICENSE`)
- **內容**(站台文案、講者逐字稿、好學生筆記):CC BY 4.0(`LICENSE-CONTENT`)
- **講者話語**:歸講者個別所有,經授權刊載

詳見 `NOTICE`。

---

## Common Gotchas(WorkShop 特定)

1. **Groq Whisper prompt 896 bytes UTF-8 上限** — 中文字 3 bytes/字 → context ≤ ~290 中文字。送 Groq 前用 `wc -c` 確認。
2. **共同錄音的時長選擇** — 過短(<10 min)NBLM vs 好學生筆記的對比不明顯。建議 30-60 min。
3. **紙本印刷必須留邊欄** — 給觀眾寫字,左右邊各 4cm,字行距 1.8 倍。
4. **Meta-Loop 失約 = 信任崩塌** — 答應一週上線就不能拖。若做不到,寧可不承諾。

## 變更紀錄

- **2026-05-26 v0**:從 study/ fork bootstrap,建立 WorkShop 專案骨架
