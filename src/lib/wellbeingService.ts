import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";
import {
  CycleRecord,
  WellbeingSymptom,
  WellbeingMood,
  WellbeingMedication,
  WellbeingAppointment,
  WellbeingJournalEntry,
  WellbeingSettings,
  FlowIntensity
} from "../types";
import { format, differenceInDays, addDays, parseISO } from "date-fns";

const CYCLES_COL = "cycle_logs";
const SYMPTOMS_COL = "wellbeing_symptoms";
const MOODS_COL = "wellbeing_moods";
const MEDS_COL = "wellbeing_medications";
const APPOINTMENTS_COL = "wellbeing_appointments";
const JOURNAL_COL = "wellbeing_journal";
const SETTINGS_COL = "wellbeing_settings";

// Local cache keys
const CACHE_PREFIX = "cupid_wb_";

export const DEFAULT_WELLBEING_SETTINGS: WellbeingSettings = {
  userId: "",
  shareWithPartner: true,
  shareCyclePhase: true,
  shareCareCravings: true,
  showFertilityEstimates: true,
  showPhaseEducation: true,
  hydrationTargetGlasses: 8
};

// ==========================================
// SETTINGS & PRIVACY
// ==========================================
export async function getWellbeingSettings(userId: string): Promise<WellbeingSettings> {
  try {
    const ref = doc(db, SETTINGS_COL, userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { ...DEFAULT_WELLBEING_SETTINGS, ...snap.data(), userId };
    }
  } catch (e) {
    console.warn("Could not load wellbeing settings, using local:", e);
  }

  const cached = localStorage.getItem(`${CACHE_PREFIX}settings_${userId}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }
  return { ...DEFAULT_WELLBEING_SETTINGS, userId };
}

export async function saveWellbeingSettings(settings: WellbeingSettings): Promise<void> {
  try {
    localStorage.setItem(`${CACHE_PREFIX}settings_${settings.userId}`, JSON.stringify(settings));
    const ref = doc(db, SETTINGS_COL, settings.userId);
    await setDoc(ref, { ...settings, updatedAt: Timestamp.now() }, { merge: true });
  } catch (e) {
    console.warn("Could not save wellbeing settings:", e);
  }
}

// ==========================================
// CYCLE LOGS & CALCULATIONS
// ==========================================
export async function getCycleLogs(userId: string): Promise<CycleRecord[]> {
  try {
    const snap = await getDocs(
      query(collection(db, CYCLES_COL), where("userId", "==", userId), orderBy("startDate", "desc"))
    );
    if (!snap.empty) {
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() } as CycleRecord));
      localStorage.setItem(`${CACHE_PREFIX}cycles_${userId}`, JSON.stringify(records));
      return records;
    }
  } catch (e) {
    console.warn("Error getting cycle logs:", e);
  }

  const cached = localStorage.getItem(`${CACHE_PREFIX}cycles_${userId}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  // Seed realistic starter cycle
  const starter: CycleRecord[] = [
    {
      id: "initial_cycle_1",
      userId,
      startDate: format(addDays(new Date(), -18), "yyyy-MM-dd"),
      endDate: format(addDays(new Date(), -13), "yyyy-MM-dd"),
      duration: 5,
      cycleLength: 28,
      flowIntensity: "medium",
      hadSpotting: false,
      symptoms: ["Cramps", "Fatigue"],
      notes: "Gentle resting days"
    }
  ];
  return starter;
}

export async function addOrUpdateCycleLog(cycle: Omit<CycleRecord, "id"> & { id?: string }): Promise<string> {
  const docRef = cycle.id ? doc(db, CYCLES_COL, cycle.id) : doc(collection(db, CYCLES_COL));
  const payload: CycleRecord = {
    ...cycle,
    id: docRef.id,
    updatedAt: Timestamp.now()
  };
  await setDoc(docRef, payload, { merge: true });
  return docRef.id;
}

export async function deleteCycleLog(cycleId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, CYCLES_COL, cycleId));
  } catch (e) {
    console.warn("Error deleting cycle log:", e);
  }
}

