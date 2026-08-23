# Tasks — AI Standup

Ikuti urutan fase. Tiap task = satu commit (lihat skill `feature-delivery-workflow`). Baris **Security:** wajib, bukan opsional.

---

## Phase 0: Infrastructure & Operational Safety Net

- [x] 0.1 Setup monorepo: `apps/web` (Next.js 16), `apps/api` (NestJS), `packages/shared` (types/enum bersama)
  - Shared package harus include: WebSocket event types, API response types, enum re-exports dari Prisma
- [ ] 0.2 Setup PostgreSQL + Redis lokal (native, sesuai preferensi non-Docker — Memurai kalau Windows)
- [x] 0.3 Init Prisma, tulis schema dari `design.md` Bagian 3, jalankan migration pertama
  - Pastikan semua model ada: User, Workspace, WorkspaceMember, Team, WorkspaceInvite, StandupEntry, BlockerFlag, AiSummary, WeeklyDigest, Notification, AuditLog
- [x] 0.4 Setup BullMQ + Bull Board
  - Konfigurasi queues: `email`, `ai-summary`, `ai-blocker`, `ai-weekly-digest`
  - Bull Board UI di `/admin/queues` (protected by admin auth)
  - Pastikan Redis connection shared antara Socket.io adapter, BullMQ, dan rate limiter
- [ ] 0.5 Setup Pino structured logging (JSON format) + correlation ID middleware
  - Setiap request punya unique `requestId` yang dibawa sampai ke log level terdalam
  - JANGAN log: passwords, API keys, standup text content (PII/sensitive)
- [ ] 0.6 Deploy skeleton kosong ke DigitalOcean:
  - Provision Droplet (Ubuntu, min 2GB RAM untuk NestJS + Next.js + BullMQ workers)
  - Setup Managed PostgreSQL + Managed Redis di DO dashboard
  - Install Node.js, PM2 (process manager), Nginx (reverse proxy)
  - Backend (`GET /health`) jalan via PM2, frontend Next.js standalone build jalan via PM2
  - Nginx reverse proxy: `api.domain.com` → NestJS port, `domain.com` → Next.js port, WSS upgrade header forwarding
  - Setup UFW firewall: hanya buka port 80, 443, 22 (SSH)
  - Setup SSL via Let's Encrypt (certbot) untuk kedua subdomain
  - Verifikasi FE dan BE bisa saling `fetch` (cek CORS dari awal, bukan belakangan)
  - `/health` endpoint harus return status PostgreSQL, Redis, dan reachability AI API
- [ ] 0.7 Setup Sentry (error tracking) + UptimeRobot/Better Stack (uptime) untuk kedua deployment
  - Sentry: attach `workspaceId` dan `userId` sebagai context ke setiap error, JANGAN attach standup content
- [ ] 0.8 Setup `.gitignore` + `gitleaks` pre-commit hook SEBELUM commit pertama
- [ ] 0.9 Setup automated backup PostgreSQL — DO Managed PostgreSQL sudah include daily auto-backup. Verifikasi backup aktif di DO dashboard + **tes restore manual sekali** dari backup snapshot
- [ ] 0.10 Setup global exception filter (NestJS) — sanitized client-facing errors, full detail logged server-side
  - Error response format standar: `{ statusCode, message, error, requestId }`
- [ ] 0.11 Checkpoint — skeleton FE dan BE saling terhubung di production, monitoring aktif, backup teruji, structured logging jalan, BullMQ queues terkonfigurasi

---

## Phase 1: Auth & Identity

- [x] 1.1 `User` entity, migration, bcrypt password hashing
  - Include semua field baru: `avatarUrl`, `isLocked`, `lockedUntil`, `failedLoginAttempts`, `consentGivenAt`, `globalEmailPref`
- [x] 1.2 `RegisterUseCase` — buat user status Unverified, kirim email verifikasi via BullMQ email queue
  - **Security:** rate limit registrasi per IP, generic error kalau email sudah terdaftar (jangan bilang "email sudah dipakai" — bilang "cek email untuk instruksi lebih lanjut" supaya tidak bocorkan keberadaan akun)
  - **Compliance:** require consent checkbox (`consentGivenAt` must be set), reject registration without consent
  - **Validation:** password complexity: min 8 chars, 1 uppercase, 1 lowercase, 1 digit (Requirement 2.9)
