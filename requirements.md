# Requirements — AI Standup (Async Team Standup + AI Summary Platform)

## 1. Problem Statement

Tim remote/hybrid kecil (5-30 orang) sering skip daily standup karena beda zona waktu, males meeting berulang, atau merasa "cuma laporan basa-basi." Akibatnya manajer kehilangan visibilitas progress harian dan blocker sering baru ketahuan setelah terlambat. Produk komersial yang menyelesaikan ini sudah ada (Geekbot, Standuply, DailyBot) — cukup tervalidasi sebagai kebutuhan nyata, bukan ide yang dipaksakan.

**AI Standup** menyelesaikan ini dengan: submission async (kapan saja dalam window waktu tertentu), dashboard real-time siapa sudah/belum submit, AI yang meringkas semua update tim jadi satu laporan naratif + otomatis mendeteksi blocker yang butuh perhatian manajer, weekly digest otomatis untuk recap mingguan, dan trend analysis supaya manajer bisa lihat pola tim dari waktu ke waktu.

## 2. Goals

1. Tim bisa submit update harian secara async, tanpa meeting sinkron
2. Manajer dapat visibilitas real-time siapa yang sudah/belum submit hari ini
3. AI meringkas seluruh update tim jadi satu laporan singkat, bukan manajer baca satu-satu
4. Blocker yang disebut dalam update otomatis terdeteksi dan di-flag ke manajer, tanpa manajer harus baca semua detail
5. Sistem multi-tenant — satu deployment melayani banyak workspace/perusahaan berbeda, terisolasi penuh satu sama lain
6. Weekly digest otomatis merangkum seluruh minggu jadi satu laporan tren untuk Owner/Admin
7. Onboarding experience yang smooth — dari daftar sampai workspace siap pakai, guided, bukan dilepas begitu saja
8. Team health visibility — submission rate, blocker frequency, participation trend terlihat di dashboard analytics

## 3. Non-Goals (Sengaja Tidak Dikerjakan di V1)

- **Billing/subscription/payment** — tidak ada integrasi Stripe/payment gateway di V1. Semua workspace gratis dulu (portfolio/MVP tidak butuh monetisasi nyata)
- **Voice input untuk standup** — hanya teks di V1. Voice + transcription (Whisper API) masuk roadmap V1.1
- **Integrasi Slack/Microsoft Teams** — tidak ada bot Slack di V1. User submit lewat web app langsung. Integrasi Slack masuk roadmap V1.1 karena ini channel utama Geekbot/Standuply
- **SSO/SAML enterprise login** — cukup email+password di V1. SSO masuk roadmap kalau ada kebutuhan enterprise
- **Native mobile app** — web app responsive cukup, tidak ada aplikasi iOS/Android terpisah
- **Kustomisasi pertanyaan standup per-workspace** (selain 3 pertanyaan standar: yesterday/today/blocker) — V1 pakai template tetap. Roadmap V1.1 izinkan Owner kustomisasi pertanyaan
- **AI sentiment analysis** — analisis mood tim dari tone tulisan. Menarik tapi di luar scope V1, masuk roadmap V1.2
- **Jira/GitHub/Linear integration** — auto-pull progress dari project management tool. Sangat berguna tapi out of scope V1 — fokus dulu ke manual input yang bekerja solid
- **Multi-language AI summary** — V1 defaultnya ikuti bahasa input (mayoritas Indonesia), kustomisasi bahasa AI masuk V1.1

## 4. Personas

| Persona | Konteks Pemakaian | Pain Point Utama |
|---|---|---|
| **Workspace Owner** | Bikin workspace, undang anggota tim, atur jam cutoff submission, lihat semua laporan AI, lihat analytics tim | Kehilangan visibilitas progress harian, blocker terdeteksi terlambat, harus baca 10+ update satu-satu |
| **Admin** | Sama seperti Owner tapi tidak bisa hapus workspace/transfer ownership. Biasanya team lead / senior member | Butuh oversight tanpa beban administrasi penuh |
| **Member** | Cuma submit standup harian sendiri, lihat dashboard tim, lihat history sendiri, tidak bisa atur setting workspace | Meeting standup bikin males, bentrok jadwal, cuma mau tulis update cepat dan selesai |
| **Visitor** | Lihat landing page, baca penjelasan produk, daftar, bikin workspace baru | Mau evaluasi produk sebelum commit, butuh setup yang cepat dan jelas |

