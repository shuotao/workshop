#!/usr/bin/env python3
"""scripts/publish_qaqc.py — Step 6 出版後 QAQC 自動審查腳本

讀 scripts/publish/goodedunote/public/data.js + 各 slug 目錄,對照
prompts/publish_qaqc.md § S6 規則,逐 slug 跑 S6.1–S6.6 檢查
(WorkShop fork:已移除原 study 根頁專屬的 S6.7 site copy freshness)。

用法:
    python3 scripts/publish_qaqc.py            # 審查所有非 placeholder 的 book
    python3 scripts/publish_qaqc.py --slug X   # 只審單一 slug

Exit code 0 = 全通過,1 = 任何一項失敗,2 = 環境錯誤(找不到 data.js 等)。

設計:純讀檔,不打網路,不修改任何檔案。可重複跑、可進 CI。
"""

import argparse
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
# WorkShop 本地出版路徑:WorkShop/publish/goodedunote/public/
# (study 原本是 scripts/publish/goodedunote/public,WorkShop 提升到 root)
PUB = PROJECT_ROOT / "publish/goodedunote/public"

# § S4.5.7 shelf → 中文 label(用於檢查 back-link 文字)
SHELF_LABELS = {"public": "公開活動", "seminar": "研討會", "reading": "讀書會"}


# ──────────────────────────────────────────────────────────────────
# data.js 解析(因 JS object 用單引號 + unquoted keys,無法 json.loads)
# ──────────────────────────────────────────────────────────────────
def _match_bracket(s: str, start: int, open_c: str, close_c: str) -> int:
    """從 s[start](必為 open_c)往後找對應的 close_c 索引。會跳過字串內的 bracket。"""
    if s[start] != open_c:
        raise ValueError(f"s[{start}]={s[start]!r} != {open_c!r}")
    depth = 0
    in_str = False
    quote = None
    i = start
    while i < len(s):
        c = s[i]
        if in_str:
            if c == "\\":
                i += 2
                continue
            if c == quote:
                in_str = False
        else:
            if c in ("'", '"'):
                in_str = True
                quote = c
            elif c == open_c:
                depth += 1
            elif c == close_c:
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    raise ValueError(f"no matching {close_c} from index {start}")


def _scalar(book_str: str, key: str, str_or_num: str):
    """從 book object 字串抽 scalar 欄位。str_or_num: 'str' | 'num'。"""
    if str_or_num == "str":
        m = re.search(rf"{key}:\s*['\"]([^'\"]*)['\"]", book_str)
        return m.group(1) if m else None
    else:
        m = re.search(rf"{key}:\s*(\d+|null)", book_str)
        if not m:
            return None
        v = m.group(1)
        return None if v == "null" else int(v)


def _quotes(book_str: str) -> list[str]:
    """抽 quotes: [...] 內的字串(不含巢狀,我們的 quotes 都是 flat string array)。"""
    m = re.search(r"quotes:\s*\[", book_str)
    if not m:
        return []
    arr_start = m.end() - 1  # 指向 '['
    arr_end = _match_bracket(book_str, arr_start, "[", "]")
    body = book_str[arr_start + 1 : arr_end]
    # 抽單引號或雙引號字串
    strs = re.findall(r"'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\"", body)
    return [a or b for a, b in strs]


def parse_data_js(data_js_path: Path) -> list[dict]:
    """回 [{'id': 'public', 'books': [book...]}, ...](placeholder books 也含)。"""
    txt = data_js_path.read_text(encoding="utf-8")
    sh_idx = txt.index("window.SHELVES")
    arr_start = txt.index("[", sh_idx)
    arr_end = _match_bracket(txt, arr_start, "[", "]")
    body = txt[arr_start + 1 : arr_end]

    shelves = []
    i = 0
    while i < len(body):
        if body[i] == "{":
            obj_end = _match_bracket(body, i, "{", "}")
            shelf_str = body[i : obj_end + 1]
            shelves.append(_parse_shelf(shelf_str))
            i = obj_end + 1
        else:
            i += 1
    return shelves


def _parse_shelf(shelf_str: str) -> dict:
    shelf_id = _scalar(shelf_str, "id", "str")
    bm = re.search(r"books:\s*\[", shelf_str)
    if not bm:
        return {"id": shelf_id, "books": []}
    arr_start = bm.end() - 1
    arr_end = _match_bracket(shelf_str, arr_start, "[", "]")
    body = shelf_str[arr_start + 1 : arr_end]

    books = []
    i = 0
    while i < len(body):
        if body[i] == "{":
            obj_end = _match_bracket(body, i, "{", "}")
            books.append(_parse_book(body[i : obj_end + 1]))
            i = obj_end + 1
        else:
            i += 1
    return {"id": shelf_id, "books": books}


