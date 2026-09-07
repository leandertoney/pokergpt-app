#!/usr/bin/env python3
"""
Scaffold a new carousel from the 002 template.

Tonight's deck took hours because the template did not exist yet. It does now:
base.css, render.sh, the slide structures and the grid-safe margins are all
settled. What changes per post is the hand, the article, the coach's verdict
and the copy -- so this copies the frame and leaves a hand.json to fill in.

    python3 scripts/new_carousel.py 003-slug

Then:
    1. fill store-assets/carousels/003-slug/hand.json
    2. python3 scripts/run_coach.py "<the hand, spoken>" --json > coach-output.json
    3. screenshot the source article into assets/article.png
    4. ./render.sh
"""
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CAROUSELS = ROOT / "store-assets" / "carousels"
TEMPLATE = CAROUSELS / "002-texas-mike"

SKELETON = {
    "_note": "Everything the slides need. Numbers must come from published reporting.",
    "hook": {
        "eyebrow": "He shoved with",
        "hero": [["10", "c"], ["7", "c"]],
        "board": [["9", "c"], ["K", "d"], ["A", "d"], ["4", "h"], ["5", "d"]],
        "claim": "The one-sentence version, in caps on the cover."
    },
    "source": {
        "outlet": "PokerNews",
        "url": "https://...",
        "date": "31 August 2026",
        "kicker": "The line under the article screenshot.",
        "body": "Two sentences of context."
    },
    "streets": [
        {"street": "Pre",   "amount": "$80,000",  "note": "three-bet, called"},
        {"street": "Flop",  "amount": "$100,000", "note": "called"},
        {"street": "Turn",  "amount": "$330,000", "note": "called"},
        {"street": "River", "amount": "$1.6m+",   "note": "all in, called"}
    ],
    "coach_question": "The hand as a player would say it, for slide 4.",
    "quotes": [
        {"text": "What someone said.", "attribution": "Who said it, when."},
        {"text": "The reply.",         "attribution": "Who replied."}
    ],
    "cta_keyword": "hand"
}


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: new_carousel.py <NNN-slug>")
    slug = sys.argv[1]
    dest = CAROUSELS / slug
    if dest.exists():
        sys.exit(f"{dest} already exists")

    dest.mkdir(parents=True)
    for name in ("base.css", "render.sh"):
        shutil.copy(TEMPLATE / name, dest / name)
    (dest / "render.sh").chmod(0o755)

    assets = dest / "assets"
    assets.mkdir()
    for p in (TEMPLATE / "assets").glob("*"):
        # backgrounds and the app icon carry over; the article does not
        if p.name != "article-pokernews.png":
            shutil.copy(p, assets / p.name)

    for n in range(1, 7):
        shutil.copy(TEMPLATE / f"slide-{n}.html", dest / f"slide-{n}.html")

    (dest / "hand.json").write_text(json.dumps(SKELETON, indent=2) + "\n")

    print(f"created {dest.relative_to(ROOT)}\n")
    print("  1. fill hand.json")
    print(f'  2. python3 scripts/run_coach.py "<the hand>" --json > {slug}/coach-output.json')
    print("  3. screenshot the article into assets/article.png")
    print("  4. edit the slide html for this hand, then ./render.sh")
    print("  5. python3 scripts/upload_assets.py carousels/%s <out/*.png>" % slug)
    print("  6. ./scripts/post_ig_carousel.sh <caption> <urls>")


if __name__ == "__main__":
    main()
