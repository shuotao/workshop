#!/usr/bin/env python3
"""scripts/workshop_lint.py — WorkShop QAQC 自動審查

依 `prompts/workshop_qaqc.md` 的 W1-W5 規則對 WorkShop 內容做機械檢查。
本檔是「規範與實作的橋」,所有規則的權威 wording 都從 prompts/workshop_qaqc.md
同步而來;若該檔更新,本檔的 wording 常數也要同步更新。

初版實作:W1 / W2 / W3。
未實作:W4 (報名表↔節目單時長) / W5 (Meta-Loop SLA) — 留待第一場實際舉辦時補,
因為現在還沒有 sessions/<run>/registration-form.md 範本可比對。

(W6 已移除:WorkShop 不做網頁出版,Meta-Loop 交付改為 markdown email,
原 W6「出版產物承襲 study」規則整節退場。)

用法:
    python3 scripts/workshop_lint.py                # 跑全部已實作的 W
    python3 scripts/workshop_lint.py --rule W1      # 只跑某條
    python3 scripts/workshop_lint.py --event <slug> # 限定 event
    python3 scripts/workshop_lint.py --quiet        # 只印失敗

Exit code:0 = 全綠,1 = 任何規則失敗,2 = 環境錯誤。
"""

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MATERIALS = ROOT / "materials"
SESSIONS = ROOT / "sessions"

# ──────────────────────────────────────────────────────────────────
# W1 權威 wording(從 prompts/workshop_qaqc.md § W1 同步)
# ──────────────────────────────────────────────────────────────────
Q1_KEY = "我們什麼時候會成為學生"
Q2_KEY = "怎麼把「獲得」給落實"
Q3_KEY = "在時間有限的情況下"
ANNOUNCEMENT_KEY = "好學生筆記:我們期待給你的是不同的學習觀點"


# ──────────────────────────────────────────────────────────────────
# 結果型別:list of (rule_id, name, ok, detail)
# ──────────────────────────────────────────────────────────────────
def check_w1(event_filter: str | None = None) -> list[tuple]:
    """W1 招生敘事字面一致性"""
    results = []
    rcr = MATERIALS / "recruitment"

    targets = {
        "announcement.md": rcr / "announcement.md",
        "poster-source.md": rcr / "poster-source.md",
    }

    existing = {}
    for name, path in targets.items():
        if path.is_file():
            existing[name] = path.read_text(encoding="utf-8")

    if not existing:
        # 招生材料還沒寫(專案 bootstrap 階段)— 報訊息但不失敗
        results.append(("W1", "招生材料尚未建立", True,
                       "預期之內(尚未進入招生階段)"))
        return results

    # 三道提問各自要在每處出現
    for q_name, q_key in [("Q1", Q1_KEY), ("Q2", Q2_KEY), ("Q3", Q3_KEY)]:
        for src_name, content in existing.items():
            ok = q_key in content
            results.append(("W1", f"{src_name} 含 {q_name} 提問", ok,
                          "" if ok else f"未找到 '{q_key}'"))

    # 招生宣言開頭字串
    for src_name, content in existing.items():
        ok = ANNOUNCEMENT_KEY in content
        results.append(("W1", f"{src_name} 含招生宣言", ok,
                       "" if ok else f"未找到 '{ANNOUNCEMENT_KEY}'"))

    # opening-slides.md 在每個 session 內
    if SESSIONS.is_dir():
        for run_dir in sorted(SESSIONS.iterdir()):
            if not run_dir.is_dir():
                continue
            if event_filter and run_dir.name != event_filter:
                continue
            slides = run_dir / "opening-slides.md"
            if not slides.is_file():
                results.append(("W1", f"{run_dir.name}/opening-slides.md 存在", False,
                              "session 開場投影未建立"))
                continue
            content = slides.read_text(encoding="utf-8")
            for q_name, q_key in [("Q1", Q1_KEY), ("Q2", Q2_KEY), ("Q3", Q3_KEY)]:
                ok = q_key in content
                results.append(("W1", f"{run_dir.name}/opening-slides 含 {q_name}", ok, ""))

    return results


