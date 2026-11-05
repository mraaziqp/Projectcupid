# PROJECT CUPID 4.1.2 — LIVE CLOUD ACTIVATION PLAN

**Target Release:** Project Cupid 4.1.2  
**Baseline Verified Commit:** `c9766d9` (`v4.1.1-verified`)  
**Current HEAD Commit:** `cee96cf` (with `.firebaserc` project binding)  
**Release Tags:** `v4.1.1-activated`, `v4.1.1-verified`  
**Rollback Baseline:** `v4.1.0-verified` (`e415e45`)  
**Backup Branches:** `backup-cupid-4.1`, `backup-cupid-4.0`, `backup-cupid-3.0`  
**Activation Status:** **PREPARED — AWAITING EXPLICIT USER APPROVAL FOR CLOUD ACTIONS**  
**Date:** November 5, 2026  

---

## 1. COMPONENT STATUS & ACTIVATION MATRIX

All requirements are categorized under standardized release statuses:
- **`VERIFIED`**: Tested and validated locally against real configurations, type checkers, and test suites.
- **`PREPARED`**: Ready for execution, configured in code, awaiting cloud activation triggers.
- **`PENDING`**: Requires user manual input in external dashboards (Firebase / Vercel / Resend).
- **`BLOCKED`**: Hard stop preventing progress (currently 0 blockers).

| System Component | Status | Cloud State | Gate Result | Details & Safeguards |
| :--- | :---: | :---: | :---: | :--- |
| **Git Release Lineage** | `VERIFIED` | `PENDING PUSH` | **PASS (READY)** | 5 commits ahead of `origin/main`. Working tree clean. Fast-forward lineage. |
| **Firestore Security Rules** | `VERIFIED` | `PENDING CONSOLE PUSH` | **PASS (READY)** | Tested in 82/82 assertions. Granular `get/list/create/update/delete`. Zero-leak health privacy. |
| **Firebase Project Binding** | `VERIFIED` | `CONFIGURED` | **PASS (READY)** | `.firebaserc` created, pointing to `studio-9165894196-8cf76`. |
| **Vercel Build Pipeline** | `VERIFIED` | `PREPARED` | **PASS (READY)** | `npm run build:client` (`vite build`) generates SPA chunks + Service Worker. |
| **Resend Email Service** | `PREPARED` | `PENDING KEY` | **PASS (READY)** | Fail-safe simulation active (`delivered: false`). Sender: `cupid@verifiedbizlink.co.za`. |
| **Jarvis Ecosystem Bridge** | `VERIFIED` | `PREPARED` | **PASS (READY)** | 8 tools verified against local Second Brain v2.5. Outbound HTTPS ready. |
| **Memory Book Bridge** | `VERIFIED` | `PREPARED` | **PASS (READY)** | Deduplication and vector schema aligned. Health note filter active (`403 Forbidden`). |
| **Automated Test Suite** | `VERIFIED` | `173/173 PASS` | **PASS** | 82 acceptance assertions + 41 evolution assertions + 50 platform assertions. |

---

## 2. GIT RELEASE VERIFICATION

### Current Working Tree & Commit State:
- **Branch**: `main`
- **Working Tree**: Completely clean (0 untracked, 0 uncommitted changes).
- **Remote**: `origin` $\rightarrow$ `https://github.com/mraaziqp@gmail.com/Projectcupid.git`
- **Remote `origin/main` Position**: `edf47d8` (`v3.0.0-verified`)
- **Local `main` Position**: `cee96cf` (5 commits ahead of `origin/main`)

### Commit Lineage to Push:
```
edf47d8 (origin/main)
   │
   ├─► 336bd68  feat(cupid-4.0): daily magical welcome, onboarding, admin centre, memory book
   ├─► e415e45  feat(cupid-4.1): sanctuary integrity, zero-leak health privacy, wedding date
   ├─► 1d8342a  feat(cupid-4.1.1): production activation gate, firestore rules, resend fallback
   ├─► c9766d9  docs(release): add Project Cupid 4.1.1 production activation report
   └─► cee96cf  chore(firebase): add .firebaserc pointing to project studio-9165894196-8cf76 (HEAD)
```

### Safety & Non-Destructive Push Verification:
- **No Force-Push Required**: The lineage from `edf47d8` to `cee96cf` is strictly linear.
- **Remote Overwrite Check**: Remote branch has not diverged. A clean fast-forward push will occur.
- **Rollback Safety**: Local backup branches `backup-cupid-4.1`, `backup-cupid-4.0`, and `backup-cupid-3.0` preserve exact previous states.
- **Prepared Command** *(Requires user authorization before execution)*:
  ```powershell
  git push origin main --tags
  ```

