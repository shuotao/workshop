# 協作白板(Miro 式)— 設定與使用

工作坊現場用的即時協作白板。簡報第 5/8/10 頁的「進入白板」按鈕會在新分頁開啟
`board.html?room=slideN`,每頁各自一個獨立房間。學員輸入暱稱即可進場,即時看到
彼此貼的便利貼、畫的線、以及**畫面截圖**。

## 技術

- 畫布:Fabric.js v6(CDN,無 build step)
- 即時同步:Firebase Realtime Database(專案 `goodedunote`)
- 登入:暱稱 + Firebase Anonymous Auth
- 截圖:壓縮成 ≤1280px JPEG 後以 base64 存進 RTDB(免 Storage / CORS)

## 檔案

| 檔 | 用途 |
|---|---|
| `board.html` | 殼:工具列、canvas、登入 modal、載入 CDN |
| `board.css` | Henry broadside 樣式 |
| `board.js` | 畫布 + RTDB 同步 + 截圖管線 + presence |
| `firebase-config.js` | Firebase Web App 設定(**需填**,可 commit,非機密) |
| `database.rules.json` | RTDB 安全規則(貼到 console) |

## 一次性設定(Firebase console,專案 goodedunote)

1. **Realtime Database** → 建立資料庫 → 區域建議 `asia-southeast1`(新加坡)→ 先用 locked mode。
2. **Authentication** → Sign-in method → 啟用 **Anonymous**。
3. **專案設定 → Your apps → 新增 Web app**(`</>`)→ 複製 `firebaseConfig`,
   貼進 `firebase-config.js`。⚠️ 確認包含 `databaseURL`(若片段省略要手動補,
   形如 `https://goodedunote-default-rtdb.asia-southeast1.firebasedatabase.app`)。
4. **Realtime Database → Rules** → 貼上 `database.rules.json` 內容 → Publish。
5. **Authentication → Settings → Authorized domains** → 確認含 `goodedunote.web.app`。
6. (不需動 `firebase.json`,Hosting 設定維持原狀。)

## 使用

- 按工具列:選取 / 便利貼 / 畫筆 / 框 / 刪除;右邊色點選畫筆與框線顏色。
- **貼截圖(最重要)**:
  - 系統截圖到剪貼簿(Mac `⌘⇧⌃4` / Win `⊞⇧S`)→ 在白板按 `⌘V` / `Ctrl+V`。
  - 或把圖片檔**拖進**白板;或按「⬆ 上傳」。
  - 或按「⛶ 擷取畫面」用瀏覽器抓一張當前畫面(需 HTTPS,手機多不支援)。
- 選取物件按 `Delete` / `Backspace` 刪除。

## 活動結束後(止血)

到 RTDB 把 `rooms/` 節點刪掉,或把規則 `.read`/`.write` 改成 `false`,
避免持續佔用免費額度或被外部寫入。

## 部署(注意:雙路徑)

repo 的 `presentation/` **不是**線上來源。要上線:把 `presentation/index.html`
與整個 `presentation/board/`(含填好的 `firebase-config.js`)複製到
`…/study/scripts/publish/goodedunote/public/workshop/`,再:

```
cd …/study/scripts/publish/goodedunote
firebase deploy --only hosting --project goodedunote --account codefortaiwan.com@gmail.com
```

部署版的音檔路徑差異(`lightalking.mp3` 同層 vs repo 的 `../lightalking.mp3`)維持原規則。