def check_w2(event_filter: str | None = None) -> list[tuple]:
    """W2 共同錄音三件套完整性"""
    results = []
    cr_dir = MATERIALS / "common-recording"

    if not cr_dir.is_dir():
        results.append(("W2", "common-recording/ 目錄不存在", False, str(cr_dir)))
        return results

    events = [d for d in cr_dir.iterdir() if d.is_dir()]
    if event_filter:
        events = [d for d in events if d.name == event_filter]

    if not events:
        results.append(("W2", "common-recording 內無 event", True,
                       "預期之內(尚未預備首場素材)"))
        return results

    for event_dir in events:
        for req in ["audio.mp3", "cleaned.md", "notebooklm-summary.md"]:
            f = event_dir / req
            ok = f.is_file()
            results.append(("W2", f"{event_dir.name}/{req}", ok,
                          f"檔大小 {f.stat().st_size // 1024}KB" if ok else "不存在"))

        cleaned = event_dir / "cleaned.md"
        if cleaned.is_file():
            txt = cleaned.read_text(encoding="utf-8")
            chinese = sum(1 for c in txt if "一" <= c <= "鿿")
            # 30-60 min 中文演講約 5,000-12,000 中文字;寬鬆下界 1,000(短演講也可)
            ok = chinese >= 1000
            results.append(("W2", f"{event_dir.name}/cleaned.md 字數 >= 1000", ok,
                          f"{chinese} 中文字"))

    return results


def check_w3(event_filter: str | None = None) -> list[tuple]:
    """W3 紙本母版來源一致"""
    results = []
    ph_dir = MATERIALS / "paper-handout"

    if not ph_dir.is_dir():
        results.append(("W3", "paper-handout/ 目錄不存在", False, str(ph_dir)))
        return results

    events = [d for d in ph_dir.iterdir() if d.is_dir()]
    if event_filter:
        events = [d for d in events if d.name == event_filter]

    if not events:
        results.append(("W3", "paper-handout 內無 event", True,
                       "預期之內(尚未預備紙本)"))
        return results

    for event_dir in events:
        source = event_dir / "source.md"
        cr_cleaned = MATERIALS / "common-recording" / event_dir.name / "cleaned.md"

        if not source.is_file():
            results.append(("W3", f"{event_dir.name}/source.md 存在", False, ""))
            continue
        if not cr_cleaned.is_file():
            results.append(("W3", f"{event_dir.name} 對應 cleaned.md 存在", False,
                          f"common-recording/{event_dir.name}/cleaned.md 不存在"))
            continue

        src_text = source.read_text(encoding="utf-8")
        cleaned_text = cr_cleaned.read_text(encoding="utf-8")

        # 子集檢查:source 的每段(雙換行分,排除標題行)都應在 cleaned 中
        src_paras = [
            p.strip() for p in src_text.split("\n\n")
            if p.strip() and not p.strip().startswith("#")
        ]
        missing = [p[:40] for p in src_paras if p not in cleaned_text]
        ok = not missing
        results.append((
            "W3", f"{event_dir.name} 紙本子集 ⊂ cleaned.md", ok,
            f"{len(missing)} 段不在 cleaned.md 中" if missing else f"{len(src_paras)} 段皆在",
        ))

    return results


# ──────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────
RULE_FUNCS = {
    "W1": check_w1,
    "W2": check_w2,
    "W3": check_w3,
}
UNIMPLEMENTED = {
    "W4": "報名表↔節目單時長對齊(留待第一場補,因為現在還沒 schedule.md 與 registration-form.md)",
    "W5": "Meta-Loop SLA(留待第一場跑 Meta-Loop 後補)",
}


def main() -> int:
    ap = argparse.ArgumentParser(description="WorkShop QAQC lint")
    ap.add_argument("--rule", help="只跑某條規則,如 W1, W2, W3")
    ap.add_argument("--event", help="限定 event slug")
    ap.add_argument("--quiet", action="store_true", help="只印失敗")
    args = ap.parse_args()

    if args.rule:
        if args.rule in UNIMPLEMENTED:
            print(f"[INFO] {args.rule} 尚未實作 — {UNIMPLEMENTED[args.rule]}",
                  file=sys.stderr)
            return 0
        if args.rule not in RULE_FUNCS:
            print(f"[ERROR] 不認得 --rule {args.rule}", file=sys.stderr)
            return 2
        rules_to_run = [args.rule]
    else:
        rules_to_run = list(RULE_FUNCS.keys())

    all_results = []
    for rule in rules_to_run:
        fn = RULE_FUNCS[rule]
        all_results.extend(fn(event_filter=args.event))

    total_pass = total_fail = 0
    for rule, name, ok, detail in all_results:
        if ok:
            total_pass += 1
            if not args.quiet:
                print(f"  ✓ [{rule}] {name}" + (f" — {detail}" if detail else ""))
        else:
            total_fail += 1
            print(f"  ✗ [{rule}] {name}" + (f" — {detail}" if detail else ""))

    print("\n" + "=" * 60)
    print(f"WorkShop lint:{total_pass} 通過 / {total_fail} 失敗 "
          f"(W4/W5 未實作,見 prompts/workshop_qaqc.md)")
    if total_fail == 0:
        print("✅ 全綠")
        return 0
    print(f"❌ {total_fail} 項失敗")
    return 1


if __name__ == "__main__":
    sys.exit(main())