## 5. Glossary

- **Workspace**: Unit tenant tertinggi — satu perusahaan/tim = satu Workspace, semua data (standup, member, summary) terisolasi per Workspace
- **Standup Window**: Rentang waktu (dikonfigurasi per Workspace, dalam timezone Workspace) di mana member boleh submit standup hari itu
- **Standup Entry**: Satu submission harian dari satu Member, berisi tiga field: Yesterday, Today, Blocker
- **Blocker Flag**: Penanda otomatis dari AI kalau Blocker Entry terdeteksi butuh perhatian (bukan cuma "tidak ada blocker")
- **AI Daily Summary**: Ringkasan naratif yang di-generate AI dari seluruh Standup Entry satu Workspace di satu hari
- **AI Weekly Digest**: Ringkasan naratif mingguan yang di-generate AI dari seluruh Daily Summary + Blocker Flags satu Workspace dalam satu minggu
- **Presence Dashboard**: Tampilan real-time siapa saja yang sudah/belum submit standup hari ini di satu Workspace
- **Submission Rate**: Persentase member yang submit standup dibanding total member aktif, per hari/minggu
- **Working Days**: Hari-hari aktif di mana standup diharapkan (dikonfigurasi per Workspace, default Senin-Jumat)
- **Onboarding Wizard**: Guided flow multi-step saat user pertama kali bikin Workspace — setup nama, timezone, window, invite tim
- **Notification Center**: In-app notification panel yang menampilkan semua alert (blocker, summary ready, reminder) secara kronologis

---

## 6. Functional Requirements (EARS Format)

### Requirement 1: Workspace Creation

**User Story:** As a new user, I want to create a Workspace, so that I can start inviting my team to submit standups.

#### Acceptance Criteria
1. WHEN a Visitor submits the Create Workspace form with a valid Workspace name, THE System SHALL create a new Workspace and assign the creating User as Owner
2. THE System SHALL generate a unique, URL-safe Workspace slug from the Workspace name, appending a random suffix if the slug already exists
3. WHEN a Workspace is created, THE System SHALL set default Standup Window to 00:00-11:00 in the creator's detected timezone, editable later by Owner/Admin
4. THE System SHALL NOT allow two Workspaces to share the same slug
5. WHEN a Workspace is created, THE System SHALL default Working Days to Monday-Friday (configurable later by Owner/Admin)
6. WHEN a Workspace is created, THE System SHALL immediately redirect the Owner to the Onboarding Wizard (Requirement 16) to complete initial setup

### Requirement 2: Authentication

**User Story:** As a user, I want to sign up and log in securely, so that my workspace data stays private to my account.

#### Acceptance Criteria
1. WHEN a Visitor submits Registration with a valid email and password, THE System SHALL create a User account with status "Unverified" and send an email verification link
2. IF a User with status "Unverified" attempts to create or join a Workspace, THEN THE System SHALL block the action and prompt email verification
3. WHEN a User submits valid login credentials, THE System SHALL issue a refresh token in an httpOnly cookie and an access token in the response body
4. IF login credentials are invalid, THEN THE System SHALL return a generic error message that does not reveal whether the email exists
5. THE System SHALL rate-limit login attempts to 5 per 15 minutes per IP AND per targeted email address independently
6. WHEN a User requests a password reset with a registered email, THE System SHALL send a time-limited reset link and SHALL NOT reveal whether the email exists via response timing or content (identical response whether or not the email is registered)
7. THE System SHALL expire an unused password reset token after 1 hour and SHALL invalidate it immediately after first use
8. WHEN a password reset completes successfully, THE System SHALL invalidate all existing refresh tokens/sessions for that User, forcing re-login on all other devices
9. THE System SHALL enforce minimum password complexity: at least 8 characters, at least 1 uppercase, 1 lowercase, and 1 digit — validated both client-side (UX) and server-side (enforcement)
10. THE System SHALL lock an account for 30 minutes after 10 consecutive failed login attempts across all IPs for that email, AND send an email notification to the account holder about the lockout

