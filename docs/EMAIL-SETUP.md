# 📧 Email Service Setup Guide

Panduan lengkap untuk setup email service di AI Standup system.

---

## 📋 Overview

Sistem menggunakan **nodemailer** dan **BullMQ** untuk mengirim email secara asynchronous:

### Email Types:
1. **Verification Email** - Dikirim saat user register
2. **Password Reset** - Dikirim saat user lupa password
3. **Workspace Invite** - Dikirim saat invite member ke workspace
4. **Standup Reminder** - Dikirim sebelum deadline standup
5. **Notifications** - Dikirim untuk berbagai notifikasi

### Architecture:
```
API Request → Email Queue (BullMQ) → Email Processor → SMTP Server → User Inbox
```

**Benefits:**
- ✅ Async processing (tidak blocking API response)
- ✅ Automatic retry on failure
- ✅ Job tracking & monitoring via BullMQ
- ✅ Graceful degradation (fallback ke mock jika SMTP down)

---

## 🛠️ Setup untuk Development (Mailpit)

**Mailpit** adalah SMTP server lokal untuk testing email tanpa mengirim real email.

### 1. Install Mailpit

**Windows:**
```bash
# Using Scoop
scoop install mailpit

# Or download from: https://github.com/axllent/mailpit/releases
```

**Mac:**
```bash
brew install mailpit
```

**Linux:**
```bash
# Download binary from releases
wget https://github.com/axllent/mailpit/releases/latest/download/mailpit-linux-amd64.tar.gz
tar -xzf mailpit-linux-amd64.tar.gz
sudo mv mailpit /usr/local/bin/
```

### 2. Run Mailpit
```bash
mailpit
```

Mailpit akan running di:
- **SMTP:** `localhost:1025`
- **Web UI:** http://localhost:8025

### 3. Configure `.env`
```env
SMTP_HOST=localhost
SMTP_PORT=1025
# No SMTP_USER or SMTP_PASS needed
```

### 4. Test Email
Register user baru atau request password reset, kemudian buka http://localhost:8025 untuk lihat email.

---

## 🚀 Setup untuk Production

Pilih salah satu provider di bawah:

---

### Option 1: SendGrid (Recommended) ⭐

**Pros:**
- ✅ Free tier: 100 emails/day
- ✅ Very reliable (>99% delivery rate)
- ✅ Good documentation & dashboard
- ✅ Email templates support

**Setup:**

1. **Sign Up**
   - https://sendgrid.com
   - Verify your email

2. **Create API Key**
   - Settings → API Keys → Create API Key
   - Choose "Full Access" atau "Mail Send"
   - **Copy API key** (hanya ditampilkan sekali!)

3. **Verify Sender Email**
   - Settings → Sender Authentication → Verify Single Sender
   - Verify email yang akan dipakai sebagai sender

4. **Configure `.env`**
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=SG.your_actual_api_key_here
   SMTP_FROM=noreply@yourdomain.com
   ```

5. **Test**
   ```bash
   # Deploy & test registration
   # Check SendGrid dashboard for delivery stats
   ```

**Notes:**
- Free tier limit: 100 emails/day
- For production, consider paid plan: $19.95/mo (40k emails)
- Setup custom domain untuk better deliverability

---

### Option 2: AWS SES (Simple Email Service)

**Pros:**
- ✅ Very cheap ($0.10 per 1000 emails)
- ✅ Highly scalable
- ✅ Good if already using AWS

**Cons:**
- ⚠️ Requires AWS account & verification
- ⚠️ Starts in sandbox (limited recipients)

**Setup:**

1. **Sign in to AWS Console**
   - Go to AWS SES

2. **Verify Email/Domain**
   - Identities → Verify Email Address
   - Or verify domain untuk better reputation

3. **Request Production Access**
   - Account dashboard → Request production access
   - Fill form (reason, expected volume, etc)
   - Wait for approval (~24 hours)

4. **Create SMTP Credentials**
   - Account dashboard → SMTP Settings
   - Create SMTP credentials
   - **Save username & password**

5. **Configure `.env`**
   ```env
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_USER=your_smtp_username
   SMTP_PASS=your_smtp_password
   SMTP_FROM=noreply@yourdomain.com
   ```

**Notes:**
- Check region! (us-east-1, ap-southeast-1, dll)
- Monitor via CloudWatch

---

### Option 3: Mailgun

**Pros:**
- ✅ Free tier: 100 emails/day
- ✅ Simple setup
- ✅ Good API & documentation

**Setup:**

1. **Sign Up**
   - https://mailgun.com

2. **Add Domain** (optional, or use sandbox domain)
   - Sending → Domains → Add New Domain
   - Update DNS records

3. **Get SMTP Credentials**
   - Sending → Domain Settings → SMTP credentials

4. **Configure `.env`**
   ```env
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USER=postmaster@yourdomain.mailgun.org
   SMTP_PASS=your_mailgun_password
   SMTP_FROM=noreply@yourdomain.com
   ```

---

### Option 4: Gmail (NOT Recommended for Production)

**Only for testing!** Gmail has daily limits (500 emails/day) and may flag your app as spam.

**Setup:**

1. **Enable 2FA** di Google Account

2. **Create App Password**
   - Google Account → Security → 2-Step Verification → App passwords
   - Generate password untuk "Mail"

3. **Configure `.env`**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_16_character_app_password
   SMTP_FROM=your_email@gmail.com
   ```

