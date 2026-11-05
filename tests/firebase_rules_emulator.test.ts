/**
 * PROJECT CUPID — FIREBASE FIRESTORE RULES EMULATOR TEST SUITE
 * 
 * Target Project: studio-9165894196-8cf76
 * Target Named Database: ai-studio-60c2955c-bef0-41d4-8dcc-ddbec95be891
 * Default Database: (default)
 * 
 * Verifies:
 * - Unauthenticated deny
 * - Strict owner-only access for Her Wellbeing sanctuary
 * - Administrator denial on Razia's private health records (Zero-Leak Guarantee)
 * - Anti-forgery (userId immutability on update)
 * - Anti-privilege escalation (role update restrictions)
 * - Append-only immutable audit trail (jarvis_audit_logs)
 */

import fs from "fs";
import path from "path";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
  RulesTestContext
} from "@firebase/rules-unit-testing";
import { setDoc, getDoc, updateDoc, deleteDoc, doc, collection, getDocs, query, where } from "firebase/firestore";

const PROJECT_ID = "studio-9165894196-8cf76";
const NAMED_DB_ID = "ai-studio-60c2955c-bef0-41d4-8dcc-ddbec95be891";

const RAZIA_UID = "razia_uid_0408";
const RAAZIQ_UID = "raaziq_uid_0408";
const ATTACKER_UID = "attacker_uid_9999";

const WELLBEING_COLLECTIONS = [
  "cycle_logs",
  "wellbeing_symptoms",
  "wellbeing_moods",
  "wellbeing_medications",
  "wellbeing_appointments",
  "wellbeing_journal"
];

let testEnv: RulesTestEnvironment;

