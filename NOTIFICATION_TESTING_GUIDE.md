# 🔔 Project Cupid Notification Testing Guide

## Overview
This guide ensures notifications are bulletproof with dual delivery: **FCM Push** + **Email Fallback**.

---

## ✅ Notification System Architecture

### Delivery Flow
```
User sends message
    ↓
Firestore stores notification
    ↓
Calls /api/notify-robust
    ↓
┌─────────────────┴─────────────────┐
↓                                   ↓
FCM Push (if token exists)    Email via Resend (if email exists)
    ↓                               ↓
Browser/App Notification        Inbox Notification
(even when app closed)         (guaranteed delivery)
```

### Fallback Behavior
- If FCM succeeds → notification delivered ✓
- If FCM fails but email succeeds → notification delivered ✓
- If both succeed → redundant delivery (both channels) ✓
- If both fail → notification stored in Firestore (in-app on next open) ⚠️

---

## 🧪 Testing Checklist

### Pre-Test Setup
- [ ] Create `.env.local` with:
  ```
  VITE_FIREBASE_VAPID_KEY=your_vapid_key
  FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
  RESEND_API_KEY=your_resend_api_key
  RESEND_FROM_EMAIL=cupid@resend.dev
  ```
- [ ] Run `npm install` (includes `resend` package)
- [ ] Run `npm run dev` (starts server on port 3000)
- [ ] Open two browser windows/incognito tabs for A & B

---

## 🎯 Test Scenarios

### Test 1: FCM Push Notification (App Open)
**Goal:** Verify push works when app is active

**Steps:**
1. User A: Open app and grant notification permission
2. User B: Send a message/letter to User A
3. **Expected Result:** User A receives in-app notification immediately
4. **Verify:** Check browser console for `✓ FCM notification sent`

**Logs to check:**
- `server logs`: `✓ FCM notification sent to token: ...`
- `browser console`: Notification object created

---

### Test 2: FCM Push Notification (App Closed)
**Goal:** Verify push works when app is closed

**Steps:**
1. User A: Open app, grant permissions, then **close the app entirely**
2. User B: Send a message to User A
3. Wait 3-5 seconds
4. **Expected Result:** User A sees system notification (top of screen)
5. Click notification to re-open app and see message

**Verify:**
- `server logs`: `✓ FCM notification sent`
- System notification appears (desktop/mobile)

---

### Test 3: Email Fallback (FCM Disabled)
**Goal:** Verify email works when FCM is unavailable

**Steps:**
1. Temporarily disable FCM in code (comment out FCM attempt in notify-robust)
2. User B: Send a message to User A
3. Check User A's email inbox
4. **Expected Result:** Beautiful HTML email with message title and content

**Verify:**
- `server logs`: `✓ Email notification sent to: [email]`
- Email arrives in inbox within 30 seconds
- Email styling is correct and clickable

---

### Test 4: Dual Delivery (Both Channels Active)
**Goal:** Verify both FCM and email are sent

**Steps:**
1. Ensure both FCM and Resend are configured
2. User B: Send a message
3. Monitor server logs
4. Check user A's inbox

**Expected Result:**
```
✓ FCM notification sent to token: ...
✓ Email notification sent to: user@example.com
```

---

### Test 5: Firestore In-App Display
**Goal:** Verify notifications appear in-app even without push

**Steps:**
1. Don't grant browser notification permission
2. User B: Send message to User A
3. **Expected Result:** Notification stored in Firestore, visible in app

**Verify:**
- Check Firestore `notifications` collection
- Document has: `userId`, `title`, `body`, `read: false`, `createdAt`

---

### Test 6: Notification Persistence
**Goal:** Verify notifications aren't lost on network failure

**Steps:**
1. User B: Send message to User A
2. Immediately close User A's app
3. Force-stop the browser/clear cache
4. Re-open app
5. **Expected Result:** Message still visible (from Firestore)

**Verify:**
- Notification appears when app reopens
- No errors in console

---

## 📊 Monitoring & Debugging

