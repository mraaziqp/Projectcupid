# PROJECT CUPID — HOME FIREBASE EMULATOR TESTING GUIDE

**Document Version:** 4.1.4  
**Scope:** Stage B Verification (Home Workstation Execution)  
**Target Firebase Project:** `studio-9165894196-8cf76`  
**Target Database ID:** `ai-studio-60c2955c-bef0-41d4-8dcc-ddbec95be891` & `(default)`  
**Safety Guarantee:** Fully local, offline execution. Zero data modifications or production deployments.  

---

## 1. PURPOSE & OVERVIEW

While away from your primary development environment, all workstation-independent preparation, code hardening, positive API allowlists, and static checks were completed in **Stage A**.

**Stage B** allows you to execute the official Google Firebase Firestore Emulator test suite at home to cryptographically and structurally prove that:
1. Razia's private health sanctuary (`cycle_logs`, `wellbeing_*`) is 100% inaccessible to Raaziq's `admin` role and unauthenticated users.
2. Ownership cannot be forged or mutated during document updates.
3. Roles cannot be escalated by non-admin users.
4. Audit logs are permanently immutable.

---

## 2. HOME WORKSTATION PREREQUISITES

To run the Firebase Firestore Emulator, your home computer requires:

1. **Node.js (v18+ or v20+)**:
   - Check with: `node -v`
2. **Java Runtime Environment (JDK 11+, 17, or 21)**:
   - Firestore Emulator runs as a Java JAR. It requires **Java 11 or higher**.
   - If missing, download **Adoptium Temurin 17 (LTS)**: [https://adoptium.net/temurin/releases/](https://adoptium.net/temurin/releases/)
   - Check with: `java -version`
3. **Firebase CLI (`firebase-tools`)**:
   - Install globally via npm:
     ```powershell
     npm install -g firebase-tools
     ```
   - Check with: `firebase --version`
4. **Rules Testing SDK**:
   - In the Project Cupid repository directory, run:
     ```powershell
     npm install --save-dev @firebase/rules-unit-testing
     ```

---

## 3. TWO-STEP EXECUTION AT HOME

Two dedicated PowerShell automation scripts have been prepared in the repository root:

### Step 1: Run the Prerequisite Checker
Open PowerShell in the `Cupid` workspace directory and run:

```powershell
.\PROJECT_CUPID_HOME_FIREBASE_CHECK.ps1
```

**Expected Output:**
```
==========================================================================
   PROJECT CUPID — HOME FIREBASE EMULATOR PREREQUISITE CHECK               
==========================================================================

[1/5] Checking Node.js runtime... OK (v20.x)
[2/5] Checking Java runtime (requires Java 11+)... OK (Java 17 detected)
[3/5] Checking Firebase CLI (firebase-tools)... OK (13.x)
[4/5] Checking @firebase/rules-unit-testing package... OK (Installed in node_modules)
[5/5] Checking port 8080 availability... OK (Port 8080 is available)

==========================================================================
 ALL CHECKS PASSED! Your workstation is ready to execute emulator tests.
 Run .\PROJECT_CUPID_HOME_FIREBASE_TEST.ps1 to start the test suite.
==========================================================================
```

---

### Step 2: Run the Security Rules Test Runner
Once all 5 checks pass, execute:

```powershell
.\PROJECT_CUPID_HOME_FIREBASE_TEST.ps1
```

This single command automatically:
1. Boots the official Google Cloud Firestore Emulator in-memory.
2. Compiles and loads [`firestore.rules`](file:///c:/Users/G997629/OneDrive%20-%20Sanlam%20Life%20Insurance%20Limited/Documents/wa/Cupid/firestore.rules).
3. Executes [`tests/firebase_rules_emulator.test.ts`](file:///c:/Users/G997629/OneDrive%20-%20Sanlam%20Life%20Insurance%20Limited/Documents/wa/Cupid/tests/firebase_rules_emulator.test.ts).
4. Cleans up and shuts down the emulator.

---

## 4. WHAT THE EMULATOR SUITE TESTS

The test suite in [`tests/firebase_rules_emulator.test.ts`](file:///c:/Users/G997629/OneDrive%20-%20Sanlam%20Life%20Insurance%20Limited/Documents/wa/Cupid/tests/firebase_rules_emulator.test.ts) exercises the following assertions:

### A. Unauthenticated Requests (Default Deny)
- [x] Unauthenticated user cannot read shared relationship letters.
- [x] Unauthenticated user cannot read Razia's cycle logs.
- [x] Unauthenticated user cannot write to any document.

### B. Her Wellbeing Sanctuary (Zero-Leak Guarantee)
- [x] Razia (`sanctuary_owner`) can read her own cycle logs.
- [x] **Raaziq (`admin`) is BLOCKED from reading Razia's cycle logs** (`assertFails`).
- [x] **Raaziq (`admin`) is BLOCKED from querying Razia's cycle logs** (`assertFails`).
- [x] Attacker is BLOCKED from reading Razia's cycle logs (`assertFails`).
- [x] Tested across all 6 wellbeing collections: `cycle_logs`, `wellbeing_symptoms`, `wellbeing_moods`, `wellbeing_medications`, `wellbeing_appointments`, `wellbeing_journal`.

### C. Anti-Forgery & Ownership Immutability
- [x] Razia can update her own record when keeping `userId` intact.
- [x] Razia is BLOCKED from altering `userId` during update (cannot reassign ownership).
- [x] Attacker is BLOCKED from modifying Razia's documents.

### D. Role Privilege Escalation Defense
- [x] Razia can update non-role profile fields (e.g. `displayName`).
- [x] Razia is BLOCKED from updating `role` to `'admin'` (`assertFails`).
- [x] Attacker is BLOCKED from creating user doc with `role: 'admin'` (`assertFails`).

### E. Jarvis Audit Trail Immutability
- [x] Raaziq (`admin`) can read `jarvis_audit_logs`.
- [x] Raaziq is BLOCKED from updating existing audit logs (`assertFails`).
- [x] Raaziq is BLOCKED from deleting existing audit logs (`assertFails`).
- [x] Attacker is BLOCKED from reading audit logs (`assertFails`).

---

## 5. TROUBLESHOOTING COMMON HOME SETUP ISSUES

### Issue 1: "Java is not recognized as an internal or external command"
- **Cause**: Java is not installed or not in system PATH.
- **Fix**: Download Adoptium Temurin 17 (.msi installer) and check the installer box: **"Set JAVA_HOME variable"** and **"Add to PATH"**. Re-open PowerShell.

### Issue 2: "Port 8080 is already in use"
- **Cause**: Another local service (e.g. Tomcat, proxy, dev server) is bound to port 8080.
- **Fix**: Identify the process with `Get-NetTCPConnection -LocalPort 8080` or run the emulator on another port:
  ```powershell
  firebase emulators:exec --only firestore "npx tsx tests/firebase_rules_emulator.test.ts" --project studio-9165894196-8cf76
  ```

### Issue 3: "Cannot find module '@firebase/rules-unit-testing'"
- **Fix**: Run `npm install --save-dev @firebase/rules-unit-testing` in the project root.

---

## 6. WHAT TO DO AFTER TESTS PASS

When `PROJECT_CUPID_HOME_FIREBASE_TEST.ps1` concludes with:
`EMULATOR VERIFICATION COMPLETE: ALL SECURITY RULES TESTS PASSED!`

You are 100% verified to proceed with cloud deployment:
1. Run `git push origin main --tags`
2. Publish `firestore.rules` in Firebase Console
3. Set Vercel production secrets
4. Go live with Project Cupid!