def _parse_book(book_str: str) -> dict:
    b = {}
    for k in ("id", "title", "subtitle", "date", "venue", "duration", "url"):
        b[k] = _scalar(book_str, k, "str")
    for k in ("words", "height", "width", "spineShade"):
        b[k] = _scalar(book_str, k, "num")
    b["quotes"] = _quotes(book_str)
    b["placeholder"] = bool(re.search(r"placeholder:\s*true", book_str))
    return b


# ──────────────────────────────────────────────────────────────────
# Audit checks(§ S6.1 – S6.6)
# ──────────────────────────────────────────────────────────────────
def audit_book(book: dict, shelf_id: str, pub_dir: Path) -> list[tuple]:
    """回 [(rule_id, ok, detail), ...]。"""
    results = []

    # 從 url 推 slug(必為 `./<slug>/` 或絕對 URL 形式)
    url = book.get("url") or ""
    slug_from_url = None
    if url:
        if url.startswith("./") and url.endswith("/"):
            slug_from_url = url[2:-1]
        else:
            m = re.search(r"/([^/]+)/?$", url.rstrip("/"))
            if m:
                slug_from_url = m.group(1)

    # S6.3 id ↔ url slug 一致
    if slug_from_url:
        ok = book["id"] == slug_from_url
        results.append(("S6.3 id ↔ url slug 一致", ok,
                       f"id={book['id']} url→slug={slug_from_url}" if not ok else ""))
        slug = slug_from_url
    else:
        results.append(("S6.3 url 為 ./<slug>/ 形式", False, f"url={url!r}"))
        slug = book["id"]

    # S6.3 url 為相對(./)路徑
    if url and not url.startswith("./"):
        results.append(("S6.3 url 用相對路徑(./)", False, f"url={url}"))

    slug_dir = pub_dir / slug

    # S6.1 slug 目錄存在
    if not slug_dir.is_dir():
        results.append(("S6.1 slug dir 存在", False, str(slug_dir)))
        return results
    results.append(("S6.1 slug dir 存在", True, slug))

    # S6.1 index.html 必存
    index_path = slug_dir / "index.html"
    has_index = index_path.is_file()
    results.append(("S6.1 index.html 存在", has_index, ""))
    if not has_index:
        return results

    sessions = sorted(slug_dir.glob("session-*.html"))
    pages = [index_path] + sessions

    # S6.2 back link 統一
    expected_anchor = f"shelf-{shelf_id}"
    expected_label = f"回到{SHELF_LABELS.get(shelf_id, '?')}書架"
    bad_pages_anchor = []
    bad_pages_label = []
    for p in pages:
        html = p.read_text(encoding="utf-8")
        if f'href="../#{expected_anchor}"' not in html:
            bad_pages_anchor.append(p.name)
        if expected_label not in html:
            bad_pages_label.append(p.name)
    results.append((
        "S6.2 back-link anchor 統一",
        not bad_pages_anchor,
        f"failing: {bad_pages_anchor}" if bad_pages_anchor else f"all {len(pages)} pages 含 ../#{expected_anchor}",
    ))
    results.append((
        "S6.2 back-link label 統一",
        not bad_pages_label,
        f"failing: {bad_pages_label}" if bad_pages_label else f"all {len(pages)} pages 含「{expected_label}」",
    ))

    # S6.3 data.js 必填欄位
    required_str = ["id", "title", "subtitle", "date", "venue", "duration", "url"]
    # words/height/width 必須 > 0;spineShade 是配色變體(0 或 1 都合法)
    required_positive_num = ["words", "height", "width"]
    for k in required_str:
        v = book.get(k)
        ok = v is not None and v != ""
        results.append((f"S6.3 data.js {k} 非空", ok, repr(v) if not ok else ""))
    for k in required_positive_num:
        v = book.get(k)
        ok = isinstance(v, int) and v > 0
        results.append((f"S6.3 data.js {k} > 0", ok, repr(v) if not ok else str(v)))
    # spineShade:必須是 0 或 1
    sh = book.get("spineShade")
    ok = sh in (0, 1)
    results.append(("S6.3 data.js spineShade ∈ {0,1}", ok, repr(sh) if not ok else str(sh)))

    qn = len(book.get("quotes", []))
    results.append(("S6.3 quotes 數量 3-4", 3 <= qn <= 4, f"n={qn}"))

    # S6.4 OG / Twitter meta — 拆兩層:核心(MUST)、圖像(SHOULD)
    og_core_keys = ["og:title", "og:url", "twitter:card"]
    og_image_keys = ["og:image", "twitter:image"]
    bad_core = []
    bad_image = []
    for p in pages:
        html = p.read_text(encoding="utf-8")
        if any(k not in html for k in og_core_keys):
            bad_core.append(p.name)
        if any(k not in html for k in og_image_keys):
            bad_image.append(p.name)
    results.append((
        "S6.4 OG core meta(og:title/url, twitter:card)",
        not bad_core,
        f"failing: {bad_core}" if bad_core else f"all {len(pages)} pages OK",
    ))
    # og:image 為建議:無圖頁面允許省略,但 print 警告供未來改善
    if bad_image:
        results.append((
            "S6.4 OG image meta(建議,不強制)",
            True,  # 不視為失敗
            f"⚠️ {len(bad_image)}/{len(pages)} 頁無 og:image — social share 無預覽縮圖",
        ))
    else:
        results.append((
            "S6.4 OG image meta(建議,不強制)",
            True,
            f"all {len(pages)} pages 含預覽圖",
        ))

    # S6.5 圖片預算
    img_exts = (".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG")
    imgs = [f for f in slug_dir.iterdir() if f.is_file() and f.suffix in img_exts]
    total = sum(f.stat().st_size for f in imgs)
    total_mb = total / (1024 * 1024)
    results.append((
        "S6.5 圖片總量 < 10MB",
        total_mb < 10,
        f"{total_mb:.2f}MB across {len(imgs)} imgs",
    ))
    big = [f for f in imgs if f.stat().st_size > 1024 * 1024]
    results.append((
        "S6.5 單張 < 1MB",
        not big,
        f"{len(big)} 張 > 1MB(壓縮失效?)" if big else f"max={max((f.stat().st_size for f in imgs), default=0)//1024}KB" if imgs else "no images",
    ))

    # S6.6 dropcap 不套 **bold** 開頭
    bad_dropcap = []
    for p in pages:
        html = p.read_text(encoding="utf-8")
        if re.search(r'<p class="dropcap"><strong>', html):
            bad_dropcap.append(p.name)
    results.append((
        "S6.6 dropcap 不疊 <strong>",
        not bad_dropcap,
        f"found in: {bad_dropcap}" if bad_dropcap else f"all {len(pages)} pages OK",
    ))

    # S6.6 字面 ** 殘留(代表 markdown bold 沒被轉)
    bad_md = []
    for p in pages:
        html = p.read_text(encoding="utf-8")
        # 找 <p>...**...**</p> 內留下的字面 ** — 注意不能誤判 attr 內的 **
        # 簡化:body 內出現連續兩個 * 即抓
        if re.search(r"(?:<p[^>]*>|<h[23]>)[^<]*\*\*[^*]+\*\*", html):
            bad_md.append(p.name)
    results.append((
        "S6.6 markdown **bold** 已轉 <strong>",
        not bad_md,
        f"字面 ** 殘留於: {bad_md}" if bad_md else "no literal ** in body",
    ))

    return results