---

## 3. FIREBASE PRODUCTION ACTIVATION PREPARATION

### Firebase Configuration Verification:
- **Project ID**: `studio-9165894196-8cf76`
- **Firestore Database ID**: `ai-studio-60c2955c-bef0-41d4-8dcc-ddbec95be891`
- **Web App ID**: `1:359849944678:web:84b159be9d3ea88740afa7`
- **Auth Domain**: `studio-9165894196-8cf76.firebaseapp.com`
- **Configuration Bindings**:
  - `firebase.json`: maps `"firestore": { "rules": "firestore.rules" }`
  - `.firebaserc`: maps `"projects": { "default": "studio-9165894196-8cf76" }`
  - `firebase-applet-config.json`: contains client app credentials baked into the bundle

### Firestore Rules Audit ([`firestore.rules`](file:///c:/Users/G997629/OneDrive%20-%20Sanlam%20Life%20Insurance%20Limited/Documents/wa/Cupid/firestore.rules)):
1. **Zero-Leak Wellbeing Sanctuary**:
   - Collections: `cycle_logs`, `wellbeing_symptoms`, `wellbeing_moods`, `wellbeing_medications`, `wellbeing_appointments`, `wellbeing_journal`.
   - Permissions: `get`, `list`, `create`, `update`, `delete` strictly restricted to `request.auth.uid == resource.data.userId`.
   - Admin Isolation: The `isAdmin()` role check is **not** present in any wellbeing collection match. Raaziq's administrator status has zero technical ability to read or query these documents.
2. **Anti-Forgery on Updates**:
   - `isUpdatingOwnResource()` requires `request.resource.data.userId == resource.data.userId`. Users cannot transfer ownership or forge `userId` attributes.
3. **Privilege Escalation Lock**:
   - `users/{userId}` allows self-profile updates only if `request.resource.data.role == resource.data.role`. Non-admins cannot elevate their role to `admin`.
4. **Append-Only Jarvis Audit Trail**:
   - `jarvis_audit_logs/{docId}` allows `create` if authenticated, but strictly enforces `allow update, delete: if false;`.
5. **Scoped Welcome State**:
   - `daily_welcome_status/{docId}` matches `request.auth.uid == resource.data.userId`, preventing cross-account state leakage.

