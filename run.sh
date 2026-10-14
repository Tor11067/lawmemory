#!/usr/bin/env bash

PORT=8000
# Check if port is in use, find another if needed
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

echo "=========================================================="
echo "⚖️  LawMemory - แอพท่องจำประมวลกฎหมายอาญา & แพ่งฯ"
echo "🌐  กำลังเปิดเว็บเซิร์ฟเวอร์ที่: http://localhost:$PORT"
echo "=========================================================="

# Open browser
if command -v open >/dev/null 2>&1; then
  sleep 0.5 && open "http://localhost:$PORT" &
fi

# Run python server
python3 -m http.server $PORT
