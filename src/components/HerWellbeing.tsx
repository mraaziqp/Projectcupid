import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  Moon,
  Sparkles,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Plus,
  Trash2,
  FileText,
  Clock,
  Droplet,
  Coffee,
  Activity,
  Smile,
  Pill,
  Stethoscope,
  BookOpen,
  Share2,
  Lock,
  Download,
  Info,
  CheckCircle2,
  X
} from "lucide-react";
import GlassPanel from "./GlassPanel";
import {
  CycleRecord,
  WellbeingSymptom,
  WellbeingMood,
  WellbeingMedication,
  WellbeingAppointment,
  WellbeingJournalEntry,
  WellbeingSettings,
  FlowIntensity,
  UserProfile
} from "../types";
import {
  getCycleLogs,
  addOrUpdateCycleLog,
  deleteCycleLog,
  calculateCycleStats,
  CycleStats,
  getSymptoms,
  logSymptom,
  deleteSymptom,
  getMoodLogs,
  logMood,
  getMedications,
  addMedication,
  deleteMedication,
  getAppointments,
  addAppointment,
  deleteAppointment,
  getJournalEntries,
  addJournalEntry,
  deleteJournalEntry,
  getWellbeingSettings,
  saveWellbeingSettings,
  exportHealthData
} from "../lib/wellbeingService";
import { format, parseISO } from "date-fns";

interface HerWellbeingProps {
  currentProfile: UserProfile | null;
  partnerProfile?: UserProfile | null;
  isPartnerView?: boolean; // When Raaziq views shared care view
}

const PHYSICAL_SYMPTOMS = [
  "Cramps",
  "Headaches",
  "Migraines",
  "Bloating",
  "Breast tenderness",
  "Back pain",
  "Fatigue",
  "Nausea",
  "Acne",
  "Digestive changes",
  "Appetite changes",
  "Sleep difficulties"
];

const EMOTIONAL_SYMPTOMS = [
  "Mood changes",
  "Irritability",
  "Anxiety",
  "Feeling overwhelmed",
  "Low mood",
  "Emotional sensitivity",
  "Energy changes"
];

const MOOD_OPTIONS = [
  { score: 5, emoji: "✨", label: "Radiant & Peaceful" },
  { score: 4, emoji: "🌿", label: "Calm & Content" },
  { score: 3, emoji: "☁️", label: "Reflective / Neutral" },
  { score: 2, emoji: "🌧️", label: "Tender / Low Energy" },
  { score: 1, emoji: "⛈️", label: "Overwhelmed / Exhausted" }
];