- [x] 1.3 `LoginUseCase` — refresh token httpOnly cookie, access token di response body
  - **Security:** rate limit per IP DAN per email (Requirement 2.5), pesan error generik, pin algoritma JWT eksplisit
  - **Security:** implement account lockout: setelah 10 consecutive failed attempts, set `isLocked=true`, `lockedUntil=now+30min`, kirim email warning (Requirement 2.10)
  - **Security:** reset `failedLoginAttempts` to 0 on successful login
- [x] 1.4 `VerifyEmailUseCase`, endpoint `GET /auth/verify-email/:token`, expire token 24 jam
- [x] 1.5 `RefreshTokenUseCase` + blocklist Redis saat logout
- [x] 1.6 `RequestPasswordResetUseCase` — generate token (min 32 byte random via `crypto.randomBytes`, BUKAN UUID biasa), kirim email via BullMQ, response identik terlepas email terdaftar atau tidak
  - **Security:** response timing dan konten harus identik untuk email terdaftar/tidak (Requirement 2.6) — cegah user enumeration lewat endpoint ini juga
- [x] 1.7 `ResetPasswordUseCase` — validasi token belum expired (1 jam) dan belum dipakai, update password, invalidate SEMUA refresh token/session User itu (Requirement 2.8)
  - **Security:** token single-use, tandai used begitu dipakai — sama pola dengan WorkspaceInvite
- [x] 1.8 `UpdateProfileUseCase` — update name, avatar URL
- [x] 1.9 `ChangePasswordUseCase` — require current password verification before allowing change
- [x] 1.10 Test: register→verify→login flow, login gagal dengan rate limit, refresh token rotation, reset password lalu konfirmasi session lama sudah invalid, account lockout setelah 10 failed attempts, consent required untuk registrasi, password complexity validation
- [x] 1.11 Checkpoint — auth lengkap termasuk password reset, account lockout, access token tersimpan in-memory di frontend (bukan localStorage), structured logging jalan di semua auth endpoints

---

## Phase 2: Workspace & Membership

- [x] 2.1 `Workspace`, `WorkspaceMember` entity + migration
  - Include semua field baru: `workingDays`, `lastProcessedDate`, `onboardingCompleted`, `isActive`, `leftAt`
- [x] 2.2 `CreateWorkspaceUseCase` — generate slug unik, assign creator sebagai Owner, set `onboardingCompleted=false`
- [x] 2.3 `WorkspaceMembershipGuard` (lihat design.md 5.2) — dipasang di SEMUA endpoint workspace-scoped mulai dari sini
  - **PENTING:** cek `isActive: true` di query membership, bukan cuma existence
- [x] 2.4 `UpdateWorkspaceSettingsUseCase` (nama, timezone, standup window, working days) — Owner/Admin only
  - **Security:** validasi `standupWindowEnd > standupWindowStart` (Requirement 6.3)
  - **Validation:** timezone harus dari daftar IANA timezone yang valid, working days harus array of 0-6
  - **Audit:** tulis AuditLog entry (`action: 'workspace.settings_updated'`) setiap kali use case ini berhasil (Requirement 15.1)
  - **UX:** perubahan timezone/window hanya berlaku mulai hari berikutnya, bukan retroaktif (Requirement 6.5)
- [x] 2.5 `GetMyWorkspacesUseCase` — list semua workspace yang user ikuti beserta role di masing-masing (Requirement 4.8)
- [x] 2.6 Endpoint list members, update role (Owner only), remove member
  - **Security:** WHEN member di-remove: (a) set `isActive=false, leftAt=now()`, (b) langsung invalidate akses WebSocket-nya (task ini terhubung ke Phase 5, tandai TODO)
  - **Security:** Owner transfer ownership: current Owner jadi Admin, target jadi Owner (Requirement 4.3). Validasi target harus member aktif
  - **Audit:** tulis AuditLog entry untuk `role_updated`, `member_removed`, `ownership_transferred`, termasuk acting User ID (Requirement 15.1)
- [x] 2.7 `LeaveWorkspaceUseCase` — member bisa self-remove, KECUALI Owner (harus transfer ownership dulu) (Requirement 4.7)
- [ ]* 2.8 Test: non-member akses endpoint workspace → 403, inactive member akses → 403, Owner transfer ownership → role berubah benar, self-leave → membership jadi inactive, Owner coba leave tanpa transfer → ditolak, verifikasi AuditLog entry benar-benar tertulis setelah tiap aksi di atas
- [ ] 2.9 Checkpoint — workspace bisa dibuat, setting bisa diubah, non-member ditolak konsisten di semua endpoint, soft-delete membership jalan, AuditLog terisi untuk semua aksi administratif