async function runEmulatorSuite() {
  console.log("\n==========================================================================");
  console.log("   PROJECT CUPID — FIREBASE FIRESTORE RULES EMULATOR TEST RUNNER          ");
  console.log("==========================================================================\n");

  const rulesPath = path.resolve(process.cwd(), "firestore.rules");
  if (!fs.existsSync(rulesPath)) {
    throw new Error(`firestore.rules not found at ${rulesPath}`);
  }
  const rules = fs.readFileSync(rulesPath, "utf-8");

  // Initialize test environment with the exact rules
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: "127.0.0.1",
      port: 8080
    }
  });

  console.log("✓ Connected to Firestore Emulator on 127.0.0.1:8080");

  let passed = 0;
  let failed = 0;

  async function testCase(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      passed++;
      console.log(`  ✓ [EMULATOR PASS] ${name}`);
    } catch (err: any) {
      failed++;
      console.error(`  ✗ [EMULATOR FAIL] ${name}: ${err?.message || err}`);
    }
  }

  // --- 1. SETUP BASE IDENTITIES WITH WITHSECURITYRULES_DISABLED ---
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    // Seed Raaziq user doc with role admin
    await setDoc(doc(adminDb, "users", RAAZIQ_UID), {
      uid: RAAZIQ_UID,
      email: "mraaziqp@gmail.com",
      role: "admin",
      displayName: "Raaziq"
    });
    // Seed Razia user doc with role sanctuary_owner
    await setDoc(doc(adminDb, "users", RAZIA_UID), {
      uid: RAZIA_UID,
      email: "raziashade4@gmail.com",
      role: "sanctuary_owner",
      displayName: "Razia"
    });
    // Seed Razia cycle doc
    await setDoc(doc(adminDb, "cycle_logs", "razia_cycle_1"), {
      userId: RAZIA_UID,
      startDate: "2026-11-01",
      cycleLength: 28,
      notes: "Private health notes"
    });
    // Seed Audit Log
    await setDoc(doc(adminDb, "jarvis_audit_logs", "audit_log_1"), {
      action: "cupid_get_status",
      status: "success",
      timestamp: "2026-11-05T10:00:00Z"
    });
  });

  const unauthedContext = testEnv.unauthenticatedContext();
  const raziaContext = testEnv.authenticatedContext(RAZIA_UID, { email: "raziashade4@gmail.com" });
  const raaziqContext = testEnv.authenticatedContext(RAAZIQ_UID, { email: "mraaziqp@gmail.com" });
  const attackerContext = testEnv.authenticatedContext(ATTACKER_UID, { email: "attacker@malicious.com" });

  const unauthedDb = unauthedContext.firestore();
  const raziaDb = raziaContext.firestore();
  const raaziqDb = raaziqContext.firestore();
  const attackerDb = attackerContext.firestore();

  // --- 2. UNAUTHENTICATED TESTS ---
  console.log("\n--- A. UNAUTHENTICATED REQUESTS (DEFAULT DENY) ---");
  await testCase("Unauthenticated user cannot read shared letters", async () => {
    await assertFails(getDoc(doc(unauthedDb, "letters", "test_letter")));
  });

  await testCase("Unauthenticated user cannot read Razia's cycle logs", async () => {
    await assertFails(getDoc(doc(unauthedDb, "cycle_logs", "razia_cycle_1")));
  });

  await testCase("Unauthenticated user cannot write to any collection", async () => {
    await assertFails(setDoc(doc(unauthedDb, "letters", "hacked"), { text: "malicious" }));
  });

  // --- 3. ZERO-LEAK HER WELLBEING TESTS ---
  console.log("\n--- B. ZERO-LEAK HEALTH SANCTUARY ISOLATION ---");
  await testCase("Razia CAN read her own cycle log", async () => {
    await assertSucceeds(getDoc(doc(raziaDb, "cycle_logs", "razia_cycle_1")));
  });

  await testCase("Raaziq (ADMIN) CANNOT read Razia's cycle log", async () => {
    await assertFails(getDoc(doc(raaziqDb, "cycle_logs", "razia_cycle_1")));
  });

  await testCase("Raaziq (ADMIN) CANNOT list Razia's cycle logs via query", async () => {
    const q = query(collection(raaziqDb, "cycle_logs"), where("userId", "==", RAZIA_UID));
    await assertFails(getDocs(q));
  });

  await testCase("Attacker CANNOT read Razia's cycle log", async () => {
    await assertFails(getDoc(doc(attackerDb, "cycle_logs", "razia_cycle_1")));
  });

  for (const col of WELLBEING_COLLECTIONS) {
    await testCase(`Razia CAN create own document in ${col}`, async () => {
      await assertSucceeds(setDoc(doc(raziaDb, col, `doc_${col}_1`), {
        userId: RAZIA_UID,
        title: "Personal Entry",
        date: "2026-11-05"
      }));
    });

    await testCase(`Raaziq CANNOT read document in ${col}`, async () => {
      await assertFails(getDoc(doc(raaziqDb, col, `doc_${col}_1`)));
    });

    await testCase(`Attacker CANNOT read document in ${col}`, async () => {
      await assertFails(getDoc(doc(attackerDb, col, `doc_${col}_1`)));
    });
  }

  // --- 4. ANTI-FORGERY & OWNERSHIP IMMUTABILITY ---
  console.log("\n--- C. ANTI-FORGERY & OWNERSHIP TAMPERING DEFENSE ---");
  await testCase("Razia CAN update her own record when keeping userId intact", async () => {
    await assertSucceeds(updateDoc(doc(raziaDb, "cycle_logs", "razia_cycle_1"), {
      userId: RAZIA_UID,
      notes: "Updated private notes"
    }));
  });

  await testCase("Razia CANNOT tamper with userId during update (transfer ownership)", async () => {
    await assertFails(updateDoc(doc(raziaDb, "cycle_logs", "razia_cycle_1"), {
      userId: ATTACKER_UID,
      notes: "Transferred ownership"
    }));
  });

  await testCase("Attacker CANNOT update Razia's cycle log", async () => {
    await assertFails(updateDoc(doc(attackerDb, "cycle_logs", "razia_cycle_1"), {
      userId: ATTACKER_UID,
      notes: "Hijacked record"
    }));
  });

  // --- 5. ROLE PRIVILEGE ESCALATION DEFENSE ---
  console.log("\n--- D. ROLE PRIVILEGE ESCALATION DEFENSE ---");
  await testCase("Razia CAN update her display name on users/{uid}", async () => {
    await assertSucceeds(updateDoc(doc(raziaDb, "users", RAZIA_UID), {
      displayName: "Razia Parker",
      role: "sanctuary_owner"
    }));
  });

  await testCase("Razia CANNOT self-escalate role to admin", async () => {
    await assertFails(updateDoc(doc(raziaDb, "users", RAZIA_UID), {
      role: "admin"
    }));
  });

  await testCase("Attacker CANNOT create user doc with role admin", async () => {
    await assertFails(setDoc(doc(attackerDb, "users", ATTACKER_UID), {
      uid: ATTACKER_UID,
      email: "attacker@malicious.com",
      role: "admin"
    }));
  });

  // --- 6. IMMUTABLE AUDIT TRAIL DEFENSE ---
  console.log("\n--- E. JARVIS AUDIT TRAIL IMMUTABILITY ---");
  await testCase("Raaziq (ADMIN) can read jarvis_audit_logs", async () => {
    await assertSucceeds(getDoc(doc(raaziqDb, "jarvis_audit_logs", "audit_log_1")));
  });

  await testCase("Raaziq CANNOT update existing jarvis_audit_logs", async () => {
    await assertFails(updateDoc(doc(raaziqDb, "jarvis_audit_logs", "audit_log_1"), {
      status: "tampered"
    }));
  });

  await testCase("Raaziq CANNOT delete existing jarvis_audit_logs", async () => {
    await assertFails(deleteDoc(doc(raaziqDb, "jarvis_audit_logs", "audit_log_1")));
  });

  await testCase("Attacker CANNOT read jarvis_audit_logs", async () => {
    await assertFails(getDoc(doc(attackerDb, "jarvis_audit_logs", "audit_log_1")));
  });

  // --- 7. CLEANUP & SUMMARY ---
  await testEnv.cleanup();

  console.log("\n==========================================================================");
  console.log("            FIREBASE RULES EMULATOR SUITE RESULTS                         ");
  console.log("==========================================================================");
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log("==========================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

// Run if called directly
runEmulatorSuite().catch((err) => {
  console.error("Emulator test execution failed:", err);
  process.exit(1);
});
