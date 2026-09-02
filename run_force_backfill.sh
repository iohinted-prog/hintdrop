#!/bin/bash
# Re-scrapes products that already have an image, scoped to one retailer
# (or "all") — for cases where the existing image is wrong/low-quality and
# needs a genuine fresh scrape, not just a URL-param fix. Unlike
# run_backfill.sh, a failed re-scrape here never deactivates a product or
# clears its existing image — only a successful re-scrape overwrites it.
#
# Usage: ./run_force_backfill.sh YOUR_SECRET "Fortnum & Mason"
#        ./run_force_backfill.sh YOUR_SECRET all

SECRET="$1"
RETAILER="$2"
if [ -z "$SECRET" ] || [ -z "$RETAILER" ]; then
  echo "Usage: ./run_force_backfill.sh YOUR_SECRET \"Retailer Name\""
  echo "       ./run_force_backfill.sh YOUR_SECRET all"
  exit 1
fi

OFFSET=0
CONSECUTIVE_STALLS=0
MAX_STALLS=5

while true; do
  RESPONSE=$(curl -s -X POST https://hintdrop.app/api/admin/backfill-shop-images \
    -H "Content-Type: application/json" \
    -d "{\"secret\": \"$SECRET\", \"force\": true, \"retailer\": \"$RETAILER\", \"offset\": $OFFSET}")

  echo "$RESPONSE"

  DONE=$(echo "$RESPONSE" | grep -o '"done":[a-z]*' | grep -o '[a-z]*$')
  NEXT_OFFSET=$(echo "$RESPONSE" | grep -o '"nextOffset":[0-9]*' | grep -o '[0-9]*$')

  if [ -z "$NEXT_OFFSET" ]; then
    echo "Couldn't read a 'nextOffset' from the response — stopping. Check the output above for an error."
    break
  fi

  if [ "$DONE" = "true" ]; then
    echo "Done — reached the end of the \"$RETAILER\" set."
    break
  fi

  if echo "$RESPONSE" | grep -q '"retryable":true'; then
    CONSECUTIVE_STALLS=$((CONSECUTIVE_STALLS + 1))
    if [ "$CONSECUTIVE_STALLS" -ge "$MAX_STALLS" ]; then
      echo "Stopped: $MAX_STALLS batches in a row hit a retryable error — LinkPreview.net's rate limit isn't clearing."
      echo "Wait at least an hour with this script NOT running, then restart with the same offset ($OFFSET)."
      break
    fi
    WAIT=$((60 * CONSECUTIVE_STALLS))
    echo "Rate-limited this batch — stall $CONSECUTIVE_STALLS/$MAX_STALLS, waiting ${WAIT}s before retrying at offset $OFFSET..."
    sleep "$WAIT"
    continue
  fi

  CONSECUTIVE_STALLS=0
  OFFSET=$NEXT_OFFSET
  echo "Next offset: $OFFSET — continuing..."
  sleep 1
done