export interface CycleStats {
  averageCycleLength: number;
  averageDuration: number;
  cycleCount: number;
  nextPeriodEstimate: string | null;
  estimatedOvulationDate: string | null;
  fertileWindowStart: string | null;
  fertileWindowEnd: string | null;
  currentDayOfCycle: number;
  confidence: "High" | "Moderate" | "Limited History";
}

export function calculateCycleStats(cycles: CycleRecord[]): CycleStats {
  if (cycles.length === 0) {
    return {
      averageCycleLength: 28,
      averageDuration: 5,
      cycleCount: 0,
      nextPeriodEstimate: null,
      estimatedOvulationDate: null,
      fertileWindowStart: null,
      fertileWindowEnd: null,
      currentDayOfCycle: 1,
      confidence: "Limited History"
    };
  }

  const sorted = [...cycles].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  const latest = sorted[0];

  // Calculate average period bleeding duration
  const validDurations = sorted.filter(c => c.duration && c.duration > 0).map(c => c.duration!);
  const avgDuration = validDurations.length > 0 
    ? Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length) 
    : 5;

  // Calculate cycle lengths between consecutive starts
  const calculatedLengths: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = differenceInDays(new Date(sorted[i].startDate), new Date(sorted[i + 1].startDate));
    if (diff >= 20 && diff <= 45) {
      calculatedLengths.push(diff);
    }
  }

  // Use historical cycle lengths or default
  const avgCycleLength = calculatedLengths.length > 0
    ? Math.round(calculatedLengths.reduce((a, b) => a + b, 0) / calculatedLengths.length)
    : (latest.cycleLength || 28);

  const confidence = calculatedLengths.length >= 3 ? "High" : calculatedLengths.length >= 1 ? "Moderate" : "Limited History";

  const latestStart = new Date(latest.startDate);
  const today = new Date();
  const currentDayOfCycle = Math.max(1, differenceInDays(today, latestStart) + 1);

  // Next period estimate
  const nextPeriodDate = addDays(latestStart, avgCycleLength);
  const nextPeriodEstimate = format(nextPeriodDate, "yyyy-MM-dd");

  // Ovulation estimate (approximately 14 days before next period in typical luteal phase)
  const ovulationDate = addDays(nextPeriodDate, -14);
  const estimatedOvulationDate = format(ovulationDate, "yyyy-MM-dd");

  // Fertile window (approx. 5 days before ovulation up to 1 day after)
  const fertileStart = addDays(ovulationDate, -5);
  const fertileEnd = addDays(ovulationDate, 1);

  return {
    averageCycleLength: avgCycleLength,
    averageDuration: avgDuration,
    cycleCount: sorted.length,
    nextPeriodEstimate,
    estimatedOvulationDate,
    fertileWindowStart: format(fertileStart, "yyyy-MM-dd"),
    fertileWindowEnd: format(fertileEnd, "yyyy-MM-dd"),
    currentDayOfCycle,
    confidence
  };
}

// ==========================================
// SYMPTOM TRACKING
// ==========================================
export async function getSymptoms(userId: string): Promise<WellbeingSymptom[]> {
  try {
    const snap = await getDocs(
      query(collection(db, SYMPTOMS_COL), where("userId", "==", userId), orderBy("date", "desc"))
    );
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as WellbeingSymptom));
    }
  } catch (e) {
    console.warn("Error getting symptoms:", e);
  }
  return [];
}

export async function logSymptom(symptom: Omit<WellbeingSymptom, "id" | "createdAt">): Promise<string> {
  const docRef = doc(collection(db, SYMPTOMS_COL));
  const payload: WellbeingSymptom = {
    ...symptom,
    id: docRef.id,
    createdAt: Timestamp.now()
  };
  await setDoc(docRef, payload);
  return docRef.id;
}

export async function deleteSymptom(symptomId: string): Promise<void> {
  await deleteDoc(doc(db, SYMPTOMS_COL, symptomId));
}

// ==========================================
// MOOD & ENERGY TRACKING
// ==========================================
export async function getMoodLogs(userId: string): Promise<WellbeingMood[]> {
  try {
    const snap = await getDocs(
      query(collection(db, MOODS_COL), where("userId", "==", userId), orderBy("date", "desc"))
    );
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as WellbeingMood));
    }
  } catch (e) {
    console.warn("Error getting mood logs:", e);
  }
  return [];
}