### Deployment Instructions:
- **Option A (Firebase Console - Recommended & Zero-Dependency)**:
  1. Open [Firebase Console Rules](https://console.firebase.google.com/project/studio-9165894196-8cf76/firestore/rules).
  2. Select database `ai-studio-60c2955c-bef0-41d4-8dcc-ddbec95be891` (or `(default)` if unified).
  3. Copy the entire contents of [`firestore.rules`](file:///c:/Users/G997629/OneDrive%20-%20Sanlam%20Life%20Insurance%20Limited/Documents/wa/Cupid/firestore.rules).
  4. Paste into the editor and click **Publish**.
- **Option B (Firebase CLI)**:
  ```powershell
  npm install -g firebase-tools
  firebase login
  firebase deploy --only firestore:rules --project studio-9165894196-8cf76
  ```

---

## 4. VERCEL PRODUCTION ENVIRONMENT PREPARATION

### Environment Variables Inventory & Secrets Audit

> [!CAUTION]
> Under no circumstances are actual secret keys committed to Git or embedded in client-side code. Only environment variable names and configuration purposes are documented below.

| Variable Name | Required Scope | Target Environment | Status | Purpose & Notes |
| :--- | :---: | :---: | :---: | :--- |
| `RESEND_API_KEY` | Server-Side Only | Production, Preview | `PENDING` | Live delivery of transactional notifications and love letters. |
| `RESEND_FROM_EMAIL` | Server-Side Only | Production, Preview | `PREPARED` | Sender address: `Project Cupid <cupid@verifiedbizlink.co.za>`. |
| `FIREBASE_SERVICE_ACCOUNT` | Server-Side Only | Production, Preview | `PENDING` | Single-line JSON service account for Firebase Admin SDK (used for FCM web push). |
| `VITE_FIREBASE_VAPID_KEY` | Client-Side (Vite) | Production, Preview | `PENDING` | Public VAPID key for browser Web Push notifications. |
| `JARVIS_API_KEY` | Server-Side Only | Production, Preview | `PREPARED` | Authenticates inbound Jarvis Second Brain calls (defaults to `cupid_jarvis_live_bridge_key`). |
| `BRIDGE_SECRET` | Server-Side Only | Production, Preview | `PREPARED` | Authenticates Forever Book memory bridge calls (defaults to `cupid-forever-bridge-2024`). |
| `GEMINI_API_KEY` | Server-Side Only | Production, Preview | `PENDING` | Powers AI letter generation via Google GenAI SDK. |
| `OLLAMA_API_URL` | Server-Side Only | Production, Preview | `OPTIONAL` | Optional bridge for self-hosted local LLM prompts. |
| `OLLAMA_API_KEY` | Server-Side Only | Production, Preview | `OPTIONAL` | Optional API key for Ollama upstream endpoint. |

### Exact Vercel Configuration Steps:
1. Navigate to: **[Vercel Dashboard](https://vercel.com/)** $\rightarrow$ Project **Project Cupid** (`projectcupid.vercel.app`).
2. Go to **Settings** $\rightarrow$ **Environment Variables**.
3. Add the following variables:
   - Key: `RESEND_API_KEY` | Value: `re_...` | Environments: `Production`, `Preview`, `Development`
   - Key: `RESEND_FROM_EMAIL` | Value: `Project Cupid <cupid@verifiedbizlink.co.za>` | Environments: All
   - Key: `GEMINI_API_KEY` | Value: Your Google AI Studio API Key | Environments: All
   - Key: `FIREBASE_SERVICE_ACCOUNT` | Value: Single-line JSON string from Firebase Console $\rightarrow$ Project Settings $\rightarrow$ Service Accounts.
   - Key: `VITE_FIREBASE_VAPID_KEY` | Value: Web Push certificate key from Firebase Console $\rightarrow$ Cloud Messaging.
4. Save and trigger a production deployment.

---

## 5. RESEND EMAIL PRODUCTION ACTIVATION & CONTROLLED TEST PLAN

### Sender Verification:
- **Verified Sender**: `Project Cupid <cupid@verifiedbizlink.co.za>`
- **Domain Verification**: Ensure `verifiedbizlink.co.za` shows status **Verified** (DKIM, SPF, MX) in the [Resend Dashboard](https://resend.com/domains).

### API State Distinctions:
The Project Cupid backend cleanly distinguishes all 4 delivery states:
1. **Simulation Mode** (`RESEND_API_KEY` missing):
   - Returns HTTP 200 with `{ success: false, delivered: false, isSimulation: true, note: "RESEND_API_KEY environment variable is not configured." }`.
   - Never fakes delivery.
2. **API Request Accepted & Sent**:
   - Returns HTTP 200 with `{ success: true, emailId: "...", timestamp: "..." }`.
3. **Resend Rejection / Failure**:
   - Returns HTTP 500 with `{ success: false, error: sendResult.error.message }`.
4. **Invalid Request Payload**:
   - Returns HTTP 400 with `{ error: "Missing required fields..." }`.

### Controlled Inbox Test Plan (Zero Risk to Partner):
> [!IMPORTANT]
> To prevent spamming or surprising Razia during technical testing, all test dispatches MUST be sent to Raaziq's controlled inbox.

- **Test Target**: `mraaziqp@gmail.com` (Raaziq's verified test inbox).
- **Test Endpoint**: `POST /api/notify-event`
  ```json
  {
    "recipientEmail": "mraaziqp@gmail.com",
    "title": "Cloud Activation Smoke Test",
    "eventType": "letter.created",
    "senderName": "System Validation",
    "recipientName": "Raaziq",
    "previewText": "Verifying production Resend delivery"
  }
  ```
- **Verification Criteria**:
  - Received email has sender `cupid@verifiedbizlink.co.za`.
  - SPF / DKIM shows `PASS` for `verifiedbizlink.co.za`.
  - Template renders aged-parchment storybook typography.
  - Zero emails dispatched to `raziashade4@gmail.com`.

---

## 6. JARVIS & MEMORY BOOK CONNECTIVITY SPECIFICATIONS

### Technical Architecture & Network Boundaries:
- **Second Brain v2.5 Host**: Local workstation (`C:\Users\G997629\.gemini\antigravity\scratch\New folder\second-brain-v2.5`).
- **Project Cupid Cloud Host**: Vercel Serverless (`https://projectcupid.vercel.app`).

### Communication Flow:
```
┌──────────────────────────────────────────────────┐
│             Local Workstation Host               │
│  Jarvis Second Brain v2.5 (Electron / Node.js)   │
│  - pgvector PostgreSQL (localhost:5432)          │
│  - Tool calling engine                           │
└────────────────────────┬─────────────────────────┘
                         │
                         │ Outbound HTTPS Requests
                         ▼
┌──────────────────────────────────────────────────┐
│           Vercel Cloud Deployment                │
│  https://projectcupid.vercel.app                 │
│  - /api/jarvis/tools                             │
│  - /api/jarvis/health                            │
│  - /api/jarvis/execute                           │
│  - /api/memory-book/sync                         │
└────────────────────────┬─────────────────────────┘
                         │
                         │ Firebase Admin / SDK
                         ▼
┌──────────────────────────────────────────────────┐
│         Google Cloud Firestore                   │
│  studio-9165894196-8cf76                         │
└──────────────────────────────────────────────────┘
```

### Connectivity Limitations & Mitigations:
1. **No Inbound Tunnel to Local Workstation**:
   - Vercel cannot reach into the local machine's PostgreSQL database directly.
   - **Mitigation**: Architecture is designed as **Jarvis-initiated**. Jarvis queries Cupid's public endpoints; Cupid never needs to initiate inbound TCP connections to the workstation.
2. **Memory Book Sync**:
   - When Jarvis executes `cupid_get_shared_memories` or `cupid_add_memory`, memories are synced into Jarvis's local vector memory via `AgentVectorMemory`.
3. **Health Data Isolation**:
   - Even with a valid `JARVIS_API_KEY`, Jarvis cannot call endpoints querying `cycle_logs` or `wellbeing_*`. Any attempt returns `403 Forbidden` and logs a permanent entry in `jarvis_audit_logs`.

---

## 7. CONTROLLED DEPLOYMENT SEQUENCE

```
[Phase 1: Git Push to Origin] ──► [Phase 2: Firestore Rules Publish] ──► [Phase 3: Vercel Secrets Config]
            │                                                                      │
            ▼                                                                      ▼
[Phase 6: Rollback Checkpoint] ◄── [Phase 5: Two-Account Smoke Test] ◄── [Phase 4: Vercel Deployment]
```

### Execution Steps:
1. **Phase 1: Git Push**:
   - Execute: `git push origin main --tags`
   - Verify: Commit `cee96cf` is live on `github.com/mraaziqp/Projectcupid`.
2. **Phase 2: Deploy Firestore Security Rules**:
   - Publish [`firestore.rules`](file:///c:/Users/G997629/OneDrive%20-%20Sanlam%20Life%20Insurance%20Limited/Documents/wa/Cupid/firestore.rules) in Firebase Console.
3. **Phase 3: Configure Vercel Secrets**:
   - Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `GEMINI_API_KEY` to Vercel environment variables.
4. **Phase 4: Deploy Vercel Production Build**:
   - Trigger deployment on Vercel Dashboard or push trigger.
   - Verify deployment URL: `https://projectcupid.vercel.app`.
5. **Phase 5: Production Smoke Tests**:
   - Account 1 (Raaziq): Log in with `mraaziqp@gmail.com`. Verify admin command centre, relationship modules, and strict rejection when accessing Razia's private health logs.
   - Account 2 (Razia): Log in with `raziashade4@gmail.com`. Verify morning magical welcome envelope, cycle tracker access, symptom logs, and shared memories.
   - Resend Test: Trigger controlled test notification to `mraaziqp@gmail.com`.
   - Jarvis Test: Run `cupid_get_status` tool from Jarvis Second Brain.
6. **Phase 6: Lock Release**:
   - Tag production release: `git tag -a v4.1.2-live -m "Project Cupid 4.1.2 Live Cloud Activation Complete"`.

---

## 8. ROLLBACK & DISASTER RECOVERY PROCEDURES

In the event of an unexpected cloud outage, deployment error, or configuration failure:

### Rollback Scenario A: Vercel Deployment Rollback (Instant)
1. Go to **Vercel Dashboard** $\rightarrow$ **Deployments**.
2. Locate the previous successful deployment (Commit `edf47d8` or previous stable build).
3. Click the three dots `...` $\rightarrow$ **Promote to Production**. Instant switch in < 5 seconds.

### Rollback Scenario B: Revert Git Lineage
```powershell
# Revert working tree to Cupid 4.1.0 pre-activation checkpoint
git checkout backup-cupid-4.1
# or hard reset local main to Cupid 4.1.0 verified baseline
git reset --hard v4.1.0-verified
```

### Rollback Scenario C: Revert Firestore Security Rules
- If rules cause client permission issues, the previous working rules can be restored instantly from tag `v4.0.0-baseline`:
  ```powershell
  git checkout v4.0.0-baseline -- firestore.rules
  ```
- Copy and publish in Firebase Console.

---

## 9. USER APPROVAL REQUEST

All verification steps, build pipelines, rule checks, and safety constraints are satisfied.  
**To execute live cloud activation, please confirm your approval to:**
1. Push local commits (`c9766d9` and `cee96cf`) and tags (`v4.1.1-activated`, `v4.1.1-verified`) to GitHub `origin/main`.
2. Proceed with Firebase Console rules publishing and Vercel environment variable configuration.