---

## Phase 3: Team Invitation

- [ ] 3.1 `WorkspaceInvite` entity + migration
- [ ] 3.2 `InviteMemberUseCase` — generate token (min 32 byte random via `crypto.randomBytes`, bukan UUID biasa), expire 7 hari, kirim email via BullMQ
  - **Audit:** tulis AuditLog entry `invite.sent` (Requirement 15.1)
  - **Validation:** cek duplikat — kalau email sudah punya pending invite untuk workspace yang sama, resend yang lama, jangan buat baru (Requirement 3.6)
  - **Bulk:** support comma/newline separated emails, max 20 per request (Requirement 3.7)
- [ ] 3.3 `AcceptInviteUseCase` — handle dua alur (user baru daftar dulu / user lama tinggal login), auto-assign role Member
  - **Security:** invite token single-use, tandai `usedAt` begitu dipakai — cegah token dipakai berkali-kali
  - **Event:** emit `invite.accepted` event → trigger notification ke inviter ("Budi has joined your workspace") (Requirement 3.8)
- [ ] 3.4 `ResendInviteUseCase` — allow Owner/Admin to resend expired invites with new token
- [ ]* 3.5 Test: invite expired ditolak, invite dipakai 2x ditolak di percobaan kedua, duplicate invite untuk email yang sama → resend bukan duplicate baru, bulk invite 20 emails → 20 individual invites terkirim, invite accepted → notification ke inviter terkirim
- [ ] 3.6 Checkpoint

---

## Phase 4: Standup Submission (Core)

- [x] 4.1 `StandupEntry` entity + migration (unique constraint `[workspaceId, userId, standupDate]`)
  - Include field baru: `editedAt`
- [x] 4.2 `SubmitStandupUseCase` — upsert berdasarkan constraint di atas, tentukan status (Submitted/Late) berdasarkan jam window dan working days Workspace
  - **Security:** validasi max 2000 karakter per field (Requirement 5.4), DTO validation ketat
  - **Working Days:** IF hari ini bukan working day → reject submission with message "Hari ini bukan hari kerja" (Requirement 5.7)
  - **Draft:** standup form auto-save ke localStorage di frontend (Requirement 5.8)
  - **Grace period:** setelah submit, boleh edit dalam 5 menit tanpa re-trigger side effects (Requirement 5.6)
  - **Event:** emit `standup.submitted` event → triggers: WebSocket presence_update, nothing else (AI is triggered by cron, not by individual submission)
- [x] 4.3 Tambah kolom `lastProcessedDate` (DATE) di `Workspace` — flag untuk cegah window-close diproses berkali-kali (design.md 6.2)
- [x] 4.4 Cron job: Window Close Processor — jalan **tiap 5 menit**
  - Untuk tiap Workspace aktif: hitung waktu sekarang di timezone Workspace itu (pakai library timezone-aware seperti Luxon/date-fns-tz, JANGAN hitung offset manual)
  - **Working Days:** IF hari ini bukan working day untuk Workspace ini → SKIP
  - Cek apakah window sudah tutup DAN `lastProcessedDate != hari ini di timezone Workspace itu`
  - **Security/Correctness:** proses mark-Missed HARUS pakai pola "cuma buat entry untuk member AKTIF yang belum punya entry sama sekali hari ini" (design.md 6.3, `findMany` member aktif tanpa entry lalu `createMany`) — JANGAN `updateMany` yang bisa menimpa submission valid yang baru masuk detik-detik terakhir
  - Update `lastProcessedDate` setelah selesai memproses
  - Dispatch BullMQ jobs: `ai-summary` dan `ai-blocker` (diproses di Phase 6)
- [x] 4.5 Cron job: Submission Reminder — jalan **tiap 5 menit**
  - 30 menit sebelum window tutup: kirim reminder ke member aktif yang belum submit
  - **Working Days:** SKIP non-working days
  - Window 25-30 menit mencegah reminder dikirim dua kali (design.md 6.4)
  - Email dikirim via BullMQ email queue + create in-app Notification
  - **Mute:** skip member yang `isMuted=true` (Requirement 10.3)