# ──────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────
def main() -> int:
    ap = argparse.ArgumentParser(description="Step 6 出版後 QAQC 自動審查")
    ap.add_argument("--slug", help="只審單一 slug")
    ap.add_argument("--quiet", action="store_true", help="只印失敗項目")
    args = ap.parse_args()

    data_js = PUB / "data.js"
    if not data_js.is_file():
        print(f"[ERROR] 找不到 {data_js}", file=sys.stderr)
        return 2

    try:
        shelves = parse_data_js(data_js)
    except Exception as e:
        print(f"[ERROR] data.js 解析失敗: {e}", file=sys.stderr)
        return 2

    total_pass = total_fail = total_books = 0

    for shelf in shelves:
        shelf_id = shelf["id"]
        for book in shelf["books"]:
            if book.get("placeholder"):
                continue
            if args.slug and book["id"] != args.slug:
                continue
            total_books += 1
            print(f"\n=== {book['id']} ({shelf_id}) — {book.get('title', '?')} ===")
            results = audit_book(book, shelf_id, PUB)
            for rule_id, ok, detail in results:
                if ok:
                    total_pass += 1
                    if not args.quiet:
                        print(f"  ✓ {rule_id}" + (f" — {detail}" if detail else ""))
                else:
                    total_fail += 1
                    print(f"  ✗ {rule_id}" + (f" — {detail}" if detail else ""))

    print("\n" + "=" * 60)
    print(f"審查完成:{total_books} 本書 / {total_pass} 項通過 / {total_fail} 項失敗")
    if total_fail == 0:
        print("✅ 全部通過")
        return 0
    print(f"❌ 有 {total_fail} 項失敗,見上方 ✗")
    return 1


if __name__ == "__main__":
    sys.exit(main())
