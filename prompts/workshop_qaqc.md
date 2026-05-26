# 工作坊 QAQC 規範 (W1-W6 SSoT)

本檔為 **WorkShop 專屬產出對齊規則**的權威來源。`scripts/workshop_lint.py` 從這裡實作,
`CLAUDE.md` 引用本檔條文。

⚠️ **本檔是「規則條款庫」,不是執行 prompt**。所有 W 規則應該 100% 機械化可驗證
(checkbox 化或腳本可實現)。

> **Single Source of Truth**:WorkShop 出版相關規範只在本檔寫一次。其他工具/文件
> 用引用方式參照(`prompts/workshop_qaqc.md § W1.x`)。

---

## W 系列規則範圍

W 系列規則服務的是 **WorkShop 專屬產出** — 與 study 的 R / S 系列(Phase A/B、出版 QAQC)
互補,不重疊。

| 系列 | 來源 | 範圍 |
|---|---|---|
| R(R1-R6) | `prompts/qaqc_core_rules.md` | Phase A / Phase B / Step 3 / Step 4 規則 |
| S(S4.5, S6) | `prompts/publish_qaqc.md` | 出版前後 QAQC(承襲) |
| **W(W1-W6)** | **本檔** | **WorkShop 招生、共同錄音、紙本、節目單、Meta-Loop、出版對齊** |

---

## W1 · 招生敘事字面一致性

### 規則

三道哲學提問的字面 wording **必須在以下三處完全一致**:

| 來源 | 角色 |
|---|---|
| `materials/recruitment/announcement.md` | **權威來源**(寫入順序:由此檔開始) |
| `materials/recruitment/poster-source.md` | 招生海報文案 |
| `sessions/<run>/opening-slides.md` | 每次工作坊跑場前的開場投影 |

### 三道提問權威 wording

```
Q1:我們什麼時候會成為學生?

Q2:怎麼把「獲得」給落實?「獲得」在掌握程度有什麼樣的分類?是否需要將所有的學習都昇華成為反射?該做的練習與複習的方式與工具是什麼?

Q3:在時間有限的情況下,透過『語言模型』這樣新的工具,我們該用來賦能、協作與加速在學習這件事情的內化 roadmap 上,是否有一種全新的體驗能夠來試試看?
```

任何字面修改都應**先改 announcement.md,再 propagate 到其他兩處**。

### 招生宣言 wording(亦在 W1 範圍)

```
好學生筆記:我們期待給你的是不同的學習觀點。
同時讓新的科技幫助你在學習的速度與深度更快速的內化,
讓我們也一同討論這個學習結果的未來與下一步。
```

### Lint 動作

`workshop_lint.py --rule W1` 對三道提問做 string diff,任何一處字面不一致即 ✗。

### 為什麼

工作坊的敘事骨架是這三道提問。**字面變動會導致現場開場 / 招生文宣 /
海報三方說的事是「相近但不一樣」**,降低品牌記憶點密度。Lint 是這個一致性的最後防線。

---

## W2 · 共同錄音三件套完整性

### 規則

`materials/common-recording/<event>/` 內**必存三檔且互相對齊**:

| 檔 | 來源 | 規格 |
|---|---|---|
| `audio.mp3` | 講師預備(自錄 / 公開演講) | 30-60 min 中文演講 |
| `cleaned.md` | `audio.mp3` 跑 Step 1-2 後產出 | 通過 R2.3 95-105% 字數帶 |
| `notebooklm-summary.md` | `audio.mp3` 上傳 NBLM 後匯出 | 任意長度,代表 NBLM 對該音檔的摘要 |

### Lint 動作

- 三檔皆存在
- cleaned.md 的中文字數通過 R2.3(承襲 `prompts/qaqc_core_rules.md`)
- audio.mp3 與 cleaned.md 同一錄音來源(由 metadata.json 或人工標記確認)

### 為什麼

工作坊 0:10-0:25 的「物種 reframe」需要這三件套並列展示給觀眾。**少一件就無法
做對照**;對照若是不同錄音就變成蘋果比橘子。

---

## W3 · 紙本母版來源一致

### 規則

`materials/paper-handout/<event>/source.md` 必須是
`materials/common-recording/<event>/cleaned.md` 的**全文或選段**。
**不可從外部來源寫入**。

### Lint 動作

source.md 內的每段都能在 cleaned.md 中找到(子集檢查)。

### 為什麼

紙本是論點的具象化(「在原稿上做筆記」物理上沒有「新頁面」選項)。
**紙本內容必須與當天展示的 cleaned.md 同源**,觀眾才能在「我剛看到的數位版」
跟「我手上的紙本版」之間建立連結。從外部寫入會破壞這個連結。

---

## W4 · 報名表 ↔ 節目單時長對齊

### 規則

`materials/recruitment/registration-form.md` 中對使用者的「自帶錄音時長要求」
**必須符合** `sessions/<run>/schedule.md` 中對應動手段落(0:55-1:10 與 1:10-1:30 等)
的時長承諾。

### 範例

- 報名表寫:「請帶 15-30 min 的演講或會議錄音」
- 節目單:1:10-1:30 跑 Step 1-2(20 min)→ 對 15-30 min 錄音是可行的

但如果報名表寫「請帶 1 小時錄音」,而節目單只給 20 min 動手時間,就會有 mismatch。

### Lint 動作

正規表式抽兩處的「時長數字」,計算是否落在合理執行區間。

