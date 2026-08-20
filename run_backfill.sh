#!/bin/bash
# Repeatedly calls the shop-image backfill endpoint until everything's done.
# Backs off when LinkPreview.net is rate-limiting us, instead of hammering it
# every second — LinkPreview's hourly limit is a rolling window, so calling it
# constantly while blocked just keeps pushing the unblock time further out
# rather than letting it clear.
# Usage: ./run_backfill.sh YOUR_SECRET

SECRET="$1"
if [ -z "$SECRET" ]; then
  echo "Usage: ./run_backfill.sh YOUR_SECRET"
  exit 1
fi

CONSECUTIVE_STALLS=0
MAX_STALLS=5

while true; do
  RESPONSE=$(curl -s -X POST https://hintdrop.app/api/admin/backfill-shop-images \
    -H "Content-Type: application/json" \
    -d "{\"secret\": \"$SECRET\"}")

  echo "$RESPONSE"

  REMAINING=$(echo "$RESPONSE" | grep -o '"remaining":[0-9]*' | grep -o '[0-9]*')

  if [ -z "$REMAINING" ]; then
    echo "Couldn't read a 'remaining' count from the response — stopping. Check the output above for an error."
    break
  fi

  if [ "$REMAINING" -eq 0 ]; then
    echo "Done — all products have images."
    break
  fi

  # A batch is still under rate-limit pressure if ANY failure in it is
  # marked retryable, even if a few items alongside it happened to succeed —
  # partial success doesn't mean the limit has cleared, so don't reset the
  # backoff just because updated > 0.
  if echo "$RESPONSE" | grep -q '"retryable":true'; then
    CONSECUTIVE_STALLS=$((CONSECUTIVE_STALLS + 1))
    if [ "$CONSECUTIVE_STALLS" -ge "$MAX_STALLS" ]; then
      echo "Stopped: $MAX_STALLS batches in a row hit a retryable error — LinkPreview.net's rate limit isn't clearing."
      echo "Its hourly limit is a rolling window, so repeated calls while blocked only push the unblock time further out."
      echo "Wait at least an hour with this script NOT running, then restart it. If this keeps happening, the account"
      echo "may need a higher LinkPreview.net plan given the current catalog size (~$REMAINING products still need images)."
      break
    fi
    WAIT=$((60 * CONSECUTIVE_STALLS))
    echo "Rate-limited this batch — stall $CONSECUTIVE_STALLS/$MAX_STALLS, waiting ${WAIT}s before retrying..."
    sleep "$WAIT"
    continue
  fi

  CONSECUTIVE_STALLS=0
  echo "Remaining: $REMAINING — continuing..."
  sleep 1
done
