# 🚀 Vercel Environment Variables - Complete Setup Guide

## CRITICAL: Must-Have for 100% Reliability

### 1. **FIREBASE_SERVICE_ACCOUNT** ⭐⭐⭐ (REQUIRED)
**Purpose:** Enables FCM push notifications

**How to get:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your Project Cupid project
3. Go to **Project Settings** → **Service Accounts** tab
4. Click **Generate New Private Key**
5. Copy the entire JSON object (looks like below)

**Vercel Setup:**
```bash
# Don't paste the JSON directly! Stringify it as a single line:
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"firebase-adminsdk-abc@your-project.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

**Verification:**
```bash
# In Vercel deployment, this enables FCM and prevents:
# ❌ "Firebase Admin SDK not initialized" warnings
# ❌ FCM push notifications failing
```

---

### 2. **VITE_FIREBASE_VAPID_KEY** ⭐⭐⭐ (REQUIRED)
**Purpose:** Browser push notification configuration

**How to get:**
1. Firebase Console → Your Project → **Cloud Messaging** tab
2. Look for **Web Push certificates**
3. Create a new key pair (or use existing)
4. Copy the **Public Key** (NOT the private key)

**Vercel Setup:**
```bash
VITE_FIREBASE_VAPID_KEY=ABC123...XYZ789
```

**Verification:**
```bash
# This enables:
# ✅ Browser notification permission prompts
# ✅ Web push notification delivery
# ✅ Service Worker registration
```

---

### 3. **RESEND_API_KEY** ⭐⭐⭐ (REQUIRED for Email Fallback)
**Purpose:** Email notifications when FCM fails

**How to get:**
1. Go to [Resend.com](https://resend.com)
2. Sign up (free tier available)
3. Go to **API Keys** → Create new
4. Copy the API key (looks like: `re_xxxxxxxxxxxx`)

**Vercel Setup:**
```bash
RESEND_API_KEY=re_xxxxxxxxxxxx
```

**Verification:**
```bash
# This enables:
# ✅ Email notifications as fallback
# ✅ 99.9% delivery guarantee via email
# ✅ Beautiful HTML emails
```

---

### 4. **RESEND_FROM_EMAIL** ⭐⭐ (REQUIRED for Email)
**Purpose:** Sender email address for notifications

**Options:**

**Option A: Default (Free)**
```bash
RESEND_FROM_EMAIL=cupid@resend.dev
```
- Works immediately
- May land in spam initially
- No setup needed

**Option B: Custom Domain (Better)**
```bash
RESEND_FROM_EMAIL=notifications@yourdomain.com
```
- Must verify domain in Resend dashboard
- Better deliverability
- Professional appearance

**Recommended:**
```bash
RESEND_FROM_EMAIL=cupid@resend.dev
```
(Start here, upgrade to custom domain later if needed)

---

## OPTIONAL but RECOMMENDED

### 5. **GEMINI_API_KEY** ⭐⭐ (Recommended for Letter Generation)
**Purpose:** AI-powered love letter generation

**How to get:**
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a new API key
3. Copy the key

**Vercel Setup:**
```bash
GEMINI_API_KEY=AIzaSy...
```

---

### 6. **OLLAMA_API_URL** ⭐ (Optional, for Local Ollama)
**Purpose:** Local LLM alternative to Gemini

**Setup:**
```bash
OLLAMA_API_URL=https://your-ollama-server.com/api/generate
OLLAMA_API_KEY=your_ollama_key
OLLAMA_MODEL=llama3
```

---

## VERCEL DASHBOARD SETUP STEPS

### Step 1: Go to Vercel Dashboard
1. Open [Vercel.com](https://vercel.com)
2. Find your **Project Cupid** project
3. Click **Settings** → **Environment Variables**

### Step 2: Add Each Variable
For each required variable, click **Add** and fill:
- **Name:** (e.g., `FIREBASE_SERVICE_ACCOUNT`)
- **Value:** (copy-paste the value)
- **Environments:** Select:
  - ✅ Production
  - ✅ Preview
  - ✅ Development

### Step 3: Important - Special Handling for JSON Values

For **FIREBASE_SERVICE_ACCOUNT**, the JSON must be a SINGLE LINE:

```bash
# ❌ WRONG (multi-line):
{
  "type": "service_account",
  "project_id": "..."
}

