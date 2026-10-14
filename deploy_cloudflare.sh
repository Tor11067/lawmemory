#!/usr/bin/env bash

# ==========================================================
# 🚀 LawMemory - Cloudflare Pages & D1 Deployment Script
# ==========================================================

set -e

echo "=========================================================="
echo "⚖️  LawMemory - Deploy to Cloudflare Pages & D1 Database"
echo "=========================================================="

# Check if wrangler is available
if ! command -v wrangler &> /dev/null && ! command -v npx &> /dev/null; then
  echo "⚠️  ไม่พบคำสั่ง wrangler หรือ npx ในระบบ"
  echo "👉 คุณสามารถนำขึ้น Cloudflare Pages ผ่านหน้าเว็บ Dashboard (ฟรีและง่ายที่สุด)"
  echo "   อ่านคู่มือฉบับเต็มได้ที่ไฟล์: DEPLOY_CLOUDFLARE.md"
  exit 1
fi

WRANGLER_CMD="wrangler"
if ! command -v wrangler &> /dev/null; then
  WRANGLER_CMD="npx wrangler"
fi

echo "1. ตรวจสอบสถานะการเข้าสู่ระบบ Cloudflare..."
$WRANGLER_CMD whoami || {
  echo "กรุณาเข้าสู่ระบบ Cloudflare ก่อน:"
  $WRANGLER_CMD login
}

echo ""
echo "2. ตรวจสอบ/สร้างฐานข้อมูล Cloudflare D1 (lawmemory-db)..."
D1_CREATE_OUTPUT=$($WRANGLER_CMD d1 create lawmemory-db 2>&1 || true)
echo "$D1_CREATE_OUTPUT"

# Extract database ID if printed
DB_ID=$(echo "$D1_CREATE_OUTPUT" | grep -o 'database_id = "[^"]*"' | head -n 1 | cut -d'"' -f2 || true)

if [ -n "$DB_ID" ]; then
  echo "✅ สร้างฐานข้อมูลสำเร็จ! Database ID: $DB_ID"
  echo "กำลังอัปเดต wrangler.toml ด้วย Database ID..."
  sed -i.bak "s/database_id = \".*\"/database_id = \"$DB_ID\"/" wrangler.toml && rm -f wrangler.toml.bak
else
  echo "ℹ️  ใช้การตั้งค่าฐานข้อมูลเดิมใน wrangler.toml หรือ Cloudflare Dashboard"
fi

echo ""
echo "3. ดำเนินการสร้างตาราง (Tables) และ Schema ใน D1 Database..."
$WRANGLER_CMD d1 execute lawmemory-db --remote --file=./schema.sql || true

echo ""
echo "4. อัปโหลดขึ้น Cloudflare Pages Hosting..."
$WRANGLER_CMD pages deploy . --project-name lawmemory

echo ""
echo "=========================================================="
echo "🎉 นำขึ้น Cloudflare Pages สำเร็จเรียบร้อย!"
echo "👉 เข้าสู่หน้าเว็บของคุณ และไปที่แท็บ 'จัดการข้อมูล' เพื่อตรวจสอบสถานะ D1"
echo "=========================================================="
