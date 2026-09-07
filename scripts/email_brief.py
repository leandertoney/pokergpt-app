#!/usr/bin/env python3
"""
Email the morning poker brief.

Run by the launchd job right after the brief itself, so the day's candidates
are in the inbox rather than in a file nobody opens.

    python3 scripts/email_brief.py                 # today's brief
    python3 scripts/email_brief.py --test          # prove delivery works
    python3 scripts/email_brief.py --dry-run       # print, send nothing

Transport is Resend. Local sendmail is not used: unauthenticated mail from a
home IP is dropped or spam-filed by Gmail, so it would fail silently, which is
the worst way for a daily job to fail.

Config, in .env at the repo root:

    RESEND_API_KEY=re_...
    BRIEF_EMAIL_TO=you@example.com
    BRIEF_EMAIL_FROM=Poker Brief <onboarding@resend.dev>

onboarding@resend.dev works on any Resend account without domain
verification. Swap it for a verified domain when you have one.
"""
import argparse, json, sys, urllib.error, urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BRIEFS = ROOT / "store-assets" / "carousels" / "briefs"


def env():
    out = {}
    p = ROOT / ".env"
    if p.exists():
        for line in p.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def send(cfg, subject, text):
    body = json.dumps({
        "from": cfg["from"],
        "to": [cfg["to"]],
        "subject": subject,
        "text": text,
    }).encode()
    req = urllib.request.Request(
        "https://api.resend.com/emails", data=body, method="POST",
        headers={"Authorization": f"Bearer {cfg['key']}",
                 "Content-Type": "application/json"},
    )
    try:
        r = json.load(urllib.request.urlopen(req, timeout=30))
        return r.get("id", "")
    except urllib.error.HTTPError as e:
        sys.exit(f"send failed: {e.code} {e.read().decode()[:400]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--test", action="store_true", help="send a short delivery test")
    ap.add_argument("--dry-run", action="store_true", help="print, send nothing")
    args = ap.parse_args()

    e = env()
    cfg = {
        "key": e.get("RESEND_API_KEY", ""),
        "to": e.get("BRIEF_EMAIL_TO", ""),
        "from": e.get("BRIEF_EMAIL_FROM", "Poker Brief <onboarding@resend.dev>"),
    }
    missing = [k for k in ("key", "to") if not cfg[k]]
    if missing and not args.dry_run:
        sys.exit("missing in .env: " +
                 ", ".join({"key": "RESEND_API_KEY", "to": "BRIEF_EMAIL_TO"}[m] for m in missing))

    if args.test:
        subject = "Poker brief — delivery test"
        text = ("If this arrived, the 07:12 brief can be emailed.\n\n"
                "Nothing to do. Reply-to and sender can be changed with "
                "BRIEF_EMAIL_FROM in .env.")
    else:
        f = BRIEFS / f"{date.today():%Y-%m-%d}.txt"
        if not f.exists():
            sys.exit(f"no brief for today at {f}")
        text = f.read_text()
        # Lead with the top candidate so the subject is useful on a phone
        # lock screen, where most of these will actually be read.
        top = ""
        for line in text.splitlines():
            s = line.strip()
            if s and not s.startswith(("POKER BRIEF", "http", "why:")) \
               and not s[0].isdigit() and "headlines scanned" not in s:
                top = s
                break
        subject = f"Poker brief · {top[:70]}" if top else f"Poker brief · {date.today():%a %-d %b}"
        text += ("\n\nRunbook: store-assets/carousels/RUNBOOK.md\n"
                 "Pick one, then: python3 scripts/new_carousel.py <NNN-slug>\n")

    if args.dry_run:
        print(f"To: {cfg['to']}\nFrom: {cfg['from']}\nSubject: {subject}\n\n{text}")
        return

    print("sent:", send(cfg, subject, text))


if __name__ == "__main__":
    main()