- [x] 4.6 Endpoint `GET .../standup-entries/today` — hasilnya termasuk status semua member AKTIF (submitted/late/missed/not-yet), plus window status (open/closed, minutes remaining)
- [x] 4.7 Endpoint `GET .../standup-entries/history` — paginated, filterable by date range, member, keyword search (Requirement 11)
  - **Security:** search HARUS scoped ke workspaceId — keyword match yang kebetulan exist di Workspace lain TIDAK boleh bocor
  - **Pagination:** default 20 per page, max 100
- [x]* 4.8 Test:
  - Submit 2x hari sama → update bukan duplikat
  - Submit setelah window tutup → status Late
  - Submit pada non-working day → ditolak
  - Cron Missed jalan benar untuk dua Workspace di timezone berbeda sekaligus (jangan test cuma satu timezone)
  - Simulasikan submit yang masuk PAS beberapa detik sebelum cron run → pastikan tidak tertimpa jadi Missed
  - Reminder hanya terkirim ke member yang belum submit DAN tidak muted
  - History search tidak return data dari Workspace lain meski keyword match (IDOR test)
  - Grace period edit: edit dalam 5 menit → `editedAt` di-set, tidak re-trigger event
- [x] 4.9 Checkpoint — submission jalan end-to-end, unique constraint terbukti mencegah duplikat lewat test race condition (dua request bersamaan), scheduling terbukti benar lintas minimal 2 timezone berbeda, working days filter jalan, reminder jalan dengan mute respect

---

## Phase 5: Real-Time Presence Dashboard

  - **Security:** JANGAN izinkan join room tanpa verifikasi — ini bukan opsional, ini requirement 12.3
  - **Security:** cek `isActive: true` pada membership — member yang sudah di-remove tidak boleh join
  - **Security:** log violation attempts (Requirement 12.5)
- [ ] 5.3 Implement WebSocket token validation — periodik cek token expiry, force disconnect expired clients
- [ ] 5.4 Broadcast `presence_update` dari event listener (bukan langsung dari Use Case)
  - Listener subscribe ke `standup.submitted` event dari EventEmitter
- [ ] 5.5 Broadcast `member_removed`, disconnect socket yang bersangkutan dari room (selesaikan TODO dari task 2.6)
  - Listener subscribe ke `member.removed` event
- [ ] 5.6 Broadcast `member_joined` saat invite diterima
  - Listener subscribe ke `invite.accepted` event
- [ ] 5.7 Broadcast `notification_count` ke user room saat notification baru dibuat
- [ ] 5.8 Frontend: Dashboard route sebagai Server Component untuk fetch initial state (REST), passing sebagai props ke satu Client Component (`'use client'`) yang pegang koneksi `socket.io-client`
  - JANGAN jadikan seluruh halaman Client Component, cukup bagian yang benar-benar butuh koneksi socket (design.md, catatan arsitektur)
  - Status colors: Submitted (green), Late (amber), Missed (red), Not Yet (neutral gray) — konsisten
  - Participation progress bar: "6 dari 8 orang sudah submit (75%)"
  - Window status: "Window aktif (sisa 2 jam 15 menit)" / "Window sudah tutup hari ini"
  - Active blockers panel: prominent, not in a tab
- [ ] 5.9 Auto-reconnect + resync full state via REST saat reconnect (Requirement 7.4)
  - Show "Reconnecting..." indicator, JANGAN blank dashboard
- [ ] 5.10 Real-time status transition animations (150-200ms, Requirement 7.8)
- [ ]* 5.11 Test:
  - Dua client browser berbeda, submit di satu, verifikasi presence update sampai ke yang lain dalam <2 detik
  - Client dari Workspace lain TIDAK menerima event (isolation test)
  - Member yang di-remove langsung ter-disconnect dari room
  - Reconnect setelah network drop: dashboard resync tanpa data loss
  - Inactive member TIDAK bisa join room
  - Token expired → client force-disconnected
- [ ] 5.12 Checkpoint — dashboard real-time terbukti jalan lintas dua browser session, isolasi antar-Workspace terverifikasi lewat test eksplisit, reconnect graceful

---

## Phase 6: AI Summarization & Blocker Detection