**Limitations:**
- Max 500 emails/day
- May be blocked if sending too fast
- Not suitable for production

---

## ✅ Testing Email Delivery

### 1. Test Registration Email

```bash
# Start server
npm run start:dev

# Register new user
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User",
    "consentGivenAt": "2026-09-10T00:00:00Z"
  }'

# Check email inbox or Mailpit UI
```

### 2. Test Password Reset Email

```bash
curl -X POST http://localhost:4000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

### 3. Monitor Queue

Email queue menggunakan BullMQ. Untuk monitoring:

```bash
# Check Redis keys
redis-cli
> KEYS bull:email:*

# Or use Bull Dashboard (install separately)
npm install --save @bull-board/api @bull-board/express
```

---

## 🔧 Troubleshooting

### Email Tidak Terkirim

**Check logs:**
```bash
# Look for EmailProcessor logs
[EmailProcessor] Processing email job ...
[EmailProcessor] [REAL EMAIL] Sent to: ...
```

**Common issues:**

1. **"SMTP connection refused"**
   - Check SMTP_HOST dan SMTP_PORT
   - Check firewall/network

2. **"Authentication failed"**
   - Check SMTP_USER dan SMTP_PASS
   - For Gmail: use App Password, not regular password

3. **"Sender email not verified"**
   - Verify sender email di provider dashboard
   - For AWS SES: check sandbox mode

4. **Email masuk spam**
   - Setup SPF, DKIM, DMARC records
   - Use verified domain
   - Avoid spammy content

### Email Queue Stuck

```bash
# Check BullMQ jobs
# Failed jobs will be retried automatically

# Manual retry via Bull Dashboard or:
redis-cli
> KEYS bull:email:*
> DEL bull:email:failed  # Clear failed jobs (careful!)
```

---

## 📊 Production Best Practices

### 1. Use Verified Domain
- Setup SPF, DKIM, DMARC records
- Better deliverability
- Avoid spam folder

### 2. Monitor Email Delivery
- Track delivery rates
- Monitor bounce rates
- Setup alerts for failures

### 3. Rate Limiting
- Respect provider limits
- Implement backoff strategy
- Use queue delay for bulk emails

### 4. Email Templates
- Use HTML templates for better UX
- Include unsubscribe link (required by law)
- Mobile-responsive design

### 5. Logging & Analytics
- Log all email sends
- Track open rates (if needed)
- Monitor errors & retries

---

## 🔒 Security Considerations

### 1. Never Commit Credentials
```bash
# Add to .gitignore
.env
.env.local
.env.production
```

### 2. Use Environment Variables
```bash
# On Heroku:
heroku config:set SMTP_HOST=smtp.sendgrid.net
heroku config:set SMTP_PORT=587
heroku config:set SMTP_USER=apikey
heroku config:set SMTP_PASS=SG.xxx
```

### 3. Rotate API Keys Regularly
- Change SMTP credentials every 90 days
- Use secrets manager (AWS Secrets Manager, etc)

### 4. Validate Email Addresses
- Implemented via `class-validator` in DTOs
- Prevent sending to invalid emails

---

## 📈 Scaling Considerations

For high-volume email sending:

1. **Use Dedicated Email Service**
   - SendGrid, Postmark, Amazon SES
   - Better deliverability & analytics

2. **Implement Email Queuing**
   - Already done via BullMQ ✅
   - Add priority levels if needed

3. **Batch Processing**
   - Group similar emails
   - Send in batches to respect rate limits

4. **Multiple Workers**
   - Scale email processor horizontally
   - Process multiple jobs in parallel

---

## 🎯 Quick Reference

### Environment Variables
| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| SMTP_HOST | ✅ | smtp.sendgrid.net | SMTP server host |
| SMTP_PORT | ✅ | 587 | Usually 587 (TLS) or 465 (SSL) |
| SMTP_USER | ⚠️ | apikey | Required for most providers |
| SMTP_PASS | ⚠️ | SG.xxx | Required for most providers |
| SMTP_FROM | ⚠️ | noreply@domain.com | Sender email address |

### Email Jobs
| Job Name | Trigger | Template |
|----------|---------|----------|
| send-verification | User registration | Email verification link |
| send-password-reset | Forgot password | Password reset link |
| send-invite | Workspace invite | Invitation code |
| send-reminder | Cron (before deadline) | Standup reminder |
| send-notification | Various events | Custom notification |

---

## 📞 Support

**Issues with email provider?**
- SendGrid: https://support.sendgrid.com
- AWS SES: https://console.aws.amazon.com/support
- Mailgun: https://help.mailgun.com

**Code issues?**
- Check: `apps/api/src/queues/processors/email.processor.ts`
- Check: `apps/api/src/auth/auth.service.ts`

---

**Last Updated:** 10 September 2026  
**Version:** 1.0
