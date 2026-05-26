# WorkShop · 好學生筆記方法論的內訓工作坊

> **「會,但不是完成。」**
>
> 好學生筆記:我們期待給你的是不同的學習觀點,
> 同時讓新的科技幫助你在學習的速度與深度更快速的內化,
> 讓我們也一同討論這個學習結果的未來與下一步。

---

## 這是什麼?

WorkShop 是一個專案,用來設計與舉辦兩小時的內訓工作坊。

工作坊主要服務 **daily AI users**(每天用 ChatGPT / Claude / Gemini /
NotebookLM 的人),目標是讓參與者體驗到一個被多數 AI 工具忽略的差別:

| 摘要(AI 主流做法) | 筆記(傳統人類做法) |
|---|---|
| 在**新開一頁**做目錄式節錄 | 在**原稿上**畫線、加註、重複強調 |
| 替代原稿 | 增厚原稿 |
| 知道(最淺) | 從知道一路通到反射 |

**好學生筆記** = 把 AI 帶到「**在原稿上做筆記**」的位置。

詳細工作坊設計:[`docs/workshop-design-v4.md`](./docs/workshop-design-v4.md)

---

## 三道哲學提問

工作坊兩小時的敘事骨架由三道學習哲學提問貫穿:

1. **我們什麼時候會成為學生?**
2. **怎麼把「獲得」給落實?** 在掌握程度上有什麼分類?是否需要將所有
   學習昇華成為反射?
3. **時間有限的情況下,AI 該怎麼賦能而不是替代學生?**

---

## 快速上手

### 環境

```bash
# Python ≥ 3.10 + ffmpeg + requests
brew install ffmpeg  # macOS
pip install requests
```

### API Keys

```bash
cp .env.example .env
# 編輯 .env,填入你的 GROQ_API_KEY 與 GEMINI_API_KEY
```

### 跑一個音檔(Step 1-2)

```bash
python3 scripts/session.py new <audio_file> --context "背景關鍵字"
# 產物落在 sessions/<YYYY-MM-DD_slug>/
```

### 工作坊產出 lint

```bash
python3 scripts/workshop_lint.py            # 跑全部 W1-W5
python3 scripts/workshop_lint.py --rule W1  # 只跑某條
python3 scripts/workshop_lint.py --event <event-slug>  # 限定某場
```

---

## 規範文件(SSoT)

| 檔 | 內容 |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | 專案憲法,所有 AI 工具的唯一規範 |
| [`docs/workshop-design-v4.md`](./docs/workshop-design-v4.md) | 兩小時工作坊定案 |
| [`prompts/qaqc_core_rules.md`](./prompts/qaqc_core_rules.md) | Phase A/B、Step 3/4 規則 |
| [`prompts/workshop_qaqc.md`](./prompts/workshop_qaqc.md) | W1-W5 WorkShop 專屬規範 + lint 操作指南 |

---

## 授權

- 程式碼:**MIT**([`LICENSE`](./LICENSE))
- 內容(站台文案、講者話語):**CC BY 4.0**([`LICENSE-CONTENT`](./LICENSE-CONTENT))
- 講者話語:著作權歸各場講者個別所有,經授權刊載([`NOTICE`](./NOTICE))

詳見 [`NOTICE`](./NOTICE)。

---

**「字字句句的收藏,是這個時代最反叛的事。」**
