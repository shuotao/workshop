# Lint 標準操作手冊(WorkShop)

本檔是 WorkShop 專案的 **lint 操作快速指南**。
規則本身的權威定義在 [`prompts/workshop_qaqc.md`](../prompts/workshop_qaqc.md);
本檔只提供操作方法、使用流程、失敗應對策略。

---

## 三層 QAQC 體系

WorkShop 沿用 study 的兩層,加上一層自己的:

| 層 | 範圍 | SSoT 檔 | 自動化腳本 |
|---|---|---|---|
| **R** | Phase A / B 規則(轉錄、清理、校稿) | `prompts/qaqc_core_rules.md` | `scripts/session.py` 內建 |
| **S** | 出版前(S4.5)+ 出版後(S6) QAQC | `prompts/publish_qaqc.md` | `scripts/publish_qaqc.py` |
| **W** | WorkShop 專屬:招生、共同錄音、紙本、節目單、Meta-Loop、出版對齊 | `prompts/workshop_qaqc.md` | `scripts/workshop_lint.py` |

三層**從上游往下游**:R 是內容品質的最底層(零省略、95-105% 字數),S 是出版產物
的結構品質,W 是工作坊整體交付物的對齊。

任何 W 規則失敗 → 上游 R / S 也應該重審,因為錯誤可能源自更深層。

---

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

---

## 快速指令參考

### 全綠 baseline

```bash
cd /Users/shuotaochiang/Desktop/WorkShop
python3 scripts/workshop_lint.py
# 預期 exit code 0,所有 W 規則跑過
```

### 限縮單一條規則

```bash
python3 scripts/workshop_lint.py --rule W1
python3 scripts/workshop_lint.py --rule W2 --event 2026-06_first-run
```

### 安靜模式(只印失敗)

```bash
python3 scripts/workshop_lint.py --quiet
```

### CI 整合(未來)

可在 git pre-push hook 或 CI 流程中加:

```bash
python3 scripts/workshop_lint.py || exit 1
```

確保任何提交前先過 lint。

---

## 失敗應對速查表

| Lint ID | 失敗症狀 | 修法 |
|---|---|---|
| **W1** | 三道提問字面不一致 | 以 `announcement.md` 為準,改齊 poster-source.md 與 opening-slides.md |
| **W2** | 共同錄音三件套不齊 | 補缺的版本;cleaned.md 字數失敗 → 重跑 Phase B |
| **W3** | 紙本 source.md 不在 cleaned.md 內 | 從 cleaned.md 重選段;不可從外部寫入 |
| **W4** | 時長 mismatch | 改報名表時長要求 或 改節目單對應時段 |
| **W5** | Meta-Loop 逾期 | 不視為災難,但下次招生**降級承諾** |
| **W6** | 出版產物未過 publish_qaqc.py | 修 publish/<slug>/ 內容,重跑 audit |

---

## 「邊界條件」說明(回應 user 對 lint 的期待)

User 要求 lint 能**確保專案執行內容過程中,不會發散且都能在邊界的條件要求上做出
明確的任務執行與各個產出資訊檔案間的數據一致性**。

W 規則就是這個「邊界條件」的具體化:

| 邊界條件 | 對應 lint |
|---|---|
| 敘事字面不能漂移 | W1 |
| 對照素材必須三件齊備且同源 | W2 |
| 紙本不能脫離數位母版 | W3 |
| 報名訊息要對應現場執行 | W4 |
| 後續履行不能拖過 SLA | W5 |
| 出版品質不能低於 study 出版層 | W6 |

W 規則是**靜態邊界**;lint 是**動態檢查**。靜態 + 動態 = 確保專案不發散。

---

## 變更紀錄

- **2026-05-26 v1**:初版上線