export default function HerWellbeing({
  currentProfile,
  partnerProfile,
  isPartnerView = false
}: HerWellbeingProps) {
  const currentUserId = currentProfile?.uid || "guest";
  const isRaaziq = currentProfile?.role === "admin" || currentProfile?.email === "mraaziqp@gmail.com" || currentProfile?.email === "backupe9@gmail.com";
  const isWife = !isRaaziq;

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    "cycle" | "symptoms" | "selfcare" | "meds" | "appointments" | "journal" | "privacy"
  >("cycle");

  // Data states
  const [cycles, setCycles] = useState<CycleRecord[]>([]);
  const [symptoms, setSymptoms] = useState<WellbeingSymptom[]>([]);
  const [moods, setMoods] = useState<WellbeingMood[]>([]);
  const [medications, setMedications] = useState<WellbeingMedication[]>([]);
  const [appointments, setAppointments] = useState<WellbeingAppointment[]>([]);
  const [journal, setJournal] = useState<WellbeingJournalEntry[]>([]);
  const [settings, setSettings] = useState<WellbeingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // New cycle log form state
  const [showLogCycleModal, setShowLogCycleModal] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState("");
  const [flowIntensity, setFlowIntensity] = useState<FlowIntensity>("medium");
  const [hadSpotting, setHadSpotting] = useState(false);
  const [cycleNotes, setCycleNotes] = useState("");

  // Symptom log modal
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [selectedSymptomType, setSelectedSymptomType] = useState<"physical" | "emotional">("physical");
  const [selectedSymptomName, setSelectedSymptomName] = useState("Cramps");
  const [customSymptom, setCustomSymptom] = useState("");
  const [symptomSeverity, setSymptomSeverity] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [symptomNotes, setSymptomNotes] = useState("");

  // Daily Mood check-in state
  const [dailyMoodScore, setDailyMoodScore] = useState(4);
  const [dailyEnergy, setDailyEnergy] = useState(3);
  const [dailyStress, setDailyStress] = useState(2);
  const [dailySleep, setDailySleep] = useState(4);
  const [dailyMoodNotes, setDailyMoodNotes] = useState("");
  const [moodSavedToast, setMoodSavedToast] = useState(false);
  const [madhhabRef, setMadhhabRef] = useState<"general" | "hanafi" | "shafii">("general");

  // Hydration state
  const [waterGlasses, setWaterGlasses] = useState(4);

  // Medication form state
  const [showMedModal, setShowMedModal] = useState(false);
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFrequency, setMedFrequency] = useState("daily");
  const [medNotes, setMedNotes] = useState("");

  // Appointment form state
  const [showAptModal, setShowAptModal] = useState(false);
  const [aptDate, setAptDate] = useState("");
  const [aptProvider, setAptProvider] = useState("");
  const [aptSpecialty, setAptSpecialty] = useState("OB/GYN / General Healthcare");
  const [aptQuestions, setAptQuestions] = useState("");
  const [aptDiscussSymptoms, setAptDiscussSymptoms] = useState("");

  // Journal form state
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalTitle, setJournalTitle] = useState("");
  const [journalContent, setJournalContent] = useState("");
  const [journalTags, setJournalTags] = useState("");

  // Toast
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    loadAllData();
  }, [currentUserId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [cyc, sym, mo, med, apt, jrn, sett] = await Promise.all([
        getCycleLogs(currentUserId),
        getSymptoms(currentUserId),
        getMoodLogs(currentUserId),
        getMedications(currentUserId),
        getAppointments(currentUserId),
        getJournalEntries(currentUserId),
        getWellbeingSettings(currentUserId)
      ]);
      setCycles(cyc);
      setSymptoms(sym);
      setMoods(mo);
      setMedications(med);
      setAppointments(apt);
      setJournal(jrn);
      setSettings(sett);
    } catch (e) {
      console.error("Error loading wellbeing data:", e);
    } finally {
      setLoading(false);
    }
  };

  const cycleStats = useMemo(() => calculateCycleStats(cycles), [cycles]);

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Handlers
  const handleSaveCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) return;

    await addOrUpdateCycleLog({
      userId: currentUserId,
      startDate,
      endDate: endDate || undefined,
      flowIntensity,
      hadSpotting,
      notes: cycleNotes.trim() || undefined
    });

    setShowLogCycleModal(false);
    setCycleNotes("");
    showNotification("Cycle log saved successfully!");
    const updated = await getCycleLogs(currentUserId);
    setCycles(updated);
  };

  const handleDeleteCycle = async (id: string) => {
    if (!confirm("Are you sure you want to remove this cycle record?")) return;
    await deleteCycleLog(id);
    setCycles(prev => prev.filter(c => c.id !== id));
    showNotification("Record removed.");
  };

  const handleSaveSymptom = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = customSymptom.trim() || selectedSymptomName;
    await logSymptom({
      userId: currentUserId,
      date: format(new Date(), "yyyy-MM-dd"),
      category: selectedSymptomType,
      symptomName: finalName,
      severity: symptomSeverity,
      notes: symptomNotes.trim() || undefined
    });

    setShowSymptomModal(false);
    setCustomSymptom("");
    setSymptomNotes("");
    showNotification("Symptom logged privately.");
    const updated = await getSymptoms(currentUserId);
    setSymptoms(updated);
  };

  const handleSaveMood = async () => {
    const label = MOOD_OPTIONS.find(m => m.score === dailyMoodScore)?.label || "Calm";
    await logMood({
      userId: currentUserId,
      date: format(new Date(), "yyyy-MM-dd"),
      moodScore: dailyMoodScore,
      moodLabel: label,
      energyLevel: dailyEnergy,
      stressLevel: dailyStress,
      sleepQuality: dailySleep,
      notes: dailyMoodNotes.trim() || undefined
    });

    setMoodSavedToast(true);
    setTimeout(() => setMoodSavedToast(false), 3000);
    const updated = await getMoodLogs(currentUserId);
    setMoods(updated);
  };

  const handleSaveMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim()) return;

    await addMedication({
      userId: currentUserId,
      name: medName.trim(),
      dosage: medDosage.trim(),
      frequency: medFrequency,
      notes: medNotes.trim() || undefined
    });

    setShowMedModal(false);
    setMedName("");
    setMedDosage("");
    setMedNotes("");
    showNotification("Medication logged.");
    const updated = await getMedications(currentUserId);
    setMedications(updated);
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aptDate || !aptProvider.trim()) return;

    await addAppointment({
      userId: currentUserId,
      appointmentDate: aptDate,
      providerName: aptProvider.trim(),
      specialty: aptSpecialty,
      questionsToAsk: aptQuestions.split("\n").map(q => q.trim()).filter(Boolean),
      symptomsToDiscuss: aptDiscussSymptoms.split("\n").map(s => s.trim()).filter(Boolean)
    });

    setShowAptModal(false);
    setAptDate("");
    setAptProvider("");
    setAptQuestions("");
    setAptDiscussSymptoms("");
    showNotification("Healthcare appointment saved.");
    const updated = await getAppointments(currentUserId);
    setAppointments(updated);
  };

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalContent.trim()) return;

    await addJournalEntry({
      userId: currentUserId,
      date: format(new Date(), "yyyy-MM-dd"),
      title: journalTitle.trim() || "Private Health Note",
      content: journalContent.trim(),
      tags: journalTags.split(",").map(t => t.trim()).filter(Boolean)
    });

    setShowJournalModal(false);
    setJournalTitle("");
    setJournalContent("");
    setJournalTags("");
    showNotification("Journal note encrypted and saved.");
    const updated = await getJournalEntries(currentUserId);
    setJournal(updated);
  };

  const handleUpdatePrivacySettings = async (key: keyof WellbeingSettings, value: any) => {
    if (!settings) return;
    const updated: WellbeingSettings = { ...settings, [key]: value };
    setSettings(updated);
    await saveWellbeingSettings(updated);
    showNotification("Privacy settings updated.");
  };

  const handleExportData = async () => {
    const jsonStr = await exportHealthData(currentUserId);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `her_wellbeing_records_${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Health report downloaded.");
  };

  // If partner is viewing and wife has disabled partner sharing (or by default):
  if ((isPartnerView || !isWife) && (!settings || !settings.shareWithPartner)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <Lock className="w-12 h-12 text-rose-300 mx-auto opacity-70" />
        <h2 className="text-2xl font-serif-title font-light">Her Private Sanctuary</h2>
        <p className="text-white/60 text-sm leading-relaxed max-w-md mx-auto">
          Razia's personal wellbeing companion is private by default. When she chooses to share gentle care updates or cycle phases, they will appear here to help you care for her with love and tenderness.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs tracking-widest uppercase">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Private Health Sanctuary</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif-title font-light text-white tracking-tight">
            Her Wellbeing Companion
          </h1>
          <p className="text-xs sm:text-sm text-white/60 font-light">
            A thoughtful, privacy-first personal wellness space designed with care and peace of mind.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLogCycleModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-medium shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Log Period / Flow</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-center text-emerald-200 text-xs flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </motion.div>
      )}

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
        {[
          { id: "cycle", label: "Cycle Calendar", icon: Calendar },
          { id: "symptoms", label: "Symptoms & Mood", icon: Activity },
          { id: "selfcare", label: "Self-Care & Daily", icon: Sparkles },
          { id: "meds", label: "Medication Log", icon: Pill },
          { id: "appointments", label: "Doctor Prep", icon: Stethoscope },
          { id: "journal", label: "Health Journal", icon: BookOpen },
          { id: "privacy", label: "Privacy & Export", icon: Lock }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? "bg-rose-500/20 border border-rose-500/40 text-rose-200 shadow-sm"
                  : "bg-white/5 border border-white/5 text-white/60 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CYCLE CALENDAR & PHASES */}
      {activeTab === "cycle" && (
        <div className="space-y-6">
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <GlassPanel className="p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-white/50">Current Cycle</span>
              <p className="text-xl sm:text-2xl font-serif text-white">Day {cycleStats.currentDayOfCycle}</p>
              <span className="text-[10px] text-emerald-400">Recorded History</span>
            </GlassPanel>

            <GlassPanel className="p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-white/50">Estimated Next Period</span>
              <p className="text-base sm:text-lg font-serif text-rose-300">
                {cycleStats.nextPeriodEstimate ? format(parseISO(cycleStats.nextPeriodEstimate), "MMM d") : "Needs more logs"}
              </p>
              <span className="text-[10px] text-white/40">Confidence: {cycleStats.confidence}</span>
            </GlassPanel>

            <GlassPanel className="p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-white/50">Avg Cycle Length</span>
              <p className="text-xl sm:text-2xl font-serif text-white">{cycleStats.averageCycleLength} days</p>
              <span className="text-[10px] text-white/40">Personal average</span>
            </GlassPanel>

            <GlassPanel className="p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-white/50">Avg Bleed Duration</span>
              <p className="text-xl sm:text-2xl font-serif text-white">{cycleStats.averageDuration} days</p>
              <span className="text-[10px] text-white/40">{cycleStats.cycleCount} recorded cycles</span>
            </GlassPanel>
          </div>

          {/* CRITICAL MEDICAL / SAFETY WARNING NOTICE */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs text-amber-200/90 leading-relaxed">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-medium text-amber-300">Estimates & Safety Disclaimer:</strong>
              <p>
                Menstrual, phase, and ovulation predictions are non-diagnostic estimates derived from past dates. They are not medical certainties. 
                Fertility predictions must <strong>NEVER</strong> be used as a contraceptive method or guarantee against pregnancy.
              </p>
            </div>
          </div>

          {/* ESTIMATED FERTILE & OVULATION WINDOW (Can be hidden) */}
          {settings?.showFertilityEstimates && cycleStats.estimatedOvulationDate && (
            <GlassPanel className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-950/15 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-medium text-white/90">Estimated Ovulation & Fertile Window</h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                  Calendar Estimate
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-white/70">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-white/40 block text-[10px] uppercase">Estimated Ovulation</span>
                  <span className="text-sm font-medium text-white">
                    {format(parseISO(cycleStats.estimatedOvulationDate), "EEEE, MMMM d")}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-white/40 block text-[10px] uppercase">Estimated Fertile Window</span>
                  <span className="text-sm font-medium text-white">
                    {cycleStats.fertileWindowStart && format(parseISO(cycleStats.fertileWindowStart), "MMM d")} —{" "}
                    {cycleStats.fertileWindowEnd && format(parseISO(cycleStats.fertileWindowEnd), "MMM d")}
                  </span>
                </div>
              </div>
            </GlassPanel>
          )}

          {/* CYCLE PHASES WITH ISLAMIC SPIRITUAL COMFORT (Hayd & Tuhr) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-base font-serif-title font-light text-white/90">Cycle Phases & Spiritual Comfort</h3>
              
              {/* Madhhab Educational Reference Selector */}
              <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                <span className="text-[10px] text-stone-400 font-mono px-1">Fiqh Ref:</span>
                <button
                  type="button"
                  onClick={() => setMadhhabRef("general")}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-serif transition ${
                    madhhabRef === "general" ? "bg-rose-500/30 text-rose-200 border border-rose-500/40" : "text-stone-400 hover:text-white"
                  }`}
                >
                  General
                </button>
                <button
                  type="button"
                  onClick={() => setMadhhabRef("hanafi")}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-serif transition ${
                    madhhabRef === "hanafi" ? "bg-amber-500/30 text-amber-200 border border-amber-500/40" : "text-stone-400 hover:text-white"
                  }`}
                >
                  Hanafi
                </button>
                <button
                  type="button"
                  onClick={() => setMadhhabRef("shafii")}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-serif transition ${
                    madhhabRef === "shafii" ? "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40" : "text-stone-400 hover:text-white"
                  }`}
                >
                  Shafi'i
                </button>
              </div>
            </div>

            {/* Educational Disclaimer Banner */}
            <div className="p-3 bg-amber-950/20 border border-amber-400/20 rounded-xl text-[11px] text-amber-200/90 leading-relaxed font-sans">
              ℹ️ <strong>Educational Perspective:</strong> Classical fiqh rulings on Hayd (menstruation), Tuhr (purity), and Istihadah (irregular bleeding) differ by madhhab and depend on your unique habit (Aadah). This companion provides general educational reference and does not substitute for personal consultation with a qualified, trusted scholar or teacher.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <GlassPanel className="p-4 rounded-2xl border border-rose-500/20 bg-rose-950/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-rose-300 font-serif">Menstrual Phase (Hayd / حيض)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-200">
                    {madhhabRef === "hanafi" ? "3 – 10 Days (Hanafi)" : madhhabRef === "shafii" ? "1 – 15 Days (Shafi'i)" : "Approx Days 1 – 6"}
                  </span>
                </div>
                <p className="text-xs text-white/70 font-light leading-relaxed">
                  Your body is resting and clearing. Ritual prayers and fasting are exempted as a divine mercy from Allah. Focus on physical rest, hydration, warmth, and gentle Dhikr.
                </p>
                <div className="pt-2 text-[11px] text-rose-200/80 italic border-t border-rose-500/10">
                  "Hasbiyallahu la ilaha illa Huwa, 'alayhi tawakkaltu wa Huwa Rabbul-'Arshil-'Adheem."
                </div>
              </GlassPanel>

              <GlassPanel className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-300 font-serif">Follicular & Ovulatory (Tuhr / طهر)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200">
                    {madhhabRef === "hanafi" ? "Min 15 Days Tuhr" : madhhabRef === "shafii" ? "Min 15 Days Tuhr" : "Days 7 – 16"}
                  </span>
                </div>
                <p className="text-xs text-white/70 font-light leading-relaxed">
                  Energy rises and peaks! Following Ghusl, ritual prayers and Quran recitation resume with renewed vitality, creative energy, and spiritual closeness.
                </p>
                <div className="pt-2 text-[11px] text-emerald-200/80 italic border-t border-emerald-500/10">
                  "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar."
                </div>
              </GlassPanel>
            </div>
          </div>

          {/* HISTORICAL LOGS */}
          <div className="space-y-3">
            <h3 className="text-base font-serif-title font-light text-white/90">Cycle History</h3>
            <div className="space-y-2">
              {cycles.map(cyc => (
                <div
                  key={cyc.id}
                  className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Droplet className="w-4 h-4 text-rose-400" />
                    <div>
                      <strong className="text-white/90 font-medium">{format(parseISO(cyc.startDate), "MMMM d, yyyy")}</strong>
                      {cyc.endDate && <span className="text-white/40"> to {format(parseISO(cyc.endDate), "MMMM d, yyyy")}</span>}
                      <div className="text-[11px] text-white/50 capitalize">
                        Flow: {cyc.flowIntensity || "Medium"} • {cyc.hadSpotting ? "Spotting noted" : "No spotting"}
                        {cyc.notes && ` • "${cyc.notes}"`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCycle(cyc.id)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-red-400 transition-colors"
                    title="Delete log"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SYMPTOMS & DAILY MOOD */}
      {activeTab === "symptoms" && (
        <div className="space-y-8">
          {/* DAILY MOOD CHECK-IN */}
          <GlassPanel className="p-5 sm:p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-serif-title font-light text-white">Daily Mood & Energy Check-in</h3>
                <p className="text-xs text-white/50">Record how your heart and body feel today without any judgment.</p>
              </div>
              {moodSavedToast && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>

            {/* Mood selector */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {MOOD_OPTIONS.map(opt => (
                <button
                  key={opt.score}
                  onClick={() => setDailyMoodScore(opt.score)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    dailyMoodScore === opt.score
                      ? "bg-rose-500/20 border-rose-500/50 scale-102"
                      : "bg-white/5 border-white/5 hover:bg-white/10"
                  }`}
                >
                  <span className="text-xl block mb-1">{opt.emoji}</span>
                  <span className="text-[11px] text-white/80 font-medium block">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Sliders for Energy, Stress, Sleep */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <div className="flex justify-between text-xs text-white/60 mb-1">
                  <span>Energy Level</span>
                  <span>{dailyEnergy}/5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={dailyEnergy}
                  onChange={(e) => setDailyEnergy(Number(e.target.value))}
                  className="w-full accent-rose-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-white/60 mb-1">
                  <span>Stress / Pressure</span>
                  <span>{dailyStress}/5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={dailyStress}
                  onChange={(e) => setDailyStress(Number(e.target.value))}
                  className="w-full accent-rose-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-white/60 mb-1">
                  <span>Sleep Quality</span>
                  <span>{dailySleep}/5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={dailySleep}
                  onChange={(e) => setDailySleep(Number(e.target.value))}
                  className="w-full accent-rose-400"
                />
              </div>
            </div>

            <textarea
              rows={2}
              placeholder="Any personal reflections on how today feels..."
              value={dailyMoodNotes}
              onChange={(e) => setDailyMoodNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none resize-none font-serif"
            />

            <div className="flex justify-end">
              <button
                onClick={handleSaveMood}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-medium text-xs hover:opacity-90 transition-opacity"
              >
                Save Mood Check-in
              </button>
            </div>
          </GlassPanel>

          {/* SYMPTOM LOGGING */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-serif-title font-light text-white">Physical & Emotional Symptoms</h3>
                <p className="text-xs text-white/50">Log cramps, migraines, bloating, emotional sensitivity, and more.</p>
              </div>
              <button
                onClick={() => setShowSymptomModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Symptom</span>
              </button>
            </div>

            {/* List of recent symptoms */}
            {symptoms.length === 0 ? (
              <div className="py-8 text-center text-white/40 text-xs italic bg-white/[0.02] border border-white/5 rounded-xl">
                No symptoms logged yet. Tap "Log Symptom" when you experience cramps, headaches, or emotional shifts.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {symptoms.map(sym => (
                  <div
                    key={sym.id}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${sym.category === "physical" ? "bg-rose-400" : "bg-purple-400"}`} />
                        <strong className="text-white/90">{sym.symptomName}</strong>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/60">
                          Severity: {sym.severity}/5
                        </span>
                      </div>
                      <div className="text-[11px] text-white/40 mt-1">
                        {sym.date} {sym.notes && `• "${sym.notes}"`}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        await deleteSymptom(sym.id);
                        setSymptoms(prev => prev.filter(s => s.id !== sym.id));
                      }}
                      className="p-1.5 text-white/30 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SELF-CARE & DAILY WELLNESS */}
      {activeTab === "selfcare" && (
        <div className="space-y-6">
          {/* Hydration Tracker */}
          <GlassPanel className="p-5 rounded-2xl border border-sky-500/20 bg-sky-950/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplet className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-medium text-white/90">Daily Hydration Tracker</h3>
              </div>
              <span className="text-xs text-sky-300 font-mono">{waterGlasses} / 8 glasses today</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setWaterGlasses(idx + 1 === waterGlasses ? idx : idx + 1)}
                  className={`w-9 h-10 rounded-xl border flex items-center justify-center transition-all ${
                    idx < waterGlasses
                      ? "bg-sky-500 text-white border-sky-400 shadow-sm"
                      : "bg-white/5 border-white/10 text-white/30"
                  }`}
                  title={`Glass ${idx + 1}`}
                >
                  <Droplet className="w-4 h-4 fill-current" />
                </button>
              ))}
            </div>
            <p className="text-[11px] text-white/50">
              Gentle reminder: Adequate water reduces headaches, helps soothe cramping, and keeps energy steady.
            </p>
          </GlassPanel>

          {/* Gentle Care Suggestions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <GlassPanel className="p-4 rounded-xl border border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-mono text-amber-300 tracking-wider">Rest & Warmth</span>
              <h4 className="text-xs font-semibold text-white">Heat Pad & Chamomile</h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Place a warm heating pad on your lower abdomen or lower back. Sip warm herbal tea without caffeine.
              </p>
            </GlassPanel>

            <GlassPanel className="p-4 rounded-xl border border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-mono text-emerald-300 tracking-wider">Movement</span>
              <h4 className="text-xs font-semibold text-white">Gentle Stretches</h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Light pelvic rocking or child's pose helps relieve uterine tension and eases lower back tightness.
              </p>
            </GlassPanel>

            <GlassPanel className="p-4 rounded-xl border border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-mono text-purple-300 tracking-wider">Mind & Spirit</span>
              <h4 className="text-xs font-semibold text-white">Quran Recitation & Dhikr</h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Listening to Surah Ar-Rahman brings profound stillness. Your exemption is ease and mercy from Allah.
              </p>
            </GlassPanel>
          </div>
        </div>
      )}

      {/* TAB 4: MEDICATION & SUPPLEMENT LOG */}
      {activeTab === "meds" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-serif-title font-light text-white">Medications & Supplements</h3>
              <p className="text-xs text-white/50">Private log for pain relief, vitamins (Vitamin D, Magnesium, Iron), and prescriptions.</p>
            </div>
            <button
              onClick={() => setShowMedModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-[11px] text-white/40">
            * Note: This is an unprescriptive logging tool only. It does not prescribe dosages or replace medical guidance.
          </div>

          {medications.length === 0 ? (
            <div className="py-8 text-center text-white/40 text-xs italic bg-white/[0.02] border border-white/5 rounded-xl">
              No medications or supplements logged yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {medications.map(med => (
                <div
                  key={med.id}
                  className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Pill className="w-4 h-4 text-amber-300" />
                      <strong className="text-white/90">{med.name}</strong>
                      <span className="text-white/50">({med.dosage})</span>
                    </div>
                    <div className="text-[11px] text-white/40 mt-1">
                      Frequency: {med.frequency} {med.notes && `• "${med.notes}"`}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await deleteMedication(med.id);
                      setMedications(prev => prev.filter(m => m.id !== med.id));
                    }}
                    className="p-1.5 text-white/30 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: DOCTOR APPOINTMENTS PREP */}
      {activeTab === "appointments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-serif-title font-light text-white">Healthcare Appointment Prep</h3>
              <p className="text-xs text-white/50">Organize questions to ask your doctor, symptoms to discuss, and notes.</p>
            </div>
            <button
              onClick={() => setShowAptModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Appointment</span>
            </button>
          </div>

          {appointments.length === 0 ? (
            <div className="py-8 text-center text-white/40 text-xs italic bg-white/[0.02] border border-white/5 rounded-xl">
              No appointments scheduled. Add one to prepare questions for your healthcare visit.
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map(apt => (
                <GlassPanel key={apt.id} className="p-4 rounded-xl border border-white/10 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white/40 font-mono text-[10px]">{apt.appointmentDate}</span>
                      <h4 className="text-sm font-semibold text-white/90">{apt.providerName}</h4>
                      <span className="text-white/50">{apt.specialty}</span>
                    </div>
                    <button
                      onClick={async () => {
                        await deleteAppointment(apt.id);
                        setAppointments(prev => prev.filter(a => a.id !== apt.id));
                      }}
                      className="p-1.5 text-white/30 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {apt.questionsToAsk && apt.questionsToAsk.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase text-amber-300">Questions to Ask:</span>
                      <ul className="list-disc list-inside text-white/70 space-y-0.5">
                        {apt.questionsToAsk.map((q, idx) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {apt.symptomsToDiscuss && apt.symptomsToDiscuss.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase text-rose-300">Symptoms to Discuss:</span>
                      <ul className="list-disc list-inside text-white/70 space-y-0.5">
                        {apt.symptomsToDiscuss.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </GlassPanel>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: HEALTH JOURNAL */}
      {activeTab === "journal" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-serif-title font-light text-white">Private Women's Health Journal</h3>
              <p className="text-xs text-white/50">Personal reflections on physical and emotional shifts across cycles.</p>
            </div>
            <button
              onClick={() => setShowJournalModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>
          </div>

          {journal.length === 0 ? (
            <div className="py-8 text-center text-white/40 text-xs italic bg-white/[0.02] border border-white/5 rounded-xl">
              Your health journal is empty. Write private notes whenever you notice changes in your body or rhythm.
            </div>
          ) : (
            <div className="space-y-3">
              {journal.map(entry => (
                <GlassPanel key={entry.id} className="p-4 rounded-xl border border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white/40 font-mono text-[10px]">{entry.date}</span>
                      <h4 className="text-sm font-serif font-medium text-white/90">{entry.title}</h4>
                    </div>
                    <button
                      onClick={async () => {
                        await deleteJournalEntry(entry.id);
                        setJournal(prev => prev.filter(j => j.id !== entry.id));
                      }}
                      className="p-1.5 text-white/30 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-white/75 font-serif italic leading-relaxed whitespace-pre-line">
                    "{entry.content}"
                  </p>
                </GlassPanel>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: PRIVACY & DATA EXPORT */}
      {activeTab === "privacy" && settings && (
        <div className="space-y-6 max-w-2xl">
          <GlassPanel className="p-6 rounded-2xl border border-white/10 space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-serif-title text-white">Privacy & Sharing Controls</h3>
              <p className="text-xs text-white/50">
                You have absolute control over what is shared with Raaziq. You can revoke partner access at any time.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer">
                <div>
                  <strong className="text-white block font-medium">Master Partner Sharing</strong>
                  <span className="text-white/50">Allow Raaziq to see the care summary in his dashboard</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.shareWithPartner}
                  onChange={(e) => handleUpdatePrivacySettings("shareWithPartner", e.target.checked)}
                  className="w-4 h-4 accent-rose-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer">
                <div>
                  <strong className="text-white block font-medium">Share Cycle Phase (Hayd / Tuhr)</strong>
                  <span className="text-white/50">Lets him know when you are resting so he can prepare tea & prayer support</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.shareCyclePhase}
                  onChange={(e) => handleUpdatePrivacySettings("shareCyclePhase", e.target.checked)}
                  className="w-4 h-4 accent-rose-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer">
                <div>
                  <strong className="text-white block font-medium">Show Fertility Estimates</strong>
                  <span className="text-white/50">Display estimated fertile window and ovulation estimates</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showFertilityEstimates}
                  onChange={(e) => handleUpdatePrivacySettings("showFertilityEstimates", e.target.checked)}
                  className="w-4 h-4 accent-rose-500 rounded"
                />
              </label>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-wrap gap-3">
              <button
                onClick={handleExportData}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export My Health Report (JSON)</span>
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* LOG CYCLE MODAL */}
      <AnimatePresence>
        {showLogCycleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#161318] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 relative"
            >
              <button
                onClick={() => setShowLogCycleModal(false)}
                className="absolute top-5 right-5 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-rose-300">Period Logging</span>
                <h3 className="text-2xl font-serif-title text-white">Log Period Dates</h3>
              </div>

              <form onSubmit={handleSaveCycle} className="space-y-4 text-xs">
                <div>
                  <label className="text-white/60 mb-1 block">Period Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Period End Date (Optional if ongoing)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Flow Intensity</label>
                  <select
                    value={flowIntensity}
                    onChange={(e) => setFlowIntensity(e.target.value as FlowIntensity)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none"
                  >
                    <option value="light">Light</option>
                    <option value="medium">Medium</option>
                    <option value="heavy">Heavy</option>
                    <option value="spotting">Spotting Only</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hadSpotting}
                    onChange={(e) => setHadSpotting(e.target.checked)}
                    className="rounded accent-rose-500"
                  />
                  <span className="text-white/80">Experienced spotting before or after</span>
                </label>

                <div>
                  <label className="text-white/60 mb-1 block">Private Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Started in morning, felt tired..."
                    value={cycleNotes}
                    onChange={(e) => setCycleNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLogCycleModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium shadow-md"
                  >
                    Save Cycle Log
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SYMPTOM MODAL */}
      <AnimatePresence>
        {showSymptomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#161318] border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 relative"
            >
              <button
                onClick={() => setShowSymptomModal(false)}
                className="absolute top-5 right-5 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-purple-300">Symptom Log</span>
                <h3 className="text-2xl font-serif-title text-white">Record a Symptom</h3>
              </div>

              <form onSubmit={handleSaveSymptom} className="space-y-4 text-xs">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSymptomType("physical");
                      setSelectedSymptomName("Cramps");
                    }}
                    className={`flex-1 py-1.5 rounded-lg border text-center ${
                      selectedSymptomType === "physical"
                        ? "bg-rose-500/30 border-rose-500 text-rose-200"
                        : "bg-white/5 border-white/10 text-white/60"
                    }`}
                  >
                    Physical
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSymptomType("emotional");
                      setSelectedSymptomName("Mood changes");
                    }}
                    className={`flex-1 py-1.5 rounded-lg border text-center ${
                      selectedSymptomType === "emotional"
                        ? "bg-purple-500/30 border-purple-500 text-purple-200"
                        : "bg-white/5 border-white/10 text-white/60"
                    }`}
                  >
                    Emotional
                  </button>
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Common Symptoms</label>
                  <select
                    value={selectedSymptomName}
                    onChange={(e) => setSelectedSymptomName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none"
                  >
                    {(selectedSymptomType === "physical" ? PHYSICAL_SYMPTOMS : EMOTIONAL_SYMPTOMS).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="custom">+ Custom Symptom</option>
                  </select>
                </div>

                {selectedSymptomName === "custom" && (
                  <div>
                    <label className="text-white/60 mb-1 block">Custom Symptom Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Lower back stiffness"
                      value={customSymptom}
                      onChange={(e) => setCustomSymptom(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <div className="flex justify-between text-white/60 mb-1">
                    <span>Severity</span>
                    <span>{symptomSeverity}/5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={symptomSeverity}
                    onChange={(e) => setSymptomSeverity(Number(e.target.value) as any)}
                    className="w-full accent-purple-400"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Relieved after herbal tea and resting"
                    value={symptomNotes}
                    onChange={(e) => setSymptomNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSymptomModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-medium shadow-md"
                  >
                    Save Symptom
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MEDICATION MODAL */}
      <AnimatePresence>
        {showMedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#161318] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 relative"
            >
              <button
                onClick={() => setShowMedModal(false)}
                className="absolute top-5 right-5 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-300">Medication & Supplements</span>
                <h3 className="text-2xl font-serif-title text-white">Log Medication</h3>
              </div>

              <form onSubmit={handleSaveMed} className="space-y-4 text-xs">
                <div>
                  <label className="text-white/60 mb-1 block">Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Iron Supplement, Magnesium, Ibuprofen..."
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Dosage</label>
                  <input
                    type="text"
                    placeholder="e.g. 400mg, 1 tablet..."
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Frequency</label>
                  <select
                    value={medFrequency}
                    onChange={(e) => setMedFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none"
                  >
                    <option value="daily">Daily</option>
                    <option value="twice_daily">Twice Daily</option>
                    <option value="as_needed">As Needed</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Take with dinner..."
                    value={medNotes}
                    onChange={(e) => setMedNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMedModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-md"
                  >
                    Save Medication
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* APPOINTMENT MODAL */}
      <AnimatePresence>
        {showAptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#161318] border border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 relative"
            >
              <button
                onClick={() => setShowAptModal(false)}
                className="absolute top-5 right-5 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-blue-300">Appointment Preparation</span>
                <h3 className="text-2xl font-serif-title text-white">Healthcare Visit</h3>
              </div>

              <form onSubmit={handleSaveAppointment} className="space-y-4 text-xs">
                <div>
                  <label className="text-white/60 mb-1 block">Date *</label>
                  <input
                    type="date"
                    required
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Doctor / Clinic Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Adams (Mediclinic Cape Town)"
                    value={aptProvider}
                    onChange={(e) => setAptProvider(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Specialty</label>
                  <input
                    type="text"
                    value={aptSpecialty}
                    onChange={(e) => setAptSpecialty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Questions to Ask (one per line)</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Is my cycle length normal? Can we check ferritin levels?"
                    value={aptQuestions}
                    onChange={(e) => setAptQuestions(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAptModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium shadow-md"
                  >
                    Save Appointment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HEALTH JOURNAL MODAL */}
      <AnimatePresence>
        {showJournalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#161318] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 relative"
            >
              <button
                onClick={() => setShowJournalModal(false)}
                className="absolute top-5 right-5 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-rose-300">Private Reflection</span>
                <h3 className="text-2xl font-serif-title text-white">Health Journal Entry</h3>
              </div>

              <form onSubmit={handleSaveJournal} className="space-y-4 text-xs">
                <div>
                  <label className="text-white/60 mb-1 block">Title (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Reflections on this cycle..."
                    value={journalTitle}
                    onChange={(e) => setJournalTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Your Private Note *</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Write anything you notice about your body, comfort, emotions, or patterns..."
                    value={journalContent}
                    onChange={(e) => setJournalContent(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none resize-none font-serif leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. luteal, energy, resting"
                    value={journalTags}
                    onChange={(e) => setJournalTags(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowJournalModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium shadow-md"
                  >
                    Save Encrypted Note
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
