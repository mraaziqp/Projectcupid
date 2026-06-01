# 🔑 GET EVERY KEY - STEP BY STEP GUIDE

## KEY #1: FIREBASE_SERVICE_ACCOUNT ✅ (You Already Have This)

### What it is:
JSON file with Firebase credentials for server-side notifications

### Where you have it:
You said you already have this! ✅

### What it looks like:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "firebase-adminsdk-abc@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### How to get it (if you lost it):
1. Go to: https://console.firebase.google.com
2. Select: **Project Cupid**
3. Click: **⚙️ Settings** (top left corner)
4. Go to: **Service Accounts** tab
5. Click: **Generate New Private Key**
6. Copy the entire JSON
7. ✅ You have it now!

---

## KEY #2: VITE_FIREBASE_VAPID_KEY ⏳ (NEED THIS)

### What it is:
Public key for browser push notifications (completely FREE)

### Step-by-step to get it:

**STEP 1:** Go to Firebase Console
- URL: https://console.firebase.google.com
- Click: **Project Cupid**

**STEP 2:** Go to Cloud Messaging
- Left sidebar → scroll down
- Look for: **Build** section
- Click: **Cloud Messaging**

**STEP 3:** Find Web Push Certificates
- On the Cloud Messaging page, look for: **"Web Push certificates"** section
- You'll see a table or section labeled "Web Push certificates"

**STEP 4:** Generate Key Pair (if empty)
- If you don't see any keys, click: **Generate Key Pair** button
- A popup will show you two keys

**STEP 5:** Copy the PUBLIC KEY
```
Public Key:  (THIS ONE - long alphanumeric string, starts with random letters)
Private Key: (DO NOT USE THIS ONE)
```

**STEP 6:** Copy the public key value
- Should look like: `ABCdefg123XYZabc456...` (very long)
- Paste it somewhere safe

✅ **You now have VITE_FIREBASE_VAPID_KEY!**

---

## KEY #3: RESEND_API_KEY ✅ (YOU HAVE THIS!)

```
re_SRP95fTC_4zPTXuBqa2qwPfzfCw76yBW2
```

✅ Already provided! Perfect!

---

## KEY #4: RESEND_FROM_EMAIL ✅ (EASY - USE DEFAULT)

### Option 1: Use Default (RECOMMENDED - takes 5 seconds)
```
cupid@resend.dev
```
✅ Works immediately! No setup needed!

### Option 2: Use Custom Domain (optional, takes 5 minutes)
If you have your own domain:
```
notifications@yourdomain.com
```
Then in Resend dashboard, verify the domain. (Takes 5 extra minutes)

**For now, use:** `cupid@resend.dev` ✅

---

## KEY #5: GEMINI_API_KEY ✅ (YOU HAVE THIS)

You already said you have this! ✅

---

## 📋 SUMMARY - WHAT YOU NEED

```
✅ FIREBASE_SERVICE_ACCOUNT = (you have this - the big JSON)
⏳ VITE_FIREBASE_VAPID_KEY = (get from Firebase Cloud Messaging - the long public key)
✅ RESEND_API_KEY = re_SRP95fTC_4zPTXuBqa2qwPfzfCw76yBW2
✅ RESEND_FROM_EMAIL = cupid@resend.dev
✅ GEMINI_API_KEY = (you have this)
```

---

## 🎯 IMMEDIATE ACTION NEEDED

1. **Go get VITE_FIREBASE_VAPID_KEY** (follow steps above, takes 2 minutes)
2. **Copy the public key value**
3. **Paste it in the next step when creating .env.local**

Then I'll create your `.env.local` file with everything! ✅