### Requirement 3: Team Invitation

**User Story:** As a Workspace Owner/Admin, I want to invite teammates by email, so that they can join my Workspace and start submitting standups.

#### Acceptance Criteria
1. WHEN an Owner/Admin submits an invite with a valid email, THE System SHALL generate a unique, time-limited invite link and send it via email
2. THE System SHALL expire an unused invite link after 7 days
3. WHEN a recipient clicks a valid invite link AND is not yet registered, THE System SHALL prompt registration, then automatically add them to the inviting Workspace with role Member upon successful registration
4. WHEN a recipient clicks a valid invite link AND is already registered, THE System SHALL prompt login, then add them to the Workspace with role Member upon successful login
5. IF an invite link is expired or already used, THEN THE System SHALL display an error and allow the Owner/Admin to resend a new invite
6. THE System SHALL prevent duplicate invites — IF an email already has a pending (unexpired, unused) invite for the same Workspace, THEN THE System SHALL resend the existing invite instead of creating a new one
7. THE System SHALL allow Owner/Admin to bulk-invite up to 20 emails at once via comma-separated or newline-separated input
8. WHEN an invite is accepted, THE System SHALL send a confirmation notification to the inviting Owner/Admin ("Budi has joined your workspace")

### Requirement 4: Workspace Membership and Roles

**User Story:** As a Workspace Owner, I want to manage member roles, so that I control who can change workspace settings.

#### Acceptance Criteria
1. THE System SHALL support three roles per Workspace membership: Owner, Admin, Member
2. THE System SHALL allow exactly one Owner per Workspace at any time
3. WHEN an Owner transfers ownership to another member, THE System SHALL demote the previous Owner to Admin
4. IF a Member (non-Admin, non-Owner) attempts to change Workspace settings or remove another member, THEN THE System SHALL reject the action with 403
5. THE System SHALL allow a single User account to be a member of multiple Workspaces simultaneously, each with an independent role
6. WHEN a member leaves or is removed from a Workspace, THE System SHALL retain their historical Standup Entries and Blocker Flags (soft removal from membership, not data deletion)
7. THE System SHALL allow a member to voluntarily leave a Workspace (self-remove), EXCEPT the Owner — Owner must transfer ownership first before leaving
8. THE System SHALL display a "My Workspaces" list showing all Workspaces a User belongs to, with their role in each, accessible from the top-level navigation

### Requirement 5: Standup Submission

**User Story:** As a Member, I want to submit my daily standup update, so that my team knows my progress without a meeting.

#### Acceptance Criteria
1. WHEN a Member submits Yesterday, Today, and (optional) Blocker text within the active Standup Window, THE System SHALL create a Standup Entry with status "Submitted"
2. THE System SHALL allow at most one Standup Entry per Member per Workspace per calendar day — a second submission on the same day SHALL update the existing entry, not create a duplicate
3. IF a Member submits outside the Standup Window, THEN THE System SHALL still accept the submission but mark it visually as "Late" on the dashboard
4. THE System SHALL enforce a maximum length of 2,000 characters per field (Yesterday/Today/Blocker) to bound AI summarization cost
5. WHEN a Standup Window closes for the day AND a Member has not submitted, THE System SHALL mark that Member's entry status as "Missed" for that day
6. WHEN a Member successfully submits a standup, THE System SHALL show a brief confirmation with a preview of what was submitted, allowing immediate edit within a 5-minute grace period without it counting as a separate update event
7. THE System SHALL only process standups on configured Working Days — on non-working days, the submission form SHALL display "Hari ini bukan hari kerja" and the window-close cron SHALL skip processing
8. THE System SHALL auto-save draft text locally (browser localStorage) so that if the user accidentally closes the tab, their in-progress entry is recovered when they return

### Requirement 6: Standup Window Configuration

