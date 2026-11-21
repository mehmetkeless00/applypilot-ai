#!/bin/bash
# Daily Gemini run on the 100-pair sample (E011), scheduled with launchd.
#
#   eval/scripts/gemini-daily.sh install    # schedule daily at 12:00
#   eval/scripts/gemini-daily.sh status     # schedule, progress, last log lines
#   eval/scripts/gemini-daily.sh run        # one run now (what launchd calls)
#   eval/scripts/gemini-daily.sh uninstall  # remove the schedule
#
# 12:00 local time is after the free-tier daily quota resets (midnight
# Pacific). Each run scores sample pairs until the daily quota stops it;
# cached responses are never re-requested. When all 100 pairs are done it
# regenerates the report (metrics.py) and uninstalls itself. Nothing is
# committed or pushed automatically.
#
# API key: GEMINI_API_KEY_EVAL from eval/.env.local only (separate Google
# project; never the app's key). Each run logs the key's fingerprint.
# Log: eval/work/gemini-daily.log (gitignored).

set -u
LABEL="com.applypilot.eval-gemini-sample"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
LOG="$REPO/eval/work/gemini-daily.log"

uninstall() {
  rm -f "$PLIST"
  # Last, because it stops this job if launchd is running it.
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
}

case "${1:-}" in
  install)
    mkdir -p "$HOME/Library/LaunchAgents" "$REPO/eval/work"
    cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$REPO/eval/scripts/gemini-daily.sh</string><string>run</string></array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>12</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
EOF
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
    launchctl bootstrap "gui/$(id -u)" "$PLIST"
    echo "installed: $LABEL, daily at 12:00, log $LOG"
    ;;

  status)
    if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
      echo "scheduled: yes ($LABEL, daily at 12:00)"
      launchctl print "gui/$(id -u)/$LABEL" | grep -E "^\s(state|runs|last exit code) =" | sed -E 's/^[[:space:]]+/  /'
    else
      echo "scheduled: no"
    fi
    # Fingerprint of the key in eval/.env.local now; the last run's
    # "Gemini key:" line below should show the same fingerprint.
    key=$(sed -n 's/^GEMINI_API_KEY_EVAL=//p' "$REPO/eval/.env.local" 2>/dev/null | tr -d '"'"'"' \r')
    if [ -n "$key" ]; then
      echo "configured key: GEMINI_API_KEY_EVAL (fingerprint $(printf %s "$key" | shasum -a 256 | cut -c1-8))"
    else
      echo "configured key: GEMINI_API_KEY_EVAL not set in eval/.env.local"
    fi
    if [ -f "$LOG" ]; then
      grep "^sample:" "$LOG" | tail -1
      grep "^Gemini key:" "$LOG" | tail -1 | sed 's/^/last run: /'
      echo "--- last log lines ---"
      tail -8 "$LOG"
    else
      echo "no runs yet"
    fi
    ;;

  run)
    export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
    cd "$REPO" || exit 1
    echo "=== $(date '+%Y-%m-%d %H:%M:%S') ==="
    export NVM_DIR="$HOME/.nvm"
    set +u  # nvm.sh reads unset variables
    # shellcheck disable=SC1091
    source /opt/homebrew/opt/nvm/nvm.sh && nvm use >/dev/null
    set -u
    npx tsx eval/scripts/run-gemini.ts
    code=$?
    if [ "$code" -eq 0 ]; then
      echo "sample complete; regenerating report"
      /usr/bin/python3 eval/scripts/metrics.py >/dev/null && echo "report written to eval/results/"
      echo "uninstalling the daily job"
      uninstall
    else
      echo "not complete (exit $code); next run tomorrow at 12:00"
    fi
    ;;

  uninstall)
    uninstall
    echo "removed: $LABEL"
    ;;

  *)
    echo "usage: $0 install|status|run|uninstall" >&2
    exit 64
    ;;
esac
