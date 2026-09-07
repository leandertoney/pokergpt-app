#!/usr/bin/env python3
"""
Run a hand through the app's own analyzer, from the command line.

This is the content engine. The app's verdict comes from a prompt and a model
call in services/handAnalysis.ts -- not from anything on the phone -- so the
same call can be made here and the result is genuinely what the app says. No
screen recording, no device, and it scales to as many hands as you want to post
about.

The prompt below is copied verbatim from services/handAnalysis.ts. If that file
changes, this must change with it, or the content stops matching the product.

    python3 scripts/run_coach.py "I have ten-seven of clubs on a nine, king, ace board..."
    python3 scripts/run_coach.py --stakes "5/10" --json "..."
    echo "..." | python3 scripts/run_coach.py

Reads EXPO_PUBLIC_OPENAI_API_KEY from .env at the repo root.
"""
import argparse, json, os, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Verbatim from services/handAnalysis.ts. Do not paraphrase.
SYSTEM_PROMPT = """You are a poker hand analyzer. Extract hand data and provide strategic analysis from the conversation.

Return JSON only with this structure:
{
  "handData": {
    "heroHand": "cards like A♠ K♠ or pocket tens",
    "heroPosition": "UTG/MP/CO/BTN/SB/BB",
    "villainPosition": "position or null",
    "effectiveStack": number or null,
    "potSize": number or null,
    "flop": ["card1", "card2", "card3"] or null,
    "turn": "card" or null,
    "river": "card" or null,
    "action": "what action hero faces"
  },
  "analysis": {
    "recommendedAction": "ONE action, already decided, with a real number: \\"Call\\", \\"Fold\\", \\"Raise to $60\\". Never a placeholder, never \\"or\\".",
    "confidence": number 60-95,
    "reasoning": "2-3 sentence explanation",
    "gtoLine": "what GTO theory suggests",
    "exploitLine": "exploitative adjustment based on situation",
    "equity": number 0-100 or null,
    "potOdds": number like 2.5 for 2.5:1 or null,
    "riskLevel": "low" | "medium" | "high"
  }
}

RULES
- recommendedAction must name ONE action you have already decided on, sized in
  real dollars when it is a bet or raise. "Call or Raise to $X" is not an
  answer -- it copies this schema's example instead of reading the hand, and it
  is the first thing a new player ever sees the coach say.
- When the hand is short on detail, still commit, and carry the assumption in
  reasoning ("assuming he opens wide from there"). Hedging reads as no answer."""

MODEL = "gpt-4o-mini"      # matches handAnalysis.ts
TEMPERATURE = 0.4          # matches handAnalysis.ts
MAX_TOKENS = 800           # matches handAnalysis.ts


def api_key():
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("EXPO_PUBLIC_OPENAI_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return os.environ.get("EXPO_PUBLIC_OPENAI_API_KEY", "")


def analyze(transcript, stakes=None):
    key = api_key()
    if not key:
        sys.exit("No EXPO_PUBLIC_OPENAI_API_KEY in .env")

    content = f"Stakes: {stakes}\n\n{transcript}" if stakes else transcript
    body = json.dumps({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ],
        "temperature": TEMPERATURE,
        "max_tokens": MAX_TOKENS,
    }).encode()

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=body,
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {key}"},
    )
    with urllib.request.urlopen(req, timeout=40) as r:
        data = json.load(r)

    raw = data["choices"][0]["message"]["content"]
    m = re.search(r"\{[\s\S]*\}", raw)
    if not m:
        sys.exit("Model did not return JSON:\n" + raw)
    return json.loads(m.group(0))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("transcript", nargs="?", help="the hand, as a player would say it")
    ap.add_argument("--stakes", help='plain language, e.g. "1/3" or "5/10"')
    ap.add_argument("--json", action="store_true", help="raw JSON out")
    args = ap.parse_args()

    text = args.transcript or sys.stdin.read().strip()
    if not text:
        sys.exit("Give me a hand.")

    out = analyze(text, args.stakes)
    if args.json:
        print(json.dumps(out, indent=2))
        return

    h, a = out.get("handData", {}), out.get("analysis", {})
    print()
    print(f"  HAND      {h.get('heroHand','?')}   {h.get('heroPosition','?')}"
          f" vs {h.get('villainPosition','?')}")
    board = " ".join(filter(None, (h.get('flop') or []) + [h.get('turn'), h.get('river')]))
    if board:
        print(f"  BOARD     {board}")
    if h.get("potSize"):
        print(f"  POT       ${h['potSize']}")
    print(f"  FACING    {h.get('action','?')}")
    print()
    print(f"  VERDICT   {a.get('recommendedAction','?')}")
    print(f"  CONF      {a.get('confidence','?')}%   risk {a.get('riskLevel','?')}")
    print()
    for label, key in (("WHY", "reasoning"), ("GTO", "gtoLine"), ("EXPLOIT", "exploitLine")):
        if a.get(key):
            print(f"  {label:8}  {a[key]}")
    if a.get("equity") is not None:
        print(f"\n  EQUITY    {a['equity']}%   pot odds {a.get('potOdds','?')}")
    print()


if __name__ == "__main__":
    main()
