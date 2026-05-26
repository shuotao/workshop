#!/bin/bash
# Step 5(出版層)— 把一篇筆記的 cleaned.md(+toc.json)轉成「多頁式」HTML
# (index + 每場一頁,各自 OG 預覽圖),圖片壓縮後 deploy 到 Firebase goodedunote。
#
# ⚠️ Blast-radius 警告(WorkShop 與 study 共用 Firebase project `goodedunote`):
#   `firebase deploy --only hosting` 會把 $DEPLOY/public/ 整個目錄推上去,
#   覆蓋 hosting 上既有的內容。如果 study 的書(koshi-cafe / mcp5-may-2026 /
#   bim-revit-mcp-* 等)不在 WorkShop 的 publish/goodedunote/public/ 內,
#   deploy 後線上就會被掃掉。實務上要 deploy 前先 rsync 進 study 的 slug
#   或改用 firebase target/channel 隔離。
#
# 用法:
#   scripts/publish_goodedunote.sh <cleaned.md> <workdir(含 toc.json)> <slug> [圖片來源目錄] [md_to_html 額外參數…]
# 範例(WorkShop 第一場 Meta-Loop 出版):
#   scripts/publish_goodedunote.sh \
#     "publish/_build/workshop-2026-06_first-run/cleaned.md" \
#     "publish/_build/workshop-2026-06_first-run" \
#     workshop-2026-06_first-run \
#     "materials/common-recording/2026-06_first-run" \
#     --cover cover.jpg --tagline "好學生筆記內訓工作坊 · 2026.06"
set -euo pipefail
MD="$1"; WD="$2"; SLUG="$3"; IMGSRC="${4:-$(dirname "$MD")}"; shift 4 || true
EXTRA=("$@")

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY="$ROOT/publish/goodedunote"
PUB="$DEPLOY/public/$SLUG"
BASE="https://goodedunote.web.app/$SLUG/"
mkdir -p "$PUB"

[ -f "$DEPLOY/firebase.json" ] || cat > "$DEPLOY/firebase.json" <<'JSON'
{ "hosting": { "public": "public", "ignore": ["firebase.json", "**/.*"] } }
JSON
[ -f "$DEPLOY/.firebaserc" ] || echo '{ "projects": { "default": "goodedunote" } }' > "$DEPLOY/.firebaserc"

# 清掉舊頁(避免章節數變動留下殘頁),保留/覆寫圖片
rm -f "$PUB"/index.html "$PUB"/session-*.html

# 1) md → 多頁 HTML(每頁自帶 OG;封面/base-url 由參數帶入)
python3 "$ROOT/scripts/lang/en/md_to_html.py" "$MD" "$WD" "$PUB" --multipage --base-url "$BASE" "${EXTRA[@]}"

# 2) 蒐集所有頁面參照到的本地圖檔 → 壓縮 + EXIF 轉正後放進部署夾(省流量、自動轉正)
SRCS=()
while IFS= read -r r; do
  [ -z "$r" ] && continue
  case "$r" in http://*|https://*) continue;; esac
  [ -f "$IMGSRC/$r" ] && SRCS+=("$IMGSRC/$r")
done < <(grep -hoE 'src="[^"]+"' "$PUB"/*.html | sed 's/^src="//;s/"$//' | sort -u)
if [ "${#SRCS[@]}" -gt 0 ]; then
  echo "[publish] 壓縮 ${#SRCS[@]} 張圖 → $PUB"
  python3 "$ROOT/scripts/compress_images.py" "$PUB" "${SRCS[@]}"
fi

# 3) 部署(只 hosting,只 goodedunote)
( cd "$DEPLOY" && firebase deploy --only hosting --project goodedunote )
echo "✅ Step 5 已上線: $BASE"
