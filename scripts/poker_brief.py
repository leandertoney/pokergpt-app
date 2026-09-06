#!/usr/bin/env python3
"""
The daily poker brief.

Scans poker news for hands worth building a carousel around, and ranks them by
how likely they are to already be an argument. The format needs a hand people
are fighting about, not the biggest tournament result: a controversial fold, an
accusation, a hero call, a named pro doing something people disagree with.

Deliberately a script you run rather than a scheduled agent. Cron jobs created
from a Claude session live only as long as that session, so anything that has
to survive the night belongs here.

    python3 scripts/poker_brief.py           # today's candidates
    python3 scripts/poker_brief.py --all     # everything found, unranked

Reddit is blocked to automated fetches, so r/poker sentiment still has to be
read by hand. These sources are the ones that answered.
"""
import argparse, html, json, re, subprocess, sys
from datetime import datetime

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"

SOURCES = [
    ("PokerNews", "https://www.pokernews.com/news/",
     r'href="(/news/20\d\d/[^"]+)"[^>]*>\s*([^<]{25,140})<', "https://www.pokernews.com"),
    ("CardPlayer", "https://www.cardplayer.com/poker-news",
     r'href="(/poker-news/[^"]+)"[^>]*>\s*([^<]{25,140})<', "https://www.cardplayer.com"),
]

# Words that signal an argument rather than a result. Weighted: an accusation
# or a named controversy travels much further than "wins title".
SIGNALS = {
    9: ["cheat", "accus", "angle shoot", "scandal", "controvers", "banned", "dispute"],
    7: ["hero call", "hero fold", "worst fold", "sick call", "bluff of", "insane bluff",
        "misplay", "punt", "blow up", "blowup", "meltdown"],
    5: ["hand of the", "hands of the week", "hand analysis", "biggest pot", "wild hand",
        "crazy hand", "cooler", "bad beat", "slowroll", "slow roll"],
    3: ["hellmuth", "negreanu", "polk", "adelstein", "robbi", "ivey", "dwan", "airball",
        "hustler casino", "high stakes poker", "wpt", "world poker tour"],
    2: ["straight flush", "quads", "royal flush", "all in", "all-in", "river"],
}

NEGATIVE = ["schedule", "guarantee", "charity", "documentary", "heads to", "returns to",
            "partners with", "announces", "sponsor", "promotion", "freeroll"]

def fetch(url):
    try:
        out = subprocess.run(["curl", "-s", "-A", UA, "--max-time", "20", url],
                             capture_output=True, text=True, timeout=30)
        return out.stdout
    except Exception as e:
        print(f"  ! {url}: {e}", file=sys.stderr)
        return ""

def score(title):
    t = title.lower()
    s = 0
    hits = []
    for weight, words in SIGNALS.items():
        for w in words:
            if w in t:
                s += weight
                hits.append(w)
    for w in NEGATIVE:
        if w in t:
            s -= 4
    return s, hits

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="show everything, not just scored hits")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    found = []
    for name, url, pat, base in SOURCES:
        page = fetch(url)
        if not page:
            continue
        seen = set()
        for m in re.finditer(pat, page):
            path, title = m.group(1), html.unescape(m.group(2)).strip()
            if path in seen:
                continue
            seen.add(path)
            s, hits = score(title)
            found.append({"source": name, "title": title,
                          "url": base + path, "score": s, "signals": hits})

    found.sort(key=lambda x: -x["score"])
    picks = found if args.all else [f for f in found if f["score"] > 0]

    if args.json:
        print(json.dumps(picks, indent=2))
        return

    print(f"\n  POKER BRIEF · {datetime.now():%A %-d %B %Y}")
    print(f"  {len(found)} headlines scanned, {len([f for f in found if f['score']>0])} worth a look\n")

    if not picks:
        print("  Nothing scoring today. Two options: fall back to an evergreen")
        print("  spot, or check r/poker by hand -- it is blocked to this script.\n")
        return

    for i, f in enumerate(picks[:12], 1):
        bar = "*" * min(f["score"], 12)
        print(f"  {i:2}. [{f['score']:>2}] {bar}")
        print(f"      {f['title']}")
        print(f"      {f['url']}")
        if f["signals"]:
            print(f"      why: {', '.join(sorted(set(f['signals'])))}")
        print()

    print("  Pick one, then confirm it is genuinely being argued about before")
    print("  building. A high score means the words are there, not that the")
    print("  poker world cares.\n")

if __name__ == "__main__":
    main()
