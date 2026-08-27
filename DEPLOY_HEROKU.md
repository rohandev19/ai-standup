# Panduan Deployment Heroku (Tanpa Docker)

Karena Anda tidak dapat menggunakan Docker/WSL di komputer lokal, panduan ini menggunakan metode **Native Git Deploy** bawaan Heroku.

Project AI Standup adalah **Monorepo (Turborepo)** dengan package manager `pnpm`. Kita memiliki dua aplikasi:
- **Backend (API)**: NestJS (`apps/api`)
- **Frontend (Web)**: Next.js (`apps/web`)

Untuk men-deploy *kedua* aplikasi ini dari *satu* repository GitHub yang sama ke Heroku (tanpa memecah repo), kita akan menggunakan teknik **Environment Variable Routing**.

---

## Tahap 1: Persiapan Proyek (Modifikasi `package.json`)

Heroku secara otomatis akan mencari perintah `start` (untuk menjalankan aplikasi) dan `heroku-postbuild` (untuk mem-build aplikasi) di file `package.json` yang berada di direktori utama (root).

Buka file `package.json` di **root directory** proyek, lalu ubah/tambahkan bagian `"scripts"` menjadi seperti ini:

```json
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "clean": "turbo run clean",
    "prepare": "husky",
    "heroku-postbuild": "if [ \"$PROJECT_TARGET\" = \"api\" ]; then pnpm run build --filter=api; else pnpm run build --filter=web; fi",
    "start": "if [ \"$PROJECT_TARGET\" = \"api\" ]; then pnpm --filter=api run start:prod; else pnpm --filter=web run start; fi"
  }
```

> [!TIP]
> **Bagaimana ini bekerja?** 
> Nantinya di Heroku, kita akan membuat variabel `PROJECT_TARGET`. Jika kita set `PROJECT_TARGET=api`, maka Heroku hanya akan mem-build dan menjalankan NestJS. Jika di-set `web`, maka Heroku akan mem-build dan menjalankan Next.js. Ini mencegah Heroku kebingungan di dalam environment Monorepo!

Setelah mengubah file di atas, jangan lupa untuk melakukan commit:
```bash
git add package.json
git commit -m "chore: add heroku deployment scripts"
```

---

## Tahap 2: Persiapan Heroku CLI

Pastikan Anda sudah menginstal **Heroku CLI** di Windows Anda. Jika belum, Anda bisa mendownloadnya dari web resmi Heroku atau via command prompt.
Setelah terinstal, buka terminal dan login:

```bash
heroku login
```
*(Ini akan membuka browser agar Anda bisa login ke akun Heroku Anda)*

---

## Tahap 3: Setup & Deploy Backend (API)

Kita akan membuat "App" pertama di Heroku khusus untuk backend.

1. **Buat App Heroku untuk API**
   ```bash
   # Ganti 'nama-unik' dengan nama pilihan Anda (misal: ai-standup-api-rohan)
   heroku create ai-standup-api-nama-unik
   ```

2. **Tambahkan Add-on Database (PostgreSQL & Redis)**
   Backend membutuhkan database PostgreSQL dan Redis (untuk real-time WebSockets).
   ```bash
   heroku addons:create heroku-postgresql:mini -a ai-standup-api-nama-unik
   heroku addons:create heroku-redis:mini -a ai-standup-api-nama-unik
   ```

3. **Set Environment Variables (Config Vars)**
   Kita perlu memberitahu app ini bahwa dia adalah `api` dan memasukkan API Key yang dibutuhkan.
   ```bash
   # Memberitahu script package.json bahwa ini adalah backend
   heroku config:set PROJECT_TARGET=api -a ai-standup-api-nama-unik
   
   # Memasukkan secret keys (Sesuaikan valuenya!)
   heroku config:set JWT_SECRET=bikin_rahasia_yg_panjang_sekali -a ai-standup-api-nama-unik
   heroku config:set OPENAI_API_KEY=sk-xxxxxx -a ai-standup-api-nama-unik
   
   # URL Frontend (Nanti diganti dengan URL Heroku Frontend Anda)
   heroku config:set FRONTEND_URL=https://ai-standup-web-nama-unik.herokuapp.com -a ai-standup-api-nama-unik
   ```
   *(Catatan: `DATABASE_URL` dan `REDIS_URL` otomatis di-set oleh Heroku saat Anda membuat add-ons di langkah 2)*

4. **Hubungkan Git Lokal ke Heroku API & Deploy!**
   ```bash
   # Menambahkan remote Heroku khusus API
   heroku git:remote -a ai-standup-api-nama-unik -r heroku-api
   
   # Push ke Heroku (Proses ini akan memakan waktu untuk build)
   git push heroku-api main
   ```

5. **Jalankan Migrasi Database Prisma**
   Setelah deploy berhasil, kita harus membuat struktur tabel di PostgreSQL Heroku:
   ```bash
   heroku run pnpm --filter=api exec prisma migrate deploy -a ai-standup-api-nama-unik
   ```

---

## Tahap 4: Setup & Deploy Frontend (Web)

Sekarang kita membuat "App" kedua di Heroku khusus untuk frontend Next.js.

1. **Buat App Heroku untuk Web**
   ```bash
   heroku create ai-standup-web-nama-unik
   ```

2. **Set Environment Variables (Config Vars)**
   ```bash
   # Memberitahu script package.json bahwa ini adalah frontend
   heroku config:set PROJECT_TARGET=web -a ai-standup-web-nama-unik
   
   # Memberitahu frontend kemana dia harus menembak request API
   heroku config:set NEXT_PUBLIC_API_URL=https://ai-standup-api-nama-unik.herokuapp.com -a ai-standup-web-nama-unik
   ```

3. **Hubungkan Git Lokal ke Heroku Web & Deploy!**
   ```bash
   # Menambahkan remote Heroku khusus Web
   heroku git:remote -a ai-standup-web-nama-unik -r heroku-web
   
   # Push ke Heroku
   git push heroku-web main
   ```

---

## Rangkuman Rutinitas Deployment

Selamat! Proyek Anda sudah berjalan di awan (cloud). Di kemudian hari, jika Anda membuat perubahan pada kode dan ingin melakukan update (deploy ulang), Anda hanya perlu melakukan dua baris perintah ini dari terminal lokal Anda:

**Update API (Backend):**
```bash
git push heroku-api main
```

**Update Web (Frontend):**
```bash
git push heroku-web main
```

> [!WARNING] 
> Jika Anda melakukan perubahan skema Prisma (file `schema.prisma`), Anda harus selalu menjalankan perintah migrasi setelah push ke backend:
> `heroku run pnpm --filter=api exec prisma migrate deploy -a ai-standup-api-nama-unik`