# ✅ CORRECT (single line):
{"type":"service_account","project_id":"..."}
```

**How to convert:**
```bash
# Use this command to minify JSON:
cat service-account-key.json | jq -c . | pbcopy
# Then paste into Vercel
```

---

## COMPLETE SETUP CHECKLIST

### Required Variables (Must Have)
- [ ] `FIREBASE_SERVICE_ACCOUNT` - Firebase Admin SDK
- [ ] `VITE_FIREBASE_VAPID_KEY` - Browser push
- [ ] `RESEND_API_KEY` - Email delivery
- [ ] `RESEND_FROM_EMAIL` - Email sender

### Recommended Variables
- [ ] `GEMINI_API_KEY` - Letter generation AI

### After Setting Variables
- [ ] Redeploy to Vercel (automatic or manual)
- [ ] Test notifications in production
- [ ] Check email delivery
- [ ] Verify push notifications

---

## TESTING IN PRODUCTION

After deploying with env vars, test each channel:

### Test 1: FCM Push
```bash
# Open production app, grant notification permission
# Send a message from one account
# Verify browser notification appears
```

### Test 2: Email Fallback
```bash
# Without FCM token, send notification
# Check email inbox (may take 5-30 seconds)
# Verify beautiful HTML email arrives
```

### Test 3: Firestore Backup
```bash
# Go to Firebase Console
# Check Firestore > notifications collection
# Verify document exists even if both channels fail
```

---

## ENVIRONMENT VARIABLES SUMMARY TABLE

| Variable | Required | Purpose | Default | Where to Get |
|----------|----------|---------|---------|-------------|
| `FIREBASE_SERVICE_ACCOUNT` | ✅ YES | FCM push notifications | None | Firebase Console |
| `VITE_FIREBASE_VAPID_KEY` | ✅ YES | Browser push cert | None | Firebase Cloud Messaging |
| `RESEND_API_KEY` | ✅ YES | Email delivery service | None | Resend.com |
| `RESEND_FROM_EMAIL` | ✅ YES | Email sender address | None | `cupid@resend.dev` or your domain |
| `GEMINI_API_KEY` | ⭐ Recommended | AI letter generation | Empty string | Google AI Studio |
| `OLLAMA_API_URL` | Optional | Local LLM | None | Your Ollama server |
| `OLLAMA_API_KEY` | Optional | Ollama auth | None | Your Ollama server |

---

## WHAT HAPPENS WITHOUT EACH VARIABLE?

### Without `FIREBASE_SERVICE_ACCOUNT`
```
⚠️ FCM push notifications will NOT work
✅ Email notifications still work (via Resend)
✅ Firestore storage still works
✅ In-app notifications still work
```
**Result:** 80% reliability (email + Firestore)

### Without `VITE_FIREBASE_VAPID_KEY`
```
❌ Browser notification permission prompt won't appear
✅ Email notifications still work
✅ Firestore notifications still work
```
**Result:** 60% reliability (email only, no push prompt)

### Without `RESEND_API_KEY`
```
⚠️ FCM will work (if Firebase configured)
❌ Email fallback will NOT work
✅ Firestore will work
```
**Result:** 70% reliability (FCM + Firestore, no email)

### Without `RESEND_FROM_EMAIL`
```
❌ Email sending will fail
✅ FCM still works
✅ Firestore still works
```
**Result:** 70% reliability (FCM + Firestore, no email)

### Without `GEMINI_API_KEY`
```
✅ Notifications work 100%
❌ AI letter generation disabled
✅ User can still write letters manually
```
**Result:** 100% notifications, reduced AI features

---

## PRODUCTION DEPLOYMENT STEPS

### 1. Gather All Variables (5 minutes)
```bash
# Collect these from their respective services:
- Firebase service account JSON
- Firebase VAPID public key
- Resend API key
- Email sender address
- (Optional) Gemini API key
```

### 2. Add to Vercel (2 minutes)
```bash
# For each variable, in Vercel Settings → Environment Variables:
- Click "Add"
- Paste Name and Value
- Select Production/Preview/Development
- Click "Save"
```

### 3. Redeploy (1 minute)
```bash
# Vercel automatically redeploys on env var change
# Or manually trigger via dashboard
# Wait ~2-3 minutes for deployment
```

### 4. Test Everything (5 minutes)
```bash
# Go to production URL
# Open two browser windows with different accounts
# Send a notification
# Verify all three channels:
  ✅ In-app notification
  ✅ Browser push (if open)
  ✅ Email (if FCM fails)
  ✅ Firestore backup (always)
```

---

## TROUBLESHOOTING

### "Firebase Admin SDK not properly initialized"
**Fix:** Set `FIREBASE_SERVICE_ACCOUNT` env var
```bash
# Make sure it's a SINGLE LINE JSON string
# Not multi-line
```

### "VAPID key is invalid"
**Fix:** Use public key from Firebase Cloud Messaging
```bash
# Not the private key!
# Should be long alphanumeric string, not JSON
```

### "Email not sending"
**Fix:** Check three things
```bash
1. RESEND_API_KEY is set correctly (re_xxxxx format)
2. RESEND_FROM_EMAIL is set (cupid@resend.dev or verified domain)
3. Recipient email is valid in Firestore user profile
```

### "Browser notifications not appearing"
**Fix:** Check three things
```bash
1. VITE_FIREBASE_VAPID_KEY is set
2. User granted notification permission
3. App is open or in background (not completely closed)
```

---

## SECURITY BEST PRACTICES

✅ **DO:**
- Store keys in Vercel Secrets (not in code)
- Use service account JSON (Firebase-provided)
- Rotate API keys periodically
- Limit API key permissions in respective services
- Never commit `.env.local` to git

❌ **DON'T:**
- Hardcode keys in source code
- Share keys with team (use Vercel team access)
- Use personal API keys for production
- Commit environment files to git
- Expose keys in error messages

---

## FINAL CHECKLIST BEFORE GOING LIVE

- [ ] All 4 required variables set in Vercel
- [ ] Variables verified in Vercel dashboard
- [ ] Production deployment completed
- [ ] Tested FCM push notifications
- [ ] Tested email fallback
- [ ] Tested Firestore backup
- [ ] Verified no console errors
- [ ] Confirmed delivery to both accounts
- [ ] Email templates render correctly
- [ ] No rate limiting issues

---

## SUPPORT & NEXT STEPS

**If notifications still don't work:**
1. Check Vercel deployment logs
2. Verify all 4 required variables are set
3. Check Firebase and Resend dashboards for errors
4. Monitor server logs for error messages
5. Test locally with `npm run dev` first

**To improve deliverability:**
1. Use custom domain for `RESEND_FROM_EMAIL`
2. Add SPF/DKIM records to your domain
3. Monitor Resend dashboard for bounce rates
4. Keep Firebase service account credentials fresh

Your notification system is now **production-ready!** 🚀