- [ ] 6.1 Setup Claude API client dengan model `claude-haiku-4-5-20251001` (REFACTOR DARI OPENAI KE CLAUDE)
  - Simpan `ANTHROPIC_API_KEY` di env (jangan pernah di-log)
  - Implement circuit breaker pattern: CLOSED → OPEN (after 5 failures in 10 min) → HALF_OPEN (after 5 min cooldown)
  - Circuit breaker state stored in Redis
- [x] 6.2 `GenerateDailySummaryUseCase` — satu batch call per Workspace, skip kalau 0 entries (design.md 7.1)
  - Include metadata in AiSummary: entryCount, blockerCount, submissionRate, missedMembers
  - Prompt structure as specified in design.md 7.2 — include anti-injection delimiters (---DATA AWAL--- / ---DATA AKHIR---)
- [ ] 6.3 `DetectBlockersUseCase` — pakai **tool use** (structured output, design.md 7.3) dengan `tool_choice` dipaksa ke tool klasifikasi, BUKAN minta JSON lewat instruksi teks biasa
  - **Security:** tetap validasi shape response tool sebelum simpan ke DB meski terstruktur (jangan asumsikan API tidak pernah error/berubah) — fallback ke "tanpa severity" per Requirement 9.5 kalau tetap gagal
  - Severity guidelines di system prompt: HIGH = depends on external party + blocks others, MEDIUM = solvable alone but time-consuming, LOW = minor/workaround available
- [ ] 6.4 BullMQ job processors untuk `ai-summary` dan `ai-blocker` queues
  - Retry: max 3 attempts, exponential backoff (5s, 20s), timeout 15s per attempt
  - Dead-letter queue for permanently failed jobs
  - On final failure: summary → save placeholder text, blocker → show raw text without severity badge
- [ ] 6.5 Cron trigger otomatis saat window tutup (terhubung ke flag `lastProcessedDate` dari task 4.3/4.4) + endpoint manual trigger (rate-limited 1x/menit/Workspace)
  - Manual trigger: kalau summary sudah ada untuk hari itu, regenerate (replace) bukan duplicate (Requirement 8.7)
- [ ] 6.6 Event-driven side effects setelah AI selesai:
  - `summary.generated` event → WebSocket `summary_ready` broadcast + email digest ke Owner/Admin + create Notification
  - `blocker.high_created` event → WebSocket `blocker_alert` broadcast + email alert ke Owner/Admin + create Notification
- [ ] 6.7 `ResolveBlockerUseCase` — mark blocker resolved, record resolvedById dan resolvedAt (Requirement 9.6)
  - **Audit:** tulis AuditLog entry `blocker.resolved`
- [ ]* 6.8 Test:
  - 0 entries → skip AI call (verifikasi TIDAK ada API call terjadi via mock/spy)
  - Tool response malformed → fallback graceful (raw text displayed without severity)
  - Rate limit manual-trigger bekerja (second request within 1 min rejected)
  - Retry berhenti setelah 3 percobaan dan fallback tersimpan dengan benar (mock API error)
  - Circuit breaker: setelah 5 failures, calls stop untuk 5 menit (mock)
  - Summary regeneration: manual trigger saat summary sudah ada → replace bukan duplicate
  - Blocker resolve: resolvedById dan resolvedAt ter-set benar
  - Anti-injection: entry dengan teks "ignore previous instructions" tidak mempengaruhi summary output quality (manual review)
- [ ] 6.9 Checkpoint — AI summary dan blocker detection jalan, terbukti maksimal 2 call/Workspace/hari lewat log/monitoring, retry strategy teruji, circuit breaker teruji, resolve blocker jalan

---

## Phase 7: AI Weekly Digest

- [ ] 7.1 `WeeklyDigest` entity sudah ada dari Phase 0 migration
- [ ] 7.2 `GenerateWeeklyDigestUseCase` — aggregate daily summaries + blocker flags untuk satu minggu
  - Input: semua AiSummary + BlockerFlag dari weekStartDate sampai weekEndDate
  - Calculate: totalEntries, totalBlockers, resolvedBlockers, avgSubmissionRate, topMissers
  - Skip AI call kalau 0 submissions all week (Requirement 17.6)
  - Prompt structure as specified in design.md 7.4
- [ ] 7.3 BullMQ job processor untuk `ai-weekly-digest` queue
  - Same retry strategy as daily: 3 attempts, exponential backoff
