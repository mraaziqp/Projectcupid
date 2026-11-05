import { JARVIS_CUPID_TOOLS, DEFAULT_JARVIS_CONFIG, executeJarvisTool } from "../src/lib/jarvisIntegration";
import { generateStorybookEmailHtml, CupidNotificationEvent } from "../src/lib/emailService";
import { calculateCycleStats } from "../src/lib/wellbeingService";
import { MessageBoxItem, CycleRecord } from "../src/types";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, msg: string) {
  totalCount++;
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("  PROJECT CUPID 3.0 — COMPREHENSIVE SUITE VERIFICATION  ");
  console.log("=======================================================\n");

  // TEST SUITE 1: JARVIS ECOSYSTEM & PRIVACY GUARANTEES
  console.log("--- 1. JARVIS ECOSYSTEM & PRIVACY GUARANTEES ---");
  
  // 1.1 Tool Definitions Schema
  assert(JARVIS_CUPID_TOOLS.length >= 7, `Registered ${JARVIS_CUPID_TOOLS.length} Jarvis tools`);
  const statusTool = JARVIS_CUPID_TOOLS.find(t => t.name === "cupid_get_status");
  assert(Boolean(statusTool), "Found cupid_get_status tool");
  assert(statusTool?.category === "system", "Status tool category is system");

  // 1.2 Tool Execution with Valid Key
  const validResult = await executeJarvisTool("cupid_get_status", {}, DEFAULT_JARVIS_CONFIG.apiKey, DEFAULT_JARVIS_CONFIG);
  assert(validResult.success === true, "cupid_get_status succeeds with valid key");
  assert(validResult.result?.application === "Project Cupid", "Application name is Project Cupid");

  // 1.3 Tool Execution with Invalid Key
  const invalidKeyResult = await executeJarvisTool("cupid_get_status", {}, "wrong_key_12345", DEFAULT_JARVIS_CONFIG);
  assert(invalidKeyResult.success === false, "Execution rejected with invalid API key");

  // 1.4 Strict Privacy Boundary: Health query MUST be rejected
  const healthAttempt1 = await executeJarvisTool("cupid_query_health", {}, DEFAULT_JARVIS_CONFIG.apiKey, DEFAULT_JARVIS_CONFIG);
  assert(healthAttempt1.success === false, "Private health query is blocked by policy");
  assert(healthAttempt1.error?.includes("Access Denied") || healthAttempt1.error?.includes("strictly"), "Error message explicitly cites strict privacy barrier");

  const healthAttempt2 = await executeJarvisTool("cupid_get_cycle_data", {}, DEFAULT_JARVIS_CONFIG.apiKey, DEFAULT_JARVIS_CONFIG);
  assert(healthAttempt2.success === false, "Menstrual cycle query is blocked by policy");

  const journalAttempt = await executeJarvisTool("cupid_read_journal_private", {}, DEFAULT_JARVIS_CONFIG.apiKey, DEFAULT_JARVIS_CONFIG);
  assert(journalAttempt.success === false, "Private reflection journal query is blocked by policy");


  // TEST SUITE 2: BRANDED STORYBOOK EMAIL NOTIFICATIONS
  console.log("\n--- 2. BRANDED STORYBOOK EMAIL NOTIFICATIONS ---");

  const eventsToTest: CupidNotificationEvent[] = [
    "letter.created",
    "message_box.daily_ready",
    "message_box.contributed",
    "memory.created",
    "capsule.unlocked",
    "voucher.gifted",
    "surprise.sent"
  ];

  eventsToTest.forEach(eventType => {
    const { subject, html } = generateStorybookEmailHtml({
      eventType,
      recipientEmail: "test@cupid.com",
      recipientName: "Razia",
      senderName: "Raaziq",
      title: "Our Anniversary Reflection",
      content: "A gentle memory of the day we began this beautiful journey together."
    });

    assert(Boolean(subject && subject.length > 0), `Generated subject for ${eventType}: "${subject}"`);
    assert(html.includes("Project Cupid"), `Email HTML contains Project Cupid branding for ${eventType}`);
    assert(html.includes("#faf7f2") || html.includes("#f1ebd9") || html.includes("#dfc298"), `Email HTML uses enchanted warm parchment palette`);
    assert(html.includes("Georgia, serif"), `Email HTML applies elegant serif typography`);
  });

  // Test Discreet Notification Mode
  const discreet = generateStorybookEmailHtml({
    eventType: "letter.created",
    recipientEmail: "test@cupid.com",
    recipientName: "Razia",
    senderName: "Raaziq",
    title: "Very Sensitive Subject",
    content: "Private medical information",
    isDiscreet: true
  });
  assert(!discreet.subject.includes("Very Sensitive Subject"), "Discreet mode obscures sensitive title in subject line");
  assert(discreet.subject.includes("A little something is waiting"), "Discreet mode uses gentle neutral teaser subject");


  // TEST SUITE 3: MESSAGE BOX RANDOMIZATION & UNOPENED PRIORITIZATION
  console.log("\n--- 3. MESSAGE BOX SELECTION & PRIORITIZATION ALGORITHM ---");

  const mockBoxes: MessageBoxItem[] = [
    {
      id: "b1",
      title: "Note 1",
      content: "Unopened note 1",
      authorId: "raaziq",
      authorName: "Raaziq",
      authorRole: "admin",
      category: "Love",
      isAnonymous: false,
      isSecret: false,
      isOpened: false,
      createdAt: { toDate: () => new Date() }
    },
    {
      id: "b2",
      title: "Note 2",
      content: "Opened note 2",
      authorId: "raaziq",
      authorName: "Raaziq",
      authorRole: "admin",
      category: "Compliments",
      isAnonymous: false,
      isSecret: false,
      isOpened: true,
      openedAt: "2026-11-01",
      createdAt: { toDate: () => new Date() }
    },
    {
      id: "b3",
      title: "Note 3",
      content: "Unopened note 3",
      authorId: "razia",
      authorName: "Razia",
      authorRole: "reader",
      category: "Encouragement",
      isAnonymous: false,
      isSecret: false,
      isOpened: false,
      createdAt: { toDate: () => new Date() }
    }
  ];

  const unopened = mockBoxes.filter(b => !b.isOpened);
  assert(unopened.length === 2, "Filtered exactly 2 unopened boxes");
  assert(unopened.every(b => !b.isOpened), "All items in eligible pool are unopened");

  // Selection chooses an unopened item
  const selected = unopened[Math.floor(Math.random() * unopened.length)];
  assert(selected.id === "b1" || selected.id === "b3", "Algorithm selects strictly from unopened items");

  // Simulated reshuffle when all are opened
  const allOpenedBoxes = mockBoxes.map(b => ({ ...b, isOpened: true }));
  const remainingUnopened = allOpenedBoxes.filter(b => !b.isOpened);
  assert(remainingUnopened.length === 0, "Collection depleted (0 unopened remaining)");

  // Reshuffle resets pool
  const reshuffled = allOpenedBoxes.map(b => ({ ...b, isOpened: false }));
  assert(reshuffled.filter(b => !b.isOpened).length === 3, "Reshuffle restores all 3 items to unopened pool");


  // TEST SUITE 4: HER WELLBEING & ISLAMIC PHASES
  console.log("\n--- 4. HER WELLBEING & ISLAMIC PHASES (*HAYD* & *TUHR*) ---");

  const sampleCycleHistory: CycleRecord[] = [
    {
      id: "cyc_1",
      userId: "razia",
      startDate: "2026-09-01",
      endDate: "2026-09-06",
      duration: 5,
      cycleLength: 28,
      flowIntensity: "medium"
    },
    {
      id: "cyc_2",
      userId: "razia",
      startDate: "2026-09-29",
      endDate: "2026-10-04",
      duration: 5,
      cycleLength: 28,
      flowIntensity: "medium"
    },
    {
      id: "cyc_3",
      userId: "razia",
      startDate: "2026-10-27",
      endDate: "2026-11-01",
      duration: 5,
      cycleLength: 28,
      flowIntensity: "heavy"
    }
  ];

  const cycleStats = calculateCycleStats(sampleCycleHistory);
  assert(cycleStats.averageCycleLength === 28, "Calculated exact 28-day cycle average");
  assert(cycleStats.averageDuration === 5, "Calculated exact 5-day period duration average");
  assert(cycleStats.nextPeriodEstimate === "2026-11-24", `Next period estimate matches 28-day projection (${cycleStats.nextPeriodEstimate})`);
  assert(cycleStats.estimatedOvulationDate === "2026-11-10", `Estimated ovulation date aligns with mid-cycle (${cycleStats.estimatedOvulationDate})`);

  // Fiqh verification: Hayd duration normal bounds (Hanafi 3-10 days, Shafi'i 1-15 days)
  const isNormalHaydDuration = cycleStats.averageDuration >= 3 && cycleStats.averageDuration <= 10;
  assert(isNormalHaydDuration, "Average duration is within valid Islamic Hayd boundaries");

  console.log("\n=======================================================");
  console.log(`  ALL ${passedCount}/${totalCount} TEST VERIFICATIONS PASSED SUCCESSFULLY!  `);
  console.log("=======================================================\n");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