**User Story:** As a Workspace Owner/Admin, I want to configure the submission window and timezone, so that it fits my team's working hours.

#### Acceptance Criteria
1. WHEN an Owner/Admin sets a Standup Window start/end time and Workspace timezone, THE System SHALL apply it to all future submission days
2. THE System SHALL calculate "today" and window open/close per the Workspace's configured timezone, not the server's timezone or each individual Member's browser timezone
3. IF the configured end time is not later than the start time, THEN THE System SHALL reject the configuration with a validation error
4. THE System SHALL allow configuring Working Days (checkboxes for Mon-Sun), defaulting to Mon-Fri, so that weekends/holidays can be excluded from standup expectations
5. WHEN Workspace timezone or window times are changed, THE System SHALL NOT retroactively re-evaluate past days' statuses — changes apply from the next calendar day forward only
6. THE System SHALL display a preview showing "Berdasarkan setting ini, window standup hari ini aktif dari HH:MM sampai HH:MM [timezone]" before saving, so Owner/Admin can confirm the config makes sense

### Requirement 7: Real-Time Presence Dashboard

**User Story:** As a Workspace member, I want to see who has and hasn't submitted today in real time, so that I know the team's status without refreshing the page.

#### Acceptance Criteria
1. WHEN a Member views the Dashboard, THE System SHALL display all Workspace members with their submission status for today (Submitted / Missed / Not Yet / Late)
2. WHEN any Member submits a Standup Entry, THE System SHALL push a real-time update to all connected clients in that Workspace within 2 seconds, without requiring a page refresh
3. THE System SHALL scope real-time updates strictly to the Workspace the connected client belongs to — a client SHALL NEVER receive presence events from a different Workspace
4. WHEN a client's WebSocket connection drops, THE System SHALL automatically attempt reconnection and resync full presence state on reconnect
5. THE System SHALL display a visual indicator showing the current Standup Window status: "Window aktif (sisa X jam Y menit)" or "Window sudah tutup hari ini" — updated in real-time as time progresses
6. THE System SHALL show a participation progress bar: "6 dari 8 orang sudah submit" with percentage, prominently displayed
7. THE System SHALL display a small "reconnecting..." indicator when the WebSocket connection is interrupted, instead of blanking the dashboard or showing stale data
8. THE System SHALL animate status transitions (e.g., "Not Yet" → "Submitted") with a subtle 150-200ms transition rather than an abrupt re-render

### Requirement 8: AI Daily Summary

**User Story:** As an Owner/Admin, I want an AI-generated summary of the whole team's standup, so that I don't have to read every entry individually.

#### Acceptance Criteria
1. WHEN the Standup Window closes for a Workspace on a given day, THE System SHALL automatically generate an AI Daily Summary from all Standup Entries submitted that day
2. THE System SHALL also allow an Owner/Admin to manually trigger summary generation before the window closes, using entries submitted so far
3. THE System SHALL generate exactly one AI API call per Workspace per day for summary generation (batched across all entries), not one call per Member, to bound cost
4. IF a Workspace has zero Standup Entries for the day, THEN THE System SHALL skip AI summary generation and display "Tidak ada submission hari ini" instead of calling the AI API
5. WHEN summary generation completes, THE System SHALL push a real-time notification to connected Owner/Admin clients
6. THE System SHALL include metadata in the Daily Summary: entry count, blocker count, submission rate percentage, and list of members who missed
7. WHEN a manual summary trigger is invoked while an existing summary already exists for that day, THE System SHALL regenerate (replace) the summary with updated data, not create a duplicate

### Requirement 9: AI Blocker Detection

**User Story:** As an Owner/Admin, I want blockers automatically flagged with severity, so that I notice urgent issues without reading every entry.