- [ ] 7.4 Cron job: Weekly Digest Trigger — jalan **tiap jam**
  - IF hari ini = hari kerja terakhir minggu ini (berdasarkan workingDays) AND jam >= window close AND belum ada digest minggu ini → dispatch job
  - Working day calculation harus benar: kalau workingDays=[1,2,3,4,5], hari terakhir = Jumat
- [ ] 7.5 Manual trigger endpoint (rate-limited 1x/jam/workspace) — Owner/Admin only
- [ ] 7.6 Event-driven side effects:
  - `weekly_digest.generated` event → WebSocket `digest_ready` broadcast + email digest ke Owner/Admin + create Notification
- [ ] 7.7 Frontend: Weekly Digest view di History page — tampilkan digest per minggu dengan collapsible detail
- [ ]* 7.8 Test:
  - 0 submissions all week → skip AI call
  - Digest generated with correct aggregated stats
  - Cron triggers on correct day (last working day)
  - Manual trigger works and rate-limited
  - Email digest delivered to Owner/Admin
- [ ] 7.9 Checkpoint — weekly digest jalan otomatis dan manual, email delivered, stats akurat

---

## Phase 8: Notifications System

- [x] 8.1 `Notification` entity sudah ada dari Phase 0 migration
- [x] 8.2 `CreateNotificationUseCase` — create notification record + dispatch real-time update via WebSocket user room
  - Types: SUBMISSION_REMINDER, BLOCKER_ALERT, SUMMARY_READY, WEEKLY_DIGEST_READY, INVITE_ACCEPTED, MEMBER_REMOVED
- [x] 8.3 Endpoint `GET /users/me/notifications` — paginated, filterable by unread
- [x] 8.4 Endpoint `PATCH /users/me/notifications/:id/read` — mark as read
- [x] 8.5 Endpoint `POST /users/me/notifications/read-all` — mark all as read
- [x] 8.6 Frontend: Notification bell icon in navigation
  - Badge count (unread), updated real-time via WebSocket `notification_count` event
  - Dropdown panel showing recent notifications
  - Click notification → navigate to relevant page (dashboard, blocker, etc.)
- [x] 8.7 Email notification integration — consolidate all email sending points:
  - Submission reminder (Phase 4.5) → already sending via BullMQ
  - Blocker alert HIGH (Phase 6.6) → already sending via BullMQ
  - Daily summary digest (Phase 6.6) → already sending via BullMQ
  - Weekly digest (Phase 7.6) → already sending via BullMQ
  - Invite accepted (Phase 3.3) → already sending via BullMQ
  - **Mute respect:** all email notifications check `isMuted` and `globalEmailPref` before sending
- [x] 8.8 Cron job: Notification Purge — daily, delete notifications older than 30 days (design.md 6.6)
- [x]* 8.9 Test:
  - Notification created and WebSocket badge count updated
  - Mark as read → badge count decremented
  - Mark all as read → badge count = 0
  - Muted user doesn't receive email but still gets in-app notification
  - globalEmailPref OFF → no emails at all
  - 30-day purge removes old notifications
  - Offline user: notification stored, delivered when they next open app
- [x] 8.10 Checkpoint — notification center jalan, real-time badge, email notifications respect mute settings

---

## Phase 9: Onboarding Wizard

- [x] 9.1 `UpdateOnboardingUseCase` — track which steps are completed, mark `onboardingCompleted=true` when done
- [x] 9.2 Frontend: Multi-step onboarding wizard
  - Step 1: Workspace name (already set during creation, allow edit)
  - Step 2: Timezone & standup window (pre-fill timezone from browser)
  - Step 3: Working days configuration (checkboxes, default Mon-Fri)
  - Step 4: Invite team members (email input, supports bulk)
  - Step 5: Done — redirect to dashboard
  - Each step skippable, progress saved
  - Idempotent: refresh doesn't lose progress or create duplicates
- [x] 9.3 Dashboard banner: "Complete setup" shown if `onboardingCompleted=false`
- [x]* 9.4 Test:
  - Complete all steps → onboardingCompleted=true, banner disappears
  - Skip steps → defaults applied, banner persists
  - Refresh mid-wizard → progress retained
  - Re-visit wizard after completion → shows current settings (edit mode)
- [x] 9.5 Checkpoint — onboarding wizard functional, smooth UX

---

## Phase 10: Team Analytics Dashboard

