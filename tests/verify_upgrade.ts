import { calculateCycleStats } from "../src/lib/wellbeingService";
import { CycleRecord } from "../src/types";

console.log("=== Testing Cycle Calculation Logic ===");

const testCycles: CycleRecord[] = [
  {
    id: "c1",
    userId: "test_user",
    startDate: "2026-03-01",
    endDate: "2026-03-06",
    duration: 5,
    cycleLength: 28,
    flowIntensity: "medium"
  },
  {
    id: "c2",
    userId: "test_user",
    startDate: "2026-03-29",
    endDate: "2026-04-03",
    duration: 5,
    cycleLength: 28,
    flowIntensity: "medium"
  },
  {
    id: "c3",
    userId: "test_user",
    startDate: "2026-04-27",
    endDate: "2026-05-02",
    duration: 6,
    cycleLength: 29,
    flowIntensity: "heavy"
  }
];

const stats = calculateCycleStats(testCycles);
console.log("Stats calculated:", stats);

if (stats.averageCycleLength >= 28 && stats.averageCycleLength <= 30) {
  console.log("✓ Average cycle length calculation verified.");
} else {
  throw new Error(`Unexpected avg cycle length: ${stats.averageCycleLength}`);
}

if (stats.averageDuration === 5 || stats.averageDuration === 6) {
  console.log("✓ Average period duration verified.");
} else {
  throw new Error(`Unexpected avg duration: ${stats.averageDuration}`);
}

if (stats.nextPeriodEstimate && stats.estimatedOvulationDate) {
  console.log("✓ Next period estimate and ovulation window verified.");
} else {
  throw new Error("Missing next period estimate or ovulation date");
}

console.log("=== All Verification Tests Passed Successfully! ===");