#### Acceptance Criteria
1. WHEN a Standup Entry's Blocker field is non-empty, THE System SHALL analyze it via AI and assign a severity (Low/Medium/High) with a brief reason
2. THE System SHALL batch blocker analysis for all of a Workspace's same-day entries into a single AI API call, not one call per entry
3. WHEN a Blocker Flag with severity "High" is created, THE System SHALL push a real-time alert to Owner/Admin clients immediately, independent of the daily summary cycle
4. THE System SHALL allow an Owner/Admin to mark a Blocker Flag as "Resolved," which removes it from the active blocker list but retains it in history
5. IF the AI API call for blocker detection fails or times out, THEN THE System SHALL still display the raw Blocker text on the dashboard without severity classification, rather than hiding the submission entirely
6. WHEN a Blocker Flag is marked as "Resolved," THE System SHALL record who resolved it and when, for accountability tracking
7. THE System SHALL display active (unresolved) blockers prominently on the Dashboard in a dedicated section — NOT buried in a tab or secondary view

### Requirement 10: Notifications

**User Story:** As a Member, I want a reminder before the submission window closes, so that I don't forget to submit.

#### Acceptance Criteria
1. WHEN a Standup Window is 30 minutes from closing AND a Member has not yet submitted, THE System SHALL send that Member a reminder notification (email and in-app)
2. WHEN a Blocker Flag with severity "High" is created, THE System SHALL notify Owner/Admin via email in addition to the real-time in-app alert
3. THE System SHALL allow each User to independently mute email reminders per Workspace without affecting other Workspace members' notification settings
4. WHEN the AI Daily Summary is generated, THE System SHALL send an email digest to all Owner/Admin members containing the summary text and active blockers — so they don't have to open the app to see it
5. THE System SHALL batch reminder emails efficiently — if the cron runs and 5 members need reminders in the same Workspace, send 5 individual emails (not one shared email that reveals everyone who hasn't submitted to each other)

### Requirement 11: Standup History and Search

**User Story:** As a Workspace member, I want to browse past standups, so that I can review team progress over time.

#### Acceptance Criteria
1. WHEN a Member views History, THE System SHALL display past Standup Entries and AI Daily Summaries for their Workspace, ordered by date descending
2. THE System SHALL allow filtering history by date range and by specific Member
3. WHEN a Member searches history by keyword, THE System SHALL return entries where the keyword appears in Yesterday, Today, or Blocker text, scoped strictly to their own Workspace
4. THE System SHALL paginate history results (20 entries per page default) to avoid loading months of data at once
5. THE System SHALL clearly distinguish AI-generated content (summaries, blocker reasons) from human-authored content (standup entries) with a visual label or styling difference
6. THE System SHALL allow exporting a date range of history as CSV for offline review (Owner/Admin only)

### Requirement 12: Tenant Isolation (Security-Critical)

**User Story:** As a Workspace Owner, I want absolute certainty that no other Workspace can ever see my team's data, so that I can trust the platform with sensitive team updates.

#### Acceptance Criteria
1. THE System SHALL scope every database query touching Workspace-owned data (Standup Entry, AI Summary, Blocker Flag, Member list, Audit Log, Weekly Digest) by `workspace_id`, in addition to any resource-level ID check
2. THE System SHALL verify, on every authenticated API request, that the requesting User is an active member of the Workspace referenced in the request path/body — a valid JWT alone SHALL NOT be sufficient authorization
3. THE System SHALL scope every WebSocket room/channel by Workspace ID — a socket connection SHALL only be able to join rooms for Workspaces the connected User is a member of
4. WHEN a User is removed from a Workspace, THE System SHALL immediately revoke that User's access to the Workspace's real-time channel, not just its REST endpoints
5. THE System SHALL log any tenant-boundary violation attempt (user trying to access a Workspace they don't belong to) as a security event in the application logs, including the requesting user ID and target workspace ID

### Requirement 13: Public Marketing Pages

**User Story:** As a visitor, I want to understand the product before signing up, so that I can decide if it's worth creating a Workspace.

#### Acceptance Criteria
1. WHEN a Visitor accesses the Landing Page, THE System SHALL display product explanation without requiring login
2. THE System SHALL render Landing, Login, and Register pages as routes outside any authentication guard, crawlable by search engines
3. THE System SHALL include proper SEO meta tags (title, description, Open Graph) on all public pages
4. THE Landing Page SHALL feature a realistic dashboard mockup or screenshot as the hero visual, demonstrating the real-time presence feature — NOT a generic hero-3-card-testimonial layout

### Requirement 14: Compliance and Data Privacy

**User Story:** As a Workspace Owner, I want member data handled responsibly, so that my team's information is protected and I'm not exposed to legal risk.

#### Acceptance Criteria
1. THE System SHALL require explicit consent (checkbox, not implied) at registration before storing any personal data
2. THE System SHALL provide a mechanism (manual is acceptable for V1) for a User to request full account and associated data deletion
3. WHERE the User's jurisdiction has applicable data protection regulation (e.g., Indonesia's UU PDP for Indonesian users), THE System SHALL provide a privacy policy describing what data is collected and why
4. THE System SHALL NOT send standup content to any third-party AI service other than the configured AI provider (Claude API) — no secondary analytics, no logging to third-party services
5. THE System SHALL include a clear disclosure in the privacy policy that standup content is processed by an external AI service for summarization, with the provider named explicitly

---

### Requirement 15: Administrative Audit Trail

**User Story:** As a Workspace Owner, I want a record of who changed what in my workspace, so that I can investigate unexpected changes and hold administrators accountable.

#### Acceptance Criteria
1. WHEN a Workspace setting is changed, a member's role is changed, a member is removed, an invite is sent, or a blocker is resolved, THE System SHALL record an AuditLog entry with the acting User, action type, target entity, and timestamp
2. THE System SHALL scope AuditLog entries strictly by `workspaceId`, following the same tenant isolation rules as all other Workspace-owned data (Requirement 12)
3. THE System SHALL NOT allow AuditLog entries to be edited or deleted through any application interface
4. THE System SHALL display AuditLog in a dedicated "Activity" tab accessible to Owner/Admin, paginated and filterable by action type and date range
5. THE System SHALL retain AuditLog entries for at least 1 year, independent of any other data retention policy

### Requirement 16: Onboarding Wizard

**User Story:** As a new Workspace Owner, I want a guided setup experience so that my workspace is properly configured and my team can start submitting standups quickly.

#### Acceptance Criteria
1. WHEN a new Workspace is created, THE System SHALL present a multi-step onboarding wizard with the following steps: (a) Name your workspace, (b) Set timezone & standup window, (c) Configure working days, (d) Invite team members, (e) Done — go to dashboard
2. THE System SHALL allow the wizard to be skipped at any step — defaults will be applied for any unconfigured settings
3. THE System SHALL track onboarding completion status per Workspace — if the wizard was skipped or partially completed, show a persistent "Complete setup" banner on the dashboard until all steps are done
4. THE System SHALL make each wizard step idempotent — refreshing the page or going back should not create duplicate data or lose progress
5. THE System SHALL pre-fill timezone detection from the user's browser via `Intl.DateTimeFormat().resolvedOptions().timeZone` as a suggestion, not a forced default

### Requirement 17: AI Weekly Digest

**User Story:** As an Owner/Admin, I want a weekly summary of the team's progress, so that I can spot trends and prepare for my own reporting without manually reviewing 5 daily summaries.

#### Acceptance Criteria
1. WHEN the last Working Day of the week ends (based on Workspace's Working Days configuration), THE System SHALL automatically generate an AI Weekly Digest from all Daily Summaries and Blocker Flags of that week
2. THE System SHALL generate exactly one AI API call per Workspace per week for weekly digest generation, not one call per day
3. THE Weekly Digest SHALL include: (a) overall team progress narrative, (b) recurring blocker patterns, (c) submission rate trend (improving/declining/stable), (d) members who missed the most standups that week, (e) total blocker count with resolution rate
4. THE System SHALL also allow an Owner/Admin to manually trigger weekly digest generation at any time using data from the current partial week
5. THE System SHALL send the weekly digest via email to all Owner/Admin members, in addition to making it available in-app
6. IF a Workspace had zero submissions for the entire week, THEN THE System SHALL skip AI digest generation and send a simple "No activity this week" notice instead

### Requirement 18: Team Analytics Dashboard

**User Story:** As an Owner/Admin, I want to see team health metrics at a glance, so that I can identify participation issues or persistent blockers before they become serious problems.

#### Acceptance Criteria
1. THE System SHALL display a Team Analytics view (accessible to Owner/Admin only) showing: (a) daily submission rate chart (last 30 days), (b) per-member submission streak/consistency, (c) blocker frequency by severity over time, (d) average submission time within the window
2. THE System SHALL calculate and display a "Team Health Score" — a simple composite metric based on submission rate (weight 60%) and blocker resolution rate (weight 40%), shown as a percentage
3. THE System SHALL highlight members with 3+ consecutive missed standups in a "Needs Attention" section — this is not punitive, it's an early signal for managers that someone might need help
4. ALL analytics data SHALL be scoped strictly to the requesting user's Workspace — no cross-workspace aggregation or leakage
5. THE System SHALL compute analytics from existing data (Standup Entries, Blocker Flags) — no additional data collection or tracking beyond what's already captured by the core standup flow

### Requirement 19: Notification Center (In-App)

**User Story:** As a user, I want a centralized place to see all my notifications, so that I don't miss important alerts even if I wasn't online when they happened.

#### Acceptance Criteria
1. THE System SHALL maintain an in-app Notification Center accessible via a bell icon in the navigation, showing all notifications for the logged-in user across all their Workspaces
2. THE System SHALL display a badge count of unread notifications on the bell icon, updated in real-time via WebSocket
3. THE System SHALL support the following notification types: submission reminder, blocker alert (High severity), summary ready, weekly digest ready, invite accepted, member removed
4. THE System SHALL allow a user to mark individual notifications as read, or mark all as read
5. THE System SHALL retain notifications for 30 days, after which they are automatically purged
6. WHEN a notification is generated while the user is NOT connected via WebSocket, THE System SHALL store it for delivery when they next open the app — notifications SHALL NOT be lost just because the user was offline

### Requirement 20: Graceful Degradation

**User Story:** As a system operator, I want the platform to continue functioning when external dependencies fail, so that team members can always submit their standups.

#### Acceptance Criteria
1. IF the AI API (Claude) is unavailable, THE System SHALL continue accepting standup submissions normally — AI processing is fully decoupled from the submission flow
2. IF the AI API is unavailable during window-close, THE System SHALL mark entries as "Pending AI Processing" and retry when the API recovers, rather than skipping the day permanently
3. IF Redis is unavailable, THE System SHALL fall back to in-process event emission for WebSocket (single-instance only), degrading graceful real-time rather than crashing entirely
4. IF the email service is unavailable, THE System SHALL queue emails for retry and log the failure — a failed email SHALL NOT prevent the triggering action (invite, reminder, blocker alert) from completing
5. THE System SHALL expose a `/health` endpoint that reports the status of all dependencies (PostgreSQL, Redis, AI API reachability) — returning degraded status rather than failing entirely when non-critical dependencies are down

### Requirement 21: Data Export

**User Story:** As a Workspace Owner, I want to export my team's data, so that I can use it for reporting outside the platform or comply with data portability requirements.

#### Acceptance Criteria
1. THE System SHALL allow a Workspace Owner to export all Standup Entries for a date range as CSV, including: date, member name, yesterday text, today text, blocker text, status, blocker severity (if any)
2. THE System SHALL allow exporting AI Daily Summaries for a date range as CSV or plain text
3. THE System SHALL rate-limit export requests to prevent abuse (max 1 export per 5 minutes per Workspace)
4. THE System SHALL scope exports strictly to the requesting user's Workspace

### Requirement 22: User Profile Management

**User Story:** As a user, I want to manage my profile and preferences, so that my identity is correct across all workspaces I belong to.

#### Acceptance Criteria
1. THE System SHALL allow a User to update their display name and (optionally) upload a profile avatar
2. THE System SHALL allow a User to change their password (requires current password verification)
3. THE System SHALL allow a User to view all Workspaces they belong to and their role in each
4. THE System SHALL allow a User to configure global notification preferences (email frequency: immediate, daily digest, or off)
5. THE System SHALL display the user's profile name and avatar consistently across all Workspaces they belong to

---

## 7. Non-Functional Requirements

### 7.1 Performance
1. Presence Dashboard updates SHALL propagate to connected clients within 2 seconds of a submission (Requirement 7.2)
2. REST API response time SHALL be under 500ms at p95 for all non-AI endpoints under normal load
3. Dashboard initial load (Server Component render + hydration) SHALL complete within 3 seconds on a 3G connection
4. History search SHALL return results within 1 second for Workspaces with up to 10,000 standup entries

### 7.2 AI Cost Control
1. AI API calls SHALL be batched per-Workspace-per-day, never per-entry (Requirements 8.3, 9.2) — this is a hard architectural constraint, not an optimization to consider later
2. Maximum AI API calls per Workspace per day: 2 (1 summary + 1 blocker batch) for automatic processing, plus at most 1 manual trigger
3. Maximum AI API calls per Workspace per week: 1 additional call for weekly digest
4. Total AI budget envelope: system should be designed so that 50 active Workspaces × 5 working days × 3 calls/day = 750 calls/week is the upper bound, well within reasonable API cost for Claude Haiku tier

### 7.3 Availability & Resilience
1. Missing an AI summary generation (e.g., API outage) SHALL NOT block Members from submitting standups — submission and AI summarization are decoupled, submission must never depend on AI availability
2. THE System SHALL implement circuit-breaker pattern for AI API calls — after 5 consecutive failures within 10 minutes, stop attempting for 5 minutes before retrying (prevents cost hemorrhage during extended outages)
3. THE System SHALL handle database connection pool exhaustion gracefully (queue requests rather than returning 500 immediately)

### 7.4 Scalability Target
1. System should comfortably handle 50 Workspaces × 30 members each without architecture changes; this is not a hyperscale requirement, but the tenant isolation and batching decisions above should not need to be revisited at that scale
2. WebSocket connections: system should handle up to 500 concurrent connections (50 Workspaces × ~10 concurrent users each) on a single instance
3. Database: PostgreSQL should handle the write load of ~1,500 standup entries per day (50 Workspaces × 30 members) without performance degradation

### 7.5 Observability
1. THE System SHALL log all errors to Sentry with tenant context (workspaceId, userId) attached, never logging sensitive content (standup text, passwords, API keys)
2. THE System SHALL expose Prometheus-compatible metrics for: active WebSocket connections, API response times, AI API call count per Workspace, cron job execution time, email delivery success rate
3. THE System SHALL implement structured logging (JSON format) with correlation IDs for request tracing across REST → Use Case → Cron → AI API call chains
4. THE System SHALL monitor and alert on: AI API error rate > 20% over 5 minutes, WebSocket connection count drop > 50% in 1 minute, cron job execution failure

### 7.6 Security (cross-cutting)
1. All communication SHALL be over HTTPS/WSS — no plaintext HTTP in production
2. CORS SHALL be configured with explicit origin whitelist, no wildcard with credentials
3. All user input SHALL be sanitized against XSS before rendering in the frontend
4. Rate limiting SHALL be applied to all public-facing endpoints (auth, invites) and cost-bearing endpoints (AI manual trigger, export)
5. THE System SHALL implement CSRF protection for all state-changing requests

### 7.7 Data Retention
1. Standup Entries and AI Summaries: retained permanently in V1 (volume is small — short text only)
2. Audit Logs: retained for minimum 1 year
3. In-app Notifications: retained for 30 days, then auto-purged
4. Expired/used Invite tokens: soft-deleted after 30 days
5. Password reset tokens: hard-deleted after expiry (1 hour)

### 7.8 Accessibility (baseline)
1. All interactive elements SHALL be keyboard-navigable
2. All form inputs SHALL have associated labels (not placeholder-only)
3. Color-coded statuses SHALL also include text labels or icons — not color-alone as the only differentiator (color-blind accessibility)
4. THE System SHALL maintain a minimum contrast ratio of 4.5:1 for body text (WCAG AA)