- [x] 10.1 Analytics endpoints (Owner/Admin only):
  - `GET .../analytics/submission-rate?days=30` — daily submission rate for last N days
  - `GET .../analytics/blocker-trend?days=30` — blocker count by severity over time
  - `GET .../analytics/member-streaks` — per-member submission streak/consistency
  - `GET .../analytics` — composite Team Health Score
  - **Security:** all analytics scoped strictly to workspaceId
- [x] 10.2 Team Health Score calculation:
  - Submission rate (weight 60%) + blocker resolution rate (weight 40%)
  - Calculated from last 30 days of data
- [x] 10.3 "Needs Attention" logic: members with 3+ consecutive missed standups (Requirement 18.3)
- [x] 10.4 Frontend: Analytics page with Recharts
  - Daily submission rate line chart (30 days)
  - Blocker frequency bar chart by severity
  - Member consistency table with streak info
  - Team Health Score gauge/number
  - "Needs Attention" highlighted section
- [x]* 10.5 Test:
  - Analytics data correctly scoped to workspace (no cross-workspace leakage)
  - Health score calculation matches expected formula
  - Needs Attention correctly identifies members with 3+ consecutive misses
  - Member-only role → 403 on analytics endpoints
- [x] 10.6 Checkpoint — analytics dashboard functional with real data, charts render correctly

---

## Phase 11: History, Search, Export & Public Pages

- [ ] 11.1 Frontend History page with:
  - Date range picker
  - Member filter dropdown
  - Keyword search input
  - Paginated results (20 per page)
  - AI content visually distinguished from human content (label + styling)
  - Weekly digest section (collapsible by week)
- [ ] 11.2 Data Export endpoints (Owner only):
  - `POST .../export/entries?from=&to=` → CSV download
  - `POST .../export/summaries?from=&to=` → CSV/text download
  - Rate-limited: max 1 export per 5 minutes per Workspace (Requirement 21.3)
- [x] 11.3 Landing Page — ikuti skill `ui-ux-craft`, jangan pola generik hero-3-card
  - Lead with realistic dashboard mockup/screenshot
  - SEO meta tags (title, description, Open Graph) (Requirement 13.3)
  - Clear CTA to sign up
- [x] 11.4 Login Page — clean, professional
- [x] 11.5 Register Page — with consent checkbox (Requirement 14.1)
- [x] 11.6 Password Reset pages (request + reset form)
- [x] 11.7 Invite acceptance page — show workspace info, prompt login/register
- [x] 11.8 User Profile page — name, avatar, password change, notification preferences, workspace list
- [x]* 11.9 Test:
  - Search history tidak bisa return data dari Workspace lain meski keyword match (test IDOR-style eksplisit)
  - Export CSV contains correct data, scoped to workspace
  - Export rate limit works (second request within 5 min rejected)
  - Landing page renders without auth
  - SEO meta tags present in HTML source
  - Consent checkbox required for registration
- [ ] 11.10 Checkpoint

---

## Phase 12: Security & Legal Hardening (sebelum go-live)

- [x] 12.1 Audit final: `.env` tidak pernah ke-commit di history manapun; kalau ada, rotate semua secret
- [x] 12.2 Audit CORS REST: whitelist origin eksplisit antara domain FE (`domain.com`) dan domain BE (`api.domain.com`), tidak ada wildcard + credentials
- [x] 12.2b Audit CORS Socket.io — dikonfigurasi TERPISAH dari CORS REST NestJS (design.md 12), pastikan origin whitelist di-set eksplisit dan tidak wildcard
- [x] 12.2c Audit Nginx config: pastikan WebSocket upgrade header (`Upgrade`, `Connection`) di-forward dengan benar untuk Socket.io endpoint
- [x] 12.3 Kepatuhan data privasi:
  - Privacy policy page (mention Claude API as AI processor explicitly — Requirement 14.5)
  - Consent checkbox saat registrasi terpasang dan enforced
  - Mekanisme hapus akun (manual boleh — documented contact method)
  - Data portability disclosure (export feature exists)