### Server Logs to Watch
```
✓ FCM notification sent to token: abc123...
✓ Email notification sent to: user@example.com
✗ FCM notification failed: Invalid registration token
✗ Email notification failed: Invalid email address
```

### Browser Console Checks
```javascript
// Notification permission status
Notification.permission // → "granted" | "denied" | "default"

// FCM token registered
console.log(profile?.fcmToken) // → "abc123xyz..."
```

### Firestore Inspection
- Collection: `notifications`
- Fields to verify:
  - `userId` (recipient ID)
  - `title` (notification title)
  - `body` (notification body)
  - `read` (false initially, true after shown)
  - `createdAt` (timestamp)

### Email Verification
- Check spam folder (Resend may land there initially)
- Verify HTML formatting renders correctly
- Confirm sender is configured address

---

## 🚨 Troubleshooting

### Problem: "FCM notification failed: Invalid registration token"
**Solution:**
- User didn't grant notification permission
- Token expired (ask user to refresh page)
- Firebase VAPID key misconfigured

**Fix:**
1. Check `VITE_FIREBASE_VAPID_KEY` is set
2. User grants permission: `Notification.requestPermission()`
3. Refresh page

---

### Problem: "Email notification failed: Invalid email address"
**Solution:**
- Email address missing in user profile
- Resend API key invalid
- From address not verified

**Fix:**
1. Verify `RESEND_API_KEY` is set
2. Check user email in Firestore `users` collection
3. Verify from address in Resend dashboard

---

### Problem: Notifications never appear
**Solution:**
- Check server is running: `npm run dev`
- Verify endpoints exist: `/api/notify-robust`
- Check browser console for errors
- Verify user has notification permission

**Debug:**
```javascript
// In browser console
fetch('/api/notify-robust', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: 'test-fcm-token',
    email: 'test@example.com',
    title: 'Test Notification',
    body: 'This is a test'
  })
}).then(r => r.json()).then(console.log)
```

---

## 📝 Notification Response Format

### Success Response (200)
```json
{
  "success": true,
  "fcm": {
    "success": true,
    "error": null
  },
  "email": {
    "success": true,
    "error": null
  },
  "message": "Notification delivered via FCM and email"
}
```

### Failure Response (500)
```json
{
  "success": false,
  "fcm": {
    "success": false,
    "error": "Invalid registration token"
  },
  "email": {
    "success": false,
    "error": "Invalid email address"
  },
  "error": "Failed to deliver notification via all channels"
}
```

---

## 🎬 Running a Full Test Session

1. **Terminal 1:** Start the dev server
   ```bash
   npm run dev
   ```

2. **Browser 1 & 2:** Open `http://localhost:3000`
   - User A: Login and grant notifications
   - User B: Login

3. **User B:** Send a letter/message

4. **Verify:**
   - [ ] User A sees notification (browser or email)
   - [ ] Server logs show successful delivery
   - [ ] Firestore stores notification
   - [ ] Close app and re-test

5. **Check Firestore:**
   - Verify notification document exists
   - Verify `read` field updates after viewing

---

## 🔍 Log Files & Metrics

### Where to Look
- **Server Logs:** Terminal running `npm run dev`
- **Browser Console:** DevTools → Console tab (F12)
- **Firestore Console:** Firebase → Firestore Database → Collections
- **Email Logs:** Resend Dashboard → Emails

### Key Metrics
- FCM delivery time: < 1 second
- Email delivery time: 5-30 seconds
- Firestore write time: < 500ms

---

## ✨ Success Indicators

✓ System is working if:
1. Notifications appear when app is open (FCM)
2. Notifications appear when app is closed (push)
3. Emails arrive as fallback
4. Firestore always has notification record
5. No console errors
6. Server logs show successful delivery

---

## 📞 Questions & Issues

If tests fail:
1. Check `RESEND_API_KEY` and `VITE_FIREBASE_VAPID_KEY` are set
2. Verify user email in Firestore
3. Check browser notification permission
4. Look at server terminal output
5. Inspect browser DevTools Console
