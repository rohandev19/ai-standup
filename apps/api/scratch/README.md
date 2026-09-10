# 🧪 Testing Scripts

Directory ini berisi script-script untuk menguji fungsionalitas sistem AI Standup.

## 📋 Available Scripts

### 1. `test-ai.js` - AI Service Testing
Test komprehensif untuk semua fungsi AI service:
- Extract Blockers (klasifikasi severity)
- Generate Daily Summary
- Generate Weekly Digest

**Cara Menjalankan:**
```bash
node --env-file=.env scratch/test-ai.js
```

**Requirements:**
- EXPLABS_API_KEY sudah di-set di `.env`
- API key sudah diverifikasi di platform.experientiallabs.ai

**Expected Output:**
```
✅ SEMUA TEST SELESAI!

📊 Kesimpulan:
   - API key berfungsi dengan baik
   - Model DeepSeek v4.1-flash merespon dengan benar
   - Function calling (tool use) bekerja sempurna
   - Semua fitur AI service siap production
```

---

### 2. `test-auth.js` - Authentication System Testing
Test end-to-end untuk sistem autentikasi:
- User Registration
- Login Flow
- Protected Routes
- Password Reset
- Token Management

**Cara Menjalankan:**
```bash
# Pastikan API server running
npm run start:dev

# Di terminal terpisah:
node scratch/test-auth.js
```

**Expected Output:**
```
✅ SEMUA TEST SELESAI!

📊 Kesimpulan:
   ✓ Registration flow berfungsi
   ✓ Login dengan email & password berhasil
   ✓ JWT token generation bekerja
   ✓ Protected routes terimplementasi dengan benar
   ✓ Password reset flow tersedia
   ✓ Email verification system terintegrasi

🚀 AUTH SYSTEM SIAP PRODUCTION!
```

---

### 3. `get-workspaces.js` - Workspace Data Query
Query workspace data dari database untuk debugging.

---

### 4. `test-luxon.js` - Date/Time Library Testing
Test Luxon timezone handling.

---

## 🔧 Troubleshooting

### AI Service Test Gagal dengan Error 429
```
❌ Error: 429 Complete the $1 card verification to spend platform credits
```

**Solusi:**
1. Buka https://platform.experientiallabs.ai/credits?add-card=1
2. Tambahkan kartu untuk verifikasi $1
3. Jalankan ulang test

### Auth Test Gagal - API tidak terdeteksi
```
❌ API server tidak terdeteksi di http://localhost:4000
```

**Solusi:**
```bash
npm run start:dev
```

### Database Connection Error
**Solusi:**
```bash
# Pastikan PostgreSQL running
# Check DATABASE_URL di .env

# Run migrations jika perlu
npx prisma migrate deploy
```

---

## 📊 Test Results

Hasil testing lengkap tersimpan di root project:
- `TESTING-RESULTS.md` - Comprehensive test report

---

## 🚀 Quick Test Command

Test semua (auth + AI) sekaligus:
```bash
# Terminal 1: Start server
npm run start:dev

# Terminal 2: Run tests
node scratch/test-auth.js && node --env-file=.env scratch/test-ai.js
```

---

**Last Updated:** 10 September 2026
