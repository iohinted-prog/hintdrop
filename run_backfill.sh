#!/bin/bash
# Repeatedly calls the shop-image backfill endpoint until everything's done.
# Usage: ./run_backfill.sh YOUR_SECRET

SECRET="$1"
if [ -z "$SECRET" ]; then
  echo "Usage: ./run_backfill.sh YOUR_SECRET"
  exit 1
fi

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

  echo "Remaining: $REMAINING — continuing..."
  sleep 1
done
