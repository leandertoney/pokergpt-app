#!/usr/bin/env bash
# Install (or remove) a 7am daily poker brief as a launchd job.
#
#   ./scripts/install_brief_schedule.sh          install
#   ./scripts/install_brief_schedule.sh --remove uninstall
#
# launchd rather than a Claude-scheduled cron: jobs created inside a Claude
# session die with that session and expire after 7 days, which is no use for
# something that has to run every morning. This survives reboots and runs
# whether or not anyone is at the keyboard.
#
# If the Mac is asleep at 7am, launchd runs the job when it next wakes.
set -euo pipefail

LABEL="com.universole.pokerbrief"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/store-assets/carousels/briefs"

if [ "${1:-}" = "--remove" ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"
  echo "removed $LABEL"
  exit 0
fi

mkdir -p "$OUT" "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>cd "$ROOT" &amp;&amp; /usr/bin/python3 scripts/poker_brief.py &gt; "$OUT/\$(date +%Y-%m-%d).txt" 2&gt;&amp;1; /usr/bin/python3 scripts/email_brief.py &gt;&gt; /tmp/$LABEL.err 2&gt;&amp;1</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>12</integer></dict>
  <key>RunAtLoad</key><false/>
  <key>StandardErrorPath</key><string>/tmp/$LABEL.err</string>
</dict>
</plist>
PLIST_EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

echo "installed $LABEL — runs 07:12 daily"
echo "writes to $OUT/<date>.txt, then emails it"
echo
echo "check:   launchctl list | grep pokerbrief"
echo "run now: launchctl kickstart -k gui/$(id -u)/$LABEL"
echo "remove:  ./scripts/install_brief_schedule.sh --remove"
