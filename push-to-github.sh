#!/usr/bin/env bash
# ==============================================================================
# Helper Script: Push WhatsApp iGlass Companion to your GitHub Repository
# ==============================================================================

set -e

echo "🚀 Mempersiapkan push ke GitHub repository..."

# Cek apakah folder sudah merupakan git repository
if [ ! -d ".git" ]; then
  echo "📦 Menginisialisasi Git repository..."
  git init
  git branch -M main
fi

# Tambahkan gitignore jika belum ada
if [ ! -f ".gitignore" ]; then
  cat << 'EOF' > .gitignore
node_modules/
.baileys_auth/
.baileys_media/
.env
.env.local
dist/
*.zip
.DS_Store
EOF
fi

# Stage all files
git add .

# Buat commit
echo "📝 Membuat commit..."
git commit -m "Update WhatsApp iGlass: Realtime sync, anti-revoke, view-once decrypt & chat boom" || echo "Tidak ada perubahan baru untuk di-commit."

# Cek remote origin
if ! git remote | grep -q "origin"; then
  echo ""
  echo "⚠️ Remote 'origin' belum disetel."
  read -p "Masukkan URL repository GitHub Anda (contoh: https://github.com/App-Manz-V1/iGlass-WA-Companion.git): " REPO_URL
  if [ -n "$REPO_URL" ]; then
    git remote add origin "$REPO_URL"
  else
    echo "❌ URL tidak boleh kosong."
    exit 1
  fi
fi

echo "🚀 Melakukan git push ke origin main..."
git push -u origin main

echo ""
echo "✅ Berhasil dipost ke GitHub!"