### 為什麼

時長 mismatch 會讓觀眾**現場跑不完自帶錄音**,挫敗感大。

---

## W5 · Meta-Loop SLA

### 規則

工作坊結束後,以下時程**必須達成**:

| 階段 | SLA |
|---|---|
| 錄影檔 → cleaned.md | **48 小時內** |
| cleaned.md → publish 上線 | **7 天內** |
| 寄通知 link 給觀眾 | **上線後 24 小時內** |

### Lint 動作

`sessions/<run>/metadata.json` 紀錄:
- `recording_finished_at`
- `cleaned_md_done_at`
- `published_at`
- `notification_sent_at`

`workshop_lint.py --rule W5 --event <run>` 計算各時間差,逾期即 ✗。

### 為什麼

Meta-Loop 的價值在於「答應的事一週後真的做到」。**失約 = 信任崩塌**,
還傷及下一場招生。若做不到,寧可現場不承諾。

---

## W6 · 出版產物承襲 study 規則

### 規則

WorkShop 透過 `publish/goodedunote/` 出版的每篇,必須**通過
`scripts/publish_qaqc.py`(承襲自 study)的 audit 全綠**。

承襲所有 S6 規則(S6.1 檔案結構、S6.2 back-link、S6.3 data.js entry、
S6.4 OG meta、S6.5 圖片預算、S6.6 視覺一致性、S6.7 site copy freshness)。

### Lint 動作

`workshop_lint.py --rule W6` 內部呼叫 `scripts/publish_qaqc.py --slug <slug>`,
透傳 exit code。

### 為什麼

WorkShop 的 Meta-Loop 出版產物 = 一份好學生筆記 = 跟 study 的出版產物
是**同物種**。沒有理由放鬆品質。

---

## 違規/失敗時的標準操作

- **W1 失敗**:三道提問三處字面不一致 → 以 announcement.md 為準,將其他兩處改齊
- **W2 失敗**:共同錄音三件套不齊 → 補上缺的版本;cleaned.md 未通過 R2.3 → 重跑 Phase B
- **W3 失敗**:紙本來源外洩 → 從 cleaned.md 重做選段
- **W4 失敗**:時長 mismatch → 改報名表或改節目單
- **W5 失敗**:時程逾期 → 不視為災難,但下次招生**不再承諾此 SLA**(誠實降級)
- **W6 失敗**:出版產物未通過 audit → 修 publish/<slug>/ 內容,重跑 audit

## 工作坊生命週期中的 lint 觸發點

```
[招生階段]
  ─ 寫 announcement.md → poster-source.md → registration-form.md
  ─ 觸發: workshop_lint.py --rule W1
        ↓ 全綠才能對外推播

[預備階段(上課前 2 週)]
  ─ 跑 common-recording 的 Step 1-2(R 層)
  ─ NBLM 上傳 + 匯出
  ─ 寫 paper-handout source.md(來自 cleaned.md 選段)
  ─ 觸發: workshop_lint.py --rule W2,W3
        ↓ 全綠才能印紙本

[上課當天]
  ─ 寫 sessions/<run>/schedule.md + opening-slides.md
  ─ 觸發: workshop_lint.py --rule W1,W4 --event <run>
        ↓ 全綠才能開場

[Meta-Loop 後處理]
  ─ 錄影 → Step 1-2 → Step 3-4 → publish
  ─ 觸發: workshop_lint.py --rule W5,W6 --event <run>
        ↓ 全綠才寄通知給觀眾
```

## 自動化使用

```bash
cd /Users/shuotaochiang/Desktop/WorkShop

# 跑全部 W1-W6(baseline)
python3 scripts/workshop_lint.py

# 只跑某條
python3 scripts/workshop_lint.py --rule W1

# 限定某場
python3 scripts/workshop_lint.py --event 2026-06_first-run

# 結合條件
python3 scripts/workshop_lint.py --rule W2 --event 2026-06_first-run

# 安靜模式(只印失敗)
python3 scripts/workshop_lint.py --quiet
```

Exit code 0 = 全綠,1 = 任何規則失敗,2 = 環境錯誤(找不到目錄等)。
未來可在 git pre-push hook 或 CI 流程加 `python3 scripts/workshop_lint.py || exit 1`。

## 邊界條件對映

W 規則是**靜態邊界**(規格);lint 是**動態檢查**(實作)。兩者組合確保
專案執行過程不發散,各產出檔案間維持數據一致性:

| 邊界條件 | 對應 lint |
|---|---|
| 敘事字面不能漂移 | W1 |
| 對照素材必須三件齊備且同源 | W2 |
| 紙本不能脫離數位母版 | W3 |
| 報名訊息要對應現場執行 | W4 |
| 後續履行不能拖過 SLA | W5 |
| 出版品質不能低於 study 出版層 | W6 |

任何 W 失敗 → 上游 R / S 也應該重審,因為錯誤可能源自更深層。

## 變更紀錄

- **2026-05-26 v1**:從 v5 plan 抽出,初版上線。實作 W1-W3 + W6;W4 / W5 留待第一場
  實際舉辦時補實作(因為現在還沒有 sessions/<run>/ 跟 registration-form.md 範本)
- **2026-05-26 v2**:併入原 `docs/lint-standards.md` 的生命週期觸發點與邊界條件對映;
  該檔已移除,本檔成為 W 系列 SSoT 兼操作指南