export async function logMood(mood: Omit<WellbeingMood, "id" | "createdAt">): Promise<string> {
  const docRef = doc(collection(db, MOODS_COL));
  const payload: WellbeingMood = {
    ...mood,
    id: docRef.id,
    createdAt: Timestamp.now()
  };
  await setDoc(docRef, payload);
  return docRef.id;
}

// ==========================================
// MEDICATIONS & SUPPLEMENTS
// ==========================================
export async function getMedications(userId: string): Promise<WellbeingMedication[]> {
  try {
    const snap = await getDocs(
      query(collection(db, MEDS_COL), where("userId", "==", userId), orderBy("createdAt", "desc"))
    );
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as WellbeingMedication));
    }
  } catch (e) {
    console.warn("Error getting medications:", e);
  }
  return [];
}

export async function addMedication(med: Omit<WellbeingMedication, "id" | "createdAt">): Promise<string> {
  const docRef = doc(collection(db, MEDS_COL));
  const payload: WellbeingMedication = {
    ...med,
    id: docRef.id,
    createdAt: Timestamp.now()
  };
  await setDoc(docRef, payload);
  return docRef.id;
}

export async function deleteMedication(id: string): Promise<void> {
  await deleteDoc(doc(db, MEDS_COL, id));
}

// ==========================================
// APPOINTMENTS
// ==========================================
export async function getAppointments(userId: string): Promise<WellbeingAppointment[]> {
  try {
    const snap = await getDocs(
      query(collection(db, APPOINTMENTS_COL), where("userId", "==", userId), orderBy("appointmentDate", "desc"))
    );
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as WellbeingAppointment));
    }
  } catch (e) {
    console.warn("Error getting appointments:", e);
  }
  return [];
}

export async function addAppointment(apt: Omit<WellbeingAppointment, "id" | "createdAt">): Promise<string> {
  const docRef = doc(collection(db, APPOINTMENTS_COL));
  const payload: WellbeingAppointment = {
    ...apt,
    id: docRef.id,
    createdAt: Timestamp.now()
  };
  await setDoc(docRef, payload);
  return docRef.id;
}

export async function deleteAppointment(id: string): Promise<void> {
  await deleteDoc(doc(db, APPOINTMENTS_COL, id));
}

// ==========================================
// WOMEN'S HEALTH JOURNAL
// ==========================================
export async function getJournalEntries(userId: string): Promise<WellbeingJournalEntry[]> {
  try {
    const snap = await getDocs(
      query(collection(db, JOURNAL_COL), where("userId", "==", userId), orderBy("date", "desc"))
    );
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as WellbeingJournalEntry));
    }
  } catch (e) {
    console.warn("Error getting journal entries:", e);
  }
  return [];
}

export async function addJournalEntry(entry: Omit<WellbeingJournalEntry, "id" | "createdAt">): Promise<string> {
  const docRef = doc(collection(db, JOURNAL_COL));
  const payload: WellbeingJournalEntry = {
    ...entry,
    id: docRef.id,
    createdAt: Timestamp.now()
  };
  await setDoc(docRef, payload);
  return docRef.id;
}

export async function deleteJournalEntry(id: string): Promise<void> {
  await deleteDoc(doc(db, JOURNAL_COL, id));
}

// ==========================================
// EXPORT & DELETION
// ==========================================
export async function exportHealthData(userId: string): Promise<string> {
  const [cycles, symptoms, moods, medications, appointments, journal] = await Promise.all([
    getCycleLogs(userId),
    getSymptoms(userId),
    getMoodLogs(userId),
    getMedications(userId),
    getAppointments(userId),
    getJournalEntries(userId)
  ]);

  const report = {
    exportDate: new Date().toISOString(),
    disclaimer: "This report contains logged personal observations and is not a medical diagnosis.",
    cycles,
    symptoms,
    moods,
    medications,
    appointments,
    journal
  };

  return JSON.stringify(report, null, 2);
}