- [ ] 12.4 Restore backup penuh sekali secara manual, konfirmasi berhasil
- [x] 12.5 Review ulang `WorkspaceMembershipGuard` terpasang di SEMUA endpoint workspace-scoped — buat checklist endpoint vs guard, jangan andalkan ingatan
  ```
  Checklist template:
  ✅ GET    /workspaces/:workspaceId          → WorkspaceMembershipGuard
  ✅ PATCH  /workspaces/:workspaceId          → WorkspaceMembershipGuard + RolesGuard(Owner,Admin)
  ✅ POST   .../invites                        → WorkspaceMembershipGuard + RolesGuard(Owner,Admin)
  ✅ GET    .../members                        → WorkspaceMembershipGuard
  ✅ PATCH  .../members/:userId/role           → WorkspaceMembershipGuard + RolesGuard(Owner)
  ✅ DELETE .../members/:userId                → WorkspaceMembershipGuard + RolesGuard(Owner,Admin)
  ✅ POST   .../standup-entries                → WorkspaceMembershipGuard
  ✅ GET    .../standup-entries/today           → WorkspaceMembershipGuard
  ✅ GET    .../standup-entries/history         → WorkspaceMembershipGuard
  ✅ GET    .../ai-summaries/:date             → WorkspaceMembershipGuard
  ✅ POST   .../ai-summaries/generate          → WorkspaceMembershipGuard + RolesGuard(Owner,Admin)
  ✅ GET    .../weekly-digests/:weekStart      → WorkspaceMembershipGuard
  ✅ POST   .../weekly-digests/generate        → WorkspaceMembershipGuard + RolesGuard(Owner,Admin)
  ✅ GET    .../blocker-flags                  → WorkspaceMembershipGuard
  ✅ PATCH  .../blocker-flags/:id/resolve      → WorkspaceMembershipGuard + RolesGuard(Owner,Admin)
  ✅ GET    .../analytics                      → WorkspaceMembershipGuard + RolesGuard(Owner,Admin)
  ✅ GET    .../audit-logs                     → WorkspaceMembershipGuard + RolesGuard(Owner,Admin)
  ✅ POST   .../export/entries                 → WorkspaceMembershipGuard + RolesGuard(Owner)
  ✅ POST   .../export/summaries               → WorkspaceMembershipGuard + RolesGuard(Owner)
  ```
- [x] 12.6 Review ulang WebSocket authorization — pastikan tidak ada event yang bisa di-trigger client tanpa verifikasi membership
- [x] 12.7 XSS audit: verify all user-generated content is escaped before rendering (React default, but check any `dangerouslySetInnerHTML`)
- [x] 12.8 Rate limiting audit: verify all cost-bearing and public endpoints have appropriate rate limits
- [x] 12.9 Security event logging audit: verify tenant boundary violations are logged (Requirement 12.5)
- [x] 12.10 CSRF protection audit: verify sameSite cookie + CSRF token on state-changing requests
- [x] 12.11 Accessibility baseline check:
  - All interactive elements keyboard-navigable
  - All form inputs have labels (not placeholder-only)
  - Status colors have text/icon alternatives (color-blind safe)
  - Contrast ratio ≥ 4.5:1 for body text
- [x] 12.12 Checkpoint — Go-live

---

## Dependency Graph

```
Phase 0 (infra + BullMQ + logging)
  → Phase 1 (auth + account lockout + profile)
    → Phase 2 (workspace + membership guard + soft-delete)
      → Phase 3 (invite + bulk + notifications) ─┐
      → Phase 4 (submission + cron + reminder) ───┤
                                                    ├→ Phase 5 (real-time + event-driven WebSocket)
                                                    ├→ Phase 6 (AI daily + blocker + circuit breaker)
                                                    │    → Phase 7 (AI weekly digest)
                                                    └→ Phase 8 (notification center + email consolidation)
                                                         → Phase 9 (onboarding wizard)
                                                           → Phase 10 (team analytics dashboard)
                                                             → Phase 11 (history + export + public pages)
                                                               → Phase 12 (hardening + go-live)
```

Phase 5 dan 6 bisa dikerjakan paralel kalau mau (keduanya cuma bergantung ke Phase 4, tidak saling bergantung satu sama lain) — tapi tetap satu task satu commit, jangan campur.

Phase 7 (weekly digest) bergantung ke Phase 6 (daily summary) karena weekly digest mengagregasi daily summaries.

Phase 8 (notifications) bisa dimulai paralel dengan Phase 5/6 untuk bagian infrastrukturnya, tapi integrasi email consolidation perlu Phase 5/6/7 sudah ada.

Phase 9-11 bisa dikerjakan paralel setelah Phase 8 selesai.

Phase 12 SELALU terakhir — jangan mulai sebelum semua fitur selesai.
