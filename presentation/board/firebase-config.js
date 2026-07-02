/* ============================================================
   Firebase Web App 設定 — goodedunote 協作白板
   ------------------------------------------------------------
   這份設定是「Web App 公開設定」,可以 commit 並部署到前端。
   安全性由 Realtime Database 安全規則 + Anonymous Auth + 授權網域
   控管,而非靠隱藏這份設定。
   (與 root .env 的 GROQ_API_KEY / GEMINI_API_KEY 機密無關。)

   填法:Firebase console → 專案 goodedunote → 專案設定 → Your apps
        → 新增 / 選取 Web app → 複製 firebaseConfig 貼進下方。
        ⚠️ 務必確認包含 databaseURL(若 console 片段省略,手動補上,
           形如 https://goodedunote-default-rtdb.<region>.firebasedatabase.app)
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyBnQ13mufZJhzB9LWf2u28ZnVNOZo3t09k",
  authDomain: "goodedunote.firebaseapp.com",
  // ⚠️ 下一步開「即時資料庫」後拿到的網址,要貼到這裡(目前是預設猜測值)
  databaseURL: "https://goodedunote-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "goodedunote",
  storageBucket: "goodedunote.firebasestorage.app",
  messagingSenderId: "79348222813",
  appId: "1:79348222813:web:c1347482dc5100e85576b4",
  measurementId: "G-LKR918VC0S"
};

// 初始化(使用 v9 compat 命名空間 API,由 board.html 的 CDN <script> 提供 window.firebase)
firebase.initializeApp(firebaseConfig);

// 全域匯出給 board.js 使用
window.fbAuth = firebase.auth();
window.fbDb = firebase.database();
window.FB_READY = firebaseConfig.apiKey !== "__FILL_ME__";
